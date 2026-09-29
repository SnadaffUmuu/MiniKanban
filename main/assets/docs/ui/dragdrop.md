# Drag & Drop

**Related**: [`../architecture.md`](../architecture.md) | [`events-system.md`](events-system.md)

`DragDrop.js` implements task drag (between/within columns) and board reordering (in the boards list) with one code path for touch and mouse. Read it for details; below is what is not obvious.

## Why it is built this way

- **Long-press on touch** (started by a timer) so that scrolling and tapping do not start a drag. Mouse starts immediately.
- **Clone-based**: the original element stays in the DOM until drop; a clone follows the pointer.
- **Raw listeners** are used instead of the delegated event system because a gesture needs `mousemove`/`touchmove`/`up` on `document` for its duration. `touchmove` must be registered with `{passive: false}` so auto-scroll can `preventDefault()`.
- Column vertical scroll positions are saved and restored around a drop because the re-render would otherwise reset them.

## Invariants

1. One drag at a time (`dragState`).
2. `DragDrop` only computes the target; the mutation is done by `BoardDomain` (`moveTask`, `reorder`), which then emits `boardsChanged`.
3. No drag starts on an expanded task or while a task is being edited.
4. Text selection and the context menu are suppressed during a drag and restored afterwards. Verify timings and margins in the source; they are tuning values, not contracts.
