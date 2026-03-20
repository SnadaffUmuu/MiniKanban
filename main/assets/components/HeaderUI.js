import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'

export const HeaderUI = {

  board: null,

  selectors: {
    title: '#board-title',
    boardsButton: '#boards-button',
    toggleMenuButton: '#menu-toggle',
    menu: '#menu',
    changeHeaderModeTriggers: 'header [data-header-mode-trigger]',
    reset: '.js-cancel-current',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
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

  render() {
    //console.log('Header render');
    this.board = BoardDomain.getCurrentBoard();
    this.dom.title.classList.toggle('hidden', State.headerUiMode !== 'default');
    this.dom.title.innerHTML = this.board.name;
    this.dom.toggleMenuButton.classList.toggle('hidden', State.headerUiMode !== 'default');
    this.dom.menu.classList.toggle('hidden', !State.menuOpen);
    this.dom.menu.querySelectorAll('button').forEach(el =>
      el.classList.toggle('hidden', this.board == null));
    document.querySelectorAll('[data-header-mode]').forEach(el =>
      el.classList.toggle('hidden', State.headerUiMode !== el.dataset.headerMode));
  },

};