# Boards Domain

**Related**: [`ranks.md`](ranks.md) | [`books.md`](books.md) | [`colors.md`](colors.md) | [`events.md`](events.md) | [`../persistence.md`](../persistence.md)

Shapes: read `BoardDomain.js` (`create`, `createColumn`, `updateTask`). Task `color` is a `Colors.js` key. `startIndex` and column `skipMove` are legacy; `skipMove` is deleted on load.

## Reading boards

Only boards with a `key` (`satori`, `paper`, `osarai`) are *reading boards*. Only they have ranks, books, events and `ideal`. Always check `board.key` before using those features. Other boards are plain kanban boards.

## Colors come from cards, not books

`BoardDomain.getColorsInUse(board)` is the source of truth for "colors present on this board". A board is agnostic of books; the Books domain derives the book-assignable colors from it. Rationale and invariant: [`colors.md`](colors.md#why-a-book-can-only-claim-card-colors).

## Ranks

`BoardDomain` only orchestrates (current board, undo snapshots, persistence). All rules live in [`ranks.md`](ranks.md).

## Ideal distribution

`board.ideal` is the input; `BoardDomain.getIdealPercents()` normalizes over reading boards to 100%. There is no hardcoded percentages map.

## Boards balance

There is no per-board move total in board data. Real-vs-ideal balance is derived from the event log (`EventsDomain.getBoardStats()`). The legacy `boardsCounters` and per-board `rankCountersAbs` fields are dropped on load (`App.loadData`); per-level balance comes from `EventsDomain.buildBoardAttentionBalance()`.

## Invariants

1. Only reading boards have ranks/books/events.
2. Undo is a single-level snapshot (`takeBoardSnapshot` / `undoFromSnapshot`).
