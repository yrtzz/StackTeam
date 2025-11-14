// scripts/krelloapp.js
import {
  makeCardDraggable,
  attachColumnDropzone,
  enableColumnReorder,
} from "./features/dnd.js";



import { getKrelloState } from "./core/state.js";
import { initModals } from "./features/modals.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const ui = getKrelloState();

let currentUserId = null;
let remoteSaveTimer = null;

const boardData = {
  inbox: null,
  boards: {
    main: null,
    personal: null,
    work: null,
  },
};

function getLocalStorageKey() {
  // отдельный ключ для каждого пользователя
  if (currentUserId) {
    return `krello_board_data:${currentUserId}`;
  }
  // на всякий случай дефолтный, если вдруг userId ещё нет
  return "krello_board_data";
}


function userKrelloDoc() {
  if (!currentUserId) return null;
  return doc(db, "users", currentUserId, "krello", "boards");
}

function getCurrentDeskKey() {
  const boardKey = ui.currentBoard || "main";
  return `boards:${boardKey}`;
}



function scheduleRemoteSave() {
  if (!currentUserId) return;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(async () => {
    try {
      const ref = userKrelloDoc();
      if (!ref) return;
      const payload = {
        boardData,
        favorites: getFavorites(),
      };
      await setDoc(ref, payload, { merge: true });
    } catch (err) {
      console.warn("Failed to save Krello state to Firestore:", err);
    }
  }, 700);
}

function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        location.replace("/signup.html");
        return;
      }
      currentUserId = user.uid;
      resolve();
    });
  });
}


function normalizeBoardEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    return convertHtmlStringToStruct(entry);
  }
  if (typeof entry === "object" && Array.isArray(entry.columns)) {
    return entry;
  }
  return null;
}

function loadBoardDataFromLocal() {
  if (!currentUserId) return; // на всякий, но initApp уже ждёт initAuth

  try {
    const raw = localStorage.getItem(getLocalStorageKey());
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;

    if ("inbox" in parsed) {
      boardData.inbox = normalizeBoardEntry(parsed.inbox);
    }
    if (parsed.boards && typeof parsed.boards === "object") {
      ["main", "personal", "work"].forEach((key) => {
        if (parsed.boards[key]) {
          boardData.boards[key] = normalizeBoardEntry(parsed.boards[key]);
        }
      });
    }
  } catch (err) {
    console.warn("Failed to parse local board data:", err);
  }
}


async function loadBoardDataFromRemote() {
  if (!currentUserId) return;
  try {
    const ref = userKrelloDoc();
    if (!ref) return;
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() || {};
    const remoteBoards = data.boardData || {};
    const remoteFavorites = Array.isArray(data.favorites)
      ? data.favorites
      : [];

    if (remoteBoards) {
      if ("inbox" in remoteBoards) {
        boardData.inbox = normalizeBoardEntry(remoteBoards.inbox) || boardData.inbox;
      }
      if (remoteBoards.boards && typeof remoteBoards.boards === "object") {
        ["main", "personal", "work"].forEach((key) => {
          if (remoteBoards.boards[key]) {
            boardData.boards[key] =
              normalizeBoardEntry(remoteBoards.boards[key]) ||
              boardData.boards[key];
          }
        });
      }
    }

    if (remoteFavorites.length) {
      saveFavorites(remoteFavorites, { skipRemote: true });
    }
  } catch (err) {
    console.warn("Failed to load Krello state from Firestore:", err);
  }
}

function saveBoardData(options = {}) {
  const { skipRemote = false } = options;
  try {
    if (currentUserId) {
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(boardData));
    }
  } catch (err) {
    console.warn("Failed to save board data to localStorage:", err);
  }
  if (!skipRemote) {
    scheduleRemoteSave();
  }
}



function extractBoardFromRoot(root) {
  const columns = [];
  const cards = [];
  root.querySelectorAll(".column").forEach((colEl, colIndex) => {
    let colId = colEl.dataset.columnId;
    if (!colId) {
      colId = `col_${Math.random().toString(36).slice(2, 8)}`;
      colEl.dataset.columnId = colId;
    }
    const titleEl = colEl.querySelector(".column-header h4");
    const title = titleEl ? titleEl.textContent.trim() : `Column ${colIndex + 1}`;
    columns.push({
      id: colId,
      title,
      order: colIndex,
    });
    const cardWrap = colEl.querySelector(".column-cards");
    if (!cardWrap) return;
    cardWrap.querySelectorAll(".card").forEach((cardEl, cardIndex) => {
      let cardId = cardEl.dataset.cardId;
      if (!cardId) {
        cardId = `card_${Math.random().toString(36).slice(2, 9)}`;
        cardEl.dataset.cardId = cardId;
      }
      const textEl = cardEl.querySelector("p");
      const text = textEl ? textEl.textContent.trim() : "";
      const checkbox = cardEl.querySelector(".card-checkbox");
      const completed = checkbox ? checkbox.checked : false;
      cards.push({
        id: cardId,
        columnId: colId,
        text,
        completed,
        order: cardIndex,
      });
    });
  });
  if (!columns.length) return null;
  return { columns, cards };
}

