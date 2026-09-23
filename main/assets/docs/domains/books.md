# Books Domain

**Related documentation**: [`boards.md`](boards.md) | [`colors.md`](colors.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md) | [`../persistence.md`](../persistence.md)

---

## Book Data Structure

```javascript
{
  key: 'book-key',       // Unique identifier (user-defined)
  name: 'Book Name',     // Display name
  size: 300,             // Total pages/units
  board: 'board-id',     // BoardDomain board.id (reading board only)
  color: 'peach',        // Color key from Colors.js (maps to board rank color)
  state: {
    ranges: [Range]      // Progress ranges (see below)
  },
  archived: [Snapshot],  // Archive history: [{ts, board, color}]
  archivedNow: boolean   // True while the book is archived
}
```

---

## Range System

Books track reading progress as **ranges mapped to column indexes**:

```javascript
// Range object
{
  c: 1,      // column index
  f: 10,     // From page (inclusive)
  t: 20      // To page (inclusive)
}
```

## Range Validation & Merging (`BooksDomain.js`)

**Flow**: User inputs ranges in ProgressUI or in BooksUI → `BooksDomain.getNewRangesForRanges()` → validation → merge → `addOrUpdateRange()`

```javascript
getNewRangesForRanges(rangesFromForm) {
  // 1. Normalize: {c: Number, f: Number, t: Number}
  // 2. Basic validation: f <= t
  // 3. Ambiguous overlap detection (Utils.findAmbiguousOverlaps)
  //    - Overlap OK if nested (one range fully contains another)
  //    - Error if partial overlap (ambiguous which stage owns pages)
  // 4. Apply sequentially via applyRange() → merged result
}
```

**applyRange()** (`BooksDomain.js`):
- Splits existing ranges at incoming range boundaries
- Inserts incoming range
- Merges adjacent/overlapping ranges per stage via `Utils.mergeRanges()`

---

## Progress Visualization

### Progress Bar (`BooksUI.js`)
- Maps ranges → pages per column (using board columns)
- Renders segmented bar: each segment = column, width = % of book size
- Colors = column gradient (HSL 210, 70%, lightness 85%→35%)

### Tree View (in progress) (`BooksUI.js`, `BooksDomain.buildTreeLayout()`)
- SVG visualization: pages as circles in triangular layout
- Row n has n slots (1, 2, 3...), filled bottom-up
- Shows reading progress as filled tree

---

## Archiving

A book can be **archived** to remove it from the active list without losing its history:

- `archiveBook(key, ts)` — records the current `board`/`color` into `book.archived` (an
  array of `{ts, board, color}` snapshots), deletes the live `board`/`color`, and sets
  `book.archivedNow = true`. Returns a `{result, message, details}` envelope.
- `restoreBook(key, {board, color})` — validates the target board/color (must be available
  on that board) and re-binds the book, clearing `archivedNow`. History is preserved: the
  `archived` array keeps every snapshot, so a restored book still has `archived.length > 0`.
- `isArchived(book)` — true iff `book.archivedNow === true` (the array length is irrelevant
  on its own).
- `getActiveBooks()` / `getArchivedBooks()` — partition by `isArchived`.
- `getArchivedPeriods(book)` — returns the `archived` snapshot array.
- `getBindingAt(book, ts)` — resolves the board/color a book had at a timestamp. Each
  archive snapshot records the binding live until that time, so the snapshot with the
  smallest `ts >= event ts` owns the event; events newer than every snapshot resolve to the
  current root binding (absent while archived). Supports multiple archive/restore cycles.

`getFilteredEvents(filter)` in the Events domain hides events belonging to currently
archived books by default; they are only returned when the filter sets
`includeArchived == true` (wired to the "incl. archived?" filter checkbox).

In the books list the archived subset renders in a separate "Archived books" table with a
dashed (muted) border cue instead of a live rank color. Archiving a book keeps its board and
color for history so past events/stats stay correct after a restore.

## Book-Board-Color Binding

A book is bound to one color on one reading board via `book.board` + `book.color`. The
full concept — palette, the color = book-on-board mental model, technical binding methods,
and the rank overlay — is documented canonically in [`colors.md`](colors.md). The Book
domain owns two binding lookups:

- `betBookByBoard(boardId, color)` — resolves which book a task/event belongs to
- `getUnregisteredColorsForBoard(board)` — colors used in tasks but not yet claimed by a book

---

## Book Operations (BooksDomain.js)

| Method | Description |
|--------|-------------|
| `getBooks()` / `getBook(key)` | Access all/single book |
| `getFilteredBooks(filter)` | Filter by `board` or `books` (array of keys) |
| `getBookRanges(key)` | Returns `book.state.ranges` |
| `save(data)` | Create/update book (name, key, size, board, color) |
| `deleteBook(key, deleteHistory)` | Removes book (TODO: clean events) |
| `archiveBook(key, ts)` | Archives a book, snapshotting board/color into history |
| `restoreBook(key, {board, color})` | Re-binds an archived book to a board/color |
| `isArchived(book)` | True while explicitly archived (`archivedNow`) |
| `getActiveBooks()` / `getArchivedBooks()` | Split books by archive state |
| `getBindingAt(book, ts)` | Board/color a book held at a timestamp |
| `getNewRangesForRanges(input)` | Validate + merge ranges |
| `addOrUpdateRange(bookKey)` | Applies `State.newRangesDraft` to book |
| `applyRange(existing, incoming)` | Core range insertion logic |
| `buildTreeLayout(pageCount)` | Generates SVG positions for tree view |
| `takeBookSnapshot()` / `undoFromSnapshot()` | Undo for book edits |

---

## UI Components

See the canonical [`UI component registry`](../ui/components.md#component-registry).

---

## Key Invariants

- **Ranges per stage are non-overlapping** — enforced by validation + merge