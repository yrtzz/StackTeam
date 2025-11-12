// scripts/pages/signup.js
import { auth, provider as googleProvider } from '../../firebase.js';
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

await setPersistence(auth, browserLocalPersistence);

onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = '/app.html';
});

// --- Google ---
const googleLink = document.querySelector('.social-login .fa-google')?.closest('a');
if (googleLink) {
  googleLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signInWithPopup(auth, googleProvider);
      window.location.href = '/app.html';
    } catch (err) { console.warn(err); }
  });
}

// --- Email form ---
const form = document.getElementById('form-signup-email');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.querySelector('input[type="email"]')?.value.trim();
  if (!email) return;

  try {
    // пробуем войти
    await signInWithEmailAndPassword(auth, email, 'default');
    window.location.href = '/app.html';
  } catch (err) {
    // если нет такого пользователя — создаём
    if (err.code === 'auth/user-not-found') {
      try {
        await createUserWithEmailAndPassword(auth, email, 'default');
        window.location.href = '/app.html';
      } catch (e2) { console.warn(e2); }
    } else {
      console.warn(err);
    }
  }
});
