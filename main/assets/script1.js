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
    columnAdded: 'columnAdded',
    columnMoved: 'columnMoved',
    taskUiChanged: 'taskUiChanged',
    ranksUiChanged : 'ranksUiChanged',
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
    //handlers.forEach(h => h(payload));
    setTimeout(() => {
      handlers.forEach(h => h(payload));
    }, 0)
  },

  // emit(event, payload) {
  //   const handlers = this.listeners[event];
  //   if(!handlers) return;

  //   handlers.forEach(handler => {
  //     this.queue.add(() => handler(payload));
  //   });

  //   this.schedule();
  // },

  schedule() {
    if(this.scheduled) return;
    this.scheduled = true;

    const scheduleMicrotask =
      typeof queueMicrotask === 'function'
        ? queueMicrotask
        : (cb) => Promise.resolve().then(cb);

    scheduleMicrotask(() => this.flush());
  },

  flush() {
    this.queue.forEach(fn => fn());
    this.queue.clear();
    this.scheduled = false;
  },

  scheduleMicrotask:
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (cb) => Promise.resolve().then(cb),

  createBatched(fn) {
    let scheduled = false;
    const schedule = this.scheduleMicrotask;

    return function batched(...args) {
      if(scheduled) return;

      scheduled = true;

      schedule(() => {
        scheduled = false;
        fn.apply(this, args);
      });
    };
  },

  batchedMethod(obj, methodName) {
    obj[methodName] = this.createBatched(obj[methodName].bind(obj));
  },
};

const State = {

  screen: 'board', //books
  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard
  menuOpen: false,
  boardUi: {
    columnUi: {}, //default, menu, rename, move, delete
    taskUi: {},
  },
  ranksUi : null,

  afterRender : [],

  setState(patch) {
    Object.assign(this, patch);
  },

};

