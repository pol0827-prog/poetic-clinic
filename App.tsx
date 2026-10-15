import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirebase } from "./firebase";
import { saveProgress, watchWorks } from "./store";
import { SAMPLE_WORK, type Progress, type Work } from "./types";
import Step1Refine from "./components/Step1Refine";
import Step2Overall from "./components/Step2Overall";
import Step3Clinic from "./components/Step3Clinic";
import Step4Lines from "./components/Step4Lines";
import Step5Overview from "./components/Step5Overview";

const STEPS = ["지문 정제", "전체 감상", "감상 방법 클리닉", "한 행씩 표현기법 클리닉", "작품 개관 정리"];

export interface StepProps {
  work: Work;
  progress: Progress;
  update: (patch: Partial<Progress>) => void;
  signedIn: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [initError, setInitError] = useState("");
  const [works, setWorks] = useState<Work[]>([]);
  const [work, setWork] = useState<Work>(SAMPLE_WORK);
  const [progress, setProgress] = useState<Progress>({});
  const [step, setStep] = useState(0);
  const saveTimer = useRef<number | undefined>(undefined);

  // 로그인 상태 감시
  useEffect(() => {
    let unsub: (() => void) | undefined;
    getFirebase()
      .then(({ auth }) => {
        unsub = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setAuthReady(true);
        });
      })
      .catch((e: Error) => {
        setInitError(e.message);
        setAuthReady(true);
      });
    return () => unsub?.();
  }, []);

  // 작품함 실시간 동기화
  useEffect(() => {
    if (!user) {
      setWorks([]);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    watchWorks(user.uid, (list) => !cancelled && setWorks(list)).then((u) => {
      if (cancelled) u();
      else unsub = u;
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [user]);

  const openWork = useCallback((w: Work, goStep = 1) => {
    setWork(w);
    setProgress(w.progress ?? {});
    setStep(goStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const update = useCallback(
    (patch: Partial<Progress>) => {
      setProgress((prev) => {
        const next = { ...prev, ...patch };
        if (user && work.id !== "sample") {
          window.clearTimeout(saveTimer.current);
          const uid = user.uid;
          const id = work.id;
          saveTimer.current = window.setTimeout(() => {
            saveProgress(uid, id, next).catch((e) => console.error("저장 실패", e));
          }, 600);
        }
        return next;
      });
    },
    [user, work.id]
  );

  const login = async () => {
    const { auth } = await getFirebase();
    await signInWithPopup(auth, new GoogleAuthProvider()).catch((e: Error) => alert(e.message));
  };
  const logout = async () => {
    const { auth } = await getFirebase();
    await signOut(auth);
    openWork(SAMPLE_WORK, 0);
  };

  const go = (n: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const props: StepProps = { work, progress, update, signedIn: !!user };

  return (
    <div className="page">
      <header className="hero">
        <div className="auth-bar no-print">
          {!authReady ? null : user ? (
            <>
              <span className="who">{user.displayName ?? user.email} 님</span>
              <button className="btn ghost sm" onClick={logout}>
                로그아웃
              </button>
            </>
          ) : (
            <button className="btn ghost sm" onClick={login} disabled={!!initError}>
              Google 로그인
            </button>
          )}
        </div>
        <p className="eyebrow">POETRY CLINIC</p>
        <h1>시 감상 방법 클리닉 🌸</h1>
        <p className="formula">
          <span>화자 상태</span>→<span>대상 +/-</span>→<span>감정·생각 결론</span>→<span>시인이 하고자 하는 말</span>
        </p>
        <ol className="stepper no-print">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button className={i === step ? "active" : i < step ? "done" : ""} onClick={() => go(i)}>
                <b>{i + 1}</b>
                <span>{s}</span>
              </button>
            </li>
          ))}
        </ol>
      </header>

      {initError && <div className="alert">{initError}</div>}

      <main className="content">
        {step === 0 && (
          <Step1Refine {...props} user={user} works={works} onOpen={(w) => openWork(w, 1)} onLogin={login} />
        )}
        {step === 1 && <Step2Overall {...props} />}
        {step === 2 && <Step3Clinic {...props} />}
        {step === 3 && <Step4Lines {...props} />}
        {step === 4 && <Step5Overview {...props} />}
      </main>

      <nav className="bottom-nav no-print">
        <button className="btn ghost" onClick={() => go(0)}>
          🏠 홈으로
        </button>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => go(step - 1)} disabled={step === 0}>
          ◀ 이전
        </button>
        <button className="btn" onClick={() => go(step + 1)} disabled={step === STEPS.length - 1}>
          다음 ▶
        </button>
        <button className="btn ghost" onClick={() => window.print()}>
          🖨️ 인쇄/PDF 저장
        </button>
      </nav>
    </div>
  );
}
