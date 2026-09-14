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

```javascript
// 'Namespace.method' → { ctx: Namespace, fn: Namespace.method }
resolveMethod(methodPath) {
  const [nsName, methodName] = methodPath.split('.');
  const ns = this.namespaces[nsName];
  return { ctx: ns, fn: ns[methodName] };
}

// Called on event:
handler(e, eventName) {
  Object.keys(this.map[eventName]).forEach(selector => {
    const callbacks = this.map[eventName][selector];
    const shouldRun = selector === '##' || e.target.matches(selector);
    if (!shouldRun) return;

    callbacks.forEach(([methodPath, params]) => {
      const resolved = this.resolveMethod(methodPath);
      resolved.fn.call(resolved.ctx, e.target, e, params);
    });
  });
}
```

---

## Component-Local Events (`component.events`)

Components declare their own events (merged at `Events.init()`):

```javascript
// BooksUI.js
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

**Merging** (`Events.js`):
```javascript
Components.forEach(component => {
  Object.keys(component.events).forEach(eventName => {
    Object.keys(component.events[eventName]).forEach(selectorKey => {
      const realSelector = this.resolveSelector(selectorKey, component);
      const value = addNamespace(rawValue, component);  // Prefixes 'ComponentName.'
      this.mergeMaps(this.map, { [eventName]: { [realSelector]: value } });
    });
  });
});
```

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