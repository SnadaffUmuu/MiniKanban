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
    logProgressPreviewButton: '#previewLogProgress',
    form: '#progressUi form',
    inputField: '#progressUi input',
    selectField: '#progressUi select',
    draftContainer: '#newRanges',
  },

  events: {
    click: {
      '##': 'hideUi',
      '@promptButton': 'showUi',
      '@logProgressPreviewButton': 'preview',
      '@logProgressConfirmButton': 'log',
    },
    input: {
      '@inputField': 'formChangeHandler',
    },
    change: {
      '@selectField': 'formChangeHandler',
    },
  },

  dom: {
    form: null,
    previewButton: null,
    submitButton: null,
    draftContainer: null,
  },

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
    if(!buttonHidden) {
      this.dom.promptButton.style.left = (data.position[0] - 35) + 'px';
      this.dom.promptButton.style.top = data.position[1] + 'px';
    }
    this.dom.dialog.querySelector(this.selectors.dialogContent).innerHTML = hasData && buttonHidden ? `
      ${this.getFormHtml(book, task)}
    ` : '';
    this.dom.dialog.classList.toggle('hidden', dialogHidden);

    this.dom.form = document.querySelector(this.selectors.form);
    this.dom.previewButton = document.querySelector(this.selectors.logProgressPreviewButton);
    this.dom.submitButton = document.querySelector(this.selectors.logProgressConfirmButton);
    this.dom.draftContainer = document.querySelector(this.selectors.draftContainer);
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
    State.newRangesDraft = null;
    State.logUpdateError = null;
    State.progressFormDraft = null;
    this.render();
  },

  getFormHtml(book, task) {
    const board = BoardDomain.getCurrentBoard();
    const data = State.progressData;
    const stage = BooksDomain.getStageAtIndex(board.columns, Utils.toInt(book.startIndex), data.targetIndex);
    const hideForm = State.progressUpdateSuccess != null;
    const draft = State.newRangesDraft;
    const formDraft = State.progressFormDraft;
    const logError = State.logUpdateError;
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
          <td><input type="number" id="fromField" name="from" value="${formDraft && formDraft.from ? formDraft.from : range ? range[0] : ''}"></td>
        </tr>
        <tr>
          <td><label for="toField">to page</label></td>
          <td><input type="number" id="toField" name="to" value="${formDraft && formDraft.to ? formDraft.to : range ? range[1] : ''}"></td>
        </tr>
        <tr>
          <td><label for="stageField">stage</label></td>
          <td>
            <select id="stageField" name="stage">
            ${Array.from({length: stagesCountForTheBook}).map((_, i) => {
              const hasDraftStage = formDraft && formDraft.stage != null;
              return `
              <option ${(
                (hasDraftStage && i + 1 == formDraft.stage) ||
                (!hasDraftStage && i + 1 == stage))
                  ? 'selected': ''} value="${i + 1}">${i + 1}</option>
              `}).join('')}
            </select>  
          </td>
        </tr>
      </table>
      <div class="formErrors ${logError ? '' : 'hidden'}">
        ${logError ? `<br>${logError.message}<br>${logError.details}` : ''}
      </div>
      <button class="board-management-button ${!range || draft ? 'hidden' : ''}" id="previewLogProgress">preview</button>
      <button class="board-management-button ${!range || draft ? '' : 'hidden'}" id="confirmLogProgress">Log</button>
    </form>
    <div class="successMessage ${State.progressUpdateSuccess ? '' : 'hidden'}">Success</div>
    <div id="currentProgress" ${range ? '' : 'class="hidden"'}>
      Current progress:
      ${this.getRangesHtml(Utils.sortBy(BooksDomain.getBookRanges(book.key), 's', true))}
    </div>
    <div id="newRanges" ${draft ? '' : 'class="hidden"'}>
      Ranges to be:
      ${this.getRangesHtml(draft)}
    </div>
  </div>    
    `;
  },

  getRangesHtml(ranges) {
    if(!ranges) return '';

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

  formChangeHandler(el, e) {
    this.dom.previewButton.classList.remove('hidden');
    this.dom.submitButton.classList.add('hidden');
    this.dom.draftContainer.innerHTML = '';
    if(!State.progressFormDraft) {
      State.progressFormDraft = {};
    }
    State.progressFormDraft[el.name] = el.value;
  },

  preview() {
    State.newRangesDraft = null;
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
      //const res = BooksDomain.getNewRangesForRange(form.dataset.bookKey, range);
      // if(res.result !== true) {
      //   State.progressUpdateError = res;
      // }
      State.newRangesDraft = Utils.sortBy(BooksDomain.getNewRangesForRange(form.dataset.bookKey, range), 's', true);
      Bus.emit(Bus.events.progressUiChanged);
    }

  },

  log() {
    const form = this.dom.form;

    BooksDomain.addOrUpdateRange(form.dataset.bookKey, State.newRangesDraft);

    const type = State.progressData.delta > 0 ? EventsDomain.eventTypes.progress : EventsDomain.eventTypes.rollback;
    const eventData = {
      type: type,
      book: form.dataset.bookKey,
      date: null,
    };

    if(form.from.value !== '' && form.to.value !== '') {
      eventData.data = {
        ranges: [{
          s: form.stage.value,
          f: form.from.value,
          t: form.to.value,
        }]
      };
    } else {
      eventData.data = {
        stage: form.stage.value
      };
    }

    const logRes = EventsDomain.log(eventData);

    if(logRes.result !== true) {
      State.logUpdateError = res;
    }
    if(!State.logUpdateError) {
      State.progressUpdateSuccess = true;
    }
    Bus.emit(Bus.events.progressUiChanged);
  },

};