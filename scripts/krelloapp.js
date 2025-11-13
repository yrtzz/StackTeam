import { makeCardDraggable, attachColumnDropzone } from './features/dnd.js';

// State management with localStorage
        let currentSection = 'inbox';
        let currentBoard = 'main';
        let columnIdCounter = 5;
        let cardIdCounter = 10;
        let activeColumnMenu = null;
        
        function getCurrentDeskKey() {
            if (currentSection === 'boards') {
                // разные доски в разделе "Доски"
                return `boards:${currentBoard}`;
            }
            // inbox / favorites и т.п.
            return currentSection;
        }
        
        // Data structure for all sections and boards
        const boardData = {
            inbox: null, // Will use default HTML
            boards: {
                main: null,
                personal: null,
                work: null
            }
        };
        
        // Load data from localStorage
        function loadBoardData() {
            try {
                const saved = localStorage.getItem('krello_board_data');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Only copy known keys to avoid unexpected overwrites
                    if (typeof parsed === 'object' && parsed !== null) {
                        if ('inbox' in parsed) boardData.inbox = parsed.inbox;
                        if ('boards' in parsed && typeof parsed.boards === 'object') {
                            boardData.boards = Object.assign(boardData.boards, parsed.boards);
                        }
                    }
                }
            } catch (err) {
                console.warn('Failed to parse saved board data, resetting. Error:', err);
            }
        }
        
        // Save data to localStorage
        function saveBoardData() {
            try {
                localStorage.setItem('krello_board_data', JSON.stringify(boardData));
            } catch (err) {
                console.warn('Failed to save board data:', err);
            }
        }
        
        // Get current board HTML
        function getCurrentBoardHTML() {
            const boardColumns = document.getElementById('boardColumns');
            return boardColumns.innerHTML;
        }
        
        // Save current board state
        function saveCurrentBoard() {
            const html = getCurrentBoardHTML();
            
            if (currentSection === 'inbox') {
                boardData.inbox = html;
            } else if (currentSection === 'boards') {
                boardData.boards[currentBoard] = html;
            }
            
            saveBoardData();
        }
        
        // Load board state
        function loadBoard(section, board = 'main') {
            const boardColumns = document.getElementById('boardColumns');
            
            if (section === 'inbox') {
                if (boardData.inbox) {
                    boardColumns.innerHTML = boardData.inbox;
                } else {
                    // Keep default inbox HTML (already in DOM)
                }
            } else if (section === 'boards') {
                if (boardData.boards[board]) {
                    boardColumns.innerHTML = boardData.boards[board];
                } else {
                    // Create empty board
                    boardColumns.innerHTML = `
                        <div class="column" data-column-id="${columnIdCounter++}">
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
                        <div class="column" data-column-id="${columnIdCounter++}">
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
                        <div class="column" data-column-id="${columnIdCounter++}">
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
                }
            }
            
            attachEventListeners();
            updateFavoriteStars();
        }
        
        // Favorites management
        function getFavorites() {
            const favorites = localStorage.getItem('krello_favorites');
            return favorites ? JSON.parse(favorites) : [];
        }
        
        function saveFavorites(favorites) {
            try {
                localStorage.setItem('krello_favorites', JSON.stringify(favorites));
            } catch (err) {
                console.warn('Cannot save favorites:', err);
            }
        }
        
        function toggleFavorite(cardId) {
            const favorites = getFavorites();
            const index = favorites.indexOf(cardId);
            
            if (index > -1) {
                favorites.splice(index, 1);
            } else {
                favorites.push(cardId);
            }
            
            saveFavorites(favorites);
            updateFavoriteStars();
            
            if (currentSection === 'favorites') {
                renderFavorites();
            }
        }
        
        function updateFavoriteStars() {
            const favorites = getFavorites();
            document.querySelectorAll('.card').forEach(card => {
                const cardId = card.getAttribute('data-card-id');
                const star = card.querySelector('.card-star');
                if (star) {
                    if (favorites.includes(cardId)) {
                        star.classList.remove('far');
                        star.classList.add('fas', 'favorited');
                    } else {
                        star.classList.remove('fas', 'favorited');
                        star.classList.add('far');
                    }
                }
            });
        }
        
        // Modal management with position fixing
        function closeAllModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
                modal.style.top = '';
                modal.style.left = '';
            });
        }
        
        function openModal(modalId, iconElement) {
            closeAllModals();
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const rect = iconElement.getBoundingClientRect();
            
            // Ensure modal is visible to measure
            modal.classList.add('active');
            modal.style.top = '0px';
            modal.style.left = '-9999px';
            
            // Calculate position ensuring modal stays within viewport
            const menuRect = modal.getBoundingClientRect();
            
            // Всегда размещаем ПОД иконкой
            let top = rect.bottom + 10;
            let left;
            
            // Для модального окна профиля выравниваем по правому краю иконки
            if (modalId === 'profileModal') {
                left = rect.right - menuRect.width;
            } else {
                // Для остальных окон - по центру иконки
                left = rect.left + rect.width / 2 - menuRect.width / 2;
            }
            
            // Right/left bounds
            if (left + menuRect.width > window.innerWidth - 20) {
                left = window.innerWidth - menuRect.width - 20;
            }
            if (left < 20) {
                left = 20;
            }
            
            // Если окно не помещается снизу, проверяем можно ли разместить выше
            if (top + menuRect.height > window.innerHeight - 20) {
                // Пробуем разместить ВЫШЕ иконки
                const topAbove = rect.top - menuRect.height - 10;
                if (topAbove >= 20) {
                    top = topAbove;
                } else {
                    // Если и сверху не помещается, ограничиваем снизу
                    top = window.innerHeight - menuRect.height - 20;
                }
            }
            
            modal.style.top = top + 'px';
            modal.style.left = left + 'px';
        }
        
        // Column menu with position fixing
        function closeColumnMenu() {
            if (activeColumnMenu) {
                activeColumnMenu.remove();
                activeColumnMenu = null;
            }
        }
        
        function openColumnMenu(trigger, column) {
            closeColumnMenu();
            
            const menu = document.createElement('div');
            menu.className = 'column-menu active';
            
            const rect = trigger.getBoundingClientRect();
            
            // Calculate position
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
                <hr style="margin: 5px 0; border: none; border-top: 1px solid var(--border-color);">
                <div class="column-menu-item" data-action="watch">
                    <i class="far fa-eye"></i> Watch
                </div>
                <hr style="margin: 5px 0; border: none; border-top: 1px solid var(--border-color);">
                <div class="column-menu-item" data-action="sort">
                    <i class="fas fa-sort"></i> Sort by...
                </div>
                <hr style="margin: 5px 0; border: none; border-top: 1px solid var(--border-color);">
                <div class="column-menu-item" data-action="rename">
                    <i class="fas fa-edit"></i> Rename
                </div>
                <div class="column-menu-item" data-action="set-color">
                    <i class="fas fa-palette"></i> Set list color
                </div>
                <hr style="margin: 5px 0; border: none; border-top: 1px solid var(--border-color);">
                <div class="column-menu-item" data-action="automation">
                    <i class="fas fa-robot"></i> Automation
                </div>
                <hr style="margin: 5px 0; border: none; border-top: 1px solid var(--border-color);">
                <div class="column-menu-item" data-action="archive-list">
                    <i class="fas fa-archive"></i> Archive this list
                </div>
                <div class="column-menu-item" data-action="archive-all">
                    <i class="fas fa-archive"></i> Archive all cards in this list
                </div>
            `;
            
            document.body.appendChild(menu);
            
            // Adjust position after appending to get actual dimensions
            const menuRect = menu.getBoundingClientRect();
            
            // Check if menu would go off right edge
            if (left + menuRect.width > window.innerWidth - 20) {
                left = window.innerWidth - menuRect.width - 20;
            }
            
            // Check if menu would go off bottom edge
            if (top + menuRect.height > window.innerHeight - 20) {
                top = rect.top - menuRect.height - 5;
            }
            
            menu.style.top = top + 'px';
            menu.style.left = left + 'px';
            
            activeColumnMenu = menu;
            
            menu.addEventListener('click', (e) => {
                const item = e.target.closest('.column-menu-item');
                if (!item) return;
                
                const action = item.getAttribute('data-action');
                const columnHeader = column.querySelector('.column-header h4');
                
                switch(action) {
                    case 'add-card':
                        addNewCard(column);
                        break;
                    case 'copy-list':
                        const copiedColumn = column.cloneNode(true);
                        copiedColumn.setAttribute('data-column-id', columnIdCounter++);
                        const h4 = copiedColumn.querySelector('.column-header h4');
                        h4.textContent = h4.textContent + ' (copy)';
                        column.parentNode.insertBefore(copiedColumn, column.nextSibling);
                        attachEventListeners();
                        saveCurrentBoard();
                        break;
                    case 'move-list':
                        alert('Move list (в разработке)');
                        break;
                    case 'move-all-cards':
                        alert('Move all cards (в разработке)');
                        break;
                    case 'watch':
                        alert('✓ Watching this list. You will receive notifications about changes.');
                        break;
                    case 'sort':
                        const sortOption = prompt('Sort by:\n1 - Date created (newest first)\n2 - Date created (oldest first)\n3 - Card name (alphabetically)\n4 - Due date', '1');
                        if (sortOption) {
                            alert('Cards sorted!');
                        }
                        break;
                    case 'rename':
                        const newName = prompt('Введите новое название колонки:', columnHeader.textContent);
                        if (newName && newName.trim()) {
                            columnHeader.textContent = newName.trim();
                            saveCurrentBoard();
                        }
                        break;
                    case 'set-color':
                        const colors = ['#61BD4F', '#F2D600', '#FF9F1A', '#EB5A46', '#C377E0', '#0079BF', '#00C2E0', '#51E898'];
                        const colorChoice = prompt('Choose color:\n1-Green, 2-Yellow, 3-Orange, 4-Red, 5-Purple, 6-Blue, 7-Sky, 8-Lime, 0-Remove color', '0');
                        if (colorChoice && colorChoice !== '0') {
                            column.style.backgroundColor = colors[parseInt(colorChoice) - 1] || '';
                            column.style.opacity = '0.95';
                        } else if (colorChoice === '0') {
                            column.style.backgroundColor = '';
                            column.style.opacity = '';
                        }
                        saveCurrentBoard();
                        break;
                    case 'automation':
                        alert('🤖 Automation:\n\n1. Auto-sort by due date\n2. Auto-move completed cards\n3. Auto-assign labels\n\n(Feature in development)');
                        break;
                    case 'archive-list':
                        if (confirm('Архивировать этот список?')) {
                            column.remove();
                            saveCurrentBoard();
                        }
                        break;
                    case 'archive-all':
                        if (confirm('Архивировать все карточки в этом списке?')) {
                            const cards = column.querySelectorAll('.card');
                            cards.forEach(card => card.remove());
                            saveCurrentBoard();
                        }
                        break;
                }
                
                closeColumnMenu();
            });
        }
        
        // Section switching
        function switchSection(section) {
            // Save current state before switching
            if (currentSection !== 'favorites') {
                saveCurrentBoard();
            }
            
            currentSection = section;
            
            const titles = {
                'inbox': 'Inbox — Входящие задачи 📥',
                'boards': 'Доски — Проекты и задачи 📊',
                'favorites': 'Избранное ⭐'
            };
            
            document.getElementById('boardTitle').textContent = titles[section] || 'Inbox';
            
            // Update active sidebar item
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-section') === section) {
                    item.classList.add('active');
                }
            });
            
            // Show/hide board tabs
            const boardTabs = document.querySelector('.board-tabs');
            if (section === 'boards') {
                boardTabs.style.display = 'flex';
                loadBoard('boards', currentBoard);
            } else if (section === 'favorites') {
                boardTabs.style.display = 'none';
                renderFavorites();
            } else {
                boardTabs.style.display = 'none';
                loadBoard('inbox');
            }
        }
        
        // Board tab switching
        function switchBoardTab(boardName) {
            // Save current board before switching
            if (currentSection === 'boards') {
                saveCurrentBoard();
            }
            
            currentBoard = boardName;
            
            // Update active tab
            document.querySelectorAll('.board-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-board') === boardName) {
                    tab.classList.add('active');
                }
            });
            
            loadBoard('boards', boardName);
        }
        
        // Render favorites
        function renderFavorites() {
            const favorites = getFavorites();
            const boardColumns = document.getElementById('boardColumns');
            
            if (favorites.length === 0) {
                boardColumns.innerHTML = '<div style="color: white; padding: 20px; font-size: 1.1rem;">⭐ Нет избранных карточек<br><small style="opacity: 0.7;">Нажмите на звездочку на любой карточке, чтобы добавить её в избранное</small></div>';
                return;
            }
            
            // Collect all cards from saved HTML for inbox and boards
            const allCards = [];
            
            if (boardData.inbox) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(boardData.inbox, 'text/html');
                allCards.push(...Array.from(doc.querySelectorAll('.card')));
            } else {
                // also collect from current DOM
                allCards.push(...Array.from(document.querySelectorAll('.card')));
            }
            
            Object.values(boardData.boards).forEach(boardHTML => {
                if (boardHTML) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(boardHTML, 'text/html');
                    allCards.push(...Array.from(doc.querySelectorAll('.card')));
                }
            });
            
            const favoriteColumn = document.createElement('div');
            favoriteColumn.className = 'column';
            favoriteColumn.innerHTML = `
                <div class="column-header">
                    <h4>⭐ Избранные карточки</h4>
                </div>
                <div class="column-cards"></div>
            `;
            
            const cardsContainer = favoriteColumn.querySelector('.column-cards');
            
            allCards.forEach(card => {
                const cardId = card.getAttribute('data-card-id');
                if (favorites.includes(cardId)) {
                    const clonedCard = card.cloneNode(true);
                    cardsContainer.appendChild(clonedCard);
                }
            });
            
            boardColumns.innerHTML = '';
            boardColumns.appendChild(favoriteColumn);
            
            attachEventListeners();
            updateFavoriteStars();
        }
        
        // Search functionality
        function filterCards(searchText) {
            const text = searchText.toLowerCase().trim();
            
            if (!text) {
                document.querySelectorAll('.card').forEach(card => {
                    card.classList.remove('hidden');
                });
                document.querySelectorAll('.column').forEach(column => {
                    column.classList.remove('hidden');
                });
                return;
            }
            
            document.querySelectorAll('.column').forEach(column => {
                let hasVisibleCard = false;
                
                column.querySelectorAll('.card').forEach(card => {
                    const cardText = card.textContent.toLowerCase();
                    if (cardText.includes(text)) {
                        card.classList.remove('hidden');
                        hasVisibleCard = true;
                    } else {
                        card.classList.add('hidden');
                    }
                });
                
                if (hasVisibleCard) {
                    column.classList.remove('hidden');
                } else {
                    column.classList.add('hidden');
                }
            });
        }
        
        // Create new column
        function createNewColumn(name) {
            if (currentSection === 'favorites') {
                alert('Нельзя создавать колонны в разделе "Избранное"');
                return;
            }
            
            const columnName = name || 'Новая колонка';
            const boardColumns = document.getElementById('boardColumns');
            
            const newColumn = document.createElement('div');
            newColumn.className = 'column';
            newColumn.setAttribute('data-column-id', columnIdCounter++);
            
            newColumn.innerHTML = `
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
            
            boardColumns.appendChild(newColumn);
            attachEventListeners();
            saveCurrentBoard();
        }
        
        // Add new card
        function addNewCard(column) {
            const cardText = prompt('Введите текст карточки:');
            if (!cardText || !cardText.trim()) return;
            
            const cardsContainer = column.querySelector('.column-cards');
            const newCard = document.createElement('div');
            newCard.className = 'card';
            newCard.setAttribute('data-card-id', String(cardIdCounter++));
            
            newCard.innerHTML = `
                <input type="checkbox" class="card-checkbox">
                <i class="far fa-star card-star"></i>
                <p>${cardText.trim()}</p>
            `;
            
            cardsContainer.appendChild(newCard);
            attachEventListeners();
            saveCurrentBoard();
        }
        
        // Event listeners
        function attachEventListeners() {
            // Add has-checkbox class and attach listeners
            document.querySelectorAll('.card-checkbox').forEach(checkbox => {
                const card = checkbox.closest('.card');
                if (card) {
                    card.classList.add('has-checkbox');
                }
                
                checkbox.onchange = null;
                checkbox.addEventListener('change', (e) => {
                    const card = e.target.closest('.card');
                    if (e.target.checked) {
                        card.classList.add('completed');
                    } else {
                        card.classList.remove('completed');
                    }
                    saveCurrentBoard();
                });
                if (currentSection !== 'favorites') {
                    const deskId = getCurrentDeskKey();
            
                    document.querySelectorAll('#boardColumns .column').forEach(column => {
                        const colId = column.getAttribute('data-column-id');
                        const cardsWrap = column.querySelector('.column-cards');
                        if (!cardsWrap) return;
            
                        // Делаем контейнер приёмником DnD
                        attachColumnDropzone(cardsWrap, {
                            deskId,
                            colId,
                            onMove(fromDeskId, fromColId, cardId, toDeskId, toColId, insertIndex) {
                                // DOM-перестановку уже сделал attachColumnDropzone
                                // Нам достаточно сохранить текущую доску
                                saveCurrentBoard();
                            }
                        });
            
                        // Делаем каждую карточку draggable
                        cardsWrap.querySelectorAll('.card').forEach(card => {
                            const cardId = card.getAttribute('data-card-id');
                            if (!cardId) return;
            
                            makeCardDraggable(card, {
                                deskId,
                                colId,
                                cardId
                            });
                        });
                    });
                }
            });
            
            // Star buttons
            document.querySelectorAll('.card-star').forEach(star => {
                star.onclick = (e) => {
                    e.stopPropagation();
                    const card = e.target.closest('.card');
                    const cardId = card.getAttribute('data-card-id');
                    toggleFavorite(cardId);
                    
                    // Save after favoriting
                    if (currentSection !== 'favorites') {
                        saveCurrentBoard();
                    }
                };
            });
            
            // Column menu triggers
            document.querySelectorAll('.column-menu-trigger').forEach(trigger => {
                trigger.onclick = (e) => {
                    e.stopPropagation();
                    const column = e.target.closest('.column');
                    openColumnMenu(trigger, column);
                };
            });
            
            // Add card buttons
            document.querySelectorAll('.add-card-btn').forEach(btn => {
                btn.onclick = () => {
                    const column = btn.closest('.column');
                    addNewCard(column);
                };
            });
            
            // Card clicks for details (excluding checkbox and star)
            document.querySelectorAll('.card').forEach(card => {
                card.onclick = null;
                card.addEventListener('click', (e) => {
                    // Don't open details if clicking checkbox or star
                    if (e.target.classList.contains('card-checkbox') || 
                        e.target.classList.contains('card-star')) {
                        return;
                    }
                    
                    const cardText = card.querySelector('p').textContent;
                    const cardId = card.getAttribute('data-card-id');
                    
                    // Special handling for guide card
                    if (cardText.includes('New to Krello') || cardText.includes('Start here')) {
                        if (confirm('Открыть руководство для начинающих?')) {
                            window.open('guide.html', '_blank');
                        }
                        return;
                    }
                    
                    // Simple card details (can be expanded later)
                    const details = prompt('Edit card:\n\n' + cardText + '\n\n(Full card modal coming soon!)', cardText);
                    
                    if (details && details.trim() && details !== cardText) {
                        card.querySelector('p').textContent = details.trim();
                        saveCurrentBoard();
                    }
                });
            });
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            loadBoardData();
            
            // Save initial inbox state if not saved
            if (!boardData.inbox) {
                saveCurrentBoard();
            }
            
            attachEventListeners();
            updateFavoriteStars();
            
            // Board tabs
            document.querySelectorAll('.board-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const boardName = tab.getAttribute('data-board');
                    switchBoardTab(boardName);
                });
            });
            
            // Modal triggers
            document.getElementById('notificationIcon').addEventListener('click', function(e) {
                e.stopPropagation();
                openModal('notificationModal', this);
            });
            
            document.getElementById('helpIcon').addEventListener('click', function(e) {
                e.stopPropagation();
                openModal('helpModal', this);
            });
            
            document.getElementById('profileIcon').addEventListener('click', function(e) {
                e.stopPropagation();
                openModal('profileModal', this);
            });
            
            // Modal action clicks
            document.querySelectorAll('#helpModal p[data-action]').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.getAttribute('data-action');
                    closeAllModals();
                    
                    if (action === 'help-center') {
                        window.open('https://support.atlassian.com/trello/', '_blank');
                    } else if (action === 'hotkeys') {
                        alert('Горячие клавиши:\n\n' +
                              'N - Новая карточка\n' +
                              'F - Поиск\n' +
                              'B - Переключить между досками\n' +
                              '/ - Фокус на поиск\n' +
                              'Esc - Закрыть модальное окно');
                    }
                });
            });
            
            document.querySelectorAll('#profileModal p[data-action]').forEach(item => {
                item.addEventListener('click', () => {
                    const action = item.getAttribute('data-action');
                    closeAllModals();
                    
                    switch(action) {
                        case 'switch-account':
                            alert('Switch accounts (в разработке)');
                            break;
                        case 'manage-account':
                            alert('Manage account - откроет страницу управления аккаунтом');
                            break;
                        case 'profile':
                            alert('Profile and visibility settings (в разработке)');
                            break;
                        case 'activity':
                            alert('Activity log - история ваших действий (в разработке)');
                            break;
                        case 'cards':
                            alert('All your cards across all boards (в разработке)');
                            break;
                        case 'settings':
                            alert('Настройки аккаунта (в разработке)');
                            break;
                        case 'theme':
                            const theme = prompt('Choose theme:\n1 - Light\n2 - Dark\n3 - Auto', '2');
                            if (theme) {
                                alert('Theme applied!');
                            }
                            break;
                        case 'create-workspace':
                            const workspaceName = prompt('Enter workspace name:');
                            if (workspaceName) {
                                alert('✓ Workspace "' + workspaceName + '" created!');
                            }
                            break;
                        case 'help':
                            window.open('https://support.atlassian.com/trello/', '_blank');
                            break;
                        case 'shortcuts':
                            alert('Горячие клавиши:\n\n' +
                                  'N - Новая карточка\n' +
                                  'F - Поиск\n' +
                                  'B - Переключить между досками\n' +
                                  '/ - Фокус на поиск\n' +
                                  'Esc - Закрыть модальное окно\n' +
                                  'C - Archive card\n' +
                                  'E - Quick edit card');
                            break;
                        case 'logout':
                            if (confirm('Вы уверены, что хотите выйти?')) {
                                window.location.href = 'index.html';
                            }
                            break;
                    }
                });
            });
            
            // Close modals and menus on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.modal') && !e.target.closest('.header-right i') && !e.target.closest('.user-avatar')) {
                    closeAllModals();
                }
                if (!e.target.closest('.column-menu') && !e.target.closest('.column-menu-trigger')) {
                    closeColumnMenu();
                }
            });
            
            // Sidebar navigation
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = item.getAttribute('data-section');
                    switchSection(section);
                });
            });
            
            // Search
            const searchInput = document.getElementById('searchInput');
            searchInput.addEventListener('input', (e) => {
                filterCards(e.target.value);
            });
            
            // New column button
            document.getElementById('newColumnBtn').addEventListener('click', () => {
                const searchValue = searchInput.value.trim();
                createNewColumn(searchValue);
                searchInput.value = '';
                filterCards('');
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ignore if typing in input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                
                if (e.key === 'Escape') {
                    closeAllModals();
                    closeColumnMenu();
                }
                
                if (e.key === '/' || (e.key === 'f' && !e.ctrlKey)) {
                    e.preventDefault();
                    searchInput.focus();
                }
            });
            
            // Save on page unload
            window.addEventListener('beforeunload', () => {
                if (currentSection !== 'favorites') {
                    saveCurrentBoard();
                }
            });

        }); // <-- закрываем DOMContentLoaded

