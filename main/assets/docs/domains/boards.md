# Boards Domain

**Related documentation**: [`ranks.md`](ranks.md) | [`books.md`](books.md) | [`colors.md`](colors.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md) | [`../persistence.md`](../persistence.md)

---

## Data Structures

### Board
```javascript
{
  id: 'uid',           // Utils.generateUID()
  name: 'Board Name',
  key: 'satori',       // Only for reading boards: 'satori' | 'paper' | 'osarai'
  columns: [Column],
  ranks: RanksConfig,  // Only for reading boards
  rankCounters: {},    // Per-level consumed moves (runtime)
  rankCountersAbs: {}, // Absolute move counts per level (runtime)
  ideal: 30,           // Target % for attention balance (reading boards)
  startIndex: 0        // legacy, not used
}
```

### Column
```javascript
{
  id: 'uid',
  name: 'Column Name',
  tasks: [Task],
  defaultConsumeMove: false,  // Tasks dropped here auto-consume move
  skipMove: false             // Legacy: column doesn't advance rank
}
```

### Task
```javascript
{
  id: 'uid',
  title: 'Task title',
  color: 'white',      // Key from Colors.js
  description: '',     // Expanded info
  vocabCount: 0        // Vocabulary practice counter
}
```

---

## Reading Boards (Special)

Only boards with `key` property get advanced features:
- **Satori R** (`key: 'satori'`) — Color: `--satori` (#d77400)
- **Paper** (`key: 'paper'`) — Color: `--paper` (#7c46ff)
- **Osarai** (`key: 'osarai'`) — Color: `--osarai` (#52bb4b)

Features exclusive to reading boards:
- **Ranks** — Hierarchical color-based progression system
- **Books** — Books assigned to board via `book.board` + `book.color`
- **Events** — Reading sessions logged per book
- **Counters** — `rankCounters`, `rankCountersAbs`

Colors on a board originate from its **cards**, not from books: `BoardDomain.getColorsInUse(board)`
is the source of truth for "colors present on this board", and the Books domain derives the
book-assignable color set from it. A board is agnostic of books — see
["Why a book can only claim card colors"](colors.md#why-a-book-can-only-claim-card-colors) for
the rationale and the resulting invariant.

---

## Ranks System

Ranks are persisted on a board as `ranks`, `ranksRaw`, `rankCounters`, and `rankCountersAbs`.
`BoardDomain` orchestrates current-board selection, undo snapshots, board-wide counters, and
persistence. All rank rules and data contracts are canonical in [`ranks.md`](ranks.md).

### Ideal Distribution (`BoardDomain.getIdealPercents()`)

Relative share of each reading board, derived from the `board.ideal` values and normalized to
100% (`BoardDomain.js`). Used in `HeaderStats` + `EventStatsUI` for "attention balance". The
per-board `ideal` value in the data is the input; there is no hardcoded percentages map in the
domain.

---

## Board Operations (BoardDomain.js)

| Method | Description |
|--------|-------------|
| `getBoards()` | All boards from `App.data.boards` |
| `getCurrentBoard()` | `local.currentBoard` → fallback to 'paper' key |
| `switchBoard(id)` | Sets `local.currentBoard`, emits `boardsChanged` |
| `create()` | Adds default 3-column board, selects it |
| `delete()` | Removes board, selects adjacent, cleans counters |
| `rename(name)` | Updates board name |
| `createColumn()` | Adds column at end, emits `columnAdded` |
| `deleteColumn(id)` | Removes column + tasks |
| `moveColumn(id, right)` | Reorders columns |
| `renameColumn(id, name)` | Updates column name |
| `setColumnDefaultConsumeMove(id, bool)` | Sets auto-consume flag |
| `setRanksData(parsedRanks)` | Orchestrates reconciliation, undo snapshot, and persistence |
| `deleteRanks()` | Clears ranks + counters |
| `resetCounters()` | Clears rankCounters + rankCountersAbs |
| `commitBalance(consumeMove)` | Orchestrates pure `RanksDomain` balance mutation and persistence |
| `takeBoardSnapshot()` / `undoFromSnapshot()` | Undo support |

---

## Boards balance

There is no per-board move total in board data. The real-vs-ideal board balance is derived from
the event log: `EventsDomain.getBoardStats()` (shown by `HeaderStats` and `EventStatsUI`), with
targets from `BoardDomain.getIdealPercents()`. The legacy `boardsCounters` field is dropped on
load (`App.loadData`).

---

## UI Components

See the canonical [`UI component registry`](../ui/components.md#component-registry).

---

## Key Invariants

1. **Only reading boards have ranks/books/events** — check `board.key` before using
2. **Rank algorithm is single-threaded** — no concurrent `commitBalance` calls (UI is single-threaded)