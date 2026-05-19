export const State = {
  currentScreen: 'board', 
  headerUiMode: 'default', //boardsList, ranks, deleteBoard, stats, renameBoard, booksDefault, eventsFilter
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
    eventsFilter: {},
    view : 'list', //calendar, stats
    listExpanded : false,
    dotsMerged : true,
  },

  afterRender: [],

  setState(patch) {
    Object.assign(this, patch);
  },

};