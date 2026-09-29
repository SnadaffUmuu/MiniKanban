# KanbanMvd Documentation Map

Android WebView app, plain ES modules under `assets/` (`components/*.js`, `index.html`, `styles.css`), no build step.
The code is the source of truth. These docs exist only for what the code cannot tell you: **intent, invariants, deliberate oddities, storage formats**.

## Hard rules (no need to open any doc for these)

1. Target runtime is an old WebView (API 21–28): write ES7-level JS, no `?.` / `??` in new code. Details and known drift: [`constraints.md`](docs/constraints.md).
2. Domain modules (`*Domain.js`) never touch the DOM.
3. UI peers coordinate through `Bus` events; do not call another component's methods or call `render()` directly during normal updates.
4. New DOM handlers go into the component's own `events` map, not the legacy map in `Events.js`.
5. Any `color` field is a key from `Colors.js`, applied as a CSS class, never as inline style.
6. A book may only claim a color that already exists as a card on its board (not any palette color).
7. Storage is reached only through `App.js` → `Storage.js`; wrap Android/storage calls in `try/catch`.

## Read before touching

| Task area | Read |
|-----------|------|
| Startup, render/update lifecycle, layer rules | [`docs/architecture.md`](docs/architecture.md) |
| Boards, columns, tasks, ideal balance | [`docs/domains/boards.md`](docs/domains/boards.md) |
| Ranks, quota counters, editing ranks | [`docs/domains/ranks.md`](docs/domains/ranks.md) |
| Books, ranges, archiving, page cloud | [`docs/domains/books.md`](docs/domains/books.md) |
| Event log, event fields, statistics | [`docs/domains/events.md`](docs/domains/events.md) |
| Colors, book-board-color binding | [`docs/domains/colors.md`](docs/domains/colors.md) |
| Adding/changing a UI component | [`docs/ui/components.md`](docs/ui/components.md) |
| Adding a DOM event handler | [`docs/ui/events-system.md`](docs/ui/events-system.md) |
| Drag and drop | [`docs/ui/dragdrop.md`](docs/ui/dragdrop.md) |
| Storage keys, saving | [`docs/persistence.md`](docs/persistence.md) |
| Language / WebView limits | [`docs/constraints.md`](docs/constraints.md) |

For "where is function X / what does it take", use `grep`, not the docs.

---

## Documentation Conventions

**Write a doc line only if it cannot be recovered by reading the code.** Ask: *would a model that reads the relevant file still get this wrong?* If not, do not write it.

| Add | Do NOT add |
|-----|-----------|
| Why a design is the way it is; rejected alternatives | Method/function lists or signature tables |
| Invariants and hard rules | Code blocks copied from source, pseudo-code |
| Deliberate oddities ("looks like a bug, is intended") | Step-by-step narration of what a function does |
| Persistence / wire field names (compact table) | Pixel sizes, timings, colors, CSS classes (unless marked *illustrative*) |
| Order of operations that defines behavior (numbered, with one pointer) | Lists of things that exist in code (palette, components' methods) |
| Known drift between docs/constraints and code, stated openly | Anything already stated in another doc (link instead) |

Rules of upkeep:

- **One home per fact.** Link, do not copy.
- **Pointers, not paraphrases.** Name file + method (`BooksDomain.getUnregisteredColorsForBoard`) only for non-obvious entry points, and never restate its signature. A renamed function makes a pointer stale, so keep pointers few.
- **Prefer deleting to adding.** When you touch a doc, remove lines that are now obvious or wrong. A shorter correct doc beats a longer stale one.
- **When you change behavior**, update only if an invariant, a "why", or a field contract changed. A refactor or new method usually needs **no** doc change.
- **Honesty about drift.** If the code violates a documented rule, say so in the doc instead of describing the ideal.
- Keep each doc short (target under ~100 lines). If it grows past that, you are probably copying code.

---

## Tests

When a task is completed do not do any tests.
