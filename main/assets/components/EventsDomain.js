import {App} from "./App.js"
import {Utils} from "./Utils.js";
import {BooksDomain} from "./BooksDomain.js";
import {BoardDomain} from "./BoardDomain.js";

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
    //let events = [...Utils.sortBy(this.getEvents(), 'ts', false)];
    let events = this.getEvents();
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

  generateCalendar(events) {

    if(!events.length) {
      return [];
    }

    const newDate = (dateStr) => {
      const [y, m, d] = dateStr.split('-');
      return new Date(y, m - 1, d);
    };

    //events map
    const eventsMap = {};

    events.forEach(event => {
      if(!eventsMap[event.d]) {
        eventsMap[event.d] = [];
      }
      const obj = {
        book: event.b,
        board: BoardDomain.getBoard(BooksDomain.getBook(event.b).board).key
      }
      if(event.r) {
        obj.r = event.r;
      }
      eventsMap[event.d].push(obj);

    });

    console.log(eventsMap);

    //range
    const startEvent = newDate(events[0].d);

    const start = new Date(
      startEvent.getFullYear(),
      startEvent.getMonth(),
      1
    );
    const endEvent = newDate(events[events.length - 1].d);

    const end = new Date(
      endEvent.getFullYear(),
      endEvent.getMonth() + 1,
      0
    );

    //calendar
    const calendar = [];

    let currentMonthObj = null;
    let currentWeekObj = null;

    //const current = new Date(start);
    const current = start;

    while(current <= end) {

      const year = current.getFullYear();
      const month = current.getMonth() + 1;
      const day = current.getDate();

      // Monday = 1 ... Sunday = 0
      const jsWeekday = current.getDay();
      const weekday = jsWeekday === 0
        ? 7 : jsWeekday;      
        
      const dateString = year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
      console.log(current)
      console.log(dateString)
      console.log(day)

      // new month
      if(
        !currentMonthObj ||
        currentMonthObj.month !== month ||
        currentMonthObj.year !== year
      ) {

        currentMonthObj = {
          year,
          month,
          weeks: []
        };

        calendar.push(currentMonthObj);
        currentWeekObj = null;
      }

      //new week
      if(
        !currentWeekObj ||
        weekday === 1 // monday
      ) {

        currentWeekObj = {
          partial: false,
          days: []
        };
        currentMonthObj.weeks.push(currentWeekObj);
      }

      // day
      currentWeekObj.days.push({
        date: dateString,
        day,
        weekday,
        events: eventsMap[dateString] || []
      });

      //next day
      current.setDate(current.getDate() + 1);

    }

    //partial weeks
    calendar.forEach(month => {
      month.weeks.forEach(week => {
        const first = week.days[0];
        const last = week.days[week.days.length - 1];
        const startsMonday = first.weekday === 1;
        const endsSunday = last.weekday === 7;
        week.partial = !startsMonday || !endsSunday;
      });

    });

    return calendar;

  }

};