import {Storage} from './Storage.js'

export const App = {
  data: null,
  screens : {
    board : 'board',
    books : 'books',
  },

  loadBoards() {
    this.data = Storage.loadBoards();
    if(!this.data) {
      this.data = {};
    }
  },

  saveBoards() {
    Storage.saveBoards(this.data);
  },

  loadBooks() {
    this.data = Storage.loadBooks();
    if(!this.books) {
      this.books = {};
    }
  },

  saveBooks() {
    Storage.saveBooks(this.books);
  },

  loadEvents() {
    this.data = Storage.loadEvents();
    if(!this.events) {
      this.events = {};
    }
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
    this.saveBoards();
  },

  isBoard() {
    return this.data.screen == this.screens.board
  }

};