const tasksColors = [
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
    '.task .task-info-toggle': toggleTaskInfo,
    '.task-expand-button': toggleTaskInfo,
    '.task-delete': showDeleteTaskUi,
    '.cancel-delete-task': removeDeleteTaskUi,
    '.task .task-title': showEditTaskUi,
    '.task .confirm-delete-task': deleteTask,
    '.task-change-color': showSetColorUI,
    '.cancel-set-color': removeSetColorUI,
    '.colors-list li': previewTaskColor,
    '.save-set-color': saveColor,
    '.task-edit-button': showEditTaskUi,
    '.new-task-cancel': hideAddTaskUi,
  }

}

function focusAndPlaceCursorAtEnd(input) {
  input.addEventListener('focus', function () {
    setTimeout(() => {
      this.setSelectionRange(this.value.length, this.value.length);
    }, 0);
  });
  input.focus();
}

function preventDefault(e) {
  e.preventDefault();
}

// Утилита для генерации uid
function generateUID() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// Чтение и запись в localStorage
function saveAppData(data) {
  Android.saveDataToFile(JSON.stringify(data));
  // localStorage.setItem('kanbanAppData', JSON.stringify(data));
}

function loadAppData() {
  const raw = Android.loadDataFromFile();
  // const raw = localStorage.getItem('kanbanAppData');
  return raw ? JSON.parse(raw) : null;
}

// Структура приложения
let appData = loadAppData();

function createDefaultBoard() {
  return {
    id: generateUID(),
    name: 'Kanban Board',
    columns: [
      {id: generateUID(), name: 'To Do', tasks: []},
      {id: generateUID(), name: 'In Progress', tasks: []},
      {id: generateUID(), name: 'Done', tasks: []}
    ]
  };
}

if(!appData) {
  appData = {};
  const defaultBoard = createDefaultBoard();
  saveBoards([defaultBoard], defaultBoard.id);
}

// Получить текущую доску
function getCurrentBoard() {
  return appData.boards.find(b => b.id == appData.currentBoardId);
}

function getCurrentColumnByElement(el) {
  const currentColEl = el.classList.contains('column') ? el : el.closest('.column');
  return getCurrentBoard().columns.find(c => c.id == currentColEl.dataset.id);
}

function getCurrentTaskByElement(el) {
  const currentTaskEl = el.closest('.task');
  return getCurrentColumnByElement(el).tasks.find(task => task.id == currentTaskEl.dataset.id);
}

