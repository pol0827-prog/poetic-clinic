import { useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { StepProps } from "../App";
import { api, fileToBase64 } from "../api";
import { addWork, removeWork } from "../store";
import { SAMPLE_WORK, type Work } from "../types";
import { PoemView, Section, Spinner, useAsync } from "./common";

const MAX_MB = 7;

interface Props extends StepProps {
  user: User | null;
  works: Work[];
  onOpen: (w: Work) => void;
  onLogin: () => void;
}

export default function Step1Refine({ work, user, works, onOpen, onLogin }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [found, setFound] = useState<Work[] | null>(null);
  const { loading, error, run } = useAsync();

  const refine = () =>
    run(async () => {
      if (!user) throw new Error("정제 기능은 Google 로그인 후 사용할 수 있어요.");
      if (!file) throw new Error("먼저 시험지 PDF를 올려 주세요.");
      if (file.size > MAX_MB * 1024 * 1024) throw new Error(`PDF는 ${MAX_MB}MB 이하만 올릴 수 있어요.`);
      const base64 = await fileToBase64(file);
      const { poems } = await api.refine(base64);
      if (!poems.length) throw new Error("네모 안에서 현대시를 찾지 못했어요. 다른 PDF로 시도해 보세요.");
      // 정제한 작품은 모두 작품함에 저장
      const saved: Work[] = [];
      for (const p of poems) {
        const id = await addWork(user.uid, p);
        saved.push({ ...p, id, progress: {} });
      }
      setFound(saved);
    });

  return (
    <>
      <Section
        title="1단계 · 지문 정제"
        desc={
          <>
            시험지 PDF를 올리고 <b>정제</b>를 누르면 네모 안의 작품 중 <b>현대시만</b> 골라 문제용 기호를 지우고
            보여 줍니다.
          </>
        }
      >
        <div className="upload-row">
          <button className="btn ghost" onClick={() => inputRef.current?.click()}>
            📄 PDF 올리기
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setFound(null);
            }}
          />
          <span className="file-name">{file ? file.name : "선택된 파일 없음"}</span>
          <button className="btn" onClick={refine} disabled={loading || !file}>
            {loading ? <Spinner text="정제하는 중…" /> : "✨ 정제"}
          </button>
        </div>
        {!user && (
          <p className="hint">
            🔐 정제와 작품함은 로그인 후 사용할 수 있어요.{" "}
            <button className="link" onClick={onLogin}>
              Google 로그인
            </button>
          </p>
        )}
        {error && <p className="error">{error}</p>}

        {found && (
          <div className="found">
            <p className="ok">✅ 현대시 {found.length}편을 찾아 작품함에 저장했어요.</p>
            <ul className="work-list">
              {found.map((w) => (
                <li key={w.id}>
                  <span>
                    <b>{w.title}</b> {w.author}
                  </span>
                  <button className="btn sm" onClick={() => onOpen(w)}>
                    학습하기 ▶
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="지금 학습 중인 작품">
        <PoemView poem={work} />
      </Section>

      <Section title={`📚 작품함 (${works.length}편)`} desc="정제한 작품이 여기에 남아 다음에도 다시 학습할 수 있어요.">
        {!user ? (
          <p className="empty">로그인하면 작품함을 쓸 수 있어요.</p>
        ) : works.length === 0 ? (
          <p className="empty">아직 저장된 작품이 없어요.</p>
        ) : (
          <ul className="work-list">
            {works.map((w) => (
              <li key={w.id} className={w.id === work.id ? "current" : ""}>
                <span>
                  <b>{w.title}</b> {w.author}
                  <ProgressDots w={w} />
                </span>
                <span className="actions">
                  <button className="btn sm" onClick={() => onOpen(w)}>
                    열기
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      if (confirm(`「${w.title}」을(를) 작품함에서 지울까요?`)) {
                        removeWork(user.uid, w.id).catch((e: Error) => alert(e.message));
                        if (w.id === work.id) onOpen(SAMPLE_WORK);
                      }
                    }}
                  >
                    삭제
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <button className="link" onClick={() => onOpen(SAMPLE_WORK)}>
          예시 작품(진달래꽃)으로 연습하기
        </button>
      </Section>
    </>
  );
}

function ProgressDots({ w }: { w: Work }) {
  const p = w.progress ?? {};
  const done = [!!p.overall, !!p.clinic?.feedback?.message, !!p.lines?.analysis?.length, !!p.overview];
  return (
    <span className="dots" title="전체 감상 · 클리닉 · 표현기법 · 개관">
      {done.map((d, i) => (
        <i key={i} className={d ? "on" : ""} />
      ))}
    </span>
  );
}
