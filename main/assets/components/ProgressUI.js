import {Bus} from './Bus.js'
import {State} from './State.js'
import {BoardDomain} from './BoardDomain.js'
import {Colors} from './Colors.js';
import {BooksDomain} from './BooksDomain.js';
import {Utils} from './Utils.js';
import {App} from './App.js';
import {EventsDomain} from './EventsDomain.js';

export const ProgressUI = {

  name: 'ProgressUI',

  selectors: {
    promptButton: '#growPrompt',
    dialogContent: '.dialogContent',
    dialog: '#dialog',
    dialogClose: '.button-close',
    logProgressConfirmButton: '#confirmLogProgress',
  },

  events: {
    click: {
      '@promptButton': 'showUi',
      '##': 'hideUi',
      '@logProgressConfirmButton': 'log',
    }
  },

  dom: {},

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.progress, () => {
      this.render();
    });
    Bus.on(Bus.events.progressUiChanged, this.render.bind(this));
  },

  render() {
    //TODO: если стартовая колонка, нужно УДАЛИТЬ диапазон
    console.log('RENDER: ProgressUI');
    let book = null;
    let task = null;
    const data = State.progressData;
    const hasData = Object.keys(data).length;
    if(hasData) {
      task = BoardDomain.getTask(data.taskId);
      book = BooksDomain.betBookByBoard(data.boardId, task.color);
      if(!book) {
        State.progressPromptShown = false;
        return;
      }
    }
    const dialogHidden = State.progressPromptShown || !hasData;
    const buttonHidden = !State.progressPromptShown;
    console.log('hasData', hasData);
    console.log('dialogHidden', dialogHidden);
    console.log('buttonHidden', buttonHidden);
    this.dom.promptButton.classList.toggle('hidden', buttonHidden);
    this.dom.dialog.querySelector(this.selectors.dialogContent).innerHTML = hasData && buttonHidden ? `
      ${this.getFormHtml(book, task)}
    ` : '';
    this.dom.dialog.classList.toggle('hidden', dialogHidden);
  },

  showUi() {
    console.log('showUi (click)');
    State.progressPromptShown = false;
    this.render();
  },

  hideUi(el) {
    if(this.dom.dialog.classList.contains('hidden')
      && this.dom.promptButton.classList.contains('hidden')
      || this.dom.promptButton.contains(el)
      || this.dom.dialog.contains(el)
      && !this.dom.dialogClose.contains(el)) return;
    State.progressData = {};
    State.progressPromptShown = false;
    State.progressUpdateSuccess = null;
    State.progressUpdateError = null;
    this.render();
  },

  getFormHtml(book, task) {
    const board = BoardDomain.getCurrentBoard();
    const data = State.progressData;
    const range = Utils.extractRange(task.description);
    const stagesCountForTheBook = BooksDomain.getBookStagesCountFromBoard(board.id, Utils.toInt(book.startIndex));
    const stage = BooksDomain.getStageAtIndex(board.columns, Utils.toInt(book.startIndex), data.targetIndex);
    const hideForm = State.progressUpdateSuccess != null;
    const progressError = State.progressUpdateError;
    return `
  <div id="progressUi">
    <div id="taskData" style="background:${Colors[task.color]}">
      book: ${book.name}<br>
      startColIndex: ${book.startIndex || 0}<br>
      description: ${task.description}<br>
      color: ${task.color}<br>
      from column "${BoardDomain.getColumn(data.sourceColumnId).name}"<br>
      to column "${BoardDomain.getColumn(data.targetColumnId).name}"<br>
      stage ${stage}<br>
      progress or rollback? ${data.delta > 0 ? 'progress' : 'rollback'}
    </div>
    <form ${hideForm ? 'class="hidden"' : ''} name="progressForm" action="javascript:void(0)" data-book-key="${book.key}">
      <fieldset legend="progress data">
        <label>book: 
          <select name="book">
          ${BooksDomain.getBooks()
        .filter(b => b.board == board.id)
        .map(b => `<option ${b.name == book.name && b.color == task.color ? ' selected' : ''} value="${b.key}">${b.name}</option>`).join('')}
          </select>
        </label><br>
        <label>from page: <input type="number" name="from" value="${range ? range[0] : ''}" required></label><br>
        <label>to page: <input type="number" name="to" value="${range ? range[1] : ''}" required></label><br>
        <label>stage: 
          <select name="stage">
            ${Array.from({length: stagesCountForTheBook}).map((_, i) => `<option ${i + 1 == stage ? 'selected' : ''} value="${i + 1}">${i + 1}</option>`).join('')}
          </select>
        </label><br>
      </fieldset>
      <div class="formErrors ${progressError ? '' : 'hidden'}">
        ${progressError ? `${progressError.message}<br>${progressError.details}` : ''}
      </div>
      <button id="confirmLogProgress">Log</button>
      </form>
      <div class="successMessage ${State.progressUpdateSuccess ? '' : 'hidden'}">Success</div>
  </div>    
    `;
  },

  log() {
    State.progressUpdateError = null;
    const form = document.forms['progressForm'];
    const range = {
      s: form.stage.value,
      f: form.from.value,
      t: form.to.value
    };
    const res = BooksDomain.addOrUpdateRange(form.dataset.bookKey, range);
    if(res.result !== true) {
      State.progressUpdateError = res;
    } else {
      const logRes = EventsDomain.log({
        type: EventsDomain.eventTypes.progress,
        book: form.dataset.bookKey,
        date: null,
        data: {
          ranges: [{
            s: form.stage.value,
            f: form.from.value,
            to: form.to.value,
          }]
        }
      });
      if(logRes.result !== true) {
        State.progressUpdateError = res;
      } else {
        State.progressUpdateSuccess = true;
      }
      //TODO what if we log multiple ranges?      
    }
    Bus.emit(Bus.events.progressUiChanged);
  },

};