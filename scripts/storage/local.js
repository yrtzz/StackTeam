const KEY = 'krello-data-v2';
export function saveLocal(data){ localStorage.setItem(KEY, JSON.stringify(data)); }
export function loadLocal(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed.desks)) return parsed;
  }catch(e){ console.warn(e); }
  return null;
}
