// scripts/pages/signup.js
import { auth, provider } from "../../firebase.js";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// сессия в localStorage, чтобы не слетала при обновлении страницы
await setPersistence(auth, browserLocalPersistence);

// если пришли с ?logout=1 — подчистим сессию
const qs = new URLSearchParams(location.search);
if (qs.get("logout") === "1") {
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.log("logout cleanup error", e);
  }
}

// если уже залогинен — сразу в app.html
onAuthStateChanged(auth, (user) => {
  if (user) {
    location.replace("/app.html");
  }
});

// --- регистрация/вход по email (без пароля в UI) ---
const form = document.getElementById("form-signup-email");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = form.querySelector('input[type="email"]');
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email) return;

    try {
      // пробуем СОЗДАТЬ пользователя с паролем "default"
      await createUserWithEmailAndPassword(auth, email, "default");
      location.href = "/app.html";
    } catch (err) {
      // если уже есть такой email — просто логиним
      if (err.code === "auth/email-already-in-use") {
        try {
          await signInWithEmailAndPassword(auth, email, "default");
          location.href = "/app.html";
        } catch (err2) {
          console.error(err2);
          alert("Не удалось войти: " + (err2.message || ""));
        }
      } else {
        console.error(err);
        alert("Ошибка регистрации: " + (err.message || ""));
      }
    }
  });
}

// --- вход через Google ---
const googleBtn = document.getElementById("btn-google-signup");

if (googleBtn) {
  googleBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signInWithPopup(auth, provider);
      location.href = "/app.html";
    } catch (err) {
      console.error(err);
      alert("Ошибка входа через Google");
    }
  });
}
