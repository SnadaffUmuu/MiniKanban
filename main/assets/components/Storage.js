export const Storage = {
  loadData() {
    console.log('LOADING data');
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadData());
    }
    return JSON.parse(localStorage.getItem('kanbanAppData'));
  },

  loadBooks() {
    console.log('LOADING books');
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadBooks());
    }
    return JSON.parse(localStorage.getItem('kanbanBooks'));
  },

  loadEvents() {
    console.log('LOADING events');
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadEvents());
    }
    return JSON.parse(localStorage.getItem('kanbanEvents'));
  },

  saveData(data) {
    console.log('SAVING data');
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveData(raw);
    } else {
      localStorage.setItem('kanbanAppData', raw);
    }
  },

  saveBooks(data) {
    console.log('SAVING books');
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveBooks(raw);
    } else {
      localStorage.setItem('kanbanBooks', raw);
    }
  },

  saveEvents(data) {
    console.log('SAVING events');
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveEvents(raw);
    } else {
      localStorage.setItem('kanbanEvents', raw);
    }
  },
};