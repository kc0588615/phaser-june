---
name: playtest
description: Play Critter Connect (the globe and the game at /explore) in the real browser build and report what breaks. Use to verify a gameplay or UI change by playing it, to reproduce a board bug, or to launch and drive the app.
---

# Playtest

Drive the dev build through the chrome-devtools MCP like a player. React UI (globe list and cards, the game's evidence grid, status line and sheets) shows up in `take_snapshot`; the Phaser board is a canvas, so read and act on it through `window.__cc` (dev-only bridge, `src/game/debugBridge.ts`, reference at the end). Judge what a player sees: pair bridge state with screenshots. Mobile first: `emulate` viewport `390x844x3,mobile,touch`, then check `844x390x3,mobile,touch,landscape` and `1280x800x1`.

## 1. Preflight

- `npm run dev` serving :8080. `window.__cc` missing means a production build.
- In a git worktree (a variant fork): `cp -al ~/phaser-june/node_modules node_modules` (hard links; Turbopack rejects a symlinked `node_modules`), copy `.env.local`, serve with `./node_modules/.bin/next dev -p 8090`, and e2e with `E2E_BASE_URL=http://localhost:8090 npm run e2e`.
- A `globals.css` edit that doesn't show after an `ignoreCache` reload (`getComputedStyle(document.documentElement)` still has the old value) means Turbopack missed it: restart the dev server.
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

Rules: `docs/CLUE_MATCH.md` (Rules), in full `docs/ANIMAL_BOARD_PAPER.md` §2. `?seed=N` replays the same trails and boards; `?place=continent:<name>` plays that continent (old `/clue-match` links redirect here). Returning players skip how-to-play: `initScript` `localStorage.setItem('critter-connect:animal-board-how-to:v1', '1')`. A move swaps two neighboring gems: `drag(move, { input: 'touch' })` (a swipe), or `tap(from)` then `tap(to)`. Pick a suspect with its row in the evidence grid (`tr[data-suspect] button`); the status line then offers `[data-act="rule-out"]` (and `[data-act="undo"]`) and **Field guide**. The menu is `button[aria-label="Menu"]`; at 0 moves the `Out of moves` sheet asks for a name. The round-end card waits for its next button.

Invariants to check each move (`npm run e2e` checks these too):

- A counted swap uses exactly one move (`clue().movesLeft`); a swap with no match slides back and doesn't count; the board settles.
- Tiles never move, and a tile shows on each pinned cell; only `marked` suspects leave (`released`). `mysteryId` leaves only by escaping, which loses the round (`lostBy`).
- During play the grid never names the mystery or points at a mismatch; its Mystery row shows only earned answers (`orders[].answer`).
- Ruling out the mystery doesn't release it by itself; tapping a gem outlines the marked animals its swap would release.
- Out of moves: the name sheet shows and the round is lost even when named right (a right name still goes in the journal).
- The round-end card names the mystery, replays the grid (red where an earned answer rules an animal out) and shows the family tree; the trail moves on (a find, or one heart less).
- With `?place=`, a find adds a sighting for that continent to the journal.
- No page scroll: `document.documentElement.scrollHeight === innerHeight`; every button at least 44px; on a 375×548 phone the board keeps at least 210 px.

Content problems (a field note that still names its animal, a trait with no record) come from the profiles in `db/content/`: `npm run content -- preview <name>`, then `npm run content -- check` on the live pool.

## 4. Report

Write `docs/playtests/YYYY-MM-DD-<topic>.md`: what you played (seed, place), then one entry per finding: severity (blocker / bug / UX / copy / balance), observed vs expected, repro (URL with seed and place, moves), evidence (console or network excerpt, screenshot). Hunt for failed requests (`/api/places`, `/api/clue-game/*`), console errors, clipped or overlapping text, words outside the grades 6–12 register, and rounds that are too easy or too hard.

## Bridge reference (`window.__cc`)

| Call | Returns |
|---|---|
| `state()` | board: `ready`, `canMove`, `locked`, `isResolvingMove`, `isDragging`, `boardSeed`, `movesUsed`, `hasAnyValidMove`, `grid` (`grid[x][y]` is a color name), `toys` (`toys[x][y]`: `row`, `column`, `bomb`, `color` or null), `view` (the texture each sprite shows; must match `grid` and `toys`), `gemSize`, `boardOffset` |
| `clue()` | session: `seed`, `rulesVersion`, `trailNo`, `roundNo`, `status`, `lostBy`, `mysteryId`, `suspects`, `marked`, `released`, `movesLeft`, `movesUsed`, `moves`, `orders` (`tag`, `gem`, `have`, `answer`), `notes`, `possible`, `score`, `streak`, `trail`, `end`, `logTail` |
| `validMoves()` | `[{ from, to, matches, largest, colors, trigger }]`: every move (`[x, y]` cells); `largest` is the biggest group; `colors` the gem colors it matches; `trigger` true for a swap that only sets toys off (a color gem, or two toys) |
| `drag(move, { input, timeoutMs })` | swipes `from` toward `to`; `{ counted, movesUsed, timedOut, blocked, after }` once the board settles; `input: 'touch'` swipes with a finger |
| `tap([x, y], { input, timeoutMs })` | taps one cell; `{ blocked, timedOut, after }` |
| `waitIdle(ms)` | snapshot once input returns or the board is locked |
| `events(n)` | last n EventBus events |
| `speed(x)` | animation time scale |
| `cellCenter(x, y)` | page coordinates of a board cell |
