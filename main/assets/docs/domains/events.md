# Events Domain

**Related**: [`boards.md`](boards.md) | [`books.md`](books.md) | [`ranks.md`](ranks.md) | [`../persistence.md`](../persistence.md)

## Event record (persistence contract; keys are abbreviated)

| Field | Meaning |
|-------|---------|
| `ts` | Timestamp (ms) |
| `d` | Date `YYYY-MM-DD` (date only, no time) |
| `b` | Book key |
| `c1` / `c2` | Source / target column |
| `f` / `t` | From / to page (optional: a move may have no page range) |
| `cm` | Consume move: `true` = counted in ranks |
| `sm` | Legacy `skipMove` (migration artifact) |

## Logging

Committing progress (`ProgressUI.commitMove`) does three things: `BoardDomain.commitBalance` (rank counters, [`ranks.md`](ranks.md)), `BooksDomain.addOrUpdateRange`, and `EventsDomain.log`. `log` also marks `State.undoSnapshot.logged`, so `EventsDomain.undoLast()` knows there is an event to pop.

## Semantics worth knowing

- **Only `cm: true` events affect rank statistics.** `checkSkipMoved` drops the others unless `filter.includeSkipMove`.
- **One filter for everything**: list, calendar and stats all go through `getFilteredEvents()`. Events of archived books are shown by default and hidden only when `filter.includeArchived === false`.
- **Book/board of an event is resolved at event time** via `BooksDomain.getBindingAt` (see [`books.md`](books.md#archiving)), not from the book's current binding.
- **Calendar range vs dots**: `generateCalendar(events, rangeEvents)` takes the calendar's first/last dates from `rangeEvents` (all history, from `EventsUI`) and dots from `events` (filtered). This keeps the calendar and scroll position stable while filters change.
- **Attention balance** (`buildBoardAttentionBalance`): per rank level, expected moves (from quotas) vs actual moves per book; ratio 1.0 is perfect. It replaces the removed `rankCountersAbs`.
- Events exist only for reading boards.
