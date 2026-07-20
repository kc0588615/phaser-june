# Plan 018: Six-Move Evidence-Family Expeditions

## Status

Implemented in the worktree for engine, compiler, API, approved six-species corpus, silhouette gems, ticker, family rail, roster, onboarding, MapLibre HUD, public map snapshot, and spaced-site generation. Supersedes Plan 017 for newly created v3 runs. Existing v1/v2 runs keep their original flows. Migration 026, the six reviewed deduction profiles, 30 family cards, 120 family hints, and 15 cascade hints are applied to the live database. Local development enables v3 with `EXPEDITION_CASE_VERSION=3`; deployed environments remain independently flag-controlled.

**Scope note**: the Expedition Map HUD expansion landed with the core work: MapLibre replaces the in-run Cesium panel for v3, while Cesium stays mounted for region selection and legacy flows. Self-hosted PMTiles remains deferred; the first cut uses the MapLibre demo style unless `NEXT_PUBLIC_MAP_STYLE_URL` overrides it.

## Player Loop

Each expedition has three research sites. At every site the player makes exactly six legal Match-3 moves. Every successful move advances the site meter, so a site cannot fail (stakeless-by-design; tension lives in what to steer toward, not what to avoid).

Only gems cleared by the player's direct move add evidence. Cascades remain visual and scoring rewards but add no evidence. Cleared cells are counted once, using their family.

### Families and gems

The gem IS the family icon — silhouette carries meaning at a glance. Not a colored square with a label overlay.

| Family | Gem | Player question | Content domain |
|---|---|---|---|
| Relatives | Red DNA helix | "Who are its cousins?" | Taxonomy, lineage |
| Body | Orange paw print | "What does it look like?" | Size, covering, movement, anatomy |
| Behavior | Yellow eye | "What does it do?" | Activity, communication, social behavior |
| Habits | Green leaf/fang | "What does it eat?" | Diet, foraging, ecological role |
| Place | Blue map pin | "Where does it live?" | Range, biome, landscape context |

Renamed `ecology` → `habits` at the family key level to remove overlap with Place in the player's mental model. Habits = food/foraging; Place = geography.

### HUD (always visible, no dropdowns, no modals)

Three persistent surfaces frame the match-3 board:

1. **Ticker** (top): scrolling marquee of soft hint lines emitted live as gems clear. See "Live Hint Ticker" below.
2. **Family legend + meters** (side): five family rows with gem icon, one-word meaning, current site total, and a "carry" pip if evidence carried forward. Locked families show a padlock and the trait phrase learned (e.g., "Body: striped").
3. **Candidate roster** (bottom): six species portraits with names, always on screen. Per-portrait state:
   - **Alive**: full color.
   - **Eliminated**: red X animation on reveal, then desaturated + strikethrough. Stays on screen. One-word reason under portrait ("not striped", "plant eater").
   - **Answer** (post-correct-guess): gold border.
   - Each portrait shows five family dots. Once a family's clue reveals, **every** candidate's dot for that family lights up with a mini icon of *that species'* trait phrase — so the player can read the contrast: tiger has stripes, elephant has a trunk, that's why elephant was struck. Eliminated portraits render their dots in dim/struck style. The roster is the journal.
   - Tap a portrait any time to open a small card listing the trait phrases learned so far for that species.
   - The final guess screen reuses the roster: tapping an alive portrait is the guess. No separate species picker.

4. **Evidence log** (persistent, above the field dossier): three slots, one per selected family, populated as clues reveal. Each earned clue renders as three lines:
   - **Observation** — the raw finding ("Body is covered in overlapping keratin scales").
   - **Inference** — what it implies ("Only one candidate has scaled armor").
   - **Ruled out** — the species this clue struck ("Elephant, tiger, addax").

   All three earned clues stay visible for the rest of the run. The log is never truncated to a single line or reduced to short phrases; that compression discards the reasoning trail the roster is meant to teach.

### Offer rule

After move six at each site, rank unused families by total and offer every family tied at or above the second-place total. Rules:

- If only one unused family clears the second-place bar, pull in the next-highest even at zero clears so at least two families are always offered.
- Offers can therefore be 2, 3, 4, or 5 items. The choice UI renders a variable list, not a hardcoded pair.
- At site 3, the same rule applies over the three remaining unused families.

The player selects one offered family. The server applies one reviewed, fixed-strength clue, automatically removes incompatible candidates, resets the selected family total to zero, and locks it. Locked gems stop spawning, leaving five, four, then three families across the route. Three distinct clues must leave one to three candidates for the final species guess. Wrong guesses may be revised.

