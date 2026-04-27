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
  Stats,
  BooksUI,
  Dialog,
  ProgressUI,
} from './index.js'
import {Components} from './Components.js';

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
    'BooksUI': BooksUI,
    'Dialog': Dialog,
    'ProgressUI': ProgressUI,
  },

  map: {
    'click': {
      '##': [
        'HeaderUI.hideMenu',
      ],
      [HeaderUI.selectors.toggleMenuButton]: 'HeaderUI.toggleMenu',
      [HeaderUI.selectors.changeHeaderModeTriggers]: 'HeaderUI.changeMode',
      [HeaderUI.selectors.reset]: 'HeaderUI.reset',
      [HeaderUI.selectors.screenSwitch]: 'HeaderUI.switchScreen',

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
      [RanksUI.selectors.freeColorsToggle]: 'RanksUI.toggleColorsInUse',
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

      [BooksUI.selectors.addBookButton]: ['BooksUI.toggleAddUi', [true]],
      [BooksUI.selectors.addBookCancelButton]: ['BooksUI.toggleAddUi', [false]],
      [BooksUI.selectors.deleteBookButton]: 'BooksUI.showDeleteBookUi',
      [BooksUI.selectors.editBookButton]: 'BooksUI.showEditBookUi',
      [BooksUI.selectors.editStateButton]: 'BooksUI.showEditStateUi',
      [BooksUI.selectors.extraUiCancelButton]: 'BooksUI.cancelExtra',
      [BooksUI.selectors.closeExtraUi]: 'BooksUI.cancelExtra',
      [BooksUI.selectors.extraUiConfirmButton]: 'BooksUI.confirmExtra',
      [BooksUI.selectors.addRangeButton]: 'BooksUI.addRangeRow',
      [BooksUI.selectors.removeRangeRowRutton]: 'BooksUI.removeRangeRow',

      //[ProgressUI.selectors.promptButton] : 'ProgressUI.hideUi',
    },
    'submit': {
      [BooksUI.selectors.addBookForm]: 'BooksUI.addBook',
      [BooksUI.selectors.editBookForm]: 'BooksUI.updateBook',
    },
    'input': {
      [RenameUI.selectors.renameInput]: 'RenameUI.updateButtonState',
      [ColumnHeaderUI.selectors.renameColumnInput]: 'ColumnHeaderUI.updateButtonState',
      [ColumnHeaderUI.selectors.skipMoveCheckbox]: 'ColumnHeaderUI.setSkipMove',
      [TaskUI.selectors.taskEditInput]: 'TaskUI.taskDescrInputHandler',
      [RanksUI.selectors.textarea]: 'RanksUI.ranksInputHandler',
    },
    'change': {
      [BooksUI.selectors.bookBoardSelect]: 'BooksUI.selectBoardHandler',
      [BooksUI.selectors.bookBoardColorSelect]: 'BooksUI.setColorsDropdownColor',
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

  // handler(e, eventName) {
  //   const entry = this.map[eventName];
  //   if(!entry) return;

  //   const selectors = Object.keys(entry);
  //   const normals = selectors.filter(s => s !== '##');
  //   const globals = selectors.filter(s => s === '##');

  //   [...normals, ...globals].forEach(selector => {
  //     const callbackObj = entry[selector];

  //     let callbacks = [];

  //     // 1) строка
  //     if(typeof callbackObj === 'string') {
  //       callbacks = [[callbackObj, []]];
  //     }

  //     // 2) массив
  //     else if(Array.isArray(callbackObj)) {

  //       // случай [method, params]
  //       if(
  //         typeof callbackObj[0] === 'string' &&
  //         Array.isArray(callbackObj[1])
  //       ) {
  //         callbacks = [[callbackObj[0], callbackObj[1]]];
  //       }

  //       // случай ['m1', 'm2', ...]
  //       else {
  //         callbacks = callbackObj.map(method => [method, []]);
  //       }
  //     }

  //     callbacks.forEach(([methodPath, params]) => {

  //       const shouldRun =
  //         selector === '##' ||
  //         (e.target.matches && e.target.matches(selector));

  //       if(!shouldRun) return;

  //       const resolved = this.resolveMethod(methodPath);
  //       if(!resolved) return;

  //       resolved.fn.call(resolved.ctx, e.target, e, params);
  //     });
  //   });
  // },

  normalize(val) {
    if(!val) return [];

    // строка → [[method, []]]
    if(typeof val === 'string') {
      return [[val, []]];
    }

    if(Array.isArray(val)) {

      // [method, params]
      if(typeof val[0] === 'string' && Array.isArray(val[1])) {
        return [val];
      }

      // уже [[method, params]]
      if(
        Array.isArray(val[0]) &&
        typeof val[0][0] === 'string'
      ) {
        return val;
      }

      // ['m1', 'm2']
      return val.map(v => {
        if(typeof v === 'string') return [v, []];

        if(Array.isArray(v) && typeof v[0] === 'string') {
          return [v[0], v[1] || []];
        }

        return null;
      }).filter(Boolean);
    }

    return [];
  },

  mergeMaps(target, source) {
    Object.keys(source).forEach(eventName => {
      if(!target[eventName]) {
        target[eventName] = {};
      }

      const targetEvent = target[eventName];
      const sourceEvent = source[eventName];

      Object.keys(sourceEvent).forEach(selector => {
        const existing = targetEvent[selector];
        const incoming = sourceEvent[selector];

        targetEvent[selector] = [
          ...this.normalize(existing),
          ...this.normalize(incoming)
        ];
      });
    });
  },

  resolveSelector(selector, component) {
    if(selector.startsWith('@')) {
      const key = selector.slice(1);
      return component.selectors[key];
    }
    return selector;
  },

  resolveMethod(methodPath) {
    if(typeof methodPath !== 'string') return null;

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

    Object.keys(entry).forEach(selector => {
      const callbacks = entry[selector];

      if(!Array.isArray(callbacks)) return; // 🔒 защита

      const shouldRun =
        selector === '##' ||
        (e.target.matches && e.target.matches(selector));

      if(!shouldRun) return;

      callbacks.forEach(([methodPath, params]) => {
        const resolved = this.resolveMethod(methodPath);
        if(!resolved) return;

        resolved.fn.call(resolved.ctx, e.target, e, params);
      });
    });
  },

  init() {

    const addNamespace = (val, component) => {

      const add = (m) =>
        m.includes('.') ? m : `${component.name}.${m}`;

      if(typeof val === 'string') {
        return add(val);
      }

      if(Array.isArray(val)) {

        // [method, params]
        if(typeof val[0] === 'string' && Array.isArray(val[1])) {
          return [add(val[0]), val[1]];
        }

        return val.map(item => {

          if(typeof item === 'string') {
            return add(item);
          }

          if(Array.isArray(item) && typeof item[0] === 'string') {
            return [add(item[0]), item[1] || []];
          }

          return item;
        });
      }

      return val;
    };

    // 🔥 1. НОРМАЛИЗУЕМ ИСХОДНУЮ MAP
    Object.keys(this.map).forEach(eventName => {
      const eventMap = this.map[eventName];

      Object.keys(eventMap).forEach(selector => {
        eventMap[selector] = this.normalize(eventMap[selector]);
      });
    });

    // 🔥 2. ДОБАВЛЯЕМ EVENTS ИЗ КОМПОНЕНТОВ
    Components.forEach(component => {
      if(!component.events) return;

      Object.keys(component.events).forEach(eventName => {
        if(!this.map[eventName]) {
          this.map[eventName] = {};
        }

        const entries = component.events[eventName];

        Object.keys(entries).forEach(selectorKey => {
          const realSelector = this.resolveSelector(selectorKey, component);
          const rawValue = entries[selectorKey];
          const value = addNamespace(rawValue, component);

          this.mergeMaps(this.map, {
            [eventName]: {
              [realSelector]: value
            }
          });
        });
      });
    });

    // 🔥 3. LISTENERS
    Object.keys(this.map).forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        this.handler(e, eventName);
      });
    });
  },  
};