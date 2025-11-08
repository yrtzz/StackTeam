// /scripts/features/dnd.js
// Универсальные хелперы для Drag & Drop колонок/карточек

import { qsa } from "../core/dom.js";

/**
 * Делает карточку источником DnD (draggable)
 * @param {HTMLElement} cardEl - DOM-элемент карточки (.card)
 * @param {{deskId:string, colId:string, cardId:string}} ctx
 */
export function makeCardDraggable(cardEl, ctx) {
  cardEl.setAttribute("draggable", "true");

  cardEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/cardId", ctx.cardId);
    e.dataTransfer.setData("text/fromCol", ctx.colId);
    e.dataTransfer.setData("text/fromDesk", ctx.deskId);
    cardEl.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("dragging");
  });
}

/**
 * Подключает DnD-приёмник для контейнера карточек в колонке
 * @param {HTMLElement} cardsWrap - контейнер карточек (.column-cards)
 * @param {{deskId:string, colId:string, onMove:(fromDeskId:string, fromColId:string, cardId:string, toDeskId:string, toColId:string, insertIndex:number|null)=>void}} ctx
 */
export function attachColumnDropzone(cardsWrap, ctx) {
  // подсветку/позиционирование делаем через вычисление ближайшего элемента
  cardsWrap.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterEl = getDragAfterElement(cardsWrap, e.clientY);
    const dragging = document.querySelector(".card.dragging");
    if (!dragging) return;
    if (!afterEl) cardsWrap.appendChild(dragging);
    else cardsWrap.insertBefore(dragging, afterEl);
  });

  cardsWrap.addEventListener("drop", (e) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/cardId");
    const fromColId = e.dataTransfer.getData("text/fromCol");
    const fromDeskId = e.dataTransfer.getData("text/fromDesk");
    if (!cardId) return;

    const siblings = qsa(".card", cardsWrap);
    const afterEl = getDragAfterElement(cardsWrap, e.clientY);
    let idx = siblings.length;
    if (afterEl) idx = siblings.indexOf(afterEl);

    ctx.onMove(fromDeskId, fromColId, cardId, ctx.deskId, ctx.colId, Number.isFinite(idx) ? idx : null);
  });
}

/** Возвращает элемент-карточку, ПОСЛЕ которого следует вставлять перетаскиваемую */
export function getDragAfterElement(container, mouseY) {
  const siblings = qsa(".card:not(.dragging)", container);
  let closest = { offset: Number.NEGATIVE_INFINITY, el: null };

  for (const child of siblings) {
    const box = child.getBoundingClientRect();
    const offset = mouseY - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, el: child };
    }
  }
  return closest.el;
}
