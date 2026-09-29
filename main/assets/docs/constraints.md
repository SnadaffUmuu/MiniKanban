# Constraints

**Related documentation**: [`architecture.md`](architecture.md)

---

## Runtime

Android WebView, API 21–28 (Android 5.0–9.0). No transpilation or bundling: code runs as written, and a syntax error the WebView does not understand breaks the whole app at load time. Scripts are ES modules loaded from `index.html`; no dynamic imports.

## Language baseline: ES7 (ES2016)

Avoid newer syntax and APIs in new or edited code:

| Avoid | Use instead |
|-------|-------------|
| `obj?.prop` | `obj && obj.prop` |
| `a ?? b`, `a ??= b` | `a != null ? a : b`, explicit `if` |
| `Array.flat` / `flatMap` | `[].concat.apply([], arr)` / `map` + `reduce` |
| `Object.fromEntries` | `reduce` |
| `Object.values` / `Object.entries` | `Object.keys(o).map(...)` |
| `async`/`await` | `Promise.then` |
| `padStart` / `padEnd` | manual padding |
| Object rest/spread (`{...o}`) | `Object.assign({}, o)` |
| Trailing comma in function parameter lists | omit |

Also: `let`/`const` only, semicolons required.

## Known drift (the code does not follow the baseline)

The table above is the target, not a description of the tree. Verify with `grep` before assuming a feature is safe or unsafe:

- `?.` appears in about a dozen files (`BooksUI.js`, `BooksDomain.js`, `EventsDomain.js`, `BoardDomain.js`, …).
- `Object.entries` / `Object.values` are used in `EventsDomain.js`, `BoardDomain.js`, `EventStatsUI.js`; object spread in `Utils.js`. (These are ES2017/ES2018; whether they work depends on the actual WebView version in use.)
- `??=` (ES2021) is used in `EventsDomain.js` (`getBoardDistribution`, `buildBoardAttentionBalance`). This is the most likely to break on an un-updated WebView; the true minimum WebView version is undecided.
- Trailing commas in object/array literals are common and harmless.

Rule for edits: do not introduce a *new* forbidden construct into a file that has none; when touching an existing one, either keep the file's convention or convert it.

## WebView quirks

- `queueMicrotask` is missing before API 25; `Bus.js` falls back to `Promise.resolve().then`.
- `Event.composedPath()` is unavailable: use `e.target` and `closest()`.
- CSS: no `aspect-ratio`, `clamp()`/`min()`/`max()` (API 29+); no `gap` on flexbox (use padding/margins); no CSS variables inside media queries.

## Adding a newer feature

Prefer an ES7 alternative. If a polyfill is small, put it in `Utils.js` and note it here.
