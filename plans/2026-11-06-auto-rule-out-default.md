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
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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
   - Don't retake (per the brief). The Summary names `grid-marked.webp` as the one shot showing a non-default state.
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
- **Add a load helper.** `loadBoard()` = `goto(<the seeded URL of :235>)` + `:236-238` (waitFor board ready with 5 pins, `__cc.speed(4)`, photo wait). It replaces `:235-238` and is the only way the block below reloads; no `Page.reload` there. `goto`'s `Page.navigate` replies only once the new document's response is in (probe: 409 ms against a 400 ms-delayed server; `Page.reload` replies in 6 ms), so its readyState wait (`:198`) and every later `evaluate` run on the new document. A same-URL navigation is a full new document: localStorage and the injected scripts (`:84-85`) carry over, like a reload.
- **New "once a run" block** right after the sound check (`:258`), on the seeded first load, before any move. A `?seed=` game is never saved (`useAnimalSession.ts:59`, `:177`), so each `loadBoard()` re-deals the same round 1. Each check's detail is `JSON.stringify` of the `autoSwitch` result, as the existing checks do.
  1. Open the menu and `screenshot('02-menu-fresh-profile.png')`. Then `autoSwitch(false)`. Check: "a new profile (nothing stored) starts with Auto rule-out on, and its switch turns it off and stores 'off'". That means `storedBefore === null && before === 'true' && after === 'false' && storedAfter === 'off'`.
  2. `loadBoard()`, `autoSwitch(true)`. Check: "a stored 'off' starts off after a reload, and the switch turns it back on". That means `storedBefore === 'off' && before === 'false' && after === 'true' && storedAfter === 'on'`.
  3. `loadBoard()`, `autoSwitch(false)`. Check: "a stored 'on' starts on after a reload". That means `storedBefore === 'on' && before === 'true'`. It leaves the switch off, so round 1's pre-loop grid tests run as they did at baseline.
  - Cost: two board loads plus about 0.6 s per round, roughly 15-20 s on a 7-minute run.
- **Every round sets it on purpose.** Replace `:862-865` with `const set = await autoSwitch(mode === 'auto')` and the check `round ${n}: Auto rule-out set ${on|off} through the menu for this round` (`set.after === String(mode === 'auto')`).
- **Keep `:1146-1150`.** The auto round still turns the switch back off. Add a comment there: the resume and rise sections run with it off, and every non-auto round has set it off.
- **Artifact.** The suite writes `e2e-artifacts/<run>/` as before. The Verification copies `report.json`, the console log and the PNGs (including `02-menu-fresh-profile.png`) to `/srv/critter-ai/agent-state/missions/auto-rule-out-default/final-e2e/`, with no traces.

**Release smoke** (live, fresh profile; a one-off command, nothing committed):
- Script: `node` + `scripts/cdp.mjs` (`startBrowser`/`openPage`) opens `https://play.critterconnect.org/explore/?place=continent:africa`.
- A new player sees how-to-play first (`AnimalGame.tsx:263`): close it, then open the Menu before any board tap (the slide hint, `:264`, may show behind it). Read the `[role=switch]` "Auto rule-out" `aria-checked` (it must be `'true'`) and screenshot it into the mission folder.
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
| `CONTEXT.md:73` | `…; answers never rule anything out by themselves.` | `…; an answer rules nothing out by itself: the player does, or Auto rule-out (on by default) does when a suspect's shown answer differs from the camera's.` |

There is no content change, so no production content build is needed. Teachers.tsx changes, so the Verification adds `npm run site:build` + `npm run e2e:site` to typecheck, lint, `npm run build`, `npm test` and `npm run e2e:fresh`.

### Rejected alternatives

- **Keep `useState(false)` + effect:** safe today only because the async load comes later (F2). Correct by construction is simpler.
- **`useState(true)` + keep the effect:** two sources of truth, and a stored-'off' player renders on first.
- **`useSyncExternalStore` over localStorage:** machinery for a one-tab setting with a single writer.
- **New key `v2`, or rewriting null to `'on'`:** forbidden by the brief and unnecessary, since null already means "no choice".
- **Set the key via `addScriptToEvaluateOnNewDocument`:** it runs on every load, so it would overwrite the switch's choice and void the reload and fresh-profile checks.
- **A second Chrome profile for the fresh check:** the run's own profile is already fresh at its first load, and a second launch adds cost.
- **`Page.reload` + a readyState wait in `loadBoard()`:** also passed a 40-run probe, but only because Chrome holds `Runtime.evaluate` while a navigation is pending (`Page.reload` itself replies in 6 ms). `goto` is ordered by its own reply and keeps one load path.
- **Do the persistence checks on the resume section's existing reloads:** they depend on the round count, and no existing load has 'on' stored.

