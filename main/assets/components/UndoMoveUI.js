import {Bus} from './Bus.js'
import {State} from './State.js'
import {BoardDomain} from './BoardDomain.js'
import {BooksDomain} from './BooksDomain.js';
import {EventsDomain} from './EventsDomain.js';

export const UndoMoveUI = {

  name: 'UndoMoveUI',

  selectors: {
    confirmButton: '#confirm-undo',
  },

  events: {
    click : {
      '@confirmButton' : 'undoMove'
    }
  },

  dom: {},

  undoMove() {
    BoardDomain.undoFromSnapshot();
    BooksDomain.undoFromSnapshot();
    if (State.undoSnapshot.logged) {
      EventsDomain.undoLast();
      delete State.undoSnapshot.logged;
    }
    State.headerUiMode = 'default';
    Bus.emit(Bus.events.headerUIChanged);
    Bus.emit(Bus.events.boardsChanged);
    Bus.emit(Bus.events.booksChanged);
  },

};