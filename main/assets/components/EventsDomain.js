import {App} from "./App.js"
import {Utils} from "./Utils.js";
import {BooksDomain} from "./BooksDomain.js";
import {BoardDomain} from "./BoardDomain.js";
import {RanksDomain} from "./RanksDomain.js";
import {State} from "./State.js";

export const EventsDomain = {

  format(ts) {
    return ts.toISOString().slice(0, 10);
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
    filter = filter || {};
    let events = this.checkSkipMoved(this.getEvents(), filter);

    // Events of archived books are shown by default; they are only hidden when
    // the filter explicitly sets includeArchived to false (the "incl. archived?"
    // filter, which is checked by default).
    if(filter && filter.includeArchived === false) {
      events = events.filter(ev => {
        const book = BooksDomain.getBook(ev.b);
        return !book || !BooksDomain.isArchived(book);
      });
    }

    const params = Object.keys(filter);
    if(params.length) {
      events = events.filter(ev => {
        let predicates = [];
        params.forEach(param => {
          switch(param) {
            case 'board':
              predicates.push(filter[param] === BooksDomain.ARCHIVED_FILTER
                ? BooksDomain.isArchived(BooksDomain.getBook(ev.b))
                : this.resolveEventBoard(ev) == filter[param]);
              break;
            case 'books':
              predicates.push(filter[param].includes(ev.b));
              break;
            case 'dateFrom':
              predicates.push(ev.d >= filter[param]);
              break;
            case 'dateTo':
              predicates.push(ev.d <= filter[param]);
              break;
          }
        });
        return predicates.every(pr => pr === true);
      });
    }
    console.log('filtered events', events);
    return events;
  },

  getAvailableDateRange(filter) {
    const filterWithoutDates = {};
    Object.keys(filter || {}).forEach(param => {
      if(param !== 'dateFrom' && param !== 'dateTo') {
        filterWithoutDates[param] = filter[param];
      }
    });
    const events = this.getFilteredEvents(filterWithoutDates);
    if(!events.length) return null;

    let min = events[0].d;
    let max = events[0].d;
    events.forEach(event => {
      if(event.d < min) min = event.d;
      if(event.d > max) max = event.d;
    });
    return {min: min, max: max};
  },

  getEffectiveDateRange(filter) {
    const available = this.getAvailableDateRange(filter);
    if(!available) return null;
    const from = filter && filter.dateFrom ? filter.dateFrom : available.min;
    const to = filter && filter.dateTo ? filter.dateTo : available.max;
    return from <= to ? {from: from, to: to} : null;
  },

  filterEventsByDateRange(events, range) {
    if(!range) return [];
    return events.filter(event => event.d >= range.from && event.d <= range.to);
  },

  getEventsForEffectiveDateRange(filter) {
    return this.filterEventsByDateRange(
      this.getEvents(),
      this.getEffectiveDateRange(filter)
    );
  },

  getFilteredEventsByDefaultOrder() {
    return Utils.sortBy(this.getFilteredEvents(App.getFilter()), 'ts', false);
  },

  getFilteredEventsByOrder(isAsc) {
    return Utils.sortBy(this.getFilteredEvents(App.getFilter()), 'ts', isAsc);
  },

  saveEvents(events) {
    if(events) {
      App.events = events;
    }
    App.saveEvents();
  },

  log({book, consumeMove, from, to}) {
    const ts = new Date();
    const date = this.format(ts);
    const events = this.getEvents();
    try {
      const res = {
        ts: ts.getTime(),
        d: date,
        b: book,
        c1: State.progressData.sourceIndex,
        c2: State.progressData.targetIndex,
        f: from,
        t: to
      };
      if(consumeMove === true) {
        res.cm = true;
      }
      events.push(res);

      State.undoSnapshot.logged = true;
      
      this.saveEvents(events);

      const response = {};
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

  generateCalendar(events, range) {

    if(!range) {
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
        board: this.resolveEventBoard(event),
        color: this.resolveEventColor(event),
      }
      if(event.r) {
        obj.r = event.r;
      }
      if(!event.cm) {
        obj.sm = true;
      }
      eventsMap[event.d].push(obj);

    });

    console.log(eventsMap);

    //range
    const firstDate = range.from;
    const lastDate = range.to;

    const startEvent = newDate(firstDate);
    const start = new Date(
      startEvent.getFullYear(),
      startEvent.getMonth(),
      1
    );
    const endEvent = newDate(lastDate);
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
      // console.log(current)
      // console.log(dateString)
      // console.log(day)

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

  },

  addBoardsDataToEvents(events) {
    return events.map(ev => ({
      ...ev,
      board: this.resolveEventBoard(ev),
      color: this.resolveEventColor(ev)
    }));
  },

  // Resolves which board/color a book event belonged to at the time it was
  // logged. The event's own timestamp drives the lookup, so historical events
  // keep their true board/color even after the book was archived and restored
  // elsewhere.
  resolveEventBoard(ev) {
    return BooksDomain.getBoardAt(ev.b, ev.ts);
  },

  resolveEventColor(ev) {
    return BooksDomain.getColorAt(ev.b, ev.ts);
  },

  groupByMonth(events) {
    const result = {};

    events.forEach(event => {
      const month = event.d.slice(0, 7);

      if(!result[month]) {
        result[month] = [];
      }

      result[month].push(event);
    });

    return result;
  },

  getMonthStats(events) {
    const months = this.groupByMonth(this.checkSkipMoved(events));

    return Object.entries(months).map(([month, items]) => {
      const uniqueDays = new Set(items.map(i => i.d));

      return {
        month,
        totalEvents: items.length,
        activeDays: uniqueDays.size,
        avgPerDay: (
          items.length / uniqueDays.size
        ).toFixed(1)
      };
    });
  },

  getBoardDistribution(events) {
    events = this.addBoardsDataToEvents(this.checkSkipMoved(events));
    const months = this.groupByMonth(events);

    return Object.entries(months).map(([month, items]) => {
      const total = items.length;

      const grouped = {};

      items.forEach(item => {
        if(grouped[item.board] == null) {
          grouped[item.board] = 0;
        }
        grouped[item.board]++;
      });

      const distribution = Object.entries(grouped)
        .map(([board, count]) => {
          board = BoardDomain.getBoard(board).name;
          return {
            board,
            count,
            percent: (
              count / total * 100
            ).toFixed(1)
          }
        })
        .sort((a, b) => b.count - a.count);

      return {
        month,
        total,
        distribution
      };
    });

  },

  calculateMonthlyRate(events, allEvents = events) {
    events = this.checkSkipMoved(this.addBoardsDataToEvents(events));
    allEvents = this.checkSkipMoved(allEvents);

    if(!events.length || !allEvents.length) {
      return [];
    }

    const grouped = {};

    // --- глобальный период по ВСЕМ данным ---
    const allDates = allEvents.map(
      e => new Date(e.d)
    );

    const globalFirst = new Date(
      Math.min(...allDates)
    );

    const globalLast = new Date(
      Math.max(...allDates)
    );

    const globalDays = Math.max(
      1,
      Math.ceil(
        (globalLast - globalFirst) /
        (1000 * 60 * 60 * 24)
      ) + 1
    );

    // --- группировка только видимых событий ---
    events.forEach(event => {

      if(grouped[event.b] == null) {
        grouped[event.b] = {
          boards: new Set(),
          totalEvents: 0
        };
      }

      grouped[event.b].totalEvents++;

      if(event.board != null) {
        grouped[event.b].boards.add(event.board);
      }

    });

    // --- расчет ---
    const result = [];

    Object.entries(grouped).forEach(
      ([book, data]) => {

        const monthlyRate =
          data.totalEvents /
          globalDays *
          30;

        const boardNames = [...data.boards]
          .map(id => BoardDomain.getBoard(id).name)
          .join(', ');

        result.push({
          book,
          board: boardNames,
          totalEvents: data.totalEvents,
          avgPerMonth: monthlyRate.toFixed(1)
        });

      }
    );

    return result;
  },

  //соответствует ли фактическая работа по доскам их целевому ratio
  getBoardStats(events) {

    const boardRanks = BoardDomain.getIdealMap();

    events = this.addBoardsDataToEvents(this.checkSkipMoved(events));

    const counts = {};
    let total = 0;

    events.forEach(e => {
      if(counts[e.board] == null) {
        counts[e.board] = 0;
      }
      counts[e.board]++;
      total++;
    });

    const targetTotal =
      Object.values(boardRanks)
        .reduce((a, b) => a + b, 0);

    return Object.entries(counts).map(([board, count]) => {
      const actual = count / total * 100;

      const key = BoardDomain.getBoard(board).key;

      const target =
        boardRanks[key] / targetTotal * 100;

      return {
        key,
        actual: actual.toFixed(1),
        target: target.toFixed(1),
        delta: (
          actual - target
        ).toFixed(1)
      };
    });
  },

  // Periods (quotas fixed) of a board's ranks history, see RanksDomain.buildRankPeriods.
  getRankPeriods(boardId) {
    const board = BoardDomain.getBoard(boardId);
    return RanksDomain.buildRankPeriods(board ? board.ranksHistory : []);
  },

  // How many consumed moves the default window (no period selected) wants.
  ATTENTION_DEFAULT_CYCLES: 2,

  // Attention balance by color. Based on the ranks history: either the
  // selected period (periodId = its start ts) or, by default, the last
  // ATTENTION_DEFAULT_CYCLES full cycles of consumed moves, never reaching
  // before the latest ranks change. Only consumed moves (cm === true) count.
  // The open approximate period may additionally receive the effective date
  // range. Books are irrelevant: only the color an event had at event time matters.
  buildBoardAttentionBalance(events, boardId, periodId, dateRange) {
    const board = BoardDomain.getBoard(boardId);
    if(!board || !board.ranks) return null;

    const periods = this.getRankPeriods(boardId);
    const selected = periodId != null
      ? periods.find(p => p.id === periodId)
      : null;

    const all = this.addBoardsDataToEvents(
      events.filter(ev => ev.cm === true)
    ).filter(ev => ev.board === boardId);
    all.sort((a, b) => a.ts - b.ts);

    let ranks;
    let counters = null; // opening counters; null = unknown (treated as 0)
    let windowEvents;
    let wanted = null;
    let cutShort = false;

    if(selected) {
      ranks = selected.ranks;
      // An approximate period's counters were taken at first load, not at its start.
      counters = selected.approx ? null : selected.counters;
      windowEvents = all.filter(ev =>
        ev.ts >= selected.start && (selected.end == null || ev.ts < selected.end)
      );
      if(selected.approx && selected.end == null && dateRange !== undefined) {
        windowEvents = this.filterEventsByDateRange(windowEvents, dateRange);
      }
    } else {
      ranks = board.ranks;
      wanted = this.ATTENTION_DEFAULT_CYCLES * RanksDomain.getCycleSize(ranks);
      const latest = periods.length ? periods[periods.length - 1] : null;
      const sinceLatest = latest
        ? all.filter(ev => ev.ts >= latest.start)
        : all;
      windowEvents = sinceLatest.slice(Math.max(0, sinceLatest.length - wanted));
      cutShort = windowEvents.length < wanted;
    }

    const levels = Object.keys(ranks).map(Number).sort((a, b) => a - b);
    const levelOfColor = {};
    levels.forEach(level => {
      ranks[level].c.forEach(color => {
        levelOfColor[color] = level;
      });
    });

    const totalMoves = windowEvents.length;
    const percentOf = moves => totalMoves === 0 ? 0 : moves / totalMoves * 100;

    const movesByColor = {};
    const movesByLevel = {};
    let unrankedMoves = 0;
    windowEvents.forEach(ev => {
      const level = ev.color != null ? levelOfColor[ev.color] : null;
      if(level == null) {
        unrankedMoves++;
        return;
      }
      movesByColor[ev.color] = (movesByColor[ev.color] || 0) + 1;
      movesByLevel[level] = (movesByLevel[level] || 0) + 1;
    });

    // Expected shares: level N gets 1/q of the flow of level N-1.
    const flows = {};
    let currentFlow = 1;
    levels.forEach(level => {
      flows[level] = currentFlow;
      currentFlow /= ranks[level].q;
    });
    const totalFlow = levels.reduce((sum, level) => sum + flows[level], 0);

    const result = levels.map((level, index) => {
      const moves = movesByLevel[level] || 0;
      const expectedPercent = flows[level] / totalFlow * 100;
      const actualPercent = percentOf(moves);

      // Link: how many moves this level earned from the level above it
      // (opening credit + moves above, divided by the quota above).
      let allowed = null;
      let linkRatio = null;
      if(index > 0) {
        const prevLevel = levels[index - 1];
        const opening = counters ? Utils.toInt(counters[prevLevel]) : 0;
        const earned = opening + (movesByLevel[prevLevel] || 0);
        allowed = Math.floor(earned / ranks[prevLevel].q);
        if(allowed > 0) {
          linkRatio = +(moves / allowed).toFixed(2);
        }
      }

      return {
        level: level,
        moves: moves,
        expectedPercent: +expectedPercent.toFixed(1),
        actualPercent: +actualPercent.toFixed(1),
        delta: +(actualPercent - expectedPercent).toFixed(1),
        ratio: expectedPercent === 0
          ? 0
          : +(actualPercent / expectedPercent).toFixed(2),
        allowed: allowed,
        linkRatio: linkRatio,
        colors: ranks[level].c.map(color => {
          const colorMoves = movesByColor[color] || 0;
          return {
            color: color,
            moves: colorMoves,
            actualPercent: +percentOf(colorMoves).toFixed(1),
            shareInLevel: moves === 0 ? 0 : +(colorMoves / moves * 100).toFixed(1),
          };
        }),
      };
    });

    return {
      period: selected
        ? {id: selected.id, start: selected.start, end: selected.end, approx: selected.approx}
        : null,
      totalMoves: totalMoves,
      wanted: wanted,
      cutShort: cutShort,
      openingKnown: !!selected && !selected.approx,
      levels: result,
      unranked: {
        moves: unrankedMoves,
        actualPercent: +percentOf(unrankedMoves).toFixed(1),
      },
    };
  },

  checkSkipMoved(events, filter = App.getFilter()) {
    if(!filter || filter.includeSkipMove != true) {
      return events.filter(ev => ev.cm === true);
    }
    return events;
  },

  undoLast() {
    console.log('the last event to be undone', this.getEvents().pop());
    this.saveEvents(this.getEvents());
  },

};