import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'
import {Colors} from './Colors.js'

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
    absCountersBlock: '#abs-counters',
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
  },

  dom: {},

  createDefaultState() {
    return {
      mode: 'default',
      errors: [],
      draft: null,
      draftRaw: null,
      inputedRaw: null,
      colorsInUseShown: false,
      countersShown: true,
    }
  },

  init() {
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.ranksUiChanged, this.render.bind(this));
  },

  render() {
    console.log('RENDER: RanksUI');
    if(State.headerUiMode !== 'ranks') return;
    const board = BoardDomain.getCurrentBoard();
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
      <h3 class="top-menu-title">Manage the board ranks</h3>
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
      null,
      true
    ) : ''}
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
      null,
      State.ranksUi.countersShown
    ) : '';
    const absCounters = board.ranks ? this.getRanksHtml(
      board,
      board.ranks,
      'Abs counters',
      null,
      true,
      State.ranksUi.countersShown
    ) : '';
    return counters || absCounters ? `<div id="current-ranks">${counters}</div>
        <div id="abs-counters">${absCounters}</div>` : '';
  },

  parseRanks(raw) {
    State.ranksUi.errors = [];

    const lines = raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const result = {};
    const ranks = {};

    const usedColors = new Set();
    const validColors = new Set(Object.keys(Colors));

    lines.forEach((line, index) => {
      const level = index + 1;

      const firstSpace = line.indexOf(' ');
      if(firstSpace === -1) {
        State.ranksUi.errors.push(`Строка ${level}: отсутствует пробел после квоты`);
      }

      const quota = parseInt(line.slice(0, firstSpace), 10);
      if(isNaN(quota) || quota <= 0) {
        State.ranksUi.errors.push(`Строка ${level}: некорректная квота`);
      }

      const colorsPart = line.slice(firstSpace + 1);

      const colors = colorsPart
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      if(colors.length === 0) {
        State.ranksUi.errors.push(`Строка ${level}: не указаны цвета`);
      }

      colors.forEach(color => {
        if(!validColors.has(color)) {
          State.ranksUi.errors.push(`Строка ${level}: цвет "${color}" не существует`);
        }

        if(usedColors.has(color)) {
          State.ranksUi.errors.push(`Строка ${level}: цвет "${color}" используется повторно`);
        }

        usedColors.add(color);
      });

      ranks[level] = {
        q: quota,
        c: colors
      };
    });

    console.log('usedColors', usedColors);
    console.log('colorsOnBoard', BoardDomain.getColorsInUse());

    /* 
      цвета, которые есть на доске, но не указаны в поле,
      автоматом приписываются как последний добавочный уровень
    */
    const notMentionedColors = BoardDomain.getColorsInUse().filter(c => ![...usedColors].includes(c));
    console.log('notMentionedColors', notMentionedColors);

    if(notMentionedColors && notMentionedColors.length) {
      const lowestLevel = Math.max(0, ...Object.keys(ranks));
      ranks[lowestLevel].c = [...ranks[lowestLevel].c, ...notMentionedColors];
      lines[lines.length - 1] += `,${notMentionedColors.join(',')}`;
      raw = lines.join('\n');
    }

    if(!State.ranksUi.errors.length) {
      result.ranks = ranks;
      result.ranksRaw = raw;
      return result;
    } else {
      delete State.ranksUi.draft;
    }
    return null;
  },

  getRanksHtml(
    board,
    ranks,
    title = 'Current ranks',
    showCounters = false,
    showAbsCounters = false,
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
        const bg = Colors[color] || '#ffffff';
        return `<span data-color="${color}" style="background:${bg}">${q}</span>`;
      }).join('');

      let counter = '';
      if(showCounters == true && board.rankCounters && board.rankCounters[level] != null) {
        counter = '&nbsp;&nbsp;' + board.rankCounters[level];
      } else if(showAbsCounters == true && board.rankCountersAbs && board.rankCountersAbs[level] != null) {
        counter = '&nbsp;&nbsp;' + board.rankCountersAbs[level];
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

  getColorsInUseHtml() {
    return `
    <span class="ranks-title">Colors in use</span>
    <div class="colors-list colors-in-use ${State.ranksUi.colorsInUseShown ? '' : 'hidden'}">${BoardDomain.getColorsInUse().map(c => `
      <div><span data-color="${c}" style="background:${Colors[c]}"></span><span class="label">${c}</span></div>
      `).join('')}
    </div>
    `;
  },

  getFreeColorsHtml() {
    return `
    <span class="ranks-title">Free colors</span>
    <div class="colors-list colors-in-use ${State.ranksUi.colorsInUseShown ? '' : 'hidden'}">${BoardDomain.getFreeColors().map(c => `
      <div><span data-color="${c}" style="background:${Colors[c]}"></span><span class="label">${c}</span></div>
      `).join('')}
    </div>
    `;
  },



  getLevelOfColor(color, ranks) {
    if(ranks == undefined) {
      ranks = BoardDomain.getCurrentBoard().ranks;
    }
    if(!ranks) return null;
    let level = Object.keys(ranks).find(k => ranks[k].c.includes(color));
    if(!level) {
      level = Math.max(...Object.keys(ranks).map(o => parseInt(o))) + 1
    } else {
      level = parseInt(level);
    }
    return level;
  },

  getLevelMarkHtml(color) {
    const ranks = BoardDomain.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = this.getLevelOfColor(color, ranks);
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

    const level = this.getLevelOfColor(card.color, ranks);
    if(level == 1) return `<div class="cardPass positive">Go!</div>`; //первый уровень ходит безлимитно

    const quotaOfUpperLevel = parseInt(ranks[level - 1].q);

    let res = null;

    let upperLevelCount = board.rankCounters ? board.rankCounters[level - 1] ? board.rankCounters[level - 1] : null : null;

    // console.log('upperLevelCount', upperLevelCount);
    // console.log('quotaOfUpperLevel', quotaOfUpperLevel);

    if(upperLevelCount == null) {
      res = -quotaOfUpperLevel;
    } else {
      res = upperLevelCount - quotaOfUpperLevel;
    }
    // console.log(`card L${level} "${card.description}" (color: ${card.color})`, res);

    const grandCounters = board.rankCounters[level - 2];
    let parentInDebt = false;
    if (grandCounters && grandCounters < 0) {
      parentInDebt = true;
    }
    const text = (res >= 0 ? 'Go! ' : '')
      + (
        res !== 0 ?
          (res >= 0 ? '+' : '') + res
          : ''
      );
    
    const resClass = parentInDebt ? 'parentInDebt' : res >= 0 ? 'positive' : '';

    return res != null ?
      `<div class="cardPass ${resClass}">${text}</div>`
      : '';
  },

  getUpperLevelMarkHtml(color) {
    const ranks = BoardDomain.getCurrentBoard().ranks;
    if(!ranks) return '';
    const level = this.getLevelOfColor(color, ranks);
    if(level) {
      const upperLevel = ranks[level - 1];
      return upperLevel ? upperLevel.c.map(c => `<div class="rank-level-mark" style="background:${Colors[c]}"></div>`).join('') : '';
    } else {
      return '';
    }
  },

  getOwnCount(board, color) {
    let res = '';
    if(board && board.rankCounters) {
      const count = board.rankCounters[this.getLevelOfColor(color)];
      res = count != null ? `<span class="own-rank-count-mark">${count}</span>` : '';
    }
    return res;
  },

  /* handlers */

  preview() {
    const newValue = State.ranksUi.inputedRaw;
    const parsedRanks = this.parseRanks(newValue);
    if(!State.ranksUi.errors.length && parsedRanks) {
      State.ranksUi.draft = parsedRanks;
      State.ranksUi.draftRaw = parsedRanks.ranksRaw;
    } else {
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
    BoardDomain.setRanksData(State.ranksUi.draft);
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

};