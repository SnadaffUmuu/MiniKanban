export const State = {

  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard, booksDefault
  menuOpen: false,
  statsUiMode: null,
  boardUi: {
    columnUi: {}, //default, menu, rename, move, delete
    taskUi: {},
  },
  ranksUi: null,
  booksUi : {
    addUiShown : false,
    rowUi: {}, //delete, edit, state
  },

  afterRender: [],

  setState(patch) {
    Object.assign(this, patch);
  },

};