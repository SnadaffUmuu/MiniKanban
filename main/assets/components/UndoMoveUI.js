import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'

export const UndoMoveUI = {

  name: 'UndoMove',

  selectors: {
    confirmButton: '#confirm-undo',
  },

  dom: {},

  undoMove() {
    //BoardDomain.undoMove(); //TODO
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.headerUIChanged);
    Bus.emit(Bus.events.boardsChanged);
  },

};