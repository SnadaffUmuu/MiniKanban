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
    if (!buttonHidden) {
      this.dom.promptButton.style.left = data.position[0] + 'px';
      this.dom.promptButton.style.top = data.position[1] + 'px';
    }
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
    State.logUpdateError = null;
    this.render();
  },

  getFormHtml(book, task) {
    const board = BoardDomain.getCurrentBoard();
    const data = State.progressData;
    const stage = BooksDomain.getStageAtIndex(board.columns, Utils.toInt(book.startIndex), data.targetIndex);
    const hideForm = State.progressUpdateSuccess != null;
    const progressError = State.progressUpdateError;
    const logError = stage.logUpdateError;
    const range = Utils.extractRange(task.description);
    const stagesCountForTheBook = BooksDomain.getBookStagesCountFromBoard(board.id, Utils.toInt(book.startIndex));
    return `
  <div id="progressUi">
    <h6>${task.description}</h6>
    <table id="taskData" style="background:${Colors[task.color]}">
      <tr><td>to stage</td><td>${stage}</td></tr>
      <tr>
        <td>
          <div style="width:100%;height:100%;display:flex;flex-flow:row nowrap;justify-content:space-between;">
            <span>${BoardDomain.getColumn(data.sourceColumnId).name}</span>
            <span style="padding: 0 3px;">→</span>
          </div>
        </td>
        <td>${BoardDomain.getColumn(data.targetColumnId).name}</td>
      </tr>
      <tr><td>startColIndex</td><td>${book.startIndex || 0}</td></tr>
      <tr><td>progress?</td><td>${data.delta > 0 ? 'progress' : 'rollback'}</td></tr>
    </table>
    <form ${hideForm ? 'class="hidden"' : ''} name="progressForm" action="javascript:void(0)" data-book-key="${book.key}">
      <table>
        <tr>
          <td>book</td>
          <td>${book.name}
            <input type="hidden" name="book" value="${book.key}">
          </td>
        </tr>
        <tr>
          <td><label for="fromField">from page</label></td>
          <td><input type="number" id="fromField" name="from" value="${range ? range[0] : ''}"></td>
        </tr>
        <tr>
          <td><label for="toField">to page</label></td>
          <td><input type="number" id="toField" name="to" value="${range ? range[1] : ''}"></td>
        </tr>
        <tr>
          <td><label for="stageField">stage</label></td>
          <td>
            <select id="stageField" name="stage">
            ${Array.from({length: stagesCountForTheBook}).map((_, i) => `
              <option ${i + 1 == stage ? 'selected' : ''} value="${i + 1}">${i + 1}</option>
              `).join('')}
            </select>  
          </td>
        </tr>
      </table>
      <div class="formErrors ${progressError || logError ? '' : 'hidden'}">
        ${progressError ? `
          ${progressError.message}<br>
          ${progressError.details}
        ` : ''}
        ${logError ? `<br>${logError.message}<br>${logError.details}` : ''}
      </div>
      <button class="board-management-button" id="confirmLogProgress">Log</button>
    </form>
    <div class="successMessage ${State.progressUpdateSuccess ? '' : 'hidden'}">Success</div>
    <div id="currentProgress">
      Current progress:
      ${this.getCurrentRangesHtml(book.key)}
    </div>
  </div>    
    `;
  },

  getCurrentRangesHtml(key) {
    const ranges = BooksDomain.getBookRanges(key);
    return `<table>
    ${ranges.map((r, i) => {
      return `
      <tr>
        <td>${r.f}-${r.t}</td>
        <td>stage ${r.s}</td>
      </tr>`;
    }).join('')}
    </table>`;
  },  

  log() {

    State.progressUpdateError = null;
    State.logUpdateError = null;
    State.progressUpdateSuccess = null;

    const form = document.forms['progressForm'];
    const hasRange = form.from.value !== '' && form.to.value !== '';
    if(hasRange) {
      const range = {
        s: form.stage.value,
        f: form.from.value,
        t: form.to.value
      };
      const res = BooksDomain.addOrUpdateRange(form.dataset.bookKey, range);
      if(res.result !== true) {
        State.progressUpdateError = res;
      }
    }

    const type = State.progressData.delta > 0 ? EventsDomain.eventTypes.progress : EventsDomain.eventTypes.rollback;
    const eventData = {
      type: type,
      book: form.dataset.bookKey,
      date: null,
    };
    if (hasRange) {
      eventData.data = {
        ranges: [{
          s: form.stage.value,
          f: form.from.value,
          t: form.to.value,
        }]
      };
    } else {
      eventData.data = {
        stage : form.stage.value
      };
    }

    const logRes = EventsDomain.log(eventData);

    if(logRes.result !== true) {
      State.logUpdateError = res;
    }
    if (!State.logUpdateError && !State.progressUpdateError) {
      State.progressUpdateSuccess = true;
    }
    Bus.emit(Bus.events.progressUiChanged);
  },

};