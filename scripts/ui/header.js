import { getData } from "../core/state.js";
import { createDesk, setActiveDesk } from "../features/board.js";
import { renderColumns } from "./columns.js";

export function renderHeader() {
  const deskSwitcherEl = document.querySelector(".desk-switcher");
  const headerCenter = document.querySelector(".header-center");

  if (!deskSwitcherEl) {
    const newEl = document.createElement("div");
    newEl.className = "desk-switcher";
    headerCenter?.prepend(newEl);
  }

  updateDeskSwitcher();
}

export function updateDeskSwitcher() {
  const deskSwitcherEl = document.querySelector(".desk-switcher");
  const { desks, activeDeskId } = getData();

  deskSwitcherEl.innerHTML = "";
  deskSwitcherEl.style.display = "flex";
  deskSwitcherEl.style.gap = "8px";
  deskSwitcherEl.style.alignItems = "center";

  desks.forEach((desk) => {
    const btn = document.createElement("button");
    btn.className = "desk-switch-btn";
    btn.textContent = desk.title;
    btn.style.padding = "6px 10px";
    btn.style.borderRadius = "6px";
    btn.style.border =
      desk.id === activeDeskId
        ? "transparent"
        : "1px solid rgba(255,255,255,0.06)";
    btn.style.background = "#cbd5e1";
    btn.style.color = "#0052CC";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      setActiveDesk(desk.id);
      updateDeskSwitcher();
      renderColumns();
    });

    deskSwitcherEl.appendChild(btn);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "desk-add-btn";
  addBtn.textContent = "Новая доска";
  addBtn.style.padding = "10px 16px";
  addBtn.style.borderRadius = "6px";
  addBtn.style.background = "#0052CC";
  addBtn.style.color = "#fff";
  addBtn.style.border = "transparent";
  addBtn.style.cursor = "pointer";
  addBtn.addEventListener("click", () => {
    const name = prompt("Название новой доски:", "Новая доска");
    if (!name) return;
    createDesk(name.trim());
    updateDeskSwitcher();
    renderColumns();
  });

  deskSwitcherEl.appendChild(addBtn);
}               
