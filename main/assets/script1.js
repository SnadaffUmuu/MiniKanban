const tasksColors = {
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
      const defaultBoard = this.createDefaultBoard();
      this.saveBoards([defaultBoard], defaultBoard.id);
    }
  },

  save() {
    Storage.save(this.data);
  },

  createDefaultBoard() {
    if(!this.data.boards?.length) {
      const el = document.getElementById('no-boards');
      el && el.remove();
    }
    return {
      id: Utils.generateUID(),
      name: 'Kanban Board',
      columns: [
        {id: Utils.generateUID(), name: 'To Do', tasks: []},
        {id: Utils.generateUID(), name: 'In Progress', tasks: []},
        {id: Utils.generateUID(), name: 'Done', tasks: []}
      ]
    }
  },

  getBoard(id) {
    return this.data.boards.find(b => b.id == id);
  },

  getCurrentBoard() {
    return this.data.boards.find(b => b.id == this.data.currentBoardId);
  },

  getBoardsCounters() {
    const bc = this.data.boardsCounters;
    return bc != null ? bc : {};
  },

  switchBoard(boardId) {
    if(this.data.boards.find(b => b.id == boardId)) {
      this.data.currentBoardId = boardId;
      Storage.save(this.data);

      BoardUI.renderBoardsMenu();
      BoardUI.renderHeader();
      BoardUI.renderBoard();
    }
  },

  saveBoards(updatedBoards, currentBoardId) {
    this.data.boards = updatedBoards;
    if(currentBoardId === null) {
      delete this.data.currentBoardId
    } else {
      this.data.currentBoardId = currentBoardId ? currentBoardId : this.data.currentBoardId;
    }
    Storage.save(this.data);
  },

  saveCounters(counters) {
    this.data.boardsCounters = counters;
    Storage.save(this.data);
  },

  resetCounters() {
    delete this.data.boardsCounters;
    Storage.save(this.data);
    BoardUI.showStatsUI();
  },

};


const AppUI = {
  els: {
    main: document.querySelector('main'),
    menuToggle: document.getElementById('menu-toggle'),
    menu: document.getElementById('menu'),
    boardsButton: document.getElementById('boards-buttons'),
    columns: document.getElementById('columns'),
  },

  openMenu() {
    this.els.menu.classList.remove('hidden');
  },

  closeMenu() {
    this.els.menu.classList.add('hidden');
  },

  toggleMenuByClick(el, e, params) {
    e.stopPropagation();
    this.els.menu.classList.toggle('hidden');
  },

  hideMenu(el, e) {
    if(
      !this.els.menu.contains(el) &&
      !this.els.menuToggle.contains(el) &&
      !this.els.menu.classList.contains('hidden')
    ) {
      this.closeMenu();
    }
  }

};


