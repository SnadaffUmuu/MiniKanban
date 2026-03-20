import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'

export const DeleteUI = {

  selectors: {
    deleteBoardConfirmButton: '#delete-confirm',
  },

  dom: {},

  deleteBoard() {
    BoardDomain.delete();
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.headerUIChanged);
    Bus.emit(Bus.events.boardsChanged);
  },

};