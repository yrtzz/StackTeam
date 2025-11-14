import { getUser } from "../core/state.js";
import { signIn, signOut } from "../core/auth.js";

export function renderAuthControls() {
  const box =
    document.querySelector('[data-role="auth-controls"]') ||
    document.querySelector('#authControls') ||
    document.querySelector('#auth-controls');

  if (!box) return;

  const user = getUser();

  if (user) {
    const label = user.email ?? user.displayName ?? "Аккаунт";
    box.innerHTML = `
      <span class="auth-user">${label}</span>
      <button id="btnSignOut" class="auth-btn auth-btn-logout">Выйти</button>
    `;
  } else {
    box.innerHTML = `
      <button id="btnSignIn" class="auth-btn auth-btn-login">Войти с Google</button>
    `;
  }

  const signInBtn = box.querySelector("#btnSignIn");
  const signOutBtn = box.querySelector("#btnSignOut");

  if (signInBtn) {
    signInBtn.addEventListener("click", () => {
      signIn();
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async () => {
      try {
        await signOut();
      } finally {
        window.location.href = "/signup.html?logout=1";
      }
    });
  }
}
