---
name: playtest
description: Play Critter Connect (the globe and the game at /explore) in the real browser build and report what breaks. Use to verify a gameplay or UI change by playing it, to reproduce a board bug, or to launch and drive the app.
---

# Playtest

Drive the dev build through the chrome-devtools MCP like a player. React UI (globe list and cards, the game's chips, tiles, sheets and spend panel) shows up in `take_snapshot`; the Phaser board is a canvas, so read and act on it through `window.__cc` (dev-only bridge, `src/game/debugBridge.ts`, reference at the end). Judge what a player sees: pair bridge state with screenshots. Mobile first: `emulate` viewport `390x844x3,mobile,touch`, then check `844x390x3,mobile,touch,landscape` and `1280x800x1`.

## 1. Preflight

- `npm run dev` serving :8080. `window.__cc` missing means a production build.
- Signing in is optional (rounds then save with the player's profile). Google OAuth is blocked in the automated Chrome and Clerk sign-up hits a CAPTCHA; email-code sign-in has neither. `+clerk_test` addresses take code `424242` in Clerk dev instances. Run on any page, then reload:

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

- The list shows the continents from `GET /api/places`; one with fewer than 12 animals says "coming soon". Tap a row (or a dot on the globe): the globe flies there and outlines it, and the card shows the animal count, found animals by name, `?` for the rest, and a habitat picture (TiTiler, 1–5 s; hidden if it fails).
- **Explore** opens `/explore/?place=continent:<name>`; **Anywhere** opens `/explore/`.
- Found animals glow on the globe (green amphibians/reptiles, amber mammals); they come from the journal's sightings in localStorage (`clue-match:journal:v1`).

## 3. The game (`/explore`)

Rules: `docs/CLUE_MATCH.md` (Rules). `?seed=N` replays the same mysteries and boards; `?place=continent:<name>` plays that continent (old `/clue-match` links redirect here). A move swaps two neighboring gems. Play with `drag(move, { input: 'touch' })` (a swipe), or `tap(from)` then `tap(to)`. Ask by tapping a chip in `[aria-label="Charges"]`, then Ask; at 0 moves, the buttons in `[aria-label="Spend your charges"]` ask with one tap. Guess by tapping a tile in `[aria-label="Possible animals"]`, then `Guess: it's the <name>!` in its field guide. The reveal card waits for **Next animal**.

Invariants to check each move:

- `clue().mysteryId` is never in `out`; `movesLeft` drops by one per counted swap (cascades are free); a swap with no match slides back and doesn't count.
- Charges never go below zero; a question spends one charge of its color (a "No record" answer gives it back); a family tree step spends one of each.
- A straight 4 leaves a line gem, an L or T a blast gem, a straight 5 a color gem; a matched toy goes off (its clear shows as `blast` groups in `events()`), and the board stays full.
- No `a[href]` to a source while `status` is `playing`, `out-of-moves` or `last-chance`; the reveal card links them.
- Outside `playing` the board is locked: swaps don't count and no `gems-matched` events fire.
- A wrong guess at 0 moves opens a last chance only if `notesCollected > 0`; a second wrong guess ends the round `lost`.
- With `?place=`, a solve adds a sighting for that continent to the journal; a lost round adds nothing.
- No page scroll: `document.documentElement.scrollHeight === innerHeight`; every button at least 44px.

Content problems (a field note that still names its animal, a trait with no record) come from the profiles in `db/content/`: `npm run content -- preview <name>`, then `npm run content -- check` on the live pool.

## 4. Report

Write `docs/playtests/YYYY-MM-DD-<topic>.md`: what you played (seed, place), then one entry per finding: severity (blocker / bug / UX / copy / balance), observed vs expected, repro (URL with seed and place, moves), evidence (console or network excerpt, screenshot). Hunt for failed requests (`/api/places`, `/api/clue-game/*`), console errors, clipped or overlapping text, words outside the grades 6–12 register, and rounds that are too easy or too hard.

## Bridge reference (`window.__cc`)

| Call | Returns |
|---|---|
| `state()` | board: `ready`, `canMove`, `locked`, `isResolvingMove`, `isDragging`, `boardSeed`, `movesUsed`, `hasAnyValidMove`, `grid` (`grid[x][y]` is a color name), `toys` (`toys[x][y]`: `row`, `column`, `bomb`, `color` or null), `view` (the texture each sprite shows; must match `grid` and `toys`), `gemSize`, `boardOffset` |
| `clue()` | session: `rulesVersion`, `moves`, `candidates`, `status`, `roundNo`, `mysteryId`, `candidateIds`, `standing`, `out`, `movesLeft`, `movesUsed`, `charges`, `notesCollected`, `familyTreeSteps`, `asked`, `answered`, `treeStepsTaken`, `wrongGuesses`, `score`, `streak`, `solved`, `end`, `logTail` |
| `validMoves()` | `[{ from, to, matches, largest, colors, trigger }]`: every move (`[x, y]` cells); `largest` is the biggest group; `colors` the gem colors it matches; `trigger` true for a swap that only sets toys off (a color gem, or two toys) |
| `drag(move, { input, timeoutMs })` | swipes `from` toward `to`; `{ counted, movesUsed, timedOut, blocked, after }` once the board settles; `input: 'touch'` swipes with a finger |
| `tap([x, y], { input, timeoutMs })` | taps one cell; `{ blocked, timedOut, after }` |
| `waitIdle(ms)` | snapshot once input returns or the board is locked |
| `events(n)` | last n EventBus events |
| `speed(x)` | animation time scale |
| `cellCenter(x, y)` | page coordinates of a board cell |
