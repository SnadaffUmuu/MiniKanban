import {Bus} from "./Bus.js";
import {App} from "./App.js";
import {EventsDomain} from "./EventsDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";
import {BoardDomain} from "./BoardDomain.js";
import {Colors} from "./Colors.js";
import {State} from "./State.js";

export const EventsUI = {

  name: 'EventsUI',

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
    toggleMergeDots : '#toggleMergeDots',
  },

  dom: {},

  events: {
    click: {
      '@viewSwitchesss': 'switchEventsView',
      '@toggleExpandButton': 'toggleExpand',
      '@toggleEventDots' : 'toggleEventDots',
      '@toggleMergeDots' : 'toggleMergeDots',
    },
  },

  init() {
    Bus.on(Bus.events.screenChanged, this.render.bind(this));
    Bus.on(Bus.events.progress, this.render.bind(this));
    Bus.on(Bus.events.eventsUiChanged, this.render.bind(this));
  },

  render() {

    if(!App.isEvents()) {
      this.dom.container.classList.toggle('hidden', true);
      return;
    }

    console.log('RENDER: EventsUI');

    this.dom.container.classList.toggle('hidden', false);

    const view = App.getStateProp('eventsView') || 'list';

    this.dom.viewContainersss.forEach(el =>
      el.classList.toggle('hidden', el.dataset.eventsView !== view));
    this.dom.viewToolbarsss.forEach(el =>
      el.classList.toggle('hidden', el.dataset.eventsToolbar !== view));

    switch(view) {
      case 'list':
        this.dom.listContainer.innerHTML = this.getListHtml();
        this.dom.eventEntriesss = document.querySelectorAll(this.selectors.eventEntriesss);
        this.dom.toggleExpandButton.classList.toggle('expand', !State.eventsUi.listExpanded);
        this.dom.toggleExpandButton.classList.toggle('collapse', State.eventsUi.listExpanded);
        break;
        case 'calendar':
          this.dom.calenderBody.innerHTML = this.getCalendarHtml();
          this.dom.toggleMergeDots.classList.toggle('expand', State.eventsUi.dotsMerged);
          this.dom.toggleMergeDots.classList.toggle('collapse', !State.eventsUi.dotsMerged);
        break;
    }

  },

  getListHtml() {

    const events = Utils.sortBy(EventsDomain.getFilteredEvents(State.eventsUi.eventsFilter), 'ts', false);

    return events.map(ev => {
      const book = BooksDomain.getBook(ev.b);
      const board = BoardDomain.getBoard(book.board);
      const range = ev.r && ev.r.length ? ev.r[0] : null;
      const targetColIndex = ev.c ? Utils.toInt(ev.c) : range !== null ? Utils.toInt(range.s) : null;
      const targetColName = targetColIndex !== null ? board.columns[targetColIndex].name : null;
      const sourceColumnIndex = targetColIndex !== null ? targetColIndex - 1 : null;
      const sourceColName = sourceColumnIndex !== null ? board.columns[sourceColumnIndex].name : null;
      return `
      <div ${book.color ? ` style="background-color:${Colors[book.color]}"` : ''} class="eventsEntry board-${board.key}-border" data-type="${ev.t}" data-book="${ev.b}" data-date="${ev.d}">
        <div class="eventsEntry__summary">
          <span class="eventsEntry__date">${ev.d}</span>
          <span class="eventsEntry__bookname">${BooksDomain.getBook(ev.b)?.name}</span>
          ${range !== null || targetColName !== null || sourceColName !== null ? `
            <details ${State.eventsUi.listExpanded ? 'open' : ''}>
              <summary></summary>
              <div class="eventsEntry__details">
                ${range !== null ? `
                  <span class="tag">${range.f}${range.t !== range.f ? '-' + range.t : ''}</span>
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
    const events = Utils.sortBy(EventsDomain.getFilteredEvents(State.eventsUi.eventsFilter), 'd', true);
    const calendar = EventsDomain.generateCalendar(events);
    console.log(calendar);
    let res = [];
    let currYear = null;
    calendar.forEach(({month, weeks, year}, i) => {
      let weeksHtml = [];
      weeks.forEach(({days, partial}, index) => {
        let daysHtml = [];
        days.forEach((day, iii) => {
          let dayString = day.day;
          if (index == 0 && iii == 0) {
            dayString += '.' + month;
            if (!currYear || year !== currYear) {
              dayString += '<br>' + year;
            }
          }
          let dayBooks = [];
          let dotsHtml = [];
          day.events.forEach(event => {
            const book = BooksDomain.getBook(event.book);
            const board = BoardDomain.getBoard(book.board);
            if (!State.eventsUi.dotsMerged || !dayBooks.includes(event.book)) {
              const html = `<span class="board-${board.key}-border" style="background-color:${Colors[book.color]}"></span>`;
              dotsHtml.push(html);
              dayBooks.push(event.book);
            }
          });
          daysHtml.push(`<li data-day="${day.day}">${dayString}${dotsHtml.length ? `
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
    State.eventsUi.view = el.dataset.eventsViewSwitch;
    App.setStateProp('eventsView', State.eventsUi.view);
    Bus.emit(Bus.events.eventsUiChanged);
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