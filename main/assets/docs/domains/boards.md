# Boards Domain

**Related documentation**: [`books.md`](books.md) | [`colors.md`](colors.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md) | [`../persistence.md`](../persistence.md)

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
- **Counters** — `rankCounters`, `rankCountersAbs`, `boardsCounters`

Colors on a board originate from its **cards**, not from books: `BoardDomain.getColorsInUse(board)`
is the source of truth for "colors present on this board", and the Books domain derives the
book-assignable color set from it. A board is agnostic of books — see
["Why a book can only claim card colors"](colors.md#why-a-book-can-only-claim-card-colors) for
the rationale and the resulting invariant.

---

## Ranks System

### Configuration (`board.ranks`)
```javascript
{
  1: { c: ['peach', 'pink'], q: 3 },   // Level 1: 2 colors, quota 3
  2: { c: ['plum', 'purple'], q: 2 },  // Level 2: 2 colors, quota 2
  3: { c: ['blue'], q: 1 }             // Level 3: 1 color, quota 1
}
```
- `c` — Array of color keys (from `Colors.js`)
- `q` — Quota: how many level-N moves needed to produce 1 level-(N+1) move

Ranks sit on top of the [book-board-color binding](colors.md): each rank level lists book
colors, and unmentioned colors are auto-appended to the lowest level by
`checkAndUpdateRanks()`. The palette itself is documented in [`colors.md`](colors.md).

### Counters
| Counter | Purpose | Updated By |
|---------|---------|------------|
| `rankCounters[level]` | Consumed moves at this level (resets when upper level consumes) | `BoardDomain.commitBalance()` |
| `rankCountersAbs[level]` | Absolute move count at this level (never resets) | `BoardDomain.commitBalance()` |
| `boardsCounters[boardId]` | Total consumed moves across all levels for board | `BoardDomain.commitBalance()` |

### Rank Algorithm (`BoardDomain.commitBalance()`)

**Trigger**: Task dropped on column with `consumeMove=true` (or column's `defaultConsumeMove`)

**Implementation**: `BoardDomain.js` — `commitBalance(consumeMove)`. Read the live source
for exact behavior; it is the source of truth. The rule it implements is the following.

**Model — a token economy.** Lower-level moves are "minted" by spending upper-level quota.
Level 1 is the base currency.

Order of effects when a move is committed at `level`:

1. The **absolute** counter `rankCountersAbs[level]` always increments (never resets).
2. The **board total** counter (`boardsCounters[board.id]`) increments (never resets).
3. If the move is not a move (`consumeMove` falsy), rank counters are left untouched.
4. At level 1, only the level-1 counter increments.
5. At higher levels, the own counter increments, **capped at that level's quota when it is
   the last level** (no child level resets it).
6. The **upper level decrements** by `1 × quotaUpper` — consuming a lower-level move "spends"
   upper-level quota. This step is the core of the token economy.
7. Counter mutations are wrapped in undo snapshots and persisted.

The level is derived from the moved task's color (`RanksUI.getLevelOfColor`), not passed as a
parameter. Quotas come from `board.ranks[level].q`.

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
| `setRanksData(parsedRanks)` | Validates + saves ranks config |
| `deleteRanks()` | Clears ranks + counters |
| `resetCounters()` | Clears rankCounters + rankCountersAbs |
| `commitBalance(consumeMove, level)` | Core rank algorithm (see above) |
| `takeBoardSnapshot()` / `undoFromSnapshot()` | Undo support |

---

## Boards Counters (`boardsCounters`)

Tracked in `App.data.boardsCounters` and persisted with board data:
- Key: board.id
- Value: total consumed moves (all levels)
- Used for: HeaderStats (real vs ideal %), EventStatsUI board distribution

Reset via HeaderStats UI → `BoardDomain.resetBoardsCounters()`.

---

## UI Components

See the canonical [`UI component registry`](../ui/components.md#component-registry).

---

## Key Invariants

1. **Only reading boards have ranks/books/events** — check `board.key` before using
2. **Rank algorithm is single-threaded** — no concurrent `commitBalance` calls (UI is single-threaded)