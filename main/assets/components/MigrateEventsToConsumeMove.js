import {BoardDomain} from "./BoardDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {EventsDomain} from "./EventsDomain.js";

export const  MigrateEventsToConsumeMove = {

  migrateEvent(event) {
    const book = BooksDomain.getBook(event.b);
    const board = BoardDomain.getBoard(book.board);

    let res = {
      ts: event.ts,
      d: event.d,
      b: event.b,
      c2: event.c,
      t: event.to,
      f: event.fr
    };


    //Старые данные: skipMove. Если false, пишем как cm = true; Если не указано, пишем cm = true
    if (event.sm === false) {
      res.cm = true;
    }

    return res;

  },  

  migrateEvents() {
    const migrated = EventsDomain.getEvents().map(event => this.migrateEvent(event));
    console.log('migrated events', migrated);
    EventsDomain.saveEvents(migrated);
  },
};