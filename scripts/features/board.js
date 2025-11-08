import { getData, setData } from '../core/state.js';
import { saveData } from '../storage/repository.js';

const uid = (p='id') => `${p}_${Date.now().toString(36)}_${Math.floor(Math.random()*1e4)}`;

// ─── getters/active ─────────────────────────────────────────────────────────────
export function getActiveDesk(){
  const { desks, activeDeskId } = getData();
  return desks.find(d => d.id === activeDeskId) || null;
}

export function setActiveDesk(deskId){
  const data = structuredClone(getData());
  if (!data.desks.find(d => d.id === deskId)) return;
  data.activeDeskId = deskId;
  setData(data); saveData(data);
}

// ─── desks ─────────────────────────────────────────────────────────────────────
export function createDesk(title='Main Desk'){
  const data = structuredClone(getData());
  const desk = { id: uid('desk'), title: title.trim() || 'Main Desk', columns: [] };
  data.desks.push(desk);
  data.activeDeskId = desk.id;
  setData(data); saveData(data);
  return desk;
}

export function renameDesk(deskId, newTitle){
  const data = structuredClone(getData());
  const d = data.desks.find(x => x.id === deskId);
  if (!d) return;
  d.title = (newTitle && newTitle.trim()) || d.title;
  setData(data); saveData(data);
}

export function deleteDesk(deskId){
  const data = structuredClone(getData());
  const idx = data.desks.findIndex(x => x.id === deskId);
  if (idx === -1) return;
  data.desks.splice(idx, 1);
  if (data.desks.length === 0){
    const fresh = { id: uid('desk'), title: 'Main Desk', columns: [] };
    data.desks.push(fresh);
    data.activeDeskId = fresh.id;
  } else if (data.activeDeskId === deskId){
    data.activeDeskId = data.desks[0].id;
  }
  setData(data); saveData(data);
}

// ─── columns ───────────────────────────────────────────────────────────────────
export function addColumn(title='New Column'){
  const data = structuredClone(getData());
  const desk = data.desks.find(d => d.id === data.activeDeskId);
  if (!desk) return null;
  const col = { id: uid('col'), title: title.trim() || 'New Column', cards: [] };
  desk.columns.push(col);
  setData(data); saveData(data);
  return col;
}

export function renameColumn(deskId, colId, newTitle){
  const data = structuredClone(getData());
  const desk = data.desks.find(d => d.id === deskId);
  if (!desk) return;
  const col = desk.columns.find(c => c.id === colId);
  if (!col) return;
  col.title = (newTitle && newTitle.trim()) || col.title;
  setData(data); saveData(data);
}

export function deleteColumn(deskId, colId){
  const data = structuredClone(getData());
  const desk = data.desks.find(d => d.id === deskId);
  if (!desk) return;
  desk.columns = desk.columns.filter(c => c.id !== colId);
  setData(data); saveData(data);
}

// ─── cards ─────────────────────────────────────────────────────────────────────
export function addCard(deskId, colId, content='', img=''){
  const data = structuredClone(getData());
  const desk = data.desks.find(d => d.id === deskId);
  if (!desk) return null;
  const col = desk.columns.find(c => c.id === colId);
  if (!col) return null;
  const card = { id: uid('card'), content: content || '', img: img || '', done: false };
  col.cards.push(card);
  setData(data); saveData(data);
  return card;
}

export function updateCard(deskId, colId, cardId, content, img){
  const data = structuredClone(getData());
  const desk = data.desks.find(d => d.id === deskId);
  const col = desk?.columns.find(c => c.id === colId);
  const card = col?.cards.find(k => k.id === cardId);
  if (!card) return;
  if (typeof content === 'string') card.content = content;
  if (typeof img === 'string') card.img = img;
  setData(data); saveData(data);
}

export function deleteCard(deskId, colId, cardId){
  const data = structuredClone(getData());
  const desk = data.desks.find(d => d.id === deskId);
  const col = desk?.columns.find(c => c.id === colId);
  if (!col) return;
  col.cards = col.cards.filter(k => k.id !== cardId);
  setData(data); saveData(data);
}

export function toggleCardDone(deskId, colId, cardId, done){
  const data = structuredClone(getData());
  const desk = data.desks.find(d => d.id === deskId);
  const col = desk?.columns.find(c => c.id === colId);
  const card = col?.cards.find(k => k.id === cardId);
  if (!card) return;
  card.done = !!done;
  setData(data); saveData(data);
}

// ─── move ──────────────────────────────────────────────────────────────────────
export function moveCard(fromDeskId, fromColId, cardId, toDeskId, toColId, insertIndex=null){
  const data = structuredClone(getData());
  const fromDesk = data.desks.find(d => d.id === fromDeskId);
  const toDesk = data.desks.find(d => d.id === toDeskId);
  const fromCol = fromDesk?.columns.find(c => c.id === fromColId);
  const toCol = toDesk?.columns.find(c => c.id === toColId);
  if (!fromCol || !toCol) return;

  const idx = fromCol.cards.findIndex(c => c.id === cardId);
  if (idx === -1) return;
  const [card] = fromCol.cards.splice(idx, 1);

  if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= toCol.cards.length){
    toCol.cards.splice(insertIndex, 0, card);
  } else {
    toCol.cards.push(card);
  }

  setData(data); saveData(data);
}
