import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkQeetG2jMC7RSIyVo0glPBYBe9Rm5AmY",
  authDomain: "stackteam.firebaseapp.com",
  projectId: "stackteam",
  storageBucket: "stackteam.firebasestorage.app",
  messagingSenderId: "867726151269",
  appId: "1:867726151269:web:dc1282bcc3be889c51808c",
  measurementId: "G-CZG67HRJ9Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, provider, db };

