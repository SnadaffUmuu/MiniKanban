# Books Domain

**Related**: [`boards.md`](boards.md) | [`colors.md`](colors.md) | [`events.md`](events.md) | [`../persistence.md`](../persistence.md)

## Book record

Read `BooksDomain.save` for the shape. Key points: `key` is user-defined and unique; `board` + `color` bind the book to a color on a reading board (see below); `state.ranges` holds progress; `archived` is an array of `{ts, board, color}` snapshots and `archivedNow` is the live flag.

## Ranges

A range is `{c, f, t}`: column index, from page, to page (both inclusive). Books track progress as ranges mapped to columns.

Validation rules (`BooksDomain.getNewRangesForRanges`, `applyRange`):

- **Nested overlap is allowed**: a range fully containing another is accepted because the owning stage is unambiguous.
- **Partial overlap is an error**: it is ambiguous which stage owns the pages.
- Ranges within one stage end up non-overlapping (merged via `Utils.mergeRanges`).

## Progress visualization

The segmented progress bar and its column gradient are in `BooksUI.js` (colors are illustrative; verify in source).

## Page cloud

`BookTree.js` owns the layout contract and shape registry; `BooksUI.js` measures `#tree-root`,
applies reading progress, and renders the SVG. Device-level shape, fill-mode, and outline preferences are
defined canonically in [`persistence.md`](../persistence.md); tree shape, fill mode and outline are stored in `kanbanLocal` (see `App.js` for the field names).

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

Archiving removes a book from the active list without losing history (`archiveBook`, `restoreBook`).

- Archiving snapshots `{ts, board, color}` into `book.archived`, deletes the live `board`/`color`, and sets `archivedNow = true`. Restoring re-binds and clears `archivedNow` but **keeps every snapshot**, so a restored book still has `archived.length > 0`. `isArchived` looks only at `archivedNow`, never at the array length.
- Restore requires a color that is a card on the target board and not claimed by another active book. A palette color with no card is rejected on purpose ([why](colors.md#why-a-book-can-only-claim-card-colors)).
- **Historic binding**: `getBindingAt(book, ts)` answers "which board/color did this book have at `ts`?". Each snapshot records the binding that was live *until* its `ts`, so the snapshot with the smallest `ts >= event ts` owns the event; events newer than all snapshots use the current binding (none while archived). This supports several archive/restore cycles and keeps past events and stats correct.
- `getLatestArchivedPeriod` picks by `ts`, not array order.
- `getFilteredBooks` treats `board === BooksDomain.ARCHIVED_FILTER` as "archived only" because archived books have no live `board`.
- UI: archived books render in a separate table, colored from the **last snapshot**. Event visibility of archived books: [`events.md`](events.md#semantics-worth-knowing).

## Book-board-color binding

`book.board` + `book.color` identify a book on a reading board. Concept and rationale: [`colors.md`](colors.md). `BooksDomain.betBookByBoard(boardId, color)` finds the book for a task/event. `BooksDomain.getUnregisteredColorsForBoard(board)` gives the only colors a book may claim: `BoardDomain.getColorsInUse(board)` minus colors of *active* books. It is **not** the palette and **not** `BoardDomain.getFreeColors()` (a Ranks-tool view).

## Known dead code

`BooksDomain.buildTreeLayout`, `shapeHalfWidth` and `apportion` have no callers; the cloud layout lives in `BookTree.js`. Safe to remove after a check.

## Invariants

- Ranges per stage are non-overlapping (validation + merge).
- One active book per color per board.
