---
name: playtest
description: Play Critter Connect (the globe and Clue Match) in the real browser build and report what breaks. Use to verify a gameplay or UI change by playing it, to reproduce a board bug, or to launch and drive the app.
---

# Playtest

Drive the dev build through the chrome-devtools MCP like a player. React UI (globe list and cards, Clue Match rail) shows up in `take_snapshot`; the Phaser board is a canvas, so read and act on it through `window.__cc` (dev-only bridge, `src/game/debugBridge.ts`, reference at the end). Judge what a player sees: pair bridge state with screenshots. Mobile first: `emulate` viewport `390x844x3,mobile,touch`, then check `844x390x3,mobile,touch,landscape` and `1280x800x1`.

## 1. Preflight

- `npm run dev` serving :8080. `window.__cc` missing means a production build.
- Signing in is optional (solves then save with the player's profile). Google OAuth is blocked in the automated Chrome and Clerk sign-up hits a CAPTCHA; email-code sign-in has neither. `+clerk_test` addresses take code `424242` in Clerk dev instances. Run on any page, then reload:

  ```js
  async () => {
    const C = window.Clerk;
    let si = await C.client.signIn.create({ identifier: 'playtest+clerk_test@example.com' });
    const f = si.supportedFirstFactors.find(x => x.strategy === 'email_code');
    await si.prepareFirstFactor({ strategy: 'email_code', emailAddressId: f.emailAddressId });
    si = await si.attemptFirstFactor({ strategy: 'email_code', code: '424242' });
    await C.setActive({ session: si.createdSessionId });
    return C.user?.id;
  }
  ```

  If the account is gone (`form_identifier_not_found`), run `node .claude/skills/playtest/scripts/create-test-player.mjs` from the repo root.

## 2. Globe (`/`)

- The list loads from `GET /api/places`; chips switch Countries / Wildlife areas / Continents. Tap a row (or a dot on the globe): the globe flies there and outlines it, and the card shows the animal count, found animals by name, `?` for the rest, and a habitat picture (TiTiler, 1–5 s; hidden if it fails).
- **Explore** opens `/clue-match/?place=<key>`.
- Found animals glow on the globe (green amphibians/reptiles, amber mammals); they come from the journal's sightings in localStorage (`clue-match:journal:v1`).

## 3. Clue Match (`/clue-match`)

`?seed=N` replays the same mysteries and starting board; `?place=<key>` draws mysteries from that place's animals. Play with `drag(move, { input: 'touch' })`. Guess by clicking a card in `[aria-label="Possible animals"]`, then the `Guess: <name>` button. The reveal card auto-advances after 9s.

Invariants to check each move:

- `clue().mysteryId` is never in `ruledOut`; `moves` goes up by one per counted drag (cascades are free).
- Each matched group adds one feed item (clue, fun note, or "no more"); a 4-match adds one bonus, 5+ adds two.
- While `phase === 'solved'` the board is locked: drags don't count and no `gems-matched` events fire.
- With `?place=`, every mystery is one of that place's animals, and a solve adds a sighting for that place to the journal.
- No page scroll: `document.documentElement.scrollHeight === innerHeight`; every button at least 44px.

Content problems (a clue that doesn't fit its own animal, missing notes for a color) come from the profiles in `db/content/`: `npm run content -- preview <name>`, then `npm run content -- check` on the live pool.

## 4. Report

Write `docs/playtests/YYYY-MM-DD-<topic>.md`: what you played (seed, place), then one entry per finding: severity (blocker / bug / UX / copy / balance), observed vs expected, repro (URL with seed and place, moves), evidence (console or network excerpt, screenshot). Hunt for failed requests (`/api/places`, `/api/clue-game/*`), console errors, clipped or overlapping text, words outside the grades 6–12 register, and rounds that are too easy or too hard.

## Bridge reference (`window.__cc`)

| Call | Returns |
|---|---|
| `state()` | board: `ready`, `canMove`, `locked`, `isResolvingMove`, `isDragging`, `boardSeed`, `movesUsed`, `hasAnyValidMove`, `grid` (`grid[x][y]` is a color name), `gemSize`, `boardOffset` |
| `clue()` | session: `phase`, `round`, `mysteryId`, `candidateIds`, `live`, `moves`, `ruledOut`, `wrongGuesses`, `revealedByGem`, `score`, `streak`, `feedTail` |
| `validMoves()` | `[{ rowOrCol, index, amount, matches, largest }]` for shifts of 1–3; `largest` is the biggest group |
| `drag(move, { input, timeoutMs })` | `{ counted, movesUsed, timedOut, blocked, after }` once the board settles; `input: 'touch'` drags with a finger |
| `waitIdle(ms)` | snapshot once input returns or the board is locked |
| `events(n)` | last n EventBus events |
| `speed(x)` | animation time scale |
| `cellCenter(x, y)` | page coordinates of a board cell |
