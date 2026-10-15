import { useMemo, useState } from "react";
import type { StepProps } from "../App";
import { api } from "../api";
import { TECHNIQUES, type LinesState } from "../types";
import { LoginHint, PoemView, Section, Spinner, useAsync } from "./common";

const EMPTY: LinesState = { analysis: [], picks: {}, notes: {}, revealed: {} };

export default function Step4Lines({ work, progress, update, signedIn }: StepProps) {
  const state: LinesState = { ...EMPTY, ...progress.lines };
  const lineIdx = useMemo(
    () => work.lines.map((l, i) => (l.trim() ? i : -1)).filter((i) => i >= 0),
    [work.lines]
  );
  const [cursor, setCursor] = useState(0);
  const current = lineIdx[cursor] ?? 0;
  const { loading, error, run } = useAsync();

  const save = (patch: Partial<LinesState>) => update({ lines: { ...state, ...patch } });

  const picks = state.picks[current] ?? [];
  const note = state.notes[current] ?? "";
  const revealed = !!state.revealed[current];
  const answer = state.analysis.find((a) => a.index === current);

  const togglePick = (t: string) => {
    const next = picks.includes(t) ? picks.filter((p) => p !== t) : [...picks, t];
    save({ picks: { ...state.picks, [current]: next } });
  };

  const reveal = () =>
    run(async () => {
      let analysis = state.analysis;
      if (!analysis.length) {
        const r = await api.lines(work);
        analysis = r.lines;
      }
      save({ analysis, revealed: { ...state.revealed, [current]: true } });
    });

  const norm = (s: string) => s.replace(/\s/g, "");
  const answerSet = new Set((answer?.techniques ?? []).map(norm));
  const pickSet = new Set(picks.map(norm));

  return (
    <Section
      title="4단계 · 한 행씩 표현기법 클리닉"
      desc="한 행씩 짚어 가며 쓰인 표현기법을 고르고 그 효과를 적어 보세요. 그다음 [정답 확인]으로 비교해요."
    >
      <div className="split">
        <div className="split-left sticky">
          <PoemView
            poem={work}
            activeIndex={current}
            marks={state.revealed}
            onLineClick={(i) => setCursor(lineIdx.indexOf(i))}
          />
          <p className="hint small">행을 눌러 바로 이동할 수 있어요. 확인한 행은 밑줄로 표시돼요.</p>
        </div>

        <div className="split-right">
          <div className="line-head">
            <span className="counter">
              {cursor + 1} / {lineIdx.length}행
            </span>
            <blockquote>{work.lines[current]}</blockquote>
          </div>

          <p className="label">이 행에 쓰인 표현기법 (여러 개 고를 수 있어요)</p>
          <div className="chips">
            {TECHNIQUES.map((t) => {
              const picked = pickSet.has(norm(t));
              const correct = answerSet.has(norm(t));
              const cls = revealed
                ? picked && correct
                  ? "hit"
                  : picked
                    ? "wrong"
                    : correct
                      ? "missed"
                      : ""
                : picked
                  ? "on"
                  : "";
              return (
                <button key={t} className={"chip " + cls} onClick={() => togglePick(t)}>
                  {t}
                </button>
              );
            })}
          </div>

          <p className="label">표현 효과 · 나의 해석</p>
          <textarea
            rows={3}
            value={note}
            placeholder="예) '죽어도 아니 눈물 흘리오리다'는 반어로, 오히려 깊은 슬픔을 강조한다."
            onChange={(e) => save({ notes: { ...state.notes, [current]: e.target.value } })}
          />

          <div className="row">
            <button className="btn" onClick={reveal} disabled={loading || !signedIn}>
              {loading ? <Spinner text="전체 행을 분석하는 중…" /> : revealed ? "정답 다시 보기" : "정답 확인"}
            </button>
          </div>
          <LoginHint signedIn={signedIn} />
          {error && <p className="error">{error}</p>}

          {revealed && answer && (
            <div className="feedback">
              <p className="verdict">
                🎯 정답 기법: {answer.techniques.length ? answer.techniques.join(", ") : "특별한 기법 없음"}
              </p>
              <p className="legend">
                <i className="hit" /> 맞힘 <i className="missed" /> 놓침 <i className="wrong" /> 해당 없음
              </p>
              <div className="fb-text">
                <p>{answer.explanation}</p>
              </div>
            </div>
          )}

          <div className="row between">
            <button className="btn ghost" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor === 0}>
              ← 앞 행
            </button>
            <button
              className="btn ghost"
              onClick={() => setCursor((c) => Math.min(lineIdx.length - 1, c + 1))}
              disabled={cursor >= lineIdx.length - 1}
            >
              다음 행 →
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}
