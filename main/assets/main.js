import {
  HeaderUI,
  BoardUI,
  BooksUI,
  EventsUI,
} from './components/index.js'
import {Components}  from './components/Components.js'
import {App} from './components/App.js'
import {Events} from './components/Events.js'
import {Utils} from './components/Utils.js'

const AppInit = {
  init() {
    App.loadData();
    Events.init();
    Components.forEach(o => {
      Utils.cacheComponentDom(o);
      o.init && o.init();
    });
    HeaderUI.render();
    App.loadBooks();
    if (App.isBoard()) {
      BoardUI.render();
    } else {
      App.loadEvents();
      if (App.isEvents()) {
        EventsUI.render();
      } else {
        BooksUI.render();
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AppInit.init();
});