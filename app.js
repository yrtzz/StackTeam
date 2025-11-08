
import { loadBoardState, saveBoardState } from "/firestore.js";

(() => {
  /* ---------------------
     Configuration / Keys
     --------------------- */
  const STORAGE_KEY = 'krello-data-v2';
  const DEFAULT_DESK_NAME = 'Main Desk';

  const boardColumnsEl = document.querySelector('.board-columns');
  const createColumnBtn = document.querySelector('.header-center .btn-primary');

  if (!boardColumnsEl) {
    console.error('app.js: .board-columns element not found. Make sure your HTML matches the expected structure.');
    return;
  }

  let deskSwitcherEl = document.querySelector('.desk-switcher');
  if (!deskSwitcherEl) {
    deskSwitcherEl = document.createElement('div');
    deskSwitcherEl.className = 'desk-switcher';
    // place it in header-center if exists, else top of body
    const headerCenter = document.querySelector('.header-center') || document.body;
    headerCenter.insertBefore(deskSwitcherEl, headerCenter.firstChild);
  }

  /* ---------------------
     Data model
     desks: [{ id, title, columns: [{ id, title, cards: [{ id, content, img, done }] }] }]
     activeDeskId stored alongside desks
     --------------------- */
  let data = {
    desks: [],
    activeDeskId: null
  };

  // generate reasonably unique ids
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`;

  /* ---------------------
     Persistence (Local + Firestore)
     --------------------- */

  // Локальный бэкап: быстро и оффлайн
  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save local data', e);
    }
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.desks)) {
        data = parsed;
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to load local data', e);
      return false;
    }
  }

  // Дебаунс удалённого сохранения, чтобы не спамить сеть
  let saveRemoteTimer = null;
  function saveRemoteDebounced(delay = 600) {
    if (saveRemoteTimer) clearTimeout(saveRemoteTimer);
    saveRemoteTimer = setTimeout(async () => {
      try {
        await saveBoardState(data); // сохраняем весь state в один документ
        // console.log('☁️ state saved to Firestore');
      } catch (e) {
        console.error('Failed to save to Firestore', e);
      }
    }, delay);
  }

  // Единая точка сохранения: всё, что вызывало save(), теперь пишет локально + в облако
  function save() {
    saveLocal();
    saveRemoteDebounced();
  }

  // Загрузка: сначала пробуем Firestore, если не получилось — локалка
  async function load() {
    try {
      const remote = await loadBoardState();
      if (remote && Array.isArray(remote.desks)) {
        data = {
          desks: remote.desks || [],
          activeDeskId: remote.activeDeskId || null
        };
        return true;
      }
    } catch (e) {
      console.warn('Failed to load from Firestore, fallback to local', e);
    }
    return loadLocal();
  }

  /* ---------------------
     Helpers: active desk, lookups
     --------------------- */
  function getActiveDesk() {
    return data.desks.find(d => d.id === data.activeDeskId);
  }
  function setActiveDesk(deskId) {
    data.activeDeskId = deskId;
    save();
    renderDeskSwitcher();
    renderBoard();
  }
  function getDeskById(deskId) {
    return data.desks.find(d => d.id === deskId);
  }
  function getColumn(deskId, colId) {
    const desk = getDeskById(deskId);
    return desk ? desk.columns.find(c => c.id === colId) : null;
  }
  function getCard(deskId, colId, cardId) {
    const col = getColumn(deskId, colId);
    return col ? col.cards.find(k => k.id === cardId) : null;
  }

  /* ---------------------
     Modal (single reusable)
     --------------------- */
  let modal = null;
  let modalContext = null; // {deskId, colId, cardId}

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'krello-modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="km-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:9999;">
        <div class="km-dialog" style="width:420px;max-width:92%;background:#0f1720;padding:16px;border-radius:8px;color:#e6eef8;box-shadow:0 10px 30px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong class="km-title">Edit card</strong>
            <button class="km-close" title="Close" style="background:transparent;border:none;color:inherit;font-size:1.1rem;cursor:pointer;">✕</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <label style="font-size:0.85rem;opacity:0.9;">Text</label>
            <textarea class="km-text" rows="4" style="width:95%;padding:8px;border-radius:6px;border:1px solid #28323a;background:#071017;color:inherit;"></textarea>
            <label style="font-size:0.85rem;opacity:0.9;">Image URL (optional)</label>
            <input class="km-img" type="text" style="width:95%;padding:8px;border-radius:6px;border:1px solid #28323a;background:#071017;color:inherit;" placeholder="https://...">
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
              <button class="km-delete btn" style="background:transparent;border:1px solid #cc5252;color:#ffb3b3;padding:8px 12px;border-radius:6px;cursor:pointer;">Delete</button>
              <button class="km-cancel btn" style="background:transparent;border:1px solid #334155;color:#cbd5e1;padding:8px 12px;border-radius:6px;cursor:pointer;">Cancel</button>
              <button class="km-save btn btn-primary" style="background:#0052CC;border:none;color:#ffffff;padding:8px 12px;border-radius:6px;cursor:pointer;">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.km-close').addEventListener('click', hideModal);
    modal.querySelector('.km-cancel').addEventListener('click', hideModal);
    // backdrop click closes
    modal.querySelector('.km-backdrop').addEventListener('click', (e) => {
      if (e.target === modal.querySelector('.km-backdrop')) hideModal();
    });

    return modal;
  }

  function showModal(deskId, colId, cardId) {
    ensureModal();
    modalContext = { deskId, colId, cardId };
    const card = getCard(deskId, colId, cardId);
    const textEl = modal.querySelector('.km-text');
    const imgEl = modal.querySelector('.km-img');
    const saveBtn = modal.querySelector('.km-save');
    const deleteBtn = modal.querySelector('.km-delete');

    textEl.value = card ? card.content : '';
    imgEl.value = card ? (card.img || '') : '';

    // avoid stacking listeners: remove previous stored handlers if any
    if (saveBtn._handler) saveBtn.removeEventListener('click', saveBtn._handler);
    if (deleteBtn._handler) deleteBtn.removeEventListener('click', deleteBtn._handler);

    saveBtn._handler = () => {
      const newText = textEl.value.trim();
      const newImg = imgEl.value.trim();
      updateCard(deskId, colId, cardId, newText, newImg);
      hideModal();
    };
    deleteBtn._handler = () => {
      const ok = confirm('Delete card permanently?');
      if (ok) {
        deleteCard(deskId, colId, cardId);
        hideModal();
      }
    };

    saveBtn.addEventListener('click', saveBtn._handler);
    deleteBtn.addEventListener('click', deleteBtn._handler);

    modal.style.display = 'block';
    // focus textarea
    setTimeout(() => textEl.focus(), 50);
  }

  function hideModal() {
    if (!modal) return;
    modal.style.display = 'none';
    modalContext = null;
  }

  /* ---------------------
     CRUD operations (desks/cols/cards)
     --------------------- */
  function createDesk(title = DEFAULT_DESK_NAME) {
    const desk = { id: uid('desk'), title: title.trim() || DEFAULT_DESK_NAME, columns: [] };
    data.desks.push(desk);
    data.activeDeskId = desk.id;
    save();
    renderDeskSwitcher();
    renderBoard();
    return desk;
  }

  function renameDesk(deskId, newTitle) {
    const desk = getDeskById(deskId);
    if (!desk) return;
    desk.title = newTitle || desk.title;
    save();
    renderDeskSwitcher();
  }

  function deleteDesk(deskId) {
    const idx = data.desks.findIndex(d => d.id === deskId);
    if (idx === -1) return;
    data.desks.splice(idx, 1);
    if (data.desks.length === 0) {
      // create a default desk
      createDesk(DEFAULT_DESK_NAME);
    } else {
      data.activeDeskId = data.desks[0].id;
    }
    save();
    renderDeskSwitcher();
    renderBoard();
  }

  function addColumn(title = 'New Column') {
    const desk = getActiveDesk();
    if (!desk) return;
    const c = { id: uid('col'), title: title.trim() || 'New Column', cards: [] };
    desk.columns.push(c);
    save();
    renderBoard();
    return c;
  }

  function renameColumn(deskId, colId, newTitle) {
    const col = getColumn(deskId, colId);
    if (!col) return;
    col.title = newTitle || col.title;
    save();
    renderBoard();
  }

  function deleteColumn(deskId, colId) {
    const desk = getDeskById(deskId);
    if (!desk) return;
    desk.columns = desk.columns.filter(c => c.id !== colId);
    save();
    renderBoard();
  }

  function addCard(deskId, colId, content = '', img = '') {
    const col = getColumn(deskId, colId);
    if (!col) return null;
    const card = { id: uid('card'), content: content || '', img: img || '', done: false };
    col.cards.push(card);
    save();
    renderBoard();
    return card;
  }

  function updateCard(deskId, colId, cardId, content, img) {
    const card = getCard(deskId, colId, cardId);
    if (!card) return;
    card.content = content;
    card.img = img;
    save();
    renderBoard();
  }

  function deleteCard(deskId, colId, cardId) {
    const col = getColumn(deskId, colId);
    if (!col) return;
    col.cards = col.cards.filter(k => k.id !== cardId);
    save();
    renderBoard();
  }

  function toggleCardDone(deskId, colId, cardId, done) {
    const card = getCard(deskId, colId, cardId);
    if (!card) return;
    card.done = !!done;
    save();
    renderBoard();
  }

  function moveCard(deskIdFrom, colIdFrom, cardId, deskIdTo, colIdTo, insertIndex = null) {
    // find and remove
    const fromCol = getColumn(deskIdFrom, colIdFrom);
    const toCol = getColumn(deskIdTo, colIdTo);
    if (!fromCol || !toCol) return;
    const idx = fromCol.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    const [card] = fromCol.cards.splice(idx, 1);
    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= toCol.cards.length) {
      toCol.cards.splice(insertIndex, 0, card);
    } else {
      toCol.cards.push(card);
    }
    save();
    renderBoard();
  }

  /* ---------------------
     Rendering: Desk switcher, Board (columns & cards)
     --------------------- */
  function renderDeskSwitcher() {
    deskSwitcherEl.innerHTML = '';
    deskSwitcherEl.style.display = 'flex';
    deskSwitcherEl.style.gap = '8px';
    deskSwitcherEl.style.alignItems = 'center';

    data.desks.forEach(desk => {
      const btn = document.createElement('button');
      btn.className = 'desk-switch-btn';
      btn.textContent = desk.title;
      btn.style.padding = '6px 10px';
      btn.style.borderRadius = '6px';
      btn.style.border = desk.id === data.activeDeskId ? 'transparent' : '1px solid rgba(255,255,255,0.06)';
      btn.style.background = '#cbd5e1';
      btn.style.color = '#0052CC';
      btn.style.cursor = 'pointer';

      btn.addEventListener('click', () => setActiveDesk(desk.id));

      // small context menu for rename/delete when right-click
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // small inline menu
        openDeskContextMenu(e.clientX, e.clientY, desk);
      });

      deskSwitcherEl.appendChild(btn);
    });

    // add "+ New Desk" btn
    const addBtn = document.createElement('button');
    addBtn.className = 'desk-add-btn';
    addBtn.textContent = 'Новая доска';
    addBtn.style.size = '15px';
    addBtn.style.padding = '10px 16px';
    addBtn.style.borderRadius = '6px';
    addBtn.style.background = '#0052CC';
    addBtn.style.color = '#ffffffff'; 
    addBtn.style.border = 'transparent';
    addBtn.style.cursor = 'pointer';
    addBtn.addEventListener('click', () => {
      const name = prompt('New desk name:', 'New Desk');
      if (!name) return;
      createDesk(name.trim());
    });
    deskSwitcherEl.appendChild(addBtn);
  }

  // simple desk context (rename/delete)
  function openDeskContextMenu(x, y, desk) {
    closeAllContextMenus();
    const menu = document.createElement('div');
    menu.className = 'desk-context';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.background = '#061018';
    menu.style.border = '1px solid rgba(255,255,255,0.06)';
    menu.style.padding = '6px';
    menu.style.borderRadius = '6px';
    menu.style.zIndex = 9999;

    const rename = document.createElement('div');
    rename.textContent = 'Rename';
    rename.style.padding = '6px';
    rename.style.cursor = 'pointer';
    rename.addEventListener('click', () => {
      const newTitle = prompt('Desk name:', desk.title);
      if (newTitle) renameDesk(desk.id, newTitle.trim());
      menu.remove();
    });

    const del = document.createElement('div');
    del.textContent = 'Delete';
    del.style.padding = '6px';
    del.style.cursor = 'pointer';
    del.addEventListener('click', () => {
      const ok = confirm(`Delete desk "${desk.title}" and all its columns/cards?`);
      if (ok) deleteDesk(desk.id);
      menu.remove();
    });

    menu.appendChild(rename);
    menu.appendChild(del);
    document.body.appendChild(menu);

    // close on click elsewhere
    setTimeout(() => {
      document.addEventListener('click', closeAllContextMenus, { once: true });
    }, 10);
  }

  // общий закрыватель всех контекстов
  function closeAllContextMenus() {
    document.querySelectorAll('.col-context, .desk-context').forEach(el => el.remove());
  }

  // Build board columns and cards
  function renderBoard() {
    boardColumnsEl.innerHTML = '';
    const desk = getActiveDesk();
    if (!desk) return;

    boardColumnsEl.style.display = 'flex';
    boardColumnsEl.style.gap = '12px';
    desk.columns.forEach(col => {
      const colEl = createColumnElement(desk.id, col);
      boardColumnsEl.appendChild(colEl);
    });

    // show a "no columns" helper if none
    if (!desk.columns.length) {
      const hint = document.createElement('div');
      hint.style.opacity = '0.8';
      hint.style.color = '#e6eef8';
      hint.textContent = 'No columns yet — add one with the "Создать" button or use Ctrl/Cmd+N';
      boardColumnsEl.appendChild(hint);
    }
  }

  /* ---------------------
     Column element creator (includes drop handlers)
     --------------------- */
  function createColumnElement(deskId, col) {
    const column = document.createElement('div');
    column.className = 'column';
    column.dataset.colId = col.id;
    column.style.width = '280px';
    column.style.flexShrink = '0';
    column.style.display = 'flex';
    column.style.flexDirection = 'column';
    column.style.background = '#0b0f10';
    column.style.borderRadius = '8px';
    column.style.padding = '10px';
    column.style.maxHeight = 'calc(100vh - 150px)';

    // header (title + menu)
    const header = document.createElement('div');
    header.className = 'column-header';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '8px';

    const title = document.createElement('h4');
    title.textContent = col.title;
    title.contentEditable = true;
    title.style.margin = '0';
    title.style.cursor = 'text';
    title.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        title.blur();
      }
    });
    title.addEventListener('blur', () => renameColumn(deskId, col.id, title.textContent.trim() || 'Новая колонка'));

    const headerMenu = document.createElement('i');
    headerMenu.className = 'fas fa-ellipsis-h';
    headerMenu.style.cursor = 'pointer';
    headerMenu.title = 'Column options';
    headerMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      openColumnContextMenu(e.clientX, e.clientY, deskId, col);
    });

    header.appendChild(title);
    header.appendChild(headerMenu);

    // cards container
    const cardsWrap = document.createElement('div');
    cardsWrap.className = 'column-cards';
    cardsWrap.style.display = 'flex';
    cardsWrap.style.flexDirection = 'column';
    cardsWrap.style.gap = '8px';
    cardsWrap.style.overflowY = 'auto';
    cardsWrap.style.paddingRight = '6px';
    cardsWrap.style.flexGrow = '1';

    // drop & reorder logic for cards
    cardsWrap.addEventListener('dragover', (e) => {
      e.preventDefault();
      // find closest card to insert before
      const afterEl = getDragAfterElement(cardsWrap, e.clientY);
      const dragging = document.querySelector('.dragging');
      if (!dragging) return;
      if (!afterEl) {
        cardsWrap.appendChild(dragging);
      } else {
        cardsWrap.insertBefore(dragging, afterEl);
      }
    });

    cardsWrap.addEventListener('drop', (e) => {
      e.preventDefault();
      const cardId = e.dataTransfer.getData('text/cardId');
      const fromColId = e.dataTransfer.getData('text/fromCol');
      const fromDeskId = e.dataTransfer.getData('text/fromDesk') || data.activeDeskId;
      if (!cardId) return;
      // determine insertion index
      const children = Array.from(cardsWrap.querySelectorAll('.card'));
      const afterEl = getDragAfterElement(cardsWrap, e.clientY);
      let idx = children.length;
      if (afterEl) idx = children.indexOf(afterEl);
      moveCard(fromDeskId, fromColId, cardId, deskId, col.id, idx);
    });

    // populate cards
    col.cards.forEach(card => {
      cardsWrap.appendChild(createCardElement(deskId, col.id, card));
    });

    // add button and inline form
    const addBtn = document.createElement('button');
    addBtn.className = 'add-card-btn';
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Добавить карточку';
    addBtn.style.background = 'transparent';
    addBtn.style.border = 'none';
    addBtn.style.cursor = 'pointer';
    addBtn.style.padding = '8px';
    addBtn.addEventListener('click', () => openInlineAddForm(deskId, col.id, addBtn));

    column.appendChild(header);
    column.appendChild(cardsWrap);
    column.appendChild(addBtn);

    return column;
  }

  function openColumnContextMenu(x, y, deskId, col) {
    closeAllContextMenus();
    const menu = document.createElement('div');
    menu.className = 'col-context';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.background = '#061018';
    menu.style.border = '1px solid rgba(255,255,255,0.06)';
    menu.style.padding = '6px';
    menu.style.borderRadius = '6px';
    menu.style.zIndex = 9999;

    const rename = document.createElement('div');
    rename.textContent = 'Rename column';
    rename.style.padding = '6px';
    rename.style.cursor = 'pointer';
    rename.style.color = '#cbd5e1';
    rename.addEventListener('click', () => {
      const newTitle = prompt('Column title:', col.title);
      if (newTitle) renameColumn(deskId, col.id, newTitle.trim());
      menu.remove();
    });

    const remove = document.createElement('div');
    remove.textContent = 'Delete column';
    remove.style.padding = '6px';
    remove.style.cursor = 'pointer';
    remove.style.color = '#cbd5e1';
    remove.addEventListener('click', () => {
      const ok = confirm(`Delete column "${col.title}" and its cards?`);
      if (ok) deleteColumn(deskId, col.id);
      menu.remove();
    });

    menu.appendChild(rename);
    menu.appendChild(remove);
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', closeAllContextMenus, { once: true }), 10);
  }

  // utility to get the element after which to insert while dragging
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /* ---------------------
     Card element creator
     --------------------- */
  function createCardElement(deskId, colId, card) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    wrapper.draggable = true;
    wrapper.dataset.cardId = card.id;
    wrapper.dataset.colId = colId;
    wrapper.style.background = '#111416';
    wrapper.style.borderRadius = '6px';
    wrapper.style.padding = '8px';
    wrapper.style.position = 'relative';
    wrapper.style.display = 'flex';
    wrapper.style.gap = '8px';
    wrapper.style.alignItems = 'flex-start';
    wrapper.style.cursor = 'grab';

    // checkbox
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'card-checkbox';
    cb.checked = !!card.done;
    cb.style.marginTop = '4px';
    cb.addEventListener('change', (e) => {
      toggleCardDone(deskId, colId, card.id, e.target.checked);
    });
    wrapper.appendChild(cb);

    // main content container
    const contentWrap = document.createElement('div');
    contentWrap.style.flex = '1';
    contentWrap.style.minWidth = '0';

    if (card.img) {
      const img = document.createElement('img');
      img.src = card.img;
      img.alt = '';
      img.style.width = '100%';
      img.style.borderRadius = '4px';
      img.style.marginBottom = '6px';
      contentWrap.appendChild(img);
    }

    const p = document.createElement('p');
    p.textContent = card.content;
    p.style.margin = '0';
    p.style.wordBreak = 'break-word';
    if (card.done) p.style.textDecoration = 'line-through';
    contentWrap.appendChild(p);
    wrapper.appendChild(contentWrap);

    // menu button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'card-menu-btn';
    menuBtn.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
    menuBtn.style.background = 'transparent';
    menuBtn.style.border = 'none';
    menuBtn.style.color = 'inherit';
    menuBtn.style.cursor = 'pointer';
    menuBtn.style.marginLeft = '6px';
    menuBtn.style.alignSelf = 'flex-start';

    // dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'card-dropdown';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '26px';
    dropdown.style.right = '8px';
    dropdown.style.display = 'none';
    dropdown.style.background = '#061018';
    dropdown.style.border = '1px solid rgba(255,255,255,0.04)';
    dropdown.style.borderRadius = '6px';
    dropdown.style.zIndex = 1000;
    dropdown.style.minWidth = '120px';

    const editOpt = document.createElement('div');
    editOpt.textContent = 'Edit';
    editOpt.style.padding = '8px';
    editOpt.style.cursor = 'pointer';
    editOpt.style.color = '#cbd5e1';
    editOpt.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      showModal(deskId, colId, card.id);
    });

    const deleteOpt = document.createElement('div');
    deleteOpt.textContent = 'Delete';
    deleteOpt.style.padding = '8px';
    deleteOpt.style.cursor = 'pointer';
    deleteOpt.style.color = '#cbd5e1';
    deleteOpt.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      const ok = confirm('Delete card?');
      if (ok) deleteCard(deskId, colId, card.id);
    });

    dropdown.appendChild(editOpt);
    dropdown.appendChild(deleteOpt);

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // close others
      document.querySelectorAll('.card-dropdown').forEach(d => { if (d !== dropdown) d.style.display = 'none'; });
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    wrapper.appendChild(menuBtn);
    wrapper.appendChild(dropdown);

    // dragging handlers (store source desk/col)
    wrapper.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/cardId', card.id);
      e.dataTransfer.setData('text/fromCol', colId);
      e.dataTransfer.setData('text/fromDesk', deskId);
      wrapper.classList.add('dragging');
      // For Firefox compatibility
      e.dataTransfer.effectAllowed = 'move';
    });
    wrapper.addEventListener('dragend', () => {
      wrapper.classList.remove('dragging');
      // close dropdowns
      document.querySelectorAll('.card-dropdown').forEach(d => d.style.display = 'none');
    });

    // dblclick to edit
    wrapper.addEventListener('dblclick', () => showModal(deskId, colId, card.id));

    return wrapper;
  }

  /* ---------------------
     Inline add card form
     --------------------- */
  function openInlineAddForm(deskId, colId, anchorButton) {
    // find column element
    const columnEl = [...boardColumnsEl.querySelectorAll('.column')].find(c => c.dataset.colId === colId);
    if (!columnEl) return;
    // prevent multiple forms
    if (columnEl.querySelector('.inline-add-form')) return;

    const form = document.createElement('div');
    form.className = 'inline-add-form';
    form.style.marginTop = '8px';
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '6px';

    form.innerHTML = `
      <textarea class="ia-text" rows="3" placeholder="Card text..." style="padding:8px;border-radius:6px;background:#071017;border:1px solid #cbd5e1;color:#cbd5e1;"></textarea>
      <input class="ia-img" type="text" placeholder="Image URL (optional)" style="padding:8px;border-radius:6px;background:#071017;border:1px solid #cbd5e1;color:#cbd5e1;">
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button class="ia-cancel" style="padding:6px 10px;border-radius:6px;border:1px solid #334155;background:transparent;color:#cbd5e1;cursor:pointer;">Cancel</button>
        <button class="ia-add" style="padding:6px 10px;border-radius:6px;background:#0052CC;border:none;color:#cbd5e1;cursor:pointer;">Add</button>
      </div>
    `;
    anchorButton.insertAdjacentElement('afterend', form);

    const txt = form.querySelector('.ia-text');
    const img = form.querySelector('.ia-img');
    const add = form.querySelector('.ia-add');
    const cancel = form.querySelector('.ia-cancel');

    add.addEventListener('click', () => {
      const content = txt.value.trim();
      const imgUrl = img.value.trim();
      if (!content && !imgUrl) {
        form.remove();
        return;
      }
      addCard(deskId, colId, content, imgUrl);
      form.remove();
    });
    cancel.addEventListener('click', () => form.remove());
    setTimeout(() => txt.focus(), 10);
  }

  /* ---------------------
     Global events & shortcuts
     --------------------- */
  function wireGlobalEvents() {
    // close dropdowns on click outside
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.card-dropdown').forEach(d => d.style.display = 'none');
      closeAllContextMenus();
    });

    // keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        // add column to active desk
        addColumn('New Column');
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        hideModal();
        document.querySelectorAll('.card-dropdown').forEach(d => d.style.display = 'none');
        closeAllContextMenus();
      }
    });

    // Create column button wiring (safe replace to avoid duplicates)
    if (createColumnBtn) {
      const fresh = createColumnBtn.cloneNode(true);
      createColumnBtn.parentNode.replaceChild(fresh, createColumnBtn);
      fresh.addEventListener('click', () => {
        const title = prompt('Название новой колонки:', 'Новая колонка');
        if (title !== null) addColumn(title.trim() || 'Новая колонка');
      });
    }
  }

  /* ---------------------
     Boot / Seeding
     --------------------- */
  function seedIfEmpty() {
    if (!data.desks || !data.desks.length) {
      const d = {
        id: uid('desk'),
        title: DEFAULT_DESK_NAME,
        columns: [
          { id: uid('col'), title: 'Krello Starter Guide', cards: [
              { id: uid('card'), content: 'New to Krello? Start here', img: 'images/card-image-1.png', done: false },
              { id: uid('card'), content: 'Capture from email, Slack, and...', img: 'images/card-image-2.png', done: false }
          ]},
          { id: uid('col'), title: 'Today', cards: [{ id: uid('card'), content: 'Start using Krello', img: '', done: false }]},
          { id: uid('col'), title: 'This Week', cards: []},
          { id: uid('col'), title: 'Later', cards: []},
        ]
      };
      data.desks = [d];
      data.activeDeskId = d.id;
      save();
    }
  }

  /* ---------------------
     Init
     --------------------- */
  async function init() {
    const ok = await load();     // ждём Firestore/локалку
    if (!ok) {
      data = { desks: [], activeDeskId: null };
    }
    seedIfEmpty();
    wireGlobalEvents();
    renderDeskSwitcher();
    if (!data.activeDeskId && data.desks.length) data.activeDeskId = data.desks[0].id;
    renderBoard();
  }

  init();

  /* ---------------------
     Expose some helpers for debugging in console
     --------------------- */
  window.__krello_app = {
    get data() { return data; },
    save,
    createDesk,
    deleteDesk,
    renameDesk,
    addColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    setActiveDesk
  };

})();
