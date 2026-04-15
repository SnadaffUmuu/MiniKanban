import {Storage} from './Storage.js'

export const App = {
  data: null,
  screens : {
    board : 'board',
    books : 'books',
  },

  load() {
    this.data = Storage.load();
    if(!this.data) {
      this.data = {};
    }
  },

  save() {
    Storage.save(this.data);
  },

  getCurrentScreen() {
    return this.screens[this.data.screen]
  },

  switchScreen() {
    const current = this.getCurrentScreen();
    this.data.screen = current == this.screens.board ? this.screens.books : this.screens.board;
    this.save();
  },

  isBoard() {
    return this.data.screen == this.screens.board
  }

};