function serializeCurrentBoard() {
  const root = document.getElementById("boardColumns");
  return extractBoardFromRoot(root);
}

function convertHtmlStringToStruct(html) {
  try {
    const parser = new DOMParser();
    const docHtml = parser.parseFromString(`<div>${html}</div>`, "text/html");
    return extractBoardFromRoot(docHtml.body);
  } catch (err) {
    console.warn("Failed to convert HTML to struct:", err);
    return null;
  }
}

function renderBoardStruct(struct) {
  const boardColumns = document.getElementById("boardColumns");
  boardColumns.innerHTML = "";
  let columns = [];
  let cards = [];
  if (struct && Array.isArray(struct.columns) && struct.columns.length) {
    columns = [...struct.columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    cards = Array.isArray(struct.cards) ? struct.cards : [];
  }
  if (!columns.length) {
    boardColumns.innerHTML = `
      <div class="column" data-column-id="col_todo">
        <div class="column-header">
          <h4>To Do</h4>
          <i class="fas fa-ellipsis-h column-menu-trigger"></i>
        </div>
        <div class="column-cards"></div>
        <button class="add-card-btn">
          <i class="fas fa-plus"></i>
          <span>Добавить карточку</span>
        </button>
      </div>
      <div class="column" data-column-id="col_inprogress">
        <div class="column-header">
          <h4>In Progress</h4>
          <i class="fas fa-ellipsis-h column-menu-trigger"></i>
        </div>
        <div class="column-cards"></div>
        <button class="add-card-btn">
          <i class="fas fa-plus"></i>
          <span>Добавить карточку</span>
        </button>
      </div>
      <div class="column" data-column-id="col_done">
        <div class="column-header">
          <h4>Done</h4>
          <i class="fas fa-ellipsis-h column-menu-trigger"></i>
        </div>
        <div class="column-cards"></div>
        <button class="add-card-btn">
          <i class="fas fa-plus"></i>
          <span>Добавить карточку</span>
        </button>
      </div>
    `;
    attachEventListeners();
    updateFavoriteStars();
    return;
  }

  columns.forEach((col) => {
    const colEl = document.createElement("div");
    colEl.className = "column";
    colEl.dataset.columnId = col.id;
    colEl.innerHTML = `
      <div class="column-header">
        <h4>${col.title}</h4>
        <i class="fas fa-ellipsis-h column-menu-trigger"></i>
      </div>
      <div class="column-cards"></div>
      <button class="add-card-btn">
        <i class="fas fa-plus"></i>
        <span>Добавить карточку</span>
      </button>
    `;
    const wrap = colEl.querySelector(".column-cards");
    cards
      .filter((c) => c.columnId === col.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((card) => {
        const cardEl = document.createElement("div");
        cardEl.className = "card";
        cardEl.dataset.cardId = card.id;
        cardEl.innerHTML = `
          <input type="checkbox" class="card-checkbox" ${
            card.completed ? "checked" : ""
          }>
          <i class="far fa-star card-star"></i>
          <p>${card.text}</p>
        `;
        wrap.appendChild(cardEl);
      });
    boardColumns.appendChild(colEl);
  });

  attachEventListeners();
  updateFavoriteStars();
}

function saveCurrentBoard() {
  const boardRoot = document.getElementById("boardColumns");
  if (!boardRoot) return;

  const extracted = extractBoardFromRoot(boardRoot);
  if (!extracted) return;

  const boardKey = ui.currentBoard || "main";
  boardData.boards[boardKey] = extracted;

  saveBoardData();
}





function loadBoard(section, board = "main") {
  const key = board || ui.currentBoard || "main";
  renderBoardStruct(boardData.boards[key]);
}



function getFavorites() {
  try {
    const rawNew = localStorage.getItem("krello_favorites_v2");
    if (rawNew) {
      const arr = JSON.parse(rawNew);
      return Array.isArray(arr) ? arr : [];
    }
    return [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites, options = {}) {
  const { skipRemote = false } = options;
  try {
    localStorage.setItem("krello_favorites_v2", JSON.stringify(favorites));
  } catch (err) {
    console.warn("Cannot save favorites:", err);
  }
  if (!skipRemote) {
    scheduleRemoteSave();
  }
}

function toggleFavorite(cardId, deskKeyOverride) {
  const deskKey = deskKeyOverride || getCurrentDeskKey();
  const key = `${deskKey}:${cardId}`;
  const favorites = getFavorites();
  const index = favorites.indexOf(key);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(key);
  }
  saveFavorites(favorites);
  updateFavoriteStars();
  if (ui.currentSection === "favorites") {
    renderFavorites();
  } else {
    saveCurrentBoard();
  }
}

function updateFavoriteStars() {
  const favorites = getFavorites();
  document.querySelectorAll(".card").forEach((card) => {
    const cardId = card.getAttribute("data-card-id");
    const star = card.querySelector(".card-star");
    if (!star || !cardId) return;
    const deskKey = card.dataset.deskKey || getCurrentDeskKey();
    const key = `${deskKey}:${cardId}`;
    if (favorites.includes(key)) {
      star.classList.remove("far");
      star.classList.add("fas", "favorited");
    } else {
      star.classList.remove("fas", "favorited");
      star.classList.add("far");
    }
  });
}

function closeColumnMenu() {
  if (ui.activeColumnMenu) {
    ui.activeColumnMenu.remove();
    ui.activeColumnMenu = null;
  }
}

function openColumnMenu(trigger, column) {
  closeColumnMenu();
  const menu = document.createElement("div");
  menu.className = "column-menu active";
  const rect = trigger.getBoundingClientRect();
  let top = rect.bottom + 5;
  let left = rect.left;
  menu.innerHTML = `
    <div class="column-menu-item" data-action="add-card">
      <i class="fas fa-plus"></i> Add a card
    </div>
    <div class="column-menu-item" data-action="copy-list">
      <i class="fas fa-copy"></i> Copy list
    </div>
    <div class="column-menu-item" data-action="move-list">
      <i class="fas fa-arrows-alt"></i> Move list
    </div>
    <div class="column-menu-item" data-action="move-all-cards">
      <i class="fas fa-arrow-right"></i> Move all cards in this list
    </div>
    <hr>
    <div class="column-menu-item" data-action="sort">
      <i class="fas fa-sort"></i> Sort by...
    </div>
    <hr>
    <div class="column-menu-item" data-action="rename">
      <i class="fas fa-edit"></i> Rename
    </div>
    <div class="column-menu-item" data-action="set-color">
      <i class="fas fa-palette"></i> Set list color
    </div>
    <hr>
    <div class="column-menu-item" data-action="archive-list">
      <i class="fas fa-archive"></i> Archive this list
    </div>
    <div class="column-menu-item" data-action="archive-all">
      <i class="fas fa-archive"></i> Archive all cards
    </div>
  `;
  document.body.appendChild(menu);
  const mRect = menu.getBoundingClientRect();
  if (left + mRect.width > window.innerWidth - 20) {
    left = window.innerWidth - mRect.width - 20;
  }
  if (top + mRect.height > window.innerHeight - 20) {
    top = rect.top - mRect.height - 5;
  }
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  ui.activeColumnMenu = menu;
  menu.addEventListener("click", (e) => {
    const item = e.target.closest(".column-menu-item");
    if (!item) return;
    const action = item.dataset.action;
    const header = column.querySelector(".column-header h4");
    switch (action) {
      case "add-card":
        addNewCard(column);
        break;
      case "copy-list": {
        const copy = column.cloneNode(true);
        const newId = `col_${Math.random().toString(36).slice(2, 8)}`;
        copy.setAttribute("data-column-id", newId);
        const h4 = copy.querySelector(".column-header h4");
        h4.textContent += " (copy)";
        column.after(copy);
        attachEventListeners();
        saveCurrentBoard();
        break;
      }
      case "rename": {
        const name = prompt("Новое имя:", header.textContent);
        if (name) {
          header.textContent = name.trim();
          saveCurrentBoard();
        }
        break;
      }
      case "archive-list":
        if (confirm("Архивировать колонку?")) {
          column.remove();
          saveCurrentBoard();
        }
        break;
      case "archive-all":
        column.querySelectorAll(".card").forEach((c) => c.remove());
        saveCurrentBoard();
        break;
      default:
        alert("В разработке");
    }
    closeColumnMenu();
  });
}

function switchSection(section) {
  if (ui.currentSection !== "favorites") {
    saveCurrentBoard();
  }

  ui.currentSection = section;

  const titles = {
    inbox: "Inbox — Входящие задачи 📥",
    boards: "Доски — Проекты и задачи 📊",
    favorites: "Избранное ⭐",
  };
  document.getElementById("boardTitle").textContent = titles[section];

  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.section === section);
  });

  const tabs = document.querySelector(".board-tabs");
  const currentBoard = ui.currentBoard || "main";

  if (section === "favorites") {
    tabs.style.display = "none";
    renderFavorites();
  } else {
    tabs.style.display = "flex";
    loadBoard(section, currentBoard);
  }
}


