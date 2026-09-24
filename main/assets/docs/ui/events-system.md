# Declarative DOM Event System

**Related documentation**: [`../architecture.md`](../architecture.md) | [`components.md`](components.md) | [`dragdrop.md`](dragdrop.md)

---

## Overview

Ordinary UI DOM events use delegated declarations from two sources:

1. **Component-local maps** — A component's `events` object. This is the required location for new component handlers.
2. **Legacy central map** — `Events.js` retains global and older cross-component declarations.

`Events.init()` merges both declaration sources into one runtime map and attaches a document listener for each delegated event type. Drag-and-drop is the documented exception: `DragDrop.js` installs temporary raw touch/mouse listeners required by an active gesture; see [`dragdrop.md`](dragdrop.md).

---

## Legacy Central Map (`Events.js`)

```javascript
export const Events = {
  namespaces: {
    'HeaderUI': HeaderUI,
    'BoardUI': BoardUI,
    // ... all components
  },

  map: {
    click: {
      '##': ['HeaderUI.hideMenu'],  // Global catch-all

      // Selector → handler (string or [handler, params])
      [HeaderUI.selectors.changeHeaderModeTriggers]: 'HeaderUI.changeMode',
      [RenameUI.selectors.confirmRenameButton]: 'RenameUI.renameBoard',

      // Array of handlers for same selector
      [ColumnHeaderUI.selectors.moveColumnRightButton]: [
        'ColumnHeaderUI.moveColumn', [true]
      ],
    },
    // ... other event types: input, change, etc.
  },

  init() {
    // 1. Normalize map (convert strings to arrays, add namespace prefix)
    // 2. Merge component.events into map
    // 3. Attach document listeners for each event type
  }
};
```

---

## Handler Resolution

A map entry names its handler as `'Namespace.method'`. On dispatch, `Events.js` splits the
path, looks the namespace up in `namespaces`, and invokes the method with the namespace as
`this`, passing `(targetElement, event, params)`. A handler that does not resolve fails at
dispatch time, so the namespace key must exist.

**Dispatch contract** (`Events.js` — source of truth):

- For each selector in `this.map[eventName]`, the entry runs when the selector is `##` **or**
  `e.target.matches(selector)`.
- Each matching entry invokes every callback in its (normalized) array as
  `fn.call(ctx, e.target, e, params)`.

---

## Component-Local Events (`component.events`)

Components declare their own events (merged at `Events.init()`). This is the **required**
location for new component handlers. Example shape (`BooksUI.js`):

```javascript
events: {
  click: {
    '##': 'hideProgress',
    '@progressBar': 'showProgress',      // @alias → this.selectors.progressBar
    '@progressBarSegment': 'showProgress',
    '@bookNameCell': 'seeBook',
    '@switchToBooksButton': 'switchToBooks',
  }
}
```

**Alias syntax**: `@selectorKey` → resolved via `component.selectors[selectorKey]`

**Merging contract** (`Events.js`): at startup, for every registered component and every
declared event type, the component-local selector is resolved to a real CSS selector and the
handler is prefixed with the component name (`'showProgress'` → `'BooksUI.showProgress'`),
then merged into the runtime map. `Events.js` is the source of truth for the exact merge.

---

## Selector Types

| Syntax | Example | Resolves To |
|--------|---------|-------------|
| Raw CSS | `'button.save'` | `document.querySelectorAll('button.save')` |
| Alias | `'@saveButton'` | `component.selectors.saveButton` |
| Global | `'##'` | Matches any click (catch-all) |

---

## Dispatch Flow

```
User clicks element
       │
       ▼
document.click listener (Events.js)
       │
       ▼
Events.handler(e, 'click')
       │
       ├──► selector === '##' → run all global handlers
       │
       ├──► e.target.matches(selector) → run matched handlers
       │
       ▼
resolveMethod('ComponentName.handler')
       │
       ▼
handler.call(ComponentName, targetEl, event, params)
       │
       ▼
Component mutates State / App.data
```

Subsequent save, Bus publication, and rendering behavior is owned by the [architecture lifecycle](../architecture.md#update-and-rendering-lifecycle).

---

## Parameter Passing

```javascript
// In map: [handler, paramsArray]
[ColumnHeaderUI.selectors.moveColumnRightButton]: [
  'ColumnHeaderUI.moveColumn', [true]  // doMoveRight = true
]

// Handler receives:
moveColumn(el, e, [doMoveRight]) {
  // doMoveRight = true
}
```

---

## Global Catch-All (`##`)

- Runs on **every click** (and other event types if defined)
- No relative execution order between catch-all and selector-specific handlers is part of the event-system contract. Handlers must not depend on it.

---

## Event Types

The delegated system installs listeners for event types present in the merged map. Common declarations are `click`, `input`, and `change`. Raw gesture event handling belongs exclusively to the drag-and-drop exception documented in [`dragdrop.md`](dragdrop.md).

---

## DOM Event Rules

1. **New declarations are local** — Add a new component's ordinary DOM handlers to `component.events`, not the legacy central map.
2. **Raw-listener exception** — Only the drag-and-drop gesture lifecycle bypasses delegated declarations.
3. **Namespace prefix** — Component-local handlers are automatically prefixed (for example, `'showProgress'` becomes `'BooksUI.showProgress'`).
4. **Parameter format** — Use `[handler, [param1, param2]]` when a declaration passes arguments.
5. **Alias scope** — `@selectorKey` is valid only in `component.events`; the central map uses a raw selector or a computed component selector.