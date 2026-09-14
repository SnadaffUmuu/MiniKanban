# Events Domain

**Related documentation**: [`boards.md`](boards.md) | [`books.md`](books.md) | [`../ui/components.md`](../ui/components.md) | [`../persistence.md`](../persistence.md)

---

## Event Data Structure

```javascript
{
  ts: 1699999999999,    // Timestamp (ms)
  d: '2024-01-15',      // Date (YYYY-MM-DD)
  b: 'book-key',        // Book key
  c1: 0,                // Source column
  c2: 1,                // Target columm
  f: 10,                // From page (optional)
  t: 20,                // To page (optional)
  cm: true,             // Consume move (true = counted in ranks)
  sm: false             // Legacy skipMove (migration artifact)
}
```

**Note**: Pages `f`/`t` optional (move without page range).

---

## Event Logging Flow

**Trigger**: User commits progress in `ProgressUI` → `ProgressUI.commitMove()`

```javascript
// ProgressUI.commitMove()
BoardDomain.commitBalance(consumeMove);  // Updates rank counters
BooksDomain.addOrUpdateRange(bookKey);   // Updates book ranges
EventsDomain.log({ book, consumeMove, from, to });  // Creates event
```

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
| `getFilteredEvents(filter)` | Filter by `board` or `books` (array) |
| `getFilteredEventsByDefaultOrder()` | Filtered + sorted by `ts` desc |
| `getFilteredEventsByOrder(isAsc)` | Filtered + sorted by `ts` asc/desc |
| `checkSkipMoved(events, filter)` | Excludes `cm !== true` unless `filter.includeSkipMove` |

---

## Calendar Generation (`EventsDomain.js`)

```javascript
generateCalendar(events) {
  // Groups events by date → months → weeks → days
  // Each day: { day: 15, events: [Event] }
  // Weeks padded to 7 days (partial weeks at month boundaries)
  // Returns: [{ month, weeks: [{ days: [Day], partial: bool }], year }]
}
```

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