const BoardDomain = {

  getCurrentBoard() {
    return App.data.boards.find(b => b.id == App.data.currentBoardId);
  },

  getColumn(id) {
    return this.getCurrentBoard().columns.find(c => c.id == id);
  },

  getTask(id) {
    return this.getCurrentBoard().columns
      .map(col => col.tasks.find(t => t.id === id))
      .find(task => task !== undefined) || null;
  },

  getColumnByTaskId(id, board) {
    if (!board) {
      board = this.getCurrentBoard();
    }
    return board.columns.find(col =>
      col.tasks && col.tasks.some(c => c.id === id)
    );
  },

  getBoardsCounters() {
    const bc = App.data.boardsCounters;
    return bc != null ? bc : {};
  },  

  switchBoard(boardId) {
    if(App.data.boards.find(b => b.id == boardId)) {
      App.data.currentBoardId = boardId;
      Storage.save(App.data);
    }
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

  saveCounters(counters) {
    App.data.boardsCounters = counters;
    Storage.save(App.data);
  },

  resetBoardsCounters() {
    App.data.boardsCounters = {};
    Storage.save(App.data);
  },

  resetCounters() {
    const board = this.getCurrentBoard();
    board.rankCounters = {};
    board.rankCountersAbs = {};
    this.saveBoards(App.data.boards, App.data.currentBoardId);
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

  createColumn() {
    const newUid = Utils.generateUID();
    const newColumn = {
      id: newUid,
      name: 'Новая колонка',
      tasks: []
    };
    this.getCurrentBoard().columns.push(newColumn);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
    return newUid;
  },

  deleteColumn(id) {
    const board = this.getCurrentBoard();
    const currentIndex = board.columns.findIndex(c => c.id === id);
    board.columns = board.columns.filter((c, i) => i !== currentIndex);
    this.saveBoards(App.data.boards, board.id);
  },

  moveColumn(currentColumnId, doMoveRight) {
    const currentBoard = this.getCurrentBoard();
    if(currentBoard.columns.length == 1) return;
    const currentColumnIndex = currentBoard.columns.findIndex(col => col.id == currentColumnId);
    if((currentColumnIndex == (currentBoard.columns.length - 1) && doMoveRight)
      || (currentColumnIndex == 0 && !doMoveRight)) {
      return;
    }
    const currentColumn = currentBoard.columns[currentColumnIndex];
    if(!currentColumn) return;
    currentBoard.columns = currentBoard.columns.filter(col => col != currentColumn);
    const insertIndex = doMoveRight ? currentColumnIndex + 1 : currentColumnIndex - 1;
    currentBoard.columns.splice(insertIndex, 0, currentColumn);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  setColumnSkipMove(colId, value) {
    this.getColumn(colId)['skipMove'] = value;
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  renameColumn(id, name) {
    if(!name) return;
    this.getColumn(id).name = name;
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  deleteTask(id) {
    const board = this.getCurrentBoard();
    for (const col of board.columns) {
      const index = col.tasks.findIndex(task => task.id === id);
      if (index !== -1) {
        col.tasks.splice(index, 1);
        this.saveBoards(App.data.boards, App.data.currentBoardId);
        return;
      }
    }
  },

  updateTask(id, colId, {color, description}) {
    const board = this.getCurrentBoard();
    let theTask = null;
    let theCol = null;

    board.columns.forEach(col => {
      const task = col.tasks.find(task => task.id === id);
      if (task) {
        theTask = task;
        theCol = col;
      }
    });

    if (theTask) {
      
      theTask.color = color;
      theTask.description = description;

    } else {
      
      theTask = {
        id : id,
        color: color,
        description : description
      };

      theCol = board.columns.find(col => col.id === colId);
      theCol.tasks = theCol.tasks ? [theTask, ...theCol.tasks] : [theTask];

    }

    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  moveTask(targetColumnId, taskId, insertIndex) {
    const board = this.getCurrentBoard();
    const targetColumn = board.columns.find(col => col.id === targetColumnId);
    //const targetColumnIndex = board.columns.findIndex(col => col.id === targetColumnId);
    if(!targetColumn.tasks) targetColumn.tasks = [];
    const sourceColumn = this.getColumnByTaskId(taskId);
    const task = sourceColumn.tasks.find(c => c.id === taskId);
    let sourceColumnIndex = null;
    // Удалим карточку из старой колонки
    if(sourceColumn) {
      sourceColumnIndex = board.columns.findIndex(col => col.id == sourceColumn.id)
      sourceColumn.tasks = sourceColumn.tasks.filter(c => c.id !== taskId);
    }
    // Добавим карточку в новую колонку
    //console.log(insertIndex);
    if(insertIndex === -1) insertIndex = targetColumn.tasks.length;
    targetColumn.tasks.splice(insertIndex, 0, task);

    this.makeAMove({
      color: task.color,
      sourceColumn: sourceColumn,
      targetColumn: targetColumn
    });    

    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  cloneTask(currentTaskId) {
    const task = this.getTask(currentTaskId);
    const column = this.getColumnByTaskId(currentTaskId);
    const {id, color, description} = task;
    const newId = Utils.generateUID();
    const newTask = {
      id: newId,
      color: color,
      description: description
    };
    const currentTaskIndex = column.tasks.findIndex(task => task.id == currentTaskId);
    column.tasks.splice(currentTaskIndex + 1, 0, newTask);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
    return newId;
  },

  getColorsInUse() {
    const colors = new Set();

    this.getCurrentBoard().columns?.forEach(column => {
      column.tasks?.forEach(task => {
        if(task.color) {
          colors.add(task.color);
        }
      });
    });

    return [...colors]
  },
  
  setRanksData({ranks, ranksRaw}) {
    const board = this.getCurrentBoard();
    board.ranksRaw = ranksRaw;
    board.ranks = ranks;

    /* normalizing */
    const counters = board.rankCounters || {};
    const absCounters = board.rankCountersAbs || {};
    Object.keys(ranks).forEach(level => {
      if (!counters[level]) counters[level] = 0;
      if (!absCounters[level]) absCounters[level] = 0;
    });
    board.rankCounters = counters;
    board.rankCountersAbs = absCounters;

    console.log('ranks', board.ranks);
    console.log('ranksRaw', board.ranksRaw);

    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  deleteRanks() {
    const board = this.getCurrentBoard();
    delete board.ranks;
    delete board.ranksRaw;
    delete board.rankCounters;
    delete board.rankCountersAbs;

    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  makeAMove({color, sourceColumn, targetColumn}) {

    if(!sourceColumn || !targetColumn) return;
    if(sourceColumn.id === targetColumn.id) return;

    const board = this.getCurrentBoard();
    const ranks = board.ranks;
    if(!ranks || !color) return;

    const level = RanksUI.getLevelOfColor(color, ranks);
    if(!level) return;

    board.rankCounters = board.rankCounters || {};
    board.rankCountersAbs = board.rankCountersAbs || {};

    const toInt = (v) => v == null ? 0 : parseInt(v, 10);

    const sourceIndex = board.columns.findIndex(c => c.id === sourceColumn.id);
    const targetIndex = board.columns.findIndex(c => c.id === targetColumn.id);
    const isGoingForward = targetIndex > sourceIndex;
    const delta = isGoingForward ? 1 : -1;

    const sourceCol = board.columns[sourceIndex];
    const targetCol = board.columns[targetIndex];

    const skipMove =
      (isGoingForward && sourceCol.skipMove) ||
      (!isGoingForward && targetCol.skipMove);

    const ownCount = toInt(board.rankCounters[level]);
    const absCount = toInt(board.rankCountersAbs[level]);
    const upperCount = level > 1 ? toInt(board.rankCounters[level - 1]) : 0;

    // --- 1. Абсолютный счётчик — всегда меняется
    board.rankCountersAbs[level] = absCount + delta;

    // --- 2. Глобальный счётчик доски — всегда меняется
    const boardsCounters = this.getBoardsCounters();
    const boardTotal = toInt(boardsCounters[board.id]);
    boardsCounters[board.id] = boardTotal + delta;

    this.saveCounters(boardsCounters);

    // --- 3. Если skipMove — логику рангов не трогаем
    if(skipMove) {
      return;
    }

    // --- 4. Первый уровень — всегда меняет свой счётчик
    if(level === 1) {
      board.rankCounters[level] = ownCount + delta;
      return;
    }

    const quotaOwn = toInt(ranks[level].q);
    const isLastLevel = level === Object.keys(ranks).length;
    
    if (isLastLevel && ownCount >= quotaOwn) {
      
      // --- 5. В последнем уровне не накапливаем счет сверх квоты
      // (т.к. нет потомков и его никто не обнуляет)
      board.rankCounters[level] = quotaOwn;

    } else {

      // --- 6. Проверка “в долг”
      // Ход вперёд в долг = у верхнего уровня нет ресурса
      // Ход назад в долг = у верхнего уровня был компенсирующий долг
      const affectsOwn =
        isGoingForward
          ? upperCount > 0
          : true; // назад всегда восстанавливаем симметрично
  
      if(affectsOwn) {
        board.rankCounters[level] = ownCount + delta;
      }
    }

    // --- 7. Корректировка верхнего уровня
    const quotaUpper = toInt(ranks[level - 1].q);
    board.rankCounters[level - 1] = upperCount - (delta * quotaUpper);

  },

};

const BoardUI = {

  selectors: {
    columnsContainer: '#columns',
    main: 'main',
    addColumnButton: '#add-column',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.boardsChanged, this.render);
    Bus.on(Bus.events.columnAdded, (newUid) => {
      this.render();
      State.afterRender.push(() => {
        const col = document.querySelector(
          `.column[data-id="${newUid}"]`
        );

        if (!col) return;

        this.dom.main.scrollLeft = col.offsetLeft - 30;
      });
    });
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
        tasksHtml.push(TaskUI.getTaskHtml(task.id));
      });

      if(!tasksHtml.length) {
        tasksHtml = [`<button class="js-add-task add-task-button">Click to add first task</button>`];
      }
      const columnHtml = `
      <div class="column" data-id="${column.id}">
        <div class="column-header">
          <h3 class="column-title">${column.name}</h3>
          <span class="task-count">${column.tasks.length}</span>
          <button class="js-add-task add-task"></button>
          <button class="column-menu-toggle"></button>
        </div>
        <div class="column-menu hidden">
          <button class="rename-column" data-header-mode-trigger="rename">Rename column</button>
          <button class="move-column" data-header-mode-trigger="move">Move column</button>
          <button class="delete-column" data-header-mode-trigger="delete">Delete column</button>
          <label for="skipMove"><input type="checkbox"${column.skipMove ? 'checked' : ''} name="skipMove">Skip move</label>
        </div>
        <div class="rename-column-block hidden" data-header-mode="rename">
          Rename column<br>
          <input type="search" class="rename-column-input" ${column.name ? 'value="' + column.name + '" data-original-value="' + column.name + '"' : 'placeholder="New column name"'}>
          <button class="save-rename-column board-management-button" disabled>Save</button>
          <button class="js-back board-management-button">Cancel</button>
        </div>
        <div class="delete-column-block hidden" data-header-mode="delete">
          <div>Delete this column with all tasks?</div>
          <button class="save-delete-column board-management-button">Delete</button>
          <button class="js-back board-management-button">Cancel</button>
        </div>
        <div class="move-column-block hidden" data-header-mode="move">
          <div>Move column</div>
          <div class="col-move-block-container">
            <button data-move-direction="left" class="move-column-left board-management-button"></button>
            <button data-move-direction="right" class="move-column-right board-management-button"></button>
          </div>
        </div>
        <div class="column-body">
          ${tasksHtml.join('')}
        </div>
      </div>
    `;
      this.dom.columnsContainer.insertAdjacentHTML('beforeend', columnHtml);

    });

    while(State.afterRender.length) {
      const effect = State.afterRender.shift();
      effect();
    }    
  },

  createColumn() {
    const newUid = BoardDomain.createColumn();
    Bus.emit(Bus.events.columnAdded, newUid);
  },

};

const HeaderUI = {

  board: null,

  selectors: {
    title: '#board-title',
    boardsButton: '#boards-button',
    toggleMenuButton: '#menu-toggle',
    menu: '#menu',
    changeHeaderModeTriggers: 'header [data-header-mode-trigger]',
    reset: '.js-cancel-current',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
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
    //console.log('Header render');
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
    Bus.batchedMethod(this, 'render');
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
  },

};

const RenameUI = {

  selectors: {
    renameInput: '#rename-board-input',
    confirmRenameButton: '#confirm-rename',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
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

const Stats = {
  
  selectors: {},

  dom : {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'stats') return;
  },

};

const ColumnHeaderUI = {

  selectors: {
    columnMenuTrigger: '.column-menu-toggle',
    columnMenuBlock: '.column-menu',
    changeHeaderModeTriggers: '.column [data-header-mode-trigger]',
    renameColumnInput: '.column .rename-column-input',
    cancelModeUi: '.column .js-back',
    deleteColumn: '.column .save-delete-column',
    renameColumn: '.column .save-rename-column',
    moveColumnRightButton: '.column [data-move-direction="right"]',
    moveColumnLeftButton: '.column [data-move-direction="left"]',
    skipMoveCheckbox: '.column-menu input[name="skipMove"]',
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.boardsChanged, () => {
      State.boardUi.columnUi = {};
    });
    Bus.on(Bus.events.columnHeaderUIChanged, this.render.bind(this));
    Bus.on(Bus.events.columnMoved, (id) => {
      this.setColumnHeaderMode(id, 'move');
      const movedCol = document.querySelector(`[data-id="${id}"]`);
      movedCol.closest('main').scrollLeft = document.querySelector(`[data-id="${id}"]`).offsetLeft - 30;
    });
  },

  render() {
    const headers = document.querySelectorAll('.column-header');

    headers.forEach(header => {
      const columnEl = Utils.getColumnEl(header);
      const id = columnEl.dataset.id;
      const mode = State.boardUi.columnUi[id] || 'default';
      header.querySelector(this.selectors.columnMenuTrigger).classList.toggle('expanded', mode !== 'default');
      columnEl.querySelector(this.selectors.columnMenuBlock).classList.toggle('hidden', mode !== 'menu');
      columnEl.querySelectorAll('[data-header-mode]').forEach(el => {
        el.classList.toggle('hidden', mode !== el.dataset.headerMode);
        this.renderRenameUi(mode, columnEl);
      });
    });
  },

  renderRenameUi(mode, colEl) {
    const input = colEl.querySelector('.rename-column-input');
    if(mode === 'rename') {
      Utils.focusAndPlaceCursorAtEnd(input);
    } else {
      input.value = input.dataset.originalValue;
      this.updateButtonState(input);
    }
  },

  toggleColumnMenu(el) {
    let state = this.getColHeaderCurrentState(el);
    State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id] = state !== undefined && state !== 'default' ? 'default' : 'menu';
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  setColumnHeaderMode(id, mode) {
    State.boardUi.columnUi[id] = mode;
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  changeColumnHeaderMode(el) {
    State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id] = el.dataset.headerModeTrigger;
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  getColHeaderCurrentState(el) {
    return State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id];
  },

  updateButtonState(renameInput) {
    Utils.updateButtonState(
      renameInput,
      renameInput.closest('.rename-column-block').querySelector('.save-rename-column'),
    );
  },

  cancelModeUi(el) {
    State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id] = 'menu';
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  deleteColumn(el) {
    BoardDomain.deleteColumn(Utils.getColumnEl(el).dataset.id);
    Bus.emit(Bus.events.boardsChanged);
  },

  moveColumn(el, e, [doMoveRight]) {
    const column = Utils.getColumnEl(el);
    BoardDomain.moveColumn(column.dataset.id, doMoveRight);
    Bus.emit(Bus.events.boardsChanged);
    Bus.emit(Bus.events.columnMoved, column.dataset.id);
  },

  renameColumn(el, e) {
    const column = Utils.getColumnEl(el);
    const input = column.querySelector('.rename-column-input');
    BoardDomain.renameColumn(column.dataset.id, input.value.trim());
    Bus.emit(Bus.events.boardsChanged);
  },

  setSkipMove(el, e) {
    BoardDomain.setColumnSkipMove(Utils.getColumnEl(el).dataset.id, el.checked);
  },

};

const TaskUI = {

  selectors: {
    taskEditInput: '.task-edit-input',
    taskEditButton: '.task-edit-button',
    taskTitle: '.task .task-title',
    colorsListItem: '.colors-list li',
    addTask: '.js-add-task',
    cancelAddTaskButton: '.js-cancel-add-task',
    cancelEditTaskButton: '.js-cancel-edit-task',
    taskInfoToggle : '.task-info-toggle',
    taskExpandButton : '.task-expand-button ',
    taskDeleteButton : '.task-delete',
    cancelDeleteTaskButton : '.cancel-delete-task',
    confirmDeleteTaskButton : '.confirm-delete-task',
    taskEditSaveButton : '.task-edit-save',
    cloneTask : '.task-clone',
    colorPickerButton : '.task-change-color',
    cancelSetColorButton : '.cancel-set-color',
  },

  init() {
    Bus.on(Bus.events.taskUiChanged, (id) => {
      this.render(id);
    });

    Bus.on(Bus.events.boardsChanged, () => {
      State.boardUi.taskUi = {};
    });
  },

  getId(el) {
    return el.closest('.task').dataset.id;
  },

  getMode(el) {
    const obj = State.boardUi.taskUi[this.getId(el)];
    return obj.mode || null;
  },

  getInput(el) {
    return el.closest('.task').querySelector(this.selectors.taskEditInput);
  },

  setTaskUi(id, updater) {
    const prev = State.boardUi.taskUi[id] || {};
    const next = updater(prev);

    if (next === null) {
      delete State.boardUi.taskUi[id];
    } else {
      State.boardUi.taskUi[id] = next;
    }

    Bus.emit(Bus.events.taskUiChanged, id);
  },  

  toggleTaskInfo(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode : prev.mode === 'menuOpened' || prev.mode === 'edit' ? 'default' : 'menuOpened',
      description : this.getInput(el).dataset.originalValue
    }));
  },

  showAddTaskForm(el) {
    const id = Utils.generateUID();
    this.setTaskUi(id, () => ({
      mode : 'create',
      columnId: Utils.getColumnEl(el).dataset.id,
      description: '',
      color: 'white',
    }));
  },

  hideAddTaskUi(el) {
    this.setTaskUi(this.getId(el), () => null);
  },

  hideEditTaskUi(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode : 'menuOpened',
      description : el.dataset.originalValue
    }));
  },

  toggleEdit(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: prev.mode === 'edit' ? 'menuOpened' : 'edit',
      description : this.getInput(el).dataset.originalValue
    }));
  },
  
  showEditUi(el) {
    if (this.getMode(el) !== 'menuOpened') return;
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'edit'
    }));
  },

  showDeleteUi(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'deleteConfirm'
    }));
  },

  showColorPicker(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'colors'
    }));
  },

  cancelDelete(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'menuOpened'
    }));
  },

  cancelSetColor(el) {
      this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'menuOpened',
      color: el.closest('.task').querySelector('[data-original-color]').dataset.originalColor
    }));
  },

  deleteTask(el) {
    BoardDomain.deleteTask(this.getId(el));
    Bus.emit(Bus.events.boardsChanged);
  },

  saveTask(el) {
    const taskEl = el.closest('.task');
    const columnEl = el.closest('.column');
    BoardDomain.updateTask(this.getId(el), columnEl.dataset.id, {
      color: taskEl.dataset.color,
      description : this.getInput(el).value
    });
    Bus.emit(Bus.events.boardsChanged);
  },

  cloneTask(el) {
    const newId = BoardDomain.cloneTask(this.getId(el));
    State.afterRender.push(() => {
      const currentColumnEl = document.querySelector(`[data-id="${el.closest('.column').dataset.id}"]`);
      document.querySelector('main').scrollLeft = currentColumnEl.offsetLeft - 30;
      const newTaskEl = currentColumnEl.querySelector(`.task[data-id="${newId}"]`);
      newTaskEl.querySelector('.task-info-toggle').click();
      newTaskEl.querySelector('.task-edit-button').click();
    });
    Bus.emit(Bus.events.boardsChanged);
  },

  render(id) {
    let el = document.querySelector(`[data-id="${id}"]`);
    const uiTask = State.boardUi.taskUi[id];
    if (el && !uiTask) {
      el.remove();
    } else {
      const html = this.getTaskHtml(id);
      if (el) {
        el.outerHTML = html;
      } else {
        document.querySelector(`.column[data-id="${uiTask.columnId}"] .column-body`).insertAdjacentHTML('afterbegin', html);
      }
      el = document.querySelector(`[data-id="${id}"]`);
      const input = el.querySelector(`.task-edit-input`);
      if (uiTask.mode === 'create' || uiTask.mode === 'edit') {
        Utils.expandInput(input);
        Utils.focusAndPlaceCursorAtEnd(input);
        this.updateButtonState(input);
      }
    }
  },    

  getTaskHtml(id) {
    const domainTask = BoardDomain.getTask(id);
    const uiTask = State.boardUi.taskUi[id];
    const column = BoardDomain.getColumnByTaskId(id);
    
    const isCreate = !domainTask && uiTask && uiTask.mode === 'create';
    const isEdit = domainTask && uiTask && uiTask.mode === 'edit';
    const isMenuOpened = domainTask && uiTask && uiTask.mode === 'menuOpened';
    const isDeleteConfirm = domainTask && uiTask && uiTask.mode === 'deleteConfirm';
    const isColorPicker = domainTask && uiTask && uiTask.mode === 'colors';
    const isDefault = !isCreate && !isEdit && !isMenuOpened && !isDeleteConfirm && !isColorPicker;
    
    const origColor = domainTask ? domainTask.color : null;
    const descr = uiTask && uiTask.description ? uiTask.description : (domainTask ? domainTask.description : '');
    const origDescr = domainTask ? domainTask.description : '';
    const color = uiTask && uiTask.color ? uiTask.color : (domainTask ? domainTask.color : 'white');
    
    return `
    <div class="task" style="background:${Colors[color]};" data-color="${color}" data-id="${id}">
      ${isDefault ? `<div class="ranks-info">${this.getTaskRanksInfo(domainTask, column, BoardDomain.getCurrentBoard())}</div>` : ''}
      <div class="task-expand-button ${!isDefault ? 'hidden' : ''}"></div>
      <button class="task-info-toggle ${isEdit || isMenuOpened ? 'expanded' : ''}"></button>
      <div class="task-header ${!isDefault && !isMenuOpened ? 'hidden' : ''}">
        <span class="task-title">${descr}</span>
      </div>
      <div class="task-info ${!isMenuOpened ? 'hidden' : ''}">
        <button class="task-change-color"></button>
        <button class="task-delete"></button>
        <button class="task-clone"></button>
        <button class="task-edit-button"></button>
      </div>
      <div class="task-edit ${isCreate || isEdit ? '' : 'hidden'}">
        <textarea rows="1" ${origDescr ? ' data-original-value="' + origDescr + '"' : ' placeholder="Description"'} class="task-edit-input">${descr}</textarea>
        ${isCreate ? `<div style="padding-left:10px;"><br>${this.getTaskColorPicker(color)}</div>` : ''}
        <button class="task-edit-save board-management-button" disabled>Save</button>
        <button class="${isCreate ? 'js-cancel-add-task' : 'js-cancel-edit-task'} task-edit-cancel board-management-button">Cancel</button>
      </div>
      <div class="task-delete-block ${isDeleteConfirm ? '' : 'hidden'}">
        Delete this task?<br><br>
        <button class="confirm-delete-task  board-management-button">Delete</button>
        <button class="cancel-delete-task  board-management-button">Cancel</button>
      </div>
      <div data-original-color="${origColor}" class="set-task-colors ${isColorPicker ? '' : 'hidden'}">
        Choose task color<br><br>
        ${this.getTaskColorPicker(color)}
        <button class="task-edit-save board-management-button" ${color == origColor ? 'disabled' : '' }>Save</button>
        <button class="cancel-set-color board-management-button" >Cancel</button>
      </div>
    </div>
    `
  },

  getTaskRanksInfo(task, column, board) {
    return `
      ${RanksUI.getLevelMarkHtml(task.color)}
      ${RanksUI.getOwnCount(board, task.color)}
      ${RanksUI.getPassMarkHtml(task, column)}
      ${RanksUI.getUpperLevelMarkHtml(task.color)}
    `;
  },

  updateButtonState(el) {
    Utils.updateButtonState(
      el,
      el.closest('.task-edit').querySelector(this.selectors.taskEditSaveButton)
    );
  },

  taskDescrInputHandler(el) {
    Utils.updateButtonState(
      el,
      el.closest('.task-edit').querySelector('.task-edit-save')
    );
    Utils.expandInput(el);
  },

  previewColor(el) {
    const id = el.closest('.task').dataset.id;
    State.boardUi.taskUi[id].color = el.dataset.color;
    Bus.emit(Bus.events.taskUiChanged, id);
  },

  getTaskColorPicker(currentColor) {
    if (!currentColor) {
      currentColor = Colors.white;
    }
    const colors = Object.keys(Colors).map(key => {
      const color = Colors[key];
      return `
        <li data-color="${key}" style="background:${color}" ${currentColor == key ? ' class="current"' : ''}></li>  
      `
    });
    return `
      <ul class="colors-list">
        ${colors.join('')}
      </ul>`
  },

};

