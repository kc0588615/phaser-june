---
mission: auto-rule-out-default
project: critter-connect
branch: agent/auto-rule-out-default
status: active
started: 2026-11-06 06:27 UTC
---

# Mission: Auto rule-out on by default (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

A player who opens the game for the first time, on a device with no saved choice, has **Auto rule-out** on: the menu's switch shows on, and from the first move the game rules out every suspect whose shown answer differs from a shown camera answer.

- A player who already turned the switch **off** keeps it off. A stored `'off'` is a choice and must win.
- A player who turned it on keeps it on.
- The switch still turns it off and on, and the choice is still kept on the device.
- If storage is blocked (private mode, `localStorage` throws), the game uses the new default: on.

### Why

The owner wants new players to get the easier, guided game from the start; the ones who want to do all the ruling out themselves can turn it off in the menu. Auto rule-out changes no scoring, so this is only a default.

### Scope

In:
- `src/components/animalBoard/autoRuleOut.ts`: the default (today `getItem(KEY) === 'on'`, so "no value" means off). Keep the key `critter-connect:auto-rule-out:v1` so existing choices survive.
- `src/components/animalBoard/useAnimalSession.ts:77-78`: the initial state (`useState(false)`, then corrected in an effect). Make sure a first-time player never plays a move with it off. Don't introduce a hydration mismatch.
- Comments that call it opt-in or "off until the player turns it on": `autoRuleOut.ts:1`, `AnimalSheets.tsx:410`, `useAnimalSession.ts:273`.
- `scripts/e2e.mjs`: round 4 asserts "Auto rule-out starts off" (`:846-864`, `:1149`), and the "off" rounds rely on that. Make the suite set the switch per round on purpose rather than rely on the default, and add a check that a fresh profile (no stored value) starts **on** and a stored `'off'` starts **off**.
- Copy that becomes false:
  - `src/site/pages/Teachers.tsx:64` ("The answers never rule anyone out by themselves").
  - `docs/CLUE_MATCH.md:54` ("off by default") and `:96` (the round-4 test description).
  - The how-to-play text in `AnimalSheets.tsx:712`, if it reads wrong with the switch on by default.
  - `CONTEXT.md:73` ("answers never rule anything out by themselves"), if the glossary means the default game.
  - Scan the site pages (`src/site/pages/`) and the game's help for other copy that assumes it's off. Keep the edits small and true.

Out:
- How Auto rule-out decides what to mark, scoring, the board, the grid's sort. This changes the default only.
- The site's screenshots (`npm run site:shots`). The owner has set their retake aside. Say in the Summary whether the current shots now show a non-default setting, but don't retake them.
- Privacy and Terms (critter-connect handoff H7 is the owner's).
- The live database: e2e runs against it are allowed (owner, 2026-11-01), but write nothing else to it.

### Definition of done

- Typecheck, lint, `npm run build` and the full E2E suite pass on the final commit. The repo's pre-push hook runs typecheck and lint, so the push itself proves them.
- The new E2E checks: a fresh profile starts on, a stored `'off'` starts off, a stored `'on'` starts on, and the switch toggles and is remembered across a reload.
- E2E output and screenshots of the menu on a fresh profile go in `/srv/critter-ai/agent-state/missions/auto-rule-out-default/`. Keep these small: no Playwright traces or HTML report there.
- The plan's Summary lists every copy and doc line changed, with the before and after, and says whether the production content build is needed (it shouldn't be).
- Released per the project's setting: merge, `deploy critter-connect`, and check that `https://play.critterconnect.org/version.txt` reports the merge commit. Then load the live game in a fresh browser profile and confirm the switch shows on.

### Decision rules

- A stored choice always beats the default. Never migrate, reset or rewrite existing values.
- If a copy line is unclear, prefer the smallest edit that's true for a new player with the default settings.
- The size of this change should match the request: one default, its tests and its copy. Don't refactor around it.

### Notes

