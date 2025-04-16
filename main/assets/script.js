const cardsColors = [
  "#FFFFFF",   // white
  "#DBF6FF",   // light blue
  "#FFFFB3",    // light yellow
  "#DFF6A7",   // light green
  "#FFD0D0",   // pink
  "#DFCFEF",   // light purple
]

const renderedEvents = {
  'click': {
    '.move-column-left': [moveColumn, false],
    '.move-column-right': [moveColumn, true],
    '.move-column': toggleMoveColumnUi,
    '.rename-column': toggleRenameColumnUi,
    '.cancel-rename-column': [toggleRenameColumnUi, false],
    '.save-rename-column': renameColumn,
    '.delete-column': toggleDeleteColumnUi,
    '.cancel-delete-column': [toggleDeleteColumnUi, false],
    '.save-delete-column': deleteColumn,
    '.add-task-button': showAddTaskUi,
    '.add-task': showAddTaskUi,
    '.task-edit-cancel': hideAddTaskUi,
    '.task-edit-save': addTask,
    '.task .task-info-toggle' : toggleTaskInfo,
    '.task-delete': showDeleteTaskUi,
    '.cancel-delete-task': removeDeleteTaskUi,
    '.task .task-title': showEditTaskUi,
    '.task .confirm-delete-task': deleteTask,
    '.task-change-color' : showSetColorUI,
    '.colors-list li' : previewTaskColor,
    '.cancel-set-color' : removeSetColorUI,
    '.save-set-color' : saveColor,
  }

}

function preventDefault (e) {
  e.preventDefault();
}

// Утилита для генерации uid
function generateUID() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// Чтение и запись в localStorage
function saveAppData(data) {
  //Android.saveDataToFile(JSON.stringify(data));
  localStorage.setItem('kanbanAppData', JSON.stringify(data));
}

function loadAppData() {
  //const raw = Android.loadDataFromFile();
  const raw = localStorage.getItem('kanbanAppData');
  return raw ? JSON.parse(raw) : null;
}

// Структура приложения
let appData = loadAppData();

function createDefaultBoard() {
  return {
    id: generateUID(),
    name: 'Kanban Board',
    columns: [
      { id: generateUID(), name: 'To Do', cards: [] },
      { id: generateUID(), name: 'In Progress', cards: [] },
      { id: generateUID(), name: 'Done', cards: [] }
    ]
  };
}

if (!appData) {
  appData = {};
  const defaultBoard = createDefaultBoard();
  saveBoards([defaultBoard], defaultBoard.id);
}

// Получить текущую доску
function getCurrentBoard() {
  return appData.boards.find(b => b.id == appData.currentBoardId);
}

function getCurrentColumnByElement(el) {
  const currentColEl = el.closest('.column');
  return getCurrentBoard().columns.find(c => c.id == currentColEl.dataset.id);
}

function getCurrentCardByElement(el) {
  const currentTaskEl = el.closest('.task');
  return getCurrentColumnByElement(el).cards.find(task => task.id == currentTaskEl.dataset.id);
}

// Отображение заголовка текущей доски
function renderHeader() {
  const titleEl = document.getElementById('board-title');
  const currentBoard = getCurrentBoard();
  if (titleEl && currentBoard) {
    titleEl.textContent = currentBoard.name;
    document.getElementById('rename-board').classList.remove('hidden');
    document.getElementById('delete-board').classList.remove('hidden');
  } else {
    titleEl.innerHTML = '';
    document.getElementById('rename-board').classList.add('hidden');
    document.getElementById('delete-board').classList.add('hidden');
  }
}

// Переключение доски
function switchBoard(boardId) {
  if (appData.boards.find(b => b.id == boardId)) {
    appData.currentBoardId = boardId;
    saveAppData(appData);
    renderBoardsMenu();
    renderHeader();
    renderBoard();
  }
}

