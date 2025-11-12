// scripts/ui/authControls.js
import { getUser } from '../core/state.js';
import { signIn, signOut } from '../core/auth.js';

function pickMount() {
  return (
    document.querySelector('.header-right') ||
    document.querySelector('.app-header')
  );
}

export function renderAuthControls() {
  const mount = pickMount();
  if (!mount) return;

  let box = mount.querySelector('#authControls');
  if (!box) {
    box = document.createElement('div');
    box.id = 'authControls';
    box.style.display = 'flex';
    box.style.alignItems = 'center';
    box.style.gap = '8px';
    // если это .app-header без правой колонки — прижмём вправо
    if (mount.classList.contains('app-header')) {
      box.style.marginLeft = 'auto';
    }
    mount.appendChild(box);
  }

  const u = getUser();
  box.innerHTML = u
    ? `<span class="user-email" style="font-size:14px;opacity:.85;">${u.email ?? u.displayName ?? 'Аккаунт'}</span>
       <button id="btnSignOut" class="btn btn-outline">Выйти</button>`
    : `<button id="btnSignIn" class="btn btn-primary">Войти</button>`;

  box.querySelector('#btnSignIn')?.addEventListener('click', () => {
    // если хочешь только через форму — можно редиректом:
    // window.location.href = '/signup.html';
    signIn();
  });

  box.querySelector('#btnSignOut')?.addEventListener('click', async () => {
    try { await signOut(); } finally {
      window.location.href = '/signup.html?logout=1';
    }
  });
}
