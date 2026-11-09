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
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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
  <CategoryMark category={category} word={false} className="h-(--line-xs) shrink-0 text-neutral-7" />
  <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-xxs p-0">
    {signs: <li key={tag} data-sign={tag} className={CHIP}>{text}</li>}
  </ul>
</li>
```
- **Icon:** 14 px (the `CategoryMark` default, same as the headings), centred in a box exactly one chip line tall: `h-(--line-xs)`, the token `text-xs` chips use (16 px; same pattern as `EvidenceGrid`'s `h-(--ev-row)`). **Constraint:** the icon box never exceeds `--line-xs`. The split measures chip bottoms only, so a taller icon box would hang below a one-line group's chips and past a page's bottom unmeasured. Tying it to the token makes this structural; the code comment on `SignGroups` states it, and says the audit tunes gaps only, not the icon box. The icon is neutral-7 like the headings, with no fill, so it reads as a label, not a sign.
- **Chips** are unchanged (`CHIP`, 16 px tall). They aren't tappable, so the 24 px target rule doesn't apply. At 390 px the box is 186 px wide (342 − 144 photo − 12 gap) and the chips column 168 px (− 14 icon − 4 gap).
- **Outer list:** `m-0 flex list-none flex-col gap-xxs p-0`, the groups stacked at the same 4 px pitch as the lines inside a group. The audit may tune the gaps; the measurement takes whatever gap there is.
- **Cost (measured, not estimated):** a static copy of this layout in the e2e's Chrome build (chromium-1208), Nunito 700 from `public/fonts`, every content animal's signs. At 390 px the box is 186 × 106 px (photo 108 + 4 + caption 14 − label 16 − 4) and holds 5 lines. 23 of the 76 animals page. Seed 7: none of round 1 (4–5 lines each), round 2's Chimpanzee (2 pages), round 3's Chimpanzee and Aardvark. At 320 px (box 116 × 106) round 1's 14 and 41 take 2 pages each, with a whole-group move. The brief accepts this (paging stays). The architecture's first estimate (14 and 41 page at 390) was wrong; the screenshot plan below is fixed for it.

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
- **Screen readers:** the pages showing, the measuring list and the counter stay `aria-hidden`. `<ul className="sr-only" data-sign-list aria-label="Signs">` has one `li` per group: `{CATEGORY_LABELS[category]}: {texts.join(', ')}`. This list is where the category word reaches the reader; inside the hidden pages, `CategoryMark`'s own name is hidden along with them. The `aria-label` names the list like 055's sign lists did (`aria-label` on the `ul`).

**`signPages(groups, boxes, height): SignGroup[][]`** is pure and module-level, next to `GuideSigns`. It is a query, and `split` is the command that sets state.
```
items = groups.flatMap((group, g) => group.signs.map(sign => ({ g, sign })))  // boxes[i] belongs to items[i]
// once, before the loop:
firstOf[g] = index in items of g's first chip; lastOf[g] = index of its last
span[g] = boxes[lastOf[g]].bottom - boxes[firstOf[g]].top
pages: number[][] = []; top = 0
for each item i (group g, box b):
  page = pages.at(-1)                                  // undefined on the first item
  if (!page || b.bottom - top > height):
    from = page ? page.indexOf(firstOf[g]) : -1        // -1: no page yet, or g didn't start on this page
    if (from > 0 && span[g] <= height) { moved = page.splice(from); pages.push(moved); top = boxes[moved[0]].top }  // move the group whole
    else { pages.push([]); top = b.top }
  pages.at(-1).push(i)
