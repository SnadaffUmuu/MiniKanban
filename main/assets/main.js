import {
  HeaderUI,
  RenameUI,
  BoardsList,
  DeleteUI,
  BoardUI,
  DragDrop,
  ColumnHeaderUI,
  TaskUI,
  RanksUI,
  Stats
} from './components/index.js'
import {App} from './components/App.js'
import {Events} from './components/Events.js'
import {Utils} from './components/Utils.js'

const Components = [
  HeaderUI,
  BoardsList,
  RenameUI,
  DeleteUI,
  BoardUI,
  ColumnHeaderUI,
  TaskUI,
  RanksUI,
  DragDrop,
  Stats,
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
    BoardUI.render();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppInit.init();
});