const RanksUI = {

  modes : {
    default : 'default',
    create : 'create',
    edit : 'edit',
    delete : 'delete',
    reset : 'reset',
  },

  selectors : {
    ranksBlock: '#ranks-block',
    createButton: '#create-ranks',
    createCancelButton: '#create-ranks-cancel',
    editButton: '#ranks-edit',
    editCancelButton: '#ranks-edit-cancel',
    previewButton: '#ranks-preview',
    saveButton: '#ranks-save-confirm',
    deleteButton: '#ranks-delete',
    deleteMessage: '#ranks-delete-confirm-message',
    deleteConfirmButton: '#ranks-delete-confirm',
    deleteCancelButton: '#ranks-delete-cancel',
    cancelButton: '#ranks-cancel',
    errorsBlock: '#ranks-input-errors',
    textarea: '#ranks-input',
    currentColorsBlock: '#current-colors',
    currentRanksBlock: '#current-ranks',
    absCountersBlock: '#abs-counters',
    previewBlock: '#preview-ranks',
    colorsInUseToggle: '#current-colors .ranks-title',
    countersToggle: '#ranks-panels-container .ranks-title',

    resetCountersButton: '#ranks-counters-reset',
    resetCountersMessage: '#ranks-counters-reset-message',
    resetCountersConfirmButton: '#ranks-counters-reset-confirm',
    resetCountersCancelButton: '#ranks-counters-reset-cancel',

    renderCountersButton: '#ranks-toggle-counters',
    infoContainer: '#ranks-panels-container',
  },

  dom : {},
  
  createDefaultState() {
    return {
      mode : 'default',
      errors : [],
      draft : null,
      draftRaw : null,
      colorsInUseShown: false,
      countersShown: false,
    }
  }, 

  init() {
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.ranksUiChanged, this.render.bind(this));
  },

  render() {
    console.log('Ranks ui render...');
    if(State.headerUiMode !== 'ranks') return;
    const board = BoardDomain.getCurrentBoard();
    if(!board) return;
    const ranks = board.ranks;
    const raw = board.ranksRaw || '';
    if (State.ranksUi === null) {
      State.ranksUi = this.createDefaultState();
    }
    const mode = State.ranksUi.mode;
    const draft = State.ranksUi.draft;
    const draftRaw = State.ranksUi.draftRaw;
    const errors = State.ranksUi.errors;

    const saveButtonVisible = [this.modes.create, this.modes.edit].includes(mode) 
      && !errors.length && (draft && JSON.stringify(draft.ranks) !== JSON.stringify(ranks));

    document.querySelector(this.selectors.ranksBlock).innerHTML = `
      <h3 class="top-menu-title">Manage the board ranks</h3>
      <div id="current-colors" ${mode !== this.modes.delete ? '' : 'class="hidden"'}>${this.getColorsInUseHtml()}</div>
      <div id="ranks-panels-container" ${ranks && ![this.modes.delete].includes(mode)  ? '' : 'class="hidden"'}>
        ${this.getCountersHtml(board)}
      </div>
      <textarea id="ranks-input" ${[this.modes.create, this.modes.edit].includes(mode) ? '' : ' class="hidden"'} placeholder="2 blue 
2 white 
1 purple 
1 pink,yellow">${draftRaw ? draftRaw : raw ? raw : ''}</textarea>
      <div id="ranks-input-errors" ${errors.length ? '' : 'class="hidden"'}>${errors.join('<br>')}</div>
      <div id="preview-ranks" ${draft ? '' : 'class="hidden"'}>
        ${draft ? this.getRanksHtml(
          board,
          draft.ranks,
          'Preview',
          null,
          null,
          true
        ) : ''}
      </div>
      <div id="ranks-delete-confirm-message" class="ranks-message ${mode == this.modes.delete ? '' : 'hidden'}">Really delete ranks for this board?</div>
      <div id="ranks-counters-reset-message" class="ranks-message ${mode == this.modes.reset ? '' : 'hidden'}">Really reset  all counters for this board?</div>
      <div id="ranks-buttons-container">
        <button class="js-cancel-current button-close"></button>

        <button id="ranks-counters-reset" class="board-management-button ${ranks && mode === this.modes.default ? '' : 'hidden'}">Reset</button>
        <button id="ranks-counters-reset-confirm" class="board-management-button ${mode === this.modes.reset ? '' : 'hidden'}">Yes</button>
        <button id="ranks-counters-reset-cancel" class="board-management-button ${mode === this.modes.reset ? '' : 'hidden'}">Cancel</button>
        
        <button id="create-ranks" class="board-management-button ${!ranks && mode !== this.modes.create ? '' : 'hidden'}">Create</button>
        <button id="ranks-edit" class="board-management-button ${ranks && mode == this.modes.default ? '' : 'hidden'}">Edit</button>
        <button id="ranks-preview" class="board-management-button hidden">👀</button>
        <button id="create-ranks-cancel" class="board-management-button ${!ranks && mode == this.modes.create ? '' : 'hidden'}">Cancel</button>
        <button id="ranks-save-confirm" class="board-management-button ${saveButtonVisible ? '' : 'hidden'}">Save</button>
        <button id="ranks-edit-cancel" class="board-management-button ${mode == this.modes.edit ? '' : 'hidden'}">Cancel</button>
        <button id="ranks-delete" class="board-management-button ${ranks && mode == this.modes.default ? '' : 'hidden'}">Delete</button>
        <button id="ranks-delete-confirm" class="board-management-button ${mode == this.modes.delete ? '' : 'hidden'}">Delete</button>
        <button id="ranks-delete-cancel" class="board-management-button  ${mode == this.modes.delete ? '' : 'hidden'}">Cancel</button>
        <button id="ranks-cancel" class="js-cancel-current board-management-button ${mode == this.modes.default ? '' : 'hidden'}">Cancel</button>
      </div>    
    `;

    this.dom.previewButton = document.querySelector(this.selectors.previewButton);
    this.dom.textarea = document.querySelector(this.selectors.textarea);
    this.dom.previewBlock = document.querySelector(this.selectors.previewBlock);
    this.dom.saveButton = document.querySelector(this.selectors.saveButton);

  },

  getCountersHtml(board) {
    const counters = board.ranks ? this.getRanksHtml(
      board,
      board.ranks,
      undefined,
      true,
      null,
      State.ranksUi.countersShown
    ) : '';
    const absCounters = board.ranks ? this.getRanksHtml(
        board,
        board.ranks,
        'Abs counters',
        null,
        true,
        State.ranksUi.countersShown
      ) : '';
    return counters || absCounters ? `<div id="current-ranks">${counters}</div>
        <div id="abs-counters">${absCounters}</div>` : '';
  },

  parseRanks(raw) {
    State.ranksUi.errors = [];

    const lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const result = {};
    const ranks = {};

    const usedColors = new Set();
    const validColors = new Set(Object.keys(Colors));

    lines.forEach((line, index) => {
      const level = index + 1;

      const firstSpace = line.indexOf(' ');
      if(firstSpace === -1) {
        State.ranksUi.errors.push(`Строка ${level}: отсутствует пробел после квоты`);
      }

      const quota = parseInt(line.slice(0, firstSpace), 10);
      if(isNaN(quota) || quota <= 0) {
        State.ranksUi.errors.push(`Строка ${level}: некорректная квота`);
      }

      const colorsPart = line.slice(firstSpace + 1);

      const colors = colorsPart
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if(colors.length === 0) {
        State.ranksUi.errors.push(`Строка ${level}: не указаны цвета`);
      }

      colors.forEach(color => {
        if(!validColors.has(color)) {
          State.ranksUi.errors.push(`Строка ${level}: цвет "${color}" не существует`);
        }

        if(usedColors.has(color)) {
          State.ranksUi.errors.push(`Строка ${level}: цвет "${color}" используется повторно`);
        }

        usedColors.add(color);
      });

      ranks[level] = {
        q: quota,
        c: colors
      };
    });

    console.log('usedColors', usedColors);
    console.log('colorsOnBoard', BoardDomain.getColorsInUse());

    /* 
      цвета, которые есть на доске, но не указаны в поле,
      автоматом приписываются как последний добавочный уровень
    */
    const notMentionedColors = BoardDomain.getColorsInUse().filter(c => ![...usedColors].includes(c));
    console.log('notMentionedColors', notMentionedColors);

    if(notMentionedColors && notMentionedColors.length) {
      const lowestLevel = Math.max(0, ...Object.keys(ranks));
      ranks[lowestLevel].c = [...ranks[lowestLevel].c, ...notMentionedColors];
      raw += `,${notMentionedColors.join(',')}`;
    }

    if(!State.ranksUi.errors.length) {
      result.ranks = ranks;
      result.ranksRaw = raw;
      return result;
    } else {
      delete State.ranksUi.draft;
    }
    return null;
  },  

  getRanksHtml(
    board,
    ranks,
    title = 'Current ranks',
    showCounters = false,
    showAbsCounters = false,
    showList = false,
  ) {
    
    if (!ranks) return '';

    const levels = Object.keys(ranks)
      .map(Number)
      .sort((a, b) => a - b);

    if(levels.length === 0) return '';

    function build(levelIndex) {
      const level = levels[levelIndex];
      const {q, c} = ranks[level];

      // генерируем список цветов текущего уровня
      const colorsHtml = c.map(color => {
        const bg = Colors[color] || '#ffffff';
        return `<span data-color="${color}" style="background:${bg}">${q}</span>`;
      }).join('');

      let counter = '';
      if(showCounters == true && board.rankCounters && board.rankCounters[level] != null) {
        counter = '&nbsp;&nbsp;' + board.rankCounters[level];
      } else if(showAbsCounters == true && board.rankCountersAbs && board.rankCountersAbs[level] != null) {
        counter = '&nbsp;&nbsp;' + board.rankCountersAbs[level];
      }

      // если последний уровень — без вложенного ul
      if(levelIndex === levels.length - 1) {
        return `
          <li data-level="${level}">
            ${colorsHtml}${counter}
          </li>`;
      }

      // иначе добавляем вложенный уровень
      return `
        <li data-level="${level}">
          ${colorsHtml}${counter}
          <ul>
            ${build(levelIndex + 1)}
          </ul>
        </li>`;
    }

    return `<span class="ranks-title">${title}</span>
    <ul class="colors-list ranks-list ${showList == true ? '' : 'hidden'}">
    ${build(0)}
      </ul>`;
  },  

  getColorsInUseHtml() {
    return `
    <span class="ranks-title">Colors in use</span>
    <div class="colors-list colors-in-use ${State.ranksUi.colorsInUseShown ? '' : 'hidden'}">${BoardDomain.getColorsInUse().map(c => `
      <div><span data-color="${c}" style="background:${Colors[c]}"></span><span class="label">${c}</span></div>
      `).join('')}
    </div>
    `;
  },

  getLevelOfColor(color, ranks) {
    if(ranks == undefined) {
      ranks = BoardDomain.getCurrentBoard().ranks;
    }
    if(!ranks) return null;
    let level = Object.keys(ranks).find(k => ranks[k].c.includes(color));
    if(!level) {
      level = Math.max(...Object.keys(ranks).map(o => parseInt(o))) + 1
    } else {
      level = parseInt(level);
    }
    return level;
  },

  getLevelMarkHtml(color) {
    const ranks = BoardDomain.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = this.getLevelOfColor(color, ranks);
    return level ? `<div class="cardLevel">L${level}</div>` : '';
  },

  getPassMarkHtml(card, column) {

    const board = BoardDomain.getCurrentBoard();
    const ranks = board.ranks;
    if(!ranks) return '';

    const currentColIndex = board.columns.findIndex(col => col.id === column.id);

    //Если последняя колонка, то ничего не отображаем
    if(currentColIndex == (board.columns.length - 1)) {
      return '';
    }

    const level = this.getLevelOfColor(card.color, ranks);
    if(level == 1) return `<div class="cardPass positive">Go!</div>`; //первый уровень ходит безлимитно

    const quotaOfUpperLevel = parseInt(ranks[level - 1].q);

    let res = null;

    let upperLevelCount = board.rankCounters ? board.rankCounters[level - 1] ? board.rankCounters[level - 1] : null : null;

    // console.log('upperLevelCount', upperLevelCount);
    // console.log('quotaOfUpperLevel', quotaOfUpperLevel);

    if(upperLevelCount == null) {
      res = -quotaOfUpperLevel;
    } else {
      res = upperLevelCount - quotaOfUpperLevel;
    }
    // console.log(`card L${level} "${card.description}" (color: ${card.color})`, res);

    const text = (res >= 0 ? 'Go! ' : '')
      + (
        res !== 0 ?
          (res >= 0 ? '+' : '') + res
          : ''
      );

    return res != null ?
      `<div class="cardPass${res >= 0 ? ' positive' : ''}">${text}</div>`
      : '';
  },

  getUpperLevelMarkHtml(color) {
    const ranks = BoardDomain.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = this.getLevelOfColor(color, ranks);
    if(level) {
      const upperLevel = ranks[level - 1];
      return upperLevel ? upperLevel.c.map(c => `<div class="rank-level-mark" style="background:${Colors[c]}"></div>`).join('') : '';
    } else {
      return '';
    }
  },

  getOwnCount(board, color) {
    let res = '';
    if(board && board.rankCounters) {
      const count = board.rankCounters[this.getLevelOfColor(color)];
      res = count != null ? `<span class="own-rank-count-mark">${count}</span>` : '';
    }
    return res;
  },

  /* handlers */

  preview() {
    const newValue = this.dom.ranksBlock.querySelector(this.selectors.textarea).value;
    const parsedRanks = this.parseRanks(newValue);
    if (!State.ranksUi.errors.length && parsedRanks) {
      State.ranksUi.draft = parsedRanks;
      State.ranksUi.draftRaw = parsedRanks.ranksRaw;
    } else {
      State.ranksUi.draftRaw = newValue;
    }
    Bus.emit(Bus.events.ranksUiChanged);
  },

  showCreateUi(el) {
    State.ranksUi.mode = 'create';
    Bus.emit(Bus.events.ranksUiChanged);
  },

  showDeleteUi() {
    State.ranksUi.mode = 'delete';
    Bus.emit(Bus.events.ranksUiChanged);
  },

  toggleColorsInUse() {
    State.ranksUi.colorsInUseShown = !State.ranksUi.colorsInUseShown;
    Bus.emit(Bus.events.ranksUiChanged);
  },

  toggleCounters() {
    State.ranksUi.countersShown = !State.ranksUi.countersShown;
    Bus.emit(Bus.events.ranksUiChanged);
  },

  showResetUi() {
    State.ranksUi.mode = 'reset';
    Bus.emit(Bus.events.ranksUiChanged);
  },

  resetCounters() {
    BoardDomain.resetCounters();
    State.ranksUi.mode = this.modes.default;
    Bus.emit(Bus.events.boardsChanged);
  },

  resetUi() {
    State.ranksUi = this.createDefaultState();
    Bus.emit(Bus.events.ranksUiChanged);
  },

  save() {
    BoardDomain.setRanksData(State.ranksUi.draft);
    State.ranksUi = this.createDefaultState();
    Bus.emit(Bus.events.boardsChanged);
  },

  delete() {
    BoardDomain.deleteRanks();
    State.ranksUi = this.createDefaultState();
    Bus.emit(Bus.events.boardsChanged);
  },

  edit() {
    State.ranksUi.mode = 'edit';
    Bus.emit(Bus.events.ranksUiChanged);
  },

  updateButtonState() {
    const to = State.ranksUi.draftRaw || '';
    const noPreview = this.dom.textarea.value == to;
    this.dom.previewButton.classList.toggle(
      'hidden',
      noPreview
    );

    if (!noPreview) {
      this.dom.saveButton.classList.toggle('hidden', true);
    }
    this.dom.previewBlock.classList.toggle('hidden', noPreview);

    this.dom.previewBlock.innerHTML = '';
  },

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
    if(!component.dom) return;
    if(component.selectors) {
      Object.keys(component.selectors).forEach(selector => {
        const el = document.querySelector(component.selectors[selector]);
        if(el) {
          component.dom[selector] = el;
        }
      })
    }
  },

  getColumnEl(el) {
    return el.closest('.column');
  },
};

