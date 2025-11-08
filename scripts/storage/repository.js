import { saveLocal, loadLocal } from './local.js';
import { remote as firestoreRemote } from './remote.js';

// сначала объявляем, потом используем
let remote = null;
export function setRemoteAdapter(adapter){ remote = adapter; }

// подключаем Firestore-адаптер (можешь временно убрать эту строку, если хочешь работать только локально)
setRemoteAdapter(firestoreRemote);

export async function loadData(){
  // 1) пробуем удалёнку
  if (remote){
    try{
      const r = await remote.load();
      if (r?.desks) return r;
    }catch(e){
      console.warn('[repository] remote load failed:', e);
    }
  }
  // 2) локалка
  return loadLocal();
}

let saveTimer = null;
export function saveData(data){
  // локальный бэкап всегда
  try { saveLocal(data); } catch(e){ console.warn('[repository] saveLocal failed:', e); }

  // удалёнка с дебаунсом
  if (remote){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { await remote.save(data); }
      catch(e){ console.warn('[repository] remote save failed:', e); }
    }, 600);
  }
}