const BoardUI = {
  els: {
    createButton: document.getElementById('create-board'),
    title: document.getElementById('board-title'),
    renameButton: document.getElementById('rename-board'),
    deleteButton: document.getElementById('delete-board'),
    ranksButton: document.getElementById('manage-ranks'),
    renameBlock: document.getElementById('rename-board-block'),
    deleteBlock: document.getElementById('delete-board-block'),
    boardsListBlock: document.getElementById('boards-list'),
    renameInput: document.getElementById('rename-board-input'),
    renameConfirmButton: document.getElementById('confirm-rename'),
    closeListButton: document.getElementById('close-boards-list'),
    boardsListButtonsContainer: document.getElementById('boards-buttons'),
    statsButton: document.getElementById('show-stats'),
    resetStatsButton: document.getElementById('reset-stats'),
    resetStatsMessage: document.getElementById('reset-message'),
    resetStats: document.getElementById('reset-stats-confirm'),
    cancelResetStatsButton: document.getElementById('reset-stats-cancel'),
    statsContentBlock: document.getElementById('stats'),
    statsBlock: document.getElementById('statsUI'),
  },

  toggleList() {
    const isOpening = this.els.boardsListBlock.classList.contains('hidden');

    this.els.boardsListBlock.classList.toggle('hidden');
    this.els.title.classList.toggle('hidden');
    AppUI.els.menuToggle.classList.toggle('hidden');

    if(isOpening) {
      AppUI.closeMenu();
    }
  },

  closeList() {
    this.els.boardsListBlock.classList.toggle('hidden');
    this.els.title.classList.toggle('hidden');
    AppUI.els.menuToggle.classList.toggle('hidden');
  },

  renderHeader() {
    const currentBoard = App.getCurrentBoard();
    if(currentBoard) {
      this.els.title.textContent = currentBoard.name;
      Utils.show([
        this.els.renameButton,
        this.els.ranksButton,
        this.els.deleteButton,
        this.els.statsButton
      ]);
    } else {
      this.els.title.innerHTML = '';
      Utils.hide([
        this.els.renameButton,
        this.els.ranksButton,
        this.els.deleteButton,
        this.els.statsButton
      ]);
    }
  },

  showRenameBoardUI() {
    this.els.renameBlock.classList.remove('hidden');
    this.els.deleteBlock.classList.add('hidden');
    RanksUI.els.ranksBlock.classList.add('hidden');
    this.els.statsBlock.classList.add('hidden');
    this.els.title.classList.add('hidden');
    this.els.renameInput.value = App.getCurrentBoard().name;
    Utils.focusAndPlaceCursorAtEnd(this.els.renameInput);
    AppUI.els.menuToggle.classList.add('hidden');
    AppUI.closeMenu();
  },

  renameInputCallback() {
    Utils.updateButtonState(
      this.els.renameInput,
      this.els.renameConfirmButton,
    );
  },

  create() {
    if(!App.data.boards?.length) {
      const el = document.getElementById('no-boards');
      el && el.remove();
    }
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
    App.saveBoards(App.data.boards, newId)
    BoardUI.renderBoardsMenu();
    BoardUI.renderHeader();
    BoardUI.renderBoard();
  },

  rename() {
    const newName = this.els.renameInput.value.trim();
    if(newName) {
      const board = App.getCurrentBoard();
      board.name = newName;
      App.saveBoards(App.data.boards);
      this.renderBoardsMenu();
      this.renderHeader();
      this.hideBoardManagementUI();
    }
  },

  delete() {
    const currentIndex = App.data.boards.findIndex(b => b.id === App.data.currentBoardId);
    const newBoards = App.data.boards.filter(b => b.id !== App.data.currentBoardId);

    if(newBoards.length > 0) {
      // Выбираем следующую (или предыдущую, если удалили последнюю)
      const nextIndex = Math.min(currentIndex, newBoards.length - 1);
      const newCurrentBoardId = newBoards[nextIndex].id;
      App.saveBoards(newBoards, newCurrentBoardId);
      this.renderHeader();
      this.renderBoardsMenu();
      this.renderBoard();
      AppUI.closeMenu();
      this.hideBoardManagementUI();
    } else {
      App.saveBoards([], null);
      this.hideBoardManagementUI();
      this.renderHeader();
      this.renderBoardsMenu();
      this.renderBoard();
    }
  },

  showDeleteBoardUI() {
    this.els.deleteBlock.classList.remove('hidden');
    this.els.renameBlock.classList.add('hidden');
    RanksUI.els.ranksBlock.classList.add('hidden');
    this.els.statsBlock.classList.add('hidden');
    AppUI.els.menuToggle.classList.add('hidden');
    this.els.title.classList.add('hidden');
    AppUI.closeMenu();
  },

  hideBoardManagementUI() {
    this.els.renameConfirmButton.setAttribute('disabled', true);
    this.els.renameBlock.classList.add('hidden');
    this.els.deleteBlock.classList.add('hidden');
    this.els.statsBlock.classList.add('hidden');
    RanksUI.els.ranksBlock.classList.add('hidden');
    this.els.title.classList.remove('hidden');
    AppUI.els.menuToggle.classList.remove('hidden');
  },

  renderBoard() {
    AppUI.els.columns.innerHTML = '';
    const board = App.getCurrentBoard();

    if(!board) {
      this.renderNoBoardsScreen();
      return;
    }

    board.columns.forEach(column => {
      // Карточки
      let tasksHtml = [];
      column.tasks.forEach(task => {
        tasksHtml.push(`
        <div class="task" style="background:${tasksColors[task.color]};" data-id="${task.id}">
          <div class="ranks-info">
            ${RanksUI.getLevelMarkHtml(task.color)}
            ${RanksUI.getOwnCount(board, task.color)}
            ${RanksUI.getPassMarkHtml(task, column)}
            ${RanksUI.getUpperLevelMarkHtml(task.color)}
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
        ${ColumnUI.renderRenameUi(column.name)}
        ${ColumnUI.renderDeleteUi()}
        ${ColumnUI.renderMoveUi()}
        <div class="column-body">
          ${tasksHtml.join('')}
        </div>
      </div>
    `;
      AppUI.els.columns.insertAdjacentHTML('beforeend', columnHtml);
    });
  },

  renderNoBoardsScreen() {
    AppUI.els.main.insertAdjacentHTML('afterbegin', `
    <div id="no-boards">
      <button id="create-default-board">
        Click to create a board
      </button>
    </div>
  `);
    console.log('no-boards rendered')
  },

  renderCreateDefaultBoard() {
    const newBoard = App.createDefaultBoard();
    App.saveBoards([newBoard], newBoard.id);
    this.hideBoardManagementUI();
    this.renderHeader();
    this.renderBoardsMenu();
    this.renderBoard();
  },

  renderBoardsMenu() {
    let createButton = this.els.createButton
    if(createButton) {
      createButton = createButton.parentNode.removeChild(createButton);
    }
    this.els.boardsListButtonsContainer.innerHTML = '';
    App.data.boards.forEach(board => {
      const btn = document.createElement('button');
      btn.dataset.id = board.id;
      btn.textContent = board.name;
      if(board.id === App.data.currentBoardId) {
        btn.classList.add('active');
      }
      this.els.boardsListButtonsContainer.appendChild(btn);
    });
    createButton && this.els.boardsListButtonsContainer.appendChild(createButton);
  },

  switchBoardByListButton(el) {
    App.switchBoard(el.dataset.id);
    this.els.closeListButton.click();
  },

  showStatsUI() {
    Utils.hide([
      this.els.resetStatsMessage,
      this.els.resetStats,
      this.els.cancelResetStatsButton,
      this.els.deleteBlock,
      RanksUI.els,
      this.els.title,
      AppUI.els.menuToggle,
    ]);

    Utils.show([
      this.els.statsBlock,
      this.els.resetStatsButton,
      this.els.statsContentBlock,
    ]);

    AppUI.closeMenu();

    const stats = App.getBoardsCounters();
    if(stats) {
      this.els.statsContentBlock.innerHTML = Object.keys(stats).map(boardId =>
        `${App.getBoard(boardId).name}: ${stats[boardId]}<br>`
      )
    }
  },

  showResetUI() {
    Utils.show([
      this.els.resetStatsMessage,
      this.els.resetStats,
      this.els.cancelResetStatsButton,
    ]);
    Utils.hide([
      this.els.resetStatsButton,
    ]);
  },

  hideResetUI() {
    Utils.hide([
      this.els.resetStatsMessage,
      this.els.resetStats,
      this.els.cancelResetStatsButton,
    ]);
    Utils.show([
      this.els.resetStatsButton,
    ]);
  },

};


const RanksUI = {

  board: null,

  els: {
    ranksBlock: document.getElementById('ranks-block'),
    createButton: document.getElementById('create-ranks'),
    createCancelButton: document.getElementById('create-ranks-cancel'),
    editButton: document.getElementById('ranks-edit'),
    editCancelButton: document.getElementById('ranks-edit-cancel'),
    previewButton: document.getElementById('ranks-preview'),
    saveButton: document.getElementById('ranks-save-confirm'),
    deleteButton: document.getElementById('ranks-delete'),
    deleteMessage: document.getElementById('ranks-delete-confirm-message'),
    deleteConfirmButton: document.getElementById('ranks-delete-confirm'),
    deleteCancelButton: document.getElementById('ranks-delete-cancel'),
    cancelButton: document.getElementById('ranks-cancel'),
    errorsBlock: document.getElementById('ranks-input-errors'),
    textarea: document.getElementById('ranks-input'),
    currentColorsBlock: document.getElementById('current-colors'),
    currentRanksBlock: document.getElementById('current-ranks'),
    absCountersBlock: document.getElementById('abs-counters'),
    previewBlock: document.getElementById('preview-ranks'),

    resetCountersButton: document.getElementById('ranks-counters-reset'),
    resetCountersMessage: document.getElementById('ranks-counters-reset-message'),
    resetCountersConfirmButton: document.getElementById('ranks-counters-reset-confirm'),
    resetCountersCancelButton: document.getElementById('ranks-counters-reset-cancel'),

    renderCountersButton: document.getElementById('ranks-toggle-counters'),
    infoContainer: document.getElementById('ranks-panels-container'),
  },

  showRanksUI() {

    AppUI.closeMenu();
    this.board = App.getCurrentBoard();
    const currentRanksData = this.board.ranks;
    this.renderColorsInUse();
    this.renderCounters();

    Utils.show([
      this.els.ranksBlock,
      this.els.cancelButton,
      this.els.currentColorsBlock,
      this.els.infoContainer,
    ]);

    Utils.hide([
      BoardUI.els.deleteBlock,
      this.els.deleteMessage,
      this.els.deleteConfirmButton,
      this.els.deleteCancelButton,
      this.els.resetCountersMessage,
      this.els.resetCountersConfirmButton,
      this.els.resetCountersCancelButton,
      this.els.createCancelButton,
      this.els.editCancelButton,
      BoardUI.els.title,
      AppUI.els.menuToggle
    ]);

    // HAS DATA
    if(currentRanksData != null) {

      Utils.show([
        this.els.currentRanksBlock,
        this.els.absCountersBlock,
        this.els.editButton,
        this.els.deleteButton,
        this.els.resetCountersButton,
        this.els.renderCountersButton,
      ]);

      Utils.hide([
        this.els.createButton,
        this.els.saveButton,
        this.els.previewButton,
        this.els.textarea,
        this.els.previewBlock,
      ]);

    } else {
      // NO DATA
      Utils.hide([
        this.els.editButton,
        this.els.resetCountersButton,
        this.els.renderCountersButton,
      ]);

      Utils.show([
        this.els.createButton,
        this.els.currentRanksBlock,
        this.els.absCountersBlock
      ]);

    }

  },

  showEditUI() {
    this.els.textarea.value = this.board.ranksRaw;
    const members = [
      this.els.textarea,
      this.els.previewButton,
      this.els.saveButton,
      this.els.editCancelButton,
      
    ];
    Utils.show(members);

    Utils.hide([
      this.els.cancelButton,
      this.els.editButton,
      this.els.deleteButton,
      this.els.resetCountersButton,
      this.els.renderCountersButton,
    ]);
  },

  hideEditUI() {
    Utils.hide([
      this.els.editCancelButton,
      this.els.textarea,
      this.els.previewButton,
      this.els.saveButton,
      this.els.previewBlock,
    ]);
    
    Utils.show([
      this.els.cancelButton,
      this.els.editButton,
      this.els.deleteButton,
    ]);

    if(this.board.rankCounters) {
      Utils.show([
        this.els.resetCountersButton,
        this.els.renderCountersButton,
      ]);
    }    
  },

  showCreateUI() {
    Utils.show([
      this.els.textarea,
      this.els.previewButton,
      this.els.currentRanksBlock,
      this.els.createCancelButton,
    ]);

    Utils.hide([
      this.els.cancelButton,
      this.els.createButton,
      this.els.editButton,
      this.els.resetCountersButton,
      this.els.renderCountersButton,
    ]);

  },

  hideCreateUI() {
    Utils.hide([
      this.els.createCancelButton,
      this.els.textarea,
      this.els.previewButton,
      this.els.currentRanksBlock,
      this.els.previewBlock,
    ]);

    Utils.show([
      this.els.cancelButton,
      this.els.createButton,
    ]);

    if (this.board.ranks) {
      Utils.show([
        this.els.editButton,
      ]);
    }

  },  

  checkAndUpdateRanks(color) {
    //есть ли цвет в рангах?
    const board = App.getCurrentBoard();
    const ranks = board.ranks;
    if (!ranks) return;
    const allRanksColors = [];
    for (const key in ranks) {
      allRanksColors.push(...ranks[key].c);
    }
    if (allRanksColors.includes(color)) {
      return;
    }
    const lowestLevel = Math.max(0, ...Object.keys(ranks));
    ranks[lowestLevel].c = [...ranks[lowestLevel].c,color];
    board.ranksRaw += `,${color}`;

    App.saveBoards(App.data.boards);
    BoardUI.renderBoard();
  },

  parseRanks() {
    this.els.errorsBlock.innerHTML = '';
    Utils.hide(this.els.errorsBlock);

    let ranksRaw = this.els.textarea.value;
    const lines = ranksRaw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const result = {};
    const ranks = {};

    const usedColors = new Set();
    const validColors = new Set(Object.keys(tasksColors));

    let errors = [];
    lines.forEach((line, index) => {
      const level = index + 1;

      const firstSpace = line.indexOf(' ');
      if(firstSpace === -1) {
        errors.push(`Строка ${level}: отсутствует пробел после квоты`);
      }

      const quota = parseInt(line.slice(0, firstSpace), 10);
      if(isNaN(quota) || quota <= 0) {
        errors.push(`Строка ${level}: некорректная квота`);
      }

      const colorsPart = line.slice(firstSpace + 1);

      const colors = colorsPart
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if(colors.length === 0) {
        errors.push(`Строка ${level}: не указаны цвета`);
      }

      colors.forEach(color => {
        if(!validColors.has(color)) {
          errors.push(`Строка ${level}: цвет "${color}" не существует`);
        }

        if(usedColors.has(color)) {
          errors.push(`Строка ${level}: цвет "${color}" используется повторно`);
        }

        usedColors.add(color);
      });

      ranks[level] = {
        q: quota,
        c: colors
      };
    });

    console.log('usedColors', usedColors);
    console.log('colorsOnBoard', this.getColorsInUse());

    /* 
      цвета, которые есть на доске, но не указаны в поле,
      автоматом приписываются как последний добавочный уровень
    */
    const notMentionedColors = this.getColorsInUse().filter(c => ![...usedColors].includes(c));
    console.log('notMentionedColors', notMentionedColors);

    if (notMentionedColors && notMentionedColors.length) {
      const lowestLevel = Math.max(0, ...Object.keys(ranks));
      ranks[lowestLevel].c = [...ranks[lowestLevel].c, ...notMentionedColors];
      ranksRaw += `,${notMentionedColors.join(',')}`;
    }

    if(errors.length) {
      this.els.errorsBlock.innerHTML = errors.join('<br>');
      this.els.errorsBlock.classList.remove('hidden');
      return null;
    } else {
      result.ranks = ranks;
      result.ranksRaw = ranksRaw;
      return result;
    }

  },

  setRanksData(board) {
    if (board == null) {
      board = App.getCurrentBoard();
    }
    const {ranks, ranksRaw} = this.parseRanks();
    board.ranksRaw = ranksRaw;
    board.ranks = ranks;
    console.log('ranks', board.ranks);
    console.log('ranksRaw', board.ranksRaw);
  },

  getRanksHtml(
    board,
    ranks,
    title = 'Current ranks',
    showCounters = false,
    showAbsCounters = false,
    hideList = false,
  ) {
    const levels = Object.keys(ranks)
      .map(Number)
      .sort((a, b) => a - b);

    if(levels.length === 0) return '';

    function build(levelIndex) {
      const level = levels[levelIndex];
      const {q, c} = ranks[level];

      // генерируем список цветов текущего уровня
      const colorsHtml = c.map(color => {
        const bg = tasksColors[color] || '#ffffff';
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
    <ul class="colors-list ranks-list ${hideList == true ? 'hidden' : ''}">
    ${build(0)}
      </ul>`;
  },

  getColorsInUse() {
    const colors = new Set();

    App.getCurrentBoard().columns?.forEach(column => {
      column.tasks?.forEach(task => {
        if(task.color) {
          colors.add(task.color);
        }
      });
    });

    return [...colors]
  },

  renderColorsInUse() {
    this.els.currentColorsBlock.innerHTML = `
      <span class="ranks-title">Colors in use</span>
      <div class="colors-list colors-in-use hidden">${this.getColorsInUse().map(c => `
        <div><span data-color="${c}" style="background:${tasksColors[c]}"></span><span class="label">${c}</span></div>
        `).join('')}
      </div>
    `;
  },

  preview() {
    const data = this.parseRanks();
    if(data) {
      this.els.previewBlock.innerHTML = this.getRanksHtml(
        this.board,
        data.ranks,
        'Preview',
        null,
        null,
        null
      );

      Utils.show([
        this.els.previewBlock,
      ]);

      Utils.hide(this.els.createButton);

      this.els.textarea.value = data.ranksRaw;
      if(this.els.textarea.value !== this.board.ranksRaw) {
        Utils.show(this.els.saveButton)
      }

    } else {

      this.els.previewBlock.innerHTML = '';

      Utils.hide([
        this.els.previewBlock,
        this.els.saveButton
      ])
    }
  },

  save() {
    const board = App.getCurrentBoard();
    this.setRanksData(board);
    App.saveBoards(App.data.boards);
    BoardUI.renderBoard();
    this.renderCounters();
    this.hideEditUI();
  },

  cancel() {
    this.els.errorsBlock.innerHTML = '';
    this.els.textarea.value = '';
    this.els.previewBlock.innerHTML = '';

    Utils.hide(Object.values(this.els));

    BoardUI.els.title.classList.remove('hidden');
    AppUI.els.menuToggle.classList.remove('hidden');
  },

  showDeleteUI() {
    Utils.hide([
      this.els.currentColorsBlock,
      this.els.editButton,
      this.els.deleteButton,
      this.els.currentRanksBlock,
      this.els.absCountersBlock,
      this.els.previewBlock,
      this.els.resetCountersButton,
      this.els.renderCountersButton,
      this.els.cancelButton,
    ]);

    Utils.show([
      this.els.deleteMessage,
      this.els.deleteConfirmButton,
      this.els.deleteCancelButton,
    ]);
  },

  hideDeleteUI() {
    Utils.show([
      this.els.currentColorsBlock,
      this.els.editButton,
      this.els.deleteButton,
      this.els.cancelButton,
      this.els.currentRanksBlock,
      this.els.previewBlock,
    ]);

    if(this.board.rankCounters) {
      Utils.show([
        this.els.resetCountersButton,
        this.els.renderCountersButton,
        this.els.absCountersBlock,
      ]);
    }

    Utils.hide([
      this.els.deleteMessage,
      this.els.deleteConfirmButton,
      this.els.deleteCancelButton,
    ]);
  },

  delete() {
    delete this.board.ranks;
    delete this.board.ranksRaw;
    delete this.board.rankCounters;
    delete this.board.rankCountersAbs;
    this.renderCounters();
    App.saveBoards(App.data.boards);
    BoardUI.renderBoard();
    this.showRanksUI();
  },

  updateSaveButtonState() {
    const value = this.els.textarea.value;
    const hasValue = value.trim().length > 0;

    const valueChanged =
      hasValue &&
      (!this.board.ranksRaw || value !== this.board.ranksRaw);

    if(valueChanged) {
      this.els.saveButton.removeAttribute('disabled');
    } else {
      this.els.saveButton.setAttribute('disabled', true);
    }
  },

  getLevelOfColor(color, ranks) {
    if(ranks == undefined) {
      ranks = App.getCurrentBoard().ranks;
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
    const ranks = App.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = this.getLevelOfColor(color, ranks);
    return level ? `<div class="cardLevel">L${level}</div>` : '';
  },

  getPassMarkHtml(card, column) {
    const ranks = App.getCurrentBoard().ranks;
    if(!ranks) return '';

    const board = App.getCurrentBoard();

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
    const ranks = App.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = this.getLevelOfColor(color, ranks);
    if(level) {
      const upperLevel = ranks[level - 1];
      return upperLevel ? upperLevel.c.map(c => `<div class="rank-level-mark" style="background:${tasksColors[c]}"></div>`).join('') : '';
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

  makeAMove({color, sourceColumn, targetColumn}) {

    if(sourceColumn.id == targetColumn.id) return;

    const board = App.getCurrentBoard();
    const ranks = board.ranks;

    if(!ranks || !color) return;

    const level = this.getLevelOfColor(color, ranks);
    //console.log('makeAMove: the card level', level);

    if(!sourceColumn || !targetColumn) return;

    if(!board.rankCounters) {
      board.rankCounters = {};
    }

    if(!board.rankCountersAbs) {
      board.rankCountersAbs = {};
    }

    const sourceColIndex = board.columns.findIndex(col => col.id == sourceColumn.id)
    const targetColIndex = board.columns.findIndex(col => col.id == targetColumn.id)
    const isGoingForward = targetColIndex > sourceColIndex;

    // increment own counter
    let ownCount = board.rankCounters[level] !== undefined ? board.rankCounters[level] : null;
    //console.log('Make move: the card own count', ownCount)

    if(ownCount == null) {
      ownCount = 0;
    } else {
      ownCount = parseInt(ownCount);
    }

    const newOwnValue = isGoingForward ? (ownCount + 1) : (ownCount - 1);

    //console.log(`Make move: setting counter to: ${newOwnValue}`);

    board.rankCounters[level] = newOwnValue;

    let absCount = board.rankCountersAbs[level];
    if(absCount == null) {
      absCount = 0;
    } else {
      absCount = parseInt(absCount);
    }
    board.rankCountersAbs[level] = isGoingForward ? (absCount + 1) : (absCount - 1)

    const boardsCounters = App.getBoardsCounters();
    let theBoardCounter = boardsCounters[board.id] == null
      ? 0
      : parseInt(boardsCounters[board.id], 10);

    theBoardCounter = isGoingForward ? (theBoardCounter + 1) : (theBoardCounter - 1);
    boardsCounters[board.id] = theBoardCounter;

    App.saveCounters(boardsCounters);

    
    if(level == 1) {
      RanksUI.refreshCounters();
      return;
    }

    //set upper level's counter

    const quotaOfUpperLevel = parseInt(ranks[level - 1].q);

    let upperCount = board.rankCounters[level - 1] ? parseInt(board.rankCounters[level - 1]) : null;
    //console.log(`Make move: upper level count: ${upperCount}`);

    if(upperCount == null) {
      upperCount = 0;
    }

    //console.log(`Make move: resetting upper level L${level - 1} to ${isGoingForward ? (upperCount - quotaOfUpperLevel) : (upperCount + quotaOfUpperLevel)}`);

    board.rankCounters[level - 1] = isGoingForward ? (upperCount - quotaOfUpperLevel) : (upperCount + quotaOfUpperLevel);

    RanksUI.refreshCounters();

  },

  showResetUI() {
    Utils.hide([
      this.els.resetCountersButton,
      this.els.currentColorsBlock,
      this.els.editButton,
      this.els.deleteButton,
      this.els.currentRanksBlock,
      this.els.absCountersBlock,
      this.els.previewBlock,
      this.els.renderCountersButton,
      this.els.cancelButton, 
    ]);

    Utils.show([
      this.els.resetCountersMessage,
      this.els.resetCountersConfirmButton,
      this.els.resetCountersCancelButton,
    ]);
  },
  
  hideResetUI() {
    Utils.show([
      this.els.resetCountersButton,
      this.els.currentColorsBlock,
      this.els.editButton,
      this.els.deleteButton,
      this.els.currentRanksBlock,
      this.els.absCountersBlock,
      this.els.previewBlock,
      this.els.renderCountersButton,
      this.els.cancelButton, 
    ]);

    Utils.hide([
      this.els.resetCountersMessage,
      this.els.resetCountersConfirmButton,
      this.els.resetCountersCancelButton,
    ]);
  },

  resetCounters() {
    delete this.board.rankCounters;
    delete this.board.rankCountersAbs;
    App.saveBoards(App.data.boards);
    BoardUI.renderBoard();
    this.refreshCounters();
    RanksUI.showRanksUI();
  },

  refreshCounters() {
    this.renderCounters(),
    this.toggleInfo(null, null, [true]);
  },

  renderCounters() {

    const board = App.getCurrentBoard();
    this.els.currentRanksBlock.innerHTML = board.ranks ? this.getRanksHtml(
      board,
      board.ranks,
      undefined,
      true,
      null,
      true
    ) : '';

    if(board.rankCountersAbs != null) {
      this.els.absCountersBlock.innerHTML = board.ranks ? this.getRanksHtml(
        board,
        board.ranks,
        'Abs counters',
        null,
        true,
        true
      ) : '';
    } else {
      this.els.absCountersBlock.innerHTML = '';
    }
  },

  toggleColorsInUse(el, e, [toShow]) {
    const block = this.els.currentColorsBlock.querySelector('.colors-in-use');
    if (toShow === true) {
      block.classList.toggle('hidden', false);
    } else {
      block.classList.toggle('hidden');
    }
  },

  toggleInfo(el, e, [toShow]) {
    const blocks = [...this.els.infoContainer.querySelectorAll('div > ul')];
    if (toShow === true) {
      blocks.forEach(ell => {
        ell.classList.toggle('hidden', false);
      });
      return;
    }
    const hasHidden = blocks.some(el => el.classList.contains('hidden'));
    const hasShown = blocks.some(el => !el.classList.contains('hidden'));
    if (hasHidden && hasShown) {
      blocks.forEach(ell => {
        ell.classList.toggle('hidden', false);
      });
    } else {
      blocks.forEach(ell => {
        ell.classList.toggle('hidden');
      });
    }
  },

};


const ColumnUI = {

  getCurrentColumnByElement(el) {
    const currentColEl = el.classList.contains('column') ? el : el.closest('.column');
    return App.getCurrentBoard().columns.find(c => c.id == currentColEl.dataset.id);
  },

  renderRenameUi(name) {
    return `<div class="rename-column-block hidden">
      Rename column<br>
      <input type="search" class="rename-column-input" ${name ? 'value="' + name + '" data-original-value="' + name + '"' : 'placeholder="New column name"'}>
      <button class="save-rename-column board-management-button" disabled>Save</button>
      <button class="cancel-rename-column board-management-button">Cancel</button>
    </div>`
  },

  renderDeleteUi() {
    return `<div class="delete-column-block hidden">
      <div>Delete this column with all tasks?</div>
      <button class="save-delete-column board-management-button">Delete</button>
      <button class="cancel-delete-column board-management-button">Cancel</button>
    </div>`
  },

  renderMoveUi() {
    return `<div class="move-column-block hidden">
      <div>Move column</div>
      <button class="move-column-right board-management-button"></button>
      <button class="move-column-left board-management-button"></button>
    </div>`
  },

  create() {
    const newUid = Utils.generateUID();
    const newColumn = {
      id: newUid,
      name: 'Новая колонка',
      tasks: []
    };
    App.getCurrentBoard().columns.push(newColumn);
    App.saveBoards(App.data.boards, App.data.currentBoardId);
    BoardUI.renderBoard();
    AppUI.els.main.scrollLeft = document.querySelector(`.column[data-id=${newUid}]`).offsetLeft - 30;
  },

  delete(el) {
    const currentBoard = App.getCurrentBoard();
    const col = el.closest('.column');
    const currentIndex = currentBoard.columns.findIndex(c => c.id === col.dataset.id);
    currentBoard.columns = currentBoard.columns.filter((c, i) => i !== currentIndex);
    App.saveBoards(App.data.boards);
    BoardUI.renderBoard();
  },

  move(button, [doMoveRight]) {
    const currentBoard = App.getCurrentBoard();
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
    App.saveBoards(App.data.boards, App.data.currentBoardId);
    BoardUI.renderBoard();
    this.toggleMoveUi(document.querySelector('[data-id="' + moveColId + '"]'), [false]);
    currentColumnEl = document.querySelector(`[data-id="${currentColumn.id}"]`);
    currentColumnEl.querySelector('.column-menu-toggle').classList.add('expanded');
    currentColumnEl.closest('main').scrollLeft = currentColumnEl.offsetLeft - 30;
  },

  rename(el) {
    const col = el.classList.contains('column') ? el : el.closest('.column');
    const input = col.querySelector('.rename-column-input');
    const newName = input.value.trim();
    if(newName) {
      const dataCol = App.getCurrentBoard().columns.find(c => c.id == col.dataset.id);
      dataCol.name = newName;
      App.saveBoards(App.data.boards);
      BoardUI.renderBoard();
    }
  },

  isColumnUiShown(column) {
    return !(column.querySelector('.rename-column-block').classList.contains('hidden')
      && column.querySelector('.delete-column-block').classList.contains('hidden')
      && column.querySelector('.move-column-block').classList.contains('hidden'));
  },

  hideColumActionsUi(column) {
    column.querySelector('.rename-column-block').classList.add('hidden');
    column.querySelector('.delete-column-block').classList.add('hidden');
    column.querySelector('.move-column-block').classList.add('hidden');
    column.querySelector('.column-menu-toggle').classList.remove('expanded');
  },

  toggleMenu(el) {
    if(el.classList.contains('column-menu-toggle')) {
      if(this.isColumnUiShown(el.closest('.column'))) {
        this.hideColumActionsUi(el.closest('.column'));
      } else {
        el.closest('.column').querySelector('.column-menu').classList.toggle('hidden');
        el.classList.toggle('expanded');
      }
    }
  },

  toggleRenameUi(el, e, [shouldShow]) {
    const col = el.classList.contains('column') ? el : el.closest('.column');
    const menu = col.querySelector('.column-menu');
    const input = col.querySelector('.rename-column-input');
    const renameBlock = col.querySelector('.rename-column-block');
    if(shouldShow === true) {
      menu.classList.toggle('hidden', true);
      renameBlock.classList.toggle('hidden', false);

      Utils.focusAndPlaceCursorAtEnd(input);
    } else if(shouldShow === false) {
      menu.classList.toggle('hidden', false);
      renameBlock.classList.toggle('hidden', true);
      input.value = input.dataset.originalValue;
    } else {
      menu.classList.toggle('hidden');
      renameBlock.classList.toggle('hidden');
      if(renameBlock.classList.contains('hidden')) {
        input.value = input.dataset.originalValue;
      } else {
        Utils.focusAndPlaceCursorAtEnd(input);
      }
    }
  },

  toggleMoveUi(el, [shouldAdd]) {
    const col = el.classList.contains('column') ? el : el.closest('.column');
    if(typeof doShow !== 'undefined'
      && !Array.isArray(doShow)) {
      col.querySelector('.column-menu').classList.toggle('hidden', true);
      col.querySelector('.move-column-block').classList.toggle('hidden', shouldAdd);
    } else {
      col.querySelector('.column-menu').classList.toggle('hidden', true);
      col.querySelector('.move-column-block').classList.toggle('hidden');
    }
  },

  toggleDeleteUi(el, shouldShow) {
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
  },

  updateSaveButtonState(el) {
    Utils.updateButtonState(
      el,
      el.closest('.rename-column-block').querySelector('.save-rename-column')
    );
  },

};


const TaskUI = {

  getCurrentTaskByElement(el) {
    const currentTaskEl = el.closest('.task');
    return ColumnUI.getCurrentColumnByElement(el).tasks.find(task => task.id == currentTaskEl.dataset.id);
  },

  getEditFormHtml(task) {
    const inner = `
    <div class="task-edit"${task ? ' data-id="' + task.id + '"' : ''}>
      <textarea rows="1" ${task ? ' data-original-value="' + task.description + '"' : ' placeholder="Description"'} class="task-edit-input">${task ? task.description : ''}</textarea>
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
  },

  showAddUi(el) {
    const columnBody = el.closest('.column').querySelector('.column-body');
    columnBody.insertAdjacentHTML('afterbegin', this.getEditFormHtml());
    const editBlock = columnBody.querySelector('.task-edit');
    const input = editBlock.querySelector('.task-edit-input');
    input.focus();
    editBlock.querySelector('.task-edit-input').insertAdjacentHTML('afterend', `
      <div style="padding-left:10px;">
        <br>
        ${this.getColors(tasksColors.white)}
      </div>`);
  },

  hideAddUi(el) {
    const taskEl = el.closest('.task');
    if(taskEl.querySelector('.new-task-cancel') != null) {
      taskEl.remove()
    } else {
      document.querySelector('.task-edit').remove();
      taskEl.querySelector('.task-info').classList.remove('hidden');
      taskEl.querySelector('.task-header').classList.remove('hidden');
    }
  },

  showEditUi(el) {
    const taskEl = el.closest('.task');
    if(el.classList.contains('task-title') && taskEl.querySelector('.task-info').classList.contains('hidden')) return;
    let editBlock = taskEl.querySelector('.task-edit');
    if(!editBlock) {
      const task = this.getCurrentTaskByElement(el);
      taskEl.insertAdjacentHTML('beforeend', this.getEditFormHtml(task));
      taskEl.querySelector('.task-info').classList.add('hidden');
      taskEl.querySelector('.task-header').classList.add('hidden');
      editBlock = taskEl.querySelector('.task-edit');
      const input = editBlock.querySelector('.task-edit-input');
      Utils.expandInput(input);
      Utils.focusAndPlaceCursorAtEnd(input);
      Utils.hide(taskEl.querySelector('.ranks-info'));
    }
  },

  showDeleteUi(el) {
    const task = el.closest('.task');
    task.insertAdjacentHTML('beforeend', this.getDeleteUi());
    task.querySelector('.task-info').classList.add('hidden');
    task.querySelector('.task-header').classList.add('hidden');
    Utils.hide(task.querySelector('.ranks-info'));
  },

  removeDeleteUi(el) {
    const task = el.closest('.task');
    task.querySelector('.task-delete-block')?.remove();
    task.querySelector('.task-info').classList.remove('hidden');
    task.querySelector('.task-header').classList.remove('hidden');
  },

  cloneTask(el) {
    const currentColumn = ColumnUI.getCurrentColumnByElement(el);
    const task = this.getTaskByElement(el);
    if(!task) return;
    const {id, color, description} = task;
    const newId = Utils.generateUID();
    const newTask = {
      id: newId,
      color: color,
      description: description
    };

    const board = App.getCurrentBoard();
    const currentTaskIndex = board.columns.findIndex(col => col.id == currentColumn.id);
    currentColumn.tasks.splice(currentTaskIndex + 1, 0, newTask);
    App.saveBoards(App.data.boards, App.data.currentBoardId);
    BoardUI.renderBoard();
    const currentColumnEl = document.querySelector(`[data-id="${currentColumn.id}"]`);
    AppUI.els.main.scrollLeft = currentColumnEl.offsetLeft - 30;
    const newTaskEl = currentColumnEl.querySelector(`.task[data-id="${newId}"]`);
    newTaskEl.querySelector('.task-info-toggle').click();
    newTaskEl.querySelector('.task-edit-button').click();
  },

  updateSaveButtonState(el) {
    //console.log('edit task name update button state')
    Utils.updateButtonState(
      el,
      el.closest('.task-edit').querySelector('.task-edit-save')
    );
  },

  nameInputCallback(el) {
    this.updateSaveButtonState(el);
    Utils.expandInput(el)
  },

  getDeleteUi() {
    return `
    <div class="task-delete-block">
      Delete this task?<br><br>
      <button class="confirm-delete-task  board-management-button">Delete</button>
      <button class="cancel-delete-task  board-management-button">Cancel</button>
    </div>
  `;
  },

  getTaskByElement(el) {
    const board = App.getCurrentBoard();
    const column = board.columns.find(col => col.id == el.closest('.column').dataset.id);
    if(!column) return null;
    const taskEl = el.closest('.task');
    return column.tasks.find(task => task.id == taskEl.dataset.id);
  },

  add(el) {
    const editBlock = el.closest('.task-edit');
    const isAdding = !editBlock.dataset || typeof editBlock.dataset.id === 'undefined';
    const input = editBlock.querySelector('.task-edit-input');
    let theId = null;
    let newColor = null;
    if(isAdding) {
      const column = ColumnUI.getCurrentColumnByElement(el);
      const newTaskId = Utils.generateUID();
      theId = newTaskId;
      newColor = editBlock.querySelector('li.current').dataset.color || 'white';
      const newTask = {
        id: newTaskId,
        description: input.value.trim(),
        color: newColor,
      };
      column.tasks = column.tasks ? [newTask, ...column.tasks] : [newTask];
      
      
    } else {
      const task = this.getCurrentTaskByElement(el);
      task.description = input.value.trim();
      theId = task.id;
    }
    editBlock.remove();
    App.saveBoards(App.data.boards);
    RanksUI.checkAndUpdateRanks(newColor);
    BoardUI.renderBoard();
  },

  delete(el) {
    const col = ColumnUI.getCurrentColumnByElement(el);
    col.tasks = col.tasks.filter(task => task.id != el.closest('.task').dataset.id);
    App.saveBoards(App.data.boards);
    BoardUI.renderBoard();
  },

  toggleInfo(el) {
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
    Utils.toggle(task.querySelector('.ranks-info'));
  },

  showSetColorUI(el) {
    const taskEl = el.closest('.task');
    taskEl.insertAdjacentHTML('beforeend', this.getSetColorUI(taskEl));
    taskEl.querySelector('.task-info').classList.add('hidden');
    taskEl.querySelector('.task-header').classList.add('hidden');
  },

  removeSetColorUI(el) {
    const taskEl = el.closest('.task');
    const colorsBlock = taskEl.querySelector('.set-task-colors');
    taskEl.style.background = tasksColors[colorsBlock.dataset.originalColor];
    colorsBlock.remove();
    taskEl.querySelector('.task-info').classList.remove('hidden');
    taskEl.querySelector('.task-header').classList.remove('hidden');
  },

  getSetColorUI(el) {
    const currentTask = this.getCurrentTaskByElement(el);
    const currentColor = currentTask?.color || 'white';
    const colors = Object.keys(tasksColors).map(name => {
      const color = tasksColors[name];
      return `
      <li data-color="${name}" style="background:${color}" ${currentColor == color ? ' class="current"' : ''}></li>
    `
    });
    return `
    <div data-original-color="${currentColor}" class="set-task-colors">
      Choose task color<br><br>
      ${this.getColors(currentColor)}
      <button class="save-set-color board-management-button" disabled>Save</button>
      <button class="cancel-set-color board-management-button" >Cancel</button>
    </div>
  `;
  },

  getColors(currentColor) {
    const colors = Object.keys(tasksColors).map(key => {
      const color = tasksColors[key];
      return `
        <li data-color="${key}" style="background:${color}" ${currentColor == color ? ' class="current"' : ''}></li>  
      `
    });
    return `
      <ul class="colors-list">
        ${colors.join('')}
      </ul>`
  },

  previewColor(el) {
    el.classList.add('current');
    const taskEl = el.closest('.task');
    const colorEls = el.parentNode.querySelectorAll('li');
    colorEls.forEach(ce => {
      if(ce != el) {
        ce.classList.remove('current');
      }
    })
    el.closest('.task').style.background = tasksColors[el.dataset.color];
    const colorsBlock = el.closest('.set-task-colors');
    const button = taskEl.querySelector('.save-set-color');
    if(colorsBlock) {
      if(el.dataset.color == colorsBlock.dataset.originalColor) {
        button.setAttribute('disabled', "true");
      } else {
        button.removeAttribute('disabled');
      }
    }
  },

  saveColor(el) {
    const taskEl = el.closest('.task');
    const currentTask = this.getCurrentTaskByElement(el);
    currentTask.color = taskEl.querySelector('li.current').dataset.color;
    App.saveBoards(App.data.boards);
    RanksUI.checkAndUpdateRanks(currentTask.color);
    BoardUI.renderBoard(); //TODO: test!!!
    taskEl.querySelector('.set-task-colors')?.remove();
    taskEl.querySelector('.task-info').classList.remove('hidden');
    taskEl.querySelector('.task-header').classList.remove('hidden');
  },

};


const DragDrop = {
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
    const main = AppUI.els.main;
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
    const currentBoardId = App.getCurrentBoard().id;
    const draggedBoard = App.data.boards.find(b => b.id == this.dragState.draggingTask.dataset.id);
    App.data.boards = App.data.boards.filter(b => b.id !== draggedBoard.id);
    const insertIndicator = container.querySelector('.board-insert-indicator');
    let insertIndex = insertIndicator ? Array.from(container.querySelectorAll('button:not(.dragged):not(.dragging)')).findIndex(el =>
      el.previousElementSibling === insertIndicator) : -1;
    if(insertIndex === -1) insertIndex = App.data.boards.length;
    App.data.boards.splice(insertIndex, 0, draggedBoard);
    App.saveBoards(App.data.boards, currentBoardId);
    BoardUI.renderBoardsMenu();
    BoardUI.renderHeader();
    BoardUI.renderBoard();
    this.removeInsertIndicators();
    this.dragState.draggingTask.classList.remove('dragged');
    this.dragState.draggingTask = null;
    if(this.dragState.clone) {
      this.dragState.clone.remove();
      this.dragState.clone = null;
    }
  },

  updateBoardInsertIndicator(x, y) {
    this.removeInsertIndicators();
    const container = BoardUI.els.boardsListButtonsContainer;
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
    if(!AppUI.els.boardsButton.contains(el)
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

  hide(el) {
    [...(el.length ? el : [el])].forEach(o => {
      o.classList && o.classList.add('hidden');
      //console.log('el hidden', o, o.classList)
    })
  },

  show(el) {
    [...(el.length ? el : [el])].forEach(o => {
      o.classList && o.classList.remove('hidden');
      //console.log('el revealed', o, o.classList)
    })
  },

  toggle(el, toShow) {
    [...(el.length ? el : [el])].forEach(o => {
      if(toShow == undefined) {
        o.classList && o.classList.toggle('hidden');
      } else {
        o.classList && o.classList.toggle('hidden', !toShow);
      }
      //console.log('el revealed', o, o.classList)
    })
  },
};


const Events = {

  namespaces: {
    'App': App,
    'AppUI': AppUI,
    'BoardUI': BoardUI,
    'RanksUI': RanksUI,
    'ColumnUI': ColumnUI,
    'TaskUI': TaskUI,
    'DragDrop': DragDrop,
    'Utils': Utils
  },

  map: {
    'click': {
      '##': [
        'AppUI.hideMenu',
        'ColumnUI.toggleMenu',
      ],
      '#create-default-board': 'BoardUI.renderCreateDefaultBoard',
      '#boards-buttons button:not([id="create-board"])': 'BoardUI.switchBoardByListButton',
      '#rename-board': 'BoardUI.showRenameBoardUI',
      '#delete-board': 'BoardUI.showDeleteBoardUI',
      '#close-boards-list': 'BoardUI.closeList',
      '#create-board': 'BoardUI.create',
      '#delete-confirm': 'BoardUI.delete',
      '.js-cancel-current': 'BoardUI.hideBoardManagementUI',
      '#menu-toggle': 'AppUI.toggleMenuByClick',
      '#boards-button': 'BoardUI.toggleList',
      '#confirm-rename': 'BoardUI.rename',
      '#manage-ranks': 'RanksUI.showRanksUI',
      '#create-ranks': 'RanksUI.showCreateUI',
      '#create-ranks-cancel': 'RanksUI.hideCreateUI',
      '#ranks-preview': 'RanksUI.preview',
      '#ranks-save-confirm': 'RanksUI.save',
      '#add-column': 'ColumnUI.create',
      '#ranks-cancel': 'RanksUI.cancel',
      '#ranks-edit': 'RanksUI.showEditUI',
      '#ranks-edit-cancel': 'RanksUI.hideEditUI',
      '#ranks-delete': 'RanksUI.showDeleteUI',
      '#ranks-delete-cancel': 'RanksUI.hideDeleteUI',
      '#ranks-delete-confirm': 'RanksUI.delete',

      '#ranks-counters-reset' : 'RanksUI.showResetUI',
      '#ranks-counters-reset-confirm': 'RanksUI.resetCounters',
      '#ranks-counters-reset-cancel' : 'RanksUI.hideResetUI',

      '#ranks-toggle-counters': 'RanksUI.refreshCounters',
      '#current-colors .ranks-title': 'RanksUI.toggleColorsInUse',
      '#ranks-panels-container .ranks-title': 'RanksUI.toggleInfo',
      '.move-column-left': ['ColumnUI.move', [false]],
      '.move-column-right': ['ColumnUI.move', [true]],
      '.move-column': 'ColumnUI.toggleMoveUi',
      '.rename-column': ['ColumnUI.toggleRenameUi', [true]],
      '.cancel-rename-column': ['ColumnUI.toggleRenameUi', [false]],
      '.save-rename-column': 'ColumnUI.rename',
      '.delete-column': 'ColumnUI.toggleDeleteUi',
      '.cancel-delete-column': ['ColumnUI.toggleDeleteUi', [false]],
      '.save-delete-column': 'ColumnUI.delete',
      '.add-task-button': 'TaskUI.showAddUi',
      '.add-task': 'TaskUI.showAddUi',
      '.task-clone': 'TaskUI.cloneTask',
      '.task-edit-cancel': 'TaskUI.hideAddUi',
      '.task-edit-save': 'TaskUI.add',
      '.task .task-info-toggle': 'TaskUI.toggleInfo',
      '.task-expand-button': 'TaskUI.toggleInfo',
      '.task-delete': 'TaskUI.showDeleteUi',
      '.cancel-delete-task': 'TaskUI.removeDeleteUi',
      '.task .task-title': 'TaskUI.showEditUi',
      '.task .confirm-delete-task': 'TaskUI.delete',
      '.task-change-color': 'TaskUI.showSetColorUI',
      '.cancel-set-color': 'TaskUI.removeSetColorUI',
      '.colors-list li': 'TaskUI.previewColor',
      '.save-set-color': 'TaskUI.saveColor',
      '.task-edit-button': 'TaskUI.showEditUi',
      '.new-task-cancel': 'TaskUI.hideAddUi',
      '#show-stats': 'BoardUI.showStatsUI',
      '#reset-stats': 'BoardUI.showResetUI',
      '#reset-stats-cancel': 'BoardUI.hideResetUI',
      '#reset-stats-confirm': 'App.resetCounters',
    },
    'input': {
      '#rename-board-input': 'BoardUI.renameInputCallback',
      '.rename-column-input': 'ColumnUI.updateSaveButtonState',
      '.task-edit-input': 'TaskUI.nameInputCallback',
      '#ranks-input': 'RanksUI.updateSaveButtonState',
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
  }

};


function init() {
  App.load();
  BoardUI.renderHeader();
  BoardUI.renderBoardsMenu();
  BoardUI.renderBoard();
  Events.init();
};


document.addEventListener('DOMContentLoaded', () => {
  init();
});