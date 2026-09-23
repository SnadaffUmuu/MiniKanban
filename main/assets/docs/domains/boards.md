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

**Logic** (`BoardDomain.js`):
```javascript
function commitBalance(consumeMove, level = 1) {
  if (!consumeMove) return;  // Non-move actions don't affect ranks

  // 1. Absolute counter always increments
  board.rankCountersAbs[level] = (board.rankCountersAbs[level] || 0) + 1;

  // 2. Board total counter
  boardsCounters[board.id] = (boardsCounters[board.id] || 0) + 1;

  // 3. Level 1 always increments own counter
  if (level === 1) {
    board.rankCounters[1] = (board.rankCounters[1] || 0) + 1;
    return;
  }

  // 4. Higher levels: check quota
  const quotaOwn = ranks[level].q;
  const isLastLevel = level === Object.keys(ranks).length;

  if (isLastLevel && ownCount >= quotaOwn) {
    // Last level caps at quota (no child to reset it)
    board.rankCounters[level] = quotaOwn;
  } else {
    board.rankCounters[level] = ownCount + 1;
  }

  // 5. Upper level DECREMENTS by (delta * quotaUpper)
  // This is the key: consuming a lower-level move "spends" upper-level quota
  const quotaUpper = ranks[level - 1].q;
  board.rankCounters[level - 1] = upperCount - (1 * quotaUpper);

  saveBoards();
}
```

**Key insight**: Ranks form a **token economy**. Lower-level moves are "minted" by spending upper-level quota. Level 1 is the base currency.

### Ideal Distribution (`BoardDomain.getIdealPercents()`)
```javascript
// From board.ideal values across reading boards
const idealMap = { satori: 40, paper: 35, osarai: 25 };  // Sum = 100
// Used in HeaderStats + EventStatsUI for "attention balance"
```

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