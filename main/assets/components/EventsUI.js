import {Bus} from "./Bus.js";
import {App} from "./App.js";
import {EventsDomain} from "./EventsDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";
import {BoardDomain} from "./BoardDomain.js";
import {State} from "./State.js";
import {EventStatsUI} from "./EventStatsUI.js";

export const EventsUI = {

  name: 'EventsUI',

  views: {
    list: 'list',
    calendar: 'calendar',
    stats: 'stats'
  },

  selectors: {
    container: '#events',
    listContainer: '#eventsListContainer',
    calendarContainer: '#eventsCalendarContainer',
    calenderBody: '#Cal-body',
    viewContainersss: '[data-events-view]',
    viewToolbarsss: '[data-events-toolbar]',
    viewSwitchesss: '[data-events-view-switch]',
    toggleExpandButton: '#toggleEventsExpand',
    eventEntriesss: '.eventsEntry',
    toggleEventDots: '.js-toggle-eventdots',
    toggleMergeDots: '#toggleMergeDots',
    calendarScrollable: '#Cal-bodyWrap',
  },

  dom: {},

  events: {
    click: {
      '@viewSwitchesss': 'switchEventsView',
      '@toggleExpandButton': 'toggleExpand',
      '@toggleEventDots': 'toggleEventDots',
      '@toggleMergeDots': 'toggleMergeDots',
    },
  },

  init() {
    Bus.on(Bus.events.screenChanged, () => {
      this.render(true);
    });
    Bus.on(Bus.events.progress, this.render.bind(this));
    Bus.on(Bus.events.eventsUiChanged, this.render.bind(this));
    Bus.on(Bus.events.filtersChanged, this.render.bind(this));
  },

  getCurrentView() {
    return App.getStateProp('eventsView');
  },

  isStatsView() {
    return this.getCurrentView() == this.views.stats;
  },

  render(scrollToBottom) {

    if(!App.isEvents()) {
      this.dom.container.classList.toggle('hidden', true);
      return;
    }

    console.log('RENDER: EventsUI');

    this.dom.container.classList.toggle('hidden', false);

    const view = this.getCurrentView() || this.views.list;

    this.dom.viewContainersss.forEach(el =>
      el.classList.toggle('hidden', el.dataset.eventsView !== view));

    this.dom.viewToolbarsss.forEach(el =>
      el.classList.toggle('hidden', el.dataset.eventsToolbar !== view));

    switch(view) {
      case this.views.list:
      default:
        this.dom.listContainer.innerHTML = this.getListHtml();
        this.dom.eventEntriesss = document.querySelectorAll(this.selectors.eventEntriesss);
        this.dom.toggleExpandButton.classList.toggle('expand', !State.eventsUi.listExpanded);
        this.dom.toggleExpandButton.classList.toggle('collapse', State.eventsUi.listExpanded);
        break;
      case this.views.calendar:
        const scrollAnchor = scrollToBottom ? null : this.getCalendarScrollAnchor();
        this.dom.calenderBody.innerHTML = this.getCalendarHtml();
        this.dom.toggleMergeDots.classList.toggle('expand', State.eventsUi.dotsMerged);
        this.dom.toggleMergeDots.classList.toggle('collapse', !State.eventsUi.dotsMerged);
        if(scrollToBottom) {
          this.dom.calendarScrollable.scrollTo({
            top: this.dom.calendarScrollable.scrollHeight,
            behavior: "smooth"
          });
        } else if(scrollAnchor) {
          this.restoreCalendarScrollAnchor(scrollAnchor);
        }
        break;
      case this.views.stats:
        EventStatsUI.render();
    }

  },

  getCalendarScrollAnchor() {
    const days = this.dom.calenderBody.querySelectorAll('[data-date]');
    if(!days.length) {
      return null;
    }

    const scrollableRect = this.dom.calendarScrollable.getBoundingClientRect();
    const viewportCenter = scrollableRect.top + this.dom.calendarScrollable.clientHeight / 2;
    let anchor = null;
    let closestDistance = Infinity;

    Array.from(days).forEach(day => {
      const rect = day.getBoundingClientRect();
      const distance = rect.top <= viewportCenter && rect.bottom >= viewportCenter
        ? 0
        : Math.min(Math.abs(rect.top - viewportCenter), Math.abs(rect.bottom - viewportCenter));
      if(distance < closestDistance) {
        closestDistance = distance;
        anchor = {
          date: day.dataset.date,
          offset: rect.top - scrollableRect.top
        };
      }
    });

    return anchor;
  },

  restoreCalendarScrollAnchor(anchor) {
    const days = this.dom.calenderBody.querySelectorAll('[data-date]');
    if(!days.length) {
      this.dom.calendarScrollable.scrollTop = 0;
      return;
    }

    let day = this.dom.calenderBody.querySelector(`[data-date="${anchor.date}"]`);
    if(!day) {
      const firstDay = days[0];
      const lastDay = days[days.length - 1];
      day = anchor.date < firstDay.dataset.date ? firstDay : lastDay;
    }

    const scrollableRect = this.dom.calendarScrollable.getBoundingClientRect();
    const currentOffset = day.getBoundingClientRect().top - scrollableRect.top;
    this.dom.calendarScrollable.scrollTop += currentOffset - anchor.offset;
  },

  getListHtml() {

    const events = EventsDomain.getFilteredEventsByDefaultOrder();

    return events.map(ev => {
      const book = BooksDomain.getBook(ev.b);
      const boardId = EventsDomain.resolveEventBoard(ev);
      const color = EventsDomain.resolveEventColor(ev);
      const board = BoardDomain.getBoard(boardId);
      const hasRange = ev.f != null && ev.t != null;
      const targetColIndex = Utils.toInt(ev.c2);
      const targetColName = targetColIndex !== null ? (board ? board.columns[targetColIndex].name : null) : null;
      const sourceColumnIndex = ev.c1 ? Utils.toInt(ev.c1) : targetColIndex !== null ? targetColIndex - 1 : null;
      const sourceColName = sourceColumnIndex !== null ? (board ? board.columns[sourceColumnIndex].name : null) : null;
      const consumeMove = ev.cm == true;
      const isArchived = BooksDomain.isArchived(book);
      return `
      <div 
        class="eventsEntry ${color || ''} ${board ? 'board-' + board.key + '-border' : ''}${isArchived ? ' archived' : ''}" data-skip-move="${consumeMove ? 'false' : 'true'}"
        data-book="${ev.b}" 
        data-date="${ev.d}">
        <div class="eventsEntry__summary">
          <span class="eventsEntry__date">${ev.d}</span>
          <span class="eventsEntry__bookname">${BooksDomain.getBook(ev.b)?.name}</span>
          ${targetColName !== null || sourceColName !== null ? `
            <details ${State.eventsUi.listExpanded ? 'open' : ''}>
              <summary></summary>
              <div class="eventsEntry__details">
                ${hasRange ? `
                  <span class="tag">${ev.f}${ev.t !== ev.f ? '-' + ev.t : ''}</span>
                ` : ''}
                ${sourceColName ? `
                <div class="connector"></div>
                <span class="tag">${sourceColName}</span>
                ` : ''}
                ${targetColName ? `
                <div class="connector"></div>
                <span class="tag">${targetColName}</span>
                ` : ''}
              </div>
            </details> 
            ` : ''}
        </div>
      </div>
      `
    }).join('')
  },

  getCalendarHtml() {
    const events = EventsDomain.getFilteredEventsByOrder(true);
    const calendar = EventsDomain.generateCalendar(events, EventsDomain.getEvents());
    console.log(calendar);
    let res = [];
    let currYear = null;
    calendar.forEach(({month, weeks, year}, i) => {
      let weeksHtml = [];
      weeks.forEach(({days, partial}, index) => {
        let daysHtml = [];
        days.forEach((day, iii) => {
          let dayString = day.day;
          if(index == 0 && iii == 0) {
            dayString += '.' + month;
            if(!currYear || year !== currYear) {
              dayString += '<br>' + year;
            }
          }
          let dayBooks = [];
          let dotsHtml = [];
          day.events.forEach(event => {
            const book = BooksDomain.getBook(event.book);
            const boardId = event.board;
            const color = event.color;
            const board = BoardDomain.getBoard(boardId);
            const bookEvents = day.events.filter(ev => ev.book == event.book);
            const markAsMoveSkipped = event.sm == true
              && (
                !State.eventsUi.dotsMerged
                || bookEvents.every(ev => ev.sm == true)
              );

            if(!State.eventsUi.dotsMerged || !dayBooks.includes(event.book)) {
              const isArchived = BooksDomain.isArchived(book);
              const html = `<span class="${board ? 'board-' + board.key + '-border' : ''} ${isArchived ? 'archived' : ''} ${markAsMoveSkipped ? 'skipMove' : ''} ${color || ''}"></span>`;
              dotsHtml.push(html);
              dayBooks.push(event.book);
            }
          });
          daysHtml.push(`<li data-date="${day.date}" data-day="${day.day}">${dayString}${dotsHtml.length ? `
            <span class="eventDots">${dotsHtml.join('')}</span>
          ` : ''}</li>`);
        });
        weeksHtml.push(`<ul class="Cal-week ${partial ? 'partial' : ''}">${daysHtml.join('')}</ul>`)
      });
      res.push(`<div class="Cal-month" data-month="${month}">${weeksHtml.join('')}</div>`);
      currYear = year;
    });

    return res.join('');
  },

  switchEventsView(el) {
    const view = el.dataset.eventsViewSwitch;
    App.setStateProp('eventsView', view);
    Bus.emit(Bus.events.eventsUiChanged, view === this.views.calendar);
  },

  toggleExpand(el) {
    State.eventsUi.listExpanded = !State.eventsUi.listExpanded;
    Bus.emit(Bus.events.eventsUiChanged);
  },

  toggleEventDots(el) {
    el.classList.toggle('active');
    this.dom.calendarContainer.classList.toggle('eventDotsHidden');
  },

  toggleMergeDots(el) {
    State.eventsUi.dotsMerged = !State.eventsUi.dotsMerged;
    Bus.emit(Bus.events.eventsUiChanged);
  },

};