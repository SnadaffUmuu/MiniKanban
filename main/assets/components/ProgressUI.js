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
    fromInputField: '#fromField',
    toInputField: '#toField',
    selectField: '#progressUi select',
    draftContainer: '#newRanges',
  },

  events: {
    click: {
      '##': 'hideUi',
      '@promptButton': 'showUi',
      '@logProgressPreviewButton': 'preview',
      '@logProgressConfirmButton': 'commitMove',
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
    this.dom.fromInputField = document.querySelector(this.selectors.fromInputField);
    this.dom.toInputField = document.querySelector(this.selectors.toInputField);
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
    const colIndex = data.targetIndex;
    const targetColName = BoardDomain.getColumnByIndex(colIndex).name;
    const hideForm = State.progressUpdateSuccess != null;
    const draft = State.newRangesDraft;
    const formDraft = State.progressFormDraft;
    const logError = State.logUpdateError;
    const range = Utils.extractRange(task.description);
    const colCountForTheBook = board.columns.length;
    return `
  <div id="progressUi">
    <h6>${task.description}</h6>
    <table id="taskData" style="background:${Colors[task.color]}">
      <tr><td>to column</td><td>${targetColName}</td></tr>
      <tr>
        <td>
          <div style="width:100%;height:100%;display:flex;flex-flow:row nowrap;justify-content:space-between;">
            <span>${BoardDomain.getColumn(data.sourceColumnId).name}</span>
            <span style="padding: 0 3px;">→</span>
          </div>
        </td>
        <td>${BoardDomain.getColumn(data.targetColumnId).name}</td>
      </tr>
    </table>
    <form ${hideForm ? 'class="hidden"' : ''} name="progressForm" action="javascript:void(0)" data-book-key="${book.key}">
      <table style="width:100%;">
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
          <td><label for="colField">column</label></td>
          <td>
            <select id="colField" name="column">
            ${Array.from({length: board.columns.length}).map((_, i) => {
            const hasDraftCol = formDraft && formDraft.c != null;
            return `
              <option ${(
          (hasDraftCol && i == formDraft.c) ||
          (!hasDraftCol && i == colIndex))
          ? 'selected' : ''} value="${i}">${BoardDomain.getColumnByIndex(i).name} [${i}]</option>
              `}).join('')}
            </select>  
          </td>
        </tr>
        <tr>
          <td><label for="consumeMove">Consume move?</label></td>
          <td><input type="checkbox" name="consumeMove" id="consumeMove" ${formDraft?.consumeMove != null
          ? (formDraft.consumeMove ? ' checked' : '')
          : data.defaultConsumeMove != null
            ? (data.defaultConsumeMove ? ' checked' : '')
            : ''}>
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
      ${this.getRangesHtml(Utils.sortBy(BooksDomain.getBookRanges(book.key), 'c', true))}
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
        <td style="text-align:right;">${r.f}${r.t !== r.f ? `-${r.t}` : ''}</td>
        <td>${BoardDomain.getColumnByIndex(r.c).name}</td>
        <td>[${r.c}]</td>
      </tr>`;
    }).join('')}
    </table>`;
  },

  formChangeHandler(el, e) {
    if(!State.progressFormDraft) {
      State.progressFormDraft = {};
    }
    if(el.id == 'consumeMove') {
      State.progressFormDraft[el.name] = el.checked;
    } else {
      if(!this.dom.fromInputField.value && !this.dom.toInputField.value) {
        //диапазон очищен - карточка без диапазона?
        this.dom.previewButton.classList.add('hidden');
        this.dom.submitButton.classList.remove('hidden');
      } else {
        this.dom.previewButton.classList.remove('hidden');
        this.dom.submitButton.classList.add('hidden');
      }
      this.dom.draftContainer.innerHTML = '';

      State.progressFormDraft[el.name] = el.value;
    }
  },

  preview() {
    State.newRangesDraft = null;
    State.logUpdateError = null;
    State.progressUpdateSuccess = null;

    const form = document.forms['progressForm'];
    const hasRange = form.from.value !== '' && form.to.value !== '';
    if(hasRange) {
      const range = {
        c: form.column.value,
        f: form.from.value,
        t: form.to.value
      };
      State.newRangesDraft = Utils.sortBy(BooksDomain.getNewRangesForRange(form.dataset.bookKey, range), 'c', true);
      Bus.emit(Bus.events.progressUiChanged);
    }

  },

  commitMove() {

    const form = this.dom.form;

    BoardDomain.commitBalance(form.consumeMove.checked);

    BooksDomain.addOrUpdateRange(form.dataset.bookKey);

    const eventData = {
      book: form.dataset.bookKey,
      consumeMove: form.consumeMove.checked
    };

    if(form.from.value !== '' && form.to.value !== '') {
      eventData.from = form.from.value;
      eventData.to = form.to.value;
    }

    const logRes = EventsDomain.log(eventData);

    if(logRes.result !== true) {
      State.logUpdateError = res;
    }
    if(!State.logUpdateError) {
      State.progressUpdateSuccess = true;
    }
    Bus.emit(Bus.events.boardsChanged);
    Bus.emit(Bus.events.progressUiChanged);
    Bus.emit(Bus.events.headerUIChanged);
    Bus.emit(Bus.events.booksChanged);
  },

};