const DragDrop = {

  selectors: {
    main: 'main',
    columns: '#columns',
  },

  dom: {},

  longPressTimer: null,

  longPressTarget: null,

  dragState: null,

  colsScroll: {},

  // Определяем колонку, над которой сейчас находится курсор/палец
  getColumnAtPoint(cursorX) {
    const columnElements = Array.from(this.dom.columns.querySelectorAll('.column'));
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

  dropTask(el, event) {
    if(!this.dragState.draggingTask || !this.dragState.clone) return;
    const cursorX = event.clientX || (event.touches && event.changedTouches[0].clientX);
    let targetColumnEl = this.getColumnAtPoint(cursorX);
    const insertIndicator = document.querySelector('.insert-indicator');
    let insertIndex = insertIndicator ? Array.from(targetColumnEl.querySelectorAll('.task:not(.dragged):not(.dragging)')).findIndex(el =>
      el.previousElementSibling === insertIndicator) : -1;
    if(targetColumnEl) {
      BoardDomain.moveTask(
        targetColumnEl.dataset.id, 
        this.dragState.draggingTask.dataset.id,
        insertIndex
      );
      Bus.emit(Bus.events.boardsChanged);
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
  TaskUI,
  RanksUI,
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
    'ColumnHeaderUI': ColumnHeaderUI,
    'TaskUI': TaskUI,
    'RanksUI': RanksUI,
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
      [BoardUI.selectors.addColumnButton]: 'BoardUI.createColumn',
      [ColumnHeaderUI.selectors.columnMenuTrigger]: 'ColumnHeaderUI.toggleColumnMenu',
      [ColumnHeaderUI.selectors.changeHeaderModeTriggers]: 'ColumnHeaderUI.changeColumnHeaderMode',
      [ColumnHeaderUI.selectors.cancelModeUi]: 'ColumnHeaderUI.cancelModeUi',
      [ColumnHeaderUI.selectors.deleteColumn]: 'ColumnHeaderUI.deleteColumn',
      [ColumnHeaderUI.selectors.renameColumn]: 'ColumnHeaderUI.renameColumn',
      [ColumnHeaderUI.selectors.moveColumnRightButton]: ['ColumnHeaderUI.moveColumn', [true]],
      [ColumnHeaderUI.selectors.moveColumnLeftButton]: ['ColumnHeaderUI.moveColumn', [false]],

      [TaskUI.selectors.taskInfoToggle]: 'TaskUI.toggleTaskInfo',
      [TaskUI.selectors.taskExpandButton]: 'TaskUI.toggleTaskInfo',
      [TaskUI.selectors.addTask]: 'TaskUI.showAddTaskForm',
      [TaskUI.selectors.cancelAddTaskButton]: 'TaskUI.hideAddTaskUi',
      [TaskUI.selectors.cancelEditTaskButton]: 'TaskUI.hideEditTaskUi',
      [TaskUI.selectors.colorsListItem]: 'TaskUI.previewColor',
      [TaskUI.selectors.taskEditButton]: 'TaskUI.toggleEdit',
      [TaskUI.selectors.taskTitle]: 'TaskUI.showEditUi',
      [TaskUI.selectors.taskDeleteButton]: 'TaskUI.showDeleteUi',
      [TaskUI.selectors.colorPickerButton]: 'TaskUI.showColorPicker',
      [TaskUI.selectors.cancelSetColorButton]: 'TaskUI.cancelSetColor',
      [TaskUI.selectors.cancelDeleteTaskButton]: 'TaskUI.cancelDelete',
      [TaskUI.selectors.confirmDeleteTaskButton]: 'TaskUI.deleteTask',
      [TaskUI.selectors.taskEditSaveButton]: 'TaskUI.saveTask',
      [TaskUI.selectors.cloneTask]: 'TaskUI.cloneTask',

      [RanksUI.selectors.createButton]: 'RanksUI.showCreateUi',
      [RanksUI.selectors.colorsInUseToggle]: 'RanksUI.toggleColorsInUse',
      [RanksUI.selectors.countersToggle]: 'RanksUI.toggleCounters',
      [RanksUI.selectors.createCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.previewButton]: 'RanksUI.preview',
      [RanksUI.selectors.saveButton]: 'RanksUI.save',
      [RanksUI.selectors.deleteButton]: 'RanksUI.showDeleteUi',
      [RanksUI.selectors.deleteCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.deleteConfirmButton]: 'RanksUI.delete',
      [RanksUI.selectors.editButton]: 'RanksUI.edit',
      [RanksUI.selectors.editCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.resetCountersButton]: 'RanksUI.showResetUi',
      [RanksUI.selectors.resetCountersCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.resetCountersConfirmButton]: 'RanksUI.resetCounters',
    },
    'input': {
      [RenameUI.selectors.renameInput]: 'RenameUI.updateButtonState',
      [ColumnHeaderUI.selectors.renameColumnInput]: 'ColumnHeaderUI.updateButtonState',
      [ColumnHeaderUI.selectors.skipMoveCheckbox]: 'ColumnHeaderUI.setSkipMove',
      [TaskUI.selectors.taskEditInput]: 'TaskUI.taskDescrInputHandler',
      [RanksUI.selectors.textarea]: 'RanksUI.updateButtonState',
    },
    'contextmenu': {
      '##': ['DragDrop.preventOnce', [true]],
    },
    'touchstart': {
      '##': [
        'DragDrop.boardsButtonTouchStart',
        'DragDrop.taskTouchStart',
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