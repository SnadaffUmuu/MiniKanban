import {App} from './App.js'
import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {BooksDomain} from './BooksDomain.js'
import { BoardUI } from './BoardUI.js'
import {State} from './State.js'
import {BooksUI} from './BooksUI.js'

export const HeaderUI = {

  name: 'HeaderUI',

  board: null,

  selectors: {
    header : 'header',
    appTitle: '[data-app-title]',
    topToolsBlock: '[data-screen-tools]',
    topMenu: '[data-toggle-menu-target]',
    menuButton: '[data-toggle-menu-trigger]',
    headerWrap: '#headerWrap',
    changeHeaderModeTriggers: 'header [data-header-mode-trigger]',
    reset: '.js-cancel-current',
    screenSwitch: '[data-screen-switch]',
  },

  events: {
    click: {
      '@screenSwitch' : 'switchScreen',
      '@menuButton' : 'toggleMenu',
    },
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
    State.openedTopMenu = el.dataset.toggleMenuTrigger;
    this.render();
  },

  hideMenu(el, e) {
    e.stopPropagation();
    const clickIsWithinSomeMenuBlock = [...this.dom.topMenus].some(m => m.contains(el));
    const clickIsOnSomeMenuButton =  [...this.dom.menuButtons].some(m => m.contains(el));
    const someMenuOpened = State.openedTopMenu !== null;
    const shouldHide = !clickIsOnSomeMenuButton && !clickIsWithinSomeMenuBlock && someMenuOpened;
    if(shouldHide) {
      State.openedTopMenu = null;
      this.render();
    }
  },

  reset() {
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.headerUIChanged);
  },

  changeMode(el, e) {
    State.headerUiMode = el.dataset.headerModeTrigger;
    State.openedTopMenu = null;
    Bus.emit(Bus.events.headerUIChanged);
  },

  switchScreen(el) {
    State.currentScreen = el.dataset.screenSwitch;
    App.switchScreen();
    Bus.emit(Bus.events.screenChanged);
  },

  render() {
    console.log('RENDER: HeaderUI');

    const currentScreen = App.getCurrentScreen();
    console.log('currentScreen', currentScreen);
    console.log('State.openedTopMenu', State.openedTopMenu);

    this.dom.appTitles = document.querySelectorAll(this.selectors.appTitle);
    this.dom.topToolsBlocks = document.querySelectorAll(this.selectors.topToolsBlock);
    this.dom.topMenus = document.querySelectorAll(this.selectors.topMenu);
    this.dom.menuButtons = document.querySelectorAll(this.selectors.menuButtons);

    this.dom.headerWrap.classList.toggle('hidden', State.headerUiMode !== 'default');
    
    this.dom.header.classList.toggle('expanded', State.headerUiMode !== 'default');

    this.dom.appTitles.forEach(el => 
      el.classList.toggle('hidden', el.dataset.appTitle !== currentScreen));

    this.dom.topToolsBlocks.forEach(el => 
      el.classList.toggle('hidden', el.dataset.screenTools !== currentScreen));

    this.dom.topMenus.forEach(el => 
      el.classList.toggle('hidden', State.openedTopMenu !== el.dataset.toggleMenuTarget));

    if(App.isBoard()) {
      BoardUI.renderHeader();
    } 

    document.querySelectorAll('[data-header-mode]').forEach(el =>
      el.classList.toggle('hidden', State.headerUiMode !== el.dataset.headerMode));

  },

};