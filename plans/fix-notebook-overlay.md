# Fix: Field Notebook buries the game board

Bug (playtest screenshot): `FieldNotebook` renders permanently expanded (`max-h-[54vh]`)
inside `#phaser-game-wrapper`, and it renders one row per LOCKED clue (~17 rows), so the
sheet sits at max height and covers the whole Phaser board. Board is visible only blurred
behind the glass panel. Unplayable during matching.

Edit `src/components/FieldNotebook.tsx` only (unless typecheck forces otherwise).

1. **Collapsed by default.** Collapsed state = slim handle bar pinned to the bottom
   (single row, ~40px): `FIELD NOTEBOOK` label + `{revealed} clues · {candidates} candidates`
   + chevron-up. Entire bar is a button that expands. Collapsed bar must NOT cover the
   board: no tall glass panel, no content below the bar.
2. **Expanded state** = the current 3-column layout, keep `max-h-[54vh]` + scroll. Add a
   collapse control (chevron-down) in the existing header row. Expanding to think is fine —
   covering the board is only a bug while the player is matching.
3. **Compact locked clues.** Do NOT render one `ClueRow` per locked clue. Render revealed
   clues as rows (keep current ClueRow for those), then ONE compact line after them:
   `{lockedCount} clues locked — match gems to reveal`. Delete the locked branch usage from
   the list (the locked variant inside ClueRow can go too if now unused).
4. **New-clue feedback while collapsed.** When `processedClues.length` increases and the
   sheet is collapsed: show the newest clue's label inside the collapsed bar for ~4s (then
   revert to the counts) and pulse the bar border (CSS animation, no lib). No auto-expand —
   EXCEPT auto-expand once on the very first revealed clue of a run (teaches the notebook
   exists), never again that run (track with a ref/state keyed to the run, reset when
   `comparativeDeduction` identity changes).
5. Suspects/guess columns only render when expanded (they're inside the expanded panel, so
   this falls out naturally — just confirm nothing interactive leaks into collapsed state).
6. **Drive-by fix:** line ~93 `comp.mysteryClues.sort(...)` mutates the props array —
   sort a copy (`[...comp.mysteryClues].sort(...)`).

Gate: `npm run typecheck` clean, then commit as
`fix: collapse field notebook to bottom sheet`.
