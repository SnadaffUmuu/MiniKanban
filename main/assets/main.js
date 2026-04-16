import {
  HeaderUI,
  RenameUI,
  BoardsList,
  DeleteUI,
  BoardUI,
  BooksUI,
  DragDrop,
  ColumnHeaderUI,
  TaskUI,
  RanksUI,
  Stats,
  Dialog,
} from './components/index.js'
import {App} from './components/App.js'
import {Events} from './components/Events.js'
import {Utils} from './components/Utils.js'
import {State} from './components/State.js'

const Components = [
  HeaderUI,
  BoardsList,
  RenameUI,
  DeleteUI,
  BoardUI,
  BooksUI,
  ColumnHeaderUI,
  TaskUI,
  RanksUI,
  DragDrop,
  Stats,
  Dialog
];

const AppInit = {
  init() {
    App.load();
    Events.init();
    Components.forEach(o => {
      Utils.cacheComponentDom(o);
      o.init && o.init();
    });
    HeaderUI.render();
    if (App.isBoard()) {
      BoardUI.render();
    } else {
      BooksUI.render();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppInit.init();
});