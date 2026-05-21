import {Bus} from "./Bus.js";
import {App} from "./App.js";
import {EventsDomain} from "./EventsDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";
import {BoardDomain} from "./BoardDomain.js";
import {Colors} from "./Colors.js";
import {State} from "./State.js";
import { HeaderStats } from "./HeaderStats.js";

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
    boardStats : 'boardStats',
    boardHierarchy : 'boardHierarchy',
    expectedShares : 'expectedShares',
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
      [this.statTypes.boardStats] : this.getBoardStatsHtml,
      [this.statTypes.boardHierarchy] : this.getBoardHierarchyHtml,
      [this.statTypes.expectedShares] : this.getExpectedSharesHtml,
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
    const ideal = BoardDomain.getIdealPercents();
    return `<p>Ideal: ${Object.keys(ideal).join(' / ')}: ${Object.values(ideal).join(' / ')}</p>` 
      + data.map(({month, total, distribution}) => `
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
    const data = EventsDomain.calculateMonthlyRate(EventsDomain.getFilteredEventsByDefaultOrder(), EventsDomain.getEvents());
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

  getBoardStatsHtml() {
    const data = EventsDomain.getBoardStats(EventsDomain.getEvents());
    console.log(data);
    return `соответствует ли фактическая работа по доскам их целевому ratio<br>
    <table class="stats-table">
      <thead>
        <th>board</th>
        <th>actual</th>
        <th>target</th>
        <th>delta</th>
      </thead>
      <tbody>
        ${data.map(({key,actual,target,delta}) => {
          return `
        <tr>
          <td>${key}</td>
          <td>${actual}</td>
          <td>${target}</td>
          <td>${delta}</td>
        </tr>
          `;
        }).join('')}
      </tbody>
    </table>  
    `;
  },

  getBoardHierarchyHtml() {
    const selectedBoard = State.eventsUi.eventsFilter.board;
    if (!selectedBoard) return 'Не выбрана доска';

    const data = EventsDomain.buildBoardHierarchy(EventsDomain.getEvents(), selectedBoard);
    console.log(data);
    return `
    как внутри одной доски распределились реальные ходы между книгами
    <table class="stats-table">
    <thead>
      <th>book</th>
      <th>level</th>
      <th>moves</th>
      <th>share</th>
    </thead>
    <tbody>
      ${data.map(({book, level, moves, share}) => {
        return `
      <tr>
        <td>${book}</td>
        <td>${level}</td>
        <td>${moves}</td>
        <td>${share}</td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table> 
    `;
  },

  getExpectedSharesHtml() {
    const selectedBoard = State.eventsUi.eventsFilter.board;
    if (!selectedBoard) return 'Не выбрана доска';

    const data = EventsDomain.calculateExpectedShares(selectedBoard);
    console.log(data);
    return `
    какой theoretical share ДОЛЖЕН быть у каждой книги, исходя из структуры квот
    <table class="stats-table">
      <thead>
        <th>color</th>
        <th>level</th>
        <th>expected percent</th>
      </thead>
      <tbody>
      ${Object.keys(data).map(color => {
        const d = data[color];
        return `
        <tr>
          <td>${color}</td>
          <td>${d.level}</td>
          <td>${d.expectedPercent}</td>
        </tr>
        `;
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