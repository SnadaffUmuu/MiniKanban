import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'
import {App} from './App.js'

export const BoardsList = {

  name: 'BoardsList',

  selectors: {
    createButton: '#create-board',
    boardsListButtonsContainer: '#boards-buttons',
    boardsButtons: '#boards-buttons button:not([id="create-board"])',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'boardsList') return;
    if(!App.data.currentBoardId) return;
    console.log('RENDER: BoardsList');
    let createButton = this.dom.createButton;
    if(createButton) {
      createButton = createButton.parentNode.removeChild(createButton);
    }
    this.dom.boardsListButtonsContainer.innerHTML = '';
    App.data.boards.forEach(board => {
      const btn = document.createElement('button');
      btn.dataset.id = board.id;
      btn.textContent = board.name;
      if(board.id === App.data.currentBoardId) {
        btn.classList.add('active');
      }
      this.dom.boardsListButtonsContainer.appendChild(btn);
    });
    createButton && this.dom.boardsListButtonsContainer.appendChild(createButton);
  },

  switchBoard(el, e) {
    BoardDomain.switchBoard(el.dataset.id);
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.boardsChanged);
  },

  createBoard(el, e) {
    if(!App.data.boards?.length) {
      const el = document.getElementById('no-boards');
      el && el.remove();
    }
    BoardDomain.create();
    Bus.emit(Bus.events.boardsChanged);
  },

};