import {Utils} from './Utils.js' 
import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'
import {App} from './App.js'

export const RenameUI = {

  selectors: {
    renameInput: '#rename-board-input',
    confirmRenameButton: '#confirm-rename',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
  },

  updateButtonState() {
    Utils.updateButtonState(
      this.dom.renameInput,
      this.dom.confirmRenameButton,
    );
  },

  renameBoard() {
    BoardDomain.rename(this.dom.renameInput.value.trim());
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.boardsChanged);
    Bus.emit(Bus.events.headerUIChanged);
  },

  render() {
    if(State.headerUiMode !== 'renameBoard') return;
    if(!App.data.currentBoardId) return;
    this.dom.renameInput.setAttribute('data-original-value', BoardDomain.getCurrentBoard().name);
    this.dom.renameInput.value = BoardDomain.getCurrentBoard().name;
    Utils.focusAndPlaceCursorAtEnd(this.dom.renameInput);
  },

};