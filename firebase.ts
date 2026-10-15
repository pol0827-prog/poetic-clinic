import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";

export const FUNCTIONS_REGION = "asia-northeast3"; // 서울

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
}

/**
 * 설정 불러오기 순서
 * 1) .env 의 VITE_FIREBASE_* 값이 있으면 사용
 * 2) 없으면 Firebase Hosting 이 자동으로 제공하는 /__/firebase/init.json 사용
 *    (Firebase Hosting 에 배포하면 별도 설정 없이 동작)
 */
async function loadConfig(): Promise<FirebaseOptions> {
  const env = import.meta.env;
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };
  }
  const res = await fetch("/__/firebase/init.json");
  if (!res.ok) {
    throw new Error(
      "Firebase 설정을 찾을 수 없어요. .env 파일에 VITE_FIREBASE_* 값을 넣거나 Firebase Hosting 에 배포해 주세요."
    );
  }
  return (await res.json()) as FirebaseOptions;
}

let servicesPromise: Promise<FirebaseServices> | null = null;

export function getFirebase(): Promise<FirebaseServices> {
  if (!servicesPromise) {
    servicesPromise = loadConfig().then((config) => {
      const app = initializeApp(config);
      const auth = getAuth(app);
      const db = getFirestore(app);
      const functions = getFunctions(app, FUNCTIONS_REGION);
      if (import.meta.env.VITE_USE_EMULATORS === "true") {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
        connectFirestoreEmulator(db, "127.0.0.1", 8080);
        connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      }
      return { app, auth, db, functions };
    });
  }
  return servicesPromise;
}
