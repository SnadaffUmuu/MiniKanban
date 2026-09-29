# Architecture

**Related**: [`ui/components.md`](ui/components.md) | [`ui/events-system.md`](ui/events-system.md) | [`persistence.md`](persistence.md) | [`constraints.md`](constraints.md)

## Layers

- **UI components** (`*UI.js`, registered in `Components.js`) render and handle DOM events.
- **Domain modules** (`BoardDomain`, `RanksDomain`, `BooksDomain`, `EventsDomain`) hold the rules. They may mutate data but never touch the DOM.
- **`State.js`** is transient UI state (menus, drafts, undo snapshots). It is never persisted.
- **`App.js`** owns loaded data, the current screen, and save coordination. **`Storage.js`** is the only persistence boundary ([`persistence.md`](persistence.md)).

## Two event systems, opposite directions

- `Events.js`: DOM → application (delegated listeners → component handler). See [`ui/events-system.md`](ui/events-system.md).
- `Bus.js`: application → subscribers (named change notifications). Render methods wrapped with `Bus.batchedMethod` are coalesced per microtask.

Why: components must stay decoupled. `Events.js` calling a handler from its declarative map is framework dispatch, not a component calling a peer. Apart from that and startup, a component never calls a peer's methods; it emits a Bus event.

## Update lifecycle

DOM event → handler → change `State` or call domain op → domain/`App` saves if persistent → emit Bus event → batched renderers re-read state and update cached DOM → queued `State.afterRender` callbacks run.

`afterRender` runs after a renderer's DOM update, **not** after a browser paint.

## Startup

`main.js` (short; read it) loads data, initializes `Events`, caches each component's selectors and calls its `init()`, then does explicit initial renders. Those explicit renders are the only sanctioned direct render calls; afterwards, emit Bus events.

## Screens

Exactly one of `BoardUI` / `BooksUI` / `EventsUI` is visible, chosen by `App.getCurrentScreen()` (persisted as `local.screen`). Each screen component hides itself in `render()` via `App.isBoard()` / `App.isEvents()` guards.

## Rules

1. Domain code never reads or writes the DOM.
2. UI peers coordinate through Bus, not method calls.
3. Do not call render methods directly for ordinary updates; emit the Bus event.
4. Language limits: [`constraints.md`](constraints.md).
