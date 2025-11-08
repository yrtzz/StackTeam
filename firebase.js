import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
const firebaseConfig = {
  apiKey: "AIzaSyCkQeetG2jMC7RSIyVo0glPBYBe9Rm5AmY",
  authDomain: "stackteam.firebaseapp.com",
  projectId: "stackteam",
  storageBucket: "stackteam.firebasestorage.app",
  messagingSenderId: "867726151269",
  appId: "1:867726151269:web:dc1282bcc3be889c51808c",
  measurementId: "G-CZG67HRJ9Q"
};
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);


