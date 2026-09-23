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

**The board is the base of the architecture; books are an extension layered on top.**
Colors originate from cards on a board, not from books. A color on a board means "this card
carries this color"; the mapping from that color to a *book* is a downstream formalization,
not the source of the color.

### Mental Model
1. **The user works with a board** and creates cards, assigning each card a color. Cards and
   their colors exist independently of anything in the Books domain.
2. **The user creates Book objects**, each claiming one color on one board  
   (`book: { board: 'board-id', color: 'blue' }`) — formalizing an *already existing*
   card-color convention into a named, trackable book.
3. **The user configures Ranks**, assigning each book's color to a priority level with a quota  
   (e.g., "I want *Nutshell Grammar* (blue) at Level 1 with quota 3")
4. **When a book is finished**, the user may reassign its color to a new book and adjust ranks accordingly

### Technical Binding
- `book.color` + `book.board` = unique identifier for a book on that board
- `BooksDomain.betBookByBoard(boardId, color)` — resolves which book a task/event belongs to
- `BooksDomain.getUnregisteredColorsForBoard(board)` — card colors on the board that no active
  book has claimed yet (see "Why a book can only claim card colors" below)
- Only one book per color per board (enforced by UI)

### Why a book can only claim card colors

A board is **agnostic of books**. When a user creates a card and assigns it a color, they work
only with the board; nothing in that flow consults the Books domain, and there is no signal
that a book of that color already exists. Cards therefore can never be gated by books.

Creating a book is the opposite: it *must* be bound to a board **and** a color. Because the
board and its cards are primary and books are downstream, the valid color set for a book is
derived from the cards already on that board — not from the palette directly.

> **Invariant** — a book may only claim a color that is already present as at least one card
> on its board, and that no other *active* book on that board has claimed. This is a hard
> architectural rule, enforced both by the Books UI (which only lists eligible colors) and by
> `BooksDomain.restoreBook()` (which rejects ineligible colors). It applies to creating,
> editing, and restoring books alike.

Consequences worth internalizing:

- **A palette-only color with no cards is unassignable.** "Green" being in `Colors.js` (or in
  the "free colors" list shown by the Ranks tool) does *not* make it selectable for a book;
  a green card must exist on the board first.
- **`getFreeColors()` is NOT the book-color list.** `BoardDomain.getFreeColors()` is a Ranks-tool
  view of palette colors with no board card; the book-assignable set is
  `BooksDomain.getUnregisteredColorsForBoard()` — see the [ownership map](#color-logic-ownership-map)
  below.

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
| `getColorsInUse(board)` — colors present as cards on a board (source of truth for book assignment) | `BoardDomain.js` — see [`boards.md`](boards.md) |
| `getFreeColors()` — palette colors with no card on the current board (Ranks-tool view, NOT book-assignable) | `BoardDomain.js` — see [`boards.md`](boards.md) |
| `getUnregisteredColorsForBoard(board)` — `getColorsInUse` minus colors claimed by active books; the only colors a book may claim | `BooksDomain.js` — see [`books.md`](books.md) |
| `betBookByBoard(boardId, color)` | `BooksDomain.js` — see [`books.md`](books.md) |
| `checkAndUpdateRanks(board, color)` (auto-append to lowest level) | `BoardDomain.js` — see [`boards.md`](boards.md) |
| Rank config (`board.ranks`) maps colors → level/quota | `BoardDomain.js` — see [`boards.md`](boards.md) |
| Color rendering in UI (badges, bars, dots) | UI components — see [`../ui/components.md`](../ui/components.md) |
