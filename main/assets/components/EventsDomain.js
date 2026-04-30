import {App} from "./App.js";

export const EventsDomain = {

  format(ts) {
    return ts.toISOString().slice(0, 10);
  },

  eventTypes: {
    progress: 'progress',
    manual: 'manual',
    rollback: 'rollback'
  },

  getEvents() {
    return App.events !== null ? App.events : App.loadEvents();
  },

  getEventsForBook(bookKey, isAsc) {
    const res = this.getEvents().filter(ev => ev.b == bookKey);
    if(isAsc) {
      return res.sort((a, b) => a.date > b.date ? 1 : -1);
    } else {
      return res.sort((a, b) => a.date > b.date ? -1 : 1);
    }
  },

  getEventsForDate(date, isAsc) {
    const res = this.getEvents().filter(ev => ev.d == date);
    if(isAsc) {
      return res.sort((a, b) => a.date > b.date ? 1 : -1);
    } else {
      return res.sort((a, b) => a.date > b.date ? -1 : 1);
    }
  },

  getEventsForBookAndDate(bookKey, date, isAsc) {
    const res = this.getEvents().filter(ev => ev.d == date && ev.b == bookKey);
    if(isAsc) {
      return res.sort((a, b) => a.date > b.date ? 1 : -1);
    } else {
      return res.sort((a, b) => a.date > b.date ? -1 : 1);
    }
  },

  sortBy(events, key, isAsc) {
    console.log('isAcs', isAsc);
    if(isAsc) {
      return events.sort((a, b) => a[key] > b[key] ? 1 : -1);
    } else {
      return events.sort((a, b) => a[key] > b[key] ? -1 : 1);
    }
  },

  saveEvents(events) {
    if(events) {
      App.events = events;
    }
    App.saveEvents();
  },

  log({type, book, date, data}) {
    //TODO log for 
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
        };
        if(type == this.eventTypes.progress) {
          res.r = data.ranges;
            // res.f = data.f,
            // res.to = data.to,
            // res.s = data.s
        }
        //TODO: manual
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