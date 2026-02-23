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

// const Bus = {
//   events: {},

//   on(eventName, handler) {
//     if (!this.events[eventName]) {
//       this.events[eventName] = [];
//     }
//     this.events[eventName].push(handler);
//   },

//   off(eventName, handler) {
//     if (!this.events[eventName]) return;
//     this.events[eventName] =
//       this.events[eventName].filter(h => h !== handler);
//   },

//   emit(eventName, payload) {
//     if (!this.events[eventName]) return;
//     this.events[eventName].forEach(handler => {
//       handler(payload);
//     });
//   }
// };

const Bus = {
  listeners: {},
  renderQueue: new Set(),
  scheduled: false,

  on(event, component) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(component);
  },

  emit(event) {
    const components = this.listeners[event];
    if (!components) return;

    components.forEach(component => {
      this.renderQueue.add(component);
    });

    this.scheduleFlush();
  },

  scheduleFlush() {
    if (this.scheduled) return;

    this.scheduled = true;

    queueMicrotask(() => {
      this.flush();
    });
  },

  flush() {
    this.renderQueue.forEach(component => {
      component.render();
    });

    this.renderQueue.clear();
    this.scheduled = false;
  }
};

const State = {
  screen: 'board',
  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard
  menuOpen: false,
  
  setState(patch) {
    Object.assign(this, patch);
    //Components.forEach(c => c.render(this));
  },
};

const Board = {
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

  rename(newName) {
      const board = Board.getCurrentBoard();
      board.name = newName;
      this.saveBoards(App.data.boards);
  },  
};

const HeaderUI = {
  board : null,
  selectors : {
    title : '#board-title',
    boardsButton : '#boards-button',
    toggleMenuButton: '#menu-toggle',
    menu : '#menu',
    changeHeaderModeTriggers : '[data-header-mode-trigger]',
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
    Bus.on('boardsChanged', this);
    Bus.on('headerUIChanged', this);
  },

  toggleMenu(el, e) {
    e.stopPropagation();
    State.menuOpen = !State.menuOpen;
    this.render();
  },

  hideMenu (el, e) {
    if(
      !this.dom.menu.contains(el) &&
      !this.dom.toggleMenuButton.contains(el) &&
      State.menuOpen !== false
    ) {
      State.menuOpen = false;
      this.render();
    }
  },

  reset () {
    State.headerUiMode = 'default';
    Bus.emit('headerUIChanged');
  },

  changeMode (el, e) {
    State.headerUiMode = el.dataset.headerModeTrigger;
    State.menuOpen = false;
    Bus.emit('headerUIChanged');
  },

  render() {
    console.log('Header render');
    this.board = Board.getCurrentBoard();
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
  selectors : {
    createButton : '#create-board',
    boardsListButtonsContainer : '#boards-buttons',
  },
  dom: {},
  init() {
    Bus.on('headerUIChanged', this);
  },

  render () {
    if (State.headerUiMode !== 'boardsList') return;
    if (!App.data.currentBoardId)  return;
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
};

const RenameUI = {
  selectors : {
    renameInput : '#rename-board-input',
    confirmRenameButton : '#confirm-rename',
  },
  dom : {},
  init() {
    Bus.on('headerUIChanged', this);
  },
  updateButtonState() {
    Utils.updateButtonState(
      this.dom.renameInput,
      this.dom.confirmRenameButton,
    );
  },
  renameBoard () {
    Board.rename(this.dom.renameInput.value.trim());
    State.headerUiMode = 'default';
    Bus.emit('boardsChanged');
    Bus.emit('headerUiChanged');
  },
  render () {
    if (State.headerUiMode !== 'renameBoard') return;
    if (!App.data.currentBoardId)  return;
    this.dom.renameInput.setAttribute('data-original-value', Board.getCurrentBoard().name);
    this.dom.renameInput.value = Board.getCurrentBoard().name;
    Utils.focusAndPlaceCursorAtEnd(this.dom.renameInput);
  },
};

const Components = [
  HeaderUI,
  BoardsList,
  RenameUI,
];

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
};

const Events = {

  namespaces: {
    'HeaderUI' : HeaderUI,
    'RenameUI' : RenameUI,
    // 'DragDrop': DragDrop,
    // 'Utils': Utils
  },

  map: {
    'click': {
      '##': [
        'HeaderUI.hideMenu',
      ],
      [HeaderUI.selectors.toggleMenuButton] : 'HeaderUI.toggleMenu',
      [HeaderUI.selectors.changeHeaderModeTriggers] : 'HeaderUI.changeMode',
      [HeaderUI.selectors.reset] : 'HeaderUI.reset',
      [RenameUI.selectors.confirmRenameButton] : 'RenameUI.renameBoard',
    },
    'input' : {
      [RenameUI.selectors.renameInput] : 'RenameUI.updateButtonState'
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
      if (o.selectors) {
        Object.keys(o.selectors).forEach(selector => {
          const el = document.querySelector(o.selectors[selector]);
          if (el) {
            o.dom[selector] = el;
          }
        })
      }
      o.init && o.init();
//      o.render && o.render();
    });
    HeaderUI.render();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppInit.init();
});