import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'

export const Stats = {

  idealMap: {
    "Satori Reader": 12,
    "Reading in paper": 8,
    "おさらい": 6
  },

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
    this.dom.resetMessage.classList.toggle('hidden', State.statsUiMode !== 'promptReset');
    this.dom.confirmResetButton.classList.toggle('hidden', State.statsUiMode !== 'promptReset');
    this.dom.cancelResetButton.classList.toggle('hidden', State.statsUiMode !== 'promptReset');
    this.dom.resetButton.classList.toggle('hidden', State.statsUiMode == 'promptReset');
    const roundUp1 = (num) => Math.ceil(num * 10) / 10;
    const stats = BoardDomain.getBoardsCounters();
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const idealTotal = Object.values(this.idealMap).reduce((a, b) => a + b, 0);

    let content = 'No stats';

    if(stats && Object.keys(stats).length) {

      const rows = Object.keys(stats).map(boardId => {
        const board = BoardDomain.getBoard(boardId);
        const name = board.name;
        const value = stats[boardId];

        const realPercent = roundUp1((value / total) * 100);
        const idealPercent = this.idealMap[name]
          ? roundUp1((this.idealMap[name] / idealTotal) * 100)
          : 0;

        return `
          <tr>
            <td>${name}</td>
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

};