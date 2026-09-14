# Drag & Drop System

**See also**: [`../AGENTS.md`](../AGENTS.md) | [`../architecture.md`](../architecture.md) | [`components.md`](components.md) | [`domains/boards.md`](../domains/boards.md)

---

## Overview

`DragDrop.js` handles **2 drag types** with unified touch+mouse support:
- **Task drag** — Reorder within/between columns
- **Board drag** — Reorder boards in BoardsList modal

All use **long-press (400ms)** on touch, immediate on mouse.

---

## Core State

```javascript
longPressTimer: null,      // 400ms timeout
longPressTarget: null,     // Element that triggered long-press
dragState: null,           // Active drag info
colsScroll: {}             // Per-column vertical scroll preservation
```

---

## Touch + Mouse Unification

```javascript
// Get coordinates from either event type
const cursorX = event.clientX || (event.touches && event.changedTouches[0].clientX);
const cursorY = event.clientY || (event.touches && event.changedTouches[0].clientY);

// Passive: false for touchmove to allow preventDefault
document.addEventListener('touchmove', onMove, { passive: false });
document.addEventListener('mousemove', onMove);
```

---

## Task Drag

### Start (`taskTouchStart` / `mousedown` on task)
- 400ms long-press (touch) or immediate (mouse)
- Creates **clone** (absolute positioned, semi-transparent)
- Adds `dragged` class to original (hidden)
- Sets `dragState = { draggingTask: true, task, clone, column, ... }`
- Blocks text selection + context menu

### Move (`onMove`)
- Moves clone to cursor position
- **Auto-scroll**:
  - Horizontal: main container scrolls when cursor near left/right edge (60px margin, 7px/frame)
  - Vertical: column-body scrolls when cursor near top/bottom (60px margin)
- **Insert indicator**: Shows drop position between tasks in target column

### Drop (`dropTask`)
- Determines target column + insert index
- Calls `BoardDomain.moveTask(taskId, targetColumnId, insertIndex)`
- Emits `boardsChanged` → batched render
- Restores column vertical scroll positions

### Cancel (`onEnd`)
- Removes clone, restores original task visibility
- Clears `dragState`, re-enables text selection

---

## Board Drag (BoardsList)

- Long-press on board button in BoardsList modal
- Drag to reorder board buttons
- Drop → `BoardDomain.moveBoard(fromIndex, toIndex)`
- Emits `boardsChanged`

---

## Key Helpers

| Method | Purpose |
|--------|---------|
| `getColumnAtPoint(x)` | Hit-test column under cursor |
| `autoScrollColumns(x, y, currentColumn)` | Horizontal + vertical auto-scroll |
| `enableTextSelection(bool)` | `document.body.style.userSelect` |
| `blockContextMenuTemporarily()` | One-time contextmenu prevention |
| `restoreColsVertScroll()` | Restore per-column scrollTop after drag |
| `getDragAfterElement(container, x, y)` | Insert position in BoardsList |

---

## Touch-Specific Behaviors

1. **Long-press required** — Prevents accidental drag on scroll/tap
2. **`passive: false`** — Allows `preventDefault()` in touchmove for auto-scroll
3. **Context menu blocked** — One-time prevention during drag
4. **Text selection disabled** — `user-select: none` during drag

---

## Key Invariants

1. **Single drag at a time** — `dragState` is mutually exclusive
2. **Clone-based** — Original DOM stays in place until drop
3. **BoardDomain owns mutations** — DragDrop only calculates target, calls Domain
4. **Scroll preserved** — Per-column vertical scroll restored after drop
5. **No drag during edit/expand** — Checks `task.classList.contains('expanded')` or edit input focus