### Risks

- **Existing players who never touched the switch now get it on.** Intended: null means no choice.
- **`docs/ANIMAL_BOARD_PAPER.md`** (`:27-29`, §4.5) argues the player makes every rule-out and that random play wins 0%. With the switch on by default, random play that scouts answers gets the look-alikes marked, and they wander off by themselves. Those claims now hold only with the switch off. The paper is a 044-0 design record and out of scope, so don't edit it; say so in the Summary for the owner.
- **A future `npm run site:shots`** plays with the new default. `take.mjs`'s grid-marked trigger (the player's own slide, `:158-165`) may fire later or differently. That belongs to the owner's set-aside retake; mention it in the Summary.
- **E2E block reloads:** done only through `loadBoard()` (`goto`, so the new document is in before any `evaluate`; it re-applies `speed(4)`, which is page state). Canceled photo requests are already ignored (`e2e.mjs:74`). CI's PR e2e runs the same block and adds no DB writes.

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

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:

1. Extend E2E coverage to blocked storage and gameplay before changing the fresh-profile default. Current additions verify switch state and persistence; these cases would verify the default reaches gameplay.

## Revision notes

- **Fable MUST-FIX 1 (reload must wait for the new document): fixed.** `loadBoard()` now starts with `goto(<seeded URL>)` and replaces `:235-238`. The once-a-run block reloads only through it, with no `Page.reload`. Checked with a throwaway CDP probe (since deleted), using `scripts/cdp.mjs` against a local server delayed 400 ms. `Page.navigate` replied after 409 ms, so the new document is in when `goto` returns. `Page.reload` replied after 6 ms. `Page.reload` plus the readyState wait still saw the new document 40 times out of 40, because Chrome holds `Runtime.evaluate` while a navigation is pending. So the existing reloads (`:1261`, `:1320`, `:1357`, `:1372`) are sound, and they stay untouched.
- Fable SC1 (shorter `CONTEXT.md:73`): adopted, row rewritten.
- Fable SC2 (rename to `02b-…`): declined. `02b-marked.png` already uses that prefix, and `02-menu-fresh-profile.png` already sorts after `02-board*.png`.
- Fable SC3 (before/after in the check detail): adopted. Every new check's detail is the `JSON.stringify`'d `autoSwitch` result.
- Fable SC4 (release smoke: Menu before any board tap): adopted as one clause.
- Fable SC5 (Summary on `grid-marked.webp`): adopted (F5).
- Astra SC1, gameplay part: declined. The switch (`AnimalSheets.tsx:446`, `on={autoRuleOut}`) and the marking effect (`useAnimalSession.ts:276`) read the same `autoRuleOut` state. The fresh-profile check proves the default sets that state, and round 4 proves that state marks after every move. A default-gameplay move would repeat round 4's machinery and would disturb round 1's untouched pre-loop board.
- Astra SC1, blocked storage: declined. It isn't in the DoD's E2E list, and the code under test is a single `catch { return true; }`. Emulating it means a throwing `localStorage` getter injected into every new document and then removed. It would also bring back how-to and the slide hint, and run every other storage reader in the app under a throw. That is beyond "one default, its tests and its copy". Code review covers that line.

## Steps

All E2E runs: `export CHROME_PATH=/srv/critter-ai/agent-state/missions/auto-rule-out-default/bin/chrome` first (Baseline). Heavy jobs one at a time.

