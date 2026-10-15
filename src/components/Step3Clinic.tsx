import type { StepProps } from "../App";
import { api } from "../api";
import type { ClinicAnswers, ClinicState, ClinicStepKey, ClinicTarget } from "../types";
import { Feedback, LoginHint, PoemView, Section, Spinner, useAsync } from "./common";

const EMPTY: ClinicAnswers = {
  speaker: "",
  targets: [{ name: "", sign: "" }],
  targetNote: "",
  conclusion: "",
  message: "",
};

const STEPS: { key: ClinicStepKey; no: string; title: string; question: string; tips: string[] }[] = [
  {
    key: "speaker",
    no: "①",
    title: "화자 상태",
    question: "화자는 지금 어떤 상황·처지에 놓여 있나요?",
    tips: ["시 속에서 말하는 사람(나)이 누구인지", "언제, 어디서, 무슨 일을 겪고 있는지", "화자가 처한 상황이 좋은지, 힘든지"],
  },
  {
    key: "targets",
    no: "②",
    title: "대상 +/-",
    question: "화자가 바라보거나 말을 건네는 대상은 무엇이고, 화자에게 긍정(+)인가요, 부정(-)인가요?",
    tips: ["사람, 사물, 자연, 상황 모두 대상이 될 수 있어요", "화자가 다가가고 싶으면 +, 멀어지고 싶거나 괴로우면 -", "대상이 여러 개면 모두 적어 보세요"],
  },
  {
    key: "conclusion",
    no: "③",
    title: "감정 · 생각 결론",
    question: "①과 ②의 결과, 화자는 결국 어떤 감정이나 생각(태도)에 이르나요?",
    tips: ["시의 마지막 부분을 특히 주목해요", "감정 단어로 정리해 보세요 (그리움, 체념, 의지, 한(恨) …)", "겉으로 한 말과 속마음이 다르지 않은지 살펴봐요"],
  },
  {
    key: "message",
    no: "④",
    title: "시인이 하고자 하는 말",
    question: "이 시를 통해 시인이 독자에게 전하려는 말(주제)은 무엇인가요?",
    tips: ["①~③을 한 문장으로 묶어 보세요", "'~한 상황에서 ~하는 마음' 꼴로 써 보면 좋아요"],
  },
];

export default function Step3Clinic({ work, progress, update, signedIn }: StepProps) {
  const state: ClinicState = progress.clinic ?? { answers: EMPTY, feedback: {} };
  const answers = { ...EMPTY, ...state.answers };
  const { loading, error, run } = useAsync();

  const setAnswers = (patch: Partial<ClinicAnswers>) =>
    update({ clinic: { ...state, answers: { ...answers, ...patch } } });

  const setTarget = (i: number, patch: Partial<ClinicTarget>) =>
    setAnswers({ targets: answers.targets.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const filled = (key: ClinicStepKey) =>
    key === "targets"
      ? answers.targets.some((t) => t.name.trim() && t.sign)
      : answers[key].trim().length >= 3;

  const check = (key: ClinicStepKey) =>
    run(async () => {
      if (!filled(key))
        throw new Error(key === "targets" ? "대상을 적고 +/- 를 골라 주세요." : "답을 조금 더 적어 주세요.");
      const fb = await api.clinicStep(work, key, answers);
      update({ clinic: { answers, feedback: { ...state.feedback, [key]: fb } } });
    });

  // 앞 단계를 확인해야 다음 단계가 열린다
  const unlocked = (i: number) => i === 0 || !!state.feedback[STEPS[i - 1].key];

  return (
    <>
      <Section
        title="3단계 · 감상 방법 클리닉"
        desc="네 단계를 차례로 답하고 [확인]을 눌러요. 앞 단계를 확인해야 다음 단계가 열려요."
      >
        <div className="split">
          <div className="split-left sticky">
            <PoemView poem={work} />
          </div>
          <div className="split-right">
            {STEPS.map((s, i) => {
              const fb = state.feedback[s.key];
              const open = unlocked(i);
              return (
                <div key={s.key} className={"clinic-step" + (open ? "" : " locked")}>
                  <h3>
                    <span className="no">{s.no}</span> {s.title}
                  </h3>
                  <p className="question">{s.question}</p>
                  {!open ? (
                    <p className="empty">🔒 앞 단계를 먼저 확인해 주세요.</p>
                  ) : (
                    <>
                      <ul className="tips">
                        {s.tips.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>

                      {s.key === "targets" ? (
                        <div className="targets">
                          {answers.targets.map((t, ti) => (
                            <div key={ti} className="target-row">
                              <input
                                value={t.name}
                                placeholder="대상 (예: 떠나는 임)"
                                onChange={(e) => setTarget(ti, { name: e.target.value })}
                              />
                              <div className="sign">
                                {(["+", "-"] as const).map((sg) => (
                                  <button
                                    key={sg}
                                    className={"sign-btn " + (sg === "+" ? "plus" : "minus") + (t.sign === sg ? " on" : "")}
                                    onClick={() => setTarget(ti, { sign: t.sign === sg ? "" : sg })}
                                  >
                                    {sg}
                                  </button>
                                ))}
                              </div>
                              {answers.targets.length > 1 && (
                                <button
                                  className="link"
                                  onClick={() => setAnswers({ targets: answers.targets.filter((_, j) => j !== ti) })}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            className="link"
                            onClick={() => setAnswers({ targets: [...answers.targets, { name: "", sign: "" }] })}
                          >
                            + 대상 추가
                          </button>
                          <textarea
                            rows={2}
                            value={answers.targetNote}
                            placeholder="그렇게 판단한 근거 (시어·행)"
                            onChange={(e) => setAnswers({ targetNote: e.target.value })}
                          />
                        </div>
                      ) : (
                        <textarea
                          rows={3}
                          value={answers[s.key]}
                          onChange={(e) => setAnswers({ [s.key]: e.target.value } as Partial<ClinicAnswers>)}
                        />
                      )}

                      <div className="row">
                        <button className="btn" onClick={() => check(s.key)} disabled={loading || !signedIn}>
                          {loading ? <Spinner text="살펴보는 중…" /> : fb ? "다시 확인" : "확인"}
                        </button>
                      </div>
                      {fb && (
                        <Feedback verdict={fb.verdict} model={fb.modelAnswer}>
                          <p>{fb.feedback}</p>
                        </Feedback>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <LoginHint signedIn={signedIn} />
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      </Section>
    </>
  );
}
