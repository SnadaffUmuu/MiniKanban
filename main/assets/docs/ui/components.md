# UI Components

**Related documentation**: [`../architecture.md`](../architecture.md) | [`events-system.md`](events-system.md) | [`dragdrop.md`](dragdrop.md)

---

## Component Pattern

Every UI component in `components/` follows this pattern:

```javascript
export const ComponentName = {
  name: 'ComponentName',              // Required for Events.js wiring

  selectors: {                        // CSS selector map
    elementName: 'css-selector',      // Single element
    elementListName: 'css-selector',  // Multiple (suffix 'sss' → querySelectorAll)
  },

  dom: {},                            // Populated by Utils.cacheComponentDom()

  events: {                           // Optional declarative DOM event bindings
    click: {
      '##': 'handlerMethod',          // Global catch-all (document level)
      '@selectorAlias': 'handlerMethod',  // Resolved via component.selectors[key]
      'raw-selector': 'handlerMethod'
    },
    input: { ... },
    change: { ... }
  },

  init() {
    Bus.batchedMethod(this, 'render');  // Wrap render for batching
    Bus.on(Bus.events.someEvent, this.render.bind(this));
    // ... other subscriptions
  },

  render() {
    // Reads State + App.data, then updates cached DOM nodes
    // Guard: if (!App.isRelevantScreen()) { hide; return; }
    // Use this.dom.cachedElement (never querySelector in render)
  },

  handlerMethod(el, event, params) { ... }
};
```

---

## Component Implementation Conventions

- **DOM cache** — Declare selectors in `selectors`; startup calls `Utils.cacheComponentDom(component)`. A selector property ending in `sss` is cached with `querySelectorAll`; other properties use `querySelector`.
- **Batched render** — A rendering component calls `Bus.batchedMethod(this, 'render')` in `init()` before subscribing the renderer to Bus events.
- **Post-render DOM work** — Queue it with `State.afterRender.push(callback)`. Timing and queue ownership are defined by the [architecture lifecycle](../architecture.md#update-and-rendering-lifecycle).
- **Normal updates** — Publish the relevant Bus event rather than invoking a renderer directly. Explicit startup renders are documented in [Application Startup](../architecture.md#application-startup).

---

## State Mutation Pattern

```javascript
// Preferred: immutable update via setter
State.setState({ headerUiMode: 'ranks' });

// Or direct (for nested):
State.boardUi.taskUi[taskId] = { mode: 'edit', description: '...' };
// Then emit:
Bus.emit(Bus.events.taskUiChanged, taskId);

// In State.js:
setState(patch) { Object.assign(this, patch); }
```

---

## Component Registry

This is the canonical registry of UI components documented by the project. Domain documents link here rather than maintaining separate component lists.

### Screen Components

The three screen components are mutually exclusive:

| Component | Screen | Guard |
|-----------|--------|-------|
| `BoardUI` | `board` | `if (!App.isBoard()) { hide; return; }` |
| `BooksUI` | `books` | `if (App.isBoard() || App.isEvents()) { hide; return; }` |
| `EventsUI` | `events` | `if (!App.isEvents()) { hide; return; }` |

`HeaderUI` shows or hides screen-specific toolbars via `data-screen-tools="board|books|events"`.

---

### Shared and Supporting Components

| Component | Purpose |
|-----------|---------|
| `HeaderUI` | Top bar, screen switching, night mode, menus, and screen-specific tools |
| `DragDrop` | Unified touch/mouse task and board drag-and-drop |
| `TaskUI` | Task rendering and task display/edit modes |
| `RanksUI` | Rank configuration editor; also used as a header mode |
| `FiltersUI` | Book/event filter panel; also used as a header mode |
| `ProgressUI` | Progress logging dialog |
| `ColumnHeaderUI` | Column header controls and menus |
| `EventStatsUI` | Event statistics and attention-balance views |

---

### Header-Mode Components

Activated via `State.headerUiMode` (rendered in header, not screen):

| Mode | Component | Responsibility |
|------|-----------|----------------|
| `boardsList` | `BoardsList` | Board selection and ordering |
| `ranks` | `RanksUI` | Rank configuration |
| `filters` | `FiltersUI` | Book/event filtering |
| `stats` | `HeaderStats` | Board counter and attention statistics |
| `renameBoard` | `RenameUI` | Board rename confirmation |
| `deleteBoard` | `DeleteUI` | Board deletion confirmation |
| `undoMove` | `UndoMoveUI` | Last-move undo confirmation |

---

## UI Component Rules

1. **Cached selectors in render** — Use `this.dom` instead of querying the document from a render method.
2. **Layer and coordination rules** — Follow the canonical [architectural rules](../architecture.md#architectural-rules).
3. **DOM handlers** — Declare ordinary component DOM handlers through the system in [`events-system.md`](events-system.md).