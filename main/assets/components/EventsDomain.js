import {App} from "./App.js"
import {Utils} from "./Utils.js";
import { BooksDomain } from "./BooksDomain.js";

export const EventsDomain = {

  format(ts) {
    return ts.toISOString().slice(0, 10);
  },

  eventTypes: {
    progress: 'p',
    rollback: 'r'
  },

  getEvents() {
    return App.events !== null ? App.events : App.loadEvents();
  },

  getEventsForBook(bookKey, isAsc) {
    const res = this.getEvents().filter(ev => ev.b == bookKey);
    return Utils.sortBy(res, 'd', isAsc);
  },

  getEventsForDate(date, isAsc) {
    const res = this.getEvents().filter(ev => ev.d == date);
    return Utils.sortBy(res, 'd', isAsc);
  },

  getEventsForBookAndDate(bookKey, date, isAsc) {
    const res = this.getEvents().filter(ev => ev.d == date && ev.b == bookKey);
    return Utils.sortBy(res, 'd', isAsc);
  },

  getFilteredEvents(filter) {
    let events = [...Utils.sortBy(this.getEvents(), 'ts', false)];
    const params = Object.keys(filter);
    if(params.length) {
      events = events.filter(ev => {
        let predicates = [];
        params.forEach(param => {
          switch(param) {
            case 'board':
              predicates.push(BooksDomain.getBook(ev.b).board == filter[param]);
              break;
            case 'book':
              predicates.push(ev.b == filter[param]);
              break;
          }
        });
        return predicates.every(pr => pr === true);
      });
    }
    return events;
  },

  saveEvents(events) {
    if(events) {
      App.events = events;
    }
    App.saveEvents();
  },

  log({type, book, date, col, data}) {
    const response = {};
    const ts = new Date();
    if(!date) {
      date = this.format(ts);
    }
    const events = this.getEvents();
    try {
      if(data.type == this.eventTypes.rollback) {
        this.saveEvents(App.events.filter(ev => ev.b == book && d == date));
      } else {
        const res = {
          ts: ts.getTime(),
          d: date,
          b: book,
          t: type,
          c: col,
        };
        if(type == this.eventTypes.progress) {
          res.r = data.ranges;
        }
        events.push(res);
        this.saveEvents(events);
      }
      response.result = true;
      return response;
    } catch(e) {
      console.error(e);
      response.result = false;
      response.message = 'Ошибка при сохранении события';
      response.details = e;
      return response;
    }

  },

};