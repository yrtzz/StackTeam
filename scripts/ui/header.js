import { getUser } from '../core/state.js';
import { signIn, signOut } from '../core/auth.js';

export function renderHeader() {
  const root = document.querySelector('#header');
  if (!root) return;
  const user = getUser();

  root.innerHTML = `
    <div class="header-inner">
      <div class="left"><h1>StackTeam</h1></div>
      <div class="center"><div id="boards-switcher"></div></div>
      <div class="right">
        ${
          user
            ? `<span class="user-email">${user.email ?? user.displayName ?? 'Signed in'}</span>
               <button id="btnSignOut">Выйти</button>`
            : `<button id="btnSignIn">Войти с Google</button>`
        }
      </div>
    </div>
  `;
  root.querySelector('#btnSignIn')?.addEventListener('click', () => signIn());
  root.querySelector('#btnSignOut')?.addEventListener('click', () => signOut());
}
