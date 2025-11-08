
import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";


const BOARD_DOC = doc(db, "boards", "default");


export async function loadBoardState() {
  const snap = await getDoc(BOARD_DOC);
  if (!snap.exists()) return null;         
  return snap.data();                     
}


export async function saveBoardState(fullState) {

  const payload = { ...fullState, _updatedAt: serverTimestamp() };
  await setDoc(BOARD_DOC, payload, { merge: false });
}
