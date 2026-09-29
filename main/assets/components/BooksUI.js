import {Bus} from './Bus.js'
import {BooksDomain} from './BooksDomain.js'
import {State} from './State.js'
import {App} from './App.js'
import {Colors, getColorHex} from './Colors.js'
import {BoardDomain} from './BoardDomain.js'
import {EventsDomain} from './EventsDomain.js'
import {Utils} from './Utils.js'
import {BookTree} from './BookTree.js'

export const BooksUI = {

  name: 'BooksUI',

  selectors: {
    listModeContainer: '#books',
    bookModeContainer: '#book',
    booksListContainer: '#booksListContainer',
    addBookButton: '#addBook',
    addBookUi: '#addBookUi',
    bookNameInput: '#bookName',
    bookKeyInput: '#bookKey',
    bookSizeInput: '#size',
    bookBoardSelect: '.js-book-board',
    bookBoardColorSelect: '.js-book-board-color',
    addBookConfirmButton: '.js-add-book-confirm',
    editBookConfirmButton: '.js-edit-book-confirm',
    addBookCancelButton: '#addBookCancel',
    addBookForm: '[name="addBookForm"]',
    editBookForm: '.js-edit-book-form',
    deleteBookButton: '.js-delete-book',
    editBookButton: '.js-edit-book',
    editStateButton: '.js-edit-state',
    archiveBookButton: '.js-archive-book',
    restoreBookButton: '.js-restore-book',
    extraUiRow: '.extraUi',
    extraUiConfirmButton: '.extraUi .confirm',
    extraUiCancelButton: '.extraUi .cancel',
    closeExtraUi: '.extraUi .js-cancel-current',
    addRangeButton: '.extraUi .addRange',
    removeRangeRowRutton: '.extraUi .removeRangeRow',
    progressBar: '.progress-bar:not(.popup)',
    progressBarSegment: '.progress-bar:not(.popup) .segment',
    progressBarPopup: '.progress-bar.popup',
    bookNameCell: '#booksList td:first-child',
    booksListArchivedTd: '#booksListArchived td:first-child',
    treeRoot: '#tree-root',
    treeShapeSelect: '#bookTreeShape',
    treeFillModeSelect: '#bookTreeFillMode',
    treeOutlineCheckbox: '#bookTreeShowOutline',
    switchToBooksButton: '#book [data-screen-switch="books"]',
  },

  dom: {
  },

  events: {
    click: {
      '##': 'hideProgress',
      '@progressBar': 'showProgress',
      '@progressBarSegment': 'showProgress',
      '@bookNameCell': 'seeBook',
      '@booksListArchivedTd': 'seeBook',
      '@switchToBooksButton': 'switchToBooks',
    },
    change: {
      '@treeShapeSelect': 'changeTreeShape',
      '@treeFillModeSelect': 'changeTreeFillMode',
      '@treeOutlineCheckbox': 'changeTreeOutline'
    }
  },

  init() {
    Bus.batchedMethod(this, 'render');
    Bus.on(Bus.events.screenChanged, this.render.bind(this));
    Bus.on(Bus.events.booksUiChanged, this.render.bind(this));
    Bus.on(Bus.events.booksChanged, this.render.bind(this));
    Bus.on(Bus.events.booksModeChanged, this.render.bind(this));
    Bus.on(Bus.events.filtersChanged, this.render.bind(this));
    window.addEventListener('resize', () => {
      clearTimeout(this.bookTreeResizeTimer);
      this.bookTreeResizeTimer = setTimeout(() => {
        if(State.booksUi.currentBook && App.isBooks()) this.render();
      }, 160);
    });
  },

  render() {
    if(App.isBoard() || App.isEvents()) {
      this.dom.listModeContainer.classList.add('hidden');
      this.dom.bookModeContainer.classList.add('hidden');
      return;
    }
    console.log('RENDER: BooksUI');

    const currentBook = State.booksUi.currentBook;

    this.dom.listModeContainer.classList.toggle('hidden', currentBook);
    this.dom.bookModeContainer.classList.toggle('hidden', !currentBook);

    if(currentBook) {
      this.renderBookTreeControls();
      this.renderBookTree(currentBook);
    } else { //list
      this.dom.booksListContainer.innerHTML = this.getListHtml();
      this.dom.addBookUi.classList.toggle('hidden', !State.booksUi.addUiShown);
      this.dom.bookBoardSelect.innerHTML = '<option value="" disabled selected>choose a board</option>'
        + App.data.boards.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      this.dom.bookBoardColorSelect.removeAttribute('style');
      this.dom.addBookButton.classList.toggle('hidden', State.booksUi.addUiShown);
    }
  },

  addRangeRow(el) {
    const key = this.getRowKey(el);
    const book = BooksDomain.getBook(key);
    const fieldset = el.closest('fieldset');
    let rows = [...fieldset.querySelectorAll('.rangesRow')];
    el.closest('fieldset').insertAdjacentHTML('beforeend', this.getRangesRowHtml(book, null, true, true));
    rows = [...fieldset.querySelectorAll('.rangesRow')];
    el.remove();
  },

  removeRangeRow(el) {
    const key = this.getRowKey(el);
    const book = BooksDomain.getBook(key);
    const fieldset = el.closest('fieldset');
    const rows = [...fieldset.querySelectorAll('.rangesRow')];
    if(rows.length == 1) {
      fieldset.insertAdjacentHTML('beforeend', this.getRangesRowHtml(book, null, true, false));
    }
    el.closest('.rangesRow').remove();
    const lastRowButton = rows[rows.length - 1].querySelector('.addRange');
    if(!lastRowButton) {
      el.querySelector('.rangesRowButtonsWrap').insertAdjacentHTML('beforeend', '<button class="addRange">+</button>');
    }
  },

  getRangesRowHtml(book, range, showAddButton, showRemoveButton) {
    const columns = this.getBoard(book).columns;
    return `<div class="rangesRow">
      <label>from<br>
        <input type="number" name="from" ${range ? `value="${range.f}"` : ' required'}>
      </label>
      <label>to<br>
        <input type="number" name="to" ${range ? `value="${range.t}"` : ' required '}>
      </label>
      <label><br>
        <select ${range ? '' : 'required'} name="column">
          ${columns.map((col, i) => `<option ${range && range.c == i ? 'selected' : ''} value="${i}">${col.name} [${i}]</option>`).join('')}
        </select>
      </label>
      <div class="rangesRowButtonsWrap">
        ${showRemoveButton ? `<button class="removeRangeRow">-</button>` : ''}
        ${showAddButton ? '<button class="addRange">+</button>' : ''}
      </div>
    </div>`;
  },

  getCurrentRangesFormHtml(key) {
    const book = BooksDomain.getBook(key);
    const ranges = BooksDomain.getBookRanges(key);
    if(!ranges || !ranges.length) return this.getRangesRowHtml(book, null, true, false);
    return Utils.sortBy(ranges, 'f', true).map((r, i) => this.getRangesRowHtml(book, r, (i == ranges.length - 1), true)).join('');
  },

  getListHtml() {
    const active = BooksDomain.getFilteredBooksByOrder('board')
      .filter(b => !BooksDomain.isArchived(b));
    // Archived books carry no live board, so match the board filter against
    // their latest archive snapshot; the books filter applies by key.
    const filter = App.getFilter();
    const archived = Utils.sortBy(
      BooksDomain.getArchivedBooks().filter(b => {
        if(filter.books && !filter.books.includes(b.key)) return false;
        if(filter.board && filter.board !== BooksDomain.ARCHIVED_FILTER) {
          const last = BooksDomain.getLatestArchivedPeriod(b);
          if(!last || last.board != filter.board) return false;
        }
        return true;
      }), 'name', true);

    const activeTable = active.length
      ? this.getTableHtml('booksList', 'Active books', active.map(b => this.getBookRowHtml(b, false)).join(''))
      : '';

    const archivedTitle = archived.length
      ? '<h5 class="bookslist-archived-title">Archived books</h5>' : '';

    const archivedTable = archived.length
      ? this.getTableHtml('booksListArchived', 'Archived books', archived.map(b => this.getBookRowHtml(b, true)).join(''))
      : '';

    return activeTable + archivedTitle + archivedTable;
  },

  getTableHtml(id, caption, rows) {
    return `<table id="${id}">
      <thead>
        <th>name</th>
        <th>size</th>
        <th>upd</th>
        <th>progress</th>
        <th>actions</th>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
  },

  getBookRowHtml(b, isArchived) {
    // Archived books carry no live board/color; use the last archive snapshot
    // so they render with the binding they had when they were archived.
    let color = b.color;
    let boardId = b.board;
    if(isArchived) {
      const last = BooksDomain.getLatestArchivedPeriod(b);
      if(last) {
        color = last.color;
        boardId = last.board;
      } else {
        color = null;
        boardId = null;
      }
    }
    const board = BoardDomain.getBoard(boardId);
    const cellClass = !isArchived && b.color
      ? ` class="${b.color}"`
      : isArchived && color
        ? ` class="${color}"` : '';
    let rowStyle = boardId && board
      ? `class="board-${board.key}-border${isArchived ? ' archived' : ''}"` : '';
    const extra = State.booksUi.rowUi[b.key]?.extra;
    const error = State.booksUi.rowUi[b.key]?.error;
    let extraUi = '';
    if(extra) {
      rowStyle += ' style="opacity:0.5"';
      switch(extra) {

        case 'delete':
          extraUi = `
            <h6>Delete book "${b.key}"?</h6>
            <label>Keep history? <input type="checkbox" id="keepHistory"></label><br>
            <button class="confirm">Yes</button>
            <button class="cancel">Cancel</button>
          `;
          break;

        case 'state':
          extraUi = `
            <h6>Set state</h6>
            <form name="stateForm" action="javascript:void(0);">
              <fieldset>
                <legend>ranges</legend>
                ${this.getCurrentRangesFormHtml(b.key)}
              </fieldset>
              <button class="confirm">Save</button>
              <button class="cancel">Cancel</button>
            </form>
          `;
          break;

        case 'edit':
          extraUi = `
          <div class="editBookUi">
            <form data-key="${b.key}" name="edit-book-${b.key}" class="js-edit-book-form" action="javascript:void(0);">
              <input type="text" name="bookName" placeholder="book name" value="${b.name}" required><br>
              ${isArchived ? '' : `<input type="text" name="bookKey" paceholder="book key" value="${b.key}" required><br>`}
              <input type="number" name="size" placeholder="size" value="${b.size}" required><br>
              ${isArchived ? '' : `
              <select class="js-book-board" name="bookBoard" required>
                <option value="">choose a board</option>
                ${App.data.boards.map(board => `<option ${board.id == b.board ? 'selected' : ''} value="${board.id}">${board.name}</option>`).join('')}
              </select><br>
              <select required name="bookBoardColor" class="js-book-board-color ${b.color}">
                <option value="">choose a color</option>
                <option selected value="${b.color}" class="${b.color}">${b.color}</option>
                ${BooksDomain.getUnregisteredColorsForBoard(b.board)
              .map(color => `<option value="${color}" class="${color}">${color}</option>`)
              .join('')}
              </select><br>`}
              <div class="editBookActions">
                ${isArchived
                  ? '<button class="book-action restore js-restore-book"></button>'
                  : '<button class="book-action archive js-archive-book"></button>'}
                <button class="book-action delete js-delete-book"></button>
              </div>
              <button class="confirm">Save</button>
              <button class="cancel">Cancel</button>
            </form>
          </div>
          `;
          break;

        case 'archive':
          extraUi = `
            <h6>Archive book "${b.key}"?</h6>
            <label>It moves to the archived table; board and color are kept for history.</label><br>
            <button class="confirm">Yes</button>
            <button class="cancel">Cancel</button>
          `;
          break;

        case 'restore':
          extraUi = `
            <h6>Restore book "${b.key}"</h6>
            <form name="restoreForm" action="javascript:void(0);">
              <select class="js-book-board" name="bookBoard" required>
                <option value="">choose a board</option>
                ${App.data.boards.map(board => `<option value="${board.id}">${board.name}</option>`).join('')}
              </select><br>
              <select required name="bookBoardColor" class="js-book-board-color">
                <option value="">choose a color</option>
              </select><br>
              <button class="confirm">Restore</button>
              <button class="cancel">Cancel</button>
            </form>
          `;
          break;
      }
    }
    const lastUpdated = EventsDomain.getEventsForBook(b.key, false);
    return `
    <tr ${rowStyle} data-book-key="${b.key}">
      <td ${cellClass}>${b.name}</td>
      <td ${cellClass}>${b.size}</td>
      <td ${cellClass}><span class="nowrap">${lastUpdated.length ? lastUpdated[0].d : ''}</span></td>
      <td ${cellClass}>${this.renderProgressBar(b)}</td>
      <td ${cellClass}>
        <div class="book-action-container">
          <button class="book-action state js-edit-state"></button>
          <button class="book-action edit js-edit-book"></button>
        </div>
      </td>
    </tr>
    ${extra ? `
    <tr class="extraUi" data-extra-book-key="${b.key}" data-extra="${extra}">
      <td colspan="5">
        <div style="position:relative;">
          <button class="js-cancel-current button-close button-close__extra"></button>
          ${extraUi}
          ${error ? `<span class="form-error-text">${error}</span><br>` : ''}
        </div>
      </td>
    </tr>
    ` : ''}
  `
  },

  toggleAddUi(el, e, [toShow]) {
    e.preventDefault();
    this.dom.addBookForm.reset();
    State.booksUi.addUiShown = toShow;
    Bus.emit(Bus.events.booksUiChanged);
  },

  selectBoardHandler(el) {
    this.updateColorsDropdown(el);
  },

  updateColorsDropdown(el) {
    const select = el.closest('form').querySelector(this.selectors.bookBoardColorSelect);
    if(el.value) {
      const board = BoardDomain.getBoard(el.value);
      select.innerHTML = '<option value="" selected>choose a color</option>'
        + BooksDomain.getUnregisteredColorsForBoard(board)
          .map(color => `<option value="${color}" class="${color}">${color}</option>`)
          .join('');
      select.setAttribute('required', true);
    } else {
      select.innerHTML = '';
      select.removeAttribute('required');
    }
    this.setColorsDropdownColor(select);
  },

  setColorsDropdownColor(el) {
    Object.keys(Colors).forEach(key => el.classList.remove(key));
    if(Colors[el.value]) {
      el.classList.add(el.value);
    }
  },

  addBook() {
    //TODO validate that key is unique
    let errors = [];

    BooksDomain.save({
      name: this.dom.bookNameInput.value,
      key: this.dom.bookKeyInput.value,
      size: this.dom.bookSizeInput.value,
      board: this.dom.bookBoardSelect.value,
      color: this.dom.bookBoardColorSelect.value
    });
    State.booksUi.addUiShown = false;
    this.dom.addBookForm.reset();
    Bus.emit(Bus.events.booksChanged);
  },

  getRow(el) {
    return el.closest('tr');
  },

  getRowKey(rowEl) {
    const row = this.getRow(rowEl);
    return row.dataset.bookKey || row.dataset.extraBookKey;
  },

  setRowUi(el, updater) {
    const key = this.getRowKey(el);
    const prev = State.booksUi.rowUi[key] || {};
    const next = updater(prev, key);

    if(next === null) {
      delete State.booksUi.rowUi[key];
    } else {
      State.booksUi.rowUi[key] = next;
    }

    Bus.emit(Bus.events.booksUiChanged);
  },

  showEditBookUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'edit'
    }));
  },

  showDeleteBookUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'delete'
    }));
  },

  showEditStateUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'state'
    }));
  },

  showArchiveBookUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'archive'
    }));
  },

  showRestoreBookUi(el) {
    this.setRowUi(el, (prev, key) => ({
      ...prev,
      extra: 'restore'
    }));
  },

  cancelExtra(el, e) {
    e.preventDefault();
    this.setRowUi(el, () => null)
  },

  updateBook(el) {
    let errors = [];
    const form = el;
    const data = {
      name: form.bookName.value,
      key: el.dataset.key,
      size: form.size.value,
      board: form.bookBoard ? form.bookBoard.value : undefined,
      color: form.bookBoardColor ? form.bookBoardColor.value : undefined
    };

    if(form.bookKey && form.bookKey.value !== el.dataset.key) {
      data.newKey = form.bookKey.value;
    }

    BooksDomain.save(data);
    Bus.emit(Bus.events.booksChanged);
  },

  confirmExtra(el) {
    const row = this.getRow(el);
    const key = row.dataset.extraBookKey;
    const action = row.dataset.extra;
    switch(action) {

      case 'delete':

        BooksDomain.deleteBook(row.dataset.extraBookKey);
        delete State.booksUi.rowUi[key];
        Bus.emit(Bus.events.booksChanged);
        break;

      case 'state':

        const ranges = [];
        [...row.querySelectorAll('.rangesRow')].forEach(el => {
          ranges.push({
            c: el.querySelector('[name="column"]').value,
            f: el.querySelector('[name="from"]').value,
            t: el.querySelector('[name="to"]').value,
          });
        });
        let res = BooksDomain.getNewRangesForRanges(ranges);
        if(res.result !== true) {
          State.booksUi.rowUi[key].error = `
          ${res.message}<br>
          ${res.details}
          `;
          Bus.emit(Bus.events.booksUiChanged);
          return;
        } else if(!res.ranges.length || res.ranges.length == 1 && !res.ranges[0].f && !res.ranges[0].t) {
          res = BooksDomain.setBookRanges(key, null); //deleting ranges
        } else {
          res = BooksDomain.setBookRanges(key, res.ranges);
        }

        Bus.emit(Bus.events.booksChanged);
        break;

      case 'edit':

        el.closest('form').submit();
        break;

      case 'archive':

        const archiveRes = BooksDomain.archiveBook(key);
        if(archiveRes.result !== true) {
          State.booksUi.rowUi[key].error = archiveRes.message;
          Bus.emit(Bus.events.booksUiChanged);
          return;
        }
        delete State.booksUi.rowUi[key];
        Bus.emit(Bus.events.booksChanged);
        break;

      case 'restore':

        const form = row.querySelector('form[name="restoreForm"]');
        const restoreRes = BooksDomain.restoreBook(key, {
          board: form.querySelector('[name="bookBoard"]').value,
          color: form.querySelector('[name="bookBoardColor"]').value
        });
        if(restoreRes.result !== true) {
          State.booksUi.rowUi[key].error = restoreRes.message;
          Bus.emit(Bus.events.booksUiChanged);
          return;
        }
        delete State.booksUi.rowUi[key];
        Bus.emit(Bus.events.booksChanged);
        break;
    }
  },

  getColumnColor(columnIndex, columnsCount) {
    const night = document.body.classList.contains('night');
    const lightnessStart = night ? 65 : 85;
    const lightnessEnd = night ? 25 : 35;

    const maxIndex = Math.max(columnsCount - 1, 1);
    const ratio = columnIndex / maxIndex;

    const lightness =
      lightnessStart -
      ratio * (lightnessStart - lightnessEnd);

    return `hsl(210, 70%, ${lightness}%)`;
  },

  // Resolve the board a book should render against: live binding for active
  // books, the last archive snapshot for archived ones.
  getBoard(book) {
    let boardId = book.board;
    if(BooksDomain.isArchived(book)) {
      const last = BooksDomain.getLatestArchivedPeriod(book);
      boardId = last ? last.board : null;
    }
    return BoardDomain.getBoard(boardId);
  },

  renderProgressBar(book) {
    const size = Number(book.size);
    const board = this.getBoard(book);
    if(!board) return '';
    const columns = board.columns;
    const ranges = book.state?.ranges || [];

    // страницы по колонкам
    const colPages = new Map();

    for(const {c, f, t} of ranges) {
      const count = t - f + 1;
      colPages.set(c, (colPages.get(c) || 0) + count);
    }

    // абсолютное количество стадий (переходов)
    const totalStages = Math.max(columns.length - 1, 1);

    const segments = [];
    let odd = true;

    for(let col = 0;col < columns.length;col++) {

      const pages = colPages.get(col) || 0;
      if(pages === 0) continue;

      const percent = (pages / size) * 100;

      // абсолютная стадия
      const stage = col;

      const color = this.getColumnColor(col, columns.length);

      segments.push(`
      <div
        class="segment ${odd ? 'odd' : ''}"
        style="width:${percent}%; background:${color}"
        title="${columns[col].title}: ${pages} pages"
      ><span class="pagesCount">${pages}</span></div>
    `);

      odd = !odd;
    }

    const totalFilled =
      [...colPages.values()].reduce((a, b) => a + b, 0);

    const remainingPercent =
      ((size - totalFilled) / size) * 100;

    if(remainingPercent > 0) {
      segments.push(`
      <div
        class="segment empty"
        style="width:${remainingPercent}%"
      ></div>
    `);
    }

    return `
    <div class="progress-bar">
      ${segments.join("")}
    </div>
  `;
  },

  showProgress(el, e) {
    const cursorY = e.clientY || (e.touches && e.changedTouches[0].clientY);
    const cursorX = e.clientX || (e.touches && e.changedTouches[0].clientX);
    const newPB = el.closest('.progress-bar').cloneNode(true);
    newPB.classList.add('popup');
    document.body.insertAdjacentElement('afterbegin', newPB);
  },

  hideProgress(el, e) {
    if(el.matches(this.selectors.progressBarPopup)
      || el.closest(this.selectors.progressBarPopup)) {
      return;
    }
    document.querySelector(this.selectors.progressBarPopup)?.remove()
  },

  switchToBooks() {
    delete State.booksUi.currentBook;
  },

  seeBook(el) {
    State.booksUi.currentBook = el.closest('tr').dataset.bookKey;
    Bus.emit(Bus.events.booksUiChanged);
  },

  getTreeDimensions() {
    const style = window.getComputedStyle(this.dom.treeRoot);
    const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    return {
      width: Math.max(1, Math.floor(this.dom.treeRoot.clientWidth - horizontalPadding)),
      height: Math.max(1, Math.floor(this.dom.treeRoot.clientHeight - verticalPadding))
    };
  },

  getTreeShape() {
    const shape = App.getLocalProp('bookTreeShape');
    return BookTree.hasShape(shape) ? shape : BookTree.defaultShape;
  },

  getTreeShowOutline() {
    const showOutline = App.getLocalProp('bookTreeShowOutline');
    return showOutline == null ? true : showOutline === true;
  },

  getTreeFillMode() {
    return App.getLocalProp('bookTreeFillMode') === 'liquid' ? 'liquid' : 'page';
  },

  renderBookTreeControls() {
    this.dom.treeShapeSelect.value = this.getTreeShape();
    this.dom.treeFillModeSelect.value = this.getTreeFillMode();
    this.dom.treeOutlineCheckbox.checked = this.getTreeShowOutline();
  },

  changeTreeShape(el) {
    App.setLocalProp(
      'bookTreeShape',
      BookTree.hasShape(el.value) ? el.value : BookTree.defaultShape
    );
    Bus.emit(Bus.events.booksUiChanged);
  },

  changeTreeFillMode(el) {
    App.setLocalProp('bookTreeFillMode', el.value === 'liquid' ? 'liquid' : 'page');
    Bus.emit(Bus.events.booksUiChanged);
  },

  changeTreeOutline(el) {
    App.setLocalProp('bookTreeShowOutline', el.checked);
    Bus.emit(Bus.events.booksUiChanged);
  },

  getTreeFillOrder(points, mode) {
    const order = points.map((point, index) => index);
    if(mode !== 'liquid' || points.length < 2) return order;

    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min.apply(Math, xs);
    const maxX = Math.max.apply(Math, xs);
    const minY = Math.min.apply(Math, ys);
    const maxY = Math.max.apply(Math, ys);
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const centerX = (minX + maxX) / 2;
    const bandsCount = Math.max(1, Math.round(Math.sqrt(points.length * height / width)));
    const bandHeight = height / bandsCount;

    const getBand = point => Math.min(
      bandsCount - 1,
      Math.floor((maxY - point.y) / bandHeight)
    );

    return order.sort((a, b) => {
      const pointA = points[a];
      const pointB = points[b];
      const bandDifference = getBand(pointA) - getBand(pointB);
      if(bandDifference) return bandDifference;

      const centerDifference = Math.abs(pointA.x - centerX) - Math.abs(pointB.x - centerX);
      if(centerDifference) return centerDifference;

      const heightDifference = pointB.y - pointA.y;
      return heightDifference || a - b;
    });
  },

  renderBookTree(bookKey) {
    const book = BooksDomain.getBook(bookKey);
    const size = book ? Math.max(0, Math.floor(Number(book.size) || 0)) : 0;
    if(!book || !size) {
      this.dom.treeRoot.innerHTML = '';
      return;
    }

    const dimensions = this.getTreeDimensions();
    const started = Math.min(size, BooksDomain.getStartedPageCount(book));
    const isArchived = BooksDomain.isArchived(book);
    const bookColor = isArchived
      ? BooksDomain.getLatestArchivedPeriod(book)?.color
      : book.color;
    const isNight = document.body.classList.contains('night');
    const shapeColor = (bookColor && getColorHex(bookColor)) || '#f79d35';
    const outlineColor = isNight ? '#6a6a6a' : '#d8d8d8';
    const pageColor = isNight ? '#6fa8ff' : '#1b5998';
    const emptyPageStroke = isNight ? '#8a8a8a' : '#929292';
    const shape = this.getTreeShape();
    const showOutline = this.getTreeShowOutline();
    const fillMode = this.getTreeFillMode();

    try {
      const layout = BookTree.generate({
        seed: book.key,
        n: size,
        width: dimensions.width,
        height: dimensions.height,
        shape
      });
      const radius = layout.diameter / 2;
      const fillOrder = this.getTreeFillOrder(layout.points, fillMode);
      const fillRank = new Array(layout.points.length);
      fillOrder.forEach((pointIndex, rank) => {
        fillRank[pointIndex] = rank;
      });
      this.dom.treeRoot.innerHTML = `
        <h2 class="book-tree-title">${Utils.escapeHtml(book.name)}</h2>
        <svg
          width="${layout.width}"
          height="${layout.height}"
          viewBox="0 0 ${layout.width} ${layout.height}"
          role="img"
          aria-label="${size} pages"
        >
          <path
            d="${layout.outline.path}"
            transform="${layout.outline.transform}"
            fill="${shapeColor}"
            stroke="${showOutline ? outlineColor : 'none'}"
            stroke-width="1.4"
            vector-effect="non-scaling-stroke"
          />
          <g>
            ${layout.points.map((point, index) => `
            <circle
              cx="${point.x.toFixed(3)}"
              cy="${point.y.toFixed(3)}"
              r="${radius.toFixed(3)}"
              fill="${fillRank[index] < started ? pageColor : 'transparent'}"
              stroke="${fillRank[index] < started ? pageColor : emptyPageStroke}"
              data-page="${fillRank[index] + 1}"
            />
            `).join('')}
          </g>
        </svg>
      `;
    } catch(error) {
      this.dom.treeRoot.innerHTML = '';
      console.error('Unable to render book tree:', error);
    }
  }

};
