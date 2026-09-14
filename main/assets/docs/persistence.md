# Persistence & Storage

**Related documentation**: [`architecture.md`](architecture.md)

---

## Persistence Layers

`App.js` coordinates data loading and saving. `Storage.js` is the only boundary that directly accesses an Android native interface or `localStorage`; components and domain modules do not access either storage mechanism directly.

For domain data, `Storage.js` uses the Android interface when it is available. Native methods read and write device files that may be synchronized externally. In a non-Android development environment, the same logical data sets fall back to `localStorage`.

UI preferences always use `localStorage`, including inside the Android WebView.

---

## Canonical Storage Registry

| Storage key | Contents | Backing mechanism |
|-------------|----------|-------------------|
| `kanbanAppData` | Boards and board counters | Android file, or `localStorage` fallback |
| `kanbanBooks` | Books and progress ranges | Android file, or `localStorage` fallback |
| `kanbanEvents` | Reading-move event log | Android file, or `localStorage` fallback |
| `kanbanLocal` | Screen, filters, night mode, and other UI preferences | `localStorage` |

These key names and ownership assignments are defined only here. Other documents should refer to the relevant data set rather than repeat a key.

---

## Save Boundary

Domain operations request persistence through the corresponding `App.js` save method. `App.js` delegates the storage operation to `Storage.js`.

Calls across the Android/storage boundary require `try/catch`, as specified in [`constraints.md`](constraints.md#code-style-rules).

---

## Non-Persistent Runtime State

Open menus, dialog modes, drafts, queued after-render work, and undo snapshots live in the in-memory `State` object. They are not part of the storage registry above.