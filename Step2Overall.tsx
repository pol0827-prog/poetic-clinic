import type { StepProps } from "../App";
import { api } from "../api";
import { Feedback, LoginHint, PoemView, Section, Spinner, useAsync } from "./common";

export default function Step2Overall({ work, progress, update, signedIn }: StepProps) {
  const impression = progress.firstImpression ?? "";
  const result = progress.overall;
  const { loading, error, run } = useAsync();

  const check = () =>
    run(async () => {
      if (impression.trim().length < 5) throw new Error("첫인상을 한두 문장 이상 써 주세요.");
      const r = await api.overall(work, impression);
      update({ overall: r });
    });

  return (
    <>
      <Section
        title="2단계 · 전체 감상"
        desc="먼저 시를 소리 내어 천천히 두 번 읽어 보세요. 그다음 떠오르는 장면과 느낌을 자유롭게 적어요."
      >
        <PoemView poem={work} />
      </Section>

      <Section title="✍️ 나의 첫인상">
        <ul className="guide">
          <li>어떤 장면이 떠오르나요? (누가, 어디서, 무엇을)</li>
          <li>전체 분위기는 밝은가요, 어두운가요, 슬픈가요?</li>
          <li>가장 마음에 남는 시어나 행은 무엇인가요?</li>
        </ul>
        <textarea
          rows={5}
          value={impression}
          placeholder="예) 떠나는 임을 보내는 장면이 떠오른다. 담담하게 말하지만 슬픔이 느껴진다."
          onChange={(e) => update({ firstImpression: e.target.value })}
        />
        <div className="row">
          <button className="btn" onClick={check} disabled={loading || !signedIn}>
            {loading ? <Spinner text="읽어 보는 중…" /> : "🌸 AI 감상 도우미에게 보여 주기"}
          </button>
        </div>
        <LoginHint signedIn={signedIn} />
        {error && <p className="error">{error}</p>}
      </Section>

      {result && (
        <Section title="🔎 전체 감상 도움말">
          <Feedback>
            <p>{result.feedback}</p>
          </Feedback>
          <dl className="kv">
            <dt>전체 내용 풀이</dt>
            <dd>{result.paraphrase}</dd>
            <dt>분위기 · 어조</dt>
            <dd>{result.mood}</dd>
          </dl>
          <p className="next-hint">이제 [다음 ▶]을 눌러 4단계 감상 방법으로 꼼꼼히 들어가 봐요.</p>
        </Section>
      )}
    </>
  );
}
