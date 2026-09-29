import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'
import {Colors} from './Colors.js'
import { App } from './App.js'
import { EventsUI } from './EventsUI.js'
import { RanksDomain } from './RanksDomain.js'

export const RanksUI = {

  name: 'RanksUI',

  modes: {
    default: 'default',
    create: 'create',
    edit: 'edit',
    delete: 'delete',
    reset: 'reset',
  },

  selectors: {
    ranksBlock: '#ranks-block',
    createButton: '#create-ranks',
    createCancelButton: '#create-ranks-cancel',
    editButton: '#ranks-edit',
    editCancelButton: '#ranks-edit-cancel',
    previewButton: '#ranks-preview',
    saveButton: '#ranks-save-confirm',
    deleteButton: '#ranks-delete',
    deleteMessage: '#ranks-delete-confirm-message',
    deleteConfirmButton: '#ranks-delete-confirm',
    deleteCancelButton: '#ranks-delete-cancel',
    cancelButton: '#ranks-cancel',
    errorsBlock: '#ranks-input-errors',
    textarea: '#ranks-input',
    currentColorsBlock: '#current-colors',
    currentRanksBlock: '#current-ranks',
    previewBlock: '#preview-ranks',
    colorsInUseToggle: '#current-colors .ranks-title',
    freeColorsToggle: '#free-colors .ranks-title',
    countersToggle: '#ranks-panels-container .ranks-title',

    resetCountersButton: '#ranks-counters-reset',
    resetCountersMessage: '#ranks-counters-reset-message',
    resetCountersConfirmButton: '#ranks-counters-reset-confirm',
    resetCountersCancelButton: '#ranks-counters-reset-cancel',

    renderCountersButton: '#ranks-toggle-counters',
    infoContainer: '#ranks-panels-container',
    counterOverride: '.rank-counter-override',
  },

  dom: {},

  events: {
    input: {
      '@counterOverride': 'counterOverrideHandler',
    }
  },

  createDefaultState() {
    return {
      mode: 'default',
      errors: [],
      draft: null,
      draftRaw: null,
      inputedRaw: null,
      colorsInUseShown: false,
      countersShown: true,
      counterOverrides: {},
    }
  },

  init() {
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.ranksUiChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'ranks') return;
    console.log('RENDER: RanksUI');

    //если экран доска, то текущую доску, если экран статистика - выбранную
    const board = App.isBoard() ? 
      BoardDomain.getCurrentBoard() 
        : App.isEvents() && EventsUI.isStatsView() && App.getFilter().board ? 
          BoardDomain.getBoard(App.getFilter().board) 
          : null;

    if(!board) return;
    const ranks = board.ranks;
    const raw = board.ranksRaw || '';
    if(State.ranksUi === null) {
      State.ranksUi = this.createDefaultState();
    }
    const mode = State.ranksUi.mode;
    const draft = State.ranksUi.draft;
    const draftRaw = State.ranksUi.draftRaw;
    const inputedRaw = State.ranksUi.inputedRaw;
    const errors = State.ranksUi.errors;

    const saveButtonVisible = [this.modes.create, this.modes.edit].includes(mode)
      && !errors.length && (draft && JSON.stringify(draft.ranks) !== JSON.stringify(ranks));

    document.querySelector(this.selectors.ranksBlock).innerHTML = `
      <h3 class="top-menu-title">The ranks of "${board.name}" board</h3>
      <div id="current-colors-container">
        <div id="current-colors" ${mode !== this.modes.delete ? '' : 'class="hidden"'}>${this.getColorsInUseHtml()}</div>
        <div id="free-colors" ${mode !== this.modes.delete ? '' : 'class="hidden"'}>${this.getFreeColorsHtml()}</div>
      </div>
      <div id="ranks-panels-container" ${ranks && ![this.modes.delete].includes(mode) ? '' : 'class="hidden"'}>
        ${this.getCountersHtml(board)}
      </div>
      <textarea id="ranks-input" ${[this.modes.create, this.modes.edit].includes(mode) ? '' : ' class="hidden"'} placeholder="2 blue 
2 white 
1 purple 
1 pink,yellow">${inputedRaw ? inputedRaw : draftRaw ? draftRaw : raw ? raw : ''}</textarea>
      <div id="ranks-input-errors" ${errors.length ? '' : 'class="hidden"'}>${errors.join('<br>')}</div>
      <div id="preview-ranks" ${draft ? '' : 'class="hidden"'}>
        ${draft ? this.getRanksHtml(
      board,
      draft.ranks,
      'Preview',
      null,
      true
    ) + this.getReconciliationHtml(draft.reconciliation, State.ranksUi.counterOverrides) : ''}
      </div>
      <div id="ranks-delete-confirm-message" class="ranks-message ${mode == this.modes.delete ? '' : 'hidden'}">Really delete ranks for this board?</div>
      <div id="ranks-counters-reset-message" class="ranks-message ${mode == this.modes.reset ? '' : 'hidden'}">Really reset  all counters for this board?</div>
      <div id="ranks-buttons-container">
        <button class="js-cancel-current button-close"></button>

        <button id="ranks-counters-reset" class="board-management-button ${ranks && mode === this.modes.default ? '' : 'hidden'}">Reset</button>
        <button id="ranks-counters-reset-confirm" class="board-management-button ${mode === this.modes.reset ? '' : 'hidden'}">Yes</button>
        <button id="ranks-counters-reset-cancel" class="board-management-button ${mode === this.modes.reset ? '' : 'hidden'}">Cancel</button>
        
        <button id="create-ranks" class="board-management-button ${!ranks && mode !== this.modes.create ? '' : 'hidden'}">Create</button>
        <button id="ranks-edit" class="board-management-button ${ranks && mode == this.modes.default ? '' : 'hidden'}">Edit</button>
        <button id="ranks-preview" class="board-management-button ${this.nothingToPreview() ? 'hidden' : ''}">👀</button>
        <button id="create-ranks-cancel" class="board-management-button ${!ranks && mode == this.modes.create ? '' : 'hidden'}">Cancel</button>
        <button id="ranks-save-confirm" class="board-management-button ${saveButtonVisible ? '' : 'hidden'}">Save</button>
        <button id="ranks-edit-cancel" class="board-management-button ${mode == this.modes.edit ? '' : 'hidden'}">Cancel</button>
        <button id="ranks-delete" class="board-management-button ${ranks && mode == this.modes.default ? '' : 'hidden'}">Delete</button>
        <button id="ranks-delete-confirm" class="board-management-button ${mode == this.modes.delete ? '' : 'hidden'}">Delete</button>
        <button id="ranks-delete-cancel" class="board-management-button  ${mode == this.modes.delete ? '' : 'hidden'}">Cancel</button>
        <button id="ranks-cancel" class="js-cancel-current board-management-button ${mode == this.modes.default ? '' : 'hidden'}">Cancel</button>
      </div>    
    `;

    this.dom.previewButton = document.querySelector(this.selectors.previewButton);
    this.dom.textarea = document.querySelector(this.selectors.textarea);
    this.dom.previewBlock = document.querySelector(this.selectors.previewBlock);
    this.dom.saveButton = document.querySelector(this.selectors.saveButton);

  },

  getCountersHtml(board) {
    const counters = board.ranks ? this.getRanksHtml(
      board,
      board.ranks,
      undefined,
      true,
      State.ranksUi.countersShown
    ) : '';
    return counters ? `<div id="current-ranks">${counters}</div>` : '';
  },

  getRanksHtml(
    board,
    ranks,
    title = 'Current ranks',
    showCounters = false,
    showList = false,
  ) {

    if(!ranks) return '';

    const levels = Object.keys(ranks)
      .map(Number)
      .sort((a, b) => a - b);

    if(levels.length === 0) return '';

    function build(levelIndex) {
      const level = levels[levelIndex];
      const {q, c} = ranks[level];

      // генерируем список цветов текущего уровня
      const colorsHtml = c.map(color => {
        const colorClass = Colors[color] ? color : 'white';
        return `<span data-color="${color}" class="${colorClass}">${q}</span>`;
      }).join('');

      let counter = '';
      if(showCounters == true && board.rankCounters && board.rankCounters[level] != null) {
        counter = '&nbsp;&nbsp;' + board.rankCounters[level];
      }

      // если последний уровень — без вложенного ul
      if(levelIndex === levels.length - 1) {
        return `
          <li data-level="${level}">
            ${colorsHtml}${counter}
          </li>`;
      }

      // иначе добавляем вложенный уровень
      return `
        <li data-level="${level}">
          ${colorsHtml}${counter}
          <ul>
            ${build(levelIndex + 1)}
          </ul>
        </li>`;
    }

    return `<span class="ranks-title">${title}</span>
    <ul class="colors-list ranks-list ${showList == true ? '' : 'hidden'}">
    ${build(0)}
      </ul>`;
  },

  getReconciliationHtml(reconciliation, overrides) {
    if(!reconciliation) return '';
    const formatStanding = value => value == null
      ? 'Go'
      : value >= 0 ? `Go +${value}` : `${value}`;
    const statusLabels = {
      kept: 'kept',
      grandfathered: 'grandfathered',
      new: 'new',
      dropped: 'dropped',
      ambiguous: 'needs review',
    };
    const rows = reconciliation.rows.map(row => {
      const before = row.status === 'new' ? '—' : formatStanding(row.oldStanding);
      const after = row.status === 'dropped' ? '—' : formatStanding(row.newStanding);
      const override = overrides && overrides[row.newLevel] != null
        ? overrides[row.newLevel]
        : row.openingBalance;
      const balance = row.editable
        ? `<input class="rank-counter-override" data-level="${row.newLevel}" type="number" value="${override}">`
        : row.openingBalance == null ? '—' : row.openingBalance;
      return `<tr class="rank-reconciliation-${row.status}">
        <td>${row.colors.join(', ')}</td>
        <td>${before}</td>
        <td>${after}</td>
        <td>${balance}</td>
        <td>${statusLabels[row.status]}</td>
      </tr>`;
    }).join('');
    return `<div class="rank-reconciliation">
      <span class="ranks-title">Counter reconciliation</span>
      <table>
        <thead><tr><th>Colors</th><th>Before</th><th>After</th><th>Balance</th><th>Result</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${reconciliation.rows.some(row => row.editable)
        ? '<div class="rank-reconciliation-note">Split or merged color groups need review. You may change only their opening balances.</div>'
        : ''}
    </div>`;
  },

  getColorsInUseHtml() {
    return `
    <span class="ranks-title">Colors in use</span>
    <div class="colors-list colors-in-use ${State.ranksUi.colorsInUseShown ? '' : 'hidden'}">${BoardDomain.getColorsInUse().map(c => `
      <div><span data-color="${c}" class="${c}"></span><span class="label">${c}</span></div>
      `).join('')}
    </div>
    `;
  },

  getFreeColorsHtml() {
    return `
    <span class="ranks-title">Free colors</span>
    <div class="colors-list colors-in-use ${State.ranksUi.colorsInUseShown ? '' : 'hidden'}">${BoardDomain.getFreeColors().map(c => `
      <div><span data-color="${c}" class="${c}"></span><span class="label">${c}</span></div>
      `).join('')}
    </div>
    `;
  },

  getLevelMarkHtml(color) {
    const ranks = BoardDomain.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = RanksDomain.getLevelOfColor(color, ranks);
    return level ? `<div class="cardLevel">L${level}</div>` : '';
  },

  getPassMarkHtml(card, column) {

    const board = BoardDomain.getCurrentBoard();
    const ranks = board.ranks;
    if(!ranks) return '';

    const currentColIndex = board.columns.findIndex(col => col.id === column.id);

    //Если последняя колонка, то ничего не отображаем
    if(currentColIndex == (board.columns.length - 1)) {
      return '';
    }

    const level = RanksDomain.getLevelOfColor(card.color, ranks);
    if(level == 1) return `<div class="cardPass positive">Go!</div>`; //первый уровень ходит безлимитно

    const passState = RanksDomain.getPassState(ranks, board.rankCounters, level);
    const res = passState.standing;
    // console.log(`card L${level} "${card.description}" (color: ${card.color})`, res);

    const text = (res >= 0 ? 'Go! ' : '')
      + (
        res !== 0 ?
          (res >= 0 ? '+' : '') + res
          : ''
      );
    
    const resClass = passState.parentInDebt ? 'parentInDebt' : res >= 0 ? 'positive' : '';

    return res != null ?
      `<div class="cardPass ${resClass}">${text}</div>`
      : '';
  },

  getUpperLevelMarkHtml(color) {
    const ranks = BoardDomain.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = RanksDomain.getLevelOfColor(color, ranks);
    if(level) {
      const upperLevel = ranks[level - 1];
      return upperLevel ? upperLevel.c.map(c => `<div class="rank-level-mark ${c}"></div>`).join('') : '';
    } else {
      return '';
    }
  },

  getOwnCount(board, color) {
    let res = '';
    if(board && board.rankCounters) {
      const count = board.rankCounters[RanksDomain.getLevelOfColor(color, board.ranks)];
      res = count != null ? `<span class="own-rank-count-mark">${count}</span>` : '';
    }
    return res;
  },

  /* handlers */

  preview() {
    const newValue = State.ranksUi.inputedRaw;
    const parsedRanks = RanksDomain.parseRanks(
      newValue,
      Object.keys(Colors),
      BoardDomain.getColorsInUse()
    );
    State.ranksUi.errors = parsedRanks.errors;
    if(!parsedRanks.errors.length && parsedRanks.ranks) {
      const board = BoardDomain.getCurrentBoard();
      parsedRanks.reconciliation = RanksDomain.reconcileCounters(
        board.ranks || {},
        board.rankCounters || {},
        parsedRanks.ranks
      );
      State.ranksUi.draft = parsedRanks;
      State.ranksUi.draftRaw = parsedRanks.ranksRaw;
      State.ranksUi.counterOverrides = {};
    } else {
      delete State.ranksUi.draft;
      State.ranksUi.draftRaw = newValue;
    }
    State.ranksUi.inputedRaw = State.ranksUi.draftRaw;
    Bus.emit(Bus.events.ranksUiChanged);
  },

  showCreateUi(el) {
    State.ranksUi.mode = 'create';
    State.ranksUi.colorsInUseShown = true;
    Bus.emit(Bus.events.ranksUiChanged);
  },

  showDeleteUi() {
    State.ranksUi.mode = 'delete';
    Bus.emit(Bus.events.ranksUiChanged);
  },

  toggleColorsInUse() {
    State.ranksUi.colorsInUseShown = !State.ranksUi.colorsInUseShown;
    Bus.emit(Bus.events.ranksUiChanged);
  },

  toggleCounters() {
    State.ranksUi.countersShown = !State.ranksUi.countersShown;
    Bus.emit(Bus.events.ranksUiChanged);
  },

  showResetUi() {
    State.ranksUi.mode = 'reset';
    Bus.emit(Bus.events.ranksUiChanged);
  },

  resetCounters() {
    BoardDomain.resetCounters();
    State.ranksUi.mode = this.modes.default;
    Bus.emit(Bus.events.boardsChanged);
  },

  resetUi() {
    State.ranksUi = this.createDefaultState();
    Bus.emit(Bus.events.ranksUiChanged);
  },

  save() {
    BoardDomain.setRanksData(Object.assign({}, State.ranksUi.draft, {
      counterOverrides: State.ranksUi.counterOverrides
    }));
    State.ranksUi = this.createDefaultState();
    Bus.emit(Bus.events.boardsChanged);
  },

  delete() {
    BoardDomain.deleteRanks();
    State.ranksUi = this.createDefaultState();
    Bus.emit(Bus.events.boardsChanged);
  },

  edit() {
    State.ranksUi.mode = 'edit';
    State.ranksUi.colorsInUseShown = true;
    Bus.emit(Bus.events.ranksUiChanged);
  },

  nothingToPreview() {
    const to = State.ranksUi.draftRaw || '';
    const inputed = State.ranksUi.inputedRaw || '';
    return inputed == to;
  },

  ranksInputHandler(el) {
    State.ranksUi.inputedRaw = el.value;
    const nothingToPreview = this.nothingToPreview();
    this.dom.previewButton.classList.toggle(
      'hidden',
      nothingToPreview
    );

    if(!nothingToPreview) {
      this.dom.saveButton.classList.toggle('hidden', true);
    }
    this.dom.previewBlock.classList.toggle('hidden', nothingToPreview);

    this.dom.previewBlock.innerHTML = '';
  },

  counterOverrideHandler(el) {
    State.ranksUi.counterOverrides[el.dataset.level] = el.value;
    const row = State.ranksUi.draft.reconciliation.rows.find(item =>
      item.newLevel === parseInt(el.dataset.level, 10)
    );
    if(row) {
      const balance = parseInt(el.value, 10);
      const quota = parseInt(State.ranksUi.draft.ranks[row.newLevel - 1].q, 10);
      row.newStanding = (isNaN(balance) ? 0 : balance) - quota;
      const afterCell = el.parentNode.previousElementSibling;
      afterCell.textContent = row.newStanding >= 0 ? `Go +${row.newStanding}` : row.newStanding;
    }
  },

};