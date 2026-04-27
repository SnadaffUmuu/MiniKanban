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
    const events = App.events ? App.events : App.loadEvents();
    return events || [];
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

  saveEvents(events) {
    App.events = events;
    App.saveEvents(App.events);
  },

  log({type, book, date, data}) {
    //TODO log for 
    if(!date) {
      const ts = new Date();
      date = format(ts);
    }
    const events = this.getEvents();
    if(data.type == this.eventTypes.rollback) {
      this.saveEvents(App.events.filter(ev => ev.b == book && d == date));
    } else {
      const res = {
        d: date,
        b: book,
        t: data.type,
      };
      if(type == this.eventTypes.progress) {
        res.f = data.from,
        res.to = data.to,
        res.s = data.stage
      }
      //TODO: manual
      this.saveEvents(App.events.push(res));
    }

  },

};