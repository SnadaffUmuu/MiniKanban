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

  getBookRanges(key) {
    return this.getBook(key).state?.ranges;
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
    const stages = this.getBookStagesCountFromBoard(board, startIndex);
    if(book) {
      book.name = name;
      book.size = size;
      book.startIndex = startIndex;
      book.stages = stages;
      book.board = board;
      book.color = color;
      if(newKey) {
        book.key = newKey;
        //TODO: update events if a key changes
      }
    } else {
      data.startIndex = startIndex;
      data.stages = stages;
      books.push(data);
    }

    this.saveBooks(books);
  },

  deleteBook(key, deleteHistory) {
    const books = this.getBooks().filter(b => b.key !== key);
    this.saveBooks(books);
    //TODO: should the history be deleted?
  },

  getNewRangesForRanges(rangesFromForm) {
    const normalized = rangesFromForm.map(r => ({
      s: Number(r.s),
      f: Number(r.f),
      t: Number(r.t)
    }));

    // 1. базовая валидация
    for(const r of normalized) {
      if(r.f > r.t) {
        return {
          result: false,
          message: `Invalid range ${r.f}-${r.t}`,
          details: null
        };
      }
    }

    // 2. проверка неоднозначных пересечений
    const conflicts = Utils.findAmbiguousOverlaps(normalized);

    if(conflicts.length) {
      return {
        result: false,
        message: 'Ambiguous overlaps detected',
        details: Utils.formatConflicts(conflicts)
      };
    }

    // 3. применяем ranges последовательно (порядок уже не важен!)
    let result = [];

    for(const r of normalized) {
      result = this.applyRange(result, r);
    }

    return {
      result: true,
      ranges: result
    };
  },

  setBookRanges(key, newRanges) {
    const book = this.getBook(key);

    if(!book.state) {
      book.state = {};
    }

    book.state.ranges = newRanges;

    this.saveBooks(App.books);

    return {result: true};
  },

  getNewRangesForRange(key, range) {
    const inc = {
      s: Number(range.s),
      f: Number(range.f),
      t: Number(range.t)
    };

    const book = this.getBook(key);

    const existing = (book.state?.ranges || []).map(r => ({
      s: Number(r.s),
      f: Number(r.f),
      t: Number(r.t)
    }));

    return this.applyRange(existing, inc);
  },

  addOrUpdateRange(bookKey, newRanges) {

    const book = this.getBook(bookKey);

    if(!book.state) {
      book.state = {};
    }

    book.state.ranges = newRanges;

    this.saveBooks(App.books);

    return {
      result: true,
      message: null,
      details: null
    };
  },

  applyRange(existing, inc) {
    const result = [];

    for(const ex of existing) {
      // нет пересечения
      if(ex.t < inc.f || ex.f > inc.t) {
        result.push(ex);
        continue;
      }

      // левая часть
      if(ex.f < inc.f) {
        result.push({
          s: ex.s,
          f: ex.f,
          t: inc.f - 1
        });
      }

      // правая часть
      if(ex.t > inc.t) {
        result.push({
          s: ex.s,
          f: inc.t + 1,
          t: ex.t
        });
      }
    }

    result.push(inc);

    return Utils.mergeRanges(result, []);
  },

};