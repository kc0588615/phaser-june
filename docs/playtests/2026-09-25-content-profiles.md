# Playtest 2026-09-25: 50 sourced profiles, photos, reveal card

Dev build (`npm run dev`), chrome-devtools MCP, `window.__cc`. Played `/clue-match/?seed=7` and `?seed=11` at 390x844 (mobile, touch), `?seed=21` at 1280x800 (4 rounds), and opened the Field Journal. Offline: 400 seeded rounds each at rounds 1, 3, 5, 7 and 9 through the real engine (`createRound`, `revealNext`).

Invariants held: the answer was never ruled out, each counted drag added one move, no page scroll, no failed `/api/clue-game/*` requests, no console errors (one Clerk development-keys warning).

## Findings

1. **UX, fixed.** On a phone, the reveal photo took the whole sheet and pushed the name, facts and range map below the fold. Now it is a short banner with the name on it; "Did you know?" (with its source) sits above the range map.
2. **Content, fixed.** The spiny turtle's photo was an Asian leaf turtle (*Cyclemys dentata*), and the Ili pika's "photo" was a range map. Both came from Wikipedia lead images. `npm run content -- photos` now keeps a file only if its name, description or categories name the species, and skips `area` maps. The Ili pika has no free photo on Commons, so it shows its emoji.
3. **UX, improved.** At 390 px, long names break mid-word on candidate cards ("Oranguta/n") in desktop Linux Chrome, which lacks English hyphenation. Phones hyphenate (`hyphens: auto`). A smaller portrait (36→32 px) gives most names room; "Livingstone's" and "Goodfellow's" still need hyphens.
4. **Balance, as intended.** Clues needed to leave one candidate (median, p90): round 1: 6, 14; round 5: 8, 15; round 9: 9, 16. Early rounds solve in 3 to 6 moves. Look-alikes keep several matching dots until an exclusive trait rules them out: a golden-rumped sengi round kept a golden mole, solenodon and aye-aye at 5 matches each until late.
5. **Dev only.** The Next.js dev tools badge covers the "Keep reading" button on mobile.

## Repro

- Reveal card: `/clue-match/?seed=7`, drag four moves, tap Blanding's Turtle, Guess.
- Names: `/clue-match/?seed=11` at 390x844 (Sumatran Orangutan card).