- [x] S1. **Default on + E2E sets it on purpose.** Code and suite in one step, so the suite is never red between sessions (`:864` and `:1073` fail under the new default alone).
  - `src/components/animalBoard/autoRuleOut.ts:1,5`: comment and `isAutoRuleOutOn` per Target design (`!== 'off'`, `catch { return true; }`). Key and `setAutoRuleOutOn` unchanged.
  - `src/components/animalBoard/useAnimalSession.ts:77-78`: `useState(isAutoRuleOutOn)`, delete the effect. `:273` comment per the Copy table.
  - `scripts/e2e.mjs`, per Target design:
    - Hoist `autoSwitch` to after `screenshot` (`:218`): opens the menu only if the switch isn't showing, returns `{ before, after, storedBefore, storedAfter }`. Delete the in-loop copy (`:848-861`).
    - `loadBoard()` = `goto(seeded URL)` + `:236-238`; replaces `:235-238`.
    - Once-a-run block after `:258`: three checks (fresh on → off + `'off'` stored, with `02-menu-fresh-profile.png` taken with the menu open first; reload → stored `'off'` starts off → on + `'on'` stored; reload → stored `'on'` starts on, left off). Detail = `JSON.stringify` of the result.
    - `:862-865`: per-round `autoSwitch(mode === 'auto')` + check `round ${n}: Auto rule-out set on|off through the menu for this round`.
    - `:1146-1150`: keep; add the comment.
  - Verify: `npm run typecheck`, `npm run lint`, `npm run e2e:fresh`. All checks pass, expected **1479** (1473 − 1 replaced + 3 once-a-run + 4 per-round); explain any other count in the Log. The four round lines in the console match `baseline-e2e/e2e.log` (same seed; rounds 1-3 still off). Open `02-menu-fresh-profile.png`: the Auto rule-out switch shows on.
  - Artifact: copy the run's `report.json`, `*.png`, the console log (`e2e.log`) and `COMMAND.txt` (command + commit + seed) to `/srv/critter-ai/agent-state/missions/auto-rule-out-default/s1-e2e/`. Delete `baseline-e2e/` (disk rule; its numbers stay under Baseline).
- [x] S2. **Copy and docs** (text only; no behavior change). Exact text from the Copy table:
  - `src/components/animalBoard/AnimalSheets.tsx:410` (comment), `:711` (how-to step 4 sentence; `:712` unchanged).
  - `src/clueGame/animalBoard.ts:429` (comment).
  - `src/site/pages/Teachers.tsx:64`, `:96`.
  - `docs/CLUE_MATCH.md:54`, `:96`, `:98`; `CONTEXT.md:73`.
  - Stale-copy scan: `rg -n -i "opt-in|off by default|off until|never rule|rule anything out" src docs CONTEXT.md scripts --glob '!docs/playtests/**'`. Allowed leftovers (not about Auto rule-out, or out of scope): `profiles.ts:41`, `CONTENT_SOURCES.md:25`, `traits.ts:13`, `questionMatch.ts:518`, `sfx.ts:2` (sound), `ANIMAL_BOARD_PAPER.md`. Anything else: fix it here.
  - Verify: `npm run typecheck`, `npm run lint`; `npm run site:build`, then the site E2E (Verification item 5) passes. No `e2e:fresh` here: the suite skips how-to (`e2e.mjs:84`) and no game behavior changed; S3 runs it.
- [x] S3. **Full Verification** (below) on the branch head. Save the artifact to `final-e2e/`. Check by eye, for the Summary: `02-menu-fresh-profile.png` shows the switch on; `src/site/shots/witness-note.webp` and `round-end.webp` are consistent with either setting (F5). Draft the Summary: every copy/doc line changed, before → after (from `git diff origin/main`); no production content build needed; `grid-marked.webp` shows a non-default state (F5), not retaken; `docs/ANIMAL_BOARD_PAPER.md` claims now hold only with the switch off (Risks); a future `site:shots` plays with the new default (Risks); Astra SC1 declined (Revision notes).

## Verification

E2E first. From `/srv/critter-ai/worktrees/auto-rule-out-default`, with `CHROME_PATH` exported as above, in order, one at a time; each must exit 0:

