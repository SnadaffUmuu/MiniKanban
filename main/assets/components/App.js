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
    return this.screens[this.data.screen]
  },

  isBoard() {
    return this.data.screen == this.screens.board
  },

  isEvents() {
    return this.data.screen == this.screens.events
  },
  
  isBooks() {
    return this.data.screen == this.screens.books
  },

  getFilter() {
    return this.getLocalProp('filter') || {};
  },

  setFilter(filter) {
    this.setLocalProp('filter', filter);
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
  }

};