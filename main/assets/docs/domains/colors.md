# Colors Domain

**Related documentation**: [`books.md`](books.md) | [`boards.md`](boards.md) | [`events.md`](events.md) | [`../ui/components.md`](../ui/components.md)

---

## Color Palette (`Colors.js`)

Colors are the shared visual language of the application. Every color key appears in
three places — tasks, books, and ranks — which is why the palette and the
book-board-color binding are documented here, in one canonical place, rather than copied
across the domain documents.

`Colors.js` is the source of truth for the palette. A `color` field anywhere in the data model is
a key from that palette, never a raw CSS value.

UI code normally applies the key as a CSS class, never as an inline color. Code that needs a raw
theme-dependent shade, such as an SVG or gradient, must resolve the key through `getColorHex`.

---

## Book-Board-Color Binding

**The board is the base of the architecture; books are an extension layered on top.**
Colors originate from cards on a board, not from books. A color on a board means "this card
carries this color"; the mapping from that color to a *book* is a downstream formalization,
not the source of the color.

Cards and their colors exist independently of books. A book formalizes an existing card-color
convention into a named, trackable object; ranks then prioritize board colors independently of
whether those colors currently belong to books. A book's `board` + `color` is unique among active
books, allowing the color to be reassigned after archiving.

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

A palette-only color—or a color shown as "free" by the Ranks tool—is therefore not book-assignable
until a card uses it. The Ranks tool's free-color list and the set of colors available to books have
different meanings and must not be interchanged.

Ranks are a priority overlay on board colors, independent of book assignment. Their counter and
color-placement rules are canonical in [`ranks.md`](ranks.md).
