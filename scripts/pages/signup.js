// scripts/pages/signup.js
import { auth, provider as googleProvider } from '../../firebase.js';
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

await setPersistence(auth, browserLocalPersistence);

// /signup.html?logout=1 — форс-выход для тестов
const qs = new URLSearchParams(location.search);
if (qs.get('logout') === '1') {
  try { await signOut(auth); } catch {}
}

onAuthStateChanged(auth, (user) => {
  if (user && qs.get('logout') !== '1') window.location.href = '/app.html';
});

// Google
const googleLink = document.querySelector('.social-login .fa-google')?.closest('a');
if (googleLink) {
  googleLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await signInWithPopup(auth, googleProvider);
      window.location.href = '/app.html';
    } catch {}
  });
}

// Email (оставляем одно поле e-mail; пароль — заглушка 'default')
const form = document.getElementById('form-signup-email');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.querySelector('input[type="email"]')?.value.trim();
  if (!email) return;
  try {
    await signInWithEmailAndPassword(auth, email, 'default');
    window.location.href = '/app.html';
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      try {
        await createUserWithEmailAndPassword(auth, email, 'default');
        window.location.href = '/app.html';
      } catch {}
    }
  }
});
