# Events Domain

**Related documentation**: [`boards.md`](boards.md) | [`books.md`](books.md) | [`../ui/components.md`](../ui/components.md) | [`../persistence.md`](../persistence.md)

---

## Event Data Structure

The event record shape (a persistence/wire contract — field names are abbreviated, so this
table is the canonical key reference):

| Field | Meaning |
|-------|---------|
| `ts` | Timestamp (ms) |
| `d` | Date (`YYYY-MM-DD`) |
| `b` | Book key |
| `c1` | Source column |
| `c2` | Target column |
| `f` | From page (optional) |
| `t` | To page (optional) |
| `cm` | Consume move (`true` = counted in ranks) |
| `sm` | Legacy `skipMove` (migration artifact) |

**Note**: Pages `f`/`t` optional (move without page range). See `EventsDomain.js` for the live
shape.

---

## Event Logging Flow

**Trigger**: User commits progress in `ProgressUI` → `ProgressUI.commitMove()`

A single commit performs three coordinated operations:

1. `BoardDomain.commitBalance(consumeMove)` — updates rank counters.
2. `BooksDomain.addOrUpdateRange(bookKey)` — updates book ranges.
3. `EventsDomain.log({ book, consumeMove, from, to })` — creates the event.

**EventsDomain.log()** (`EventsDomain.js`):
- Adds `ts`, `d` (date), `c1`/`c2` from `State.progressData`
- Sets `cm: true` if `consumeMove === true`
- Pushes to `App.events` and requests persistence through the boundary defined in [`persistence.md`](../persistence.md)
- Marks `State.undoSnapshot.logged = true` for undo support

---

## Event Query Methods

| Method | Description |
|--------|-------------|
| `getEvents()` | All events (loads from Storage if needed) |
| `getEventsForBook(key, isAsc)` | Events for specific book |
| `getEventsForDate(date, isAsc)` | Events on specific date |
| `getFilteredEvents(filter)` | Filter by `board`/`books`; shows archived-book events by default, hides only when `includeArchived === false` |
| `getFilteredEventsByDefaultOrder()` | Filtered + sorted by `ts` desc |
| `getFilteredEventsByOrder(isAsc)` | Filtered + sorted by `ts` asc/desc |
| `checkSkipMoved(events, filter)` | Excludes `cm !== true` unless `filter.includeSkipMove` |

---

## Calendar Generation (`EventsDomain.js`)

`generateCalendar(events)` groups events by date into months → weeks → days. **Contract**
(read `EventsDomain.js` for the implementation):

- Each day is `{ day: Number, events: [Event] }`.
- Weeks are padded to 7 days; partial weeks occur at month boundaries and carry a partial flag.
- The return shape is `[{ month, weeks: [{ days: [Day], partial: Bool }], year }]`.

**Merge dots logic** (`EventsUI.js`):
- By default, merge multiple events for same book on same day → single dot
- `State.eventsUi.dotsMerged` toggle controls this
- `skipMove` events shown at 50% opacity when not merged

---

## Statistics Types

All stats operate on `EventsDomain.getFilteredEvents()` (respects board/books filter).

### 1. Monthly Rate (`getMonthlyRate`)
- Events per month + active days + average per active day
- Uses `EventsDomain.getMonthStats()`

### 2. Month Activity (`getMonthActivity`)
- Same as monthly rate, different presentation

### 3. Boards Distribution (`getBoardDistribution`)
- Events grouped by month → board → count + %
- Shows ideal % from `BoardDomain.getIdealPercents()`

### 4. Board Stats (`buildBoardStats`)
- Per-board: expected vs actual moves per rank level
- Expected derived from rank quotas (flow calculation)
- Shows: level, expected%, actual%, delta, ratio, per-book breakdown

### 5. Board Attention Balance (`buildBoardAttentionBalance`)
- Deep dive for single board (selected via filter)
- Per rank level: expected vs actual per book (color-coded)
- Ratio = actual/expected (1.0 = perfect balance)
- Used for "attention balance" visualization

---

## UI Components

See the canonical [`UI component registry`](../ui/components.md#component-registry).

---

## Key Invariants

- **Events only for reading boards** — `book.board` must have `key` property
- **ConsumeMove = rank impact** — Only `cm: true` events affect rank counters
- **Filter applies everywhere** — List, calendar, stats all use `getFilteredEvents()`
- **Undo removes last event** — `EventsDomain.undoLast()` pops + saves
- **Date format** — `YYYY-MM-DD` (ISO date only, no time)