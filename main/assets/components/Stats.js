import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'
import { Utils } from './Utils.js';

export const Stats = {

  name: 'Stats',

  selectors: {
    resetButton: '#reset-stats',
    resetMessage: '#reset-message',
    content: '#stats',
    confirmResetButton: '#reset-stats-confirm',
    cancelResetButton: '#reset-stats-cancel',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.headerUIChanged, this.render.bind(this));
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
  },

  render() {
    if(State.headerUiMode !== 'stats') return;
    console.log('RENDER: Stats');
    this.dom.resetMessage.classList.toggle('hidden', State.statsUiMode !== 'promptReset');
    this.dom.confirmResetButton.classList.toggle('hidden', State.statsUiMode !== 'promptReset');
    this.dom.cancelResetButton.classList.toggle('hidden', State.statsUiMode !== 'promptReset');
    this.dom.resetButton.classList.toggle('hidden', State.statsUiMode == 'promptReset');


    const idealMap = this.getIdealMap();
    const roundUp1 = (num) => Math.ceil(num * 10) / 10;
    const stats = BoardDomain.getBoardsCounters();
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const idealTotal = Object.values(idealMap).reduce((a, b) => a + b, 0);

    let content = 'No stats';

    if(stats && Object.keys(stats).length) {

      const rows = Object.keys(stats).map(boardId => {
        const board = BoardDomain.getBoard(boardId);
        const value = stats[boardId];

        const realPercent = roundUp1((value / total) * 100);
        const idealPercent = idealMap[board.key]
          ? roundUp1((idealMap[board.key] / idealTotal) * 100)
          : 0;

        const delta = realPercent - idealPercent;

        return `
          <tr>
            <td>${board.name}</td>
            <td>${delta.toFixed(1)}%</td>
            <td>${realPercent.toFixed(1)}%</td>
            <td>${idealPercent.toFixed(1)}%</td>
          </tr>
        `;
      }).join('');

      content = `
        <table id="statsData">
          <thead>
            <tr>
              <th></th>
              <th>Δ</th>
              <th>real</th>
              <th>ideal</th>
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

  /* handlers */

  reset() {
    State.statsUiMode = null;
    BoardDomain.resetBoardsCounters();
    Bus.emit(Bus.events.headerUIChanged);
  },

  promptReset() {
    State.statsUiMode = 'promptReset';
    Bus.emit(Bus.events.headerUIChanged);
  },

  resetUi() {
    State.statsUiMode = null;
    Bus.emit(Bus.events.headerUIChanged);
  },

  getIdealMap() {
    //todo use reduce
    const res = {};
    BoardDomain.getBoards().filter(b => b.key && b.ideal).forEach(b => res[b.key] = Utils.toInt(b.ideal));
    return res;
  },

};