// Создание новой доски
function createBoard() {
  if (!appData.boards?.length) {
    removeNoBoardsScreen();
  }
  const newId = generateUID();
  appData.boards.push({
    id: newId,
    name: "Новая доска",
    columns: [
      { id: generateUID(), name: "To Do", cards: [] },
      { id: generateUID(), name: "In progress", cards: [] },
      { id: generateUID(), name: "Done", cards: [] }
    ]
  });
  saveBoards(appData.boards, newId)
  renderBoardsMenu();
  renderHeader();
  renderBoard();
}

// Заполнение меню досок
function renderBoardsMenu() {
  const listEl = document.getElementById('boards-buttons');
  const parent = listEl.closest('#boards-list');
  let createButton = listEl.querySelector('#create-board') || parent.querySelector('#create-board');
  if (createButton) {
    createButton = createButton.parentNode.removeChild(createButton);
  }
  listEl.innerHTML = '';
  appData.boards.forEach(board => {
    const btn = document.createElement('button');
    btn.textContent = board.name;
    if (board.id === appData.currentBoardId) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      console.log(board);
      switchBoard(board.id)
    });
    listEl.appendChild(btn);
  });
  createButton && listEl.appendChild(createButton);
}

const menuButton = document.getElementById('menu-toggle');

// Показ/скрытие меню
function toggleMenu(e) {
  e && e.stopPropagation();
  document.getElementById('menu').classList.toggle('hidden');
}

function hideMenu(e) {
  if (!(e.target.id && e.target.id == 'menu' || e.target.closest('#menu') 
    && !document.getElementById('menu').classList.contains('hidden'))) {
      document.getElementById('menu').classList.add('hidden');
  }
}

// Начальный рендер
document.addEventListener('DOMContentLoaded', () => {
  menuButton.addEventListener('click', toggleMenu);
  document.addEventListener('click', hideMenu);
  renderHeader();
  renderBoardsMenu();
  renderBoard();
});

function renderBoard() {
  const boardContainer = document.getElementById('columns');
  boardContainer.innerHTML = '';
  const currentBoard = getCurrentBoard();
  if (!currentBoard) {
    renderNoBoardsScreen();
    return;
  }
  
  currentBoard.columns.forEach(column => {
    // Карточки
    let cardsHtml = [];
    column.cards.forEach(task => {
      cardsHtml.push(`
        <div class="task" style="background:${task.color};" data-id="${task.id}">
          <div class="task-header">
            <span class="task-title">${task.description}</span>
            <button class="task-info-toggle">⮟</button>
          </div>
          <div class="task-info hidden">
            <button class="task-delete">Удалить</button>
            <button class="task-change-color">Сменить цвет</button>
          </div>
        </div>
      `);
    });
    if (!cardsHtml.length) {
      cardsHtml = [`<button class="add-task-button">Кликни, чтобы добавить задачу</button>`];
    }
    const columnHtml = `
      <div class="column" data-id="${column.id}">
        <div class="column-header">
          <h3 class="column-title">${column.name}</h3>
          <span class="task-count">${column.cards.length}</span>
          <button class="add-task">+</button>
          <button class="column-menu-toggle">Меню</button>
        </div>
        <div class="column-menu hidden">
          <button class="move-column">Переместить</button>
          <button class="rename-column">Переименовать</button>
          <button class="delete-column">Удалить</button>
        </div>
        ${renderRenameColumnUi(column.name)}
        ${renderDeleteColumnUi()}
        ${renderMoveColumnUi()}
        <div class="column-body">
          ${cardsHtml.join('')}
        </div>
      </div>
    `;
    boardContainer.insertAdjacentHTML('beforeend', columnHtml);
    boardContainer.querySelectorAll('.rename-column-input').forEach(el => {
      el.addEventListener('input', updateSaveColumnButtonState);
    });
  });
}

