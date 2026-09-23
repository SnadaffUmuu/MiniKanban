import {App} from './App.js'
import {BoardDomain} from './BoardDomain.js';
import {Utils} from './Utils.js'
import {State} from './State.js';
import {Colors} from './Colors.js';

export const BooksDomain = {

  getBooks() {
    return App.books || [];
  },

  getBook(key) {
    return App.books.find(b => b.key == key);
  },

  // --- Archive ---

  // A book is archived iff the explicit marker is set. The length of the
  // `archived` array means nothing on its own: a restored book keeps every
  // entry of its history, so it stays > 0 while the book is active.
  isArchived(book) {
    return !!book && book.archivedNow === true;
  },

  getActiveBooks() {
    return this.getBooks().filter(b => !this.isArchived(b));
  },

  getArchivedBooks() {
    return this.getBooks().filter(b => this.isArchived(b));
  },

  getArchivedPeriods(book) {
    return (book && book.archived) || [];
  },

  // Resolves the board/color a book had at a given timestamp.
  // Each entry of `archived` stores the board/color at the moment that
  // binding stopped being live, so the entry with the smallest ts >= event ts
  // owns the event. Events newer than every entry belong to the root binding
  // (which is absent while the book is archived).
  getBindingAt(book, ts) {
    if(!book) return null;

    const periods = this.getArchivedPeriods(book);
    let next = null;

    periods.forEach(period => {
      if(period.ts >= ts && (next === null || period.ts < next.ts)) {
        next = period;
      }
    });

    if(next) {
      return {
        board: next.board,
        color: next.color
      };
    }

    if(book.board == null) return null;

    return {
      board: book.board,
      color: book.color
    };
  },

  getBoardAt(bookKey, ts) {
    const binding = this.getBindingAt(this.getBook(bookKey), ts);
    return binding ? binding.board : null;
  },

  getColorAt(bookKey, ts) {
    const binding = this.getBindingAt(this.getBook(bookKey), ts);
    return binding ? binding.color : null;
  },

  // Every board this book touched during the given month ('YYYY-MM').
  // Used by the "average per month" stat, which spans the whole history of a
  // book and therefore may need more than one board for a single row (a board
  // change inside a month is rare but possible after restore).
  getBoardNamesOfBookForMonth(bookKey, month) {
    const book = this.getBook(bookKey);
    if(!book) return [];

    const [year, monthNumber] = month.split('-').map(v => Number(v));
    const monthStart = new Date(year, monthNumber - 1, 1).getTime();
    const monthEnd = new Date(year, monthNumber, 1).getTime();

    const used = [];
    const addBoard = (boardId) => {
      if(boardId == null) return;
      const board = BoardDomain.getBoard(boardId);
      if(board && !used.includes(board.name)) {
        used.push(board.name);
      }
    };

    // Sample the binding at the start, middle and end of the month; collect
    // every distinct board (board changes inside a month are rare but possible
    // right after a restore).
    const bindingStart = this.getBindingAt(book, monthStart);
    const bindingMid = this.getBindingAt(book, Math.floor((monthStart + monthEnd) / 2));
    const bindingEnd = this.getBindingAt(book, monthEnd);

    [bindingStart, bindingMid, bindingEnd].forEach(binding => {
      if(binding) {
        addBoard(binding.board);
      }
    });

    return used;
  },


  archiveBook(key, ts) {
    const book = this.getBook(key);

    if(!book) {
      return {
        result: false,
        message: `Book "${key}" not found`,
        details: null
      };
    }

    if(this.isArchived(book)) {
      return {
        result: false,
        message: `Book "${key}" is already archived`,
        details: null
      };
    }

    if(book.board == null || book.color == null) {
      return {
        result: false,
        message: `Book "${key}" has no board/color to archive`,
        details: null
      };
    }

    if(!book.archived) {
      book.archived = [];
    }

    book.archived.push({
      ts: ts != null ? ts : Date.now(),
      board: book.board,
      color: book.color
    });

    delete book.board;
    delete book.color;
    book.archivedNow = true;

    this.saveBooks(App.books);

    return {
      result: true,
      message: null,
      details: null
    };
  },

  restoreBook(key, {board, color}) {
    const book = this.getBook(key);

    if(!book) {
      return {
        result: false,
        message: `Book "${key}" not found`,
        details: null
      };
    }

    if(!this.isArchived(book)) {
      return {
        result: false,
        message: `Book "${key}" is not archived`,
        details: null
      };
    }

    const theBoard = BoardDomain.getBoard(board);

    if(!theBoard) {
      return {
        result: false,
        message: 'Choose a board',
        details: null
      };
    }

    if(!color || !Colors[color]) {
      return {
        result: false,
        message: 'Choose a color',
        details: null
      };
    }

    if(!this.getUnregisteredColorsForBoard(theBoard).includes(color)) {
      return {
        result: false,
        message: `Color "${color}" is already registered on this board`,
        details: null
      };
    }

    book.board = board;
    book.color = color;
    book.archivedNow = false;

    this.saveBooks(App.books);

    return {
      result: true,
      message: null,
      details: null
    };
  },

  getFilteredBooksByOrder(orderProp) {
    return Utils.sortBy(this.getFilteredBooks(App.getFilter()), orderProp, true);
  },

  getFilteredBooks(filter) {
    let books = this.getBooks();
    const params = Object.keys(filter || {});
    if(params.length) {
      books = books.filter(book => {
        let predicates = [];
        params.forEach(param => {
          switch(param) {
            case 'board':
              predicates.push(book.board == filter[param]);
              break;
            case 'books':
              predicates.push(filter[param].includes(book.key));
              break;
          }
        });
        return predicates.every(pr => pr === true);
      });
    }
    console.log('filtered books', books);
    return books;
  },

  getBookRanges(key) {
    return this.getBook(key).state?.ranges;
  },

  betBookByBoard(boardId, color) {
    const candidates = this.getBooks().filter(b => b.board == boardId && b.color == color);
    //Archived books have no root board/color, but stay defensive: an active
    //book owns the binding whenever both exist.
    return candidates.find(b => !this.isArchived(b)) || candidates[0];
  },

  getUnregisteredColorsForBoard(board) {
    const registeredColors = this.getActiveBooks().filter(b => b.board == board.id).map(b => b.color);
    return BoardDomain.getColorsInUse(board).filter(c => !registeredColors.includes(c));
  },

  saveBooks(books) {
    App.books = books;
    App.saveBooks(App.books);
  },

  save(data) {
    let {name, key, newKey, size, board, color} = data;
    const books = this.getBooks();
    const book = books.find(b => b.key == key);
    if(book) {
      book.name = name;
      book.size = size;
      //An archived book owns no board/color: keep whatever binding it has
      //instead of resurrecting one from a read-only form.
      if(!this.isArchived(book)) {
        book.board = board;
        book.color = color;
      }
      if(newKey) {
        book.key = newKey;
        //TODO: update events if a key changes
      }
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

  getNewRangesForRanges(rangesFromForm) {
    const normalized = rangesFromForm.map(r => ({
      c: Number(r.c),
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

    if(newRanges == null) {
      //remove
      if(book.state && book.state.ranges) {
        delete book.state.ranges;
      }
    } else {
      if(!book.state) {
        book.state = {};
      }

      book.state.ranges = newRanges;
    }

    this.saveBooks(App.books);

    return {result: true};
  },

  getNewRangesForRange(key, range) {
    const inc = {
      c: Number(range.c),
      f: Number(range.f),
      t: Number(range.t)
    };

    const book = this.getBook(key);

    const existing = (book.state?.ranges || []).map(r => ({
      c: Number(r.c),
      f: Number(r.f),
      t: Number(r.t)
    }));

    return this.applyRange(existing, inc);
  },

  addOrUpdateRange(bookKey) {

    this.takeBookSnapshot(bookKey);

    const newRanges = State.newRangesDraft;

    if(!newRanges) return;

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
          c: ex.c,
          f: ex.f,
          t: inc.f - 1
        });
      }

      // правая часть
      if(ex.t > inc.t) {
        result.push({
          c: ex.c,
          f: inc.t + 1,
          t: ex.t
        });
      }
    }

    result.push(inc);

    return Utils.mergeRanges(result, []);
  },

  buildTreeLayout(pageCount, width = 300, height = 300) {
    // Подбираем число рядов так, чтобы вместить все страницы.
    // Для 300 страниц получится около 24 рядов.
    const rowsCount = Math.ceil(Math.sqrt(pageCount * 2));

    // Вместимость рядов.
    // Верхний ряд = 1 место.
    // Нижний ряд = rowsCount мест.
    const capacities = [];

    for(let row = 1;row <= rowsCount;row++) {
      capacities.push(row);
    }

    const totalCapacity =
      capacities.reduce((a, b) => a + b, 0);

    // Если рядов не хватило — добавляем еще.
    while(totalCapacity < pageCount) {
      capacities.push(capacities.length + 1);
    }

    const positions = [];

    let page = 1;

    const rowHeight =
      height / capacities.length;

    // Заполняем снизу вверх.
    for(let rowIndex = capacities.length - 1;
      rowIndex >= 0;
      rowIndex--) {

      const slots = capacities[rowIndex];

      const y =
        height -
        (capacities.length - rowIndex - 0.5) *
        rowHeight;

      const rowWidth =
        width * (slots / capacities.length);

      const startX =
        (width - rowWidth) / 2;

      const step =
        rowWidth / Math.max(slots - 1, 1);

      for(let slot = 0;
        slot < slots && page <= pageCount;
        slot++) {

        positions.push({
          page,
          x:
            slots === 1
              ? width / 2
              : startX + slot * step,
          y
        });

        page++;
      }
    }

    return positions;
  },

  takeBookSnapshot(bookKey) {
    State.undoSnapshot.bookSnapshot = JSON.parse(JSON.stringify(this.getBook(bookKey)));
  },

  undoFromSnapshot() {
    if (!State.undoSnapshot.bookSnapshot) return;
    const books = this.getBooks();
    const snapshot = State.undoSnapshot.bookSnapshot;
    const index = books.findIndex(book => book.key === snapshot.key);
    if(index !== -1) {
      books[index] = snapshot;
    }
    this.saveBooks(books);
    State.undoSnapshot.bookSnapshot = null;
  },

};