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
| `cm` | Consume move: `true` = counted against rank quotas |

## Semantics worth knowing

- Events without `cm: true` are non-consuming moves. Ordinary filtered views exclude them unless `filter.includeSkipMove` is enabled; attention balance always excludes them.
- List, calendar dots, monthly activity and monthly rate use the shared event filter. Board distribution, board balance and attention balance intentionally use full history; attention balance then selects its board. Events of archived books are shown by default and hidden from filtered views only when `filter.includeArchived === false`.
- **Book/board of an event is resolved at event time** via `BooksDomain.getBindingAt` (see [`books.md`](books.md#archiving)), not from the book's current binding.
- **Calendar range vs dots**: `generateCalendar(events, rangeEvents)` takes the calendar's first/last dates from `rangeEvents` (all history, from `EventsUI`) and dots from `events` (filtered). This keeps the calendar and scroll position stable while filters change.
- **Attention balance** (`buildBoardAttentionBalance`): replaces the removed `rankCountersAbs`. Rules that are easy to get wrong:
  - It ignores the filters except the board, and counts only `cm: true` events.
  - It works by **color only**. Ranks and boards are agnostic of books; an event's color is resolved at event time. Events with no resolvable color or a color outside the ranks go to the "unranked" row.
  - Ranks come from `board.ranksHistory` ([`ranks.md`](ranks.md#ranks-history)). The user picks one period (quotas fixed) or the default window: the last `ATTENTION_DEFAULT_CYCLES` full cycles, never reaching before the latest period start. Opening credit is unknown in the default window and taken as 0.
  - Per level, expected % comes from quotas (`ratio` 1.0 = on target). **Per-link ratio** = moves / allowed, where allowed = floor((opening counter above + moves above) / quota above); it isolates one level from lag above it.
  - Colors sharing a level have **no target proportion**, so only descriptive columns (moves, % of all, % in level) exist for them.
- Events exist only for reading boards.