function renderRenameColumnUi(name) {
  return `<div class="rename-column-block hidden">
    <h4>Rename column</h4>
    <input type="text" class="rename-column-input" ${name ? 'val="' + name + '"' : 'placehlder="New column name"'}>
    <button class="cancel-rename-column">Cancel</button>
    <button class="save-rename-column">Save</button>
  </div>`
}

function renderDeleteColumnUi() {
  return `<div class="delete-column-block hidden">
    <div>Delete this column with all tasks?</div>
    <button class="cancel-delete-column">Cancel</button>
    <button class="save-delete-column">Delete</button>
  </div>`
}

function renderMoveColumnUi() {
  return `<div class="move-column-block hidden">
    <div>Move column</div>
    <button class="move-column-left"><<</button>
    <button class="move-column-right">>></button>
  </div>`
}

// Ссылки на блоки
const renameBlock = document.getElementById('rename-board-block');
const deleteBlock = document.getElementById('delete-board-block');
const renameBoardInput = document.getElementById('rename-board-input');
const renameBoardButton = document.getElementById('confirm-rename');
const showBoards = document.getElementById('boards-button');
const boardsListBlock = document.getElementById('boards-list');

renameBoardInput.addEventListener('input', (e) => {
    updateSaveButtonState(
    renameBoardInput,
    renameBoardButton, 
  );
})

// Показываем переименование
function showRenameBoardUI() {
  renameBlock.classList.remove('hidden');
  deleteBlock.classList.add('hidden');
  document.getElementById("board-title").classList.add('hidden');
  document.getElementById("menu-toggle").classList.add('hidden');  
  renameBoardInput.value = getCurrentBoard().name;
  renameBoardInput.focus();
  toggleMenu();
}

// Показываем удаление
function showDeleteBoardUI() {
  deleteBlock.classList.remove('hidden');
  renameBlock.classList.add('hidden');
  //document.getElementById("board-title").classList.add('hidden');
  document.getElementById("menu-toggle").classList.add('hidden');
  toggleMenu();
}

// Скрыть оба
function hideBoardManagementUI() {
  renameBoardButton.removeAttribute('disabled');
  renameBlock.classList.add('hidden');
  deleteBlock.classList.add('hidden');
  document.getElementById("board-title").classList.remove('hidden');
  document.getElementById("menu-toggle").classList.remove('hidden');    
}

function saveBoards(updatedBoards, currentBoardId) {
  appData.boards = updatedBoards;
  if (currentBoardId === null) {
    delete appData.currentBoardId
  } else {
    appData.currentBoardId = currentBoardId ?? appData.currentBoardId;
  }
  saveAppData(appData);
}

document.getElementById('rename-board').addEventListener('click', showRenameBoardUI);
document.getElementById('delete-board').addEventListener('click', showDeleteBoardUI);

document.querySelectorAll('.js-cancel-current').forEach(el => {
  el.addEventListener('click', () => {
    hideBoardManagementUI();
  });
});

renameBoardButton.addEventListener('click', () => {
  const newName = renameBoardInput.value.trim();
  if (newName) {
    const board = getCurrentBoard();
    board.name = newName;
    saveBoards(appData.boards);
    renderBoardsMenu();
    renderHeader();
    hideBoardManagementUI();
  }
});

// Подтвердить удаление доски
document.getElementById('delete-confirm').addEventListener('click', () => {
  const currentIndex = appData.boards.findIndex(b => b.id === appData.currentBoardId);
  const newBoards = appData.boards.filter(b => b.id !== appData.currentBoardId);

  if (newBoards.length > 0) {
    // Выбираем следующую (или предыдущую, если удалили последнюю)
    const nextIndex = Math.min(currentIndex, newBoards.length - 1);
    const newCurrentBoardId = newBoards[nextIndex].id;
    saveBoards(newBoards, newCurrentBoardId);
    renderHeader();
    renderBoardsMenu();
    renderBoard();
    toggleMenu();
    hideBoardManagementUI();
  } else {
    saveBoards([], null);
    hideBoardManagementUI();
    renderHeader();
    renderBoardsMenu();
    renderBoard();
    renderNoBoardsScreen();
  }

});

