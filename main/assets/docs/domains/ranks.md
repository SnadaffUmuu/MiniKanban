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
| `board.rankCountersAbs[N]` | Absolute consumed-move count at level N |

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

The pure mutation is `RanksDomain.commitBalance(ranks, counters, absCounters, level)`. The public
application operation remains `BoardDomain.commitBalance(consumeMove)`, which derives the level
from the progress task's color and persists the returned state.

For a consumed move:

1. Increment the absolute counter at the moved color's level.
2. At level 1, increment its quota counter without spending an upper wallet.
3. At a lower-priority level, increment its own counter and subtract the preceding level's quota
   from the preceding counter.
4. Cap the last level's own counter at its quota because no following group spends it.
5. `BoardDomain` snapshots the previous counters (for undo) and persists.

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

Reconciliation never consults books, archive state, or cards. `rankCountersAbs` is intentionally
not reconciled. No persistence migration is required.

## Public anchors

| Operation | Anchor |
|-----------|--------|
| Parse and validate textarea syntax | `RanksDomain.parseRanks()` |
| Find a color's level | `RanksDomain.getLevelOfColor()` |
| Add an unmentioned color | `RanksDomain.addColorToLowestLevel()` |
| Calculate standing/pass state | `RanksDomain.getStanding()` / `getPassState()` |
| Apply one consumed move | `RanksDomain.commitBalance()` |
| Reconcile an edited hierarchy | `RanksDomain.reconcileCounters()` / `applyOverrides()` |
| Board persistence orchestration | `BoardDomain.setRanksData()` / `commitBalance()` |
| Preview and rendering | `RanksUI` |