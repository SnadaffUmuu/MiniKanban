import {App} from './App.js'
import {Storage} from './Storage.js'
import {RanksUI} from './RanksUI.js'
import {Utils} from './Utils.js'
import {Colors} from './Colors.js'
import {Bus} from './Bus.js'
import {State} from './State.js'

export const BoardDomain = {

  getBoard(id) {
    return App.data.boards.find(b => b.id == id);
  },

  getCurrentBoard() {
    return App.data.boards.find(b => b.id == App.data.currentBoardId);
  },

  getColumn(id) {
    return this.getCurrentBoard().columns.find(c => c.id == id);
  },

  getTask(id) {
    return this.getCurrentBoard().columns
      .map(col => col.tasks.find(t => t.id === id))
      .find(task => task !== undefined) || null;
  },

  getColumnByTaskId(id, board) {
    if(!board) {
      board = this.getCurrentBoard();
    }
    return board.columns.find(col =>
      col.tasks && col.tasks.some(c => c.id === id)
    );
  },

  getBoardsCounters() {
    const bc = App.data.boardsCounters;
    return bc != null ? bc : {};
  },

  switchBoard(boardId) {
    if(App.data.boards.find(b => b.id == boardId)) {
      App.data.currentBoardId = boardId;
      Storage.saveData(App.data);
    }
  },

  saveBoards(updatedBoards, currentBoardId) {
    App.data.boards = updatedBoards;
    if(currentBoardId === null) {
      delete App.data.currentBoardId
    } else {
      App.data.currentBoardId = currentBoardId ? currentBoardId : App.data.currentBoardId;
    }
    Storage.saveData(App.data);
  },

  saveCounters(counters) {
    App.data.boardsCounters = counters;
    Storage.saveData(App.data);
  },

  resetBoardsCounters() {
    App.data.boardsCounters = {};
    Storage.saveData(App.data);
  },

  deleteBoardCounters(board, doSave) {
    delete App.data.boardsCounters[board.id];
    if(doSave) {
      Storage.saveData(App.data);
    }
  },

  resetCounters() {
    const board = this.getCurrentBoard();
    board.rankCounters = {};
    board.rankCountersAbs = {};
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  create() {
    const newId = Utils.generateUID();
    App.data.boards.push({
      id: newId,
      name: "Новая доска",
      columns: [
        {id: Utils.generateUID(), name: "To Do", tasks: []},
        {id: Utils.generateUID(), name: "In progress", tasks: []},
        {id: Utils.generateUID(), name: "Done", tasks: []}
      ]
    });
    this.saveBoards(App.data.boards, newId)
  },

  delete() {
    const currentIndex = App.data.boards.findIndex(b => b.id === App.data.currentBoardId);
    const newBoards = App.data.boards.filter(b => b.id !== App.data.currentBoardId);

    if(newBoards.length > 0) {
      // Выбираем следующую (или предыдущую, если удалили последнюю)
      const nextIndex = Math.min(currentIndex, newBoards.length - 1);
      const newCurrentBoardId = newBoards[nextIndex].id;
      this.saveBoards(newBoards, newCurrentBoardId);
    } else {
      this.saveBoards([], null);
    }
  },

  rename(newName) {
    const board = this.getCurrentBoard();
    board.name = newName;
    this.saveBoards(App.data.boards, board.id);
  },

  reorder(draggedBoardId, insertIndex) {
    const draggedBoard = App.data.boards.find(b => b.id == draggedBoardId);
    App.data.boards = App.data.boards.filter(b => b.id !== draggedBoardId);
    if(insertIndex === -1) insertIndex = App.data.boards.length;
    App.data.boards.splice(insertIndex, 0, draggedBoard);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  createColumn() {
    const newUid = Utils.generateUID();
    const newColumn = {
      id: newUid,
      name: 'Новая колонка',
      tasks: []
    };
    this.getCurrentBoard().columns.push(newColumn);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
    return newUid;
  },

  deleteColumn(id) {
    const board = this.getCurrentBoard();
    const currentIndex = board.columns.findIndex(c => c.id === id);
    board.columns = board.columns.filter((c, i) => i !== currentIndex);
    this.saveBoards(App.data.boards, board.id);
  },

  moveColumn(currentColumnId, doMoveRight) {
    const currentBoard = this.getCurrentBoard();
    if(currentBoard.columns.length == 1) return;
    const currentColumnIndex = currentBoard.columns.findIndex(col => col.id == currentColumnId);
    if((currentColumnIndex == (currentBoard.columns.length - 1) && doMoveRight)
      || (currentColumnIndex == 0 && !doMoveRight)) {
      return;
    }
    const currentColumn = currentBoard.columns[currentColumnIndex];
    if(!currentColumn) return;
    currentBoard.columns = currentBoard.columns.filter(col => col != currentColumn);
    const insertIndex = doMoveRight ? currentColumnIndex + 1 : currentColumnIndex - 1;
    currentBoard.columns.splice(insertIndex, 0, currentColumn);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  setColumnSkipMove(colId, value) {
    this.getColumn(colId)['skipMove'] = value;
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  renameColumn(id, name) {
    if(!name) return;
    this.getColumn(id).name = name;
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  deleteTask(id) {
    const board = this.getCurrentBoard();
    for(const col of board.columns) {
      const index = col.tasks.findIndex(task => task.id === id);
      if(index !== -1) {
        col.tasks.splice(index, 1);
        this.saveBoards(App.data.boards, App.data.currentBoardId);
        return;
      }
    }
  },

  updateTask(id, colId, {color, description}) {
    const board = this.getCurrentBoard();
    let theTask = null;
    let theCol = null;

    board.columns.forEach(col => {
      const task = col.tasks.find(task => task.id === id);
      if(task) {
        theTask = task;
        theCol = col;
      }
    });

    if(theTask) {

      theTask.color = color;
      theTask.description = description;

    } else {

      theTask = {
        id: id,
        color: color,
        description: description
      };

      theCol = board.columns.find(col => col.id === colId);
      theCol.tasks = theCol.tasks ? [theTask, ...theCol.tasks] : [theTask];

    }

    this.checkAndUpdateRanks(board, color);

    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  moveTask(targetColumnId, taskId, insertIndex, position) {
    const board = this.getCurrentBoard();
    const targetColumn = board.columns.find(col => col.id === targetColumnId);
    //const targetColumnIndex = board.columns.findIndex(col => col.id === targetColumnId);
    if(!targetColumn.tasks) targetColumn.tasks = [];
    const sourceColumn = this.getColumnByTaskId(taskId);
    const task = sourceColumn.tasks.find(c => c.id === taskId);
    let sourceColumnIndex = null;
    // Удалим карточку из старой колонки
    if(sourceColumn) {
      sourceColumnIndex = board.columns.findIndex(col => col.id == sourceColumn.id)
      sourceColumn.tasks = sourceColumn.tasks.filter(c => c.id !== taskId);
    }
    // Добавим карточку в новую колонку
    //console.log(insertIndex);
    if(insertIndex === -1) insertIndex = targetColumn.tasks.length;
    targetColumn.tasks.splice(insertIndex, 0, task);

    // this.makeAMove({
    //   color: task.color,
    //   sourceColumn: sourceColumn,
    //   targetColumn: targetColumn
    // });

    this.checkForProgress({
      task: task,
      sourceColumn: sourceColumn,
      targetColumn: targetColumn,
      position: position
    });

    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  cloneTask(currentTaskId) {
    const task = this.getTask(currentTaskId);
    const column = this.getColumnByTaskId(currentTaskId);
    const {id, color, description} = task;
    const newId = Utils.generateUID();
    const newTask = {
      id: newId,
      color: color,
      description: description
    };
    const currentTaskIndex = column.tasks.findIndex(task => task.id == currentTaskId);
    column.tasks.splice(currentTaskIndex + 1, 0, newTask);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
    return newId;
  },

  getColorsInUse(board) {
    const theBoard = board || this.getCurrentBoard();
    const colors = new Set();

    theBoard.columns?.forEach(column => {
      column.tasks?.forEach(task => {
        if(task.color) {
          colors.add(task.color);
        }
      });
    });

    return [...colors]
  },

  getFreeColors() {
    const usedColors = this.getColorsInUse();
    return Object.keys(Colors).filter(color => !usedColors.includes(color));
  },

  checkAndUpdateRanks(board, color) {
    //есть ли цвет в рангах?
    const ranks = board.ranks;
    if(!ranks) return;
    const allRanksColors = [];
    for(const key in ranks) {
      allRanksColors.push(...ranks[key].c);
    }
    if(allRanksColors.includes(color)) {
      return;
    }
    const lowestLevel = Math.max(0, ...Object.keys(ranks));
    ranks[lowestLevel].c = [...ranks[lowestLevel].c, color];
    board.ranks = ranks;
    board.ranksRaw += `,${color}`;
  },

  setRanksData({ranks, ranksRaw}) {
    const board = this.getCurrentBoard();
    board.ranksRaw = ranksRaw;
    board.ranks = ranks;

    /* normalizing */
    const counters = board.rankCounters || {};
    const absCounters = board.rankCountersAbs || {};
    Object.keys(ranks).forEach(level => {
      if(!counters[level]) counters[level] = 0;
      if(!absCounters[level]) absCounters[level] = 0;
    });
    board.rankCounters = counters;
    board.rankCountersAbs = absCounters;

    console.log('ranks', board.ranks);
    console.log('ranksRaw', board.ranksRaw);

    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  deleteRanks() {
    const board = this.getCurrentBoard();
    delete board.ranks;
    delete board.ranksRaw;
    delete board.rankCounters;
    delete board.rankCountersAbs;
    this.deleteBoardCounters(board, false);
    this.saveBoards(App.data.boards, App.data.currentBoardId);
  },

  checkForProgress({task, sourceColumn, targetColumn, position}) {

    console.log('BoardDomain checkForProgress ');

    if(!sourceColumn || !targetColumn) return;
    if(sourceColumn.id === targetColumn.id) return;

    const board = this.getCurrentBoard();

    const sourceIndex = board.columns.findIndex(c => c.id === sourceColumn.id);
    const targetIndex = board.columns.findIndex(c => c.id === targetColumn.id);
    const isGoingForward = targetIndex > sourceIndex;
    const delta = isGoingForward ? 1 : -1;

    const sourceCol = board.columns[sourceIndex];
    const targetCol = board.columns[targetIndex];

    const skipMove =
      (isGoingForward && sourceCol.skipMove) ||
      (!isGoingForward && targetCol.skipMove);

    if(!skipMove) {
      State.progressData = {
        taskId: task.id,
        boardId: board.id,
        sourceIndex : sourceIndex,
        sourceColumnId: sourceCol.id,
        targetIndex : targetIndex,
        targetColumnId : targetCol.id,
        delta : delta,
        position : position
      };
      State.progressPromptShown = true;

      Bus.emit(Bus.events.progress);
    }

    this.makeMove(board, task, delta, skipMove);

  },

  makeMove(board, task, delta, skipMove) {

    //   if(!sourceColumn || !targetColumn) return;
    //   if(sourceColumn.id === targetColumn.id) return;
    //   const board = this.getCurrentBoard();
    //   const sourceIndex = board.columns.findIndex(c => c.id === sourceColumn.id);
    //   const targetIndex = board.columns.findIndex(c => c.id === targetColumn.id);
    //   const isGoingForward = targetIndex > sourceIndex;
    //   const delta = isGoingForward ? 1 : -1;
    //   const sourceCol = board.columns[sourceIndex];
    //   const targetCol = board.columns[targetIndex];

    //   const skipMove =
    //     (isGoingForward && sourceCol.skipMove) ||
    //     (!isGoingForward && targetCol.skipMove);

    const ranks = board.ranks;
    if(!ranks || !task) return;

    const level = RanksUI.getLevelOfColor(task.color, ranks);
    if(!level) return;

    board.rankCounters = board.rankCounters || {};
    board.rankCountersAbs = board.rankCountersAbs || {};

    const ownCount = Utils.toInt(board.rankCounters[level]);
    const absCount = Utils.toInt(board.rankCountersAbs[level]);
    const upperCount = level > 1 ? Utils.toInt(board.rankCounters[level - 1]) : 0;

    // --- 1. Абсолютный счётчик — всегда меняется
    board.rankCountersAbs[level] = absCount + delta;

    // --- 2. Глобальный счётчик доски — всегда меняется
    const boardsCounters = this.getBoardsCounters();
    const boardTotal = Utils.toInt(boardsCounters[board.id]);
    boardsCounters[board.id] = boardTotal + delta;

    this.saveCounters(boardsCounters);

    // --- 3. Если skipMove — логику рангов не трогаем
    if(skipMove) {
      return;
    }

    // --- 4. Первый уровень — всегда меняет свой счётчик
    if(level === 1) {
      board.rankCounters[level] = ownCount + delta;
      return;
    }

    const quotaOwn = Utils.toInt(ranks[level].q);
    const isLastLevel = level === Object.keys(ranks).length;

    if(isLastLevel && ownCount >= quotaOwn) {

      // --- 5. В последнем уровне не накапливаем счет сверх квоты
      // (т.к. нет потомков и его никто не обнуляет)
      board.rankCounters[level] = quotaOwn;

    } else {

      // --- 6. Проверка “в долг”
      // Ход вперёд в долг = у верхнего уровня нет ресурса
      // Ход назад в долг = у верхнего уровня был компенсирующий долг
      // const affectsOwn =
      //   isGoingForward
      //     ? upperCount > 0
      //     : true; // назад всегда восстанавливаем симметрично

      // if(affectsOwn) {
      board.rankCounters[level] = ownCount + delta;
      // }
    }

    // --- 7. Корректировка верхнего уровня
    const quotaUpper = Utils.toInt(ranks[level - 1].q);
    board.rankCounters[level - 1] = upperCount - (delta * quotaUpper);

  },

};