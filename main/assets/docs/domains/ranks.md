# Ranks Domain

**Related documentation**: [`boards.md`](boards.md) | [`colors.md`](colors.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md)

---

## Ownership

Ranks assign priorities to **board colors**, not books. They are independent of book assignment
and archive state, and a color may remain in ranks when no card currently has that color.

## Data contracts

| Field | Meaning |
|-------|---------|
| `c` | Unique palette color keys assigned to the level |
| `q` | Number of level-N moves required for one level-(N+1) move |
| `board.ranksRaw` | User textarea representation: one `quota colors` level per line |
| `board.rankCounters[N]` | Level-N wallet/credit line available to the level-(N+1) group |

The persisted shapes remain positional. Level numbers are positions, not stable identities.

## Color placement

A color may occur in only one level. Board colors omitted while editing ranks are appended to the
lowest level rather than rejected. A color newly introduced by a task is handled the same way, so
existing quotas and priorities do not shift unexpectedly.

## Standing and pass state

For a group at level N, its **standing** is:

`rankCounters[N-1] - quota[N-1]`

This represents the accumulated expectation of the waiting group and is preserved where possible
when ranks are edited.

## Consuming quota

A consumed move credits its level. A move at a lower-priority level also spends the preceding
level's quota.
The last level's own counter is capped at its quota because no following group can spend it.
Non-consuming moves leave all rank counters unchanged.

## Editing ranks and reconciling counters

Old and new groups are matched by overlapping colors. The reconciliation policy is:

1. If a matched group's predecessor is unchanged, keep its raw wallet balance.
2. If its predecessor changes, preserve (grandfather) the group's standing under the new quota.
3. A new group starts with no credit, except that a group appended below the old tail claims the
   old tail balance.
4. Split/merge overlap is ambiguous. Preview permits an opening-balance override only for those
   rows.
5. An unmatched old group is dropped. The last counter remains a capped tail counter.

Reconciliation never consults books, archive state, or cards. No persistence migration is
required. The legacy `rankCountersAbs` field (absolute per-level move counts) was removed; it was
never reconciled and went stale after rank edits. Per-level move distribution is now derived from
events — see `EventsDomain.buildBoardAttentionBalance` in [`events.md`](events.md).

## Ranks history

`board.ranksHistory` normally appends `{ts, reason, ranks, counters}` copies. It exists because the
attention balance must use the ranks that were in force when each event was logged. `counters` are
the opening counters *after* reconciliation and manual overrides, so overrides need no separate
record. Undo may roll back the latest entry as part of restoring the board snapshot.

| `reason` | Period meaning |
|----------|----------------|
| `edit` | starts a period |
| `reset` | starts a period with restarted counters |
| `delete` | ends the period; `ranks` is `null` |
| `addColor` | stays in the current period because quotas are unchanged and the color has no older events |
| `init` | starts an approximate period for boards that predate history tracking |

Deleting current ranks never deletes their history. An `init` entry is dated `0` and flagged
`approx`: earlier ranks are assumed to equal the current ranks so old events still count, but its
counters came from first load rather than period start, so opening credit is treated as 0. A real
edit or reset ends the approximation.

A full cycle is a sum of products of quotas, not a sum of quotas.
