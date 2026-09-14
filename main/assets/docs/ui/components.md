# UI Components Pattern

**See also**: [`../AGENTS.md`](../AGENTS.md) | [`../architecture.md`](../architecture.md) | [`events-system.md`](events-system.md) | [`dragdrop.md`](dragdrop.md)

---

## Component Structure

Every UI component in `components/` follows this pattern:

```javascript
export const ComponentName = {
  name: 'ComponentName',              // Required for Events.js wiring

  selectors: {                        // CSS selector map
    elementName: 'css-selector',      // Single element
    elementListName: 'css-selector',  // Multiple (suffix 'sss' → querySelectorAll)
  },

  dom: {},                            // Populated by Utils.cacheComponentDom()

  events: {                           // Declarative event bindings (optional) or directly after render is called
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
    // Pure function: reads State + App.data → writes DOM
    // Guard: if (!App.isRelevantScreen()) { hide; return; }
    // Use this.dom.cachedElement (never querySelector in render)
  },

  handlerMethod(el, event, params) { ... }
};
```

---

## Selector Caching

`Utils.cacheComponentDom(component)` called in `main.js` init:

```javascript
cacheComponentDom(component) {
  if (!component.dom) return;
  Object.keys(component.selectors).forEach(selector => {
    const isList = selector.endsWith('sss');
    const res = isList
      ? document.querySelectorAll(component.selectors[selector])
      : document.querySelector(component.selectors[selector]);
    if (res) component.dom[selector] = res;
  });
}
```

**Convention**: Suffix `sss` for lists (e.g., `viewContainersss`, `eventEntriesss`)

---

## Batched Rendering

```javascript
// In init():
Bus.batchedMethod(this, 'render');

// Internally (Bus.js):
batchedMethod(obj, methodName) {
  obj[methodName] = this.createBatched(obj[methodName].bind(obj));
}

createBatched(fn) {
  let scheduled = false;
  return function batched(...args) {
    if (scheduled) return;
    scheduled = true;
    scheduleMicrotask(() => { scheduled = false; fn.apply(this, args); });
  };
}
```

**Effect**: Multiple `Bus.emit('boardsChanged')` in same tick → single `render()` call.

---

## After-Render Queue

For DOM measurements (scroll, focus, dimensions) that need rendered DOM:

```javascript
// In handler:
State.afterRender.push(() => {
  const el = document.querySelector('.new-element');
  if (el) el.scrollIntoView();
});

// Flushed in BoardUI.render() (and others):
while (State.afterRender.length) {
  const effect = State.afterRender.shift();
  effect();
}
```

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

## Component Lifecycle

1. **Definition** — Export from `components/index.js`
2. **Registration** — Added to `Components` array in `Components.js`
3. **Init** (`main.js`) —
   - `Utils.cacheComponentDom()` — caches selectors
   - `component.init()` — subscribes to Bus events
4. **First render** — Triggered by `HeaderUI.render()` → screen-specific render
5. **Updates** — Bus events → batched `render()` → DOM mutations
6. **Cleanup** — None (SPA, no unmount)

---

## Screen Components (Mutually Exclusive)

| Component | Screen | Guard |
|-----------|--------|-------|
| `BoardUI` | `board` | `if (!App.isBoard()) { hide; return; }` |
| `BooksUI` | `books` | `if (App.isBoard() || App.isEvents()) { hide; return; }` |
| `EventsUI` | `events` | `if (!App.isEvents()) { hide; return; }` |

HeaderUI shows/hides screen-specific toolbars via `data-screen-tools="board|books|events"`.

---

## Shared Components (Cross-Screen)

| Component | Purpose | Key Events |
|-----------|---------|------------|
| `HeaderUI` | Top bar, screen switch, night mode, menus | `headerUIChanged`, `screenChanged` |
| `DragDrop` | Touch+mouse drag-drop | `boardsChanged`, `columnMoved` |
| `TaskUI` | Task rendering + modes | `taskUiChanged`, `boardsChanged` |
| `RanksUI` | Ranks editor | `ranksUiChanged`, `boardsChanged`, `headerUIChanged` |
| `FiltersUI` | Filter panel | `filtersChanged`, `headerUIChanged` |
| `ProgressUI` | Progress logging dialog | `progress`, `progressUiChanged` |
| `ColumnHeaderUI` | Column menus | `columnHeaderUIChanged`, `boardsChanged`, `columnMoved` |

---

## Modal Components (Header Modes)

Activated via `State.headerUiMode` (rendered in header, not screen):

| Mode | Component | Trigger |
|------|-----------|---------|
| `boardsList` | `BoardsList` | Boards button |
| `ranks` | `RanksUI` | Ranks button |
| `filters` | `FiltersUI` | Filters button |
| `stats` | `HeaderStats` | Menu → Show stats |
| `renameBoard` | `RenameUI` | Menu → Rename board |
| `deleteBoard` | `DeleteUI` | Menu → Delete board |
| `undoMove` | `UndoMoveUI` | Menu → Undo last move |

---

## Key Invariants

1. **Never querySelector in render()** — use `this.dom.cachedSelector`
2. **Never call render() directly** — emit Bus event