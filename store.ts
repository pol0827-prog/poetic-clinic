import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import type { Poem, Progress, Work } from "./types";

/** Firestore 는 undefined 값을 허용하지 않으므로 제거한다. */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export async function watchWorks(uid: string, cb: (works: Work[]) => void): Promise<() => void> {
  const { db } = await getFirebase();
  const q = query(collection(db, "users", uid, "works"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt as Timestamp | null;
        return {
          id: d.id,
          title: data.title,
          author: data.author,
          lines: data.lines,
          progress: data.progress ?? {},
          createdAt: ts ? ts.toMillis() : Date.now(),
        } as Work;
      })
    );
  });
}

export async function addWork(uid: string, poem: Poem): Promise<string> {
  const { db } = await getFirebase();
  const ref = await addDoc(collection(db, "users", uid, "works"), {
    title: poem.title,
    author: poem.author,
    lines: poem.lines,
    progress: {},
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function saveProgress(uid: string, workId: string, progress: Progress): Promise<void> {
  const { db } = await getFirebase();
  await setDoc(doc(db, "users", uid, "works", workId), { progress: clean(progress) }, { merge: true });
}

export async function removeWork(uid: string, workId: string): Promise<void> {
  const { db } = await getFirebase();
  await deleteDoc(doc(db, "users", uid, "works", workId));
}
