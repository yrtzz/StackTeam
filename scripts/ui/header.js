export function renderHeader() {
  const root = document.querySelector('#header');
  if (!root) return;

  root.innerHTML = `
    <h1 class="app-title">StackTeam</h1>
  `;
}
