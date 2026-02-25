const Colors = {
  pink: "#FFD0D0",
  plum: "#FAC7ED",
  purple: "#DFCFEF",
  blue: "#DBF6FF",
  teal: "#c9fde2",
  green: "#DFF6A7",
  yellow: "#FFFFB3",
  white: "#FFFFFF",
  beige: "#e5d9d6"
};

const Storage = {
  load() {
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadDataFromFile());
    }
    return JSON.parse(localStorage.getItem('kanbanAppData'));
  },

  save(data) {
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveDataToFile(raw);
    } else {
      localStorage.setItem('kanbanAppData', raw);
    }
  }
};

const App = {
  data: null,

  load() {
    this.data = Storage.load();
    if(!this.data) {
      this.data = {};
    }
  },

  save() {
    Storage.save(this.data);
  },

};

const Bus = {
  events: {
    boardsChanged: 'boardsChanged',
    headerUIChanged: 'headerUIChanged',
    columnHeaderUIChanged: 'columnHeaderUIChanged',
  },
  listeners: {},
  queue: new Set(),
  scheduled: false,

  on(event, handler) {
    if(!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(handler);
  },

  emit(event, payload) {
    const handlers = this.listeners[event];
    if(!handlers) return;

    handlers.forEach(handler => {
      this.queue.add(() => handler(payload));
    });

    this.schedule();
  },

  schedule() {
    if(this.scheduled) return;
    this.scheduled = true;

    queueMicrotask(() => this.flush());
  },

  flush() {
    this.queue.forEach(fn => fn());
    this.queue.clear();
    this.scheduled = false;
  }
};

const State = {
  screen: 'board',
  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard
  menuOpen: false,
  boardUi: {},

  setState(patch) {
    Object.assign(this, patch);
  },
};

const BoardDomain = {

  getCurrentBoard() {
    return App.data.boards.find(b => b.id == App.data.currentBoardId);
  },

  saveBoards(updatedBoards, currentBoardId) {
    App.data.boards = updatedBoards;
    if(currentBoardId === null) {
      delete App.data.currentBoardId
    } else {
      App.data.currentBoardId = currentBoardId ? currentBoardId : App.data.currentBoardId;
    }
    Storage.save(App.data);
  },

  create() {
    const newId = Utils.generateUID();
    App.data.boards.push({
      id: newId,
      name: "Новая доска",
      columns: [
        {id: Utils.generateUID(), name: "To Do", tasks: []},
        {id: Utils.generateUID(), name: "In progress", tasks: []},
        {id: Utils.generateUID(), name: "Done", tasks: []}
      ]
    });
    this.saveBoards(App.data.boards, newId)
  },

  delete() {
    const currentIndex = App.data.boards.findIndex(b => b.id === App.data.currentBoardId);
    const newBoards = App.data.boards.filter(b => b.id !== App.data.currentBoardId);

    if(newBoards.length > 0) {
      // Выбираем следующую (или предыдущую, если удалили последнюю)
      const nextIndex = Math.min(currentIndex, newBoards.length - 1);
      const newCurrentBoardId = newBoards[nextIndex].id;
      this.saveBoards(newBoards, newCurrentBoardId);
    } else {
      this.saveBoards([], null);
    }
  },

  rename(newName) {
    const board = this.getCurrentBoard();
    board.name = newName;
    this.saveBoards(App.data.boards, board.id);
  },

  reorder(draggedBoardId, insertIndex) {
    const draggedBoard = App.data.boards.find(b => b.id == draggedBoardId);
    App.data.boards = App.data.boards.filter(b => b.id !== draggedBoardId);
    if(insertIndex === -1) insertIndex = App.data.boards.length;
    App.data.boards.splice(insertIndex, 0, draggedBoard);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  switchBoard(boardId) {
    if(App.data.boards.find(b => b.id == boardId)) {
      App.data.currentBoardId = boardId;
      Storage.save(App.data);
    }
  },

};

const BoardUI = {
  selectors: {
    columnsContainer: '#columns',
    main: 'main',
  },
  dom: {},

  init() {
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
  },

  render() {
    this.dom.columnsContainer.innerHTML = '';
    const board = BoardDomain.getCurrentBoard();

    if(!board) {
      this.dom.main.insertAdjacentHTML('afterbegin', `
      <div id="no-boards">
        <button id="create-default-board">
          Click to create a board
        </button>
      </div>
      `);
      return;
    }

    board.columns.forEach(column => {
      // Карточки
      let tasksHtml = [];
      /* 
      
      ${RanksUI.getLevelMarkHtml(task.color)}
      ${RanksUI.getOwnCount(board, task.color)}
      ${RanksUI.getPassMarkHtml(task, column)}
      ${RanksUI.getUpperLevelMarkHtml(task.color)}
      */
      column.tasks.forEach(task => {
        tasksHtml.push(`
        <div class="task" style="background:${Colors[task.color]};" data-id="${task.id}">
          <div class="ranks-info">
          //todo ranks
          </div>
          <div class="task-expand-button"></div>
          <button class="task-info-toggle"></button>
          <div class="task-header">
            <span class="task-title">${task.description}</span>
          </div>
          <div class="task-info hidden">
            <button class="task-change-color"></button>
            <button class="task-delete"></button>
            <button class="task-clone"></button>
            <button class="task-edit-button"></button>
          </div>
        </div>
      `);
      });

      if(!tasksHtml.length) {
        tasksHtml = [`<button class="add-task-button">Click to add first task</button>`];
      }
      /* //TODO column header
              ${ColumnUI.renderRenameUi(column.name)}
              ${ColumnUI.renderDeleteUi()}
              ${ColumnUI.renderMoveUi()}
       */
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
          <label for="skipMove"><input type="checkbox"${column.skipMove ? 'checked' : ''} name="skipMove">Skip move</label>
        </div>
<!-- TODO: col header -->
        <div class="column-body">
          ${tasksHtml.join('')}
        </div>
      </div>
    `;
      this.dom.columnsContainer.insertAdjacentHTML('beforeend', columnHtml);
    });
  },
};

const HeaderUI = {
  board: null,
  selectors: {
    title: '#board-title',
    boardsButton: '#boards-button',
    toggleMenuButton: '#menu-toggle',
    menu: '#menu',
    changeHeaderModeTriggers: '[data-header-mode-trigger]',
    renameBoardTrigger: '#rename-board',
    deleteBoardTrigger: '#delete-board',
    manageRanksTrigger: '#manage-ranks',
    showStatsTrigger: '#show-stats',
    statsUI: '#statsUI',
    renameBoardUI: '#rename-board-block',
    deleteBloardUI: '#delete-board-block',
    ranksUI: '#ranks-block',
    boardsListUI: '#boards-list',
    reset: '.js-cancel-current',
  },
  dom: {},
  init() {
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
  },

  toggleMenu(el, e) {
    e.stopPropagation();
    State.menuOpen = !State.menuOpen;
    this.render();
  },

  hideMenu(el, e) {
    if(
      !this.dom.menu.contains(el) &&
      !this.dom.toggleMenuButton.contains(el) &&
      State.menuOpen !== false
    ) {
      State.menuOpen = false;
      this.render();
    }
  },

  reset() {
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.headerUIChanged);
  },

  changeMode(el, e) {
    State.headerUiMode = el.dataset.headerModeTrigger;
    State.menuOpen = false;
    Bus.emit(Bus.events.headerUIChanged);
  },

  render() {
    console.log('Header render');
    this.board = BoardDomain.getCurrentBoard();
    this.dom.title.classList.toggle('hidden', State.headerUiMode !== 'default');
    this.dom.title.innerHTML = this.board.name;
    this.dom.toggleMenuButton.classList.toggle('hidden', State.headerUiMode !== 'default');
    this.dom.menu.classList.toggle('hidden', !State.menuOpen);
    this.dom.menu.querySelectorAll('button').forEach(el =>
      el.classList.toggle('hidden', this.board == null));
    document.querySelectorAll('[data-header-mode]').forEach(el =>
      el.classList.toggle('hidden', State.headerUiMode !== el.dataset.headerMode));
  },

};

const BoardsList = {
  selectors: {
    createButton: '#create-board',
    boardsListButtonsContainer: '#boards-buttons',
    boardsButtons: '#boards-buttons button:not([id="create-board"])',
  },
  dom: {},
  init() {
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'boardsList') return;
    if(!App.data.currentBoardId) return;
    let createButton = this.dom.createButton;
    if(createButton) {
      createButton = createButton.parentNode.removeChild(createButton);
    }
    this.dom.boardsListButtonsContainer.innerHTML = '';
    App.data.boards.forEach(board => {
      const btn = document.createElement('button');
      btn.dataset.id = board.id;
      btn.textContent = board.name;
      if(board.id === App.data.currentBoardId) {
        btn.classList.add('active');
      }
      this.dom.boardsListButtonsContainer.appendChild(btn);
    });
    createButton && this.dom.boardsListButtonsContainer.appendChild(createButton);
  },

  switchBoard(el, e) {
    BoardDomain.switchBoard(el.dataset.id);
    Bus.emit(Bus.events.boardsChanged);
  },

  createBoard(el, e) {
    if(!App.data.boards?.length) {
      const el = document.getElementById('no-boards');
      el && el.remove();
    }
    BoardDomain.create();
    Bus.emit(Bus.events.boardsChanged);
  }
};

const RenameUI = {
  selectors: {
    renameInput: '#rename-board-input',
    confirmRenameButton: '#confirm-rename',
  },
  dom: {},
  init() {
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
  },
  updateButtonState() {
    Utils.updateButtonState(
      this.dom.renameInput,
      this.dom.confirmRenameButton,
    );
  },
  renameBoard() {
    BoardDomain.rename(this.dom.renameInput.value.trim());
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.boardsChanged);
    Bus.emit(Bus.events.headerUIChanged);
  },
  render() {
    if(State.headerUiMode !== 'renameBoard') return;
    if(!App.data.currentBoardId) return;
    this.dom.renameInput.setAttribute('data-original-value', BoardDomain.getCurrentBoard().name);
    this.dom.renameInput.value = BoardDomain.getCurrentBoard().name;
    Utils.focusAndPlaceCursorAtEnd(this.dom.renameInput);
  },
};

const DeleteUI = {
  selectors: {
    deleteBoardConfirmButton: '#delete-confirm',
  },
  dom: {},
  deleteBoard() {
    BoardDomain.delete();
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.headerUIChanged);
    Bus.emit(Bus.events.boardsChanged);
  },
};

const ColumnHeaderUI = {
  init() {
    Bus.on(Bus.events.boardsChanged, () => {
      State.columnHeaders = {};
    });
    Bus.on(Bus.events.columnHeaderUIChanged, this.render.bind(this));
  },

  render() {
    const headers = document.querySelectorAll('.column-header');

    headers.forEach(header => {
      //TODO
      const id = header.dataset.id;
      const mode = State.columnHeaders[id] || 'default';

      header.classList.toggle('menu-open', mode === 'menu');
    });
  }
};

const Utils = {
  generateUID() {
    return '_' + Math.random().toString(36).substr(2, 9);
  },

  preventDefault(e) {
    e.preventDefault();
  },

  updateButtonState(field, button) {
    if(field.value.trim().length
      && (field.dataset.originalValue
        && field.value !== field.dataset.originalValue
        || !field.dataset.originalValue)
    ) {
      button.removeAttribute('disabled');
    } else {
      button.setAttribute('disabled', true);
    }
  },

  expandInput(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
  },

  focusAndPlaceCursorAtEnd(input) {
    input.addEventListener('focus', function () {
      setTimeout(() => {
        this.setSelectionRange(this.value.length, this.value.length);
      }, 0);
    });
    input.focus();
  },

  cacheComponentDom(component) {
    if(component.selectors) {
      if(!component.dom) {
        component.dom = {};
      }
      Object.keys(component.selectors).forEach(selector => {
        const el = document.querySelector(component.selectors[selector]);
        if(el) {
          component.dom[selector] = el;
        }
      })
    }
  }
};

const DragDrop = {
  selectors: {
    main: 'main',
  },
  dom: {},
  longPressTimer: null,
  longPressTarget: null,
  dragState: null,
  colsScroll: {},

  // Определяем колонку, над которой сейчас находится курсор/палец
  getColumnAtPoint(cursorX) {
    const columnElements = Array.from(AppUI.els.columns.querySelectorAll('.column'));
    for(let i = 0;i < columnElements.length;i++) {
      const rect = columnElements[i].getBoundingClientRect();
      if(cursorX > rect.left && cursorX < rect.right) {
        return columnElements[i];
      }
    }
  },

  autoScrollColumns(cursorX, cursorY, currentColumn) {
    //console.log('autoScrollColumns', cursorX);
    const main = this.dom.main;
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
      this.colsScroll[currentColumn.dataset.id] = columnBody.scrollTop;
    } else if(cursorY > colRect.bottom - scrollMargin) {
      //console.log('down scroll');
      columnBody.scrollTop += scrollSpeed;
      this.colsScroll[currentColumn.dataset.id] = columnBody.scrollTop;
    }
    //console.log(this.colsScroll);
  },

  enableTextSelection(enable) {
    document.body.style.userSelect = enable ? '' : 'none';
  },

  blockContextMenuTemporarily() {
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
  },

  restoreColsVertScroll() {
    for(colId in this.colsScroll) {
      const colEl = document.querySelector(`.column[data-id="${colId}"]`);
      if(colEl) {
        colEl.querySelector('.column-body').scrollTop = this.colsScroll[colId];
      }
    }
    this.colsScroll = {};
  },

  //TODO
  dropTask(el, event) {
    if(!this.dragState.draggingTask || !this.dragState.clone) return;

    const cursorX = event.clientX || (event.touches && event.changedTouches[0].clientX);

    let targetColumnEl = this.getColumnAtPoint(cursorX);

    if(targetColumnEl) {
      const currentBoard = App.getCurrentBoard();
      const targetColumn = ColumnUI.getCurrentColumnByElement(targetColumnEl);
      const targetColumnIndex = currentBoard.columns.findIndex(col => col.id === targetColumn.id);
      //console.log(`targetColumnIndex: ${targetColumnIndex}`)

      if(!targetColumn.tasks) targetColumn.tasks = [];

      const sourceColumn = currentBoard.columns.find(col =>
        col.tasks && col.tasks.some(c => c.id === this.dragState.draggingTask.dataset.id)
      );


      const draggedTask = sourceColumn.tasks.find(c => c.id === this.dragState.draggingTask.dataset.id);
      let sourceColumnIndex = null;

      // Удалим карточку из старой колонки
      if(sourceColumn) {
        sourceColumnIndex = currentBoard.columns.findIndex(col => col.id == sourceColumn.id)
        sourceColumn.tasks = sourceColumn.tasks.filter(c => c.id !== this.dragState.draggingTask.dataset.id);
      }

      //console.log(`sourceColumnIndex: ${sourceColumnIndex}`)

      // Добавим карточку в новую колонку
      const insertIndicator = document.querySelector('.insert-indicator');
      let insertIndex = insertIndicator ? Array.from(targetColumnEl.querySelectorAll('.task:not(.dragged):not(.dragging)')).findIndex(el =>
        el.previousElementSibling === insertIndicator) : -1;
      //console.log(insertIndex);
      if(insertIndex === -1) insertIndex = targetColumn.tasks.length;
      targetColumn.tasks.splice(insertIndex, 0, draggedTask);

      RanksUI.makeAMove({
        color: draggedTask.color,
        sourceColumn: sourceColumn,
        targetColumn: targetColumn
      });

      App.saveBoards(App.data.boards, App.data.currentBoardId);
      BoardUI.renderBoard();
      this.restoreColsVertScroll();
    }

    this.removeInsertIndicators();
    this.dragState.draggingTask.classList.remove('dragged');
    this.dragState.draggingTask = null;
    if(this.dragState.clone) {
      this.dragState.clone.remove();
      this.dragState.clone = null;
    }
  },

  updateInsertIndicator(columnEl, y) {
    this.removeInsertIndicators();

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
  },

  dropBoardButton() {
    if(!this.dragState.draggingTask || !this.dragState.clone) return;
    const container = document.getElementById('boards-buttons');
    const insertIndicator = container.querySelector('.board-insert-indicator');
    let insertIndex = insertIndicator ? Array.from(container.querySelectorAll('button:not(.dragged):not(.dragging)')).findIndex(el =>
      el.previousElementSibling === insertIndicator) : -1;

    BoardDomain.reorder(this.dragState.draggingTask.dataset.id, insertIndex);

    this.removeInsertIndicators();
    this.dragState.draggingTask.classList.remove('dragged');
    this.dragState.draggingTask = null;
    if(this.dragState.clone) {
      this.dragState.clone.remove();
      this.dragState.clone = null;
    }

    Bus.emit(Bus.events.boardsChanged);
  },

  updateBoardInsertIndicator(x, y) {
    this.removeInsertIndicators();
    const container = BoardsList.dom.boardsListButtonsContainer;
    const siblings = Array.from(container.querySelectorAll('button:not(.dragged)'));
    if(!siblings.length) return;
    const afterElement = DragDrop.getDragAfterElement(container, x, y);
    const indicator = document.createElement('div');
    indicator.classList.add('board-insert-indicator');
    if(afterElement) {
      container.insertBefore(indicator, afterElement);
    } else {
      container.appendChild(indicator);
    }
  },

  removeInsertIndicators() {
    document.querySelectorAll('.insert-indicator').forEach(el => el.remove());
    document.querySelectorAll('.board-insert-indicator').forEach(el => el.remove());
  },

  startDrag(taskElement) {
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

    this.dragState = {
      clone: clone,
      draggingTask: taskElement,
    };

    function onMove(e) {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;

      clone.style.left = `${x - clone.offsetWidth / 2}px`;
      clone.style.top = `${y - clone.offsetHeight / 2}px`;

      const currentColumn = DragDrop.getColumnAtPoint(x);

      DragDrop.autoScrollColumns(x, y, currentColumn);

      if(currentColumn) {
        DragDrop.updateInsertIndicator(currentColumn, e.clientY || e.touches?.[0]?.clientY);
      }
    }

    function onEnd(e) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);

      DragDrop.dropTask(e.target, e);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);

  },

  boardsStartDrag(dragEl) {
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

    this.dragState = {
      clone: clone,
      draggingTask: dragEl,
    };

    function onMove(e) {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;

      clone.style.left = `${x - clone.offsetWidth / 2}px`;
      clone.style.top = `${y - clone.offsetHeight / 2}px`;

      DragDrop.updateBoardInsertIndicator(x, y);
    }

    function onEnd(e) {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchend', onEnd);

      DragDrop.dropBoardButton();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
  },

  getDragAfterElement(container, x, y) {
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
  },

  boardsButtonTouchStart(el, e) {
    //console.log('touchstart boards list');
    if(!BoardsList.dom.boardsListButtonsContainer.contains(el)
      || el.tagName !== 'BUTTON') return;
    this.longPressTarget = el;
    this.longPressTimer = setTimeout(() => {
      this.enableTextSelection(false);
      this.boardsStartDrag(this.longPressTarget);
      this.blockContextMenuTemporarily(e);
      this.longPressTimer = null;
    }, 400);
  },

  taskTouchStart(el, e) {
    //console.log('touchstart task')
    const task = e.target.closest('.task');
    if(!task) return;
    if(e.target.classList.contains('task-edit-input')
      || task.classList.contains('expanded')) return;

    this.longPressTarget = task;
    this.longPressTimer = setTimeout(() => {
      if(e.target.classList.contains('task-edit-input')
        || task.classList.contains('expanded')) return;
      this.enableTextSelection(false);
      this.startDrag(this.longPressTarget, e);
      this.blockContextMenuTemporarily(e);
      this.longPressTimer = null;
    }, 400);
  },

  touchEnd() {
    //console.log('touchend')
    if(this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
      this.enableTextSelection(false);
    }
  },

  touchMoveTask(el) {
    //console.log('touchmove task')
    const task = el.closest('.task');
    if(task) {
      if(el.classList.contains('task-edit-input')
        || task.classList.contains('expanded')) return;
    }
    if(this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

}

const Components = [
  HeaderUI,
  BoardsList,
  RenameUI,
  DeleteUI,
  BoardUI,
  ColumnHeaderUI,
  DragDrop,
];

const Events = {

  namespaces: {
    'HeaderUI': HeaderUI,
    'RenameUI': RenameUI,
    'BoardsList': BoardsList,
    'DeleteUI': DeleteUI,
    'BoardUI': BoardUI,
    'DeleteUI': DeleteUI,
    'DragDrop': DragDrop,
    'ColumnHeaderUI': 'ColumnHeaderUI',
    // 'Utils': Utils
  },

  map: {
    'click': {
      '##': [
        'HeaderUI.hideMenu',
      ],
      [HeaderUI.selectors.toggleMenuButton]: 'HeaderUI.toggleMenu',
      [HeaderUI.selectors.changeHeaderModeTriggers]: 'HeaderUI.changeMode',
      [HeaderUI.selectors.reset]: 'HeaderUI.reset',
      [RenameUI.selectors.confirmRenameButton]: 'RenameUI.renameBoard',
      [DeleteUI.selectors.deleteBoardConfirmButton]: 'DeleteUI.deleteBoard',
      [BoardsList.selectors.boardsButtons]: 'BoardsList.switchBoard',
      [BoardsList.selectors.createButton]: 'BoardsList.createBoard',
    },
    'input': {
      [RenameUI.selectors.renameInput]: 'RenameUI.updateButtonState'
    },
    'contextmenu': {
      '##': ['DragDrop.preventOnce', [true]],
    },
    'touchstart': {
      '##': [
        'DragDrop.boardsButtonTouchStart',
        //'DragDrop.taskTouchStart',
      ],
    },
    'touchend': {
      '##': ['DragDrop.touchEnd'],
    },
    'touchmove': {
      '##': ['DragDrop.touchMoveTask'],
    },
  },

  resolveMethod(methodPath) {
    const parts = methodPath.split('.');
    if(parts.length !== 2) return null;

    const [nsName, methodName] = parts;
    const ns = this.namespaces[nsName];

    if(!ns || typeof ns[methodName] !== 'function') {
      return null;
    }

    return {
      ctx: ns,
      fn: ns[methodName],
    };
  },

  handler(e, eventName) {
    const entry = this.map[eventName];
    if(!entry) return;

    const selectors = Object.keys(entry);
    const normals = selectors.filter(s => s !== '##');
    const globals = selectors.filter(s => s === '##');

    [...normals, ...globals].forEach(selector => {
      const callbackObj = entry[selector];

      let callbacks = [];

      // 1) строка
      if(typeof callbackObj === 'string') {
        callbacks = [[callbackObj, []]];
      }

      // 2) массив
      else if(Array.isArray(callbackObj)) {

        // случай [method, params]
        if(
          typeof callbackObj[0] === 'string' &&
          Array.isArray(callbackObj[1])
        ) {
          callbacks = [[callbackObj[0], callbackObj[1]]];
        }

        // случай ['m1', 'm2', ...]
        else {
          callbacks = callbackObj.map(method => [method, []]);
        }
      }

      callbacks.forEach(([methodPath, params]) => {

        const shouldRun =
          selector === '##' ||
          (e.target.matches && e.target.matches(selector));

        if(!shouldRun) return;

        const resolved = this.resolveMethod(methodPath);
        if(!resolved) return;

        resolved.fn.call(resolved.ctx, e.target, e, params);
      });
    });
  },

  init() {
    for(let eventName in this.map) {
      document.addEventListener(eventName, (e) => {
        this.handler(e, eventName);
      });
    }
  },

};

const AppInit = {
  init() {
    App.load();
    Events.init();
    Components.forEach(o => {
      Utils.cacheComponentDom(o);
      o.init && o.init();
    });
    HeaderUI.render();
    BoardUI.render();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppInit.init();
});