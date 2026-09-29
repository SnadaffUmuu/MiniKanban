import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {EventsDomain} from './EventsDomain.js'
import {State} from './State.js'

export const HeaderStats = {

  name: 'HeaderStats',

  selectors: {
    content: '#stats',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'stats') return;
    console.log('RENDER: HeaderStats');

    const stats = EventsDomain.getBoardStats(EventsDomain.getEvents());

    let content = 'No stats';

    if(stats.length) {

      const rows = stats.map(({key, actual, target, delta}) => {
        const board = BoardDomain.getBoardByKey(key);
        return `
          <tr>
            <td>${board.name}</td>
            <td>${actual}%</td>
            <td>${target}%</td>
            <td>${delta}%</td>
          </tr>
        `;
      }).join('');

      content = `
        <table id="statsData">
          <thead>
            <tr>
              <th></th>
              <th>actual</th>
              <th>target</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }

    this.dom.content.innerHTML = content;

  },

};
