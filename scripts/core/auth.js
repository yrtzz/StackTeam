import { auth, provider } from '../../firebase.js';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const subscribers = new Set();

export function subscribeAuth(cb) {
  subscribers.add(cb);
  const unsub = onAuthStateChanged(auth, (user) => {
    for (const fn of subscribers) fn(user);
  });
  return () => { subscribers.delete(cb); unsub(); };
}

export async function signIn() {
  await signInWithPopup(auth, provider);
}

export async function signOut() {
  await fbSignOut(auth);
}
