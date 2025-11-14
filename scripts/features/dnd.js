// /scripts/features/dnd.js
// Универсальные хелперы для Drag & Drop карточек и колонок

import { qsa } from "../core/dom.js";

/**
 * Делает карточку источником DnD (draggable)
 * @param {HTMLElement} cardEl - DOM-элемент карточки (.card)
 * @param {{deskId:string, colId:string, cardId:string}} ctx
 */
export function makeCardDraggable(cardEl, ctx) {
  cardEl.setAttribute("draggable", "true");

  cardEl.addEventListener("dragstart", (e) => {
    cardEl.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/cardId", ctx.cardId);
    e.dataTransfer.setData("text/fromCol", ctx.colId);
  });

  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("dragging");
  });
}

/**
 * Зона-дроп для КАРТОЧЕК внутри колонки
 * @param {HTMLElement} container - .column-cards
 * @param {{deskId:string, colId:string, onMove?:Function}} param1
 */
export function attachColumnDropzone(container, { deskId, colId, onMove } = {}) {
  container.addEventListener("dragover", (e) => {
    const draggingCard = document.querySelector(".card.dragging");
    if (!draggingCard) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const afterEl = getCardDragAfterElement(container, e.clientY);
    if (!afterEl) {
      container.appendChild(draggingCard);
    } else {
      container.insertBefore(draggingCard, afterEl);
    }
  });

  container.addEventListener("drop", (e) => {
    const draggingCard = document.querySelector(".card.dragging");
    if (!draggingCard) return;
    e.preventDefault();
    draggingCard.classList.remove("dragging");

    if (typeof onMove === "function") {
      onMove({ deskId, colId });
    }
  });
}

/** Возвращает элемент-карточку, ПОСЛЕ которого вставляем перетаскиваемую */
function getCardDragAfterElement(container, mouseY) {
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

/**
 * Включает перетаскивание КОЛОНОК внутри #boardColumns
 * @param {HTMLElement} boardRoot - контейнер с колонками (#boardColumns)
 * @param {{onReorder?: Function}} param1
 */
export function enableColumnReorder(boardRoot, { onReorder } = {}) {
  if (!boardRoot) return;

  // Делаем каждую колонку draggable (они пересоздаются при рендере)
  qsa(".column", boardRoot).forEach((col) => {
    col.setAttribute("draggable", "true");

    col.addEventListener("dragstart", (e) => {
      col.classList.add("dragging-column");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/columnId", col.dataset.columnId || "");
    });

    col.addEventListener("dragend", () => {
      col.classList.remove("dragging-column");
      if (typeof onReorder === "function") {
        onReorder();
      }
    });
  });

  // Контейнер слушаем только один раз
  if (boardRoot.dataset.columnsDndAttached === "1") return;
  boardRoot.dataset.columnsDndAttached = "1";

  boardRoot.addEventListener("dragover", (e) => {
    const dragging = boardRoot.querySelector(".column.dragging-column");
    if (!dragging) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const afterEl = getColumnAfterElement(boardRoot, e.clientX);
    if (!afterEl) {
      boardRoot.appendChild(dragging);
    } else {
      boardRoot.insertBefore(dragging, afterEl);
    }
  });

  boardRoot.addEventListener("drop", (e) => {
    const dragging = boardRoot.querySelector(".column.dragging-column");
    if (!dragging) return;
    e.preventDefault();
    dragging.classList.remove("dragging-column");
    if (typeof onReorder === "function") {
      onReorder();
    }
  });
}

function getColumnAfterElement(container, mouseX) {
  const siblings = qsa(".column:not(.dragging-column)", container);
  let closest = { offset: Number.NEGATIVE_INFINITY, el: null };

  for (const child of siblings) {
    const box = child.getBoundingClientRect();
    const offset = mouseX - box.left - box.width / 2;
    if (offset < 0 && offset > closest.offset) {
      closest = { offset, el: child };
    }
  }
  return closest.el;
}