1. `npm run e2e:fresh`: every check passes (expected 1479). Must include:
   - `a new profile (nothing stored) starts with Auto rule-out on, and its switch turns it off and stores 'off'`
   - `a stored 'off' starts off after a reload, and the switch turns it back on`
   - `a stored 'on' starts on after a reload`
   - `round 1..4: Auto rule-out set off|off|off|on through the menu for this round`
   - unchanged: `:1073` (off: the game marks nobody), round 4's auto-marking checks, `the Auto rule-out switch turns back off`, resume and rise sections.
   - Same seed (7) = same run; the four round lines match `s1-e2e/e2e.log`.
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` (48/48; no new unit tests)
5. `npm run site:build && (python3 -m http.server 3101 -b 127.0.0.1 -d out/site >/tmp/auto-rule-out-site.log 2>&1 & echo $! >/tmp/auto-rule-out-site.pid) && npm run e2e:site; kill "$(cat /tmp/auto-rule-out-site.pid)"`: all site checks pass (Teachers page changed).
6. `npm run build`

No Failure modes section: nothing is tested in isolation.

**Artifact:** `/srv/critter-ai/agent-state/missions/auto-rule-out-default/final-e2e/`: `report.json`, `*.png` (incl. `02-menu-fresh-profile.png`), `e2e.log` (console + `time`), `COMMAND.txt`. No traces, no HTML report. Keep only `s1-e2e/` and `final-e2e/` there. Reproduce:
`CHROME_PATH=/srv/critter-ai/agent-state/missions/auto-rule-out-default/bin/chrome npm run e2e:fresh   # commit <sha>, seed 7`
The post-code-review final run (mission step 7) repeats 1-6 on the final commit and overwrites `final-e2e/`.

**Release smoke** (the Release unit, after `gh pr merge` + `deploy critter-connect`; nothing committed, no DB writes):
- `curl -s https://play.critterconnect.org/version.txt` reports the merge commit.
- `curl -s https://critterconnect.org/teachers/` returns 200 and contains the new `Auto rule-out` line (`Teachers.tsx:64`).
- One-off `node` script in `/tmp` using `scripts/cdp.mjs` (`startBrowser`/`openPage`, fresh profile, `CHROME_PATH` as above) opens `https://play.critterconnect.org/explore/?place=continent:africa`. Close how-to, then open the Menu before any board tap (Fable SC4). Read the `[role=switch]` "Auto rule-out" `aria-checked`: must be `'true'`. Screenshot to `/srv/critter-ai/agent-state/missions/auto-rule-out-default/release-menu-fresh-profile.png`.
- Record all three under `## Release`.

## Code review (Astra)

## Release

## Decisions

- S1: run 1 failed 1478/1479 on `round 3 move 10: a right guess just scouted sparkles` (time-limited `fresh` sparkle, round 3 has Auto rule-out off, load 2 on 2 cores); rerun passed 1479/1479 unchanged. Treated as a pre-existing timing flake, not in scope; run-1 log kept as `s1-e2e/e2e-run1-flake.log`.

## Log

- 2026-11-06 06:38 UTC · Baseline: typecheck, lint, 48/48 unit, E2E 1473/1473 pass.
- 2026-11-06 06:46 UTC · Architecture: `architect` wrote findings + target design (default `!== 'off'`, lazy `useState`, e2e once-a-run persistence block, 11 copy lines). Plan-only, no code; no checks needed.
- 2026-11-06 06:48 UTC · Fable review: APPROVE_WITH_CHANGES, 1 MUST-FIX (`loadBoard()` must wait for the new document after `Page.reload`). Plan-only; no checks needed.

- 2026-11-06 06:51 UTC · Astra review: APPROVE, no MUST-FIX; 1 SHOULD-CONSIDER (e2e: blocked storage + default reaching gameplay). Plan-only; no checks needed.

- 2026-11-06 06:56 UTC · Revision: `architect` fixed Fable MUST-FIX (`loadBoard()` = `goto(seeded URL)`, no `Page.reload` in new block; CDP probe confirmed). Adopted Fable SC1/3/4/5; declined SC2, Astra SC1 (reasons in Revision notes). Plan-only; no checks needed.

- 2026-11-06 06:59 UTC · Steps: `planner` wrote S1 (default + e2e), S2 (copy/docs), S3 (full Verification) and Verification/release smoke. Plan-only; no checks needed.

- 2026-11-06 07:17 UTC · S1: default `!== 'off'` (blocked storage: on), lazy `useState(isAutoRuleOutOn)`, e2e hoisted `autoSwitch` + `loadBoard()` + once-a-run fresh/'off'/'on' checks + per-round set. typecheck, lint ok; e2e 1479/1479 (2nd run; 1st had 1 sparkle timing flake, see Decisions), round lines = baseline, `02-menu-fresh-profile.png` shows switch on. Artifact `s1-e2e/`; `baseline-e2e/` deleted.