function renderNoBoardsScreen() {
  const main = document.querySelector('main');
  main.insertAdjacentHTML('afterbegin', `
    <div id="no-boards">
      <button id="create-default-board">
        Click to create a board
      </button>
    </div>
  `);

  document.getElementById('create-default-board').addEventListener('click', () => {
    const newBoard = createDefaultBoard();
    saveBoards([newBoard], newBoard.id)
    renderHeader();
    renderBoard();
    renderBoardsMenu();
    hideBoardManagementUI();
  });
}

function removeNoBoardsScreen() {
  const el = document.getElementById('no-boards');
  el && el.remove();
}

function toggleBoardsList() {
  boardsListBlock.classList.toggle('hidden');
  toggleMenu();
  document.getElementById("board-title").classList.toggle('hidden');
  document.getElementById("menu-toggle").classList.toggle('hidden');
}

showBoards.addEventListener('click', toggleBoardsList);

document.getElementById('close-boards-list').addEventListener('click', () => {
  boardsListBlock.classList.toggle('hidden');
  document.getElementById("board-title").classList.toggle('hidden');
  document.getElementById("menu-toggle").classList.toggle('hidden');
})

document.getElementById('create-board').addEventListener('click', createBoard);

document.getElementById('add-column').addEventListener('click', function () {
  const newColumn = {
    id: generateUID(),
    name: 'Новая колонка',
    cards: []
  };

  getCurrentBoard().columns.push(newColumn);
  saveBoards(appData.boards, appData.currentBoardId);
  renderBoard();
});

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('column-menu-toggle')) {
    if (isColumnUiShown(e.target.closest('.column'))) {
      hideColumActionsUi(e.target.closest('.column'));
    } else {
      e.target.closest('.column').querySelector('.column-menu').classList.toggle('hidden');
    }
  }
});

function moveColumn(button, doMoveRight) {
  const currentBoard = getCurrentBoard();
  if (currentBoard.columns.length == 1) return;
  let currentColumnEl = button.closest('.column');
  const currentColumnIndex = currentBoard.columns.findIndex(col => col.id == currentColumnEl.dataset.id);
  if ((currentColumnIndex == (currentBoard.columns.length - 1) && doMoveRight)
    || (currentColumnIndex == 0 && !doMoveRight)) {
    return
  }
  const currentColumn = currentBoard.columns[currentColumnIndex];
  const moveColId = currentColumn.id;
  currentBoard.columns = currentBoard.columns.filter(col => col != currentColumn);
  const insertIndex = doMoveRight ? currentColumnIndex + 1 : currentColumnIndex - 1;
  currentBoard.columns.splice(insertIndex, 0, currentColumn);
  saveBoards(appData.boards, appData.currentBoardId);
  renderBoard();
  toggleMoveColumnUi(document.querySelector('[data-id="' + moveColId + '"]'), false);
  currentColumnEl = document.querySelector(`[data-id="${currentColumn.id}"]`);
  currentColumnEl.closest('main').scrollLeft = currentColumnEl.offsetLeft - 30;
}

function isColumnUiShown(column) {
  return !(column.querySelector('.rename-column-block').classList.contains('hidden')
    && column.querySelector('.delete-column-block').classList.contains('hidden')
    && column.querySelector('.move-column-block').classList.contains('hidden'));
}

function hideColumActionsUi(column) {
  column.querySelector('.save-rename-column').removeAttribute('disabled');
  column.querySelector('.rename-column-block').classList.add('hidden');
  column.querySelector('.delete-column-block').classList.add('hidden');
  column.querySelector('.move-column-block').classList.add('hidden');
}