return each page as runs of one g -> { category, signs }
```
- **From the old split:** the same loop and the same test (`447e9317:283-287`). New: the group index, `firstOf`/`span` computed once, and the keep-together branch.
- **What it guarantees:**
  - pages of whole lines, no taller than the box;
  - a group that breaks starts each later page with its icon, because each run renders its own;
  - a group that fits on a page but would break mid-page starts the next page whole;
  - a group taller than a page breaks only at line ends;
  - no lone icon: the icon sits on its group's first line, and every run holds at least one chip.
- **Edge cases:**
  - no signs: nothing renders;
  - box not laid out yet (height 0): one page;
  - a chip wider than its column (320 px phones): its words wrap inside the chip, and it's measured that way. Measured at 320 px (chips column 98 px): the tallest chip of any animal is 2 text lines (32 px), and the widest single word ("underground", 87 px) fits, so nothing overflows sideways;
  - a chip taller than the box: it opens its own page. So does any later chip on its line, since the line shares one bottom. Every item is pushed onto exactly one page in one forward pass, so nothing loops and nothing is dropped. The page shows the chip's top lines, clipped (as before), and the screen-reader list has it whole. This case doesn't occur at supported sizes: the 106 px box (5 lines) is over 3 times the tallest chip at 320 px, page zoom scales the photo with the text, and the font tokens are px, so a larger default font size doesn't grow chips. The S3 check (E2E) holds the 320 px case;
  - a resize (window, desktop, or the e2e's forced box): the `ResizeObserver` re-splits and goes back to page 1;
  - a new animal: remount, page 1, not paused;
  - one page: no counter, button, timer or mark.

**Guide rows:** see finding 1.

**Imports:** add `useLayoutEffect`, `useMemo`, `AnimatePresence`, `Pause`, `type ChargeCategory` and `type Sign`. `CATEGORY_LABELS` stays (the screen-reader list uses it), and `CHIP` moves to its only user.

### E2E (`scripts/e2e.mjs`, seed 7 `continent:africa`, the default)

**In-page helpers**, put on `window` in the `sheets` evaluate (`:999`) the way `__mark` is:
- `__signs()` reads the open sheet. It first waits (`__until`) until exactly one `[data-sign-page]` is mounted, so a read during the crossfade can't pick up the exiting page:
  - `pages` = `Number(box.dataset.guideSigns)` (one source, no separate count), `page` (from `data-sign-page`), `height` (the box's `clientHeight`);
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
- **S3** (natural size at 320×720, all 5 sheets; `sideNotesAt(320, 720, true)`, then back to `PHONE`): "on a 320 px phone the signs page instead of overflowing: every page fits, groups and icons as S1, the pages together are the list". It applies P1's rules to the unforced box. Measured: 14 and 41 take 2 pages here, each by a whole-group move, and wrapped chips (2 lines, 32 px) pass `fits`. This covers Astra's 320 px item on the real layout.
- **E2** (`:1049`): same meaning, with `bearing` read from the groups in `all`, worded "…while its category's signs show beside the photo".
- **E3** (`:1065`): extended so each sign group's svg `lucide-*` class equals the icon on its category's tiles and headings.
- **Forced paging** (a new evaluate after `sheets`): for each of the 5 sheets, set `box.style.flex = 'none'; box.style.height = '40px'; box.style.width = '144px'`, wait 300 ms, run `__allPages()`, then clear the style. That also exercises the resize re-split.
  - **Why 40 × 144 px:** 40 px holds two chip lines (36 px). That is the floor: with one-line pages every group starts a page, so no move can happen. 144 px (a 126 px chips column, narrowed from the natural 186 px box) makes multi-line groups, which give the splits. The measuring `ul` is `inset-x-0`, so it re-wraps, and the `ResizeObserver` re-splits. Fixing the width also makes the run independent of the viewport and the photo column.
  - **Measured** (same Chrome build and font, seed 7 round 1): at 144 × 40 there are **2 splits** (14 habits: `webbed feet · squeaker | puffs up · burrower`; 41 habits: `senses vibrations · fruit eater | seed spreader · salt licks`) and **1 move** (13 habits: `red orange | sticky skin · burrower`). The other breaks are full pages, and no chip wraps.
  - **Margin:** the same breaks hold for any width from 137 to 148 px. At least 1 split and 1 move hold for any width from 96 to 188 px. Below 137 px, chips wrap ("rests by waterfalls"), which still passes but muddies `fits`. So narrowing to ~96 px (Fable's example) was rejected.
  - **P1**: "signs that don't fit split into pages; each part follows its icon, in category order, and fits; the pages together are the list, in order".
    - At least one sheet has pages > 1.
    - Every page passes S1's group rules and `fits`.
    - The pages' runs, joined (merging a run that continues the previous page's last), equal `all`.
  - **P2**: "a group that fits on a page starts the next page whole; a longer one breaks at a line and repeats its icon; no break comes early". It uses the offsets in `all`. For each break, T is the top of page k's first chip and F is page k+1's first chip:
    - **Same group (a split):** needs `F.bottom − T > height`, and either that group is page k's only run or its `span > height`.
    - **New group:** `F.bottom − T ≤ height` counts as a move and needs `span ≤ height`; otherwise the page was full.
    - Required: at least 1 split, at least 1 move, 0 bad. No fallback: the forced box is fixed at 144 × 40 (measured above). If content changes break this, the failure says so; the fix is a new width, recorded under Decisions, never a taller box (taller makes splits rarer).
  - **P3** (old `:987-988`), on the sheet with the most signs, box forced (144 × 40):
    - the page turns by itself within 5.6 s;
    - a tap pauses: `aria-pressed` true, the mark shows, and the page holds for 5.6 s;
    - another tap resumes and moves on: `aria-pressed` false;
    - flipping to the next animal remounts its box at natural size, so it may have one page and no button. The check reads "`data-sign-page` = 1 and no `[aria-pressed="true"]` in the box", not "the button is unpressed", so a one-page neighbour passes.
- **Removed:** 055's `besidePhoto`, `inList`/`ul[data-signs]` and `row.signs` checks, and the "none beside the photo" wording.
- **No product test hook:** forcing the box height works whatever the content, so the dev bridge needs nothing new.
- **Screenshots** (390×844):
  - the existing `02d-field-guide-{light,dark}.png` (the first row's animal, one page);
  - new `02f-signs-page-{1,2}-{light,dark}.png`, at natural size, of the first sheet that pages at 390 px (pause, shoot page 1, tap tap, shoot page 2). None of round 1's does (measured, above). So at the start of each later round, before its first move and while no such sheet has been shot, the e2e opens the guide, flips through the 5 numbers reading `data-guide-signs`, and stops at the first > 1. For seed 7 that is round 2's Chimpanzee: 2 pages, body and habits, then life. After the shots it closes the guide and drops the pick, as the round-1 block does, so the rounds still match the baseline. A check that such a sheet was found before the last round makes a missing shot fail loudly;
  - `02g-signs-desktop.png` at 1280×800 (the viewport `sideNotesAt` uses), the same sheet, then back to `PHONE`;
  - all copied to `M/shots/`.
- **Final run:** the baseline's guarded dev-copy run (`current_database()` = `phaser_june_dev`). It drops 055's V3 `content -- build/check`: nothing in the content changes, so it adds nothing. The rounds must match the baseline (Hairy Frog found, Hirola lost, Golden-rumped Sengi found, African Forest Elephant found).

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
- **A taller forced box (60 px) as P2's fallback** (first draft): with 3-line pages a split needs a 4-line group, so it makes splits rarer. Narrowing the box is what makes splits (Fable MUST-FIX 1).
- **Forcing ~96 px wide** (Fable's example): chips wrap below 137 px. 144 px gives the same split and move with one-line chips.
- **An enlarged-text E2E run**: the font tokens are px, and page zoom scales the photo, box and chips together. The 320 px check (S3) is the reflow case. A chip taller than the box is handled (its own page, the screen-reader list whole) and doesn't occur at supported sizes.
- **Growing the box to fit a chip taller than it**: that breaks "the photo alone sets the row height" for a case that doesn't occur. The old clip stays.
- **The paging shots from a forced box or at 320 px**: the brief asks for 390×844 at natural size. Round 2's start gives a real one.

## Architecture review (Fable)

Read `agent/signs-beside-photo` @ `7751918a`; checked `AnimalSheets.tsx` (current and `447e9317`), `CategoryMark.tsx`, `signs.ts`, `questionMatch.ts:12-39`, `scripts/e2e.mjs` (current `:999-1065`, old `:908-988`), `globals.css` (`--line-xs` 16 px, `--space-xxs` 4 px), `motion.ts` (`SMALL` 0.16 s).

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **P2's fallback goes the wrong way** (plan `:199-203`). A *split* needs a group with `span > height`; a *move* needs a group with `span ≤ height` that starts mid-page. At 40 px (2 lines of 16 px + 4 px gap) a split needs a 3-line group; raising the box to 60 px (3 lines) makes a split need a 4-line group, so the fallback makes the required split *less* likely while the check still demands `≥ 1 split`. With 5 suspects of 4–7 signs spread over up to 5 categories, a 3-line group at the ~168 px column isn't assured. Fix: keep 40 px and, as the fallback (or outright), also narrow the box (`box.style.width = '96px'` or similar: the measuring `ul` is `inset-x-0`, so it re-wraps and the `ResizeObserver` re-splits). Narrower lines make multi-line groups (splits) likelier without changing what a move needs. Don't go below 40 px: with one-line pages every group starts a page, `from > 0` never holds, and no move can happen. Record the chosen width under Decisions.

MISSED:
- **The `!page` branch in `signPages`** (plan `:141-143`): `from = index in page of g's first chip` is evaluated before `page` exists on the first item. Trivial, but the implementation must guard it (`from = page ? page.indexOf(firstOf[g]) : -1`), else the first item throws. Also precompute `firstOf[g]` (index of g's first item) rather than searching the page.
- **Icon box taller than a chip line breaks the height test** (plan `:113`, `:115` "the audit may tune the gaps"). The split measures chip bottoms (`b.bottom - top`), not the group `li`'s bottom. With `items-start`, an icon box taller than 16 px hangs below a one-line group's chips and can poke past the page bottom unmeasured. State the constraint in the code comment: the icon box stays ≤ `--line-xs` (16 px), or the gap tuning stays on the gaps only.
- **P3's last step** (plan `:208`): after flipping to the next animal the box is remounted at natural size, so that animal may have one page and no pause button. The check must read "page 1 and no `aria-pressed=true`", not "button unpressed", or it fails on a one-page neighbour.

