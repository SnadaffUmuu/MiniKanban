export const Storage = {
  load() {
    if(typeof Android !== 'undefined') {
      return JSON.parse(Android.loadDataFromFile());
    }
    return JSON.parse(localStorage.getItem('kanbanAppData'));
  },

  save(data) {
    const raw = JSON.stringify(data);
    if(typeof Android !== 'undefined') {
      Android.saveDataToFile(raw);
    } else {
      localStorage.setItem('kanbanAppData', raw);
    }
  }
};