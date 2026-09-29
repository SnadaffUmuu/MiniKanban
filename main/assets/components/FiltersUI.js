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
    toggleIncludeArchivedCheckbox : '#includeArchived',
    toggleIncludeArchivedLabel : '[for="includeArchived"]',
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
      '@toggleIncludeArchivedCheckbox' : 'toggleInclArchived',
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
      <option ${!filters || !filters.board ? 'selected' : ''} value="">select board</option>
      ${relevantBoards.map(board => {
        return `<option ${filters && filters.board && filters.board == board.id ? 'selected' : ''} value="${board.id}">${board.name}</option>`
      }
    ).join('')}
      <option ${filters && filters.board === BooksDomain.ARCHIVED_FILTER ? 'selected' : ''} value="${BooksDomain.ARCHIVED_FILTER}">archived</option>
    `;

    const relevantBooks = this.getBooksForBoard(filters && filters.board);
    
    this.dom.filterBooksContainer.innerHTML = `
      ${relevantBooks.map(book => {
        return `<label><input data-filter-param="book" type="checkbox" name="book" ${filters && filters.books && filters.books.includes(book.key) ? 'checked' : ''} value="${book.key}">&nbsp;${book.name}</label>`
      }
    ).join('')} 
    `;

    this.dom.filterBooksToggleBlock.removeAttribute('open');

    this.dom.toggleIncludeSkipMoveCheckbox.checked = App.getFilter()?.includeSkipMove == true;
    this.dom.toggleIncludeArchivedCheckbox.checked = App.getFilter()?.includeArchived !== false;

    const isEvents = App.isEvents();
    this.dom.toggleIncludeSkipMoveLabel.classList.toggle('hidden', !isEvents);
    this.dom.toggleIncludeArchivedLabel.classList.toggle('hidden', !isEvents);
  },

  // Books for the boards dropdown value: '' -> all (archived at the bottom),
  // 'archived' -> only archived, otherwise books of that board.
  getBooksForBoard(board) {
    const books = BooksDomain.getBooks();
    if (board === BooksDomain.ARCHIVED_FILTER) {
      return Utils.sortBy(books.filter(book => BooksDomain.isArchived(book)), 'name', true);
    }
    if (board) {
      return Utils.sortBy(books.filter(book => book.board == board), 'board', true);
    }
    const active = Utils.sortBy(books.filter(book => !BooksDomain.isArchived(book)), 'board', true);
    const archived = Utils.sortBy(books.filter(book => BooksDomain.isArchived(book)), 'name', true);
    return [...active, ...archived];
  },

  updateBooksOptions() {
    const board = this.dom.filterSelectBoards.value;
    const books = this.getBooksForBoard(board);
    this.dom.filterBooksContainer.innerHTML = `
      ${books.map(book =>
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
    if (this.dom.toggleIncludeSkipMoveCheckbox.checked) {
      filter.includeSkipMove = true;
    }
    if (!this.dom.toggleIncludeArchivedCheckbox.checked) {
      filter.includeArchived = false;
    }
    App.setFilter(filter);
    Bus.emit(Bus.events.filtersChanged);
  },
  
  reset() {
    App.setFilter({});
    Bus.emit(Bus.events.filtersChanged);
  },

  toggleInclSkipMove(el) {

  },

  toggleInclArchived(el) {

  },

};
