# 046: Board feel (pinned animal cards, then the deductions come alive)

On `main`, over 044/045. Written 2026-10-14/15. Steps 1–2 built 2026-10-15 (uncommitted); steps 3–4 next.

## Problem

Player feedback: the round photo tiles are mistaken for gems, so players try to move them. A tile was a cream disc with a picture, the same size and slot as the orange ball gem with its emoji. A swipe on a tile then counted as a tap and picked the animal (blue pulsing ring), which looked like "gem picked, now swap". A gem swiped into a tile only told the screen reader. Owner rejected 3D totems (a column of stuff means nothing here); picked a card.

Owner decisions 2026-10-15 (prototype https://claude.ai/artifact/REyA4s853PoCm9nUxZAfSZ): number in the polaroid strip; the same card in the grid, field guide and round-end card; the mystery is an empty camera-trap card while playing (a photo, even blurred, lets a player match it to a suspect without reading a clue).

## 1. Nudge (built)

A try at moving a card wiggles it on its pin (no move spent, no pick): swipe a card; swipe a gem into one (the gem bumps back); tap a gem, then the card next to it; Shift+arrow into one ("Pinned in place: <name>" for screen readers). The first nudge each round says "📌 Animals are pinned in place. Swap the gems around them." in the status line. `sfx.pinned()`. Event `clue-board-nudge`.

## 2. The card (built)

`BoardView.drawTile`: one container at the pin (paper, photo cropped with `setCrop`, no mask; number in Patrick Hand on the strip; marker cross; pin; scouting strip), 1.08 × 1.06 cells, tilted by number (`CARD_TILTS`). States are pins and paper, never a ring (an amber ring matched the gem cursor): picked = paper pulses blue; ruled out = red cross + grey photo (`preFX` colour matrix, WebGL); release preview = pin pops up, card hangs and sways; released = pin flies out, card flutters off. Page: `AnimalCard` / `TrapCard` (`AnimalCard.tsx`, `.animal-card` in globals.css).

## 3. Tiles react (next)

Neutral peek when scouted (same for yes and no; hop/shake would read as right/wrong); release exits by how the animal moves (fly / swim / walk, from its record); the escaped mystery bolts off with 💨 before the loss card.

## 4. The mystery's answers come alive (next)

When an order completes, the page sends the tag and answer; on yes, a cheap emoji effect: `diet:insects` 🐜 march, `activity:night` dusk, `birth:eggs` 🥚 drop, `system:marine`/`freshwater` ripple, `covering:spines` quills. 4–6 effects, still under reduced motion. Only the mystery's own earned answer, so it points and never concludes.