function getTaskEditFormHtml(taskDescription) {
  return `
    <div class="task-edit">
      <textarea ${taskDescription ? '' : ' placeholder="Описание"'} class="task-edit-input">${taskDescription ? taskDescription : ''}</textarea>
      <button class="task-edit-cancel">Отмена</button>
      <button class="task-edit-save" disabled>Сохранить</button>
    </div>  
  `
}

function getTaskDeleteUi() {
  return `
    <div class="task-delete-block">
      Delete this task?<br>
      <button class="cancel-delete-task">Cancel</button>
      <button class="confirm-delete-task">Delete</button>
    </div>
  `;
}

let longPressTimer = null;
let longPressTarget = null;

function enableTextSelection(enable) {
  document.body.style.userSelect = enable ? '' : 'none';
}

function blockContextMenuTemporarily() {
  function preventOnce(e) {
    e.preventDefault();
    // После одного вызова — удаляем обработчик
    document.removeEventListener('contextmenu', preventOnce, true);
  }

  document.addEventListener('contextmenu', preventOnce, true);

  // На всякий случай — удалим и по таймеру (если вдруг не сработал preventOnce)
  setTimeout(() => {
    document.removeEventListener('contextmenu', preventOnce, true);
  }, 300);
}

document.body.addEventListener('touchstart', (e) => {
  const task = e.target.closest('.task');
  if (!task) return;
  
  longPressTarget = task;
  longPressTimer = setTimeout(() => {
    enableTextSelection(false);
    startDrag(longPressTarget, e); 
    blockContextMenuTemporarily(); 
    longPressTimer = null;
  }, 400);
});

document.body.addEventListener('touchend', () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    enableTextSelection(false);
  }
});

document.body.addEventListener('touchmove', () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
});

/* START DRAG */

let dragState = null;

