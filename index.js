"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poetryAI = void 0;
/**
 * 시 감상 방법 클리닉 — AI 백엔드 (Cloud Functions 2세대)
 *
 * Google AI Studio(Gemini) API 키는 코드나 브라우저에 두지 않고
 * Secret Manager 의 GEMINI_API_KEY 에만 보관한다.
 *   firebase functions:secrets:set GEMINI_API_KEY
 */
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const genai_1 = require("@google/genai");
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({ region: "asia-northeast3", maxInstances: 10 });
const GEMINI_API_KEY = (0, params_1.defineSecret)("GEMINI_API_KEY");
const GEMINI_MODEL = (0, params_1.defineString)("GEMINI_MODEL", { default: "gemini-3.8-flash" });
const DAILY_LIMIT = (0, params_1.defineInt)("DAILY_LIMIT", { default: 200 });
const SYSTEM = `너는 한국 고등학교 국어 교사이자 현대시 감상 코치다.
학생이 '화자 상태 → 대상 +/- → 감정·생각 결론 → 시인이 하고자 하는 말' 4단계로 시를 감상하도록 돕는다.
- 학생 눈높이에 맞춰 쉽고 따뜻한 존댓말(해요체)로 쓴다.
- 작품에 없는 내용을 지어내지 않고, 반드시 시어와 행을 근거로 든다.
- 수능·내신에서 통용되는 용어(반어, 역설, 설의, 수미상관 등)를 정확히 쓴다.
- 답은 요청한 JSON 형식으로만 낸다.`;
function poemText(p) {
    return `제목: ${p.title}\n지은이: ${p.author}\n\n${p.lines.join("\n")}`;
}
function numberedLines(p) {
    return p.lines
        .map((l, i) => (l.trim() ? `[${i}] ${l}` : `[${i}] (연 구분)`))
        .join("\n");
}
function requirePoem(data) {
    const p = data.poem;
    if (!p ||
        typeof p.title !== "string" ||
        typeof p.author !== "string" ||
        !Array.isArray(p.lines) ||
        p.lines.length === 0 ||
        p.lines.length > 200 ||
        p.lines.some((l) => typeof l !== "string" || l.length > 300)) {
        throw new https_1.HttpsError("invalid-argument", "작품 정보가 올바르지 않아요.");
    }
    return { title: p.title.slice(0, 100), author: p.author.slice(0, 50), lines: p.lines };
}
function str(v, max) {
    return typeof v === "string" ? v.slice(0, max) : "";
}
/** 사용자별 하루 호출 수 제한 (API 키 남용 방지) */
async function checkQuota(uid) {
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10); // KST 날짜
    const ref = (0, firestore_1.getFirestore)().doc(`usage/${uid}_${today}`);
    const limit = DAILY_LIMIT.value();
    await (0, firestore_1.getFirestore)().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const count = snap.get("count") ?? 0;
        if (count >= limit) {
            throw new https_1.HttpsError("resource-exhausted", `오늘 AI 사용 한도(${limit}회)를 다 썼어요. 내일 다시 이용해 주세요.`);
        }
        tx.set(ref, { uid, date: today, count: firestore_1.FieldValue.increment(1) }, { merge: true });
    });
}
// Gemini 3 계열은 temperature 기본값(1.0) 사용을 권장하므로 따로 지정하지 않는다.
async function generateJSON(parts, schema) {
    const ai = new genai_1.GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    let res;
    try {
        res = await ai.models.generateContent({
            model: GEMINI_MODEL.value(),
            contents: [{ role: "user", parts }],
            config: {
                systemInstruction: SYSTEM,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
    }
    catch (e) {
        console.error("Gemini 호출 실패", e);
        const msg = String(e?.message ?? e);
        if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
            throw new https_1.HttpsError("resource-exhausted", "Gemini 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.");
        }
        throw new https_1.HttpsError("internal", "AI 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    const text = res.text ?? "";
    try {
        return JSON.parse(text);
    }
    catch {
        console.error("JSON 파싱 실패", text);
        throw new https_1.HttpsError("internal", "AI 응답 형식이 올바르지 않아요. 다시 시도해 주세요.");
    }
}
/* ------------------------------------------------------------------ */
/* 스키마                                                               */
/* ------------------------------------------------------------------ */
const S = (description) => ({ type: genai_1.Type.STRING, description });
const ARR = (items, description) => ({ type: genai_1.Type.ARRAY, items, description });
const OBJ = (properties, order) => ({
    type: genai_1.Type.OBJECT,
    properties,
    required: Object.keys(properties),
    propertyOrdering: order ?? Object.keys(properties),
});
const refineSchema = OBJ({
    poems: ARR(OBJ({
        title: S("작품 제목. 시험지에 제목이 없으면 첫 행 일부"),
        author: S("지은이. 모르면 빈 문자열"),
        lines: ARR(S(), "시의 행. 연과 연 사이에는 빈 문자열 하나"),
    })),
});
const overallSchema = OBJ({
    feedback: S("학생 첫인상에 대한 칭찬과 보완점 2~4문장"),
    paraphrase: S("시 전체 내용을 쉬운 말로 풀이 (4~6문장)"),
    mood: S("분위기와 어조 1~2문장"),
});
const stepSchema = OBJ({
    verdict: { type: genai_1.Type.STRING, enum: ["good", "partial", "retry"], format: "enum" },
    feedback: S("학생 답에 대한 구체적 피드백 2~4문장. 근거 시어 언급"),
    modelAnswer: S("이 단계의 모범 답안 1~3문장"),
});
const linesSchema = OBJ({
    lines: ARR(OBJ({
        index: { type: genai_1.Type.INTEGER, description: "행 번호 [n]" },
        techniques: ARR(S(), "허용 목록 안의 기법 이름만. 없으면 빈 배열"),
        explanation: S("이 행의 의미와 표현 효과 2~3문장"),
    })),
});
const overviewSchema = OBJ({
    genre: S("갈래 (예: 자유시, 서정시)"),
    character: S("성격 (예: 애상적, 민요적, 전통적)"),
    subject: S("제재"),
    theme: S("주제"),
    rhythm: S("운율 (예: 7·5조, 3음보)"),
    tone: S("어조"),
    structure: S("구성 (연별 흐름 또는 기승전결)"),
    features: ARR(S(), "표현상 특징 3~5개"),
    examPoints: ARR(S(), "시험에 잘 나오는 포인트 3~5개"),
});
const TECHNIQUES = [
    "반어", "역설", "직유", "은유", "의인", "활유", "대유", "상징", "대구", "반복", "열거", "설의",
    "영탄", "도치", "명령·청유", "시각적 이미지", "청각적 이미지", "촉각적 이미지", "공감각",
    "색채 대비", "수미상관", "음성 상징어", "동일 시어 반복",
];
/* ------------------------------------------------------------------ */
/* 기능별 처리                                                          */
/* ------------------------------------------------------------------ */
async function refine(data) {
    const pdf = str(data.pdfBase64, 10_000_000);
    if (!pdf)
        throw new https_1.HttpsError("invalid-argument", "PDF가 비어 있어요.");
    const prompt = `첨부한 국어 시험지 PDF에서 네모 상자(지문 박스) 안에 있는 작품 중 '현대시'만 골라 원문을 정제하라.
규칙:
1. 고전 시가(시조, 가사, 향가, 고려가요 등), 소설, 수필, 극, 비평문, 보기(<보기>) 자료는 제외한다.
2. 문제 풀이용 기호는 모두 지운다: ㉠㉡, ⓐⓑ, [A][B], (가)(나) 같은 지문 표시, 밑줄·굵은 글씨 표시, 행 번호, 각주 기호(*), 문항 번호.
3. 각주 설명문(* 즈려밟다: ~)은 시 본문에서 뺀다.
4. 원문의 행 나눔과 연 나눔을 그대로 지킨다. 연과 연 사이에는 빈 문자열 "" 을 한 번 넣는다.
5. 글자를 고치거나 맞춤법을 바꾸지 않는다.
6. 현대시가 하나도 없으면 poems 를 빈 배열로 둔다.`;
    return generateJSON([{ inlineData: { mimeType: "application/pdf", data: pdf } }, { text: prompt }], refineSchema);
}
async function overall(data) {
    const poem = requirePoem(data);
    const impression = str(data.impression, 2000);
    return generateJSON([
        {
            text: `[작품]\n${poemText(poem)}\n\n[학생의 첫인상]\n${impression}\n\n학생의 첫인상을 읽고 잘 잡은 점을 먼저 칭찬한 뒤 보완할 점을 알려 주고, 시 전체 내용 풀이와 분위기·어조를 정리하라.`,
        },
    ], overallSchema);
}
const STEP_GUIDE = {
    speaker: "① 화자 상태: 화자가 누구이며 어떤 상황·처지에 놓여 있는지",
    targets: "② 대상 +/-: 화자가 바라보는 대상이 무엇이고 화자에게 긍정(+)인지 부정(-)인지, 그 근거",
    conclusion: "③ 감정·생각 결론: ①②의 결과 화자가 이르는 감정·생각·태도 (반어 등 겉말과 속마음 차이 포함)",
    message: "④ 시인이 하고자 하는 말: 작품의 주제를 한 문장으로",
};
async function clinicStep(data) {
    const poem = requirePoem(data);
    const step = str(data.step, 20);
    if (!STEP_GUIDE[step])
        throw new https_1.HttpsError("invalid-argument", "알 수 없는 단계예요.");
    const a = (data.answers ?? {});
    const targets = Array.isArray(a.targets)
        ? a.targets
            .slice(0, 10)
            .map((t) => `${str(t?.name, 100)} (${str(t?.sign, 1) || "?"})`)
            .join(", ")
        : "";
    const answers = `① 화자 상태: ${str(a.speaker, 1000) || "(미작성)"}
② 대상 +/-: ${targets || "(미작성)"} / 근거: ${str(a.targetNote, 1000) || "(없음)"}
③ 감정·생각 결론: ${str(a.conclusion, 1000) || "(미작성)"}
④ 시인이 하고자 하는 말: ${str(a.message, 1000) || "(미작성)"}`;
    return generateJSON([
        {
            text: `[작품]\n${poemText(poem)}\n\n[학생의 4단계 감상]\n${answers}\n\n지금 채점할 단계: ${STEP_GUIDE[step]}
이 단계의 학생 답만 평가하라. 앞 단계 답은 맥락으로만 참고한다.
verdict 기준: good = 핵심을 정확히 짚음, partial = 방향은 맞으나 근거나 핵심어가 부족함, retry = 잘못 이해함.
정답을 바로 알려 주기보다 스스로 고칠 수 있도록 힌트가 되는 시어를 짚어 주고, 모범 답안은 modelAnswer 에만 쓴다.`,
        },
    ], stepSchema);
}
async function lines(data) {
    const poem = requirePoem(data);
    return generateJSON([
        {
            text: `[작품: ${poem.title} / ${poem.author}]\n${numberedLines(poem)}

'(연 구분)'이 아닌 모든 행에 대해, 그 행에 쓰인 표현기법과 의미·표현 효과를 설명하라.
- index 는 대괄호 안 번호를 그대로 쓴다.
- techniques 는 아래 허용 목록의 이름만 그대로 쓰고, 해당 행에서 분명히 확인되는 것만 넣는다.
  (반복·수미상관처럼 여러 행에 걸친 기법은 관련된 행 모두에 넣는다.)
허용 목록: ${TECHNIQUES.join(", ")}`,
        },
    ], linesSchema);
}
async function overview(data) {
    const poem = requirePoem(data);
    return generateJSON([{ text: `[작품]\n${poemText(poem)}\n\n이 작품의 개관(갈래, 성격, 제재, 주제, 운율, 어조, 구성, 표현상 특징, 시험 포인트)을 고등학생 학습지 형식으로 간결하게 정리하라.` }], overviewSchema);
}
const HANDLERS = {
    refine,
    overall,
    clinicStep,
    lines,
    overview,
};
/* ------------------------------------------------------------------ */
/* 진입점                                                               */
/* ------------------------------------------------------------------ */
exports.poetryAI = (0, https_1.onCall)({
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 180,
    memory: "512MiB",
    cors: true,
}, async (req) => {
    if (!req.auth)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요해요.");
    const action = str(req.data?.action, 20);
    const handler = HANDLERS[action];
    if (!handler)
        throw new https_1.HttpsError("invalid-argument", "알 수 없는 요청이에요.");
    await checkQuota(req.auth.uid);
    return handler(req.data);
});
