import {Bus} from "./Bus.js";
import {State} from "./State.js";
import {BoardDomain} from "./BoardDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";

export const EventsFilterUI = {

  name: 'EventsFilterUI',

  selectors: {
    filterSelectBoards: '#events-filters-board',
    filterSelectBooks: '#events-filters-book',
    submit: '#eventsFilterSubmit',
    reset: '#eventsFilterReset',
  },

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
    const books = BooksDomain.getBooks();
    const bookBoards = books.map(book => book.board);
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
    const relevantBooks = filters && filters.board ? books.filter(book => book.board == filters.board) : books;
    this.dom.filterSelectBooks.innerHTML = `
      <option ${!filters || !filters.book ? 'selected' : ''} value="">select book</value>
      ${Utils.sortBy(relevantBooks, 'board', true).map(book => {
        return `<option ${filters && filters.book && book.key == filters.book ? 'selected' : ''} value="${book.key}">${book.name}</option>`
      }
    ).join('')}
    `;
  },

  updateBooksOptions() {
    const board = this.dom.filterSelectBoards.value;
    let books = BooksDomain.getBooks();
    if (board) {
      books = books.filter(book => book.board == board);
    }
    this.dom.filterSelectBooks.innerHTML = `
      <option value="">select book</value>
      ${Utils.sortBy(books, 'board', true).map(book =>
      `<option value="${book.key}">${book.name}</option>`
    ).join('')}
    `;
  },

  filter() {
    const filter = {};
    if (this.dom.filterSelectBoards.value) {
      filter.board = this.dom.filterSelectBoards.value;
    }
    if (this.dom.filterSelectBooks.value) {
      filter.book = this.dom.filterSelectBooks.value;
    }
    State.eventsUi.eventsFilter = filter;
    Bus.emit(Bus.events.eventsUiChanged);
  },
  
  reset() {
    State.eventsUi.eventsFilter = {};
    Bus.emit(Bus.events.eventsUiChanged);
  }

};
