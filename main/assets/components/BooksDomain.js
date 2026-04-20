import {App} from './App.js'
import {Storage} from './Storage.js'
import {Colors} from './Colors.js'
import {BoardDomain} from './BoardDomain.js';
import {Utils} from './Utils.js'

export const BooksDomain = {

  getBooks() {
    return App.data.books || [];
  },

  getBook(key) {
    return App.data.books.find(b => b.key == key);
  },

  getUnregisteredColorsForBoard(board) {
    const registeredColors = this.getBooks().filter(b => b.board == board.id).map(b => b.color);
    return BoardDomain.getColorsInUse(board).filter(c => !registeredColors.includes(c));
  },

  saveBooks(books) {
    App.data.books = books;
    Storage.save(App.data);
  },

  save(data) {
    const {name, key, size, board, color} = data;
    const books = this.getBooks();
    const book = books.find(b => b.key == key);
    if(book) {
      book.name = name;
      book.size = size;
      book.board = board;
      book.color = color;
    } else {
      books.push(data);
    }
    this.saveBooks(books);
  },

  deleteBook(key, deleteHistory) {
    const books = this.getBooks().filter(b => b.key !== key);
    this.saveBooks(books);
    //TODO: should the history be deleted?
  },

  updateBookState(key, incoming) {
    incoming = incoming.map(r => ({
      s: Number(r.s),
      f: Number(r.f),
      t: Number(r.t)
    }));
    const book = this.getBook(key);
    const incomingConflicts = Utils.findCrossStageOverlaps(incoming);
    if(incomingConflicts.length) {
      return {
        result: false,
        message: 'Incoming ranges have overlaps',
        details: Utils.formatConflicts(incomingConflicts)
      }
    }
    let existing = book.state?.ranges || [];
    if(existing.length) {
      existing = existing.map(r => ({
        s: Number(r.s),
        f: Number(r.f),
        t: Number(r.t)
      }));
      const existingConflicts = Utils.findCrossStageOverlaps(existing);
      if(existingConflicts.length) {
        return {
          result: false,
          message: 'Existing ranges have overlaps',
          details: Utils.formatConflicts(existingConflicts)
        }
      }
      const conflicts = Utils.findConflictsBetween(existing, incoming);
      if(conflicts.length) {
        return {
          retult: false,
          message: 'There are overlaps between incoming and existing ranges',
          details: Utils.formatConflicts(conflicts)
        }
      }
    }
    const merged = Utils.mergeRanges(existing, incoming);

    if(!book.state) {
      book.state = {}
    }

    book.state.ranges = merged;

    this.saveBooks(App.data.books);

    return {
      result: true,
      message: null,
      details: null
    }
  },

};