- `autoRuleOut.ts` today: `isAutoRuleOutOn()` returns `localStorage.getItem(KEY) === 'on'`, falling back to `false` if storage throws; `setAutoRuleOutOn` writes `'on'` or `'off'`.
- `useAnimalSession.ts:273-278` runs the marking between moves when the setting is on, and `AnimalGame.tsx:406` says why an animal can't be ruled back in.
- The control room checked these facts on `origin/main` at `094da493` (PR #53 merged).
- Work board: none. There's no issue for this, so don't create a card.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `7370579c` (= `origin/main` `094da493` + mission start), 2026-11-06 06:30 UTC.
- `npm install`: ok. Migrate: n/a (no migration history; `db/schema.sql` baseline, live `phaser_june`, no schema change in scope).
- `npm run typecheck`: exit 0. `npm run lint`: exit 0. `npm test`: 48/48 pass.
- `npm run e2e:fresh`: **1473/1473** checks, 4 rounds (seed 7), 6m57s. Artifact: `/srv/critter-ai/agent-state/missions/auto-rule-out-default/baseline-e2e/` (report.json, screenshots, e2e.log, COMMAND.txt).
- E2E needs Chrome without its sandbox here (AppArmor): `CHROME_PATH=/srv/critter-ai/agent-state/missions/auto-rule-out-default/bin/chrome` (wrapper: Playwright chromium-1208 `--no-sandbox`). Plain `npm run e2e:fresh` fails (`/usr/bin/google-chrome ENOENT`).

## Architecture

Read on `agent/auto-rule-out-default` at `c6793a53` (= `origin/main` `094da493` + mission files).

### Findings

1. **Default is off** (`src/components/animalBoard/autoRuleOut.ts:5`): `getItem(KEY) === 'on'`, `catch { return false; }`. Null, garbage and blocked storage all read as off. This is the change itself. The writer (`:9`) only ever writes `'on'` or `'off'`, so `!== 'off'` gives the brief's table exactly: `'off'` gives off; `'on'`, null and a throw give on.
2. **Initial state is read late** (`useAnimalSession.ts:77-78`): `useState(false)`, then an effect. There is no hydration to protect: `/explore` loads `AnimalGame` with `dynamic(..., { ssr: false })` (`src/pages/explore.tsx:4-7`; Next 16.3.6 pages router, where `ssr: false` means client only). `useAnimalSession` has no other caller (`AnimalGame.tsx:198`), and it already reads browser storage in lazy initializers (`:58-61`). A wrong first value also can't reach a move:
   - `session` is null until the async pool load dispatches (`:64`, `:102`, `:131`, `:135`), and the marking effect returns on `!session` (`:276`).
   - The switch only renders while the menu is open (`AnimalGame.tsx:516`; comment at `AnimalSheets.tsx:414`).

   So the effect is safe today, but only because of ordering. A lazy initializer makes it correct by construction, and it is one line shorter.
3. **The E2E relies on the default.** `autoSwitch` is defined inside the round loop (`scripts/e2e.mjs:849-861`), and only the auto round calls it. It asserts "starts off" (`:864`) and turns the switch back off (`:1148-1149`). Rounds 1-3 and the resume and rise sections (`:1246+`, `:1392+`) run off only because nothing was ever stored. `:1073` ("with Auto rule-out off, the game marks nobody") would fail under the new default. The run's Chrome profile is new each time (`scripts/cdp.mjs:60-62`, `mkdtemp`), so the first `/explore` load (`e2e.mjs:235`) is a true "nothing stored" load. The injected script (`:84`) only writes the how-to and slide-hint keys.
4. **Copy that becomes false** (target text in the table below): `Teachers.tsx:64`, `:96`; `docs/CLUE_MATCH.md:54`, `:96`, `:98`; `CONTEXT.md:73`; how-to step `AnimalSheets.tsx:711`; and the comments `autoRuleOut.ts:1`, `AnimalSheets.tsx:410`, `useAnimalSession.ts:273`, `src/clueGame/animalBoard.ts:429` (a fourth "opt-in" comment the brief didn't list).

   Checked and still true, so no edit:
   - `AnimalSheets.tsx:712`: its parenthetical already covers both states.
   - `AnimalGame.tsx:406`.
   - `AnimalSheets.tsx:612` (the replay legend).
   - `Home.tsx:27`, `:58-59`; `Teachers.tsx:46`. Students still compare and rule out, and Auto rule-out never marks the mystery (`animalBoard.ts:430`).
   - The slide hint (`EvidenceGrid.tsx:91`).
   - `src/site/config.ts:31`.
   - Privacy and Terms are out of scope.
5. **Site shots:** none shows the menu or the switch. The gameplay shots were taken with the switch off (`scripts/shots/take.mjs` never sets the key, and the default was off). `grid-marked.webp` now shows a state the new default can't produce: camera "Large" ✗ NO, the Chimpanzee's scouted ✓ is still unmarked, and the Okapi was ruled out by hand ("You ruled out the Okapi"). With the switch on, the game would have marked both after the move.
   - `board-phone`, `hero-board` and `field-guide` are taken before any answer shows, so they are unaffected.
   - `witness-note` and `round-end` come after the careful player has marked everything the answers rule out, which is what Auto rule-out would mark anyway. Check them by eye for the Summary.
   - Don't retake (per the brief).
6. **No other code assumes the default.** `npm test` (`tests/clueGame`, `tests/game`), `scripts/balance-044.ts` and `scripts/e2e-site.mjs` never reference the setting (rg). Plans mention it only in `plans/2026-11-01-site-shots-refresh.md:57,:144`, a historical record, so leave it.

### Target design

**`autoRuleOut.ts`** (the only behavior change):
```ts
// Auto rule-out setting: on unless the player turned it off (a stored 'off' wins; blocked storage: on); kept on this device.
export function isAutoRuleOutOn(): boolean {
  try { return window.localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}
```
- Same key. Never migrate or rewrite stored values.
- `setAutoRuleOutOn` stays as it is.

**`useAnimalSession.ts:77-78`** becomes one line, with the effect deleted:
```ts
const [autoRuleOut, setAutoRuleOut] = useState(isAutoRuleOutOn); // client only (explore.tsx: ssr: false)
```
- `autoRef = useRef(autoRuleOut)` (`:80`) now starts correct too.
- The `:273` comment drops "(opt-in)".
- Nothing else in the hook changes.

**`scripts/e2e.mjs`:**
- **Hoist the helper.** Move `autoSwitch(on)` out of the round loop to just after the `screenshot` helper (`:218`), and use it everywhere (DRY). Two changes to it:
  - It opens the menu only if the switch isn't showing yet, so it also works on a menu already open for a screenshot.
  - It also returns `storedBefore` and `storedAfter`: `localStorage.getItem('critter-connect:auto-rule-out:v1')` before and after the click.
- **Add a load helper.** A small `loadBoard()` wraps `:236-238` (waitFor board ready with 5 pins, `__cc.speed(4)`, photo wait). Use it at `:236` and after each reload below.
- **New "once a run" block** right after the sound check (`:258`), on the seeded first load, before any move. A `?seed=` game is never saved (`useAnimalSession.ts:59`, `:177`), so a reload re-deals the same round 1.
  1. Open the menu and `screenshot('02-menu-fresh-profile.png')`. Then `autoSwitch(false)`. Check: "a new profile (nothing stored) starts with Auto rule-out on, and its switch turns it off and stores 'off'". That means `storedBefore === null && before === 'true' && after === 'false' && storedAfter === 'off'`.
  2. `Page.reload`, `loadBoard()`, `autoSwitch(true)`. Check: "a stored 'off' starts off after a reload, and the switch turns it back on". That means `storedBefore === 'off' && before === 'false' && after === 'true' && storedAfter === 'on'`.
  3. `Page.reload`, `loadBoard()`, `autoSwitch(false)`. Check: "a stored 'on' starts on after a reload". That means `storedBefore === 'on' && before === 'true'`. It leaves the switch off, so round 1's pre-loop grid tests run as they did at baseline.
  - Cost: two board loads plus about 0.6 s per round, roughly 15-20 s on a 7-minute run.
- **Every round sets it on purpose.** Replace `:862-865` with `const set = await autoSwitch(mode === 'auto')` and the check `round ${n}: Auto rule-out set ${on|off} through the menu for this round` (`set.after === String(mode === 'auto')`).
- **Keep `:1146-1150`.** The auto round still turns the switch back off. Add a comment there: the resume and rise sections run with it off, and every non-auto round has set it off.
- **Artifact.** The suite writes `e2e-artifacts/<run>/` as before. The Verification copies `report.json`, the console log and the PNGs (including `02-menu-fresh-profile.png`) to `/srv/critter-ai/agent-state/missions/auto-rule-out-default/final-e2e/`, with no traces.

**Release smoke** (live, fresh profile; a one-off command, nothing committed):
- Script: `node` + `scripts/cdp.mjs` (`startBrowser`/`openPage`) opens `https://play.critterconnect.org/explore/?place=continent:africa`.
- A new player sees how-to-play first (`AnimalGame.tsx:263`): close it, then open the Menu. Read the `[role=switch]` "Auto rule-out" `aria-checked` (it must be `'true'`) and screenshot it into the mission folder.
- Loading the page writes nothing to the DB.

**Copy** (smallest true edit for a new player with default settings):

| Where | Before | After |
|---|---|---|
| `autoRuleOut.ts:1` | `off until the player turns it on; kept on this device.` | as in the code above |
| `useAnimalSession.ts:273` | `// Auto rule-out (opt-in): between moves, …` | `// Auto rule-out (on unless the player turned it off): between moves, …` |
| `AnimalSheets.tsx:410` | `/** Opt-in: the game rules out animals …` | `/** On by default: the game rules out animals …` |
| `src/clueGame/animalBoard.ts:429` | `* Auto rule-out (opt-in setting): whether …` | `* Auto rule-out (a menu setting, on by default): whether …` |
| `AnimalSheets.tsx:711` (how-to step 4) | `… across its name (drag again to bring it back).` | append: ` After each move, <b>Auto rule-out</b> rules out every animal with a shown answer that doesn&apos;t match; turn it off in the menu to do it all yourself.` (`:712` unchanged) |
| `Teachers.tsx:64` | `The answers never rule anyone out by themselves. Students compare … can't be it. A ruled-out animal …` | `Students compare each animal's scouted answers with the camera's and rule out the ones that can't be it. After each move, Auto rule-out (on unless it's turned off in the game's menu) rules out any animal whose scouted answer differs from the camera's. A ruled-out animal …` (rest unchanged) |
| `Teachers.tsx:96` | `One student plays; the other has to agree to every rule-out.` | `One student plays with Auto rule-out off (in the game's menu); the other has to agree to every rule-out.` |
| `docs/CLUE_MATCH.md:54` | `(menu switch, off by default, kept on the device)` | `(menu switch, on by default, kept on the device; a stored "off" wins)` |
| `docs/CLUE_MATCH.md:96` | `Round 4 turns on Auto rule-out, marks nobody itself, and checks each move … (never the mystery).` | `Each round sets Auto rule-out through the menu: on in round 4, which marks nobody itself and checks each move that exactly the animals a shown answer rules out are marked (never the mystery); off in the others.` |
| `docs/CLUE_MATCH.md:98` (Once a run) | `sound starts off and the menu's button turns it on;` | add after it: `a new profile starts with Auto rule-out on (02-menu-fresh-profile.png), its switch turns it off and on, and a stored "off" or "on" survives a reload;` |
| `CONTEXT.md:73` | `…; answers never rule anything out by themselves.` | `…; an answer rules nothing out by itself: the player rules a suspect out, or Auto rule-out (a menu setting, on by default) does once its shown answer differs from the camera's.` |

There is no content change, so no production content build is needed. Teachers.tsx changes, so the Verification adds `npm run site:build` + `npm run e2e:site` to typecheck, lint, `npm run build`, `npm test` and `npm run e2e:fresh`.

### Rejected alternatives

- **Keep `useState(false)` + effect:** safe today only because the async load comes later (F2). Correct by construction is simpler.
- **`useState(true)` + keep the effect:** two sources of truth, and a stored-'off' player renders on first.
- **`useSyncExternalStore` over localStorage:** machinery for a one-tab setting with a single writer.
- **New key `v2`, or rewriting null to `'on'`:** forbidden by the brief and unnecessary, since null already means "no choice".
- **Set the key via `addScriptToEvaluateOnNewDocument`:** it runs on every load, so it would overwrite the switch's choice and void the reload and fresh-profile checks.
- **A second Chrome profile for the fresh check:** the run's own profile is already fresh at its first load, and a second launch adds cost.
- **Do the persistence checks on the resume section's existing reloads:** they depend on the round count, and no existing load has 'on' stored.

### Risks

- **Existing players who never touched the switch now get it on.** Intended: null means no choice.
- **`docs/ANIMAL_BOARD_PAPER.md`** (`:27-29`, §4.5) argues the player makes every rule-out and that random play wins 0%. With the switch on by default, random play that scouts answers gets the look-alikes marked, and they wander off by themselves. Those claims now hold only with the switch off. The paper is a 044-0 design record and out of scope, so don't edit it; say so in the Summary for the owner.
- **A future `npm run site:shots`** plays with the new default. `take.mjs`'s grid-marked trigger (the player's own slide, `:158-165`) may fire later or differently. That belongs to the owner's set-aside retake; mention it in the Summary.
- **E2E block reloads:** call `loadBoard()` after each one (`speed(4)` is page state). Canceled photo requests are already ignored (`e2e.mjs:74`). CI's PR e2e runs the same block and adds no DB writes.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked every citation at `78b1c063`: `autoRuleOut.ts:1,5,9`; `useAnimalSession.ts:58-61,64,77-81,102,131,135,177,273-278`; `explore.tsx:4-7` (`ssr: false`, Next 16.3.6 pages router); `AnimalGame.tsx:198,263,406,516`; `AnimalSheets.tsx:410,414,446,612,711-712`; `e2e.mjs:84,196-199,235-238,258,849-865,1073,1146-1150,1246+,1392+`; `cdp.mjs:60-62` (mkdtemp profile), `:94-108`; `Teachers.tsx:64,96`; `CLUE_MATCH.md:54,96,98`; `CONTEXT.md:73`; `animalBoard.ts:429-430`; `take.mjs:44,158-165`. All findings are accurate. `!== 'off'` gives the brief's table exactly; the lazy `useState(isAutoRuleOutOn)` is correct with no SSR path and is the smallest change; a `?seed=` game is never saved (`:177` `replay` guard), so the reload steps re-deal round 1; the injected script writes only the how-to and slide-hint keys; the auto round is the last round and resets the switch to off, so resume and rise sections stay off. An rg over the repo (excluding plans and playtests) finds no copy the table misses. Design matches the brief's scope and definition of done.

MUST-FIX:
1. **`loadBoard()` after `Page.reload` must wait for the new document.** The design wraps `:236-238` only (waitFor `__cc` ready, `speed(4)`, photo sleep). `Page.reload` returns before the old document unloads, so the first `waitFor` poll can be satisfied by the *old* page's still-ready `__cc`, then `evaluate(speed(4))` runs on the dying context (throws "execution context destroyed", or is silently lost on the new page, which then plays at 1x and breaks later timing). The existing reloads already guard this (`:1261-1262`: `waitFor(() => document.readyState === 'complete')` first, as `goto` does at `:198`). Either put that wait in `loadBoard()`, or do the two reloads with `goto(<same seeded URL>)` and drop `Page.reload`. Flaky E2E is a real defect for a suite CI runs on every PR.

MISSED: none.

SHOULD-CONSIDER:
1. `CONTEXT.md:73` target text is long for a glossary entry; "an answer rules nothing out by itself: the player does, or Auto rule-out (menu, on by default) does when it differs from the camera's" is shorter and as true.
2. Name the new screenshot `02b-menu-fresh-profile.png` (or `03-`) so it sorts after `02-board.png` and the brief's "menu on a fresh profile" artifact is easy to spot; keep the existing numbering otherwise.
3. Round 1's `autoSwitch(false)` after the once-a-run block is a no-op click-less open/close (0.6 s). Fine for DRY; just make the check's detail string include `before/after` so a failure says which.
4. Release smoke: after closing how-to, `AnimalGame.tsx:264` sets the slide hint once; irrelevant to the switch but the screenshot may show the hint overlay. Open the Menu before any board tap, as planned.
5. In the Summary, say `grid-marked.webp` now shows a non-default state (player-marked Okapi with an unmarked mismatching Chimpanzee), per F5; the other shots are consistent with either setting.

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-06 06:38 UTC · Baseline: typecheck, lint, 48/48 unit, E2E 1473/1473 pass.
- 2026-11-06 06:46 UTC · Architecture: `architect` wrote findings + target design (default `!== 'off'`, lazy `useState`, e2e once-a-run persistence block, 11 copy lines). Plan-only, no code; no checks needed.
- 2026-11-06 06:48 UTC · Fable review: APPROVE_WITH_CHANGES, 1 MUST-FIX (`loadBoard()` must wait for the new document after `Page.reload`). Plan-only; no checks needed.

## Summary
