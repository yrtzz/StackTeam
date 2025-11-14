// scripts/features/dnd.js
// Drag & Drop для карточек + перестановка колонок с предохранителями

let isCardDragging = false;
let isColumnDragging = false;

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// === КАРТОЧКИ ===
export function makeCardDraggable(cardEl, ctx) {
  cardEl.setAttribute("draggable", "true");

  cardEl.addEventListener("dragstart", (e) => {
    // не даём начать новую перетаскивание, если уже что-то тащим
    if (isColumnDragging || isCardDragging) {
      e.preventDefault();
      return;
    }
    isCardDragging = true;
    cardEl.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";

    // эти данные сейчас не используются, но пусть будут
    e.dataTransfer.setData("text/cardId", ctx.cardId || "");
    e.dataTransfer.setData("text/fromCol", ctx.colId || "");
  });

  cardEl.addEventListener("dragend", () => {
    isCardDragging = false;
    cardEl.classList.remove("dragging");
  });
}

// dropzone внутри КОЛОНКИ для карточек
export function attachColumnDropzone(container, { deskId, colId, onMove } = {}) {
  // перетаскивание поверх колонки
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

  // отпускание карточки в колонке
  container.addEventListener("drop", (e) => {
    const draggingCard = document.querySelector(".card.dragging");
    if (!draggingCard) return;

    e.preventDefault();
    draggingCard.classList.remove("dragging");
    isCardDragging = false;

    if (typeof onMove === "function") {
      onMove({ deskId, colId });
    }
  });
}

// находим, после какого элемента вставлять карточку
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

// === КОЛОНКИ ===
export function enableColumnReorder(boardRoot, { onReorder } = {}) {
  if (!boardRoot) return;

  // делаем каждую колонку draggable
  qsa(".column", boardRoot).forEach((col) => {
    col.setAttribute("draggable", "true");

    col.addEventListener("dragstart", (e) => {
      // если сейчас тащим карточку — не даём тащить колонку
      if (isCardDragging || isColumnDragging) {
        e.preventDefault();
        return;
      }
      isColumnDragging = true;
      col.classList.add("dragging-column");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/columnId", col.dataset.columnId || "");
    });

    col.addEventListener("dragend", () => {
      col.classList.remove("dragging-column");
      isColumnDragging = false;
      if (typeof onReorder === "function") onReorder();
    });
  });

  // навешиваем обработчики на КОНТЕЙНЕР колонок только один раз
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
    isColumnDragging = false;
    if (typeof onReorder === "function") onReorder();
  });
}

// находим, после какой колонки вставлять перетаскиваемую
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