There are no quality tiers, thresholds, signature clues, interpretation predictions, or guess citations in v3. Evidence strength is not tied to gem totals. Score remains server-compatible but is hidden from v3 rendering; moves are shown as the six-step site meter.

## Live Hint Ticker

Every direct match (3+ of a color) fires one **hint line** for that family into the ticker. The ticker is a field-radio feed — flavored as field-team chatter — that gives the player intuition about the answer without spoiling the deduction clue.

Design rules:

- Ticker lines are **soft** restatements of the same underlying trait as the family's hard deduction clue. They rhyme with it; they never state it.
- Each `(species, family)` pair has 3–5 authored ticker lines, ordered by revealing power. First direct match in a site fires index 0, next fires index 1, and so on; cycle if exhausted.
- Selection is deterministic per case seed and derived server-side. The hint payload rides on the existing `charge-updated` event as `hintLine: string | null`. Never derive hints client-side or the full pool leaks to devtools.
- Cascade lines are a separate, non-informational pool ("the trail deepens", "multiple sightings confirmed"). Cascades trigger them; they carry no family and no tag. Pure juice.
- Ticker shows one stationary line for four seconds, then advances through the feed in order and loops.

Safety invariant added to the compiler (see below): every ticker line's underlying tag must be the same as or weaker than the family's hard-clue tag, AND must not uniquely identify the answer among the six-species corpus. Otherwise the ticker itself becomes the solve.

## Facts and GIS

Each answer has one reviewed clue and one reviewed post-identification fact per family. The three selected-family facts unlock only after a correct guess; no answer-specific fact appears anonymously during play.

Between sites, show a short field-journal travel entry derived from stored waypoint data and existing GIS layers. V3 templates use defensible distance wording such as "near" and "approaching"; they never claim crossing, entering, or being inside a feature without a stored spatial relation. Cultural geography, new climate layers, and sensitive-place data are deferred.

## Expedition Map HUD

Once an expedition is started, the in-run panel currently occupied by the CesiumJS globe is replaced by a top-down 2D **Expedition Map HUD**. Cesium remains the pre-expedition surface (region selection) and the end-of-run recap surface (post-guess flourish). The map HUD is only for the in-run experience.

### What it shows

The HUD is a single panel with two connected surfaces:

1. **Map view** (upper region): a stylized 2D top-down map, framed like a field notebook or topo sheet — muted terrain fill, thin contours, water in blue, protected areas as tinted polygons. Not Google Maps; readable at a glance without labels dominating.
2. **Readout** (lower region): the same evidence log + roster + travel journal already specified in the HUD section. The map does not replace the readout; the map sits *above* the same information the player already sees. This is why "readout like you show, but add a map at scale" is the right framing: the map extends the readout, it doesn't compete with it.

### Scale and framing

Target reference scale is **~1:3,000,000** for the default view. At that scale, ~1 cm on a phone screen ≈ 30 km real world, which shows a full regional biome (e.g., a Sahel band, a Sundaland corridor). Concretely:

- Default zoom auto-fits the three research sites plus 20% padding, clamped between ~1:500,000 (max zoom, single-site detail) and ~1:6,000,000 (min zoom, full regional context). If the auto-fit falls outside the clamp, use the nearer clamp.
- The player can pinch/scroll zoom freely within those bounds.
- Fullscreen mode (button in map corner) expands the panel to a fullscreen overlay and unlocks a wider zoom range for exploration. Escape or a close button returns to the panel size. The board and other HUD surfaces remain live in the background but visually dimmed.

### Node spacing (expedition generation change)

To make ~1:3M framing consistently show meaningful landmarks (protected areas, major rivers, biome boundaries), enforce during run creation:

- Minimum **150 km** great-circle distance between any two of the three research sites.
- Maximum **800 km** between any two, so all three still fit inside one regional map view.
- All three sites must fall inside a single contiguous biome or realm boundary; do not span oceans or jump continents.
- If the generator cannot satisfy these constraints for a given answer species within N attempts, fall back to relaxed spacing (100 km minimum) and log a diagnostic. Never fail run creation on this.

This is a change to expedition generation, not the map. It must land alongside the map or nodes will still cluster too tightly for the map to feel spacious.

### Layers

Vector layers rendered on the map:

- **Base terrain**: muted grayscale/sepia fill; no roads, no city labels below regional level.
- **Water**: rivers, lakes, coastlines from existing GIS.
- **Protected areas**: existing polygon layer, tinted green with low alpha.
- **Biome/realm boundary**: single dashed outline of the active biome for context.
- **Route line**: a hand-drawn-style dashed path connecting the three sites in visit order.
- **Site markers**:
  - Visited: filled circle with a check.
  - Current: pulsing marker with the site name label.
  - Upcoming: hollow circle, faded.
