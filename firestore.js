import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const cardsRef = collection(db, "cards");


export async function getCards() {
  const snapshot = await getDocs(cardsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


export async function addCard(data) {
  await addDoc(cardsRef, data);
}


export async function deleteCard(id) {
  await deleteDoc(doc(db, "cards", id));
}


export async function updateCard(id, data) {
  await updateDoc(doc(db, "cards", id), data);
}

