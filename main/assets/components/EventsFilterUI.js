import {Bus} from "./Bus.js";
import {State} from "./State.js";
import {BoardDomain} from "./BoardDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";

export const EventsFilterUI = {

  name: 'EventsFilterUI',

  selectors: {
    filterSelectBoards: '#events-filters-board',
    filterBooksToggleBlock: '#js-filter-books',
    filterBooksContainer: '#js-filter-books-container',
    submit: '#eventsFilterSubmit',
    reset: '#eventsFilterReset',
    selectedBooksCheckboxes : '#js-filter-books-container input[name="book"]:checked'},

  dom: {},

  events: {
    click: {
      '@submit' : 'filter',
      '@reset' : 'reset',
    },
    change: {
      '@filterSelectBoards': 'updateBooksOptions',
    }
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.eventsUiChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'eventsFilters') return;
    console.log('RENDER EventsFilterUI');
    const filters = State.eventsUi.eventsFilter;
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
        return `<label><input data-event-filter-param="book" type="checkbox" name="book" ${filters && filters.books && filters.books.includes(book.key) ? 'checked' : ''} value="${book.key}">&nbsp;${book.name}</label>`
      }
    ).join('')}    
    `;

    this.dom.filterBooksToggleBlock.removeAttribute('open');
  },

  updateBooksOptions() {
    const board = this.dom.filterSelectBoards.value;
    let books = BooksDomain.getBooks();
    if (board) {
      books = books.filter(book => book.board == board);
    }
    this.dom.filterBooksContainer.innerHTML = `
      ${Utils.sortBy(books, 'board', true).map(book =>
      `<label><input data-event-filter-param="book" type="checkbox" name="book" value="${book.key}">&nbsp;${book.name}</label>`
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
    State.eventsUi.eventsFilter = filter;
    Bus.emit(Bus.events.eventsUiChanged);
  },
  
  reset() {
    State.eventsUi.eventsFilter = {};
    Bus.emit(Bus.events.eventsUiChanged);
  }

};