- **Answer species range** (post-correct-guess only): translucent overlay animating in as a reveal flourish.

Species range polygons are already stored server-side; they are strictly withheld from the map layer state until the guess resolves correct, exactly as the deduction clues are withheld from public snapshots.

### Interactions

- Tap a visited site marker → readout jumps to that site's travel journal and the clue earned there.
- Tap the current site marker → readout shows current-site context (biome, nearest protected area, nearest feature by distance).
- Pinch/scroll to zoom, drag to pan, within the clamp.
- Fullscreen button (top-right of map): toggle enlarged overlay.
- No editing, no waypoint dragging, no player-authored annotations in this scope.

### Technical choice

Use **MapLibre GL JS** for the map surface. Rationale:

- Free, no license fee, actively maintained.
- Vector tiles allow custom styling for the field-notebook aesthetic without shipping a separate art pipeline.
- Works with existing PostGIS-served layers via a small tile server, and can pre-cache tiles for offline classroom use later.
- Roughly 200 KB gzipped runtime; acceptable for the target platforms.
- Not Cesium: 3D globe is overkill for a regional top-down HUD and its bundle cost is why the in-run experience feels heavy today.

Alternatives considered and rejected: **Leaflet** (raster-only, harder to style consistently), **Cesium 2D mode** (still ships the full 3D engine cost), **custom SVG rendered from PostGIS** (higher engineering cost, no pinch-zoom for free).

Base tiles: start with a hosted style (e.g., a self-hosted Protomaps PMTiles archive of OpenStreetMap at the regional zoom levels the game needs) so the game has no external tile server dependency and can bundle for offline use in later releases. If PMTiles staging is too much for the first cut, use MapLibre's demo tiles behind a caching proxy and swap later.

### State and persistence

Add to the v3 public run snapshot:

- `mapView.bounds`: the initial auto-fit bounds (four coords).
- `mapView.route`: an ordered list of `{ nodeIndex, lat, lon, biome, nearestFeature }` for the three sites.
- `mapView.isFullscreen`: transient client state, not persisted.

The map does **not** need per-move persistence. It re-hydrates from the run snapshot on load.

### Verification

Add to the verification list:

- Run-creation tests: generated expeditions satisfy the 150 km min / 800 km max spacing for ≥95% of answer species; the fallback path is exercised and logged; no run creation fails on spacing.
- Map layer tests: species range polygons are absent from the map layer state until `verdict === "correct"` is committed.
- Fullscreen tests: fullscreen toggle preserves scroll position of the readout; escape and close both exit; background HUD remains keyboard-inert while fullscreen is open.
- Offline tile test (deferred to a later PR if PMTiles isn't ready): map renders base terrain from a bundled archive with no network calls.

## Persistence and APIs

Add discriminated public/private v3 snapshots. The public snapshot contains candidates and board seeds. The private snapshot contains the answer, an immutable five-family clue/fact ID map, and the hint-line sequence pointer per family. Private IDs and the answer never enter public projections.

Persist the complete board checkpoint after every accepted move: grid cells and blocker state, score, move count, six-move limit, refill queue, allowed gem families, and serializable RNG state. No move log is stored. Assert `board_context` is `jsonb` and checkpoint size stays under 32 KB in tests so future gem metadata cannot silently bloat writes.

The server validates bounded direct-clear counts and an input digest, accepts a same-move retry idempotently, and returns `409 move_locked` for conflicting retries. `evidence-choice` returns `409 choice_locked` on a different-family retry after a choice is already committed.

New authenticated transactional endpoints:

- `POST /api/runs/:runId/evidence-progress` commits one completed move and its board checkpoint. Response includes the derived `hintLine` for the ticker (or `null` if no direct match this move), any cascade flavor line, and, on move six, the derived offer set.
- `POST /api/runs/:runId/evidence-choice` validates the derived offer, locks the family, applies its immutable clue, persists eliminations plus per-species elimination reasons for the roster, activates the next site, and returns the trait phrase used to light up that family's dot on every roster portrait.

New runs are selected by server flag `EXPEDITION_CASE_VERSION=2|3`, default `2`. V1/v2 endpoints and resume behavior remain available. Audit shared code paths for stray energy/Insight checks before flipping the flag; v3 must not inherit v2 economy gates.

## Corpus and Compiler

Add `evidence_family_cards`: six species × five families = 30 reviewed clue rows, each linked to a reviewed post-identification fact and a per-species-per-family trait phrase used to fill the roster's trait dot. Every species has a trait phrase for every family regardless of whether that species is the answer, so eliminated candidates can still teach contrast on the roster (elephant's Body dot shows "trunk" even when tiger is the answer).

