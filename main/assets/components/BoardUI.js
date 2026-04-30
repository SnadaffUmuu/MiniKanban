import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'
import {TaskUI} from './TaskUI.js'
import {App} from './App.js'

export const BoardUI = {

  name: 'BoardUI',

  selectors: {
    appTitle: '[data-app-title="board"]',
    topToolsBlock: '[data-screen-tools="board"]',
    boardsListButton: '#boards-button',
    columnsContainer: '#columns',
    main: 'main#board',
    addColumnButton: '#add-column',
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.boardsChanged, this.render.bind(this));
    Bus.on(Bus.events.screenChanged, this.render.bind(this));

    Bus.on(Bus.events.columnAdded, (newUid) => {
      this.render();
      State.afterRender.push(() => {
        const col = document.querySelector(
          `.column[data-id="${newUid}"]`
        );

        if(!col) return;

        this.dom.main.scrollLeft = col.offsetLeft - 30;
      });
    });
  },

  renderHeader() {
    // this.dom.topToolsBlock.querySelectorAll('[data-screen-switch]').forEach(el =>
    //   el.classList.toggle('hidden', State.headerUiMode !== 'default'));

    // this.dom.appTitle.classList.toggle('hidden', State.headerUiMode !== 'default');
    // this.dom.boardsListButton.classList.toggle('hidden', State.headerUiMode !== 'default');
    
    const board = BoardDomain.getCurrentBoard();
    this.dom.appTitle.innerHTML = board.name;
  },

  render() {
    console.log('RENDER: BoardUI');
    if(!App.isBoard()) {
      this.dom.main.classList.add('hidden');
      return;
    }
    this.dom.columnsContainer.innerHTML = '';
    const board = BoardDomain.getCurrentBoard();

    if(!board) {
      this.dom.main.insertAdjacentHTML('afterbegin', `
      <div id="no-boards">
        <button id="create-default-board">
          Click to create a board
        </button>
      </div>
      `);
      return;
    }

    board.columns.forEach(column => {
      // Карточки
      let tasksHtml = [];

      column.tasks.forEach(task => {
        tasksHtml.push(TaskUI.getTaskHtml(task.id));
      });

      if(!tasksHtml.length) {
        tasksHtml = [`<button class="js-add-task add-task-button">Click to add first task</button>`];
      }
      const columnHtml = `
      <div class="column" data-id="${column.id}">
        <div class="column-header">
          <h3 class="column-title">${column.name}</h3>
          <span class="task-count">${column.tasks.length}</span>
          <button class="js-add-task add-task"></button>
          <button class="column-menu-toggle"></button>
        </div>
        <div class="column-menu hidden">
          <button class="rename-column" data-header-mode-trigger="rename">Rename column</button>
          <button class="move-column" data-header-mode-trigger="move">Move column</button>
          <button class="delete-column" data-header-mode-trigger="delete">Delete column</button>
          <label for="skipMove"><input type="checkbox"${column.skipMove ? 'checked' : ''} name="skipMove">Skip move</label>
        </div>
        <div class="rename-column-block hidden" data-header-mode="rename">
          Rename column<br>
          <input type="search" class="rename-column-input" ${column.name ? 'value="' + column.name + '" data-original-value="' + column.name + '"' : 'placeholder="New column name"'}>
          <button class="save-rename-column board-management-button" disabled>Save</button>
          <button class="js-back board-management-button">Cancel</button>
        </div>
        <div class="delete-column-block hidden" data-header-mode="delete">
          <div>Delete this column with all tasks?</div>
          <button class="save-delete-column board-management-button">Delete</button>
          <button class="js-back board-management-button">Cancel</button>
        </div>
        <div class="move-column-block hidden" data-header-mode="move">
          <div>Move column</div>
          <div class="col-move-block-container">
            <button data-move-direction="left" class="move-column-left board-management-button"></button>
            <button data-move-direction="right" class="move-column-right board-management-button"></button>
          </div>
        </div>
        <div class="column-body">
          ${tasksHtml.join('')}
        </div>
      </div>
    `;
      this.dom.columnsContainer.insertAdjacentHTML('beforeend', columnHtml);
      this.dom.main.classList.remove('hidden');

    });

    while(State.afterRender.length) {
      const effect = State.afterRender.shift();
      effect();
    }
  },

  createColumn() {
    const newUid = BoardDomain.createColumn();
    Bus.emit(Bus.events.columnAdded, newUid);
  },

};