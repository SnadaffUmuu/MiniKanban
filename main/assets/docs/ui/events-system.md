# Declarative DOM Events

**Related**: [`../architecture.md`](../architecture.md) | [`components.md`](components.md) | [`dragdrop.md`](dragdrop.md)

Handlers come from two sources merged by `Events.init()` into one map, with one document-level listener per event type (read `Events.js`, ~330 lines):

1. **`component.events`**: the required place for all new handlers.
2. **The legacy central map in `Events.js`**: older cross-component declarations. Do not add to it.

## Non-obvious rules

- `'@alias'` keys resolve to `component.selectors[alias]` and are valid **only** in `component.events`. The central map uses raw selectors.
- Component-local handler names are auto-prefixed with the component name (`'showProgress'` → `'BooksUI.showProgress'`). A central-map handler must use a namespace registered in `Events.namespaces`, otherwise it fails at dispatch time.
- Matching uses `e.target.matches(selector)`, i.e. the **exact** clicked element, not `closest()`. Clicks on a child of the selector target do not match; design selectors accordingly.
- `'##'` runs on every event of that type. No ordering between `'##'` and specific handlers is guaranteed; do not depend on it.
- Parameters: `[handler, [p1, p2]]`; the handler receives `(el, event, params)`.
- Exception: `DragDrop.js` attaches temporary raw touch/mouse listeners for the duration of a gesture ([`dragdrop.md`](dragdrop.md)).
