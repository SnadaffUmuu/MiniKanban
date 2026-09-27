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

Books track reading progress as **ranges mapped to column indexes**. A `Range` is a three-field
contract (`f` inclusive, `t` inclusive):

| Field | Meaning |
|-------|---------|
| `c` | Column index |
| `f` | From page (inclusive) |
| `t` | To page (inclusive) |

## Range Validation & Merging (`BooksDomain.js`)

**Flow**: User inputs ranges in ProgressUI or in BooksUI → `BooksDomain.getNewRangesForRanges()` → validation → merge → `addOrUpdateRange()`

**Contract** (read `BooksDomain.js` for the implementation):

- Inputs are normalized to `{c: Number, f: Number, t: Number}`, then `f <= t` is enforced.
- **Nested overlap is allowed** — a range fully containing another is accepted, because the
  owning stage is unambiguous.
- **Partial overlap is an error** — when two ranges overlap without one containing the other,
  it is ambiguous which stage owns the pages.
- Ranges are applied one at a time through `applyRange()`, and each application merges the
  result per stage via `Utils.mergeRanges()`.

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

### Page Cloud (`BookTree.generate()` / `BooksUI.renderBookTree()`)

`BookTree.js` owns the layout contract and shape registry; `BooksUI.js` measures `#tree-root`,
applies reading progress, and renders the SVG. Device-level shape, fill-mode, and outline preferences are
defined canonically in [`persistence.md`](../persistence.md#kanbanlocal-preference-fields).

**Generation order** (behavioral contract; implementation in `BookTree.generate()`):

1. Rasterize the selected shape, fitted by its own bounding box, then derive spacing from the
   measured mask area.
2. Seed the generator with the book key, shape, and page count; generate the fixed sample set.
3. Run best-candidate placement three times for at most 30 pages, otherwise once, and keep the
   lowest-energy initial layout.
4. Apply at most six Lloyd-relaxation steps, stopping only on increased energy or negligible
   improvement, then constrain the common diameter against neighbors and the boundary.

**Invariants and why:**

- There are exactly `book.size` equal-radius circles; diameter never exceeds 8 px, circles do not
  overlap, and each circle remains inside the selected shape.
- The shape mask and SVG outline use the same bounding-box transform. This keeps them aligned for
  every container aspect ratio.
- Six relaxation steps are fixed because iteration count is the only protection against visible
  crystallization; there is intentionally no automatic grid metric. Increase it only after visual
  review.
- A row of dots near the shape edge is intentional, approved behavior rather than a layout defect.
- The book key is the deterministic seed. Identical inputs are stable on one engine; cross-device
  identity is not required because canvas rasterization may differ.
- `BooksUI.getTreeFillOrder()` owns progress placement without changing cloud geometry. Page mode
  keeps the existing generated-point order. Liquid mode completes horizontal bands from bottom to
  top and orders each band from the cloud's horizontal center toward its edges; deterministic
  vertical and point-index tie-breakers keep repeated renders stable.
- `BooksDomain.getStartedPageCount()` merges intervals across columns. `BooksUI.renderBookTree()`
  fills that many circles and leaves the remainder outlined. The shape uses the book color, and the
  book name is overlaid by `.book-tree-title`. Exact SVG and title colors are illustrative—verify
  them against `BooksUI.js` and `styles.css`.


## Archiving

A book can be **archived** to remove it from the active list without losing its history:

- `archiveBook(key, ts)` — records the current `board`/`color` into `book.archived` (an
  array of `{ts, board, color}` snapshots), deletes the live `board`/`color`, and sets
  `book.archivedNow = true`. Returns a `{result, message, details}` envelope.
- `restoreBook(key, {board, color})` — validates the target board/color and re-binds the book,
  clearing `archivedNow`. The color must be *available* on that board, which means it is both
  (a) present as at least one card on that board and (b) not already claimed by another active
  book. A palette color with no card on the board (e.g. "green" with no green cards) is
  intentionally rejected — the board's cards, not the palette, define the assignable set (see
  [`colors.md`](colors.md#why-a-book-can-only-claim-card-colors)). History is preserved: the
  `archived` array keeps every snapshot, so a restored book still has `archived.length > 0`.
- `isArchived(book)` — true iff `book.archivedNow === true` (the array length is irrelevant
  on its own).
- `getActiveBooks()` / `getArchivedBooks()` — partition by `isArchived`.
- `getArchivedPeriods(book)` — returns the `archived` snapshot array.
- `getBindingAt(book, ts)` — resolves the board/color a book had at a timestamp. Each
  archive snapshot records the binding live until that time, so the snapshot with the
  smallest `ts >= event ts` owns the event; events newer than every snapshot resolve to the
  current root binding (absent while archived). Supports multiple archive/restore cycles.

`getFilteredEvents(filter)` in the Events domain shows events belonging to currently
archived books by default; they are hidden only when the filter sets
`includeArchived == false` (the "incl. archived?" filter checkbox, which defaults to checked).

In the books list the archived subset renders in a separate "Archived books" table. Archived
rows are colored by the **last archive snapshot** (its board border and cell color), so they
match the main table's look while keeping their own table. Archiving a book keeps its board and
color for history so past events/stats stay correct after a restore.

## Book-Board-Color Binding

A book is bound to one color on one reading board via `book.board` + `book.color`. The
full concept — palette, the color = book-on-board mental model, technical binding methods,
and the rank overlay — is documented canonically in [`colors.md`](colors.md). The Book
domain owns two binding lookups:

- `betBookByBoard(boardId, color)` — resolves which book a task/event belongs to
- `getUnregisteredColorsForBoard(board)` — the only colors a book may claim on `board`:
  `BoardDomain.getColorsInUse(board)` (colors present as cards on that board) minus the colors
  already claimed by an *active* book. This is **not** the palette, and **not**
  `BoardDomain.getFreeColors()`; see ["Why a book can only claim card colors"](colors.md#why-a-book-can-only-claim-card-colors).

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
| `getArchivedPeriods(book)` | Returns the `archived` snapshot array |
| `getLatestArchivedPeriod(book)` | The most recent snapshot, chosen by `ts` (not array order) |
| `getBindingAt(book, ts)` | Board/color a book held at a timestamp |
| `getNewRangesForRanges(input)` | Validate + merge ranges |
| `addOrUpdateRange(bookKey)` | Applies `State.newRangesDraft` to book |
| `applyRange(existing, incoming)` | Core range insertion logic |
| `getStartedPageCount(book)` | Counts unique pages covered by progress ranges for the tree view |
| `takeBookSnapshot()` / `undoFromSnapshot()` | Undo for book edits |

---

## UI Components

See the canonical [`UI component registry`](../ui/components.md#component-registry).

---

## Key Invariants

- **Ranges per stage are non-overlapping** — enforced by validation + merge