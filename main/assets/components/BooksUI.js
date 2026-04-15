import {Bus} from './Bus.js'
import {BooksDomain} from './BooksDomain.js'
import {State} from './State.js'
import {App} from './App.js'
import { Colors } from './Colors.js'
import {BoardDomain} from './BoardDomain.js'

export const BooksUI = {

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
  },

  dom: {
    form : document.forms.addBook,
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.screenChanged, this.render);
    Bus.on(Bus.events.booksUiChanged, this.render);
    Bus.on(Bus.events.booksChanged, this.render);
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
    this.dom.bookBoardSelect.innerHTML = '<option value="-1">choose a board</option>' + App.data.boards.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    this.dom.bookBoardColorSelect.removeAttribute('style');
  },

  getListHtml() {
    return `<ul id="booksList">${BooksDomain.getBooks().map(b => `<li>${b.name}</li>`).join('')}</ul>`
  },

  toggleAddUi(el, e, [toShow]) {
    this.dom.form.reset();
    State.booksUi.addUiShown = toShow;
    Bus.emit(Bus.events.booksUiChanged);
  }, 

  updateColorsDropdown(el) {
    console.log(el.value);
    const board = BoardDomain.getBoard(el.value);
    this.dom.bookBoardColorSelect.innerHTML = '<option value="-1">choose a color</option>' 
      + BooksDomain.getUnregisteredColorsForBoard(board)
      .map(color => `<option value="${color}" style="background-color:${Colors[color]}">${color}</option>`)
      .join('');
    this.dom.bookBoardColorSelect.removeAttribute('style');
  },

  setColorsDropdownColor(el) {
    el.style.backgroundColor = Colors[el.value];
  },

  addBook() {
    //TODO validation
    BooksDomain.save({
      name: this.dom.bookNameInput.value,
      key: this.dom.bookKeyInput.value,
      size: this.dom.bookSizeInput.value,
      board: this.dom.bookBoardSelect.value,
      color: this.dom.bookBoardColorSelect.value
    });
    State.booksUi.addUiShown = false;
    this.dom.form.reset();
    Bus.emit(Bus.events.booksChanged);  
  },

};