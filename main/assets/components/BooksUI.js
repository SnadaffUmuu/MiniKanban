import {Bus} from './Bus.js'
import {BooksDomain} from './BooksDomain.js'
import {State} from './State.js'
import {App} from './App.js'
import {Colors} from './Colors.js'
import {BoardDomain} from './BoardDomain.js'
import {EventsDomain} from './EventsDomain.js'

export const BooksUI = {

  name: 'BooksUI',

  boardCodesByName: {
    'satori': 'satori',
    'paper': 'paper',
    'おさらい': 'osarai',
  },

  events : {
    click : {
      //'@switchBooksViewsTriggers' : 'changeMode'
    }
  },

  getBoardCodeByBoard(boardId) {
    const bName = BoardDomain.getBoard(boardId).name;
    return this.boardCodesByName[Object.keys(this.boardCodesByName).find(k => bName.toLowerCase().indexOf(k) >= 0)]
  },

  selectors: {
    container: '#books',
    booksListContainer: '#booksListContainer',
    //addBookButton: '#addBook',
    addBookUi: '#addBookUi',
    bookNameInput: '#bookName',
    bookKeyInput: '#bookKey',
    bookSizeInput: '#size',
    startIndex: '#startIndex',
    bookBoardSelect: '.js-book-board',
    bookBoardColorSelect: '.js-book-board-color',
    addBookConfirmButton: '.js-add-book-confirm',
    editBookConfirmButton: '.js-edit-book-confirm',
    addBookCancelButton: '#addBookCancel',
    addBookForm: '[name="addBookForm"]',
    editBookForm: '.js-edit-book-form',
    deleteBookButton: '.js-delete-book',
    editBookButton: '.js-edit-book',
    editStateButton: '.js-edit-state',
    extraUiRow: '.extraUi',
    extraUiConfirmButton: '.extraUi .confirm',
    extraUiCancelButton: '.extraUi .cancel',
    closeExtraUi: '.extraUi .js-cancel-current',
    addRangeButton: '.extraUi .addRange',
    removeRangeRowRutton: '.extraUi .removeRangeRow',
    //switchBooksViewsTriggers: 'header [data-books-mode-trigger]',
  },

  dom: {
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.screenChanged, this.render.bind(this));
    Bus.on(Bus.events.booksUiChanged, this.render.bind(this));
    Bus.on(Bus.events.booksChanged, this.render.bind(this));
    Bus.on(Bus.events.booksModeChanged, this.render.bind(this));
    // Bus.on(Bus.events.booksChanged, () => {
    //   State.booksUi.rowUi = {};
    //   this.render();
    // });
  },

  renderHeader() {

  },

  render() {
    if(App.isBoard() || App.isEvents()) {
      this.dom.container.classList.add('hidden');
      return;
    }
    console.log('RENDER: BooksUI');
    this.dom.container.classList.remove('hidden');
    this.dom.booksListContainer.innerHTML = this.getListHtml();
    this.dom.addBookUi.classList.toggle('hidden', !State.booksUi.addUiShown);
    this.dom.bookBoardSelect.innerHTML = '<option value="" disabled selected>choose a board</option>'
      + App.data.boards.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    this.dom.bookBoardColorSelect.removeAttribute('style');
  },

  addRangeRow(el) {
    const key = this.getRowKey(el);
    const book = BooksDomain.getBook(key);
    const fieldset = el.closest('fieldset');
    let rows = [...fieldset.querySelectorAll('.rangesRow')];
    el.closest('fieldset').insertAdjacentHTML('beforeend', this.getRangesRowHtml(book, null, true, true));
    rows = [...fieldset.querySelectorAll('.rangesRow')];
    el.remove();
  },

  removeRangeRow(el) {
    const fieldset = el.closest('fieldset');
    const rows = [...fieldset.querySelectorAll('.rangesRow')];
    if(rows.length == 1) {
      fieldset.insertAdjacentHTML('beforeend', this.getRangesRowHtml(null, true, false));
    }
    el.closest('.rangesRow').remove();
    const lastRowButton = rows[rows.length - 1].querySelector('.addRange');
    if(!lastRowButton) {
      el.querySelector('.rangesRowButtonsWrap').insertAdjacentHTML('beforeend', '<button class="addRange">+</button>');
    }
  },

  getRangesRowHtml(book, range, showAddButton, showRemoveButton) {
    return `<div class="rangesRow">
      <label>from<br>
        <input type="number" name="from" ${range ? `value="${range.f}"` : ' required'}>
      </label>
      <label>to<br>
        <input type="number" name="to" ${range ? `value="${range.t}"` : ' required '}>
      </label>
      <label>stage<br>
        <select ${range ? '' : 'required'} name="stage">
          ${Array.from({length: parseInt(book.stages)}).map((_, i) => `<option ${range && range.s == i + 1 ? 'selected' : ''} value="${i + 1}">${i + 1}</option>`).join('')}
        </select>
      </label>
      <div class="rangesRowButtonsWrap">
        ${showRemoveButton ? `<button class="removeRangeRow">-</button>` : ''}
        ${showAddButton ? '<button class="addRange">+</button>' : ''}
      </div>
    </div>`;
  },

  getCurrentRangesFormHtml(key) {
    const book = BooksDomain.getBook(key);
    const ranges = BooksDomain.getBookRanges(key);
    if(!ranges || !ranges.length) return this.getRangesRowHtml(book, null, true, false);
    return ranges.map((r, i) => this.getRangesRowHtml(book, r, (i == ranges.length - 1), true)).join('');
  },

  getListHtml() {
    const rows = BooksDomain.getBooks().sort((a, b) => a.board.localeCompare(b.board)).map(b => {
      const cellStyle = b.color ? ` style="background-color:${Colors[b.color]}"` : '';
      let rowStyle = b.board ? `class="board-${this.getBoardCodeByBoard(b.board)}-border"` : '';
      const extra = State.booksUi.rowUi[b.key]?.extra;
      const error = State.booksUi.rowUi[b.key]?.error;
      let extraUi = '';
      if(extra) {
        rowStyle += ' style="opacity:0.5"';
        switch(extra) {
          case 'delete':
            extraUi = `
              <h6>Delete book "${b.key}"?</h6>
              <label>Keep history? <input type="checkbox" id="keepHistory"></label><br>
              <button class="confirm">Yes</button>
              <button class="cancel">Cancel</button>
            `;
            break;
          case 'state':
            extraUi = `
              <h6>Set state</h6>
              <form name="stateForm" action="javascript:void(0);">
                <fieldset>
                  <legend>ranges</legend>
                  ${this.getCurrentRangesFormHtml(b.key)}
                </fieldset>
                <button class="confirm">Save</button>
                <button class="cancel">Cancel</button>
              </form>
            `;
            break;
          case 'edit':
            extraUi = `
            <div class="editBookUi">
              <form data-key="${b.key}" name="edit-book-${b.key}" class="js-edit-book-form" action="javascript:void(0);">
                <input type="text" name="bookName" placeholder="book name" value="${b.name}" required><br>
                <input type="text" name="bookKey" paceholder="book key" value="${b.key}" required><br>
                <input type="number" name="size" placeholder="size" value="${b.size}" required><br>
                <input type="number" name="startIndex" placeholder="start column index" value="${b.startIndex != null ? b.startIndex : 0}"><br>
                <select class="js-book-board" name="bookBoard" required>
                  <option value="">choose a board</option>
                  ${App.data.boards.map(board => `<option ${board.id == b.board ? 'selected' : ''} value="${board.id}">${board.name}</option>`).join('')}
                </select><br>
                <select required name="bookBoardColor" class="js-book-board-color" style="background-color:${Colors[b.color]}">
                  <option value="">choose a color</option>
                  <option selected value="${b.color}" style="background-color:${Colors[b.color]}">${b.color}</option>
                  ${BooksDomain.getUnregisteredColorsForBoard(b.board)
                .map(color => `<option value="${color}" style="background-color:${Colors[color]}">${color}</option>`)
                .join('')}
                </select><br>
                <button class="book-action delete js-delete-book"></button>
                <button class="confirm">Save</button>
                <button class="cancel">Cancel</button>
              </form>
            </div>            
            `;
            break;
        }
      }
      const lastUpdated = EventsDomain.getEventsForBook(b.key, false);
      return `
      <tr ${rowStyle} data-book-key="${b.key}">
        <td ${cellStyle}>${b.name}</td>
        <td ${cellStyle}>${b.size}</td>
        <td ${cellStyle}><span class="nowrap">${lastUpdated.length ? lastUpdated[0].d : ''}</span></td>
        <td ${cellStyle}>${this.renderProgressBar(b)}</td>
        <td ${cellStyle}>
          <div class="book-action-container">
            <button class="book-action state js-edit-state"></button>
            <button class="book-action edit js-edit-book"></button>
          </div>
        </td>
      </tr>
      ${extra ? `
      <tr class="extraUi" data-extra-book-key="${b.key}" data-extra="${extra}">
        <td colspan="5">
          <div style="position:relative;">
            <button class="js-cancel-current button-close button-close__extra"></button>
            ${extraUi}
            ${error ? `<span style="color:red">${error}</span><br>` : ''}
          </div>
        </td>
      </tr>
      ` : ''}
    `
    }).join('');
    return `<table id="booksList">
      <thead>
        <th>name</th>
        <th>size</th>
        <th>upd</th>
        <th>progress</th>
        <th>actions</th>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
  },

  toggleAddUi(el, e, [toShow]) {
    e.preventDefault();
    this.dom.addBookForm.reset();
    State.booksUi.addUiShown = toShow;
    Bus.emit(Bus.events.booksUiChanged);
    Bus.emit(Bus.events.headerUIChanged);
  },

  // changeMode(el, e) {
  //   App.switchBookUiMode(el.dataset.booksModeTrigger);
  //   State.booksMenuOpen = false;
  //   Bus.emit(Bus.events.headerUIChanged);
  //   //Bus.emit(Bus.events.booksModeChanged);
  // },

  selectBoardHandler(el) {
    this.updateColorsDropdown(el);
  },

  updateColorsDropdown(el) {
    const select = el.closest('form').querySelector(this.selectors.bookBoardColorSelect);
    if(el.value) {
      const board = BoardDomain.getBoard(el.value);
      select.innerHTML = '<option value="" selected>choose a color</option>'
        + BooksDomain.getUnregisteredColorsForBoard(board)
          .map(color => `<option value="${color}" style="background-color:${Colors[color]}">${color}</option>`)
          .join('');
      select.setAttribute('required', true);
    } else {
      select.innerHTML = '';
      select.removeAttribute('required');
    }
    select.removeAttribute('style');
  },

  setColorsDropdownColor(el) {
    el.style.backgroundColor = Colors[el.value];
  },

  addBook() {
    //TODO validate that key is unique
    let errors = [];

    BooksDomain.save({
      name: this.dom.bookNameInput.value,
      key: this.dom.bookKeyInput.value,
      size: this.dom.bookSizeInput.value,
      startIndex: this.dom.startIndex.value,
      board: this.dom.bookBoardSelect.value,
      color: this.dom.bookBoardColorSelect.value
    });
    State.booksUi.addUiShown = false;
    this.dom.addBookForm.reset();
    Bus.emit(Bus.events.booksChanged);
  },

  getRow(el) {
    return el.closest('tr');
  },

  getRowKey(rowEl) {
    const row = this.getRow(rowEl);
    return row.dataset.bookKey || row.dataset.extraBookKey;
  },

  setRowUi(el, updater) {
    const key = this.getRowKey(el);
    const prev = State.booksUi.rowUi[key] || {};
    const next = updater(prev, key);

    if(next === null) {
      delete State.booksUi.rowUi[key];
    } else {
      State.booksUi.rowUi[key] = next;
    }

    Bus.emit(Bus.events.booksUiChanged);
  },

  showEditBookUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'edit'
    }));
  },

  showDeleteBookUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'delete'
    }));
  },

  showEditStateUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'state'
    }));
  },

  cancelExtra(el, e) {
    e.preventDefault();
    this.setRowUi(el, () => null)
  },

  updateBook(el) {
    let errors = [];
    const form = el;
    const data = {
      name: form.bookName.value,
      key: el.dataset.key,
      size: form.size.value,
      startIndex: form.startIndex.value,
      board: form.bookBoard.value,
      color: form.bookBoardColor.value
    };

    if(form.bookKey.value !== el.dataset.key) {
      data.newKey = form.bookKey.value;
    }

    BooksDomain.save(data);
    Bus.emit(Bus.events.booksChanged);
  },

  confirmExtra(el) {
    const row = this.getRow(el);
    const key = row.dataset.extraBookKey;
    const action = row.dataset.extra;
    switch(action) {
      case 'delete':
        BooksDomain.deleteBook(row.dataset.extraBookKey);
        Bus.emit(Bus.events.booksChanged);
        break;
      case 'state':
        const ranges = [];
        [...row.querySelectorAll('.rangesRow')].forEach(el => {
          ranges.push({
            s: el.querySelector('[name="stage"]').value,
            f: el.querySelector('[name="from"]').value,
            t: el.querySelector('[name="to"]').value,
          });
        });
        const res = BooksDomain.setBookRanges(key, ranges);
        if(res.result !== true) {
          State.booksUi.rowUi[key].error = `
            ${res.message}<br>
            ${res.details}
            `;
          Bus.emit(Bus.events.booksUiChanged);
          return;
        }

        Bus.emit(Bus.events.booksChanged);
        break;
      case 'edit':
        el.closest('form').submit();
        break;
    }
  },

  getStageColor(stage, totalStages) {
    // от светлого к тёмному синему
    const lightnessStart = 85;
    const lightnessEnd = 35;

    const ratio = (stage - 1) / (totalStages - 1 || 1);
    const lightness = lightnessStart - ratio * (lightnessStart - lightnessEnd);

    return `hsl(210, 70%, ${lightness}%)`;
  },

  renderProgressBar(book) {
    const size = Number(book.size);
    const stagesCount = Number(book.stages);
    const ranges = book.state?.ranges || [];

    // 1. агрегируем страницы по стадиям
    const stagePages = new Map(); // stage -> pages count

    for(const {s, f, t} of ranges) {
      const count = t - f + 1;
      stagePages.set(s, (stagePages.get(s) || 0) + count);
    }

    // 2. формируем сегменты
    const segments = [];

    for(let stage = 1;stage <= stagesCount;stage++) {
      const pages = stagePages.get(stage) || 0;
      if(pages === 0) continue;

      const percent = (pages / size) * 100;
      const color = this.getStageColor(stage, stagesCount);

      segments.push(`
      <div 
        class="segment" 
        style="width:${percent}%; background:${color}"
        title="Stage ${stage}: ${pages} pages"
      ></div>
    `);
    }

    // 3. незаполненная часть
    const totalFilled = [...stagePages.values()].reduce((a, b) => a + b, 0);
    const remainingPercent = ((size - totalFilled) / size) * 100;

    if(remainingPercent > 0) {
      segments.push(`
      <div 
        class="segment empty" 
        style="width:${remainingPercent}%"
      ></div>
    `);
    }

    // 4. итоговый HTML
    return `
    <div class="progress-bar">
      ${segments.join("")}
    </div>
  `;
  },

};