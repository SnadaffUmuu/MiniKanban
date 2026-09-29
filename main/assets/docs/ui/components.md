# UI Components

**Related**: [`../architecture.md`](../architecture.md) | [`events-system.md`](events-system.md) | [`dragdrop.md`](dragdrop.md)

The component shape is uniform: read any small one (e.g. `UndoMoveUI.js`, `DeleteUI.js`) as a template. Only the non-obvious conventions are listed here.

## Conventions

- `name` is required: `Events.js` uses it to prefix component-local handlers.
- `selectors` are cached once at startup into `this.dom` (`Utils.cacheComponentDom`). A key ending in `sss` is cached with `querySelectorAll`, others with `querySelector`. Renderers use `this.dom`, never `querySelector`.
- A rendering component calls `Bus.batchedMethod(this, 'render')` in `init()` **before** subscribing `render` to Bus events; otherwise the subscription holds the unbatched function.
- DOM work that needs the rendered result goes into `State.afterRender.push(cb)`.
- Ordinary updates emit Bus events; they do not call renderers ([architecture](../architecture.md#update-lifecycle)).
- DOM handlers are declared in the component's `events` map ([`events-system.md`](events-system.md)).

## Screen vs header-mode components

- **Screens** (mutually exclusive): `BoardUI`, `BooksUI`, `EventsUI`. `HeaderUI` toggles toolbars with `data-screen-tools="board|books|events"`.
- **Header modes** are selected by `State.headerUiMode` and rendered in the header, not on a screen. The mapping from mode name to component is in `HeaderUI.js` and the component files; `FiltersUI` and `RanksUI` are also used outside the header. `HeaderStats` shows real-vs-ideal board balance derived from events ([`domains/boards.md`](domains/boards.md#boards-balance)).

The page-cloud controls of `BooksUI` are described in [`domains/books.md`](domains/books.md#page-cloud).
