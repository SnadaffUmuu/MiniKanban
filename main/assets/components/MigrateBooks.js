import {BoardDomain} from "./BoardDomain.js";
import {BooksDomain} from "./BooksDomain.js";
import {EventsDomain} from "./EventsDomain.js";

export const  MigrateBooks = {

  migrateBook(book) {
    return {
      name: book.name,
      key: book.key,
      size: book.size,
      board: book.board,
      color: book.color,
      state: book.state
    };
  },  

  migrateBooks() {
    const migrated = BooksDomain.getBooks().map(book => this.migrateBook(book));
    console.log('migrated books', migrated);
    BooksDomain.saveBooks(books);
  },
};