# KanbanMvd Documentation Map

Each topic below has one canonical document. Follow links instead of copying facts into other documents.

- **Architecture and application lifecycle** → [`docs/architecture.md`](docs/architecture.md)
- **Board domain** → [`docs/domains/boards.md`](docs/domains/boards.md)
- **Book domain** → [`docs/domains/books.md`](docs/domains/books.md)
- **Event domain** → [`docs/domains/events.md`](docs/domains/events.md)
- **Color domain (palette + book-board-color binding)** → [`docs/domains/colors.md`](docs/domains/colors.md)
- **UI component registry and patterns** → [`docs/ui/components.md`](docs/ui/components.md)
- **DOM event dispatch** → [`docs/ui/events-system.md`](docs/ui/events-system.md)
- **Drag and drop** → [`docs/ui/dragdrop.md`](docs/ui/dragdrop.md)
- **Persistence and storage keys** → [`docs/persistence.md`](docs/persistence.md)
- **Runtime and language constraints** → [`docs/constraints.md`](docs/constraints.md)

---

## Documentation Conventions

These docs are a **map, not a territory**. They are optimized for AI-assisted work: they tell a
reader *where* something lives, *why* it is that way, and *which invariants* must not be broken.
They are not a substitute for the source, and the source always wins.

**Source of truth.** The live code under `assets/` (`*.js`, `styles.css`, `index.html`) is
authoritative. When a document and the code disagree, the code is correct and the document is a
bug. Prefer reading the relevant file over trusting a description.

**Keep, replace, or pointer — the rule for any content:**

| Content | Treatment |
|---------|-----------|
| Navigation ("X lives in `Y.js`") | **Keep.** This is the highest-value content. |
| Invariants and hard rules ("one book per color per board") | **Keep.** Not derivable from code at a glance. |
| "Why" a design is the way it is | **Keep.** The main reason these docs exist. |
| Field/data shapes (wire and persistence contracts) | **Keep**, as a compact table. Field names are a contract. |
| Order-of-operations that defines behavior | **Describe** as numbered steps + a pointer to the function. |
| A copy of an implementation | **Replace** with a pointer (`see BoardDomain.js — commitBalance`). |
| A hand-written pseudo-code re-implementation | **Replace** with the rule it encodes + a pointer. Pseudo-code drifts and is worse than nothing. |

**Pointers over paraphrases.** When referring to behavior, name the concrete anchor — the file
and, where useful, the method (`BooksDomain.getUnregisteredColorsForBoard`) — so a reader can
verify with one lookup, instead of a paraphrase they might misapply.

**Illustrative vs. normative.** UI/visual behavior (gradients, pixel margins, animation timings,
exact CSS classes) ages fastest. When documenting it, mark it explicitly as illustrative and
point at the source, e.g. *"verify against `styles.css`"*. Do not present it as a hard rule.

**One canonical home per fact.** A fact lives in exactly one document; other documents link to
it rather than copying it. If you find the same rule in two places, delete the copy and leave a
link.

**Honesty about drift.** If a document describes a rule the code does not fully follow, say so in
the document (as [`constraints.md`](docs/constraints.md) does for optional chaining) instead of
silently describing the desired state. A marked inconsistency prevents a wrong assumption; an
unmarked one creates it.

**When you change behavior, update the doc in the same change.** At minimum, check whether the
affected invariants, shapes, or pointers still hold.

---

## Tests 

When a task is completed to not do any tests. 