function switchBoardTab(board) {
  if (ui.currentSection !== "favorites") {
    saveCurrentBoard();
  }

  ui.currentBoard = board;

  document.querySelectorAll(".board-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.board === board);
  });

  const section = ui.currentSection === "favorites" ? "boards" : ui.currentSection;
  loadBoard(section, board);
}



function renderFavorites() {
  const favorites = getFavorites();
  const boardColumns = document.getElementById("boardColumns");
  if (!favorites.length) {
    boardColumns.innerHTML = `
      <div style="color:white;padding:20px;">
        ⭐ Нет избранных карточек
        <br>
        <small>Нажмите на звездочку на карточке, чтобы добавить в избранное</small>
      </div>
    `;
    return;
  }
  const cardsToRender = [];
  favorites.forEach((key) => {
    const [deskKey, cardId] = key.split(":");
    if (!deskKey || !cardId) return;
    let struct = null;
    if (deskKey.startsWith("boards:")) {
      const boardName = deskKey.split(":")[1];
      struct = boardData.boards[boardName];
    } else if (deskKey === "inbox") {
      struct = boardData.boards.main || null;
    }
    
    if (!struct || !Array.isArray(struct.cards)) return;
    const card = struct.cards.find((c) => c.id === cardId);
    if (!card) return;
    cardsToRender.push({ deskKey, ...card });
  });
  if (!cardsToRender.length) {
    boardColumns.innerHTML = `
      <div style="color:white;padding:20px;">
        ⭐ Нет избранных карточек
      </div>
    `;
    return;
  }
  const wrapCol = document.createElement("div");
  wrapCol.className = "column";
  wrapCol.innerHTML = `
    <div class="column-header"><h4>⭐ Избранные карточки</h4></div>
    <div class="column-cards"></div>
  `;
  const container = wrapCol.querySelector(".column-cards");
  cardsToRender.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.deskKey = card.deskKey;
    cardEl.innerHTML = `
      <input type="checkbox" class="card-checkbox" ${
        card.completed ? "checked" : ""
      }>
      <i class="far fa-star card-star"></i>
      <p>${card.text}</p>
    `;
    container.appendChild(cardEl);
  });
  boardColumns.innerHTML = "";
  boardColumns.appendChild(wrapCol);
  attachEventListeners();
  updateFavoriteStars();
}

