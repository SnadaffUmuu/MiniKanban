import {App} from './App.js'
import {Storage} from './Storage.js'
import {Colors} from './Colors.js'
import {BoardDomain} from './BoardDomain.js';
import {Utils} from './Utils.js'
import {State} from './State.js';

export const BooksDomain = {

  getBooks() {
    return App.books || [];
  },

  getBook(key) {
    return App.books.find(b => b.key == key);
  },

  getFilteredBooksByOrder(orderProp) {
    return Utils.sortBy(this.getFilteredBooks(App.getFilter()), orderProp, true);
  },

  getFilteredBooks(filter) {
    let books = this.getBooks();
    const params = Object.keys(filter);
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
    return App.books.find(b => b.board == boardId && b.color == color);
  },

  getUnregisteredColorsForBoard(board) {
    const registeredColors = this.getBooks().filter(b => b.board == board.id).map(b => b.color);
    return BoardDomain.getColorsInUse(board).filter(c => !registeredColors.includes(c));
  },

  // getBookStagesCountFromBoard(boardId, startIndex) {
  //   const board = BoardDomain.getBoard(boardId);
  //   const lastIndex = board.columns.length - 1;
  //   return board.columns.filter((col, i) => {
  //     return i >= startIndex && i < lastIndex && !col.skipMove;
  //   }).length;
  // },

  // getStageAtIndex(cols, startIndex, currentIndex) {
  //   const skipped = cols.filter((col, i) => {
  //     return i >= startIndex && i < currentIndex && col.skipMove;
  //   }).length;

  //   return (currentIndex - startIndex) - skipped;
  // },

  saveBooks(books) {
    App.books = books;
    App.saveBooks(App.books);
  },

  save(data) {
    let {name, key, newKey, size, board, color} = data;
    // if(startIndex == null || startIndex == '') {
    //   startIndex = 0;
    // }
    const books = this.getBooks();
    const book = books.find(b => b.key == key);
    //const stages = this.getBookStagesCountFromBoard(board, startIndex);
    if(book) {
      book.name = name;
      book.size = size;
      // book.startIndex = startIndex;
      //book.stages = stages;
      book.board = board;
      book.color = color;
      if(newKey) {
        book.key = newKey;
        //TODO: update events if a key changes
      }
    } else {
      // data.startIndex = startIndex;
      //data.stages = stages;
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

    const newRanges = State.newRangesDraft;

    if (!newRanges) return;

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
  }

};