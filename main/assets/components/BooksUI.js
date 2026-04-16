import {Bus} from './Bus.js'
import {BooksDomain} from './BooksDomain.js'
import {State} from './State.js'
import {App} from './App.js'
import { Colors } from './Colors.js'
import {BoardDomain} from './BoardDomain.js'

export const BooksUI = {

  boardCodesByName : {
    'satori' : 'satori',
    'paper' : 'paper',
    'おさらい' : 'osarai', 
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
    bookNameInput : '#bookName',
    bookKeyInput : '#bookKey',
    bookSizeInput : '#size',
    bookBoardSelect : '#bookBoard',
    bookBoardColorSelect: '#bookBoardColor',
    addBookConfirmButton : '#addBookConfirm',
    addBookCancelButton : '#addBookCancel',
    addBookForm : '[name="addBookForm"]',
    deleteBookButton : '.js-delete-book',
    extraUiRow : '.extraUi',
    extraUiConfirmButton : '.extraUi .confirm',
    extraUiCancelButton : '.extraUi .cancel',
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

  getListHtml() {
    const rows = BooksDomain.getBooks().map(b => {
      const cellStyle = b.color ? ` style="background-color:${Colors[b.color]}"` : '';
      let rowStyle = b.board ? `class="board-${this.getBoardCodeByBoard(b.board)}-border"` : '';
      const extra = State.booksUi.rowUi[b.key];
      let extraUi = '';
      if (extra) {
        rowStyle += ' style="opacity:0.5"';
        switch (extra) {
          case 'delete':
            extraUi = `
              <h6>Delete book "${b.key}"?</h6>
              <label>Keep history? <input type="checkbox" id="keepHistory"></label><br>
              <button class="confirm">Yes</button>
              <button class="cancel">Cancel</button>
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
            <button class="book-action delete js-delete-book"></button>
            <button class="book-action state js-edit-state"></button>
          </div>
        </td>
      </tr>
      ${extra ? `
      <tr class="extraUi" data-extra-book-key="${b.key}" data-extra="${extra}">
        <td colspan="5">
          <div>
            ${extraUi}
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
    if (el.value) {
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

  showDeleteBookUi(el) {
    const key = this.getRow(el).dataset.bookKey;
    State.booksUi.rowUi[key] = 'delete';
    Bus.emit(Bus.events.booksUiChanged);
  },

  cancelExtra(el) {
    delete State.booksUi.rowUi[this.getRow(el).dataset.extraBookKey];
    Bus.emit(Bus.events.booksUiChanged);
  },

  confirmExtra(el) {
    const row = this.getRow(el);
    const key = row.dataset.extraBookKey;
    const action = row.dataset.extra;
    switch (action) {
      case 'delete' : 
        BooksDomain.deleteBook(row.dataset.extraBookKey);
        Bus.emit(Bus.events.booksChanged);
      break;
    }
  }

};