---
name: playtest
description: Play Critter Connect (expedition runs or Clue Match) in the real browser build and report what breaks. Use to verify a gameplay or UI change by playing it, to reproduce a board or run bug, or to launch and drive the app.
---

# Playtest

Drive the dev build through the chrome-devtools MCP like a player. The React UI (map panels, briefing, dossier, claims) shows up in `take_snapshot`; the Phaser board is a canvas, so read and act on it through `window.__cc` (dev-only bridge, `src/game/debugBridge.ts`, reference at the end). Judge what a player sees: pair bridge state with screenshots.

## 1. Preflight

- `npm run dev` serving :8080. `window.__cc` missing means a production build.
- Sign in as the test player. Google OAuth is blocked in the automated Chrome and Clerk sign-up hits a CAPTCHA; email-code sign-in has neither. `+clerk_test` addresses take code `424242` in Clerk dev instances. Run on any app page, then reload:

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

Done when `window.Clerk.user` is the test player and `window.__cc.run()` returns run state.

## 2. Start a run

Expedition tab → **Start Expedition** → pick a map site → **Explore Area** → (species count appears) **Start Expedition** → **Investigate** → incident **Begin fieldwork** → Field Training cards → **Start investigating**.

- Only the pool species in `db/seeds/pools/*/pool.json` are live; elsewhere the map says "No Species Here". Southern India (lon 76.1, lat 12.0) has two.
- The MapLibre map isn't global. Walk React fiber up from `.maplibregl-map` to the hook value that has `project` and `jumpTo`, `jumpTo({ center, zoom: 5 })`, then dispatch `mousedown`/`mouseup`/`click` on `map.getCanvas()` at `map.project(center)`.
- Investigate creates the run server-side (~10s).

Done when `run().runState.caseState.stage === 'board'` and `state().canMove`.

## 3. Play three sites

Each site is 6 committed moves. Per move: pick from `validMoves()` the way a player might (vary it; always-max-matches is a smoke test, not a playtest), `await drag(move)`, and log the **repro tuple** `{ runId, nodeIndex, boardSeed, moveNumber, move }`. Seed plus move list replays a board exactly.

- `drag` returns `blocked` when UI covers the board; a finding unless a modal should be up.
- After move 6 the dossier offers evidence families (`[aria-label="Field notebook"] button`); choosing one loads the next site in ~5s.
- Read each new field-radio line and observation as a player would: does it narrow the live candidates?

Done when each site's sixth move is server-confirmed: right after that move, `events()` shows `evidence-progress-committed` for moveNumber 6 (`waitIdle` alone can return before the server confirms). Check per site; later sites push earlier events out of the default window.

## 4. Verdict

In `[aria-label="Live case claims"]`: pick a species → **Confirm species**; wait for `claims.species === 'locked'` (explanation confirm stays disabled until then) → pick an explanation → **Confirm explanation**.

Done when `run().runState.phase === 'complete'` and the completion screen is screenshotted.

## 5. Report

Write `docs/playtests/YYYY-MM-DD-<site>.md`: run id, site, then one entry per finding: severity (blocker / bug / UX / copy / balance), observed vs expected, repro tuple or UI path, evidence (console or network excerpt, screenshot path). Hunt for:

- **Hangs**: any request pending over 20s. Check `pg_stat_activity` for `idle in transaction` (read-only, postgres-tunnel skill).
- **Failures**: 4xx/5xx on `/api/runs/*`, "Move not saved" toasts, `waitIdle` `timedOut`, `hasAnyValidMove` false with moves left, errors the player never sees.
- **Layout**: clipped or overlapping text, state text that contradicts the screen.
- **Copy**: words outside the grades 6–12 register, internal terms leaking to players.
- **Balance**: live candidates after each site, sites or choices that add nothing.

Done when every finding carries evidence and the report states what the run did not cover.

## Clue Match (no sign-in)

`/clue-match?seed=N`: same seed, same mysteries and starting board. Mobile first: `emulate` viewport `390x844x3,mobile,touch`, play with `drag(move, { input: 'touch' })`. Guess by clicking a card in `[aria-label="Possible animals"]`, then the `Guess: <name>` button. The reveal card auto-advances after 9s.

Invariants to check each move:

- `clue().mysteryId` is never in `ruledOut`; `moves` goes up by one per counted drag (cascades are free).
- Each matched group adds one feed item (clue, fun note, or "no more"), then that color goes quiet.
- While `phase === 'solved'` the board is locked: drags don't count and no `gems-matched` events fire.
- No page scroll: `document.documentElement.scrollHeight === innerHeight`; every button at least 44px.

Content problems (a clue that doesn't fit its own animal, missing notes for a color) come from the database: `npm run clue:pool -- --check`.

## Bridge reference (`window.__cc`)

| Call | Returns |
|---|---|
| `state()` | board: `ready`, `canMove`, `isResolvingMove`, `inRun`, `nodeIndex`, `boardSeed`, `movesUsed`/`maxMoves`, `gameOver`, `objective`, `hasAnyValidMove`, `grid`, layout |
| `run()` | `{ runId, runState }` from ExpeditionContext |
| `validMoves()` | `[{ rowOrCol, index, amount, matches, largest }]` for shifts of 1–3; `largest` is the biggest group |
| `drag(move, { input, timeoutMs })` | `{ counted, movesUsed, timedOut, blocked, after }` once the board settles; `input: 'touch'` drags with a finger |
| `clue()` | Clue Match session: `phase`, `round`, `mysteryId`, `candidateIds`, `live`, `moves`, `ruledOut`, `wrongGuesses`, `revealedByGem`, `score`, `streak`, `feedTail` |
| `waitIdle(ms)` | snapshot once input returns or the node is done |
| `events(n)` | last n EventBus events, bulky payloads omitted |
| `speed(x)` | animation time scale; pausing resets it |
| `cellCenter(x, y)` | page coordinates of a board cell |

- Board-only checks without auth or a run: `/terrain-variety-fixture` (seed 91; the page confirms moves itself, and `objective.completed` stays false at 6/6).
- `performance.getEntriesByType('resource')` stops at 250 entries; use `list_network_requests` for late requests.
