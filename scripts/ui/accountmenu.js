import { getUser } from '../core/state.js';
import { signOut } from '../core/auth.js';

export function initAccountMenu(selector = '[data-account], .account-icon, #accountIcon') {
  const host = document.querySelector(selector);
  if (!host) return null;

  const menu = document.createElement('div');
  Object.assign(menu.style, {
    position: 'absolute',
    minWidth: '180px',
    padding: '8px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    zIndex: '9999',
    display: 'none'
  });

  function syncMenu() {
    const u = getUser();
    menu.innerHTML = `
      <div style="font-size:12px;color:#555;margin-bottom:6px;">
        ${u ? (u.email ?? u.displayName ?? 'Аккаунт') : 'Гость'}
      </div>
      ${
        u
          ? `<button id="accSignOut" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fafafa;cursor:pointer;">Выйти</button>`
          : `<a href="/signup.html" style="display:block;text-align:center;padding:8px;border:1px solid #ddd;border-radius:6px;background:#fafafa;text-decoration:none;color:#111;">Войти</a>`
      }
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

  function open() { syncMenu(); placeMenu(); menu.style.display = 'block'; }
  function close() { menu.style.display = 'none'; }
  function destroy() {
    close();
    document.removeEventListener('click', onDocClick);
    host.removeEventListener('click', onHostClick);
    menu.remove();
  }

  function onDocClick(e) { if (e.target !== host && !menu.contains(e.target)) close(); }
  function onHostClick(e) { e.preventDefault(); menu.style.display === 'none' ? open() : close(); }

  document.addEventListener('click', onDocClick);
  host.style.cursor = 'pointer';
  host.addEventListener('click', onHostClick);
  document.body.appendChild(menu);

  return { open, close, destroy, el: menu };
}
