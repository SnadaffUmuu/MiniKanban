# Colors Domain

**Related documentation**: [`books.md`](books.md) | [`boards.md`](boards.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md)

---

## Color Palette (`Colors.js`)

Colors are the shared visual language of the application. Every color key appears in
three places — tasks, books, and ranks — which is why the palette and the
book-board-color binding are documented here, in one canonical place, rather than copied
across the domain documents.

The canonical palette lives in `Colors.js` (key → `{light, dark}` hex pair). `getColorsStyleHtml()`
generates `--card-<key>` variables for `:root` and `body.night` plus one `.colorkey` class per entry.
**That file is the source of truth for the current list.** The invariant that matters:

> A `color` field anywhere in the data model **is a key from `Colors.js`**, never a raw CSS
> value. See [`Task.color`](boards.md) and [`book.color`](books.md).

**Rendering rule:** UI code applies a color by adding the color key as a CSS class
(`class="blue"`), never via inline `style="background…"`. The generated classes use
`!important`, so they win over component CSS. Exceptions that need a raw hex/computed value:
the book tree SVG (`BooksUI.js`) and the column-gradient progress segments. A key names a hue, not a
shade: the hex depends on the theme, so such code must use `getColorHex(key)` (never read
`Colors[key]` as a string) and is not re-rendered when the theme is toggled.
For dropdowns, use `BooksUI.setColorsDropdownColor`, which swaps the class.

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
- **`getFreeColors()` is NOT the book-color list.** It is a Ranks-tool view of palette colors with no board card; the book-assignable set is `BooksDomain.getUnregisteredColorsForBoard()`.

### Rank Relationship (Secondary)
Ranks are a priority overlay on board colors, independent of book assignment. Their ownership,
counter semantics, and color-placement rules are canonical in [`ranks.md`](ranks.md).

---

## Where things live

- Palette and CSS class generation: `Colors.js`.
- `getColorsInUse` (card colors; source of truth) and `getFreeColors` (Ranks-tool view only, **not** book-assignable): `BoardDomain.js`.
- `getUnregisteredColorsForBoard`, `betBookByBoard`: `BooksDomain.js`.
- Rank color placement: `RanksDomain.js` ([`ranks.md`](ranks.md)).
