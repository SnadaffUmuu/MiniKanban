# Persistence & Storage

**See also**: [`../AGENTS.md`](../AGENTS.md) | [`../architecture.md`](./architecture.md) 

---

## Storage Abstraction (`Storage.js`)

The app uses two storage mechanisms:

1. **Android native** – when the `Android` object is available (i.e., the WebView runs on Android), the `loadData`, `loadBooks`, `loadEvents`, `saveData`, `saveBooks`, `saveEvents` methods call the corresponding native Java methods. These methods read/write files that are synchronized externally (e.g., via Syncthing). When no Android interface is present (e.g. running on desktop when developing) the same storage keys are read from `localStorage`. Data used in testing environment is never as long as that on production environment so localStorage limits don't apply.

2. **localStorage** – used for UI‑specific preferences (`kanbanLocal`) (both in no-Android environments and in WebView of Android)

Persistence is delegated in App.js

3. **Runtime** - UI states such as opened menus, dialogs, undo snapshots, are persisted via State object in memory

## Key Invariants

1. **Storage.js is the only persistence layer** — Components never call localStorage/Android directly
2. **App.js mediates all saves** — Domain methods call `App.saveData()` etc.