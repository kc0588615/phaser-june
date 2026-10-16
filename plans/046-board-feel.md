# 046: Board feel (pinned animal cards, then the deductions come alive)

On `main`, over 044/045. Written 2026-10-14/15. Steps 1–2 built 2026-10-15 (0c141511), step 3 built 2026-10-15 (0169af87, deployed with 1–2); step 4 built 2026-10-15.

## Problem

Player feedback: the round photo tiles are mistaken for gems, so players try to move them. A tile was a cream disc with a picture, the same size and slot as the orange ball gem with its emoji. A swipe on a tile then counted as a tap and picked the animal (blue pulsing ring), which looked like "gem picked, now swap". A gem swiped into a tile only told the screen reader. Owner rejected 3D totems (a column of stuff means nothing here); picked a card.

Owner decisions 2026-10-15 (prototype https://claude.ai/artifact/REyA4s853PoCm9nUxZAfSZ): number in the polaroid strip (changed same day: number on a paper tag at the photo's top right, photo grows into the strip's space; the strip took too much room on the board); the same card in the grid, field guide and round-end card (later: field guide and round end show the bare photo, no card; the name lives in the title/headline, never on the photo, where long names got cut off); the mystery is an empty camera-trap card while playing (a photo, even blurred, lets a player match it to a suspect without reading a clue).

## 1. Nudge (built)

A try at moving a card wiggles it on its pin (no move spent, no pick): swipe a card; swipe a gem into one (the gem bumps back); tap a gem, then the card next to it; Shift+arrow into one ("Pinned in place: <name>" for screen readers). The first nudge each round says "📌 Animals are pinned in place. Swap the gems around them." in the status line. `sfx.pinned()`. Event `clue-board-nudge`.

## 2. The card (built)

`BoardView.drawTile`: one container at the pin (paper, photo cropped with `setCrop`, no mask; number in Patrick Hand on a round paper tag at the photo's top right, photo fills the card above a thin lip; marker cross; pin; scouting strip), 1.08 × 1.06 cells, tilted by number (`CARD_TILTS`). States are pins and paper, never a ring (an amber ring matched the gem cursor): picked = paper pulses blue; ruled out = red cross + grey photo (`preFX` colour matrix, WebGL); release preview = pin pops up, card hangs and sways; released = pin flies out, card flutters off. Page: `AnimalCard` / `TrapCard` (`AnimalCard.tsx`, `.animal-card` in globals.css).

## 3. Tiles react (built)

A card whose answer the move's own clear scouts hops (same for yes and no; hop/shake would read as right/wrong), decided in `ClueBoardScene.reportMatches` with the rules' own test. A released card leaves the way its animal moves (`BoardPin.exit`, `exitOf` in useAnimalSession): fly (Chiroptera or `glider`) rises away, swim (`fully_aquatic`/`swimmer`) sinks in ripples, dig (`burrower`) squashes into the board with dust, walk waddles off the nearer side. The escaping mystery bolts off leaving a 💨 (setup's `escapes`: the mystery id, for this animation only). Reduced motion: a fade. Seen in the browser: dig, escape; fly and swim not yet (no such animal in the Africa test round).

## 4. The mystery's answers come alive (built)

When the mystery's answer stamps in the grid, the page sends `clue-board-answer` {tag, yes} (AnimalGame, with the answer sound); on Yes the board acts it out for ~2 s with emoji (`src/game/answerEffects.ts`): `diet:insects` 🐜 march along a grid line, `activity:night` dusk + 🌙 + ✨, `activity:day` warm wash + ☀️ rising, `birth:eggs` 🥚 drop and bounce, `system:freshwater`/`system:marine`/`habitat:wetlands` ripples + 💧, `diet:plants` 🍃 drift down. Cosmetic only, input passes through. Reduced motion: the emoji shows in the middle and fades. A resumed round doesn't replay answers already earned (sounds too). Dev bridge `__cc.answer(tag)` plays one. Only the mystery's own earned answer, so it points and never concludes.
