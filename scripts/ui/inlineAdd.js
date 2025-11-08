// /scripts/ui/inlineAdd.js
import { addCard } from "../features/board.js";
import { qs } from "../core/dom.js";

export function openInlineAddForm(deskId, colId, anchorButton) {
  const columnEl = [...document.querySelectorAll(".column")].find(
    (c) => c.dataset.colId === colId
  );
  if (!columnEl) return;

  // чтобы не было дубликатов
  if (columnEl.querySelector(".inline-add-form")) return;

  const form = document.createElement("div");
  form.className = "inline-add-form";
  form.style.marginTop = "8px";
  form.style.display = "flex";
  form.style.flexDirection = "column";
  form.style.gap = "6px";

  form.innerHTML = `
    <textarea class="ia-text" rows="3" placeholder="Текст карточки..." 
      style="padding:8px;border-radius:6px;background:#071017;
      border:1px solid #cbd5e1;color:#cbd5e1;"></textarea>
    <input class="ia-img" type="text" placeholder="URL изображения (необязательно)" 
      style="padding:8px;border-radius:6px;background:#071017;
      border:1px solid #cbd5e1;color:#cbd5e1;">
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="ia-cancel" 
        style="padding:6px 10px;border-radius:6px;border:1px solid #334155;
        background:transparent;color:#cbd5e1;cursor:pointer;">Отмена</button>
      <button class="ia-add" 
        style="padding:6px 10px;border-radius:6px;background:#0052CC;
        border:none;color:#cbd5e1;cursor:pointer;">Добавить</button>
    </div>
  `;

  anchorButton.insertAdjacentElement("afterend", form);

  const txt = form.querySelector(".ia-text");
  const img = form.querySelector(".ia-img");
  const add = form.querySelector(".ia-add");
  const cancel = form.querySelector(".ia-cancel");

  add.addEventListener("click", () => {
    const content = txt.value.trim();
    const imgUrl = img.value.trim();
    if (!content && !imgUrl) {
      form.remove();
      return;
    }
    addCard(deskId, colId, content, imgUrl);
    form.remove();
  });

  cancel.addEventListener("click", () => form.remove());
  setTimeout(() => txt.focus(), 10);
}
