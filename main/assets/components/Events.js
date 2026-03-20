import {
  HeaderUI,
  RenameUI,
  BoardsList,
  DeleteUI,
  BoardUI,
  DragDrop,
  ColumnHeaderUI,
  TaskUI,
  RanksUI,
  Stats
} from './index.js'

export const Events = {

  namespaces: {
    'HeaderUI': HeaderUI,
    'RenameUI': RenameUI,
    'BoardsList': BoardsList,
    'DeleteUI': DeleteUI,
    'BoardUI': BoardUI,
    'DragDrop': DragDrop,
    'ColumnHeaderUI': ColumnHeaderUI,
    'TaskUI': TaskUI,
    'RanksUI': RanksUI,
    'Stats': Stats,
  },

  map: {
    'click': {
      '##': [
        'HeaderUI.hideMenu',
      ],
      [HeaderUI.selectors.toggleMenuButton]: 'HeaderUI.toggleMenu',
      [HeaderUI.selectors.changeHeaderModeTriggers]: 'HeaderUI.changeMode',
      [HeaderUI.selectors.reset]: 'HeaderUI.reset',
      [RenameUI.selectors.confirmRenameButton]: 'RenameUI.renameBoard',
      [DeleteUI.selectors.deleteBoardConfirmButton]: 'DeleteUI.deleteBoard',
      [BoardsList.selectors.boardsButtons]: 'BoardsList.switchBoard',
      [BoardsList.selectors.createButton]: 'BoardsList.createBoard',
      [BoardUI.selectors.addColumnButton]: 'BoardUI.createColumn',
      [ColumnHeaderUI.selectors.columnMenuTrigger]: 'ColumnHeaderUI.toggleColumnMenu',
      [ColumnHeaderUI.selectors.changeHeaderModeTriggers]: 'ColumnHeaderUI.changeColumnHeaderMode',
      [ColumnHeaderUI.selectors.cancelModeUi]: 'ColumnHeaderUI.cancelModeUi',
      [ColumnHeaderUI.selectors.deleteColumn]: 'ColumnHeaderUI.deleteColumn',
      [ColumnHeaderUI.selectors.renameColumn]: 'ColumnHeaderUI.renameColumn',
      [ColumnHeaderUI.selectors.moveColumnRightButton]: ['ColumnHeaderUI.moveColumn', [true]],
      [ColumnHeaderUI.selectors.moveColumnLeftButton]: ['ColumnHeaderUI.moveColumn', [false]],

      [TaskUI.selectors.taskInfoToggle]: 'TaskUI.toggleTaskInfo',
      [TaskUI.selectors.taskExpandButton]: 'TaskUI.toggleTaskInfo',
      [TaskUI.selectors.addTask]: 'TaskUI.showAddTaskForm',
      [TaskUI.selectors.cancelAddTaskButton]: 'TaskUI.hideAddTaskUi',
      [TaskUI.selectors.cancelEditTaskButton]: 'TaskUI.hideEditTaskUi',
      [TaskUI.selectors.colorsListItem]: 'TaskUI.previewColor',
      [TaskUI.selectors.taskEditButton]: 'TaskUI.toggleEdit',
      [TaskUI.selectors.taskTitle]: 'TaskUI.showEditUi',
      [TaskUI.selectors.taskDeleteButton]: 'TaskUI.showDeleteUi',
      [TaskUI.selectors.colorPickerButton]: 'TaskUI.showColorPicker',
      [TaskUI.selectors.cancelSetColorButton]: 'TaskUI.cancelSetColor',
      [TaskUI.selectors.cancelDeleteTaskButton]: 'TaskUI.cancelDelete',
      [TaskUI.selectors.confirmDeleteTaskButton]: 'TaskUI.deleteTask',
      [TaskUI.selectors.taskEditSaveButton]: 'TaskUI.saveTask',
      [TaskUI.selectors.cloneTask]: 'TaskUI.cloneTask',

      [RanksUI.selectors.createButton]: 'RanksUI.showCreateUi',
      [RanksUI.selectors.colorsInUseToggle]: 'RanksUI.toggleColorsInUse',
      [RanksUI.selectors.countersToggle]: 'RanksUI.toggleCounters',
      [RanksUI.selectors.createCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.previewButton]: 'RanksUI.preview',
      [RanksUI.selectors.saveButton]: 'RanksUI.save',
      [RanksUI.selectors.deleteButton]: 'RanksUI.showDeleteUi',
      [RanksUI.selectors.deleteCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.deleteConfirmButton]: 'RanksUI.delete',
      [RanksUI.selectors.editButton]: 'RanksUI.edit',
      [RanksUI.selectors.editCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.resetCountersButton]: 'RanksUI.showResetUi',
      [RanksUI.selectors.resetCountersCancelButton]: 'RanksUI.resetUi',
      [RanksUI.selectors.resetCountersConfirmButton]: 'RanksUI.resetCounters',

      [Stats.selectors.resetButton]: 'Stats.promptReset',
      [Stats.selectors.confirmResetButton]: 'Stats.reset',
      [Stats.selectors.cancelResetButton]: 'Stats.resetUi',
    },
    'input': {
      [RenameUI.selectors.renameInput]: 'RenameUI.updateButtonState',
      [ColumnHeaderUI.selectors.renameColumnInput]: 'ColumnHeaderUI.updateButtonState',
      [ColumnHeaderUI.selectors.skipMoveCheckbox]: 'ColumnHeaderUI.setSkipMove',
      [TaskUI.selectors.taskEditInput]: 'TaskUI.taskDescrInputHandler',
      [RanksUI.selectors.textarea]: 'RanksUI.updateButtonState',
    },
    'contextmenu': {
      '##': ['DragDrop.preventOnce', [true]],
    },
    'touchstart': {
      '##': [
        'DragDrop.boardsButtonTouchStart',
        'DragDrop.taskTouchStart',
      ],
    },
    'touchend': {
      '##': ['DragDrop.touchEnd'],
    },
    'touchmove': {
      '##': ['DragDrop.touchMoveTask'],
    },
  },

  resolveMethod(methodPath) {
    const parts = methodPath.split('.');
    if(parts.length !== 2) return null;

    const [nsName, methodName] = parts;
    const ns = this.namespaces[nsName];

    if(!ns || typeof ns[methodName] !== 'function') {
      return null;
    }

    return {
      ctx: ns,
      fn: ns[methodName],
    };
  },

  handler(e, eventName) {
    const entry = this.map[eventName];
    if(!entry) return;

    const selectors = Object.keys(entry);
    const normals = selectors.filter(s => s !== '##');
    const globals = selectors.filter(s => s === '##');

    [...normals, ...globals].forEach(selector => {
      const callbackObj = entry[selector];

      let callbacks = [];

      // 1) строка
      if(typeof callbackObj === 'string') {
        callbacks = [[callbackObj, []]];
      }

      // 2) массив
      else if(Array.isArray(callbackObj)) {

        // случай [method, params]
        if(
          typeof callbackObj[0] === 'string' &&
          Array.isArray(callbackObj[1])
        ) {
          callbacks = [[callbackObj[0], callbackObj[1]]];
        }

        // случай ['m1', 'm2', ...]
        else {
          callbacks = callbackObj.map(method => [method, []]);
        }
      }

      callbacks.forEach(([methodPath, params]) => {

        const shouldRun =
          selector === '##' ||
          (e.target.matches && e.target.matches(selector));

        if(!shouldRun) return;

        const resolved = this.resolveMethod(methodPath);
        if(!resolved) return;

        resolved.fn.call(resolved.ctx, e.target, e, params);
      });
    });
  },

  init() {
    for(let eventName in this.map) {
      document.addEventListener(eventName, (e) => {
        this.handler(e, eventName);
      });
    }
  },

};