function filterCards(text) {
  text = text.toLowerCase().trim();
  if (!text) {
    document.querySelectorAll(".card").forEach((c) => c.classList.remove("hidden"));
    document
      .querySelectorAll(".column")
      .forEach((col) => col.classList.remove("hidden"));
    return;
  }
  document.querySelectorAll(".column").forEach((col) => {
    let visible = false;
    col.querySelectorAll(".card").forEach((card) => {
      const match = card.textContent.toLowerCase().includes(text);
      card.classList.toggle("hidden", !match);
      if (match) visible = true;
    });
    col.classList.toggle("hidden", !visible);
  });
}

function createNewColumn(name) {
  if (ui.currentSection === "favorites") {
    alert("Нельзя создавать колонки в избранном");
    return;
  }
  const columnName = name || "Новая колонка";
  const boardColumns = document.getElementById("boardColumns");
  const colId = `col_${Math.random().toString(36).slice(2, 8)}`;
  const col = document.createElement("div");
  col.className = "column";
  col.dataset.columnId = colId;
  col.innerHTML = `
    <div class="column-header">
      <h4>${columnName}</h4>
      <i class="fas fa-ellipsis-h column-menu-trigger"></i>
    </div>
    <div class="column-cards"></div>
    <button class="add-card-btn">
      <i class="fas fa-plus"></i>
      <span>Добавить карточку</span>
    </button>
  `;
  boardColumns.appendChild(col);
  attachEventListeners();
  saveCurrentBoard();
}

