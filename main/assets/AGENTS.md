# KanbanMvd — Agent Map

**One-liner**: Android WebView Kanban app for tracking reading progress across multiple books/boards. Core domains: Boards (with Ranks), Books (with range-based progress), Events (list + calendar + stats).

**Stack**: Vanilla ES7 (ES2016), no build step, runs in Android WebView (API 21-28). Storage: Android native interface. Domain data are stored as files on users' devices.

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│  index.html + main.js (entry)                               │
├─────────────────────────────────────────────────────────────┤
│  Components (19) — UI + Domain pairs                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ BoardUI     │  │ BooksUI     │  │ EventsUI    │  ← Screens │
│  │ BoardDomain │  │ BooksDomain │  │ EventsDomain│          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ HeaderUI    │  │ RanksUI     │  │ DragDrop    │  ← Shared  │
│  │ FiltersUI   │  │ ProgressUI  │  │ TaskUI      │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                             │
│  • App.js          — Singleton: data loading, screen state │
│  • State.js        — Global UI state (modes, drafts, etc.) │
│  • Bus.js          — Event bus with microtask batching     │
│  • Events.js       — Declarative event map (selector→handler) │
│  • Storage.js      — Android/localStorage abstraction      │
│  • Utils.js        — Shared utilities                      │
├─────────────────────────────────────────────────────────────┤
│  Persistence                                                │
│  • kanbanAppData   — Boards + counters                      │
│  • kanbanBooks     — Books + progress ranges               │
│  • kanbanEvents    — Reading board moves logs              │
│  • kanbanLocal     — UI prefs (screen, filters, night mode)│
└─────────────────────────────────────────────────────────────┘
```

---

## Detailed Documentation

- **Architecture** → [`docs/architecture.md`](docs/architecture.md)
- **Domains** → [`docs/domains/boards.md`](docs/domains/boards.md) | [`docs/domains/books.md`](docs/domains/books.md) | [`docs/domains/events.md`](docs/domains/events.md)
- **UI Patterns** → [`docs/ui/components.md`](docs/ui/components.md) | [`docs/ui/events-system.md`](docs/ui/events-system.md) | [`docs/ui/dragdrop.md`](docs/ui/dragdrop.md)
- **Persistence** → [`docs/persistence.md`](docs/persistence.md)
- **Constraints** → [`docs/constraints.md`](docs/constraints.md)