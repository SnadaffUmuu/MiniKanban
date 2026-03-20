import {Utils} from './Utils.js' 
import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'

export const ColumnHeaderUI = {

  selectors: {
    columnMenuTrigger: '.column-menu-toggle',
    columnMenuBlock: '.column-menu',
    changeHeaderModeTriggers: '.column [data-header-mode-trigger]',
    renameColumnInput: '.column .rename-column-input',
    cancelModeUi: '.column .js-back',
    deleteColumn: '.column .save-delete-column',
    renameColumn: '.column .save-rename-column',
    moveColumnRightButton: '.column [data-move-direction="right"]',
    moveColumnLeftButton: '.column [data-move-direction="left"]',
    skipMoveCheckbox: '.column-menu input[name="skipMove"]',
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.boardsChanged, () => {
      State.boardUi.columnUi = {};
    });
    Bus.on(Bus.events.columnHeaderUIChanged, this.render.bind(this));
    Bus.on(Bus.events.columnMoved, (id) => {
      this.setColumnHeaderMode(id, 'move');
      const movedCol = document.querySelector(`[data-id="${id}"]`);
      movedCol.closest('main').scrollLeft = document.querySelector(`[data-id="${id}"]`).offsetLeft - 30;
    });
  },

  render() {
    const headers = document.querySelectorAll('.column-header');

    headers.forEach(header => {
      const columnEl = Utils.getColumnEl(header);
      const id = columnEl.dataset.id;
      const mode = State.boardUi.columnUi[id] || 'default';
      header.querySelector(this.selectors.columnMenuTrigger).classList.toggle('expanded', mode !== 'default');
      columnEl.querySelector(this.selectors.columnMenuBlock).classList.toggle('hidden', mode !== 'menu');
      columnEl.querySelectorAll('[data-header-mode]').forEach(el => {
        el.classList.toggle('hidden', mode !== el.dataset.headerMode);
        this.renderRenameUi(mode, columnEl);
      });
    });
  },

  renderRenameUi(mode, colEl) {
    const input = colEl.querySelector('.rename-column-input');
    if(mode === 'rename') {
      Utils.focusAndPlaceCursorAtEnd(input);
    } else {
      input.value = input.dataset.originalValue;
      this.updateButtonState(input);
    }
  },

  toggleColumnMenu(el) {
    let state = this.getColHeaderCurrentState(el);
    State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id] = state !== undefined && state !== 'default' ? 'default' : 'menu';
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  setColumnHeaderMode(id, mode) {
    State.boardUi.columnUi[id] = mode;
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  changeColumnHeaderMode(el) {
    State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id] = el.dataset.headerModeTrigger;
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  getColHeaderCurrentState(el) {
    return State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id];
  },

  updateButtonState(renameInput) {
    Utils.updateButtonState(
      renameInput,
      renameInput.closest('.rename-column-block').querySelector('.save-rename-column'),
    );
  },

  cancelModeUi(el) {
    State.boardUi.columnUi[Utils.getColumnEl(el).dataset.id] = 'menu';
    Bus.emit(Bus.events.columnHeaderUIChanged);
  },

  deleteColumn(el) {
    BoardDomain.deleteColumn(Utils.getColumnEl(el).dataset.id);
    Bus.emit(Bus.events.boardsChanged);
  },

  moveColumn(el, e, [doMoveRight]) {
    const column = Utils.getColumnEl(el);
    BoardDomain.moveColumn(column.dataset.id, doMoveRight);
    Bus.emit(Bus.events.boardsChanged);
    Bus.emit(Bus.events.columnMoved, column.dataset.id);
  },

  renameColumn(el, e) {
    const column = Utils.getColumnEl(el);
    const input = column.querySelector('.rename-column-input');
    BoardDomain.renameColumn(column.dataset.id, input.value.trim());
    Bus.emit(Bus.events.boardsChanged);
  },

  setSkipMove(el, e) {
    BoardDomain.setColumnSkipMove(Utils.getColumnEl(el).dataset.id, el.checked);
  },

};