function addNewCard(column) {
  const text = prompt("Введите текст карточки:");
  if (!text || !text.trim()) return;
  const wrap = column.querySelector(".column-cards");
  const card = document.createElement("div");
  card.className = "card";
  const cardId = `card_${Math.random().toString(36).slice(2, 9)}`;
  card.dataset.cardId = cardId;
  card.innerHTML = `
    <input type="checkbox" class="card-checkbox">
    <i class="far fa-star card-star"></i>
    <p>${text.trim()}</p>
  `;
  wrap.appendChild(card);
  attachEventListeners();
  saveCurrentBoard();
}

function attachEventListeners() {
  // --- чекбоксы ---
  document.querySelectorAll(".card-checkbox").forEach((cb) => {
    const card = cb.closest(".card");
    if (card) card.classList.add("has-checkbox");

    cb.onchange = null;
    cb.addEventListener("change", (e) => {
      const cardEl = e.target.closest(".card");
      if (!cardEl) return;

      if (e.target.checked) cardEl.classList.add("completed");
      else cardEl.classList.remove("completed");

      saveCurrentBoard();
    });
  });

  // --- DnD карточек и колонок (только если не избранное) ---
  if (ui.currentSection !== "favorites") {
    const deskId = getCurrentDeskKey();
    const boardRoot = document.getElementById("boardColumns");

    // КАРТОЧКИ: dnd + dropzone
    document.querySelectorAll("#boardColumns .column").forEach((column) => {
      const colId = column.dataset.columnId;
      const wrap = column.querySelector(".column-cards");
      if (!wrap) return;

      // принимаем карточки
      attachColumnDropzone(wrap, {
        deskId,
        colId,
        onMove() {
          saveCurrentBoard();
        },
      });

      // делаем карточки draggable
      wrap.querySelectorAll(".card").forEach((card) => {
        const cardId = card.dataset.cardId;
        if (!cardId) return;
        makeCardDraggable(card, { deskId, colId, cardId });
      });
    });

    // КОЛОНКИ: перестановка
    if (boardRoot) {
      enableColumnReorder(boardRoot, {
        onReorder() {
          saveCurrentBoard();
        },
      });
    }
  }

  // --- звёздочки (избранное) ---
  document.querySelectorAll(".card-star").forEach((star) => {
    star.onclick = (e) => {
      e.stopPropagation();
      const card = e.target.closest(".card");
      if (!card) return;
      const cardId = card.dataset.cardId;
      const deskKey = card.dataset.deskKey || null;
      toggleFavorite(cardId, deskKey);
    };
  });

  // --- меню колонок ---
  document.querySelectorAll(".column-menu-trigger").forEach((trigger) => {
    trigger.onclick = (e) => {
      e.stopPropagation();
      const col = trigger.closest(".column");
      if (!col) return;
      openColumnMenu(trigger, col);
    };
  });

  // --- кнопка "Добавить карточку" ---
  document.querySelectorAll(".add-card-btn").forEach((btn) => {
    btn.onclick = () => {
      const col = btn.closest(".column");
      if (!col) return;
      addNewCard(col);
    };
  });

  // --- клик по карточке (редактирование текста) ---
  document.querySelectorAll(".card").forEach((card) => {
    card.onclick = (e) => {
      if (
        e.target.classList.contains("card-checkbox") ||
        e.target.classList.contains("card-star")
      ) {
        return;
      }

      const textEl = card.querySelector("p");
      const text = textEl ? textEl.textContent : "";

      if (text.includes("New to Krello") || text.includes("Start here")) {
        if (confirm("Открыть руководство?")) {
          window.open("guide.html", "_blank");
        }
        return;
      }

      const edited = prompt("Edit card:", text);
      if (edited && edited.trim() && edited !== text) {
        textEl.textContent = edited.trim();
        saveCurrentBoard();
      }
    };
  });
  

  if (ui.currentSection !== "favorites") {
    const deskId = getCurrentDeskKey();
    document.querySelectorAll("#boardColumns .column").forEach((column) => {
      const colId = column.dataset.columnId;
      const wrap = column.querySelector(".column-cards");
      if (!wrap) return;
      attachColumnDropzone(wrap, {
        deskId,
        colId,
        onMove() {
          saveCurrentBoard();
        },
      });
      wrap.querySelectorAll(".card").forEach((card) => {
        const cardId = card.dataset.cardId;
        if (!cardId) return;
        makeCardDraggable(card, { deskId, colId, cardId });
      });
    });
  }

    // DnD для КОЛОНОК (перестановка местами)
    if (ui.currentSection !== "favorites") {
      const boardRoot = document.getElementById("boardColumns");
      if (boardRoot) {
        enableColumnReorder(boardRoot, {
          onReorder() {
            // DOM-порядок колонок поменялся → сохраняем всю доску
            saveCurrentBoard();
          },
        });
      }
    }
  

  document.querySelectorAll(".card-star").forEach((star) => {
    star.onclick = (e) => {
      e.stopPropagation();
      const card = e.target.closest(".card");
      const cardId = card.dataset.cardId;
      const deskKey = card.dataset.deskKey || null;
      toggleFavorite(cardId, deskKey);
    };
  });

  document.querySelectorAll(".column-menu-trigger").forEach((trigger) => {
    trigger.onclick = (e) => {
      e.stopPropagation();
      openColumnMenu(trigger, trigger.closest(".column"));
    };
  });

  document.querySelectorAll(".add-card-btn").forEach((btn) => {
    btn.onclick = () => addNewCard(btn.closest(".column"));
  });

  document.querySelectorAll(".card").forEach((card) => {
    card.onclick = (e) => {
      if (
        e.target.classList.contains("card-checkbox") ||
        e.target.classList.contains("card-star")
      )
        return;
      const textEl = card.querySelector("p");
      const text = textEl ? textEl.textContent : "";
      if (text.includes("New to Krello") || text.includes("Start here")) {
        if (confirm("Открыть руководство?")) {
          window.open("guide.html", "_blank");
        }
        return;
      }
      const edited = prompt("Edit card:", text);
      if (edited && edited.trim() && edited !== text) {
        textEl.textContent = edited.trim();
        saveCurrentBoard();
      }
    };
  });
}

