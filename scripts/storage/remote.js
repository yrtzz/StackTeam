import { db } from '../../firebase.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

let currentUid = null;
export function setUser(uid) { currentUid = uid || null; }

function userDocRef() {
  if (!currentUid) return null;
  return doc(db, 'users', currentUid, 'boards', 'default');
}

export const remote = {
  async load() {
    if (!currentUid) return null;
    const ref = userDocRef();
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },
  async save(data) {
    if (!currentUid) return;
    const ref = userDocRef();
    await setDoc(ref, { ...data, _updatedAt: serverTimestamp() }, { merge: false });
  },
};