//function startDrag(cardElement, columnId, cardId) {
function startDrag(cardElement, event) {
  cardElement.classList.add('dragged');
  const rect = cardElement.getBoundingClientRect();
  const clone = cardElement.cloneNode(true);
  clone.classList.add('dragging');
  clone.style.position = 'fixed';
  clone.style.top = `${rect.top}px`;
  clone.style.left = `${rect.left}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.zIndex = 1000;
  document.body.appendChild(clone);

  dragState = {
    clone: clone,
    draggingCard: cardElement,
  };

  function onMove(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    clone.style.left = `${x - clone.offsetWidth / 2}px`;
    clone.style.top = `${y - clone.offsetHeight / 2}px`;

    autoScrollColumns(x);

    const currentColumn = getColumnAtPoint(x);
    if (currentColumn) {
      updateInsertIndicator(currentColumn, e.clientY || e.touches?.[0]?.clientY);
    }
  }

  function onEnd(e) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchend', onEnd);

    dropCard(e);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);

}

// Определяем колонку, над которой сейчас находится курсор/палец
function getColumnAtPoint(cursorX) {
  const columnsContainer = document.getElementById('columns');
  const columnElements = Array.from(columnsContainer.querySelectorAll('.column'));
  for (let i = 0; i < columnElements.length; i++) {
    const rect = columnElements[i].getBoundingClientRect();
    if (cursorX > rect.left && cursorX < rect.right) {
      return columnElements[i];
    }
  }
}

function autoScrollColumns(cursorX) {
  //console.log('autoScrollColumns', cursorX);
  //const scrollContainer = document.getElementById('columns');
  const main = document.querySelector('main');
  const scrollMargin = 60; // расстояние от края, при котором начинается прокрутка
  const scrollSpeed = 10;  // пикселей за кадр

  const containerRect = main.getBoundingClientRect();
  //const containerRect = scrollContainer.getBoundingClientRect();

  if (cursorX < containerRect.left + scrollMargin) {
    //console.log('left scroll');
    // скроллим влево
    main.scrollLeft -= scrollSpeed;
  } else if (cursorX > containerRect.right - scrollMargin) {
    //console.log('right scroll');
    // скроллим вправо
    main.scrollLeft += scrollSpeed;
  }
}

/* DROP task */

function dropCard(event) {
  if (!dragState.draggingCard || !dragState.clone) return;

  const cursorX = event.clientX || (event.touches && event.changedTouches[0].clientX);

  let targetColumnEl = getColumnAtPoint(cursorX);

  if (targetColumnEl) {
    const currentBoard = getCurrentBoard();
    const targetColumn = currentBoard.columns.find(c => c.id == targetColumnEl.dataset.id);

    if (!targetColumn.cards) targetColumn.cards = [];

    const sourceColumn = currentBoard.columns.find(col =>
      col.cards && col.cards.some(c => c.id === dragState.draggingCard.dataset.id)
    );
    const draggedCard = sourceColumn.cards.find(c => c.id === dragState.draggingCard.dataset.id);
    // Удалим карточку из старой колонки
    if (sourceColumn) {
      sourceColumn.cards = sourceColumn.cards.filter(c => c.id !== dragState.draggingCard.dataset.id);
    }

    // Добавим карточку в новую колонку
    const insertIndicator = document.querySelector('.task-insert-indicator');
    let insertIndex = insertIndicator ? Array.from(targetColumnEl.querySelectorAll('.task')).findIndex(el =>
      el.previousElementSibling === insertIndicator) : -1;
    if (insertIndex === -1) insertIndex = targetColumn.cards.length;
    targetColumn.cards.splice(insertIndex, 0, draggedCard);
    //targetColumn.cards.push(draggedCard);
    saveBoards(appData.boards, appData.currentBoardId);
    renderBoard();
  }

  // Очистка
  removeInsertIndicators();
  dragState.draggingCard.classList.remove('dragged');
  dragState.draggingCard = null;
  if (dragState.clone) {
    dragState.clone.remove();
    dragState.clone = null;
  }
}

function updateInsertIndicator(columnEl, y) {
  removeInsertIndicators();

  const cards = Array.from(columnEl.querySelectorAll('.task:not(.dragged)'));
  if (!cards.length) return;
  let inserted = false;

  for (let i = 0; i < cards.length; i++) {
    const task = cards[i];
    const rect = task.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (y < midpoint) {
      const indicator = document.createElement('div');
      indicator.classList.add('task-insert-indicator');
      task.parentNode.insertBefore(indicator, task);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    // Если ниже всех — вставим в конец
    const indicator = document.createElement('div');
    indicator.classList.add('task-insert-indicator');
    columnEl.appendChild(indicator);
  }
}

function removeInsertIndicators() {
  document.querySelectorAll('.task-insert-indicator').forEach(el => el.remove());
}

const eventHandler = function (e, eventName) {
  const entry = renderedEvents[eventName];
  for (let selector in entry) {
    const callbackObj = entry[selector];
    const method = Array.isArray(callbackObj) ? callbackObj[0] : callbackObj;
    const params = Array.isArray(callbackObj) ? callbackObj[1] : [];
    const skipSelectorCheck = Array.isArray(callbackObj) && callbackObj.length > 2 ? true : false;
    if (skipSelectorCheck || e.target.matches && e.target.matches(selector)) {
      method(e.target, params, e);
    }
  }
};

for (let eventName in renderedEvents) {
  document.addEventListener(eventName, (e) => {
    eventHandler.call(this, e, eventName);
  })
}

function toggleMoveColumnUi(el, shouldAdd) {
  const col = el.classList.contains('column') ? el : el.closest('.column');
  if (typeof doShow !== 'undefined'
    && !Array.isArray(doShow)) {
    col.querySelector('.column-menu').classList.toggle('hidden', true);
    col.querySelector('.move-column-block').classList.toggle('hidden', shouldAdd);
  } else {
    col.querySelector('.column-menu').classList.toggle('hidden', true);
    col.querySelector('.move-column-block').classList.toggle('hidden');
  }
}

function toggleRenameColumnUi(el, shouldShow) {
  const col = el.classList.contains('column') ? el : el.closest('.column');
  const colData = getCurrentBoard().columns.find(c => c.id == col.dataset.id);
  const input = col.querySelector('.rename-column-input');
  const renameBlock = col.querySelector('.rename-column-block');
  if (shouldShow === true) {
    col.querySelector('.column-menu').classList.toggle('hidden', true);
    renameBlock.classList.toggle('hidden', false);
    input.value = colData.name;
    input.focus();
  } else if (shouldShow === false) {
    col.querySelector('.column-menu').classList.toggle('hidden', false);
    renameBlock.classList.toggle('hidden', true);
    input.value = '';
  } else {
    col.querySelector('.column-menu').classList.toggle('hidden');
    renameBlock.classList.toggle('hidden');
    if (renameBlock.classList.contains('hidden')) {
      input.value = '';
    } else {
      input.focus();
      input.value = colData.name;
    }    
  }
}

function renameColumn(el) {
  const col = el.classList.contains('column') ? el : el.closest('.column');
  const input = col.querySelector('.rename-column-input');
  const newName = input.value.trim();
  if (newName) {
    const dataCol = getCurrentBoard().columns.find(c => c.id == col.dataset.id);
    dataCol.name = newName;
    saveBoards(appData.boards);
    renderBoard();
  }
}

function toggleDeleteColumnUi(el, shouldShow) {
  const col = el.classList.contains('column') ? el : el.closest('.column');
  const deleteBlock = col.querySelector('.delete-column-block');
  if (shouldShow === true) {
    col.querySelector('.column-menu').classList.toggle('hidden', true);
    deleteBlock.classList.toggle('hidden', false);
  } else if (shouldShow === false) {
    col.querySelector('.column-menu').classList.toggle('hidden', false);
    deleteBlock.classList.toggle('hidden', true);
  } else {
    col.querySelector('.column-menu').classList.toggle('hidden');
    deleteBlock.classList.toggle('hidden');
  }
}

function deleteColumn(el) {
  const currentBoard = getCurrentBoard();
  const col = el.closest('.column');
  const currentIndex = currentBoard.columns.findIndex(c => c.id === col.dataset.id);
  currentBoard.columns = currentBoard.columns.filter((c, i) => i !== currentIndex);
  saveBoards(appData.boards);
  renderBoard();
}

function showAddTaskUi(el) {
  const columnBody = el.closest('.column').querySelector('.column-body');
  columnBody.insertAdjacentHTML('afterbegin', getTaskEditFormHtml());
  const editBlock = columnBody.querySelector('.task-edit');
  const input = editBlock.querySelector('.task-edit-input');
  input.focus();
  input.addEventListener('input', updateSaveTaskButtonState);
}

function hideAddTaskUi(el) {
  document.querySelector('.task-edit').remove();
}

function addTask(el) {
  const colEl = el.closest('.column');
  const column = getCurrentBoard().columns.find(c => c.id == colEl.dataset.id);
  const editBlock = colEl.querySelector('.task-edit');
  const newCardId = generateUID();

  const newCard = {
    id: newCardId,
    description: editBlock.querySelector('.task-edit-input').value.trim(),
    color: '#FFFFFF',
  };

  editBlock.remove();
  column.cards = column.cards ? [newCard, ...column.cards] : [newCard];
  saveBoards(appData.boards);
  renderBoard();
  toggleTaskInfo(document.querySelector('.task[data-id="' + newCardId + '"] .task-info-toggle'));
}

function showEditTaskUi(el, params, event) {
  const task = el.closest('.task');
  if (el.classList.contains('task-title') && task.querySelector('.task-info').classList.contains('hidden')) return;
  let editBlock = task.querySelector('.task-edit');
  if (!editBlock) {
    const value = getCurrentBoard().columns.find(col =>
      col.cards.find(c => c.id == task.dataset.id)).cards.find(c =>
        c.id == task.dataset.id).description;
    task.insertAdjacentHTML('beforeend', getTaskEditFormHtml(value));
    editBlock = task.querySelector('.task-edit');
    const input = editBlock.querySelector('.task-edit-input');
    input.addEventListener('input', updateSaveTaskButtonState);
  }
}

function updateSaveTaskButtonState(e) {
  updateSaveButtonState(
    e.target,
    e.target.closest('.task-edit').querySelector('.task-edit-save'), 
  );
}

function updateSaveColumnButtonState(e) {
  updateSaveButtonState(
    e.target,
    e.target.closest('.rename-column-block').querySelector('.save-rename-column'), 
  );
}

function updateSaveButtonState(field, button) {
  if (field.value.trim().length) {
    button.removeAttribute('disabled');
  } else {
    button.setAttribute('disabled', true);
  }
}

function toggleTaskInfo(el, params, event) {
  const task = el.classList.contains('task') ? el : el.closest('.task');
  if (!task) return;
  const infoBlock = task.querySelector('.task-info');
  if (infoBlock.classList.contains('hidden')
    || el.classList.contains('task-info-toggle')) {
    // Если info скрыт, реагируем на клик на любом месте внутри .task
    // или info видим, реагируем только если клик на toggle
    infoBlock.classList.toggle('hidden');
    task.querySelector('.task-delete-block')?.remove();
  } 
}

function showDeleteTaskUi(el) {
  const task = el.closest('.task');
  task.insertAdjacentHTML('beforeend', getTaskDeleteUi());
}

function removeDeleteTaskUi(el) {
  const task = el.closest('.task');
  task.querySelector('.task-delete-block')?.remove();
}

function deleteTask(el) {
  const col = getCurrentColumnByElement(el);
  col.cards = col.cards.filter(task => task.id != el.closest('.task').dataset.id);
  saveBoards(appData.boards);
  renderBoard();
}

function showSetColorUI(el) {
  const cardEl = el.closest('.task');
  cardEl.insertAdjacentHTML('beforeend', getSetColorUI(cardEl));
}

function removeSetColorUI(el) {
  const cardEl = el.closest('.task');
  const colorsBlock = cardEl.querySelector('.set-task-colors');
  cardEl.style.background = colorsBlock.dataset.originalColor;
  colorsBlock.remove();
}

function getSetColorUI(el)  {
  const currentTask = getCurrentCardByElement(el);
  const currentColor = currentTask.color || '#FFFFFF';
  const colors = cardsColors.map(color => `
    <li data-color="${color}" style="background:${color}" ${currentColor == color ? ' class="current"' : ''}></li>  
  `);
  return `
    <div data-original-color="${currentColor}" class="set-task-colors">
      Choose task color<br>
      <ul class="colors-list">
        ${colors.join('')}
      </ul>
      <button class="cancel-set-color">Cancel</button>
      <button class="save-set-color" disabled>Save</button>
    </div>
  `;
}

function previewTaskColor(el) {
  el.classList.add('current');
  const cardEl = el.closest('.task');
  const colorEls = el.parentNode.querySelectorAll('li');
  colorEls.forEach(ce => {
    if (ce != el) {
      ce.classList.remove('current');
    }
  })
  el.closest('.task').style.background = el.dataset.color;
  const colorsBlock = el.closest('.set-task-colors');
  const button = cardEl.querySelector('.save-set-color');
  if (el.dataset.color == colorsBlock.dataset.originalColor) {
    button.setAttribute('disabled', "true");
  } else {
    button.removeAttribute('disabled');
  }
}

function saveColor(el) {
  const cardEl = el.closest('.task');
  const currentTask = getCurrentCardByElement(el);
  currentTask.color = cardEl.querySelector('li.current').dataset.color;
  saveBoards(appData.boards);
  renderBoard();
}
