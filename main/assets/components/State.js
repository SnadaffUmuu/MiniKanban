export const State = {

  screen: 'board', //books
  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard
  menuOpen: false,
  statsUiMode: null,
  boardUi: {
    columnUi: {}, //default, menu, rename, move, delete
    taskUi: {},
  },
  ranksUi: null,

  afterRender: [],

  setState(patch) {
    Object.assign(this, patch);
  },

};