async function initApp() {
  // 1. ждём авторизацию
  await initAuth();

  // 2. пробуем поднять состояние с локали
  loadBoardDataFromLocal();

  // 3. поверх него подтягиваем из Firestore (если есть)
  await loadBoardDataFromRemote();

  const boardRoot = document.getElementById("boardColumns");

  // 4. если ни разу ещё не сохранялись — берём стартовую разметку из app.html
  if (!boardData.boards.main) {
    const initial = extractBoardFromRoot(boardRoot);
    boardData.boards.main = initial;
    saveBoardData();
  }

  // 5. рендерим текущую доску (по умолчанию "main")
  const initialBoardKey = ui.currentBoard || "main";
  renderBoardStruct(boardData.boards[initialBoardKey]);

  // 6. навешиваем обработчики на карточки/колонки
  attachEventListeners();
  updateFavoriteStars();
  initModals();

  // --- вкладки досок (Основная / Личное / Работа) ---
  document.querySelectorAll(".board-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchBoardTab(tab.dataset.board);
    });
  });

  // --- боковое меню (Inbox / Доски / Избранное) ---
  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchSection(item.dataset.section);
    });
  });

  // --- поиск ---
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterCards(e.target.value);
    });
  }

  // --- кнопка "Новая колонна" ---
  const newColumnBtn = document.getElementById("newColumnBtn");
  if (newColumnBtn && searchInput) {
    newColumnBtn.addEventListener("click", () => {
      createNewColumn(searchInput.value.trim());
      searchInput.value = "";
      filterCards("");
    });
  }

  // --- закрытие меню колонок по клику вне ---
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".column-menu") &&
      !e.target.closest(".column-menu-trigger")
    ) {
      closeColumnMenu();
    }
  });

  // --- горячие клавиши ---
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    if (e.key === "Escape") {
      closeColumnMenu();
    }

    if (e.key === "/" || (e.key === "f" && !e.ctrlKey)) {
      e.preventDefault();
      const si = document.getElementById("searchInput");
      if (si) si.focus();
    }
  });

  // --- автосейв перед закрытием / перезагрузкой ---
  window.addEventListener("beforeunload", () => {
    if (ui.currentSection !== "favorites") {
      try {
        saveCurrentBoard();
      } catch (e) {
        // пофиг, уходим
      }
    }
  });
}


const logoutElement = document.querySelector('[data-action="logout"]');

if (logoutElement) {
    logoutElement.addEventListener("click", async () => {
        try {
            await signOut(auth);
            location.href = "/signup.html?logout=1";
        } catch (err) {
            console.error("Ошибка при logout:", err);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
