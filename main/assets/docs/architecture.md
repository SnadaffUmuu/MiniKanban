# Architecture Overview

**See also**: [`ui/components.md`](ui/components.md) | [`ui/events-system.md`](ui/events-system.md) | [`persistence.md`](persistence.md)

---

## Component Model

KanbanMvd uses a **UI + Domain separation** with components registered in `Components.js`. 

**Two component types**:
- **Screen components** — `BoardUI`, `BooksUI`, `EventsUI` (mutually exclusive via `App.getCurrentScreen()`)
- **Shared components** — `HeaderUI`, `DragDrop`, `TaskUI`, `RanksUI`, `FiltersUI`, etc. (active across screens)

**Domain components** (no UI, pure logic): `BoardDomain`, `BooksDomain`, `EventsDomain`, `Colors`, `Utils`.

---

## Event Bus (`Bus.js`)

Central pub/sub with **microtask batching**:

## Rendering Lifecycle

1. **Init** (`main.js`): `App.loadData()` → `App.loadLocal()` → `Events.init()` → `Components.forEach(init)` → `HeaderUI.render()` → screen-specific render
2. **State change**: User action → handler → mutates `State`/`App.data` → `Bus.emit(event)`
3. **Batched render**: Subscribed components' `render()` queued via `batchedMethod` → executes in single microtask
4. **After-render**: `State.afterRender` callbacks (DOM measurements, scroll positions) flushed after paint

**Critical**: Never call `render()` directly. Always emit Bus event. Use `State.afterRender.push(fn)` for post-render DOM work.

---

## Data Flow (Text Diagram)

```
User Action (click/touch)
       │
       ▼
Events.js handler → Component method
       │
       ▼
Mutate State (UI)  ──or──  Mutate App.data (Domain)
       │                       │
       ▼                       ▼
Bus.emit('xxxChanged')    App.saveData()/saveBooks()/saveEvents() + Bus.emit()
       │                       │
       └───────────┬───────────┘
                   ▼
         Batched render (microtask)
                   │
                   ▼
         Component.render() reads State + App.data
                   │
                   ▼
         DOM updated
                   │
                   ▼
         State.afterRender callbacks (scroll, focus)
```

---

## Screen Management

`App.screens = { board: 'board', books: 'books', events: 'events' }`

- `App.getCurrentScreen()` / `App.setScreen()` — persisted in `local.screen`
- HeaderUI renders active screen's title + tools
- Screen components guard: `if (!App.isBoard()) { this.dom.main.classList.add('hidden'); return; }`

---

## Initialization Order (main.js)

```javascript
App.loadData();        // Boards + counters
App.loadLocal();       // Screen, filter, nightMode from localStorage
Events.init();         // Wire all declarative events
Components.forEach(o => {
  Utils.cacheComponentDom(o);  // Cache selectors → dom
  o.init && o.init();          // Subscribe to Bus
});
HeaderUI.render();     // Sets up header for current screen
App.loadBooks();       // Load books
if (App.isBoard()) BoardUI.render();
else { App.loadEvents(); App.isEvents() ? EventsUI.render() : BooksUI.render(); }
```

---

## Key Invariants

- **No direct DOM manipulation outside render()** — only in `afterRender` callbacks
- **Components communicate exclusively via Bus events** — no direct method calls
- **Domain logic remains pure** — never touches DOM, only mutates State/App.data
- **ES7 syntax only** — no modern JavaScript features