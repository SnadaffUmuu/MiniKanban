import {App} from "./App.js";
import {EventsDomain} from "./EventsDomain.js";
import {BoardDomain} from "./BoardDomain.js";
import {State} from "./State.js";
import {Bus} from "./Bus.js";

export const EventStatsUI = {

  name: 'EventStatsUI',

  selectors: {
    container: '[data-events-view="stats"]',
    statTypeContainersss: '[data-stat-type]',
    sortColTriger: '.stats-table th',
    attentionPeriodSelect: '#attention-period',
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
    change: {
      '@attentionPeriodSelect': 'changeAttentionPeriod',
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
    const periods = EventsDomain.getRankPeriods(selectedBoard);
    let periodId = State.eventsUi.attentionPeriod;
    if(periodId != null && !periods.some(p => p.id === periodId)) {
      periodId = null;
    }
    const data = EventsDomain.buildBoardAttentionBalance(EventsDomain.getEvents(), selectedBoard, periodId);
    if(!data) return 'У доски нет рангов';
    console.log('getBoardAttentionBalanceHtml', data);

    const formatDate = ts => ts > 0 ? new Date(ts).toISOString().slice(0, 10) : 'start';
    const options = ['<option value="">Last moves (default)</option>']
      .concat(periods.slice().reverse().map(p => `
        <option value="${p.id}" ${p.id === periodId ? 'selected' : ''}>${formatDate(p.start)} — ${p.end == null ? 'now' : formatDate(p.end)}${p.approx ? ' (approx.)' : ''}</option>
      `)).join('');

    let note;
    if(data.period) {
      note = `Consumed moves in period: ${data.totalMoves}. `
        + (data.period.approx
          ? 'Approximate: ranks before tracking began are assumed to be the current ones; opening credit is taken as 0.'
          : 'Opening counters are taken from the ranks history.');
    } else {
      note = `Last ${data.totalMoves} of ${data.wanted} wanted consumed moves`
        + (data.cutShort ? ' (cut short: the window stops at the latest ranks change or at the start of the log)' : '')
        + '. Opening credit is unknown and taken as 0.';
    }

    return `
    <p>
      <select id="attention-period">${options}</select>
    </p>
    <p>${note}</p>
    <table class="stats-table">
      <thead>
        <th>level</th>
        <th>expected %</th>
        <th>actual %</th>
        <th>delta</th>
        <th>ratio</th>
        <th>allowed</th>
        <th>link ratio</th>
        <th>color</th>
        <th>moves</th>
        <th>% of all</th>
        <th>% in level</th>
      </thead>
      <tbody>
      ${data.levels.map(d => {
        const rowspan = d.colors.length > 1 ? ` rowspan="${d.colors.length}"` : '';
        const colorCells = c => `
          <td class="${c.color}">${c.color}</td>
          <td class="${c.color}">${c.moves}</td>
          <td class="${c.color}">${c.actualPercent}</td>
          <td class="${c.color}">${c.shareInLevel}</td>`;
        const first = d.colors[0];
        return `
        <tr>
          <td ${rowspan}>${d.level}</td>
          <td ${rowspan}>${d.expectedPercent}</td>
          <td ${rowspan}>${d.actualPercent}</td>
          <td ${rowspan}>${d.delta}</td>
          <td ${rowspan}>${d.ratio}</td>
          <td ${rowspan}>${d.allowed == null ? '—' : d.allowed}</td>
          <td ${rowspan}>${d.linkRatio == null ? '—' : d.linkRatio}</td>
          ${colorCells(first)}
        </tr>
        ${d.colors.slice(1).map(c => `<tr>${colorCells(c)}</tr>`).join('')}
        `;
      }).join('')}
        <tr>
          <td>—</td>
          <td>—</td>
          <td>${data.unranked.actualPercent}</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td>unranked</td>
          <td>${data.unranked.moves}</td>
          <td>${data.unranked.actualPercent}</td>
          <td>—</td>
        </tr>
      </tbody>
    </table>
    `;
  },

  changeAttentionPeriod(el) {
    State.eventsUi.attentionPeriod = el.value === '' ? null : Number(el.value);
    Bus.emit(Bus.events.eventsUiChanged);
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