- 2026-11-06 07:20 UTC · S2: copy/docs per Copy table (AnimalSheets 410/711, animalBoard 429, Teachers 64/96, CLUE_MATCH 54/96/98, CONTEXT 73). Stale scan: only allowed leftovers. typecheck, lint ok; site:build ok, e2e:site 444/444; built teachers page has new line.

- 2026-11-06 07:31 UTC · S3: full Verification on `2206eafa`: e2e 1479/1479 (round lines = `s1-e2e`; 3 once-a-run + 4 per-round checks pass), typecheck, lint, 48/48 unit, site:build + e2e:site 444/444, `npm run build` all exit 0. `02-menu-fresh-profile.png` shows switch on; `witness-note.webp`/`round-end.webp` fit either setting. Artifact `final-e2e/`. Summary drafted.

## Summary


Draft (S3; finalised after code review). New players (nothing stored) now start with **Auto rule-out on**; a stored `'off'` or `'on'` wins; blocked storage → on. Same key `critter-connect:auto-rule-out:v1`, nothing migrated.

**Code:** `autoRuleOut.ts` (`getItem(KEY) !== 'off'`, `catch → true`); `useAnimalSession.ts` (lazy `useState(isAutoRuleOutOn)`, effect removed, so no first move with it off; `/explore` is `ssr: false`, no hydration path). `scripts/e2e.mjs`: once-a-run fresh-on / stored-off / stored-on checks across reloads, and every round sets the switch through the menu.

**Copy/doc lines changed (before → after):**
- `AnimalSheets.tsx:410` (comment): "Opt-in: the game rules out…" → "On by default: the game rules out…"
- `AnimalSheets.tsx:711` (How to play, step 4): appended "After each move, **Auto rule-out** rules out every animal with a shown answer that doesn't match; turn it off in the menu to do it all yourself."
- `animalBoard.ts:429` (comment): "Auto rule-out (opt-in setting)" → "Auto rule-out (a menu setting, on by default)"
- `useAnimalSession.ts:273` (comment): "(opt-in)" → "(on unless the player turned it off)"
- `autoRuleOut.ts:1` (comment): now says on by default, a stored 'off' wins.
- `Teachers.tsx:64`: "The answers never rule anyone out by themselves. Students compare…" → "Students compare… After each move, Auto rule-out (on unless it's turned off in the game's menu) rules out any animal whose scouted answer differs from the camera's. A ruled-out animal…"
- `Teachers.tsx:96`: "One student plays; the other…" → "One student plays with Auto rule-out off (in the game's menu); the other…"
- `docs/CLUE_MATCH.md:54`: "(menu switch, off by default, kept on the device)" → "(menu switch, on by default, kept on the device; a stored "off" wins)"
- `docs/CLUE_MATCH.md:96`: "Round 4 turns on Auto rule-out, …" → "Each round sets Auto rule-out through the menu: on in round 4, …; off in the others."
- `docs/CLUE_MATCH.md:98`: added "a new profile starts with Auto rule-out on (02-menu-fresh-profile.png), its switch turns it off and on, and a stored "off" or "on" survives a reload;"
- `CONTEXT.md:73`: "answers never rule anything out by themselves." → "an answer rules nothing out by itself: the player does, or Auto rule-out (on by default) does when a suspect's shown answer differs from the camera's."

**Verification:** e2e 1479/1479 (was 1473; +3 once-a-run, +4 per-round, −1 replaced), typecheck, lint, unit 48/48, e2e:site 444/444, build. Artifact `/srv/critter-ai/agent-state/missions/auto-rule-out-default/final-e2e/` (`02-menu-fresh-profile.png` shows switch on; `COMMAND.txt` reproduces).

**For the owner:**
- No production content build needed (no content change).
- Site shots not retaken (set aside): `grid-marked.webp` now shows a non-default state (player-marked Okapi beside an unmarked, mismatching Chimpanzee, which the new default would mark); `witness-note.webp` and `round-end.webp` fit either setting.
- A future `npm run site:shots` plays with the new default; `take.mjs`'s grid-marked trigger (player's own slide) may fire differently.
- `docs/ANIMAL_BOARD_PAPER.md` (§4.5, `:27-29`: the player makes every rule-out; random play wins 0%) now holds only with the switch off. Design record, not edited.
- Declined Astra SC1 (e2e for blocked storage / default reaching gameplay); reasons in Revision notes.
- Existing players who never touched the switch now get it on (intended: no stored value = no choice).
