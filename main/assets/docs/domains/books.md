# Books Domain

**Related documentation**: [`boards.md`](boards.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md) | [`../persistence.md`](../persistence.md)

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
  }
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

## Book-Board-Color Binding

Color codes a book in a board. It's not just for UI, it allows to resolve which book to update when a card in a board is moved.

```javascript
// Book assigned to reading board + rank color
// BoardDomain.getColorsInUse(board) returns colors from board.ranks
// BooksDomain.getUnregisteredColorsForBoard(board) → available colors
// Book.color must match one of board's rank colors
// Only one book per each board's color
```

This binding enables:
- Progress bars colored by rank level
- Events UI showing board-colored dots per book in calendar view and board-colored bars per book in list view
- EventStatsUI attention balance per rank color

---

## Book Operations (BooksDomain.js)

| Method | Description |
|--------|-------------|
| `getBooks()` / `getBook(key)` | Access all/single book |
| `getFilteredBooks(filter)` | Filter by `board` or `books` (array of keys) |
| `getBookRanges(key)` | Returns `book.state.ranges` |
| `save(data)` | Create/update book (name, key, size, board, color) |
| `deleteBook(key, deleteHistory)` | Removes book (TODO: clean events) |
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