Verified correct (no change): the algorithm is a single forward pass (no loop); the splice branch sets `top` to the moved group's first chip, and every later chip of that group satisfies `b.bottom − top ≤ span[g] ≤ height`, so a moved group can't overflow; `from > 0` keeps the old page non-empty and the new page holds at least g's first chip, so no empty page; `from === 0` with `span ≤ height` is unreachable (contradiction with the overflow test), so the else branch there is only ever the `span > height` split; the chip's `offsetParent` is the `absolute` measuring `ul` (no positioned element between: `li.flex`, `ul.flex`, `CategoryMark`'s `inline-flex` are all static), so `offsetTop` is relative to the right ancestor; same-line chips share a bottom (flex default stretch), so an overflowing chip is at a line start and a continuation run re-wraps identically from x = 0. Finding 1 is real (`AnimalSheets.tsx:102` vs `447e9317:101`). Finding 4 is real (`447e9317:308`). E2E hooks, `__allPages` (450 ms > 2 × 160 ms crossfade under `mode="wait"`) and S1/S2/P1 are feasible and deterministic given the seed. DRY (`SignGroups` for both lists), CQS (`signPages` query, `split` command), KISS (old pager + one rule) and E2E-first all hold; nothing over-engineered for the brief.

SHOULD-CONSIDER:
1. Compute `span[g]` and `firstOf[g]` once up front from `boxes`, not inside the loop.
2. In `__signs`, read `shown` via `[data-sign-page]:last-of-type` or wait until exactly one exists, so a read during a crossfade can't pick the exiting page.
3. The `sr-only` list is the only place the category word reaches a screen reader beside the photo; `aria-label="Signs"` on it (or `aria-labelledby` the `h3`) ties it to the heading.
4. `data-guide-signs` already carries `pages.length`; drop the separate `pages` read in `__signs` and use it (one source).
5. Keep 055's `content -- build/check` out of the final run as the architect suggests; nothing in content changes.

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:

1. Make E2E coverage deterministic for both group splitting and whole-group moves; increasing box height alone cannot guarantee both.
2. Validate 320 px and enlarged-text layouts. The photo-constrained height needs a readable fallback when an individual chip cannot fit.

## Revision notes

All changes are in **Architecture**. The widths and line counts come from a static copy of the layout in the e2e's Chrome (chromium-1208), with Nunito 700 and every content animal's signs.
- **Fable MUST-FIX 1** (P2 fallback taller): adopted, and the fix replaces the fallback outright. The forced box is now 144 × 40 px (width narrowed, height kept at 40). Measured: 2 splits and 1 move; the same breaks hold from 137 to 148 px, and ≥ 1 of each from 96 to 188 px. Changed in: E2E "Forced paging" (why, measured, margin), P2 (no fallback), P3. Rejected alternatives: 60 px, ~96 px.
- **Fable MISSED `!page` guard + precompute**: adopted. `signPages` pseudocode: `firstOf`/`lastOf`/`span` computed once, `from = page ? page.indexOf(firstOf[g]) : -1`.
- **Fable MISSED icon ≤ `--line-xs`**: adopted, structurally. The icon box is `h-(--line-xs)`, not `h-4`, and the `SignGroups` code comment states the constraint. Changed in: "A group" code block and Icon bullet.
- **Fable MISSED P3 last step**: adopted. It reads `data-sign-page` = 1 and no `aria-pressed="true"`.
- **Fable SC1** (precompute): adopted (same edit as the `!page` guard).
- **Fable SC2** (crossfade read): adopted. `__signs` waits for exactly one `[data-sign-page]`.
- **Fable SC3** (name the sr list): adopted. `aria-label="Signs"` on `[data-sign-list]` (Screen readers bullet).
- **Fable SC4** (one source for the page count): adopted. `pages` = `data-guide-signs`.
- **Fable SC5** (drop V3 content build/check): adopted. Final run bullet.
- **Astra SC1** (deterministic split + move): adopted, with Fable MUST-FIX 1.
- **Astra SC2** (320 px / enlarged text / a chip taller than the box):
  - 320 px: adopted as the new **S3** check (natural box at 320×720; 14 and 41 page there, by whole-group moves).
  - Enlarged-text run: rejected. The tokens are px and page zoom scales everything together (Rejected alternatives).
  - The tall-chip behaviour is now stated in Edge cases: own page, one forward pass, none dropped, clipped, the screen-reader list whole. It doesn't occur at supported sizes: the tallest chip anywhere at 320 px is 32 px, against a 106 px box.
- **Own correction found while measuring:** "14 and 41 page at 390 px" was wrong. No round-1 sheet pages at 390 (the box holds 5 lines). The Cost bullet now has measured numbers. The `02f` shots now come from the first sheet that pages at a later round's start (seed 7: round 2's Chimpanzee) instead of an existence check that would have failed.

