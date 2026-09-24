# Constraints & ES7 Compliance

**Related documentation**: [`architecture.md`](architecture.md)

---

## JavaScript Version: ES7 (ES2016) Maximum

**Runtime**: Android WebView (API 21-28, Android 5.0-9.0)
- No transpilation/bundling — code runs directly
- Syntax errors = runtime crashes in production

---

## ❌ Forbidden Language Features and APIs

| Feature | Example | Supported alternative |
|---------|---------|-----------------|
| Optional chaining | `obj?.prop` | `obj && obj.prop` — see note below |
| Nullish coalescing | `a ?? b` | `a != null ? a : b` |
| `Array.flat()` | `arr.flat()` | `[].concat.apply([], arr)` |
| `Array.flatMap()` | `arr.flatMap(f)` | `arr.map(f).reduce((a,b)=>a.concat(b),[])` |
| `Object.fromEntries()` | `Object.fromEntries(arr)` | `arr.reduce((o,[k,v])=>(o[k]=v,o),{})` |
| `Object.values()` | `Object.values(obj)` | `Object.keys(obj).map(k=>obj[k])` |
| `Object.entries()` | `Object.entries(obj)` | `Object.keys(obj).map(k=>[k,obj[k]])` |
| Trailing commas in params | `fn(a, b,)` | `fn(a, b)` |
| Async/await | `await fn()` | `fn().then(...)` |
| `String.padStart/End` | `s.padStart(2,'0')` | Manual padding |
| Object rest/spread | `{...obj}`, `{a, ...rest}` | `Object.assign({}, obj)`, explicit property selection |

> **Note on optional chaining (known inconsistency).** The existing codebase *does* use
> optional chaining (`?.`) in a number of files (`BooksDomain.js`, `BooksUI.js`, `BoardDomain.js`,
> `EventsDomain.js`, and others). So this row is aspirational rather than a description of the
> current code: the baseline forbids it for maximum WebView compatibility, but the tree has not
> been fully migrated. For **new or edited** code, prefer `obj && obj.prop`. If you are touching a
> line that already uses `?.`, either keep the file's existing convention or convert it as part of
> the change — do not introduce *new* optional chaining into files that don't use it.

---

## ✅ Allowed by the Project Baseline

- `let` / `const`
- Arrow functions: `() => {}`
- Template literals: `` `text ${var}` ``
- Destructuring: `const {a, b} = obj`
- Array spread: `[...arr]`
- Default parameters: `fn(a = 1) {}`
- Rest parameters: `fn(...args) {}`
- `Array.find` / `findIndex`
- `Array.includes`
- `Array.from`
- `Object.assign`
- `Promise` (native in API 21+)
- `Map` / `Set` / `WeakMap` / `WeakSet`
- `Symbol`
- `class` syntax
- `for...of` loops
- Exponentiation: `2 ** 3`

---

## WebView-Specific Quirks

| Issue | Workaround |
|-------|------------|
| No `queueMicrotask` (API < 25) | `Promise.resolve().then(cb)` fallback in `Bus.js` |
| `Event.composedPath()` missing | Use `e.target` + `closest()` |
| `element.closest()` polyfill needed? | Native in API 21+ ✅ |
| `element.remove()` missing? | Native in API 21+ ✅ |
| `NodeList.forEach` missing? | `[...list].forEach.call(fn)` |

---

## CSS Constraints

- **No CSS custom properties in media queries** — Use JS for dynamic themes
- **Flexbox/Grid** — Supported in API 21+
- **`aspect-ratio`** — API 29+ only (use padding hack if needed)
- **`clamp()`/`min()`/`max()`** — API 29+ only
- **No gap in flex** - Use paddings

---

## Code Style Rules

1. **No trailing commas** in function params/arrays/objects
2. **Semicolons required** — ASI unreliable in old WebView
3. **`var` avoided** — Use `let`/`const`
4. **Avoid optional chaining in new code** — Prefer `obj && obj.prop` (see the note on the
   forbidden-features table: the existing tree still uses `?.` in places)
5. **Error handling** — Always `try/catch` around Storage/Android calls
6. **No dynamic imports** — All scripts loaded via `<script type="module">` in index.html

---

## Migration Note

If you need a newer feature:
1. Check if polyfill is small (e.g., `Array.from` polyfill ~20 lines)
2. Add to `Utils.js`
3. Document in this file
4. Prefer native ES7 alternative