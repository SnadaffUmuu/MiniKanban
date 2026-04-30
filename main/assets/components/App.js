import { Storage } from './Storage.js'
import { State } from './State.js';

export const App = {
  data: {},
  books: [],
  events: null,
  screens : {
    board : 'board',
    books : 'books',
    events : 'events',
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

  switchScreen() {
    this.data.screen = State.currentScreen;
    this.saveData();
  },

  isBoard() {
    return this.data.screen == this.screens.board
  },

  isEvents() {
    return this.data.screen == this.screens.events
  }

};