# Colors Domain

**Related documentation**: [`books.md`](books.md) | [`boards.md`](boards.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md)

---

## Color Palette (`Colors.js`)

Colors are the shared visual language of the application. Every color key appears in
three places — tasks, books, and ranks — which is why the palette and the
book-board-color binding are documented here, in one canonical place, rather than copied
across the domain documents.

```javascript
// Colors.js — the canonical palette (key → hex value)
export const Colors = {
  peach: "#FFE2CC",
  pink: "#FFD0D0",
  plum: "#FAC7ED",
  purple: "#DFCFEF",
  blue: "#DBF6FF",
  teal: "#c9fde2",
  green: "#DFF6A7",
  olive: "#E6EAD6",
  yellow: "#FFFFB3",
  white: "#FFFFFF",
  beige: "#e5d9d6",
};

export const getColorsStyleHtml = () => {
  // Generates a `<style>` block defining one CSS class per color key
  // (`.peach { background-color:#FFE2CC !important; }`, etc.)
};
```

A `color` field anywhere in the data model **is a key from `Colors.js`**, not a raw CSS
value. See [`Task.color`](boards.md) and [`book.color`](books.md).

---

## Book-Board-Color Binding

**A color represents a specific book on a specific reading board.** This is the primary
meaning — not UI decoration, not rank hierarchy.

### Mental Model
1. **User creates tasks** on a reading board, informally using colors as book identifiers  
   (e.g., "blue = *Nutshell Grammar*, pink = *Kanji Guide*")
2. **User creates Book objects**, each claiming one color on one board  
   (`book: { board: 'board-id', color: 'blue' }`) — formalizing the mapping
3. **User configures Ranks**, assigning each book's color to a priority level with a quota  
   (e.g., "I want *Nutshell Grammar* (blue) at Level 1 with quota 3")
4. **When a book is finished**, the user may reassign its color to a new book and adjust ranks accordingly

### Technical Binding
- `book.color` + `book.board` = unique identifier for a book on that board
- `BooksDomain.betBookByBoard(boardId, color)` — resolves which book a task/event belongs to
- `BooksDomain.getUnregisteredColorsForBoard(board)` — colors used in tasks but not yet claimed by a book
- Only one book per color per board (enforced by UI)

### Rank Relationship (Secondary)
Ranks are a **priority overlay** on top of the book-color mapping. The rank system is
owned by the [Board domain](boards.md#ranks-system); the color facts are:
- `board.ranks` maps colors → level + quota
- Colors not mentioned in ranks config are auto-appended to the lowest level (`BoardDomain.checkAndUpdateRanks()`)
- Rank algorithm (`commitBalance()`) operates on levels, but levels are populated by book colors
- Statistics (attention balance, board distribution) are computed per color = per book

### What This Enables
- Progress bars colored by book (not by rank level)
- Events UI: calendar dots / list bars colored by book
- EventStatsUI: attention balance per book (via its color)
- Task rank badges (Level, Pass mark) derived from the book's assigned level

---

## Color Logic: Ownership Map

The binding above is cross-domain; its implementation lives in two domain modules. This
table records *where* each color behavior is owned so no document duplicates it:

| Behavior | Owned by |
|----------|----------|
| Palette + CSS class generation | `Colors.js` |
| `getColorsInUse(board)` / `getFreeColors()` | `BoardDomain.js` — see [`boards.md`](boards.md) |
| `getUnregisteredColorsForBoard(board)` | `BooksDomain.js` — see [`books.md`](books.md) |
| `betBookByBoard(boardId, color)` | `BooksDomain.js` — see [`books.md`](books.md) |
| `checkAndUpdateRanks(board, color)` (auto-append to lowest level) | `BoardDomain.js` — see [`boards.md`](boards.md) |
| Rank config (`board.ranks`) maps colors → level/quota | `BoardDomain.js` — see [`boards.md`](boards.md) |
| Color rendering in UI (badges, bars, dots) | UI components — see [`../ui/components.md`](../ui/components.md) |
