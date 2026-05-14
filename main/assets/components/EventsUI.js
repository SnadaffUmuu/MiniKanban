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
    viewContainersss: '[data-events-view]',
    viewToolbarsss: '[data-events-toolbar]',
    viewSwitchesss: '[data-events-view-switch]',
    toggleExpandButton : '#toggleEventsExpand',
    eventEntriesss : '.eventsEntry',
  },

  dom: {},

  events: {
    click : {
      '@viewSwitchesss' : 'switchEventsView',
      '@toggleExpandButton' : 'toggleExpand'
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
        break;
      case 'calendar':
        this.dom.calendarContainer.innerHTML = this.getCalendarHtml();
        break;
    }

  },

  getListHtml() {

    const events = EventsDomain.getFilteredEvents(State.eventsUi.eventsFilter);

    return events.map(ev => {
      const book = BooksDomain.getBook(ev.b);
      const board = BoardDomain.getBoard(book.board);
      return `
      <div ${book.color ? ` style="background-color:${Colors[book.color]}"` : ''} class="eventsEntry board-${board.key}-border" data-type="${ev.t}" data-book="${ev.b}" data-date="${ev.d}">
        <div class="eventsEntry__summary">
          <span class="eventsEntry__date">${ev.d}</span>
          <span class="eventsEntry__bookname">${BooksDomain.getBook(ev.b)?.name}</span>
          ${ev.r ? `
            <details>
              <summary></summary>
              <div class="eventsEntry__details">
                ${ev.r ? ev.r.map(r => {
        const sourceColName = BoardDomain.getBoard(book.board).columns[Utils.toInt(r.s) - 1].name;
        const targetColName = BoardDomain.getBoard(book.board).columns[r.s].name;
        return `
                <span class="tag">${r.f}${r.t !== r.f ? '-' + r.t : ''}</span>
                <div class="connector"></div>
                <span class="tag">${sourceColName}</span>
                <div class="connector"></div>
                <span class="tag">${targetColName}</span>`
      }).join('') : ''}
              </div>
            </details>            
            ` : ''}
        </div>
      </div>
      `
    }).join('')
  },

  getCalendarHtml() {

    const events = EventsDomain.getFilteredEvents(State.eventsUi.eventsFilter);

    return events.map(ev => {
      return `events calendar`;
    });

  },

  switchEventsView(el) {
    State.eventsUi.view = el.dataset.eventsViewSwitch;
    App.setStateProp('eventsView', State.eventsUi.view);
    Bus.emit(Bus.events.eventsUiChanged);
  },

  toggleExpand(el) {
    el.classList.toggle('expand');
    el.classList.toggle('collapse');
    this.dom.eventEntriesss.forEach(el => {
      el.querySelector('summary')?.click();
    });
  },

};