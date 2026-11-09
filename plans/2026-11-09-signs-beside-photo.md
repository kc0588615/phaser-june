---
mission: signs-beside-photo
project: critter-connect
branch: agent/signs-beside-photo
status: active
started: 2026-11-09 00:40 UTC
---

# Mission: Signs back beside the photo, grouped by category (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

On the species sheet, the sign chips go back in the box beside the species photo, as they were before plan 055 (`GuideSigns`, removed in PR #66; the last version is `src/components/animalBoard/AnimalSheets.tsx` at `447e9317`, `function GuideSigns`). This time they're **grouped by category**: each group starts with **one** category icon (`CategoryMark`, the same icon set as the guide headings: Body, Habits, Habitat, Range, Life cycle), followed by that category's chips. No icon on each chip. Done looks like this:

- Beside the photo: a "Signs" label, then the groups in the guide's category order, each as `[icon] chip chip chip`. Groups with no signs don't show.
- **Auto-paging, as before:** when the chips don't fit the box beside the photo, they split into pages that turn by themselves (`SIGN_PAGE_MS`), with the page count `1/2` beside the label, tap to pause, the pause mark, and a screen-reader list of all signs. Measure-and-split as the old `GuideSigns` did (`ResizeObserver`, the photo alone sets the row height).
- **A group split across pages repeats its icon** at the top of the next page, so every chip on screen sits after its category's icon. Prefer page breaks between groups when a group fits whole on the next page; don't leave a lone icon at the bottom of a page.
- **The guide rows lose their chips:** each category row in the field guide shows its guide lines only, as before 055. A row with no lines (for example, all hidden by plan 045 while its question is dealt) doesn't show.
- Everything else from 055 stays: signs are never hidden, the reworded signs, the category marks on guide headings, "Its answers" rows, question tiles and witness notes, 045's hiding of the asked guide lines, `signProblems`.
- The icon carries its category word as its accessible name (`CategoryMark` already does); colour is never the only cue.

### Why

The owner wants the signs back where players first look, beside the photo, with the auto-paging that let long lists fit. Plan 055 moved them into the guide rows; the owner prefers the old place, keeping the category link but with one icon per category instead of per chip, so the box stays readable.

### Scope

In:
- `src/components/animalBoard/AnimalSheets.tsx` (bring back `GuideSigns`, grouped; remove the signs from the guide rows), `CategoryMark.tsx` only if it needs a size or caption tweak.
- `scripts/e2e.mjs`: the sign checks from 055 (they read `data-signs` / `data-sign` inside the guide rows) now read the box beside the photo: groups in category order, one icon per group, every chip after its category's icon on every page, paging turns when there are more chips than fit (pick a suspect with many signs), pause works.
- `plans/058-signs-beside-photo.md` (or the next free number) and the docs that say where signs show (`CONTEXT.md`, `docs/CLUE_MATCH.md`, plan 055's notes are history and stay).

Out:
- Content, signs table, rules and deal logic. No `ANIMAL_RULES.version` bump (nothing a round deals changes).
- The witness notes, the question tiles and "Its answers" rows.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0.
- `npm run e2e:fresh` passes on the dev copy `phaser_june_dev` only, with the guarded block from plan 055 (`plans/2026-11-08-moves-and-signs-build.md`, V3). Never against `.env.local`; never print `DATABASE_URL` or `cat` the dev-copy file.
- Screenshots at 390×844, light and dark, of a sheet with one page of signs and one that pages (both pages), plus a desktop width, in `/srv/critter-ai/agent-state/missions/signs-beside-photo/`; one `graphical-audit` pass against `GUI.md` on them.
- Release `deploy`: merge, `deploy critter-connect`, smoke `/explore` 200 and `version.txt` = the merge commit. No production content build needed.

### Decision rules

- Start from the old `GuideSigns` code rather than writing a new pager; change only what grouping needs.
- Icon size and spacing may be tuned to fit the box beside the photo at 390 px; keep chips at least 24 px tall as tap targets only if they're tappable (they aren't today).
- If grouping can't fit sensibly at phone width, say why in the plan and show the best option in the screenshots; don't drop the paging.

### Notes

- Start from a fresh `origin/main` (after ft-cleanup and frog-fact-fixes merge).
- Signs data: `animal.signs` (`{ tag, text, category }`) and `CATEGORY_LABELS`, as the guide rows use them on main now.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `agent/signs-beside-photo` @ `80de5c36` (= `origin/main` `fd7ecea1` + mission start). `node_modules` present; no migrations in this repo. Old pager: `src/components/animalBoard/AnimalSheets.tsx` at `447e9317` (`GuideSigns` line 270, `SIGN_PAGE_MS = 5000` line 41).
- `npm run typecheck` 0, `npm run lint` 0, `npm test` 66/66 pass, `npm run content -- preview` 0 (no PROBLEM lines; output `/srv/critter-ai/agent-state/missions/signs-beside-photo/preview-before.txt`).
- `npm run e2e:fresh` on dev copy (`current_database()` guard = `phaser_june_dev`, no-sandbox Chrome wrapper `/srv/critter-ai/agent-state/missions/moves-and-signs-build/chrome-nosandbox.sh`), seed 7, `continent:africa`: **1565/1565 checks** (rounds: Hairy Frog found, Hirola lost, Golden-rumped Sengi found, African Forest Elephant found). Artifact `/srv/critter-ai/agent-state/missions/signs-beside-photo/baseline-e2e/`.

## Architecture

Read from `agent/signs-beside-photo` @ `c6d98616` (= `origin/main` `fd7ecea1` + baseline; `git fetch` ok). Old pager: `447e9317`. `M` = `/srv/critter-ai/agent-state/missions/signs-beside-photo`.

### Findings (by impact)

1. **Guide rows show for signs alone** (`AnimalSheets.tsx:98-103`, `:252-268`). A row passes when `lines.length > 0 || signs.length > 0`, and `ul[data-signs]` sits in its `dd` (`:259-263`). Take the chips out and keep that filter, and a category whose lines plan 045 hides (a dealt `diet` with Habits signs, for example) renders a heading over an empty `dd`. That breaks the brief's rule that a row with no lines doesn't show. Fix: go back to `lines.length > 0` (as `447e9317:99-102`), and drop the chips `ul` and its `pt-xxs` toggle. `data-guide-cat`, the `CategoryMark` heading and `data-guide-line` stay.
2. **The old split assumes one flat flow** (`447e9317:279-292`). It lays the chips out once in a hidden copy and gives each page whole lines of that layout. The pages render the same because each one starts at a line start. Put group icons inline in that flow and both properties break:
   - an icon repeated at the top of a continuation page pushes that line's chips right, so they re-wrap and the page can overflow;
   - an icon can end a line while its chips go to the next one (a lone icon, at a page bottom too).

   Fix (target design): a hanging layout. Each group is its own block of lines with a fixed icon column, so a line never mixes groups, a repeated icon takes no width from the chips, and a page's lines render exactly as measured. The split stays the old per-chip loop, plus a group index and one keep-together rule.
3. **The old pager E2E can't prove the grouped rules** (`447e9317` `e2e.mjs:919-922`, `:950-968`, `:986-988`). It finds the page showing by class (`ul.inset-0`) and the counter by `previousElementSibling.textContent`. It forces paging by shrinking the photo to 32 px, which leaves one-line pages (so a keep-together move can never happen) and widens the chips column. Fix: data hooks and a forced box height (E2E below).
4. **The pause mark can show with one page** (`447e9317:308`, `{paused && <Pause/>}`). A resize that re-splits to one page while paused leaves the mark, and the button is gone, so nothing clears it. Fix: `paused && pages.length > 1`.
5. **Stale "signs in the guide rows" text**: `CONTEXT.md:81`, `:85`, `:89`; `docs/CLUE_MATCH.md:54`; `docs/CONTENT_SOURCES.md:69`; the comments at `signs.ts:1-2`, `CategoryMark.tsx:1-4` and `AnimalSheets.tsx:98`.

Checked and fine:
- **`animal.signs`** (`questionMatchContent.ts:143`; `Sign { tag, text, category }`, unique tags in tag order, throws at load on an unknown tag) is everything the pager needs. No `signs.ts` logic change.
- **`CategoryMark`** needs no change: `word={false}` keeps the word for screen readers, `className` sets its box, and its 14 px icon matches the headings.
- **The old split is correct for a flat list**: whole lines per page; a chip taller than the box gets its own page, clipped; no loop. `ResizeObserver` watches the box and the hidden list, `key={animal.id}` resets the page and the pause, and `useLayoutEffect` splits before paint.
- **No CSS to restore**: the old pager was all Tailwind (`git log -S GuideSigns -- src/styles/globals.css` is empty). `eslint.config.mjs` hasn't changed since `447e9317`, so the old hook pattern still lints.
- **Reduced motion**: the old pager turned pages regardless. `MotionConfig reducedMotion="user"` (`_app.tsx:19`) skips only transform and layout animations (motion 14, `visual-element-target.mjs:84`), so the page crossfade (opacity only) stays, and nothing moves. Tap to pause, a focusable button over the box, meets WCAG 2.2.2. Keep it.

### Target design

All code is in `src/components/animalBoard/AnimalSheets.tsx`.

**Photo row** (`:202-209`): after the figure, `{animal.signs.length > 0 && <GuideSigns key={animal.id} signs={animal.signs} />}` (as `447e9317:209`). An animal with no signs shows the photo alone. The lists sit out of flow, so the photo alone sets the row height, as before.

**A group** (one helper, `SignGroups({ groups })`, renders the `li`s for both the hidden measuring list and the page showing, so the two lay out the same):
```
<li data-sign-group={category} className="flex items-start gap-xxs">
  <CategoryMark category={category} word={false} className="h-4 shrink-0 text-neutral-7" />
  <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-xxs p-0">
    {signs: <li key={tag} data-sign={tag} className={CHIP}>{text}</li>}
  </ul>
</li>
```
- **Icon:** 14 px (the `CategoryMark` default, same as the headings), centred in a 16 px box, which is one chip line (`text-xs`, 16 px line). It's neutral-7 like the headings and has no fill, so it reads as a label, not a sign.
- **Chips** are unchanged (`CHIP`, 16 px tall). They aren't tappable, so the 24 px target rule doesn't apply. Their column at 390 px is about 168 px (342 − 144 photo − 12 gap − 18 icon).
- **Outer list:** `m-0 flex list-none flex-col gap-xxs p-0`, the groups stacked at the same 4 px pitch as the lines inside a group. The audit may tune the gaps; the measurement takes whatever gap there is.
- **Cost:** every group starts a new line, so more animals page than before. By estimate, 14 and 41 in seed 7's round 1 take 2 pages at 390 px. The brief accepts this (paging stays).

**`GuideSigns({ signs }: { signs: readonly Sign[] })`** is the old component (`447e9317:270-333`), changed only here:
- **Groups:** `groups = useMemo(() => CHARGE_CATEGORIES.flatMap(category => { const of = signs.filter(s => s.category === category); return of.length ? [{ category, signs: of }] : []; }), [signs])`, typed `SignGroup = { category: ChargeCategory; signs: readonly Sign[] }`.
- **State:** `pages: SignGroup[][]`, starting as `[groups]`; `page` and `paused` as before.
- **`split()`:**
  - Reads `height = box.clientHeight` and the chips, `all.current.querySelectorAll('[data-sign]')`. DOM order is the groups' order.
  - Returns early on height 0 or no chips.
  - Otherwise runs `setPages(signPages(groups, chips.map(c => ({ top: c.offsetTop, bottom: c.offsetTop + c.offsetHeight })), height))`, then `setPage(0)`.
  - Offsets are relative to the measuring `ul`, the only positioned ancestor.
- **Unchanged:** the `ResizeObserver` on the box and the hidden list, the `SIGN_PAGE_MS = 5000` timer, `turn`, the `AnimatePresence` page and the pause button. The pause mark gets the finding 4 fix.
- **Hooks:**
  - the box: `data-guide-signs={pages.length}` (kept);
  - the measuring `ul`: `data-sign-measure`;
  - the shown `motion.ul`: `data-sign-page={page + 1}`;
  - the screen-reader list: `data-sign-list`.
- **Screen readers:** the pages showing, the measuring list and the counter stay `aria-hidden`. `<ul className="sr-only" data-sign-list>` has one `li` per group: `{CATEGORY_LABELS[category]}: {texts.join(', ')}`. This list is where the category word reaches the reader; inside the hidden pages, `CategoryMark`'s own name is hidden along with them.

**`signPages(groups, boxes, height): SignGroup[][]`** is pure and module-level, next to `GuideSigns`. It is a query, and `split` is the command that sets state.
```
items = groups.flatMap((group, g) => group.signs.map(sign => ({ g, sign })))  // boxes[i] belongs to items[i]
span[g] = bottom of g's last chip - top of g's first chip
pages: number[][] = []; top = 0
for each item i (group g, box b):
  page = last page
  if (!page || b.bottom - top > height):
    from = index in page of g's first chip (-1 if g didn't start on this page)
    if (from > 0 && span[g] <= height) { pages.push(page.splice(from)); top = boxes[new page[0]].top }  // move the group whole
    else { pages.push([]); top = b.top }
  push i onto the last page
return each page as runs of one g -> { category, signs }
```
- **From the old split:** the same loop and the same test (`447e9317:283-287`). New: the group index and the keep-together branch.
- **What it guarantees:**
  - pages of whole lines, no taller than the box;
  - a group that breaks starts each later page with its icon, because each run renders its own;
  - a group that fits on a page but would break mid-page starts the next page whole;
  - a group taller than a page breaks only at line ends;
  - no lone icon: the icon sits on its group's first line, and every run holds at least one chip.
- **Edge cases:**
  - no signs: nothing renders;
  - box not laid out yet (height 0): one page;
  - a chip wider than its column (320 px phones): its words wrap inside the chip, and it's measured that way;
  - a chip taller than the box: its own page, clipped (as before);
  - a resize (window, desktop, or the e2e's forced box): the `ResizeObserver` re-splits and goes back to page 1;
  - a new animal: remount, page 1, not paused;
  - one page: no counter, button, timer or mark.

**Guide rows:** see finding 1.

**Imports:** add `useLayoutEffect`, `useMemo`, `AnimatePresence`, `Pause`, `type ChargeCategory` and `type Sign`. `CATEGORY_LABELS` stays (the screen-reader list uses it), and `CHIP` moves to its only user.

### E2E (`scripts/e2e.mjs`, seed 7 `continent:africa`, the default)

**In-page helpers**, put on `window` in the `sheets` evaluate (`:999`) the way `__mark` is:
- `__signs()` reads the open sheet:
  - `pages`, `page`, `height` (the box's `clientHeight`);
  - `all` (the measuring list) and `shown` (the page showing), each as `[{ cat, first: the first child's data-category-mark, marks: count, tags, per-chip offsetTop/offsetHeight (from all only), offsetHeight }]`;
  - `fits`: every shown chip is inside the box rect and no taller than 2 line heights (the old `:922` rule);
  - `sr`: the `[data-sign-list] li` texts;
  - the pause button's `aria-pressed`, and whether the pause svg shows.
- `__allPages()`:
  - one page: return the page showing;
  - otherwise tap (pause) and read; then, pages − 1 times, tap, tap (turn, pause again), wait 450 ms and read;
  - it returns the pages in order, using the old `tap` helper (pointerdown/up, then click, so the row's drag guard resets).

**Checks** (they replace 055's E1 at `:1046`; seed 7's round-1 suspects 7, 11, 13, 14 and 41 have 4–7 signs):
- **S1** (natural size, all 5 sheets, during play): "signs sit beside the photo, grouped in the guide's category order, one icon per group before its chips; none hidden, none in the guide rows".
  - No `[data-sign]` outside `[data-guide-swipe] [data-guide-signs]`.
  - The tags in `all`, sorted, equal the pool's open tags.
  - Groups run strictly in body, habits, habitat, range, life order.
  - Each group has `marks === 1` and `first === cat`.
  - A tag sits in the same group on every sheet.
  - `sr` has one item per group, starting `CATEGORY_WORD[cat]: `.
  - Every `[data-guide-cat]` row has at least one `[data-guide-line]`, and its heading's mark equals the row's category.
- **S2**: "the signs showing fit beside the photo, chips one line tall" (old `:986`), for every page of each sheet (`__allPages` when there's more than one).
- **E2** (`:1049`): same meaning, with `bearing` read from the groups in `all`, worded "…while its category's signs show beside the photo".
- **E3** (`:1065`): extended so each sign group's svg `lucide-*` class equals the icon on its category's tiles and headings.
- **Forced paging** (a new evaluate after `sheets`): for each of the 5 sheets, set `box.style.flex = 'none'; box.style.height = '40px'` (two chip lines), wait 300 ms, run `__allPages()`, then clear the style. That also exercises the resize re-split.
  - **P1**: "signs that don't fit split into pages; each part follows its icon, in category order, and fits; the pages together are the list, in order".
    - At least one sheet has pages > 1.
    - Every page passes S1's group rules and `fits`.
    - The pages' runs, joined (merging a run that continues the previous page's last), equal `all`.
  - **P2**: "a group that fits on a page starts the next page whole; a longer one breaks at a line and repeats its icon; no break comes early". It uses the offsets in `all`. For each break, T is the top of page k's first chip and F is page k+1's first chip:
    - **Same group (a split):** needs `F.bottom − T > height`, and either that group is page k's only run or its `span > height`.
    - **New group:** `F.bottom − T ≤ height` counts as a move and needs `span ≤ height`; otherwise the page was full.
    - Required: at least 1 split, at least 1 move, 0 bad.
    - If seed 7's round 1 doesn't give both at 40 px, use 60 px (3 lines) and record that under Decisions.
  - **P3** (old `:987-988`), on the sheet with the most signs, box forced:
    - the page turns by itself within 5.6 s;
    - a tap pauses: `aria-pressed` true, the mark shows, and the page holds for 5.6 s;
    - another tap resumes and moves on: `aria-pressed` false;
    - flipping to the next animal starts its signs on page 1, not paused.
- **Removed:** 055's `besidePhoto`, `inList`/`ul[data-signs]` and `row.signs` checks, and the "none beside the photo" wording.
- **No product test hook:** forcing the box height works whatever the content, so the dev bridge needs nothing new.
- **Screenshots** (390×844):
  - the existing `02d-field-guide-{light,dark}.png` (the first row's animal, one page);
  - new `02f-signs-page-{1,2}-{light,dark}.png`, of the round-1 sheet with the most pages at natural size (pause, shoot page 1, tap tap, shoot page 2). A check that such a sheet exists makes a missing shot fail loudly;
  - `02g-signs-desktop.png` at 1280×800 (the viewport `sideNotesAt` uses), the same sheet, then back to `PHONE`;
  - all copied to `M/shots/`.
- **Final run:** the baseline's guarded dev-copy run (`current_database()` = `phaser_june_dev`). Nothing in the content changes, so 055's V3 `content -- build/check` adds nothing here; the planner decides whether to keep it. The rounds must match the baseline (Hairy Frog found, Hirola lost, Golden-rumped Sengi found, African Forest Elephant found).

### Docs and plan

- **New `plans/058-signs-beside-photo.md`** (058 is free: `plans/` ends at 057, and no remote branch has 058 or higher). Same shape as 057: what changed, why, decisions (the hanging layout, the keep-together rule), verification, shot paths.
- **`CONTEXT.md`:**
  - `:81` Field guide: "its signs beside its photo, one group per category led by that category's mark; a long list pages";
  - `:85` Sign: "shown beside the photo in its category's group";
  - `:89` Category mark: adds "each group of signs beside the photo".
- **`docs/CLUE_MATCH.md:54`:** "each sits under the category … after that category's lines" becomes the grouped box beside the photo, with 5 s pages and tap to pause (plan 058); the marks sentence adds the sign groups.
- **`docs/CONTENT_SOURCES.md:69`:** "in the field guide under one question category" becomes "beside the field guide's photo, in its category's group".
- **Code comments** from finding 5.
- **Unchanged:** `plans/README.md` (its index stops at 053), plan 055 (history), `ANIMAL_RULES.version`, content and the DB.

### Rejected alternatives

- **Flat flow with icons inline** (groups share lines, the icon glued to its first chip): denser, but a repeated icon re-wraps a continuation page's first line, so the pages no longer match the single measurement, and groups blur mid-line.
- **Re-measuring each candidate page**: more renders and state. The brief says to start from the old measure-once code.
- **`signPages` in `src/clueGame/signs.ts`**: it works on pixel boxes, which is a layout concern; `signs.ts` is the game's vocabulary (out of scope).
- **`GuideSigns` in its own file**: it shares `LABEL` and `CHIP` with `SuspectSheet`, so that would need an import cycle or a new module for one component. Its old home was `AnimalSheets.tsx`.
- **An icon on each chip**: the brief rules it out, and 055's mockups found it doubles chip width.
- **One group per page**: wastes the box on one-sign groups and pages nearly every animal.
- **A scrolling box**: the brief keeps auto-paging, and a scroller inside the swipe row fights the drag.
- **No auto-turn under reduced motion**: changes the brief's behaviour. The crossfade isn't movement, and the pause meets WCAG 2.2.2.
- **A dev-bridge hook to inject many signs**: product code for a test. Forcing the box height from the e2e does the same job.
- **A unit test for `signPages`**: the owner prefers E2E, and P1/P2 check the same rules on the real layout.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-09 00:50 UTC: Baseline. typecheck/lint/test (66/66)/preview 0; dev-copy E2E 1565/1565, artifact `M/baseline-e2e/`.
- 2026-11-09 01:07 UTC: Architecture. Hanging layout (one icon column per group), pure `signPages` with keep-together rule, guide rows back to lines only; E2E S1/S2/P1-P3 via forced 40 px box. Plan only, no code.

## Summary
