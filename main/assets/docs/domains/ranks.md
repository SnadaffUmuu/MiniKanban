# Ranks Domain

**Related documentation**: [`boards.md`](boards.md) | [`colors.md`](colors.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md)

---

## Ownership and boundaries

`components/RanksDomain.js` is the pure rules engine. It receives ranks, counters, colors, and
levels explicitly; it does not read `App`, `State`, the DOM, books, cards, or persistence.

`BoardDomain.js` is the orchestration boundary: it selects the board/task, takes undo snapshots,
applies results returned by `RanksDomain`, updates the board-wide counter, and persists.
`RanksUI.js` owns textarea/preview state and rendering only.

Ranks assign priorities to **board colors**, not books. They are independent of book assignment
and archive state, and a color may remain in ranks when no card currently has that color.

## Data contracts

```javascript
board.ranks = {
  1: {c: ['peach', 'pink'], q: 3},
  2: {c: ['plum', 'purple'], q: 2},
  3: {c: ['blue'], q: 1}
}
```

| Field | Meaning |
|-------|---------|
| `c` | Unique palette color keys assigned to the level |
| `q` | Number of level-N moves required for one level-(N+1) move |
| `board.ranksRaw` | User textarea representation: one `quota colors` level per line |
| `board.rankCounters[N]` | Level-N wallet/credit line available to the level-(N+1) group |

The persisted shapes remain positional. Level numbers are positions, not stable identities.

## Parsing and color placement

`RanksDomain.parseRanks(raw, validColors, colorsInUse)` parses and validates textarea input. It
rejects invalid quotas, unknown colors, missing colors, and duplicate color assignments. Board
colors omitted from the textarea are appended to its lowest level.

`RanksDomain.addColorToLowestLevel(ranks, ranksRaw, color)` is used when a task introduces a color
that the existing ranks do not mention. `BoardDomain.checkAndUpdateRanks()` is the persistence
orchestration wrapper.

`RanksDomain.getLevelOfColor(color, ranks)` is the single level-lookup rule.

## Standing and pass state

For a group at level N, its **standing** is:

`rankCounters[N-1] - quota[N-1]`

This represents the accumulated expectation of the waiting group. `RanksDomain.getStanding()` and
`RanksDomain.getPassState()` are the calculation anchors used by card pass-mark rendering and rank
edit reconciliation.

## Consuming quota

The pure mutation is `RanksDomain.commitBalance(ranks, counters, level)`. The public
application operation remains `BoardDomain.commitBalance(consumeMove)`, which derives the level
from the progress task's color and persists the returned state.

For a consumed move:

1. At level 1, increment its quota counter without spending an upper wallet.
2. At a lower-priority level, increment its own counter and subtract the preceding level's quota
   from the preceding counter.
3. Cap the last level's own counter at its quota because no following group spends it.
4. `BoardDomain` snapshots the previous counters (for undo) and persists.

A falsy `consumeMove` leaves all rank counters unchanged.

## Editing ranks and reconciling counters

`RanksDomain.reconcileCounters(oldRanks, oldCounters, newRanks)` matches old and new groups by
overlapping colors and returns opening counters plus a preview report. The policy is:

1. If a matched group's predecessor is unchanged, keep its raw wallet balance.
2. If its predecessor changes, preserve (grandfather) the group's standing under the new quota.
3. A new group starts with no credit, except that a group appended below the old tail claims the
   old tail balance.
4. Split/merge overlap is ambiguous. Preview permits an opening-balance override only for those
   rows; `RanksDomain.applyOverrides()` applies it.
5. An unmatched old group is dropped. The last counter remains a capped tail counter.

Reconciliation never consults books, archive state, or cards. No persistence migration is
required. The legacy `rankCountersAbs` field (absolute per-level move counts) was removed; it was
never reconciled and went stale after rank edits. Per-level move distribution is now derived from
events — see `EventsDomain.buildBoardAttentionBalance` in [`events.md`](events.md).

## Ranks history

`board.ranksHistory` is an append-only list of `{ts, reason, ranks, counters}` copies. It exists
because the attention balance must be computed with the ranks that were in force when each event
was logged. `counters` are the opening counters *after* reconciliation and manual overrides, so
overrides need no separate record.

| `reason` | Recorded by | Starts a new period? |
|----------|-------------|----------------------|
| `edit` | `BoardDomain.setRanksData` | yes |
| `reset` | `BoardDomain.resetCounters` | yes (counters restart) |
| `delete` | `BoardDomain.deleteRanks` (`ranks: null`) | ends the period |
| `addColor` | `BoardDomain.checkAndUpdateRanks` | no: quotas are unchanged and the new color has no older events |
| `init` | `App.loadData`, for boards that have ranks but no history (also repairs init entries dated at first load) | yes |

- `deleteRanks` removes ranks, raw text and counters but **never the history**.
- The `init` entry is dated `0` and flagged `approx`: ranks before tracking began are *assumed* to be the current ones, so older events still count. Its counters were taken at first load, so the balance ignores them (opening credit 0). A real edit or reset ends that approximation.
- Undoing a rank edit restores the board snapshot, so its history entry goes too.
- `RanksDomain.buildRankPeriods` merges `addColor` entries; `getCycleSize` is the number of
  consumed moves of one full cycle (a sum of products of quotas, *not* a sum of quotas).
