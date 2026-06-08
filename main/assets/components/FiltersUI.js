import {Bus} from "./Bus.js";
import {State} from "./State.js";
import {BoardDomain} from "./BoardDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";
import { App } from "./App.js";

export const FiltersUI = {

  name: 'FiltersUI',

  selectors: {
    filterSelectBoards: '#filters-board',
    filterBooksToggleBlock: '#js-filter-books',
    filterBooksContainer: '#js-filter-books-container',
    submit: '#filterSubmit',
    reset: '#filterReset',
    selectedBooksCheckboxes : '#js-filter-books-container input[name="book"]:checked',
    toggleIncludeSkipMoveCheckbox : '#includeSkipMove',
    toggleIncludeSkipMoveLabel : '[for="includeSkipMove"]',
  },

  dom: {},

  events: {
    click: {
      '@submit' : 'filter',
      '@reset' : 'reset',
    },
    change: {
      '@filterSelectBoards': 'updateBooksOptions',
      '@toggleIncludeSkipMoveCheckbox' : 'toggleInclSkipMove',
    }
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.filtersChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'filters') return;
    console.log('RENDER FiltersUI');
    const filters = App.getFilter();
    const allBooks = BooksDomain.getBooks();
    const bookBoards = allBooks.map(book => book.board);

    const relevantBoards = BoardDomain.getBoards().filter(board =>
      bookBoards.includes(board.id)
    );

    this.dom.filterSelectBoards.innerHTML = `
      <option ${!filters || !filters.board ? 'selected' : ''} value="">select board</value>
      ${relevantBoards.map(board => {
        return `<option ${filters && filters.board && filters.board == board.id ? 'selected' : ''} value="${board.id}">${board.name}</option>`
      }
    ).join('')}
    `;

    const relevantBooks = filters && filters.board ? allBooks.filter(book => book.board == filters.board) : allBooks;
    
    this.dom.filterBooksContainer.innerHTML = `
      ${Utils.sortBy(relevantBooks, 'board', true).map(book => {
        return `<label><input data-filter-param="book" type="checkbox" name="book" ${filters && filters.books && filters.books.includes(book.key) ? 'checked' : ''} value="${book.key}">&nbsp;${book.name}</label>`
      }
    ).join('')} 
    `;

    this.dom.filterBooksToggleBlock.removeAttribute('open');

    this.dom.toggleIncludeSkipMoveLabel.classList.toggle('hidden', !App.isEvents());
  },

  updateBooksOptions() {
    const board = this.dom.filterSelectBoards.value;
    let books = BooksDomain.getBooks();
    if (board) {
      books = books.filter(book => book.board == board);
    }
    this.dom.filterBooksContainer.innerHTML = `
      ${Utils.sortBy(books, 'board', true).map(book =>
      `<label><input data-filter-param="book" type="checkbox" name="book" value="${book.key}">&nbsp;${book.name}</label>`
    ).join('')}
    `;
  },

  filter() {
    const filter = {};
    if (this.dom.filterSelectBoards.value) {
      filter.board = this.dom.filterSelectBoards.value;
    }
    const checkedBooksCheckboxes = document.querySelectorAll(this.selectors.selectedBooksCheckboxes);
    if (checkedBooksCheckboxes.length) {
      filter.books = [...checkedBooksCheckboxes].map(el => el.value);
    }
    filter.includeSkipMove = this.dom.toggleIncludeSkipMoveCheckbox.checked;
    App.setFilter(filter);
    Bus.emit(Bus.events.filtersChanged);
  },
  
  reset() {
    App.setFilter({});
    Bus.emit(Bus.events.filtersChanged);
  },

  toggleInclSkipMove(el) {

  },

};
