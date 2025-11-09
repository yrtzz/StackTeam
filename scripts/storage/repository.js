import { saveLocal, loadLocal } from './local.js';
import { remote as remoteStore, setUser as remoteSetUser } from './remote.js';

let saveTimer = null;

export function repositorySetUser(uid) {
  try { remoteSetUser(uid || null); } catch {}
}

export async function loadData() {
  try {
    const r = await remoteStore.load();
    if (r && r.desks) return r;
  } catch {}
  return loadLocal();
}

export function saveData(data) {
  try { saveLocal(data); } catch {}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await remoteStore.save(data); } catch {}
  }, 600);
}
