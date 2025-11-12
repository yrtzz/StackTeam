import { getUser } from '../core/state.js';
import { signOut } from '../core/auth.js';

const host = document.querySelector('[data-account], .account-icon, #accountIcon');
if (!host) return;

const menu = document.createElement('div');
menu.style.position = 'absolute';
menu.style.minWidth = '180px';
menu.style.padding = '8px';
menu.style.background = 'white';
menu.style.border = '1px solid #ddd';
menu.style.borderRadius = '8px';
menu.style.boxShadow = '0 8px 24px rgba(0,0,0,.12)';
menu.style.zIndex = '9999';
menu.style.display = 'none';

function syncMenu() {
  const u = getUser();
  menu.innerHTML = `
    <div style="font-size:12px;color:#555;margin-bottom:6px;">
      ${u ? (u.email ?? u.displayName ?? 'Аккаунт') : 'Гость'}
    </div>
    ${u ? `<button id="accSignOut" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fafafa;cursor:pointer;">Выйти</button>`
         : `<a href="/signup.html" style="display:block;text-align:center;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fafafa;text-decoration:none;color:#111;">Войти</a>`}
  `;
  menu.querySelector('#accSignOut')?.addEventListener('click', async () => {
    try { await signOut(); } catch {}
    menu.style.display = 'none';
    window.location.href = '/signup.html?logout=1';
  });
}

function placeMenu() {
  const r = host.getBoundingClientRect();
  menu.style.top = `${r.bottom + window.scrollY + 6}px`;
  menu.style.left = `${r.right - 180 + window.scrollX}px`;
}

document.addEventListener('click', (e) => {
  if (e.target === host) return;
  if (!menu.contains(e.target)) menu.style.display = 'none';
});

host.style.cursor = 'pointer';
host.addEventListener('click', (e) => {
  e.preventDefault();
  syncMenu();
  placeMenu();
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
});

document.body.appendChild(menu);
