import {App} from './App.js'
import {Storage} from './Storage.js'
import {Colors} from './Colors.js'
import { BoardDomain } from './BoardDomain.js';

export const BooksDomain = {
  
  getBooks() {
    return App.data.books || [];
  },

  getUnregisteredColorsForBoard(board) {
    const registeredColors = this.getBooks().filter(b => b.board == board.id).map(b => b.color);
    return BoardDomain.getColorsInUse(board).filter(c => !registeredColors.includes(c));
  },

  saveBooks(books) {
    App.data.books = books;
    Storage.save(App.data);
  },

  save(data) {
    const {name, key, size, board, color} = data;
    const books = this.getBooks(); 
    const book = books.find(b => b.key == key);
    if (book) {
      book.name = name;
      book.size = size;
      book.board = board;
      book.color = color;
    } else {
      books.push(data);
    }
    this.saveBooks(books);
  },

};