**Clue writing rules**:

- **Positive form.** Clues state what the answer *is*, never what it isn't. "The body is covered in overlapping keratin scales." Not "Neither spiral horns nor split hooves." Negative and comparative constructions read as riddles, teach the puzzle instead of the animal, and fail the "learn something during the reveal" test.
- **Observation → inference structure.** Each card stores `observation_text` (raw finding) and `inference_text` (one-line implication). The reveal renders both, and the evidence log pins both for the rest of the run.
- **Species-name-free.** Same rule as v2.
- **Answer-owned, shared-with-≥1-live-candidate tag.** Compiler-enforced (see below). The clue is honest evidence about the answer that also happens to be true of some other still-live candidate; the elimination comes from the *other* candidates whose trait phrase for that family contradicts it.

Add `evidence_family_hints`: six species × five families × ~4 hint lines ≈ 120 reviewed rows. Columns: `species_id`, `family`, `sequence_index`, `hint_text`, `weak_tag`.

Add `cascade_hints`: ~15 family-agnostic flavor lines, no species link, no tag.

The pure compiler enumerates six answers × 60 distinct three-family permutations = 360 paths. It asserts, per path and per step:

- The answer always survives.
- Candidate sets never expand or become empty.
- Each clue uses an answer-owned controlled tag that is shared by the answer AND at least one other still-live candidate at the moment of reveal. Prevents "instant solve" (unique tag among live candidates).
- The final clue in every three-family permutation eliminates at least one live candidate whenever two or more remain. Prevents runs that end with the answer plus an indistinguishable decoy.
- Three clues leave one to three candidates.
- For every `(answer, family)`, every hint line's `weak_tag` is (a) implied by or equal to the family's hard-clue tag, and (b) not uniquely identifying among the six-species corpus.
- Cards, facts, and hint lines never leak through public projections. Two runs whose only difference is `answerId` produce identical public projections modulo the deterministic candidate shuffle.
- **Negation smell-test (warning, not error)**: emit a warning if any `observation_text` or `inference_text` contains standalone `not`, `neither`, `no`, `without`, `lacks`, `except`. Catches authors slipping back into negative form.

Iteration order for content: build the verifier + a stub corpus first, iterate cards and hints until 360/360 passes, only then send to human review. Reviewer time is expensive; do not spend it on cards the compiler will reject. Seed order remains: profiles, facts, then evidence-family cards, then hints, then cascade lines.

## Verification and Rollout

- Seeder `--check` validates local content; `--dry-run` prints a live replacement diff without writes. Covers cards, hints, cascade lines, and facts.
- Compiler verifies all 360 paths under the full invariant set above.
- Board generation tests every allowed-family set (`5C3` + `5C4` + `5C5`) and asserts a legal move exists in ≥1000 generated boards per set. Resume checkpoints validated at all six move counts.
- Ticker tests: hint sequence is deterministic given case seed and per-family match order; hints never appear in public snapshots; cascade lines never carry a family or tag.
- Candidate roster tests: elimination reasons persist and re-render correctly on resume; trait dots light for every candidate (alive and eliminated) once the family's clue has been played, using each species' own trait phrase; no roster surface ever contains the answer identity before a correct guess.
- Evidence log tests: all three earned clues render simultaneously after the third choice; observation/inference/ruled-out lines all persist across reload; the log is never truncated to a single "latest" clue.
- API tests cover auth, ownership, bounds, idempotency, locking, exact offers (including 2–5 offer widths), locked-family spawning, auto-elimination, no v3 signature/citations, private-data projection, and v1/v2 compatibility.
- Run typecheck, tests, build, seed checks, compiler verification, and React Doctor.

Create migration 026 but do not apply it or seed the live database without explicit approval. Deploy v3 code only after the migration, reviewed profiles, facts, family cards, and hint corpus pass live dry-run verification. Keep the flag at v2 until then.

## Player Onboarding

First run only, one lightweight overlay:

1. Five family cards, one per gem, ~10 seconds each. Gem silhouette + player-question phrasing ("Who are its cousins?" etc.).
2. One sentence introducing the ticker as "field radio — snippets from the research team."
3. One sentence introducing the roster as "the six species we're considering — cross them off as clues come in."

No mid-run tutorials, no tooltips required for play. The persistent HUD is the tutorial.

## Deferred

Competitive move logs, hard board failure, tiered evidence, early guesses, new GIS datasets, dynamic cultural-place narration, album rarity/foil rewards, more species, legacy economy-remnant cleanup, and a future visible score payoff.
