# Architecture Overview

**Related documentation**: [`ui/components.md`](ui/components.md) | [`ui/events-system.md`](ui/events-system.md) | [`persistence.md`](persistence.md) | [`constraints.md`](constraints.md)

---

## System Model

KanbanMvd is an Android WebView application with a UI layer, pure domain logic, shared application state, and a persistence boundary.

- UI components are registered through `Components.js`. Their canonical registry is [`ui/components.md`](ui/components.md).
- Board, book, and event rules are owned by the corresponding documents under [`domains/`](domains/boards.md).
- `State.js` owns transient UI state.
- `App.js` owns loaded application data, current-screen state, and persistence coordination.
- `Storage.js` provides the native Android/localStorage boundary described in [`persistence.md`](persistence.md).

Domain logic may mutate domain data but does not access the DOM. UI handlers call domain operations and publish resulting changes rather than duplicating domain rules.

---

## Interaction Systems: `Events.js` and `Bus.js`

The two event-related modules have distinct directions and responsibilities:

| Module | Direction | Responsibility |
|--------|-----------|----------------|
| `Events.js` | DOM → application | Delegates browser DOM events and dispatches a matching UI handler. Its map format and exceptions are specified in [`ui/events-system.md`](ui/events-system.md). |
| `Bus.js` | application → subscribers | Publishes named application changes. Subscribers use those notifications to coordinate updates; render subscribers are microtask-batched. |

`Events.js` resolving and invoking the handler selected by its declarative map is framework dispatch, not one UI component imperatively calling a peer component. Outside framework dispatch and startup coordination, UI components do not invoke methods on peer UI components; they publish Bus events.

---

## Application Startup

Startup is coordinated by `main.js` in this order:

1. Load board data through `App.loadData()`.
2. Load local UI preferences through `App.loadLocal()`.
3. Initialize delegated DOM events through `Events.init()`.
4. For each registered component, cache its declared DOM selectors and run its optional `init()` method.
5. Perform the explicit initial header render.
6. Load book data.
7. Perform the explicit initial render for the selected screen, loading event data first when required by that screen.

The explicit renders in steps 5 and 7 are startup coordination. During normal updates, handlers publish Bus events instead of calling render methods directly.

---

## Update and Rendering Lifecycle

1. A user action is dispatched by `Events.js` to a UI handler.
2. The handler changes transient `State` or invokes domain logic that changes application data.
3. Persistent domain changes are saved through `App.js` as described in [`persistence.md`](persistence.md).
4. The handler or domain operation emits the relevant Bus event.
5. Subscribed render methods are coalesced into a single microtask per batched method.
6. Each renderer reads current state/data and updates its cached DOM nodes.
7. A relevant renderer drains queued `State.afterRender` callbacks after its DOM updates. This queue does not, by itself, guarantee execution after a browser paint.

```text
DOM event
   ↓
Events.js dispatch → UI handler → State/domain mutation → App save when persistent
                                           ↓
                                      Bus publication
                                           ↓
                                  batched subscribed render
                                           ↓
                                DOM update → afterRender queue
```

---

## Screen Management

`App.getCurrentScreen()` returns the selected screen and `App.setScreen()` changes it. The selection is persisted in `local.screen`. Exactly one screen component is relevant at a time; the canonical component-to-screen mapping and guard conditions are in [`ui/components.md`](ui/components.md#screen-components).

---

## Architectural Rules

1. **Layer boundary** — Domain logic does not read or write the DOM.
2. **Peer coordination** — UI peers coordinate through Bus publications, not imperative peer method calls. Declarative DOM dispatch and startup coordination are the explicit exceptions described above.
3. **Normal rendering** — Do not call render methods directly during ordinary state updates; publish the appropriate Bus event.
4. **Runtime compatibility** — Language and platform requirements are owned by [`constraints.md`](constraints.md).