import {Storage} from './Storage.js'
import { State } from './State.js';

export const App = {
  data: {},
  books: [],
  events: [],
  screens : {
    board : 'board',
    books : 'books',
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
    const current = this.getCurrentScreen();
    this.data.screen = current == this.screens.board ? this.screens.books : this.screens.board;
    this.saveData();
  },

  switchBookUiMode(mode) {
    this.data.booksUiMode = mode;
    this.saveData();
  },

  isBoard() {
    return this.data.screen == this.screens.board
  },

  isEvents() {
    return this.data.screen == this.screens.books
      && this.data.booksUiMode == 'events'
  }

};