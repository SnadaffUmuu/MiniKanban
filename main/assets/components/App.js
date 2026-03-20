import {Storage} from './Storage.js'

export const App = {
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