## Steps

`M` = `/srv/critter-ai/agent-state/missions/signs-beside-photo`. V1–V4 = Verification below. Each step ends with V1, then (if it says so) V2 into `M/e2e-s<N>/`, then V3 with the step's check substrings. Check names below are exact: V3 matches on them.

- [ ] S1 · **Grouped signs beside the photo; guide rows lines only; retarget 055's sheet checks.** The core change plus the checks that read it, so the suite stays green.
  - `src/components/animalBoard/AnimalSheets.tsx`, per Architecture "Target design":
    - Port `GuideSigns` and `SIGN_PAGE_MS = 5000` from `447e9317:270-333` / `:41`. Props `{ signs: readonly Sign[] }`; `groups` via `CHARGE_CATEGORIES` in `useMemo`; `type SignGroup`; `pages: SignGroup[][]` starts `[groups]`.
    - New `SignGroups({ groups })`: renders the group `li`s (Architecture code block) for both the measuring `ul` (`data-sign-measure`, `invisible absolute inset-x-0 top-0`, `aria-hidden`) and the shown `motion.ul` (`data-sign-page={page + 1}`, `absolute inset-0`). Code comment: icon box is `h-(--line-xs)`, never taller than a chip line, because the split measures chip bottoms only; tune gaps, not the icon box.
    - New module-level pure `signPages(groups, boxes, height)` per the pseudocode (`firstOf`/`lastOf`/`span` once; `from = page ? page.indexOf(firstOf[g]) : -1`; move whole when `from > 0 && span[g] <= height`). `split()` reads `[data-sign]` offsets from the measuring list and calls `setPages(signPages(…))`, `setPage(0)`. `ResizeObserver`, timer, `turn`, `AnimatePresence` and the pause button stay as in `447e9317`.
    - Pause mark `paused && pages.length > 1` (finding 4). Box keeps `data-guide-signs={pages.length}`. `<ul className="sr-only" data-sign-list aria-label="Signs">`: one `li` per group, `{CATEGORY_LABELS[category]}: {texts.join(', ')}`.
    - Photo row (after the `figure`, `:209`): `{animal.signs.length > 0 && <GuideSigns key={animal.id} signs={animal.signs} />}`.
    - Guide rows (finding 1): `guides` back to `lines.length > 0 ? [{ key, lines }] : []`; drop the `ul[data-signs]` and its `pt-xxs`; rewrite the `:98` comment. `data-guide-cat`, the `CategoryMark` heading and `data-guide-line` stay.
    - Imports: `useLayoutEffect`, `useMemo`, `AnimatePresence`, `Pause`, `type ChargeCategory`, `type Sign` (`@/clueGame/questionMatch`). `CHIP` moves next to its only user.
  - `scripts/e2e.mjs`, the `sheets` evaluate (`:999`) and its checks (`:1029-1065`):
    - Add `window.__signs()` and `window.__allPages()` next to `__mark`, per Architecture "In-page helpers" (`__until` for exactly one `[data-sign-page]`; `pages` from `data-guide-signs`; `all`/`shown` groups with `cat`, `first`, `marks`, `tags`, `icon` via `__mark`, per-chip `offsetTop`/`offsetHeight` from `all`; `fits`; `sr`; `aria-pressed`; pause svg shown. `__allPages` taps with the old pointerdown/up + click `tap` and waits 450 ms per turn).
    - Per sheet read: `pages: await window.__allPages()`, `all`, `outside` (count of `[data-sign]` not inside `[data-guide-swipe] [data-guide-signs]`), and `rows` without `signs`. Drop `besidePhoto`, the `signs`/`inList` read and `row.signs`.
    - Replace the E1 check (`:1041`) with **S1** `field guide: signs sit beside the photo, grouped in the guide's category order, one icon per group before its chips; none hidden, none in the guide rows` (Architecture S1 rules, incl. `sr` and every `[data-guide-cat]` row having ≥ 1 line and its own mark) and **S2** `field guide: the signs showing fit beside the photo, chips one line tall` (`fits` on every page).
    - E2 (`:1049`): `bearing` from the groups in `all`; name `field guide: a dealt question's guide lines stay hidden while its category's signs show beside the photo`.
    - E3 (`:1065`): also compare each sheet's sign-group `icon` with the tile's; name `each question tile, its answer row, its guide heading and its sign group carry the same category icon`.
  - Before V2: `rm -rf e2e-artifacts` (the worktree still holds the baseline run; its copy is in `M/baseline-e2e/`).
  - Checks: V1; V2 → `M/e2e-s1/`; V3 with `'signs sit beside the photo' 'the signs showing fit beside the photo' 'signs show beside the photo' 'its sign group carry the same category icon'`. The existing `the drawer keeps one height and its photo row one place` check must still pass (the lists sit out of flow). Look at `02d-field-guide-light.png` (chips grouped beside the photo, one icon per group) and `02e-field-guide-rows-light.png` (rows, no chips).

