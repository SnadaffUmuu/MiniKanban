export const Storage = {
  loadData() {
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadData());
    }
    return JSON.parse(localStorage.getItem('kanbanAppData'));
  },

  loadBooks() {
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadBooks());
    }
    return JSON.parse(localStorage.getItem('kanbanBooks'));
  },

  loadEvents() {
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadEvents());
    }
    return JSON.parse(localStorage.getItem('kanbanEvents'));
  },

  saveData(data) {
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveData(raw);
    } else {
      localStorage.setItem('kanbanAppData', raw);
    }
  },

  saveBooks(data) {
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveBooks(raw);
    } else {
      localStorage.setItem('kanbanBooks', raw);
    }
  },

  saveEvents(data) {
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveEvents(raw);
    } else {
      localStorage.setItem('kanbanEvents', raw);
    }
  },
};