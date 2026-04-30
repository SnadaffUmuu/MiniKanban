export const State = {

  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard, booksDefault
  menuOpen: false,
  booksMenuOpen: false,
  statsUiMode: null,
  boardUi: {
    columnUi: {}, //default, menu, rename, move, delete
    taskUi: {},
  },
  ranksUi: null,
  booksUi : {
    addUiShown : false,
    rowUi: {}, //delete, edit, state
    mode : 'books', //events, todo
  },
  progressData : {},
  progressPromptShown : false,
  progressUpdateSuccess : null,
  progressUpdateError : null,
  logUpdateError : null,

  afterRender: [],

  setState(patch) {
    Object.assign(this, patch);
  },

};