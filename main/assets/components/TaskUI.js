import {Utils} from './Utils.js' 
import {Bus} from './Bus.js'
import {BoardDomain} from './BoardDomain.js'
import {State} from './State.js'
import {Colors} from './Colors.js'
import {RanksUI} from './RanksUI.js'

export const TaskUI = {

  name: 'TaskUI',

  selectors: {
    taskEditInput: '.task-edit-input',
    taskEditButton: '.task-edit-button',
    taskTitle: '.task .task-title',
    colorsListItem: '.colors-list li',
    addTask: '.js-add-task',
    cancelAddTaskButton: '.js-cancel-add-task',
    cancelEditTaskButton: '.js-cancel-edit-task',
    taskInfoToggle: '.task-info-toggle',
    taskExpandButton: '.task-expand-button ',
    taskDeleteButton: '.task-delete',
    cancelDeleteTaskButton: '.cancel-delete-task',
    confirmDeleteTaskButton: '.confirm-delete-task',
    taskEditSaveButton: '.task-edit-save',
    cloneTask: '.task-clone',
    colorPickerButton: '.task-change-color',
    cancelSetColorButton: '.cancel-set-color',
    incrVocabPractice : '.incr-vocab-practice',
  },

  events : {
    click : {
      '@incrVocabPractice' : 'incrVocab',
    },
  },

  init() {
    Bus.on(Bus.events.taskUiChanged, (id) => {
      this.render(id);
    });

    Bus.on(Bus.events.boardsChanged, () => {
      State.boardUi.taskUi = {};
    });
  },

  getId(el) {
    return el.closest('.task').dataset.id;
  },

  getMode(el) {
    const obj = State.boardUi.taskUi[this.getId(el)];
    return obj.mode || null;
  },

  getInput(el) {
    return el.closest('.task').querySelector(this.selectors.taskEditInput);
  },

  setTaskUi(id, updater) {
    const prev = State.boardUi.taskUi[id] || {};
    const next = updater(prev);

    if(next === null) {
      delete State.boardUi.taskUi[id];
    } else {
      State.boardUi.taskUi[id] = next;
    }

    Bus.emit(Bus.events.taskUiChanged, id);
  },

  toggleTaskInfo(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: prev.mode === 'menuOpened' || prev.mode === 'edit' ? 'default' : 'menuOpened',
      description: this.getInput(el).dataset.originalValue
    }));
  },

  showAddTaskForm(el) {
    const id = Utils.generateUID();
    this.setTaskUi(id, () => ({
      mode: 'create',
      columnId: Utils.getColumnEl(el).dataset.id,
      description: '',
      color: 'white',
    }));
  },

  hideAddTaskUi(el) {
    this.setTaskUi(this.getId(el), () => null);
  },

  hideEditTaskUi(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'menuOpened',
      description: this.getInput(el).originalValue
    }));
  },

  toggleEdit(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: prev.mode === 'edit' ? 'menuOpened' : 'edit',
      description: this.getInput(el).dataset.originalValue
    }));
  },

  showEditUi(el) {
    if(this.getMode(el) !== 'menuOpened') return;
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'edit'
    }));
  },

  showDeleteUi(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'deleteConfirm'
    }));
  },

  showColorPicker(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'colors'
    }));
  },

  cancelDelete(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'menuOpened'
    }));
  },

  cancelSetColor(el) {
    this.setTaskUi(this.getId(el), (prev) => ({
      ...prev,
      mode: 'menuOpened',
      color: el.closest('.task').querySelector('[data-original-color]').dataset.originalColor
    }));
  },

  deleteTask(el) {
    BoardDomain.deleteTask(this.getId(el));
    Bus.emit(Bus.events.boardsChanged);
  },

  saveTask(el) {
    const taskEl = el.closest('.task');
    const columnEl = el.closest('.column');
    const data = {
      color: taskEl.dataset.color,
      description: this.getInput(el).value
    };
    if (taskEl.dataset.vocabCount) {
      data.vocabCount = taskEl.dataset.vocabCount;
    }
    BoardDomain.updateTask(this.getId(el), columnEl.dataset.id, data);
    Bus.emit(Bus.events.boardsChanged);
  },

  cloneTask(el) {
    const newId = BoardDomain.cloneTask(this.getId(el));
    State.afterRender.push(() => {
      const currentColumnEl = document.querySelector(`[data-id="${el.closest('.column').dataset.id}"]`);
      document.querySelector('main').scrollLeft = currentColumnEl.offsetLeft - 30;
      const newTaskEl = currentColumnEl.querySelector(`.task[data-id="${newId}"]`);
      newTaskEl.querySelector('.task-info-toggle').click();
      newTaskEl.querySelector('.task-edit-button').click();
    });
    Bus.emit(Bus.events.boardsChanged);
  },

  incrVocab(el) {
    const taskEl = el.closest('.task');
    const task = BoardDomain.getTask(taskEl.dataset.id);
    const num = task.vocabCount ? Utils.toInt(task.vocabCount) + 1 : 1;
    taskEl.dataset.vocabCount = num;
    this.saveTask(el);
  },

  render(id) {
    console.log('RENDER: TaskUI');
    let el = document.querySelector(`[data-id="${id}"]`);
    const uiTask = State.boardUi.taskUi[id];
    if(el && !uiTask) {
      el.remove();
    } else {
      const html = this.getTaskHtml(id);
      if(el) {
        el.outerHTML = html;
      } else {
        document.querySelector(`.column[data-id="${uiTask.columnId}"] .column-body`).insertAdjacentHTML('afterbegin', html);
      }
      el = document.querySelector(`[data-id="${id}"]`);
      const input = el.querySelector(`.task-edit-input`);
      if(uiTask.mode === 'create' || uiTask.mode === 'edit') {
        Utils.expandInput(input);
        Utils.focusAndPlaceCursorAtEnd(input);
        this.updateButtonState(input);
      }
    }
  },

  getTaskHtml(id) {
    const domainTask = BoardDomain.getTask(id);
    const uiTask = State.boardUi.taskUi[id];
    const column = BoardDomain.getColumnByTaskId(id);

    const isCreate = !domainTask && uiTask && uiTask.mode === 'create';
    const isEdit = domainTask && uiTask && uiTask.mode === 'edit';
    const isMenuOpened = domainTask && uiTask && uiTask.mode === 'menuOpened';
    const isDeleteConfirm = domainTask && uiTask && uiTask.mode === 'deleteConfirm';
    const isColorPicker = domainTask && uiTask && uiTask.mode === 'colors';
    const isDefault = !isCreate && !isEdit && !isMenuOpened && !isDeleteConfirm && !isColorPicker;
    const isVocabCol = isEdit ? column.name == 'Лексика' : null;
    const showVocabDots = isVocabCol && domainTask.vocabCount;

    const origColor = domainTask ? domainTask.color : null;
    const descr = uiTask && uiTask.description ? uiTask.description : (domainTask ? domainTask.description : '');
    const origDescr = domainTask ? domainTask.description : '';
    const color = uiTask && uiTask.color ? uiTask.color : (domainTask ? domainTask.color : 'white');

    return `
    <div class="task ${isMenuOpened ? 'expanded' : ''}" style="background:${Colors[color]};" data-color="${color}" data-id="${id}">
      ${isDefault ? `<div class="ranks-info">${this.getTaskRanksInfo(domainTask, column, BoardDomain.getCurrentBoard())}</div>` : ''}
      ${showVocabDots ? `<div class="vocab-count-dots">${Array.from({length:domainTask.vocabCount}).map((_,i) => '・').join('')}</div>` : ''}
      <div class="task-expand-button ${!isDefault ? 'hidden' : ''}"></div>
      <button class="task-info-toggle ${isEdit || isMenuOpened ? 'expanded' : ''}"></button>
      <div class="task-header ${!isDefault && !isMenuOpened ? 'hidden' : ''}">
        <span class="task-title">${descr}</span>
      </div>
      <div class="task-info ${!isMenuOpened ? 'hidden' : ''}">
        ${isVocabCol ? '<button class="incr-vocab-practice"></button>' : ''}
        <button class="task-change-color"></button>
        <button class="task-delete"></button>
        <button class="task-clone"></button>
        <button class="task-edit-button"></button>
      </div>
      <div class="task-edit ${isCreate || isEdit ? '' : 'hidden'}">
        <textarea rows="1" ${origDescr
          ? `data-original-value="${Utils.escapeAttr(origDescr)}"`
          : `placeholder="Description"`
        } class="task-edit-input">${Utils.escapeHtml(descr)}</textarea>
        ${isCreate ? `<div style="padding-left:10px;"><br>${this.getTaskColorPicker(color)}</div>` : ''}
        <button class="task-edit-save board-management-button" disabled>Save</button>
        <button class="${isCreate ? 'js-cancel-add-task' : 'js-cancel-edit-task'} task-edit-cancel board-management-button">Cancel</button>
      </div>
      <div class="task-delete-block ${isDeleteConfirm ? '' : 'hidden'}">
        Delete this task?<br><br>
        <button class="confirm-delete-task  board-management-button">Delete</button>
        <button class="cancel-delete-task  board-management-button">Cancel</button>
      </div>
      <div data-original-color="${origColor}" class="set-task-colors ${isColorPicker ? '' : 'hidden'}">
        Choose task color<br><br>
        ${this.getTaskColorPicker(color)}
        <button class="task-edit-save board-management-button" ${color == origColor ? 'disabled' : ''}>Save</button>
        <button class="cancel-set-color board-management-button" >Cancel</button>
      </div>
    </div>
    `
  },

  getTaskRanksInfo(task, column, board) {
    return `
      ${RanksUI.getLevelMarkHtml(task.color)}
      ${RanksUI.getOwnCount(board, task.color)}
      ${RanksUI.getPassMarkHtml(task, column)}
      ${RanksUI.getUpperLevelMarkHtml(task.color)}
    `;
  },

  updateButtonState(el) {
    Utils.updateButtonState(
      el,
      el.closest('.task-edit').querySelector(this.selectors.taskEditSaveButton)
    );
  },

  taskDescrInputHandler(el) {
    this.updateButtonState(el);
    Utils.expandInput(el);
  },

  previewColor(el) {
    const id = el.closest('.task').dataset.id;
    State.boardUi.taskUi[id].color = el.dataset.color;
    State.boardUi.taskUi[id].description = this.getInput(el).value;
    Bus.emit(Bus.events.taskUiChanged, id);
  },

  getTaskColorPicker(currentColor) {
    if(!currentColor) {
      currentColor = Colors.white;
    }
    const colors = Object.keys(Colors).map(key => {
      const color = Colors[key];
      return `
        <li data-color="${key}" style="background:${color}" ${currentColor == key ? ' class="current"' : ''}></li>  
      `
    });
    return `
      <ul class="colors-list">
        ${colors.join('')}
      </ul>`
  },

};