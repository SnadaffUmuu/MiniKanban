import {Bus} from "./Bus.js";
import {App} from "./App.js";
import {EventsDomain} from "./EventsDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";
import {BoardDomain} from "./BoardDomain.js";
import {Colors} from "./Colors.js";
import {State} from "./State.js";

export const EventStatsUI = {

  name : 'EventStatsUI',

  selectors : {
    container : '[data-events-view="stats"]',
    statTypeContainersss : '[data-stat-type]',
  },

  statTypes : {
    monthAcitvity : 'monthActivity',
    boardsDistr : 'boardsDistr',
    monthlyRate : 'monthlyRate',
  },

  dom : {},

  events : {},

  // init() {

  // },

  render() {
    const map = {
      [this.statTypes.monthAcitvity] : this.getGeneralMonthActivityHtml,
      [this.statTypes.boardsDistr] : this.getBoardDistrHtml,
      [this.statTypes.monthlyRate] : this.getMonthlyRateHtml,
    };
    const showAll = !State.eventsUi.statTypes.length;
    Object.keys(map).forEach(methodName => {
      const container = document.querySelector(`[data-stat-type="${methodName}"]`);
      const body = container.querySelector('.stat-content');
      if (!showAll && !State.eventsUi.statTypes.includes(methodName)) {
        container.classList.add('hidden');
      } else {
        container.classList.remove('hidden');
        body.innerHTML = map[methodName].bind(this)();
      }

    })
  },

  getGeneralMonthActivityHtml() {
    const data = EventsDomain.getMonthStats(EventsDomain.getFilteredEventsByDefaultOrder());
    return `
      <table class="stats-table">
        <thead>
          <th>Месяц</th>
          <th>Событий</th>
          <th>Активных дней</th>
          <th>Среднее в активный день</th>
        </thead>
        <tbody>
          ${data.map(({month, totalEvents, activeDays, avgPerDay}) => `
          <tr data-month="${month}">
            <td>${month}</td>
            <td>${totalEvents}</td>
            <td>${activeDays}</td>
            <td>${avgPerDay}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  getBoardDistrHtml() {
    const data = EventsDomain.getBoardDistribution(EventsDomain.getFilteredEventsByDefaultOrder());
    return data.map(({month, total, distribution}) => `
      <h4>${month}</h4>
      <table class="stats-table" data-month="${month}">
        <thead>
          <th>Board</th>
          <th>Событий</th>
          <th>%</th>
        </thead>
        <tbody>
          ${distribution.map(({board, count, percent}) => `
          <tr data-board="${board}">
            <td>${board}</td>
            <td>${count}</td>
            <td>${percent}</td>
          </tr>
        `).join('')}
        </tbody>
      </table>        
    `).join('');
  },

  getMonthlyRateHtml() {
    const data = EventsDomain.calculateMonthlyRate(EventsDomain.getFilteredEventsByDefaultOrder());
    console.log(data);
    return `
    <table class="stats-table">
      <thead>
        <th>book</th>
        <th>board</th>
        <th>событий</th>
        <th>среднее в месяц</th>
      </thead>
      <tbody>
        ${data.map(({book, board, totalEvents, avgPerMonth}) => {
          return `
        <tr>
          <td>${book}</td>
          <td>${board}</td>
          <td>${totalEvents}</td>
          <td>${avgPerMonth}</td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>  
    `;
  },

};

/*

<table class="stats-table">
  <thead>
    <th></th>
    <th></th>
    <th></th>
    <th></th>
  </thead>
  <tbody>
    <tr>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>  
*/