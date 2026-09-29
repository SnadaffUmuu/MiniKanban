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

  // Special value of `filter.board` selecting only archived books (they have
  // no live `board` to match against).
  ARCHIVED_FILTER: 'archived',

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

  // The most recent archive snapshot, chosen by timestamp rather than array
  // order (the array is append-only but should not be relied on for ordering).
  getLatestArchivedPeriod(book) {
    const periods = this.getArchivedPeriods(book);
    if(!periods.length) return null;
    return periods.reduce((latest, period) =>
      period.ts > latest.ts ? period : latest);
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
              predicates.push(filter[param] === this.ARCHIVED_FILTER
                ? this.isArchived(book)
                : book.board == filter[param]);
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

  // Полуширина силуэта на заданной высоте v ∈ [0,1] (0 = низ, 1 = верх).
  // Значения нормированы к 1.0 в самой широкой точке.
  // peak < 0.5 → максимальная ширина ниже центра → низ шире верха.
  // spread > 1 → оба конца остаются скруглёнными (овал, а не "капля").
  shapeHalfWidth(v) {
    const peak = 0.38;
    const spread = 1.35;
    const dy = (v - peak) / spread;
    return Math.sqrt(Math.max(0, 1 - dy * dy));
  },

  // Раскладывает total точек на rows рядов пропорционально весам weights,
  // так что сумма counts == total и каждый ряд >= 1 (метод наибольших остатков).
  apportion(total, weights) {
    const n = weights.length;
    const counts = new Array(n).fill(1);
    const surplus = total - n;
    if (surplus <= 0) return counts;

    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    const raw = weights.map(w => (surplus * w) / sum);

    // сначала целые части
    raw.forEach((v, i) => { counts[i] += Math.floor(v); });

    // остаток раздаём по дробной части (убывание)
    const order = raw
      .map((v, i) => ({ i, f: v - Math.floor(v) }))
      .sort((a, b) => b.f - a.f);

    const rem = surplus - raw.reduce((a, b) => a + Math.floor(b), 0);
    for (let j = 0; j < rem; j++) counts[order[j % n].i] += 1;

    return counts;
  },

  buildTreeLayout(pageCount, width = 300, height = 300) {
    const positions = [];
    if (!pageCount || pageCount < 1) return positions;

    // Число рядов подбираем по корню, чтобы плотность точек была равномерной
    // и в высоту, и в ширину.
    const rows = Math.min(
      pageCount,
      Math.max(1, Math.ceil(Math.sqrt(pageCount * 1.35)))
    );

    // Вес ряда = полуширина силуэта на этой высоте.
    const weights = [];
    for (let k = 0; k < rows; k++) {
      weights.push(this.shapeHalfWidth(rows === 1 ? 0.5 : k / (rows - 1)));
    }

    // Точное количество точек в каждом ряду.
    const counts = this.apportion(pageCount, weights);
    const widest = counts.reduce((a, b) => Math.max(a, b), 1);

    // Радиус: чтобы между соседними кружками оставался зазор.
    const vPitch = height / rows;
    const hPitch = width / widest;
    const r = Math.min(vPitch, hPitch) * 0.38;

    const step = rows > 1 ? (height - 2 * r) / (rows - 1) : 0;
    const bottomY = height - r;
    const centerX = width / 2;
    const halfBase = (width - 2 * r) / 2;

    let page = 1;

    // Ряды снизу вверх (k=0 → нижний ряд, k=rows-1 → верхний).
    for (let k = 0; k < rows; k++) {
      const c = counts[k];
      const v = rows === 1 ? 0.5 : k / (rows - 1);
      const halfW = this.shapeHalfWidth(v) * halfBase;
      const y = bottomY - k * step;

      // Точки ряда равномерно по его ширине, по центру оси.
      for (let i = 0; i < c && page <= pageCount; i++) {
        const x = c === 1
          ? centerX
          : centerX + halfW * ((2 * i) / (c - 1) - 1);
        positions.push({ page, x, y, r });
        page++;
      }
    }

    return positions;
  },

  // Возвращает количество уникальных страниц, покрытых ranges.
  // ranges — это массив {f, t} (включительно), колонка c игнорируется.
  // Пересекающиеся/вложенные интервалы сливаются, чтобы не дублировать.
  getStartedPageCount(book) {
    const ranges = (book && book.state && book.state.ranges) || [];
    if (!ranges.length) return 0;

    const intervals = ranges
      .map(r => ({ f: Number(r.f), t: Number(r.t) }))
      .filter(r => r.f <= r.t)
      .sort((a, b) => a.f - b.f);

    let count = 0;
    let cur = null;
    for (const r of intervals) {
      if (!cur) { cur = { f: r.f, t: r.t }; continue; }
      if (r.f <= cur.t + 1) { // пересечение или смежность
        cur.t = Math.max(cur.t, r.t);
      } else {
        count += cur.t - cur.f + 1;
        cur = { f: r.f, t: r.t };
      }
    }
    if (cur) count += cur.t - cur.f + 1;
    return count;
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