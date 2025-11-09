import { subscribeAuth } from './core/auth.js';
import { setUser, setData } from './core/state.js';
import { repositorySetUser, loadData } from './storage/repository.js';
import { renderHeader } from './ui/header.js';
import { renderColumns } from './ui/columns.js';

async function handleAuthChange(fbUser) {
  setUser(fbUser ? { uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName } : null);
  repositorySetUser(fbUser?.uid || null);
  const data = await loadData();
  setData(data);
  renderHeader();
  renderColumns();
}

async function boot() {
  renderHeader();
  renderColumns();
  subscribeAuth(handleAuthChange);
}

boot();
