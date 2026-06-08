export const State = {
  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard, booksDefault, filters
  openedTopMenu: null,
  statsUiMode: null,
  boardUi: {
    columnUi: {}, //default, menu, rename, move, delete
    taskUi: {},
  },
  ranksUi: null,
  booksUi : {
    addUiShown : false,
    rowUi: {}, //delete, edit, state
    currentBook : null,
  },
  progressData : {},
  progressPromptShown : false,
  newRangesDraft : null,
  progressFormDraft : null,
  progressUpdateSuccess : null,
  logUpdateError : null,
  eventsUi : {
    listExpanded : false,
    dotsMerged : true,
    statTypes : [], //monthAcitvity, boardsDistr, monthlyRate
  },

  afterRender: [],

  setState(patch) {
    Object.assign(this, patch);
  },

};