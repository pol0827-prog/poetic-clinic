import { useState, type ReactNode } from "react";
import type { Poem, Verdict } from "../types";

export function PoemView({
  poem,
  activeIndex,
  onLineClick,
  marks,
}: {
  poem: Poem;
  activeIndex?: number;
  onLineClick?: (i: number) => void;
  marks?: Record<number, boolean>;
}) {
  return (
    <article className="poem">
      <h3 className="poem-title">
        {poem.title} <small>{poem.author}</small>
      </h3>
      <div className="poem-body">
        {poem.lines.map((line, i) =>
          line.trim() === "" ? (
            <div key={i} className="stanza-gap" />
          ) : (
            <p
              key={i}
              className={
                "poem-line" +
                (onLineClick ? " clickable" : "") +
                (activeIndex === i ? " active" : "") +
                (marks?.[i] ? " marked" : "")
              }
              onClick={onLineClick ? () => onLineClick(i) : undefined}
            >
              {line}
            </p>
          )
        )}
      </div>
    </article>
  );
}

export function Section({ title, desc, children }: { title: string; desc?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {desc && <p className="desc">{desc}</p>}
      {children}
    </section>
  );
}

const VERDICT_LABEL: Record<Verdict, string> = {
  good: "👍 잘했어요",
  partial: "✍️ 조금 더 다듬어요",
  retry: "🔁 다시 생각해 봐요",
};

export function Feedback({
  verdict,
  children,
  model,
}: {
  verdict?: Verdict;
  children: ReactNode;
  model?: string;
}) {
  const [showModel, setShowModel] = useState(false);
  return (
    <div className={"feedback " + (verdict ?? "")}>
      {verdict && <p className="verdict">{VERDICT_LABEL[verdict]}</p>}
      <div className="fb-text">{children}</div>
      {model && (
        <>
          <button className="link" onClick={() => setShowModel((v) => !v)}>
            {showModel ? "예시 답안 숨기기" : "예시 답안 보기"}
          </button>
          {showModel && <p className="model">{model}</p>}
        </>
      )}
    </div>
  );
}

/** 비동기 작업의 로딩/오류 상태를 관리 */
export function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const run = async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      setLoading(false);
    }
  };
  return { loading, error, run };
}

export function LoginHint({ signedIn }: { signedIn: boolean }) {
  if (signedIn) return null;
  return <p className="hint">🔐 AI 기능은 Google 로그인 후 사용할 수 있어요. (오른쪽 위 버튼)</p>;
}

export function Spinner({ text }: { text: string }) {
  return (
    <span className="spinner-wrap">
      <span className="spinner" /> {text}
    </span>
  );
}
