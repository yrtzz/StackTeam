import { db } from '/firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
const BOARD_DOC = doc(db, 'boards', 'default'); // позже сменим на per-user

export const remote = {
  async load(){
    const snap = await getDoc(BOARD_DOC);
    return snap.exists() ? snap.data() : null;
  },
  async save(data){
    await setDoc(BOARD_DOC, { ...data, _updatedAt: serverTimestamp() }, { merge:false });
  }
};
