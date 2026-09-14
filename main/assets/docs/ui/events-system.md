# Declarative Event System

**See also**: [`../AGENTS.md`](../AGENTS.md) | [`../architecture.md`](../architecture.md) | [`components.md`](components.md)

---

## Overview

All DOM events are declared in **two places**:
1. **Central map** — `Events.js` (global, cross-component)
2. **Component-local** — `component.events` object (auto-merged at init)
Component-local system is a later development. Central map is a bit legacy. 
New components always store events map locally.

No manual `addEventListener` anywhere in components.

---

## Events.js Central Map (`Events.js`)

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

## Event Flow Diagram

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
       │
       ▼
Bus.emit('xxxChanged')
       │
       ▼
Batched render → DOM updated
```

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
- Order: Runs before specific selectors (but order not guaranteed)

---

## Supported Event Types

Defined by `Events.js` map keys + component `events`:
- `click` — Primary interaction
- `input` — Text input changes (ProgressUI form)
- `change` — Select/checkbox changes (FiltersUI)
- `touchstart` / `touchmove` / `touchend` — DragDrop (raw listeners in DragDrop.js)

---

## Key Invariants

1. **Single source of truth** — All handlers in `Events.js.map` + `component.events`
2. **No manual listeners** — Components never call `addEventListener`
3. **Namespace prefix** — Component-local handlers auto-prefixed (e.g., `'showProgress'` → `'BooksUI.showProgress'`)
4. **Params array** — Use `[handler, [param1, param2]]` for arguments
5. **Alias `@` only in component.events** — Central map uses raw selectors or `[Component.selectors.key]`