- [ ] S2 · **Forced paging and 320 px checks (P1, P2, P3, S3).** Proves `signPages` on the real layout; the riskiest logic.
  - `scripts/e2e.mjs`, in the round-1 block right after E3:
    - New evaluate: open the guide; for each of the 5 sheets set the box's `style.flex = 'none'; height = '40px'; width = '144px'`, wait 300 ms, read `all` and `__allPages()`, clear the style. Then P3 on the sheet with the most signs, box forced (Architecture P3: turns within 5.6 s; tap pauses, `aria-pressed` true, mark shows, holds 5.6 s; tap resumes and moves on, `aria-pressed` false; flip to the next animal: `data-sign-page` = 1 and no `[aria-pressed="true"]` in the box). Clear the style, close, drop the pick.
    - Node-side checks, per Architecture: **P1** `field guide: signs that don't fit split into pages; each part follows its icon, in category order, and fits; the pages together are the list, in order`. **P2** `field guide: a sign group that fits on a page starts the next page whole; a longer one breaks at a line and repeats its icon; no break comes early` (T/F rule; ≥ 1 split, ≥ 1 move, 0 bad; no fallback; detail lists each break). **P3** `field guide: signs in pages turn on their own, a tap pauses them, another resumes and moves on`.
    - **S3**: `await sideNotesAt(320, 720, true)`; evaluate: open the guide, `__allPages()` for each of the 5 sheets, close, drop the pick; `await sideNotesAt(...PHONE)`. Check `field guide: on a 320 px phone the signs page instead of overflowing: every page fits, groups and icons as at 390, the pages together are the list` (P1's rules on the unforced box, incl. ≥ 1 sheet with pages > 1; measured: 14 and 41).
  - If P1, P2 or S3 fails on a real `signPages`/`GuideSigns` bug, fix it in `AnimalSheets.tsx` in this step. If the content no longer gives a split and a move at 144 × 40, pick a new width (never taller) and record it under Decisions.
  - Checks: V1; V2 → `M/e2e-s2/` (delete `M/e2e-s1/`); V3 with S1's substrings plus `'split into pages' 'starts the next page whole' 'turn on their own' 'on a 320 px phone the signs page'`. P2's detail shows 14 and 41 split, 13 moved (Architecture "Measured").

- [ ] S3 · **Screenshots: one page, paging (both pages), desktop.**
  - `scripts/e2e.mjs`:
    - In the `guide` evaluate (`:871`), also read the first row's sheet `data-guide-signs` and chip count; check `field guide: the 02d shot's sheet shows its signs on one page` (signs > 0, pages = 1).
    - In the round loop, after the round checks and before the pencil step (`:1321`), when `n > 1` and no paging sheet is shot yet: open the guide on the first row, flip the numbers 1–5 reading `data-guide-signs`, stop at the first > 1. If found, for light then dark (set and restore the theme as the 02d block does, `:880-898`): pause, shoot `02f-signs-page-1-<mode>.png`, tap tap, wait 450 ms, shoot `02f-signs-page-2-<mode>.png`. Then `sideNotesAt(1280, 800, false)`, wait for the re-split, shoot `02g-signs-desktop.png`, `sideNotesAt(...PHONE)`. Close the guide, drop the pick.
    - After the loop: check `field guide: a sheet whose signs page at 390 px was found and shot (both pages, light and dark, and at 1280 px)`, detail = round, animal, pages (seed 7: round 2, Chimpanzee, 2).
  - Checks: V1; V2 → `M/e2e-s3/` (delete `M/e2e-s2/`); V3 with all substrings (V3 list); rounds still equal the baseline (the shot block plays no move). Then V4's copy into `M/shots/`, and look at each shot (groups, counter `1/2`, pause mark, both themes, desktop).

- [ ] S4 · **One `graphical-audit` pass against `GUI.md`.**
  - Run `.agents/skills/graphical-audit` on `M/shots/` (390 px light/dark, one page and both pages; 1280 px; guide rows); findings to `M/audit.md`.
  - Fix within the theme: gaps and spacing only (`AnimalSheets.tsx`; `CategoryMark.tsx` only for a size tweak the audit truly needs); the icon box stays `h-(--line-xs)`; no new colour; colour never the only cue; WCAG 2.2 AA (lint's theme check). Keep both the within-group and the between-group row gap ≤ 8 px, or the 40 px forced box no longer holds two lines and P2 can't see a move. Record each call (or "no change") under Decisions.
  - Checks: V1. If code changed: V2 → `M/e2e-s4/` (delete `M/e2e-s3/`), V3 with all substrings, V4 copy (refresh `M/shots/`). If P2 now fails, prefer reverting the gap; otherwise apply S2's width rule.

- [ ] S5 · **Docs, code comments, plan 058.**
  - `CONTEXT.md` `:81`, `:85`, `:89`; `docs/CLUE_MATCH.md:54`; `docs/CONTENT_SOURCES.md:69`: wording per Architecture "Docs and plan".
  - Comments: `src/clueGame/signs.ts:1-2`, `src/components/animalBoard/CategoryMark.tsx:1-4` (signs beside the photo in their category's group).
  - New `plans/058-signs-beside-photo.md` in 057's shape: what changed, why, decisions (hanging layout, keep-together rule, 144 × 40 forced box, audit calls), no version bump, DB none, verification commands, artifact and shot paths (final run filled in at S6).
  - Unchanged: `plans/README.md`, plan 055, `ANIMAL_RULES.version`, content, DB.
  - Checks: V1; `rg -n "under (its|the|one) (question )?categor|guide rows|after that category" CONTEXT.md docs/CLUE_MATCH.md docs/CONTENT_SOURCES.md src/clueGame/signs.ts src/components/animalBoard` shows no stale "signs in the guide rows" text; paths named in edited docs exist. No E2E (comments and docs only).

- [ ] S6 · **Verification.** Run V1–V4 in order; V2 → `M/final-e2e/` (delete `M/baseline-e2e/`, keep the latest `M/e2e-s*/`); V3 with all substrings; V4. Fill plan 058's verification line (check count, artifact path). Log the results. Mission rule 7 repeats V1–V4 after the Astra code review and replaces `M/final-e2e/`.

## Verification

From the repo root `/srv/critter-ai/worktrees/signs-beside-photo`, one heavy job at a time (never two E2E runs, or an E2E beside a build). No unit tests are written: `signPages` is proven by P1, P2 and S3 on the real layout (Architecture, Rejected alternatives), so there's no Failure modes section. Known VPS flake: 1–3 timing checks (row-slide press, re-order click, sparkle) may fail on a run; rerun once; a check failing twice is real.

**V1. Static**, each exit 0:
1. `npm run typecheck`
2. `npm run lint` (eslint + theme contrast)
3. `npm test` (66/66 pass)
4. `npm run content -- preview > /tmp/preview-after.txt && diff /srv/critter-ai/agent-state/missions/signs-beside-photo/preview-before.txt /tmp/preview-after.txt` prints nothing (no PROBLEM lines; content unchanged).

**V2. Dev-copy E2E** (plan 055's guarded block, minus its `content -- build/check`; Decisions). Never `.env.local`; never print `DATABASE_URL` or `cat` the dev-copy file. If the guard fails, stop and add a handoff item to refresh the file. Bash timeout 1800000 ms (a run takes ~11 min).
```
M=/srv/critter-ai/agent-state/missions/signs-beside-photo
rm -rf e2e-artifacts
( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
  [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
  E2E_SEED=7 E2E_PLACE=continent:africa CHROME_PATH=/srv/critter-ai/agent-state/missions/moves-and-signs-build/chrome-nosandbox.sh npm run e2e:fresh )
mv "$(ls -d e2e-artifacts/*/ | tail -1)" "$M/<folder>"   # e2e-s<N> for a step, final-e2e for S6
```
Disk: at most two artifact folders in `M`. Steps keep `baseline-e2e/` and the latest `e2e-s*/` (delete the older `e2e-s*/` after the new run); S6 deletes `baseline-e2e/` and keeps the latest `e2e-s*/` and `final-e2e/`. `mv`, not `cp`, so the worktree holds no copy.

E2E scenarios: the existing suite (globe → continent → 4 rounds → resume → journal → sources; 055's E4 witness-note marks and E5 no `:no` column unchanged) plus S1, S2, E2, E3 (S1 step), P1, P2, P3, S3 (S2 step), the 02d one-page and 02f/02g paging-shot checks (S3 step).

**V3. Artifact must show**: 0 failed checks, rounds equal the baseline, and every given substring names a passing check:
```
node -e 'const [f,...want]=process.argv.slice(1),r=require(f),bad=r.checks.filter(c=>!c.ok).map(c=>c.name),rounds=r.rounds.map(x=>x.mystery+":"+x.outcome).join(", "),miss=want.filter(w=>!r.checks.some(c=>c.ok&&c.name.includes(w)));console.log(r.checks.length,"checks |",bad.length,"failed",bad,"|",rounds,"| missing:",miss);process.exit(bad.length||miss.length||rounds!=="Hairy Frog:found, Hirola:lost, Golden-rumped Sengi:found, African Forest Elephant:found"?1:0)' "$M/<folder>/report.json" \
  'signs sit beside the photo' 'the signs showing fit beside the photo' 'signs show beside the photo' 'its sign group carry the same category icon' \
  'split into pages' 'starts the next page whole' 'turn on their own' 'on a 320 px phone the signs page' \
  'shows its signs on one page' 'signs page at 390 px was found'
```
Steps pass only the substrings of checks added so far (each step lists them). The final run passes all ten and must exit 0.

**V4. Shots and audit** (brief's named location): copy from the run's folder to `$M/shots/`: `02d-field-guide-{light,dark}.png` (one page), `02e-field-guide-rows-{light,dark}.png` (rows, no chips), `02f-signs-page-{1,2}-{light,dark}.png` (paging, both pages, 390×844 natural size), `02g-signs-desktop.png` (1280×800): 9 files, `ls $M/shots/02[defg]-*` lists them all. `$M/audit.md` holds the one `graphical-audit` pass (S4). Reproduce: V2 with the same seed and place.

**Release** (runner's unit, `Release: deploy`): rebase on `origin/main`, rerun V1–V3, push, open the PR, `gh pr merge <n> --merge`, `deploy critter-connect`; smoke `curl -sL -o /dev/null -w '%{http_code}' https://play.critterconnect.org/explore/` = 200 and `curl -s https://play.critterconnect.org/version.txt` = the merge commit. No production content build.

**Risks / open questions**
- P2 rests on the measured 144 × 40 box (2 splits, 1 move). A gap change (S4) or new content after a rebase can remove the split or the move; P2 then fails loudly, and the fix is a new width, recorded under Decisions, never a taller box.
- The 02f search depends on some later round dealing a sheet that pages at 390 px (seed 7: round 2's Chimpanzee). If a rebase changes the deal, the after-loop check fails; then pick a seed whose later round pages, record it under Decisions, and check the rounds against a fresh run instead of the baseline.
- Waits after forcing the box (300 ms) and between page turns (450 ms) assume the VPS keeps up; if one flakes twice, replace the fixed wait with `__until` on the state it waits for (page count, `data-sign-page`), not a longer sleep.
- Plan number 058 is free today; if another branch takes it before the release rebase, renumber.

## Code review (Astra)

## Release

## Decisions

- 2026-11-09 (Revision): E2E forced box for P1–P3 is **144 × 40 px**, fixed with no fallback. Measured in the e2e's Chrome: 2 splits (14, 41) and 1 move (13). The same breaks hold from 137 to 148 px, and ≥ 1 split and ≥ 1 move from 96 to 188 px. If content changes break it, choose a new width; never make the box taller.
- 2026-11-09 (Revision): rejected the 60 px fallback (it makes splits rarer) and ~96 px (chips wrap below 137 px).
- 2026-11-09 (Revision): the icon box is `h-(--line-xs)`, so it can never be taller than one chip line.
- 2026-11-09 (Revision): rejected an enlarged-text E2E run: the tokens are px and page zoom scales everything; S3 at 320 px covers reflow. A chip taller than the box keeps the old clip-on-its-own-page; growing the box was rejected.
- 2026-11-09 (Revision): the `02f` paging shots come from the first sheet that pages at 390 px at a later round's start (seed 7: round 2's Chimpanzee), because no round-1 sheet pages at 390.
- 2026-11-09 (Revision): the final run drops 055's V3 `content -- build/check`; no content changes.

## Log

- 2026-11-09 00:50 UTC: Baseline. typecheck/lint/test (66/66)/preview 0; dev-copy E2E 1565/1565, artifact `M/baseline-e2e/`.
- 2026-11-09 01:07 UTC: Architecture. Hanging layout (one icon column per group), pure `signPages` with keep-together rule, guide rows back to lines only; E2E S1/S2/P1-P3 via forced 40 px box. Plan only, no code.
- 2026-11-09 01:15 UTC: Fable review. APPROVE_WITH_CHANGES; 1 MUST-FIX (P2 fallback: narrow box width, not taller), 3 small misses. Plan only.
- 2026-11-09 01:13 UTC: Astra review. APPROVE, no MUST-FIX; 2 SHOULD-CONSIDER (deterministic split+move E2E; 320 px/large-text chip fallback). Plan only.
- 2026-11-09 01:24 UTC: Revision. Forced E2E box 144×40 px (2 splits, 1 move measured), signPages guard+precompute, icon h-(--line-xs), S3 320 px check, all Fable SC adopted; enlarged-text run rejected. Plan only.
- 2026-11-09 01:35 UTC: Steps. planner wrote S1–S6 (core port+retarget checks, forced paging/320 px, shots, audit, docs/plan 058, verification) and V1–V4. Plan only.

## Summary
