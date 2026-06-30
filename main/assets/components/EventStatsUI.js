import {Bus} from "./Bus.js";
import {App} from "./App.js";
import {EventsDomain} from "./EventsDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {Utils} from "./Utils.js";
import {BoardDomain} from "./BoardDomain.js";
import {Colors} from "./Colors.js";
import {State} from "./State.js";
import {HeaderStats} from "./HeaderStats.js";

export const EventStatsUI = {

  name: 'EventStatsUI',

  selectors: {
    container: '[data-events-view="stats"]',
    statTypeContainersss: '[data-stat-type]',
    sortColTriger: '.stats-table th',
  },

  statTypes: {
    monthAcitvity: 'monthActivity',
    boardsDistr: 'boardsDistr',
    monthlyRate: 'monthlyRate',
    boardStats: 'boardStats',
    boardAttentionBalance: 'boardAttentionBalance',
  },

  dom: {},

  events: {
    click: {
      '@sortColTriger': 'sortByColumn',
    },
  },

  render() {
    const map = {
      [this.statTypes.monthAcitvity]: this.getGeneralMonthActivityHtml,
      [this.statTypes.boardsDistr]: this.getBoardDistrHtml,
      [this.statTypes.monthlyRate]: this.getMonthlyRateHtml,
      [this.statTypes.boardStats]: this.getBoardStatsHtml,
      [this.statTypes.boardAttentionBalance]: this.getBoardAttentionBalanceHtml,
    };
    const showAll = !State.eventsUi.statTypes.length;
    Object.keys(map).forEach(methodName => {
      const container = document.querySelector(`[data-stat-type="${methodName}"]`);
      const body = container.querySelector('.stat-content');
      if(!showAll && !State.eventsUi.statTypes.includes(methodName)) {
        container.classList.add('hidden');
      } else {
        container.classList.remove('hidden');
        body.innerHTML = map[methodName].bind(this)();
      }

    })
  },

  getGeneralMonthActivityHtml() {
    const data = EventsDomain.getMonthStats(EventsDomain.getFilteredEventsByDefaultOrder());
    console.log('getGeneralMonthActivityHtml', data);
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
    const data = EventsDomain.getBoardDistribution(EventsDomain.getEvents());
    const ideal = BoardDomain.getIdealPercents();
    console.log('getBoardDistrHtml', data);
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
    const data = EventsDomain.calculateMonthlyRate(EventsDomain.getFilteredEventsByDefaultOrder());
    console.log('getMonthlyRateHtml', data);
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
    console.log('getBoardStatsHtml', data);
    return `соответствует ли фактическая работа по доскам их целевому ratio<br>
    <table class="stats-table">
      <thead>
        <th>board</th>
        <th>actual</th>
        <th>target</th>
        <th>delta</th>
      </thead>
      <tbody>
        ${data.map(({key, actual, target, delta}) => {
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

  getBoardAttentionBalanceHtml() {
    const selectedBoard = App.getFilter().board;
    if(!selectedBoard) return 'Не выбрана доска';
    const data = EventsDomain.buildBoardAttentionBalance(EventsDomain.getEvents(), selectedBoard);
    console.log('getBoardAttentionBalanceHtml', data);

    return `
    <table class="stats-table">
      <thead>
        <th>level</th>
        <th>expected</th>
        <th>actual</th>
        <th>delta</th>
        <th>ratio</th>
        <th>book</th>
        <th>moves</th>
        <th>b.expected</th>
        <th>b.actual</th>
        <th>b.delta</th>
        <th>b.ratio</th>
      </thead>
      <tbody>
      ${data.map(d => {
        const book1 = d.books[0];
        const rowspan = d.books.length > 1 ? ` rowspan="${d.books.length}"` : '';
        return `
        <tr>
          <td ${rowspan}>${d.level}</td>
          <td ${rowspan}>${d.expectedPercent}</td>
          <td ${rowspan}>${d.actualPercent}</td>
          <td ${rowspan}>${d.delta}</td>
          <td ${rowspan}>${d.ratio}</td>
          <td class="${book1.color}">${book1.book}</td>
          <td class="${book1.color}">${book1.moves}</td>
          <td class="${book1.color}">${book1.expectedPercent}</td>
          <td class="${book1.color}">${book1.actualPercent}</td>
          <td class="${book1.color}">${book1.delta}</td>
          <td class="${book1.color}">${book1.ratio}</td>
        </tr>
        ${d.books.length > 1 ? d.books.slice(1).map(book => `
        <tr>
          <td class="${book.color}">${book.book}</td>
          <td class="${book.color}">${book.moves}</td>
          <td class="${book.color}">${book.expectedPercent}</td>
          <td class="${book.color}">${book.actualPercent}</td>
          <td class="${book.color}">${book.delta}</td>
          <td class="${book.color}">${book.ratio}</td>
        </tr>
          `).join('') : ''}
        `;
      }).join('')}
      </tbody>
    </table> 
    `;
  },

  sortByColumn(th) {
    const table = th.closest('table');
    const tbody = table.querySelector('tbody');

    const colIndex = [...th.parentNode.children].indexOf(th);

    const dir = th.dataset.dir === 'asc' ? 'desc' : 'asc';
    th.dataset.dir = dir;

    const factor = dir === 'asc' ? -1 : 1;

    const rows = [...tbody.querySelectorAll('tr')];

    const isNumeric = rows.every(row => {
      const text = row.children[colIndex].textContent.trim();
      return text !== '' && !Number.isNaN(Number(text));
    });

    rows.sort((a, b) => {
      const av = a.children[colIndex].textContent.trim();
      const bv = b.children[colIndex].textContent.trim();

      if(isNumeric) {
        return factor * (Number(av) - Number(bv));
      }

      return factor * av.localeCompare(bv);
    });

    tbody.append(...rows);
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