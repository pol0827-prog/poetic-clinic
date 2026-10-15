import type { StepProps } from "../App";
import { api } from "../api";
import { LoginHint, PoemView, Section, Spinner, useAsync } from "./common";

export default function Step5Overview({ work, progress, update, signedIn }: StepProps) {
  const ov = progress.overview;
  const clinic = progress.clinic?.answers;
  const { loading, error, run } = useAsync();

  const make = () =>
    run(async () => {
      const r = await api.overview(work);
      update({ overview: r });
    });

  const rows: [string, string | undefined][] = ov
    ? [
        ["갈래", ov.genre],
        ["성격", ov.character],
        ["제재", ov.subject],
        ["주제", ov.theme],
        ["운율", ov.rhythm],
        ["어조", ov.tone],
        ["구성", ov.structure],
      ]
    : [];

  return (
    <>
      <Section
        title="5단계 · 작품 개관 정리"
        desc="지금까지 감상한 내용을 한 장으로 정리해요. [인쇄/PDF 저장]으로 학습지처럼 보관할 수 있어요."
      >
        <div className="row no-print">
          <button className="btn" onClick={make} disabled={loading || !signedIn}>
            {loading ? <Spinner text="개관 정리하는 중…" /> : ov ? "개관 다시 만들기" : "📋 작품 개관 만들기"}
          </button>
        </div>
        <LoginHint signedIn={signedIn} />
        {error && <p className="error">{error}</p>}
      </Section>

      <div className="print-sheet">
        <Section title={`「${work.title}」 ${work.author}`}>
          <div className="split">
            <div className="split-left">
              <PoemView poem={work} />
            </div>
            <div className="split-right">
              {ov ? (
                <>
                  <table className="overview">
                    <tbody>
                      {rows.map(([k, v]) => (
                        <tr key={k}>
                          <th>{k}</th>
                          <td>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <h3>표현상 특징</h3>
                  <ul className="dotlist">
                    {ov.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <h3>시험 포인트</h3>
                  <ul className="dotlist">
                    {ov.examPoints.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="empty">[작품 개관 만들기]를 누르면 이곳에 정리돼요.</p>
              )}
            </div>
          </div>
        </Section>

        <Section title="🧭 나의 감상 4단계">
          <table className="overview mine">
            <tbody>
              <tr>
                <th>① 화자 상태</th>
                <td>{clinic?.speaker || "—"}</td>
              </tr>
              <tr>
                <th>② 대상 +/-</th>
                <td>
                  {clinic?.targets?.filter((t) => t.name.trim()).length
                    ? clinic.targets
                        .filter((t) => t.name.trim())
                        .map((t) => `${t.name} (${t.sign || "?"})`)
                        .join(", ")
                    : "—"}
                  {clinic?.targetNote ? <div className="sub">{clinic.targetNote}</div> : null}
                </td>
              </tr>
              <tr>
                <th>③ 감정·생각 결론</th>
                <td>{clinic?.conclusion || "—"}</td>
              </tr>
              <tr>
                <th>④ 시인이 하고자 하는 말</th>
                <td>{clinic?.message || "—"}</td>
              </tr>
            </tbody>
          </table>
        </Section>
      </div>
    </>
  );
}
