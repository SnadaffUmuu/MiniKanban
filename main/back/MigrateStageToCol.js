import {BoardDomain} from "./BoardDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {EventsDomain} from "./EventsDomain.js";

/**
 * Логика миграции:
 *
 * stage -> column
 *
 * Правила:
 * - учитываем startIndex книги
 * - skipMove НЕ увеличивает stage
 * - если stage соответствует двум колонкам,
 *   выбираем колонку ПОСЛЕ skipMove
 *
 * Пример:
 *
 * 0 -> 1 -> 2(skip) -> 3 -> 4
 *
 * startIndex = 0
 *
 * column: 0 => stage 0
 * column: 1 => stage 1
 * column: 2(skip) => stage 2
 * column: 3 => stage 2   <-- выбираем ЭТУ
 * column: 4 => stage 3
 */
export const MigrateStageToCol = {

  /**
   * Возвращает effective stage для конкретной колонки.
   */
  getStageByColumn(columnIndex, board, startIndex = 0) {
    const columns = board.columns;

    let stage = 0;

    for(let i = startIndex + 1;i <= columnIndex;i++) {
      const prevColumn = columns[i - 1];

      // stage растет, только если ИЗ предыдущей колонки
      // move НЕ skipMove
      if(!prevColumn?.skipMove) {
        stage++;
      }
    }

    return stage;
  },

  /**
   * Находит колонку по stage.
   *
   * Если stage соответствует нескольким колонкам,
   * выбирается колонка ПОСЛЕ skipMove.
   */
  findColumnByStage(stage, board, startIndex = 0) {
    const columns = board.columns;

    let matchedColumn = startIndex;

    for(let i = startIndex;i < columns.length;i++) {
      const currentStage = this.getStageByColumn(i, board, startIndex);

      if(currentStage === stage) {
        // продолжаем искать дальше —
        // так мы автоматически выберем
        // колонку после skipMove
        matchedColumn = i;
      }

      if(currentStage > stage) {
        break;
      }
    }

    return matchedColumn;
  },

  /**
   * Миграция одной книги.
   */
  migrateBook(book) {

    const startIndex = Number(book.startIndex || 0);

    const migratedRanges = (book.state?.ranges || []).map(range => {
      const stage = Number(range.s);

      const column = this.findColumnByStage(
        stage,
        BoardDomain.getBoard(book.board),
        startIndex
      );

      return {
        c: column,
        f: range.f,
        t: range.t
      };
    });

    return {
      ...book,

      state: {
        ...book.state,
        ranges: migratedRanges
      }
    };
  },

  migrateEvent(event) {
    const book = BooksDomain.getBook(event.b);
    const board = BoardDomain.getBoard(book.board);
    const startIndex = Number(book.startIndex || 0);

    let res = {
      ...event
    };

    if (res.type == 'progres') {
      res.type = 'p'
    }

    delete res.board;
    
    if(res.r) {
      const range = Array.isArray(res.r) ? res.r[0] : res.r;
      res.fr = range.f;
      res.to = range.t
      if(range.s && !res.c) {
        res.c = this.findColumnByStage(
          Number(range.s),
          board,
          startIndex
        );
      }
      delete res.r
    }

    return res;

  },

  migrateEvents() {

    const migrated = EventsDomain.getEvents().map(event => this.migrateEvent(event));

    console.log('migrated events', migrated);

    EventsDomain.saveEvents(migrated);

  },

  migrateBooks() {

    const migrated = BooksDomain.getBooks().map(book => this.migrateBook(book));

    console.log('migrated books', migrated);

    BooksDomain.saveBooks(migrated);

  },

  migrate() {
    this.migrateBooks();
    this.migrateEvents();
  },

};

