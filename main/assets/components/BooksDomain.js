import {App} from './App.js'
import {Storage} from './Storage.js'
import {Colors} from './Colors.js'
import {BoardDomain} from './BoardDomain.js';
import {Utils} from './Utils.js'

export const BooksDomain = {

  getBooks() {
    return App.books || [];
  },

  getBook(key) {
    return App.books.find(b => b.key == key);
  },

  betBookByBoard(boardId, color) {
    return App.books.find(b => b.board == boardId && b.color == color);
  },

  getUnregisteredColorsForBoard(board) {
    const registeredColors = this.getBooks().filter(b => b.board == board.id).map(b => b.color);
    return BoardDomain.getColorsInUse(board).filter(c => !registeredColors.includes(c));
  },

  getBookStagesCountFromBoard(boardId, startIndex) {
    const board = BoardDomain.getBoard(boardId);
    const lastIndex = board.columns.length - 1;
    return board.columns.filter((col, i) => {
      return i >= startIndex && i < lastIndex && !col.skipMove;
    }).length;
  },

  getStageAtIndex(cols, startIndex, currentIndex) {
    const skipped = cols.filter((col, i) => {
      return i >= startIndex && i < currentIndex && col.skipMove;
    }).length;

    return (currentIndex - startIndex) - skipped;
  },

  saveBooks(books) {
    App.books = books;
    App.saveBooks(App.books);
  },

  save(data) {
    let {name, key, newKey, size, startIndex, board, color} = data;
    if(startIndex == null || startIndex == '') {
      startIndex = 0;
    }
    const books = this.getBooks();
    const book = books.find(b => b.key == key);
    if(book) {
      book.name = name;
      book.size = size;
      book.startIndex = startIndex;
      book.stages = this.getBookStagesCountFromBoard(board, startIndex);
      book.board = board;
      book.color = color;
      if(newKey) {
        book.key = newKey;
        //TODO: update events if a key changes
      }
    } else {
      data.startIndex = startIndex;
      books.push(data);
    }

    this.saveBooks(books);
  },

  deleteBook(key, deleteHistory) {
    const books = this.getBooks().filter(b => b.key !== key);
    this.saveBooks(books);
    //TODO: should the history be deleted?
  },


  setBookRanges(key, ranges) {
    const normalized = ranges.map(r => ({
      s: Number(r.s),
      f: Number(r.f),
      t: Number(r.t)
    }));

    const conflicts = Utils.findCrossStageOverlaps(normalized);
    if(conflicts.length) {
      return {
        result: false,
        message: 'Ranges have overlaps',
        details: Utils.formatConflicts(conflicts)
      };
    }

    const merged = Utils.mergeRanges([], normalized);

    const book = this.getBook(key);
    book.state = book.state || {};
    book.state.ranges = merged;

    this.saveBooks(App.books);

    return {result: true};
  },

  addOrUpdateRange(key, range) {
    const inc = {
      s: Number(range.s),
      f: Number(range.f),
      t: Number(range.t)
    };

    const book = this.getBook(key);

    let existing = book.state?.ranges || [];

    existing = existing.map(r => ({
      s: Number(r.s),
      f: Number(r.f),
      t: Number(r.t)
    }));

    // 1. валидируем сам входящий диапазон (на случай мусора)
    const incomingConflicts = Utils.findCrossStageOverlaps([inc]);
    if(incomingConflicts.length) {
      return {
        result: false,
        message: 'Incoming range has overlaps',
        details: Utils.formatConflicts(incomingConflicts)
      };
    }

    // 2. убираем старую версию диапазона (если это update stage)
    const filteredExisting = existing.filter(ex => {
      return !(ex.f === inc.f && ex.t === inc.t);
    });

    // 3. проверяем конфликты с остальными диапазонами
    const conflicts = Utils.findConflictsBetween(filteredExisting, [inc]);
    if(conflicts.length) {
      return {
        result: false,
        message: 'Range conflicts with existing ranges',
        details: Utils.formatConflicts(conflicts)
      };
    }

    // 4. добавляем и нормализуем
    const merged = Utils.mergeRanges(filteredExisting, [inc]);

    if(!book.state) {
      book.state = {};
    }

    book.state.ranges = merged;

    this.saveBooks(App.books);

    return {
      result: true,
      message: null,
      details: null
    };
  },

  // updateBookState(key, incoming) {
  //   incoming = incoming.map(r => ({
  //     s: Number(r.s),
  //     f: Number(r.f),
  //     t: Number(r.t)
  //   }));
  //   const book = this.getBook(key);
  //   const incomingConflicts = Utils.findCrossStageOverlaps(incoming);
  //   if(incomingConflicts.length) {
  //     return {
  //       result: false,
  //       message: 'Incoming ranges have overlaps',
  //       details: Utils.formatConflicts(incomingConflicts)
  //     }
  //   }
  //   let existing = book.state?.ranges || [];
  //   if(existing.length) {
  //     existing = existing.map(r => ({
  //       s: Number(r.s),
  //       f: Number(r.f),
  //       t: Number(r.t)
  //     }));
  //     const existingConflicts = Utils.findCrossStageOverlaps(existing);
  //     if(existingConflicts.length) {
  //       return {
  //         result: false,
  //         message: 'Existing ranges have overlaps',
  //         details: Utils.formatConflicts(existingConflicts)
  //       }
  //     }

  //     //если диапазон совпадает по f/t — считаем это обновлением stage
  //     const updatedExisting = [];
  //     for(const ex of existing) {
  //       const replacement = incoming.find(inc => inc.f === ex.f && inc.t === ex.t);
  //       if(!replacement) {
  //         updatedExisting.push(ex);
  //       }
  //     }
  //     existing = updatedExisting;

  //     const conflicts = Utils.findConflictsBetween(existing, incoming);
  //     if(conflicts.length) {
  //       return {
  //         result: false,
  //         message: 'There are overlaps between incoming and existing ranges',
  //         details: Utils.formatConflicts(conflicts)
  //       }
  //     }
  //   }
  //   const merged = Utils.mergeRanges(existing, incoming);

  //   if(!book.state) {
  //     book.state = {}
  //   }

  //   book.state.ranges = merged;

  //   this.saveBooks(App.books);

  //   return {
  //     result: true,
  //     message: null,
  //     details: null
  //   }
  // },

};