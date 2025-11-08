// /scripts/ui/columns.js
import { el, qs, qsa, clear } from "../core/dom.js";
import {
  getActiveDesk,
  addColumn,
  addCard,
  renameColumn,
  deleteColumn,
  deleteCard,
  updateCard,
  toggleCardDone,
  moveCard,
} from "../features/board.js";
import { openInlineAddForm } from "./inlineAdd.js";

export function renderColumns() {
  const board = qs(".board-columns");
  const desk = getActiveDesk();
  if (!board || !desk) return;

  clear(board);
  board.style.display = "flex";
  board.style.gap = "12px";

  desk.columns.forEach((col) => {
    board.append(createColumnElement(desk.id, col));
  });

  if (!desk.columns.length) {
    board.append(
      el("div", {
        style: "opacity:.8;color:#e6eef8",
        text: 'Нет колонок — нажмите «Создать колонку» или Ctrl/Cmd+N',
      })
    );
  }

  const createColumnBtn = qs(".btn-primary");
  if (createColumnBtn) {
    const fresh = createColumnBtn.cloneNode(true);
    createColumnBtn.parentNode.replaceChild(fresh, createColumnBtn);
    fresh.addEventListener("click", () => {
      const title = prompt("Название новой колонки:", "Новая колонка");
      if (title !== null) {
        addColumn(title.trim() || "Новая колонка");
        renderColumns();
      }
    });
  }
}

function createColumnElement(deskId, col) {
  const column = el("div", {
    class: "column",
    "data-col-id": col.id,
    style:
      "width:280px;flex-shrink:0;display:flex;flex-direction:column;background:#0b0f10;border-radius:8px;padding:10px;max-height:calc(100vh - 150px)",
  });

  const title = el("h4", { text: col.title, style: "margin:0;cursor:text" });
  title.contentEditable = true;
  title.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); title.blur(); }
  });
  title.addEventListener("blur", () =>
    renameColumn(deskId, col.id, title.textContent.trim() || "Без названия")
  );

  const delBtn = el("button", {
    text: "×",
    style:
      "background:transparent;border:none;color:#ccc;cursor:pointer;font-size:18px;line-height:1",
  });
  delBtn.addEventListener("click", () => {
    const ok = confirm(`Удалить колонку "${col.title}"?`);
    if (ok) { deleteColumn(deskId, col.id); renderColumns(); }
  });

  const header = el(
    "div",
    {
      class: "column-header",
      style:
        "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px",
    },
    [title, delBtn]
  );

  const cardsWrap = el("div", {
    class: "column-cards",
    style:
      "display:flex;flex-direction:column;gap:8px;overflow-y:auto;padding-right:6px;flex-grow:1",
  });

  // DnD
  cardsWrap.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterEl = getDragAfterElement(cardsWrap, e.clientY);
    const dragging = qs(".card.dragging");
    if (!dragging) return;
    if (!afterEl) cardsWrap.append(dragging);
    else cardsWrap.insertBefore(dragging, afterEl);
  });

  cardsWrap.addEventListener("drop", (e) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/cardId");
    const fromColId = e.dataTransfer.getData("text/fromCol");
    const fromDeskId = e.dataTransfer.getData("text/fromDesk");
    if (!cardId) return;

    const children = qsa(".card", cardsWrap);
    const afterEl = getDragAfterElement(cardsWrap, e.clientY);
    let idx = children.length;
    if (afterEl) idx = children.indexOf(afterEl);

    moveCard(fromDeskId || deskId, fromColId, cardId, deskId, col.id, Number.isFinite(idx) ? idx : null);
    renderColumns();
  });

  col.cards.forEach((card) => cardsWrap.append(createCardElement(deskId, col.id, card)));

  const addBtn = el("button", {
    class: "add-card-btn",
    html: `<i class="fas fa-plus"></i> Добавить карточку`,
    style: "background:transparent;border:none;cursor:pointer;padding:8px",
  });
  addBtn.addEventListener("click", () => openInlineAddForm(deskId, col.id, addBtn));

  column.append(header, cardsWrap, addBtn);
  return column;
}

function createCardElement(deskId, colId, card) {
  const cardEl = el("div", {
    class: "card",
    "data-card-id": card.id,
    draggable: "true",
    style:
      "background:#111416;border-radius:6px;padding:8px;position:relative;display:flex;gap:8px;align-items:flex-start;cursor:grab",
  });

  cardEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/cardId", card.id);
    e.dataTransfer.setData("text/fromCol", colId);
    e.dataTransfer.setData("text/fromDesk", deskId);
    cardEl.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("dragging");
  });

  const cb = el("input", { type: "checkbox" });
  cb.checked = !!card.done;
  cb.style.marginTop = "4px";
  cb.addEventListener("change", (e) => {
    toggleCardDone(deskId, colId, card.id, e.target.checked);
    renderColumns();
  });

  const contentWrap = el("div", { style: "flex:1;min-width:0" });

  if (card.img) {
    contentWrap.append(
      el("img", { src: card.img, alt: "", style: "width:100%;border-radius:4px;margin-bottom:6px" })
    );
  }

  const p = el("p", {
    text: card.content,
    style: `margin:0;word-break:break-word;${card.done ? "text-decoration:line-through" : ""}`,
  });

  contentWrap.append(p);

  const editBtn = el("button", {
    html: "✎",
    style: "background:transparent;border:none;color:#aaa;cursor:pointer",
  });
  editBtn.addEventListener("click", () => {
    const newText = prompt("Изменить текст карточки:", card.content);
    if (newText !== null) {
      updateCard(deskId, colId, card.id, newText, card.img || "");
      renderColumns();
    }
  });

  const delBtn = el("button", {
    html: "🗑",
    style: "background:transparent;border:none;color:#aaa;cursor:pointer;margin-left:6px",
  });
  delBtn.addEventListener("click", () => {
    const ok = confirm("Удалить карточку?");
    if (ok) { deleteCard(deskId, colId, card.id); renderColumns(); }
  });

  const actions = el("div", { style: "margin-left:auto" }, [editBtn, delBtn]);

  cardEl.append(cb, contentWrap, actions);
  return cardEl;
}

function getDragAfterElement(container, y) {
  const siblings = qsa(".card:not(.dragging)", container);
  return siblings.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return offset < 0 && offset > closest.offset ? { offset, el: child } : closest;
    },
    { offset: Number.NEGATIVE_INFINITY, el: null }
  ).el;
}