// Отображение заголовка текущей доски
function renderHeader() {
  const titleEl = document.getElementById('board-title');
  const currentBoard = getCurrentBoard();
  if(titleEl && currentBoard) {
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
  if(appData.boards.find(b => b.id == boardId)) {
    appData.currentBoardId = boardId;
    saveAppData(appData);
    renderBoardsMenu();
    renderHeader();
    renderBoard();
  }
}

// Создание новой доски
function createBoard() {
  if(!appData.boards?.length) {
    removeNoBoardsScreen();
  }
  const newId = generateUID();
  appData.boards.push({
    id: newId,
    name: "Новая доска",
    columns: [
      {id: generateUID(), name: "To Do", tasks: []},
      {id: generateUID(), name: "In progress", tasks: []},
      {id: generateUID(), name: "Done", tasks: []}
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
  if(createButton) {
    createButton = createButton.parentNode.removeChild(createButton);
  }
  listEl.innerHTML = '';
  appData.boards.forEach(board => {
    const btn = document.createElement('button');
    btn.dataset.id = board.id;
    btn.textContent = board.name;
    if(board.id === appData.currentBoardId) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      console.log(board);
      switchBoard(board.id);
      document.getElementById('close-boards-list').click();
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
  if(!(e.target.id && e.target.id == 'menu' || e.target.closest('#menu')
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
  if(!currentBoard) {
    renderNoBoardsScreen();
    return;
  }

  currentBoard.columns.forEach(column => {
    // Карточки
    let tasksHtml = [];
    column.tasks.forEach(task => {
      tasksHtml.push(`
        <div class="task" style="background:${task.color};" data-id="${task.id}">
          <div class="task-expand-button"></div>
          <button class="task-info-toggle"></button>
          <div class="task-header">
            <span class="task-title">${task.description}</span>
          </div>
          <div class="task-info hidden">
            <button class="task-change-color"></button>
            <button class="task-delete"></button>
            <button class="task-edit-button"></button>
          </div>
        </div>
      `);
    });
    if(!tasksHtml.length) {
      tasksHtml = [`<button class="add-task-button">Click to add first task</button>`];
    }
    const columnHtml = `
      <div class="column" data-id="${column.id}">
        <div class="column-header">
          <h3 class="column-title">${column.name}</h3>
          <span class="task-count">${column.tasks.length}</span>
          <button class="add-task"></button>
          <button class="column-menu-toggle"></button>
        </div>
        <div class="column-menu hidden">
        <button class="rename-column">Rename column</button>
          <button class="move-column">Move column</button>
          <button class="delete-column">Delete column</button>
        </div>
        ${renderRenameColumnUi(column.name)}
        ${renderDeleteColumnUi()}
        ${renderMoveColumnUi()}
        <div class="column-body">
          ${tasksHtml.join('')}
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
    Rename column<br>
    <input type="search" class="rename-column-input" ${name ? 'value="' + name + '"' : 'placehlder="New column name"'}>
    <button class="save-rename-column board-management-button" disabled>Save</button>
    <button class="cancel-rename-column board-management-button">Cancel</button>
  </div>`
}

function renderDeleteColumnUi() {
  return `<div class="delete-column-block hidden">
    <div>Delete this column with all tasks?</div>
    <button class="save-delete-column board-management-button">Delete</button>
    <button class="cancel-delete-column board-management-button">Cancel</button>
  </div>`
}

function renderMoveColumnUi() {
  return `<div class="move-column-block hidden">
    <div>Move column</div>
    <button class="move-column-right board-management-button"></button>
    <button class="move-column-left board-management-button"></button>
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
  focusAndPlaceCursorAtEnd(renameBoardInput);
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
  if(currentBoardId === null) {
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
  if(newName) {
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

  if(newBoards.length > 0) {
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
  const newUid = generateUID();
  const newColumn = {
    id: newUid,
    name: 'Новая колонка',
    tasks: []
  };
  getCurrentBoard().columns.push(newColumn);
  saveBoards(appData.boards, appData.currentBoardId);
  renderBoard();
  document.querySelector('main').scrollLeft = document.querySelector(`.column[data-id=${newUid}]`).offsetLeft - 30;
});

document.addEventListener('click', function (e) {
  if(e.target.classList.contains('column-menu-toggle')) {
    if(isColumnUiShown(e.target.closest('.column'))) {
      hideColumActionsUi(e.target.closest('.column'));
    } else {
      e.target.closest('.column').querySelector('.column-menu').classList.toggle('hidden');
      e.target.classList.toggle('expanded');
    }
  }
});

function moveColumn(button, doMoveRight) {
  const currentBoard = getCurrentBoard();
  if(currentBoard.columns.length == 1) return;
  let currentColumnEl = button.closest('.column');
  const currentColumnIndex = currentBoard.columns.findIndex(col => col.id == currentColumnEl.dataset.id);
  if((currentColumnIndex == (currentBoard.columns.length - 1) && doMoveRight)
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
  currentColumnEl.querySelector('.column-menu-toggle').classList.add('expanded');
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
  column.querySelector('.column-menu-toggle').classList.remove('expanded');
}

function getTaskEditFormHtml(task) {
  const inner = `
    <div class="task-edit"${task ? ' data-id="' + task.id + '"' : ''}>
      <textarea rows="1" ${task ? '' : ' placeholder="Description"'} class="task-edit-input">${task ? task.description : ''}</textarea>
      <button class="task-edit-save board-management-button" disabled>Save</button>
      <button class="task-edit-cancel board-management-button">Cancel</button>
    </div>  
  `;
  if(task) {
    return inner;
  } else {
    return `<div class="task">
      <button class="new-task-cancel"></button>
      ${inner}
      </div>
    `
  }
}

function getTaskDeleteUi() {
  return `
    <div class="task-delete-block">
      Delete this task?<br><br>
      <button class="confirm-delete-task  board-management-button">Delete</button>
      <button class="cancel-delete-task  board-management-button">Cancel</button>
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
  if(!document.getElementById('boards-buttons').contains(e.target)
    || e.target.tagName !== 'BUTTON') return;
  longPressTarget = e.target;
  longPressTimer = setTimeout(() => {
    enableTextSelection(false);
    boardsStartDrag(longPressTarget);
    blockContextMenuTemporarily();
    longPressTimer = null;
  }, 400);
})

document.body.addEventListener('touchstart', (e) => {
  const task = e.target.closest('.task');
  if(!task) return;
  if(e.target.classList.contains('task-edit-input')
    || task.classList.contains('expanded')) return;

  longPressTarget = task;
  longPressTimer = setTimeout(() => {
    if(e.target.classList.contains('task-edit-input')
      || task.classList.contains('expanded')) return;
    enableTextSelection(false);
    startDrag(longPressTarget, e);
    blockContextMenuTemporarily();
    longPressTimer = null;
  }, 400);
});

document.body.addEventListener('touchend', () => {
  if(longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    enableTextSelection(false);
  }
});

document.body.addEventListener('touchmove', (e) => {
  const task = e.target.closest('.task');
  if(task) {
    if(e.target.classList.contains('task-edit-input')
      || task.classList.contains('expanded')) return;
  }
  if(longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
});

/* START DRAG */
let dragState = null;
let colsScroll = {};

function startDrag(taskElement) {
  taskElement.classList.add('dragged');
  const rect = taskElement.getBoundingClientRect();
  const clone = taskElement.cloneNode(true);
  clone.classList.add('dragging');
  clone.style.position = 'fixed';
  clone.style.top = `${rect.top}px`;
  clone.style.left = `${rect.left}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.zIndex = 1000;
  document.body.appendChild(clone);

  dragState = {
    clone: clone,
    draggingTask: taskElement,
  };

  function onMove(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    clone.style.left = `${x - clone.offsetWidth / 2}px`;
    clone.style.top = `${y - clone.offsetHeight / 2}px`;

    const currentColumn = getColumnAtPoint(x);

    autoScrollColumns(x, y, currentColumn);

    if(currentColumn) {
      updateInsertIndicator(currentColumn, e.clientY || e.touches?.[0]?.clientY);
    }
  }

  function onEnd(e) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchend', onEnd);

    dropTask(e);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, {passive: false});
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);

}

// Определяем колонку, над которой сейчас находится курсор/палец
function getColumnAtPoint(cursorX) {
  const columnsContainer = document.getElementById('columns');
  const columnElements = Array.from(columnsContainer.querySelectorAll('.column'));
  for(let i = 0;i < columnElements.length;i++) {
    const rect = columnElements[i].getBoundingClientRect();
    if(cursorX > rect.left && cursorX < rect.right) {
      return columnElements[i];
    }
  }
}

function autoScrollColumns(cursorX, cursorY, currentColumn) {
  //console.log('autoScrollColumns', cursorX);
  const main = document.querySelector('main');
  const scrollMargin = 60; // расстояние от края, при котором начинается прокрутка
  const scrollSpeed = 7;  // пикселей за кадр

  const containerRect = main.getBoundingClientRect();

  if(cursorX < containerRect.left + scrollMargin) {
    //console.log('left scroll');
    // скроллим влево
    main.scrollLeft -= scrollSpeed;
  } else if(cursorX > containerRect.right - scrollMargin) {
    //console.log('right scroll');
    // скроллим вправо
    main.scrollLeft += scrollSpeed;
  }

  if(!currentColumn) return;
  const columnBody = currentColumn.querySelector('.column-body');
  const colRect = columnBody.getBoundingClientRect();
  if(cursorY < colRect.top + scrollMargin) {
    //console.log('top scroll');
    columnBody.scrollTop -= scrollSpeed;
    colsScroll[currentColumn.dataset.id] = columnBody.scrollTop;
  } else if(cursorY > colRect.bottom - scrollMargin) {
    //console.log('down scroll');
    columnBody.scrollTop += scrollSpeed;
    colsScroll[currentColumn.dataset.id] = columnBody.scrollTop;
  }
  //console.log(colsScroll);
}

function dropTask(event) {
  if(!dragState.draggingTask || !dragState.clone) return;

  const cursorX = event.clientX || (event.touches && event.changedTouches[0].clientX);

  let targetColumnEl = getColumnAtPoint(cursorX);

  if(targetColumnEl) {
    const currentBoard = getCurrentBoard();
    const targetColumn = getCurrentColumnByElement(targetColumnEl);

    if(!targetColumn.tasks) targetColumn.tasks = [];

    const sourceColumn = currentBoard.columns.find(col =>
      col.tasks && col.tasks.some(c => c.id === dragState.draggingTask.dataset.id)
    );
    const draggedTask = sourceColumn.tasks.find(c => c.id === dragState.draggingTask.dataset.id);
    // Удалим карточку из старой колонки
    if(sourceColumn) {
      sourceColumn.tasks = sourceColumn.tasks.filter(c => c.id !== dragState.draggingTask.dataset.id);
    }

    // Добавим карточку в новую колонку
    const insertIndicator = document.querySelector('.insert-indicator');
    let insertIndex = insertIndicator ? Array.from(targetColumnEl.querySelectorAll('.task:not(.dragged):not(.dragging)')).findIndex(el =>
      el.previousElementSibling === insertIndicator) : -1;
    //console.log(insertIndex);
    if(insertIndex === -1) insertIndex = targetColumn.tasks.length;
    targetColumn.tasks.splice(insertIndex, 0, draggedTask);
    saveBoards(appData.boards, appData.currentBoardId);
    renderBoard();
    restoreColsVertScroll(colsScroll);
  }

  removeInsertIndicators();
  dragState.draggingTask.classList.remove('dragged');
  dragState.draggingTask = null;
  if(dragState.clone) {
    dragState.clone.remove();
    dragState.clone = null;
  }
}

function dropBoardButton() {
  if(!dragState.draggingTask || !dragState.clone) return;
  const container = document.getElementById('boards-buttons');
  const currentBoardId = getCurrentBoard().id;
  const draggedBoard = appData.boards.find(b => b.id == dragState.draggingTask.dataset.id);
  appData.boards = appData.boards.filter(b => b.id !== draggedBoard.id);
  const insertIndicator = container.querySelector('.board-insert-indicator');
  let insertIndex = insertIndicator ? Array.from(container.querySelectorAll('button:not(.dragged):not(.dragging)')).findIndex(el =>
    el.previousElementSibling === insertIndicator) : -1;
  if(insertIndex === -1) insertIndex = appData.boards.length;
  appData.boards.splice(insertIndex, 0, draggedBoard);
  saveBoards(appData.boards, currentBoardId);
  renderBoardsMenu();
  renderHeader();
  renderBoard();
  removeInsertIndicators();
  dragState.draggingTask.classList.remove('dragged');
  dragState.draggingTask = null;
  if(dragState.clone) {
    dragState.clone.remove();
    dragState.clone = null;
  }
}

function restoreColsVertScroll(colsScroll) {
  for(colId in colsScroll) {
    const colEl = document.querySelector(`.column[data-id="${colId}"]`);
    if(colEl) {
      colEl.querySelector('.column-body').scrollTop = colsScroll[colId];
    }
  }
  colsScroll = {};
}

function updateInsertIndicator(columnEl, y) {
  removeInsertIndicators();

  const tasks = Array.from(columnEl.querySelectorAll('.task:not(.dragged)'));
  if(!tasks.length) return;
  let inserted = false;

  for(let i = 0;i < tasks.length;i++) {
    const task = tasks[i];
    const rect = task.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if(y < midpoint) {
      const indicator = document.createElement('div');
      indicator.classList.add('insert-indicator');
      task.parentNode.insertBefore(indicator, task);
      inserted = true;
      break;
    }
  }

  if(!inserted) {
    // Если ниже всех — вставим в конец
    const indicator = document.createElement('div');
    indicator.classList.add('insert-indicator');
    columnEl.appendChild(indicator);
  }
}

function updateBoardInsertIndicator(x, y) {
  removeInsertIndicators();
  const container = document.getElementById('boards-buttons');
  const siblings = Array.from(container.querySelectorAll('button:not(.dragged)'));
  if(!siblings.length) return;
  const afterElement = getDragAfterElement(container, x, y);
  const indicator = document.createElement('div');
  indicator.classList.add('board-insert-indicator');
  if(afterElement) {
    container.insertBefore(indicator, afterElement);
  } else {
    container.appendChild(indicator);
  }
}

function removeInsertIndicators() {
  document.querySelectorAll('.insert-indicator').forEach(el => el.remove());
  document.querySelectorAll('.board-insert-indicator').forEach(el => el.remove());
}

function boardsStartDrag(dragEl) {
  dragEl.classList.add('dragged');
  const rect = dragEl.getBoundingClientRect();
  const clone = dragEl.cloneNode(true);
  clone.classList.add('dragging');
  clone.style.position = 'fixed';
  clone.style.top = `${rect.top}px`;
  clone.style.left = `${rect.left}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.zIndex = 1000;
  document.body.appendChild(clone);

  dragState = {
    clone: clone,
    draggingTask: dragEl,
  };

  function onMove(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;

    clone.style.left = `${x - clone.offsetWidth / 2}px`;
    clone.style.top = `${y - clone.offsetHeight / 2}px`;

    updateBoardInsertIndicator(x, y);
  }

  function onEnd(e) {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchend', onEnd);

    dropBoardButton();
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, {passive: false});
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

function getDragAfterElement(container, x, y) {
  const draggableElements = [
    ...container.querySelectorAll("button:not(.dragged)")
  ];
  return draggableElements.reduce(
    (closest, child, index) => {
      const box = child.getBoundingClientRect();
      const nextBox = draggableElements[index + 1] && draggableElements[index + 1].getBoundingClientRect();
      const inRow = y - box.bottom <= 0 && y - box.top >= 0; // check if this is in the same row
      const offset = x - (box.left + box.width / 2);
      if(inRow) {
        if(offset < 0 && offset > closest.offset) {
          return {
            offset: offset,
            element: child
          };
        } else {
          if( // handle row ends, 
            nextBox && // there is a box after this one. 
            y - nextBox.top <= 0 && // the next is in a new row
            closest.offset === Number.NEGATIVE_INFINITY // we didn't find a fit in the current row.
          ) {
            return {
              offset: 0,
              element: draggableElements[index + 1]
            };
          }
          return closest;
        }
      } else {
        return closest;
      }
    }, {
    offset: Number.NEGATIVE_INFINITY
  }
  ).element;
}

const eventHandler = function (e, eventName) {
  const entry = renderedEvents[eventName];
  for(let selector in entry) {
    const callbackObj = entry[selector];
    const method = Array.isArray(callbackObj) ? callbackObj[0] : callbackObj;
    const params = Array.isArray(callbackObj) ? callbackObj[1] : [];
    const skipSelectorCheck = Array.isArray(callbackObj) && callbackObj.length > 2 ? true : false;
    if(skipSelectorCheck || e.target.matches && e.target.matches(selector)) {
      method(e.target, params, e);
    }
  }
};

for(let eventName in renderedEvents) {
  document.addEventListener(eventName, (e) => {
    eventHandler.call(this, e, eventName);
  })
}

function toggleMoveColumnUi(el, shouldAdd) {
  const col = el.classList.contains('column') ? el : el.closest('.column');
  if(typeof doShow !== 'undefined'
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
  const input = col.querySelector('.rename-column-input');
  const renameBlock = col.querySelector('.rename-column-block');
  if(shouldShow === true) {
    col.querySelector('.column-menu').classList.toggle('hidden', true);
    renameBlock.classList.toggle('hidden', false);
    focusAndPlaceCursorAtEnd(input);
  } else if(shouldShow === false) {
    col.querySelector('.column-menu').classList.toggle('hidden', false);
    renameBlock.classList.toggle('hidden', true);
    input.value = '';
  } else {
    col.querySelector('.column-menu').classList.toggle('hidden');
    renameBlock.classList.toggle('hidden');
    if(renameBlock.classList.contains('hidden')) {
      input.value = '';
    } else {
      focusAndPlaceCursorAtEnd(input);
    }
  }
}

function renameColumn(el) {
  const col = el.classList.contains('column') ? el : el.closest('.column');
  const input = col.querySelector('.rename-column-input');
  const newName = input.value.trim();
  if(newName) {
    const dataCol = getCurrentBoard().columns.find(c => c.id == col.dataset.id);
    dataCol.name = newName;
    saveBoards(appData.boards);
    renderBoard();
  }
}

function toggleDeleteColumnUi(el, shouldShow) {
  const col = el.classList.contains('column') ? el : el.closest('.column');
  const deleteBlock = col.querySelector('.delete-column-block');
  if(shouldShow === true) {
    col.querySelector('.column-menu').classList.toggle('hidden', true);
    deleteBlock.classList.toggle('hidden', false);
  } else if(shouldShow === false) {
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
  input.addEventListener('input', (e) => {
    updateSaveTaskButtonState(e);
    expandInput(e.target);
  });
}

function hideAddTaskUi(el) {
  const taskEl = el.closest('.task');
  if(taskEl.querySelector('.new-task-cancel') != null) {
    taskEl.remove()
  } else {
    document.querySelector('.task-edit').remove();
    taskEl.querySelector('.task-info').classList.remove('hidden');
    taskEl.querySelector('.task-header').classList.remove('hidden');
  }
}

function addTask(el) {
  const editBlock = el.closest('.task-edit');
  const isAdding = !editBlock.dataset || typeof editBlock.dataset.id === 'undefined';
  const input = editBlock.querySelector('.task-edit-input');
  let theId = null;
  if(isAdding) {
    const column = getCurrentColumnByElement(el);
    const newTaskId = generateUID();
    theId = newTaskId;
    const newTask = {
      id: newTaskId,
      description: input.value.trim(),
      color: '#FFFFFF',
    };
    column.tasks = column.tasks ? [newTask, ...column.tasks] : [newTask];
  } else {
    const task = getCurrentTaskByElement(el);
    task.description = input.value.trim();
    theId = task.id;
  }
  editBlock.remove();
  saveBoards(appData.boards);
  renderBoard();
  document.querySelector('.task[data-id="' + theId + '"] .task-info-toggle')?.click();
}

function showEditTaskUi(el) {
  const taskEl = el.closest('.task');
  if(el.classList.contains('task-title') && taskEl.querySelector('.task-info').classList.contains('hidden')) return;
  let editBlock = taskEl.querySelector('.task-edit');
  if(!editBlock) {
    const task = getCurrentTaskByElement(el);
    taskEl.insertAdjacentHTML('beforeend', getTaskEditFormHtml(task));
    taskEl.querySelector('.task-info').classList.add('hidden');
    taskEl.querySelector('.task-header').classList.add('hidden');
    editBlock = taskEl.querySelector('.task-edit');
    const input = editBlock.querySelector('.task-edit-input');
    expandInput(input);
    input.addEventListener('input', updateSaveTaskButtonState);
    input.addEventListener('input', (e) => {
      expandInput(e.target);
    });
    focusAndPlaceCursorAtEnd(input);
  }
}

function expandInput(el) {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight) + 'px';
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
  if(field.value.trim().length) {
    button.removeAttribute('disabled');
  } else {
    button.setAttribute('disabled', true);
  }
}

function toggleTaskInfo(el) {
  const task = el.closest('.task');
  if(!task) return;
  const trigger = el.classList.contains('task-info-toggle') ? el : task.querySelector('.task-info-toggle');
  task.classList.toggle('expanded', !el.classList.contains('expanded'));
  task.querySelector('.task-info').classList.toggle('hidden', el.classList.contains('expanded'));
  task.querySelector('.task-header').classList.remove('hidden');
  trigger.classList.toggle('expanded');
  task.querySelector('.task-delete-block')?.remove();
  task.querySelector('.task-edit')?.remove();
  task.querySelector('.set-task-colors')?.remove();
}

function showDeleteTaskUi(el) {
  const task = el.closest('.task');
  task.insertAdjacentHTML('beforeend', getTaskDeleteUi());
  task.querySelector('.task-info').classList.add('hidden');
  task.querySelector('.task-header').classList.add('hidden');
}

function removeDeleteTaskUi(el) {
  const task = el.closest('.task');
  task.querySelector('.task-delete-block')?.remove();
  task.querySelector('.task-info').classList.remove('hidden');
  task.querySelector('.task-header').classList.remove('hidden');
}

function deleteTask(el) {
  const col = getCurrentColumnByElement(el);
  col.tasks = col.tasks.filter(task => task.id != el.closest('.task').dataset.id);
  saveBoards(appData.boards);
  renderBoard();
}

function showSetColorUI(el) {
  const taskEl = el.closest('.task');
  taskEl.insertAdjacentHTML('beforeend', getSetColorUI(taskEl));
  taskEl.querySelector('.task-info').classList.add('hidden');
  taskEl.querySelector('.task-header').classList.add('hidden');
}

function removeSetColorUI(el) {
  const taskEl = el.closest('.task');
  const colorsBlock = taskEl.querySelector('.set-task-colors');
  taskEl.style.background = colorsBlock.dataset.originalColor;
  colorsBlock.remove();
  taskEl.querySelector('.task-info').classList.remove('hidden');
  taskEl.querySelector('.task-header').classList.remove('hidden');
}

function getSetColorUI(el) {
  const currentTask = getCurrentTaskByElement(el);
  const currentColor = currentTask.color || '#FFFFFF';
  const colors = tasksColors.map(color => `
    <li data-color="${color}" style="background:${color}" ${currentColor == color ? ' class="current"' : ''}></li>  
  `);
  return `
    <div data-original-color="${currentColor}" class="set-task-colors">
      Choose task color<br><br>
      <ul class="colors-list">
        ${colors.join('')}
      </ul>
      <button class="save-set-color board-management-button" disabled>Save</button>
      <button class="cancel-set-color board-management-button" >Cancel</button>
    </div>
  `;
}

function previewTaskColor(el) {
  el.classList.add('current');
  const taskEl = el.closest('.task');
  const colorEls = el.parentNode.querySelectorAll('li');
  colorEls.forEach(ce => {
    if(ce != el) {
      ce.classList.remove('current');
    }
  })
  el.closest('.task').style.background = el.dataset.color;
  const colorsBlock = el.closest('.set-task-colors');
  const button = taskEl.querySelector('.save-set-color');
  if(el.dataset.color == colorsBlock.dataset.originalColor) {
    button.setAttribute('disabled', "true");
  } else {
    button.removeAttribute('disabled');
  }
}

function saveColor(el) {
  const taskEl = el.closest('.task');
  const currentTask = getCurrentTaskByElement(el);
  currentTask.color = taskEl.querySelector('li.current').dataset.color;
  saveBoards(appData.boards);
  taskEl.querySelector('.set-task-colors')?.remove();
  taskEl.querySelector('.task-info').classList.remove('hidden');
  taskEl.querySelector('.task-header').classList.remove('hidden');
}
