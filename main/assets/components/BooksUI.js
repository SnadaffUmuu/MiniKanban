import {Bus} from './Bus.js'
import {BooksDomain} from './BooksDomain.js'
import {State} from './State.js'
import {App} from './App.js'
import {Colors} from './Colors.js'
import {BoardDomain} from './BoardDomain.js'

export const BooksUI = {

  boardCodesByName: {
    'satori': 'satori',
    'paper': 'paper',
    'おさらい': 'osarai',
  },

  getBoardCodeByBoard(boardId) {
    const bName = BoardDomain.getBoard(boardId).name;
    return this.boardCodesByName[Object.keys(this.boardCodesByName).find(k => bName.toLowerCase().indexOf(k) >= 0)]
  },

  selectors: {
    container: '#books',
    booksListContainer: '#booksListContainer',
    addBookButton: '#addBook',
    addBookUi: '#addBookUi',
    bookNameInput: '#bookName',
    bookKeyInput: '#bookKey',
    bookSizeInput: '#size',
    bookBoardSelect: '#bookBoard',
    bookBoardColorSelect: '#bookBoardColor',
    addBookConfirmButton: '#addBookConfirm',
    addBookCancelButton: '#addBookCancel',
    addBookForm: '[name="addBookForm"]',
    deleteBookButton: '.js-delete-book',
    editStateButton: '.js-edit-state',
    extraUiRow: '.extraUi',
    extraUiConfirmButton: '.extraUi .confirm',
    extraUiCancelButton: '.extraUi .cancel',
    addRangeButton: '.extraUi .addRange',
    removeRangeRowRutton: '.extraUi .removeRangeRow',
  },

  dom: {
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.screenChanged, this.render);
    Bus.on(Bus.events.booksUiChanged, this.render);
    Bus.on(Bus.events.booksChanged, () => {
      State.booksUi.rowUi = {};
      this.render();
    });
  },

  render() {
    if(App.isBoard()) {
      this.dom.container.classList.add('hidden');
      return;
    }
    console.log('books render');
    this.dom.container.classList.remove('hidden');
    this.dom.booksListContainer.innerHTML = this.getListHtml();
    this.dom.addBookButton.classList.toggle('hidden', State.booksUi.addUiShown);
    this.dom.addBookUi.classList.toggle('hidden', !State.booksUi.addUiShown);
    this.dom.bookBoardSelect.innerHTML = '<option value="" disabled selected>choose a board</option>' + App.data.boards.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    this.dom.bookBoardColorSelect.removeAttribute('style');
  },

  addRangeRow(el) {
    const fieldset = el.closest('fieldset');
    let rows = [...fieldset.querySelectorAll('.rangesRow')];
    el.closest('fieldset').insertAdjacentHTML('beforeend', this.getRangesRowHtml(null, true, true));
    rows = [...fieldset.querySelectorAll('.rangesRow')];
    el.remove();
  },

  removeRangeRow(el) {
    const fieldset = el.closest('fieldset');
    const rows = [...fieldset.querySelectorAll('.rangesRow')];
    if (rows.length == 1) {
      fieldset.insertAdjacentHTML('beforeend', this.getRangesRowHtml(null, true, false));
    }
    el.closest('.rangesRow').remove();
    const lastRowButton = rows[rows.length - 1].querySelector('.addRange');
    if (!lastRowButton) {
      el.querySelector('.rangesRowButtonsWrap').insertAdjacentHTML('beforeend', '<button class="addRange">+</button>');
    }
  },

  getRangesRowHtml(r, showAddButton, showRemoveButton) {
    return `<div class="rangesRow">
      <label>from <input type="number" name="from" ${r ? `value="${r.f}" disabled` : ' required'}></label>
      <label>to <input type="number" name="to" ${r ? `value="${r.t}" disabled` : ' required '}></label>
      <label>stage <input type="number" name="stage" ${r ? `value="${r.s}" disabled` : ' required'}></label>
      <div class="rangesRowButtonsWrap">
        ${showRemoveButton ? `<button class="removeRangeRow">-</button>` : ''}
        ${showAddButton ? '<button class="addRange">+</button>' : ''}
      </div>
    </div>`;
  },

  getCurrentRangesHtml(key) {
    const ranges = BooksDomain.getBook(key).state?.ranges;
    if(!ranges || !ranges.length) return '';
    return ranges.map((r, i) => this.getRangesRowHtml(r, (i == ranges.length - 1), true)).join('');
  },

  getListHtml() {
    const rows = BooksDomain.getBooks().map(b => {
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
                  ${this.getCurrentRangesHtml(b.key)}
                </fieldset>
                <button class="confirm">Save</button>
                <button class="cancel">Cancel</button>
              </form>
            `;
            break;
        }
      }
      return `
      <tr ${rowStyle} data-book-key="${b.key}">
        <td ${cellStyle}>${b.name}</td>
        <td ${cellStyle}>${b.key}</td>
        <td ${cellStyle}>${b.size}</td>
        <td ${cellStyle}>TODO progress</td>
        <td ${cellStyle}>
          <div class="book-action-container">
          <button class="book-action state js-edit-state"></button>
            <button class="book-action delete js-delete-book"></button>
          </div>
        </td>
      </tr>
      ${extra ? `
      <tr class="extraUi" data-extra-book-key="${b.key}" data-extra="${extra}">
        <td colspan="5">
          <div>
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
        <th>key</th>
        <th>size</th>
        <th>%</th>
        <th>actions</th>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
  },

  toggleAddUi(el, e, [toShow]) {
    this.dom.addBookForm.reset();
    State.booksUi.addUiShown = toShow;
    Bus.emit(Bus.events.booksUiChanged);
  },

  updateColorsDropdown(el) {
    console.log(el.value);
    if(el.value) {
      const board = BoardDomain.getBoard(el.value);
      this.dom.bookBoardColorSelect.innerHTML = '<option value="" disabled selected>choose a color</option>'
        + BooksDomain.getUnregisteredColorsForBoard(board)
          .map(color => `<option value="${color}" style="background-color:${Colors[color]}">${color}</option>`)
          .join('');
      this.dom.bookBoardColorSelect.setAttribute('required', true);
    } else {
      this.dom.bookBoardColorSelect.innerHTML = '';
      this.dom.bookBoardColorSelect.removeAttribute('required');
    }
    this.dom.bookBoardColorSelect.removeAttribute('style');
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

  cancelExtra(el) {
    this.setRowUi(el, () => null)
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
        const res = BooksDomain.updateBookState(key, ranges);
        if(res.result !== true) {
          State.booksUi.rowUi[key].error = `
            ${result.message}<br>
            ${result.details}
            `;
          Bus.emit(Bus.events.booksUiChanged);
          return;
        }
        Bus.emit(Bus.events.booksChanged);
        break;
    }
  }

};