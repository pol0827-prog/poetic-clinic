import { httpsCallable } from "firebase/functions";
import { getFirebase } from "./firebase";
import type {
  ClinicAnswers,
  ClinicStepKey,
  LineAnalysis,
  OverallResult,
  OverviewResult,
  Poem,
  StepFeedback,
} from "./types";

async function callAI<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { functions } = await getFirebase();
  const fn = httpsCallable(functions, "poetryAI", { timeout: 180_000 });
  try {
    const res = await fn({ action, ...payload });
    return res.data as T;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "functions/unauthenticated") throw new Error("먼저 Google 로그인을 해 주세요.");
    if (err.code === "functions/resource-exhausted")
      throw new Error("AI 사용량 한도에 도달했어요. 잠시 후 다시 시도해 주세요.");
    throw new Error(err.message || "AI 요청 중 오류가 났어요.");
  }
}

const poemPayload = (p: Poem) => ({ poem: { title: p.title, author: p.author, lines: p.lines } });

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const api = {
  refine: (pdfBase64: string) => callAI<{ poems: Poem[] }>("refine", { pdfBase64 }),
  overall: (poem: Poem, impression: string) =>
    callAI<OverallResult>("overall", { ...poemPayload(poem), impression }),
  clinicStep: (poem: Poem, step: ClinicStepKey, answers: ClinicAnswers) =>
    callAI<StepFeedback>("clinicStep", { ...poemPayload(poem), step, answers }),
  lines: (poem: Poem) => callAI<{ lines: LineAnalysis[] }>("lines", poemPayload(poem)),
  overview: (poem: Poem) => callAI<OverviewResult>("overview", poemPayload(poem)),
};
