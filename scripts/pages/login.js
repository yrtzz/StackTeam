import { auth, provider as googleProvider } from "../../firebase.js";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

await setPersistence(auth, browserLocalPersistence);

onAuthStateChanged(auth, (user) => {
  if (user) {
    location.replace("/app.html");
  }
});

const form = document.getElementById("form-login-email");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    if (!emailInput) return;
    const email = emailInput.value.trim();
    if (!email) return;

    try {
      await signInWithEmailAndPassword(auth, email, "default");
      location.href = "/app.html";
    } catch (err) {
      alert("Не удалось войти: " + (err.message || ""));
    }
  });
}

const googleBtn = document.getElementById("btn-google-login");
if (googleBtn) {
  googleBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signInWithPopup(auth, googleProvider);
      location.href = "/app.html";
    } catch (err) {
      console.log(err);
      alert("Ошибка входа через Google");
    }
  });
}
