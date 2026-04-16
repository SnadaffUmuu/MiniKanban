import {App} from './App.js'
import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {BooksDomain} from './BooksDomain.js'
import {State} from './State.js'

export const HeaderUI = {

  board: null,

  selectors: {
    title: '#board-title',
    boardsButton: '#boards-button',
    toggleMenuButton: '#menu-toggle',
    toggleBooksMenuButton: '#books-menu-toggle',
    menu: '#menu',
    changeHeaderModeTriggers: 'header [data-header-mode-trigger]',
    reset: '.js-cancel-current',
    screenSwitch: '#switchScreen',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.screenChanged, this.render.bind(this));

  },

  toggleMenu(el, e) {
    e.stopPropagation();
    State.menuOpen = !State.menuOpen;
    this.render();
  },

  hideMenu(el, e) {
    if(
      !this.dom.menu.contains(el) &&
      !this.dom.toggleMenuButton.contains(el) &&
      State.menuOpen !== false
    ) {
      State.menuOpen = false;
      this.render();
    }
  },

  reset() {
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.headerUIChanged);
  },

  changeMode(el, e) {
    State.headerUiMode = el.dataset.headerModeTrigger;
    State.menuOpen = false;
    Bus.emit(Bus.events.headerUIChanged);
  },

  switchScreen() {
    App.switchScreen();
    Bus.emit(Bus.events.screenChanged);
  },

  render() {
    const isBoard = App.isBoard();
    this.dom.title.classList.toggle('hidden', State.headerUiMode !== 'default');
    this.dom.toggleMenuButton.classList.toggle('hidden', !isBoard || State.headerUiMode !== 'default');
    this.dom.toggleBooksMenuButton.classList.toggle('hidden', isBoard);
    this.dom.menu.classList.toggle('hidden', !State.menuOpen);
    this.dom.boardsButton.classList.toggle('hidden', !isBoard);
    this.dom.screenSwitch.classList.toggle('hidden', isBoard && State.headerUiMode !== 'default');
    if(isBoard) {
      const board = BoardDomain.getCurrentBoard();
      this.dom.title.innerHTML = board.name;
      this.dom.menu.querySelectorAll('button').forEach(el =>
        el.classList.toggle('hidden', board == null));
    } else {
      this.dom.title.innerHTML = 'books';
    }

    document.querySelectorAll('[data-header-mode]').forEach(el =>
      el.classList.toggle('hidden', State.headerUiMode !== el.dataset.headerMode));
  },

};