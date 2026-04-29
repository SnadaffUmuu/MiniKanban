import {App} from './App.js'
import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {BooksDomain} from './BooksDomain.js'
import {State} from './State.js'

export const HeaderUI = {

  name: 'HeaderUI',

  board: null,

  selectors: {
    title: '#board-title',
    topToolsBlock: '#top-tools',
    boardsButton: '#boards-button',
    toggleMenuButton: '#menu-toggle',
    toggleBooksMenuButton: '#books-menu-toggle',
    addBookButton: '#addBook',
    menu: '#menu',
    booksMenu: '#booksMenu',
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
    Bus.on(Bus.events.booksChanged, this.render.bind(this));
  },

  toggleMenu(el, e) {
    e.stopPropagation();
    State.menuOpen = !State.menuOpen;
    this.render();
  },

  toggleBookMenu(el, e) {
    e.stopPropagation();
    State.booksMenuOpen = !State.booksMenuOpen;
    this.render();
  },

  hideMenu(el, e) {
    e.stopPropagation();
    const clickIsWithinSomeMenuBlock = this.dom.menu.contains(el) || this.dom.booksMenu.contains(el);
    const clickIsOnSomeMenuButton = this.dom.toggleMenuButton.contains(el) || this.dom.toggleBooksMenuButton.contains(el)
    const someMenuOpened = State.menuOpen == true || State.booksMenuOpen == true;
    const shouldHide = !clickIsOnSomeMenuButton && !clickIsOnSomeMenuButton && someMenuOpened;
    if(shouldHide) {
      State.menuOpen = false;
      State.booksMenuOpen = false;
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
    console.log('RENDER: HeaderUI');
    const isBoard = App.isBoard();
    this.dom.title.classList.toggle('hidden', State.headerUiMode !== 'default');
    this.dom.toggleMenuButton.classList.toggle('hidden', !isBoard || State.headerUiMode !== 'default');
    this.dom.toggleBooksMenuButton.classList.toggle('hidden', isBoard);
    this.dom.menu.classList.toggle('hidden', !State.menuOpen);
    this.dom.booksMenu.classList.toggle('hidden', !State.booksMenuOpen);
    this.dom.boardsButton.classList.toggle('hidden', !isBoard);
    this.dom.screenSwitch.classList.toggle('hidden', isBoard && State.headerUiMode !== 'default');
    this.dom.screenSwitch.classList.toggle('books', !isBoard);
    if(isBoard) {
      const board = BoardDomain.getCurrentBoard();
      this.dom.title.innerHTML = board.name;
      this.dom.menu.querySelectorAll('button').forEach(el =>
        el.classList.toggle('hidden', board == null));
      this.dom.addBookButton.classList.add('hidden');
    } else {
      this.dom.title.innerHTML = App.isEvents() ? 'events' : 'books';
      this.dom.addBookButton.classList.toggle('hidden', App.isEvents() || State.booksUi.addUiShown);
    }

    document.querySelectorAll('[data-header-mode]').forEach(el =>
      el.classList.toggle('hidden', State.headerUiMode !== el.dataset.headerMode));

    this.dom.topToolsBlock.classList.remove('hidden');
  },

};