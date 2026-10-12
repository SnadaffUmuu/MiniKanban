import { Storage } from './Storage.js'
import { State } from './State.js';

export const App = {
  data: {},
  books: [],
  local: null,
  events: null,
  screens : {
    board : 'board',
    books : 'books',
    events : 'events',
  },

  loadLocal() {
    this.local = Storage.loadLocal();
    if (!this.local) {
      this.local = {};
      this.saveLocal();
    }
  },

  saveLocal() {
    Storage.saveLocal(this.local);
  },

  loadData() {
    this.data = Storage.loadData();
    if(!this.data) {
      this.data = {};
    }
    // Legacy field: board balance is now derived from events (see EventsDomain.getBoardStats)
    delete this.data.boardsCounters;
    // Legacy field: per-level attention balance is now derived from events (see EventsDomain.buildBoardAttentionBalance)
    (this.data.boards || []).forEach(board => delete board.rankCountersAbs);
    // Boards with ranks but no history yet: the current ranks open the history.
    // The entry is dated 0 and flagged `approx`: the ranks before tracking began
    // are assumed to be the current ones, so older events still count (see ranks.md).
    let historyAdded = false;
    (this.data.boards || []).forEach(board => {
      if(!board.key) return;
      const history = board.ranksHistory;
      if(board.ranks && !(history && history.length)) {
        board.ranksHistory = [{
          ts: 0,
          approx: true,
          reason: 'init',
          ranks: JSON.parse(JSON.stringify(board.ranks)),
          counters: JSON.parse(JSON.stringify(board.rankCounters || {})),
        }];
        historyAdded = true;
      } else if(history && history.length) {
        // Repair: an earlier version dated the init entry at first load.
        history.forEach(entry => {
          if(entry.reason === 'init' && entry.ts > 0 && !entry.approx) {
            entry.ts = 0;
            entry.approx = true;
            historyAdded = true;
          }
        });
      }
    });
    if(historyAdded) {
      this.saveData();
    }
  },

  saveData() {
    Storage.saveData(this.data);
  },

  loadBooks() {
    this.books = Storage.loadBooks();
    if(!this.books) {
      this.books = {};
    }
  },

  saveBooks() {
    Storage.saveBooks(this.books);
  },

  loadEvents() {
    this.events = Storage.loadEvents();
    if(!this.events) {
      this.events = [];
    }
    return this.events;
  },

  saveEvents() {
    Storage.saveEvents(this.events);
  },

  getCurrentScreen() {
    return this.getLocalProp('screen') || this.screens.board;
  },

  setScreen(screen) {
    this.setLocalProp('screen', screen);
  },

  isBoard() {
    return this.getCurrentScreen() == this.screens.board
  },

  isEvents() {
    return this.getCurrentScreen() == this.screens.events
  },
  
  isBooks() {
    return this.getCurrentScreen() == this.screens.books
  },

  getFilter() {
    return this.getLocalProp('filter') || {};
  },

  setFilter(filter) {
    this.setLocalProp('filter', filter);
  },

  getNightMode() {
    return this.getLocalProp('nightModeOn') || false;
  },

  setNightMode(value) {
    this.setLocalProp('nightModeOn', value);
  },

  setCurrentBoard(id) {
    this.setLocalProp('currentBoard', id);
  },

  getCurrentBoard() {
    return this.getLocalProp('currentBoard');
  },

  setStateProp(prop, value) {
    if (value != null) {
      this.data[prop] = value;
    } else {
      delete this.data[value];
    }
    this.saveData();
  },

  getStateProp(prop) {
    return this.data[prop];
  },

  setLocalProp(prop, value) {
    if (value != null) {
      this.local[prop] = value;
    } else {
      delete this.local[prop];
    }
    this.saveLocal();
  },

  getLocalProp(prop) {
    return this.local[prop];
  },

};