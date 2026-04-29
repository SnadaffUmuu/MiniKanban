import { Bus } from "./Bus.js";
import { App } from "./App.js";
import { EventsDomain } from "./EventsDomain.js";
import { BooksDomain } from "./BooksDomain.js";

export const EventsUI = {

  name : 'EventsUI',

  selectors : {
    container : '#events',
    listContainer : '#eventsListContainer',
  },

  dom : {},

  init() {
    Bus.on(Bus.events.booksModeChanged, this.render.bind(this));
    Bus.on(Bus.events.progress, this.render.bind(this));
  },

  render() {
    if (!App.isEvents()) {
      this.dom.container.classList.toggle('hidden', true);
      return;
    }
    this.dom.container.classList.toggle('hidden', false);
    this.dom.listContainer.innerHTML = this.getListHtml();
  },

  getListHtml() {
    console.log(EventsDomain.sortBy(EventsDomain.getEvents(), 'date', false));
    const events = EventsDomain.sortBy(EventsDomain.getEvents(), 'date', false);
    return events.map(ev => `
      <div class="eventsEntry">
        ${ev.d}<br>
        ${BooksDomain.getBook(ev.b)?.name}
      </div>
      `).join('')
  },

};