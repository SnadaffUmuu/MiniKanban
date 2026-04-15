export const Bus = {

  events: {
    headerUIChanged: 'headerUIChanged',
    boardsChanged: 'boardsChanged',
    columnHeaderUIChanged: 'columnHeaderUIChanged',
    columnAdded: 'columnAdded',
    columnMoved: 'columnMoved',
    taskUiChanged: 'taskUiChanged',
    ranksUiChanged: 'ranksUiChanged',
    screenChanged: 'screenChanged',
    booksUiChanged: 'booksUiChanged',
    booksChanged: 'booksChanged',
  },

  listeners: {},

  queue: new Set(),

  scheduled: false,

  on(event, handler) {
    if(!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(handler);
  },

  emit(event, payload) {
    const handlers = this.listeners[event];
    if(!handlers) return;
    setTimeout(() => {
      handlers.forEach(h => h(payload));
    }, 0)
  },

  schedule() {
    if(this.scheduled) return;
    this.scheduled = true;

    const scheduleMicrotask =
      typeof queueMicrotask === 'function'
        ? queueMicrotask
        : (cb) => Promise.resolve().then(cb);

    scheduleMicrotask(() => this.flush());
  },

  flush() {
    this.queue.forEach(fn => fn());
    this.queue.clear();
    this.scheduled = false;
  },

  scheduleMicrotask:
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (cb) => Promise.resolve().then(cb),

  createBatched(fn) {
    let scheduled = false;
    const schedule = this.scheduleMicrotask;

    return function batched(...args) {
      if(scheduled) return;

      scheduled = true;

      schedule(() => {
        scheduled = false;
        fn.apply(this, args);
      });
    };
  },

  batchedMethod(obj, methodName) {
    obj[methodName] = this.createBatched(obj[methodName].bind(obj));
  },
};