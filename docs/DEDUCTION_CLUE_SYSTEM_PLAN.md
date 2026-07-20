# Deduction Clue System — Design & Implementation Plan

Status: implemented for the schema/engine/loader slice; clue authoring is in progress. Covers schema, filter-engine fix, authoring pipeline, and controlled vocabulary for the comparative deduction clues that back the gem-match/guess loop.

Scope: 28 mammals currently in `species`. Populates all 8 gem categories with prose + structured tags so the deduction engine can actually narrow suspects on every gem match.

---

## 1. Problem framing

The deduction engine (`src/lib/deductionEngine.ts` — `filterCandidates`, `compareReference`) narrows a candidate pool by intersecting **structured tags** between the mystery species and each suspect. Gem categories map to clue types:

| gem | wallet key | source |
|---|---|---|
| red | classification | taxonomy (order/family/genus) |
| blue | geographic + habitat text | geography + habitat description tags |
| green | habitat_survey | **MapLibre raster only, not species table** |
| orange | morphology | color/pattern/shape/size |
| yellow | behavior + diet | behavior + diet type/prey/flora |
| black | life_cycle | reproduction + life description |
| white | conservation | conservation code + threats |
| purple | key_facts | signature facts, late-game payoff |

Two things are wrong today:

1. **The engine has almost no attributes to filter on.** Existing `species_deduction_profiles` covers habitat/morphology/diet/behavior/reproduction/taxonomy only — missing geography, conservation, and key_fact/signature. So blue/white/purple gems currently reveal prose without eliminating suspects.
2. **`filterCandidates` has an OR-across-clues bug.** At `deductionEngine.ts:175` the check is `required.some(t => profileTags.includes(t))` over a flat per-category tag list. Two confirmed clues in the same category **widen** the accepted set instead of tightening it. Second clue in a category should be additional constraint, not relaxation.

Nothing changes on `species` table columns. All work happens on the existing `species_deduction_profiles` + `species_deduction_clues` tables and the engine that consumes them.

---

## 2. Design pressures on clue prose

Clues must serve three pressures at once:

1. **Split the pool.** Slot 1 in each category should be true of ~40–60% of the 28-pool. Slot 2 leaves ~2–5. `kf_3`/signature leaves 1–2.
2. **Cohere as a portrait.** Reading all 8 category cards should describe one animal a naturalist recognizes — webbed feet + fish diet + wetland habitat cross-confirm rather than sit as random trivia.
3. **Field-note voice, not textbook.** "Prints in the mud show five clawed toes, splayed wide." beats "This species has pentadactyl feet." Observable > declarative.

### Clue-writing rules

- **6–14 words per clue**, present tense.
- **Sensory or observable** — tracks, scat, sounds, sightings, tissue, behavior in the field.
- **Never** name the species, its genus, or a close pool relative.
- **No unique superlatives** ("world's only…", "largest ever…"). Analogies to *very common* animals (cat, dog, cow, horse, mouse) are fine.
- **One fact + one implication** per clue.
- **Coherence pass:** re-read all 8 categories as one description before finalizing.
- **`kf_1` = the signature "aha".** `kf_2`, `kf_3` are supporting oddities.

---

## 3. Schema changes

Single migration. No column changes on `species`.

### `species_deduction_profiles` — add columns

```ts
geographyTags: text('geography_tags').array().notNull().default(sql`'{}'::text[]`),
conservationTags: text('conservation_tags').array().notNull().default(sql`'{}'::text[]`),
keyFactTags: text('key_fact_tags').array().notNull().default(sql`'{}'::text[]`),
signatureTag: text('signature_tag'),
```

GIN indexes on the three new arrays. No index on nullable `signatureTag` (queried by equality, low-cardinality).

### `species_deduction_clues` — unchanged

Existing shape already fits: `category`, `label`, `compareTags`, `revealOrder`, `unlockMode`, `baseCost`, `isFiltering`.

### `DeductionClueCategory` type — already correct

Already contains all 9 categories including `key_fact`, `geography`, `conservation`. No change.

---

## 4. Engine changes

### 4.1 `ConfirmedClue[]` shape

Replace the per-category flat tag map with a clue-level list:

```ts
type ConfirmedClue = {
  clueId: number;
  category: DeductionClueCategory;
  compareTags: string[];   // OR within, non-empty
};
```

`filterCandidates` semantics:

- **Every confirmed clue must pass** (AND across clues).
- **Within one clue, `compareTags.some(t => profileCategoryTags.includes(t))`** (OR across the clue's own compareTags).
- Non-filtering clues (`isFiltering: false`) or empty `compareTags` are NOT added to the `ConfirmedClue[]`.

`clueId` enables dedup, history, and per-clue debug in `mbDebug`/wrong-guess feedback.

### 4.2 Category filtering coverage

Filtering categories after change:

| category | filters? | notes |
|---|---|---|
| taxonomy | yes | order/family safer than genus in slot 2 (too strong) |
| geography | **yes** | new — climate_zone, continent, bioregion, island |
| habitat | yes | vocab standardized against MapLibre raster habitat types |
| morphology | yes | size_bucket, body_plan, distinctive_features |
| diet | yes | diet_type + foraging_style |
| behavior | yes | activity_pattern + sociality |
| reproduction | yes | parity, care_pattern, lifespan_bucket |
| conservation | **yes** | new — threat_tag list; iucn code alone too coarse |
| key_fact | **yes on `kf_3` only** | `kf_1`/`kf_2` are payoff prose (`isFiltering: false`); `kf_3` filters via `compareTags = [signatureTag]` as late-game single-suspect discriminator |
| habitat_survey (green) | no | auto-confirmed from MapLibre raster, not from species table |

Wire `key_fact` into `CATEGORY_TO_PROFILE_KEY` only after `keyFactTags`/`signatureTag` exist on the profile — otherwise `compareReference` treats it as non-comparable.

### 4.3 Cost units caution

`unlockMode: 'fragment'` and `unlockMode: 'score'` use different scales. Score costs are currently 40/60/80/100; fragment costs are 2/3/4. Do not mix silently.

Recommended defaults for the new spec:

- `slot_1` → `unlockMode: 'fragment'`, `baseCost: 2`
- `slot_2` → `unlockMode: 'fragment'`, `baseCost: 3`
- `kf_1`, `kf_2` → `unlockMode: 'score'` (payoff)
- `kf_3` → `unlockMode: 'fragment'`, `baseCost: 4` (single-suspect discriminator worth spending fragments on)

### 4.4 Call sites to update

- `src/lib/deductionEngine.ts` — `filterCandidates` signature + body; `FILTERING_CATEGORIES`; `CATEGORY_TO_PROFILE_KEY`; `compareReference` if it consumes the old confirmedTags shape.
- `/api/species/deduction` — profile select + `toProfile` mapper add the four new fields.
- `src/types/expedition.ts` — `ComparativeDeductionState.confirmedTags` type change.
- `src/contexts/ExpeditionContext.tsx` — reducer branches that push into `confirmedTags` now push a `ConfirmedClue` object instead of merging into a category tag list.
- `src/components/FieldNotebook.tsx` — `candidateNames` calc; wrong-guess feedback (`comp.lastWrongGuessFeedback`) may reference the old shape.

---

## 5. Controlled vocabulary

Source of truth: `src/lib/deductionTags.ts`. Committed to repo. New tag = PR to that file first.

```ts
export const TAG_VOCAB = {
  activity_pattern: ['nocturnal', 'diurnal', 'crepuscular', 'cathemeral'],
  sociality:        ['solitary', 'pair', 'small_group', 'herd', 'colony'],
  locomotion:       ['cursorial', 'arboreal', 'fossorial', 'semi_aquatic', 'saltatorial', 'scansorial'],
  diet_type:        ['carnivore', 'herbivore', 'omnivore', 'insectivore', 'piscivore',
                     'folivore', 'frugivore', 'nectarivore', 'myrmecophage'],
  foraging_style:   ['ambush', 'pursuit', 'graze', 'browse', 'forage', 'dig', 'fish', 'glean', 'scavenge'],
  size_bucket:      ['mouse', 'rabbit', 'dog', 'human', 'horse', 'elephant'],
  body_plan:        ['compact', 'elongated', 'robust', 'graceful', 'armored'],
  distinctive_features: ['horns', 'tusks', 'antlers', 'quills', 'scales', 'pouch',
                         'prehensile_tail', 'webbed_feet', 'wings', 'claws_digging',
                         'claws_climbing', 'mask_face', 'stripes', 'spots', 'tuft_ears'],
  climate_zone:     ['arctic', 'temperate', 'tropical', 'arid', 'montane'],
  habitat_tag:      ['rainforest', 'dry_forest', 'savanna', 'grassland', 'wetland', 'river',
                     'lake', 'mangrove', 'tundra', 'desert', 'montane_forest', 'alpine',
                     'cave', 'urban_fringe', 'coastal'],
  threat_tag:       ['poaching', 'deforestation', 'climate_change', 'invasive', 'disease',
                     'agriculture', 'pollution', 'roadkill', 'pet_trade', 'trophy_hunt'],
  parity:           ['semelparous', 'iteroparous'],
  care_pattern:     ['precocial', 'altricial', 'pouch', 'nest', 'den'],
  lifespan_bucket:  ['under_5y', '5_15y', '15_25y', '25_50y', 'over_50y'],
} as const;
```

Also export derived helpers:

```ts
export const ALL_TAGS: Set<string> = new Set(Object.values(TAG_VOCAB).flat());
export type TagCategory = keyof typeof TAG_VOCAB;
export function isKnownTag(tag: string): boolean { return ALL_TAGS.has(tag); }
```

`habitat_tag` vocabulary MUST be kept aligned with the MapLibre raster habitat types the green gem reveals, so cross-category matches confirm rather than duplicate or contradict.

Tags on a profile carry their category prefix in the stored value where useful (e.g. `family:felidae`, `genus:panthera` for taxonomy). Enum-style tags for behavior/morphology/etc. can be stored bare (e.g. `nocturnal`, `stripes`) since their category is implied by which array they live in.

---

## 6. Authoring pipeline

### 6.1 Seed files

- One JSON file per species at `db/seeds/deduction/{scientific_name_snake_case}.json`.
- Committed to git — clue text is under review, history matters, and iteration is easy.
- Loader script, not a DB migration (migrations don't read arbitrary FS dirs).

### 6.2 Seed file shape

Mirrors DB tables directly.

```json
{
  "iucn_id": 15955,
  "scientific_name": "Panthera tigris",
  "common_name": "Tiger",
  "profile": {
    "habitat_tags":       ["rainforest", "mangrove", "grassland"],
    "morphology_tags":    ["size_bucket:horse", "body_plan:robust", "stripes"],
    "diet_tags":          ["carnivore", "ambush"],
    "behavior_tags":      ["nocturnal", "solitary"],
    "reproduction_tags":  ["den", "iteroparous", "15_25y"],
    "taxonomy_tags":      ["family:felidae", "genus:panthera"],
    "geography_tags":     ["climate_zone:tropical", "continent:asia"],
    "conservation_tags":  ["iucn:EN", "poaching", "deforestation"],
    "key_fact_tags":      ["swims_between_islands"],
    "signature_tag":      "swims_between_islands",
    "habitat_note":       "Rainforest, mangrove, and tall grass at rivers.",
    "morphology_note":    "Coarse orange coat broken by black vertical bars.",
    "diet_note":          "Ambush hunter of large ungulates.",
    "behavior_note":      "Solitary and nocturnal outside brief mating windows.",
    "reproduction_note":  "Cubs raised in dens; independence around two years.",
    "reference_summary":  "Largest striped cat, solitary ambush predator across tropical Asia."
  },
  "clues": [
    { "category": "taxonomy",     "reveal_order": 1, "label": "Prints show four toes with no visible claw marks.",
      "compare_tags": ["family:felidae"],       "unlock_mode": "fragment", "base_cost": 2, "is_filtering": true },
    { "category": "taxonomy",     "reveal_order": 2, "label": "Scat contains large ungulate hair, cached under leaves.",
      "compare_tags": ["genus:panthera"],       "unlock_mode": "fragment", "base_cost": 3, "is_filtering": true },
    { "category": "geography",    "reveal_order": 1, "label": "Range extends across tropical monsoon forest.",
      "compare_tags": ["climate_zone:tropical","continent:asia"], "unlock_mode": "fragment", "base_cost": 2, "is_filtering": true },
    { "category": "geography",    "reveal_order": 2, "label": "Signs cluster near river islands and mangrove edges.",
      "compare_tags": ["habitat_tag:mangrove"], "unlock_mode": "fragment", "base_cost": 3, "is_filtering": true },
    { "category": "morphology",   "reveal_order": 1, "label": "Body the length of a small horse, heavily muscled.",
      "compare_tags": ["size_bucket:horse","body_plan:robust"],   "unlock_mode": "fragment", "base_cost": 2, "is_filtering": true },
    { "category": "morphology",   "reveal_order": 2, "label": "Coarse orange coat broken by vertical black bars.",
      "compare_tags": ["stripes"],              "unlock_mode": "fragment", "base_cost": 3, "is_filtering": true },
    { "category": "behavior",     "reveal_order": 1, "label": "Active from dusk to dawn, alone.",
      "compare_tags": ["nocturnal","solitary"], "unlock_mode": "fragment", "base_cost": 2, "is_filtering": true },
    { "category": "behavior",     "reveal_order": 2, "label": "Stalks close, then explodes in a short rush.",
      "compare_tags": ["ambush"],               "unlock_mode": "fragment", "base_cost": 3, "is_filtering": true },
    { "category": "diet",         "reveal_order": 1, "label": "Kills weigh as much as the hunter or more.",
      "compare_tags": ["carnivore"],            "unlock_mode": "fragment", "base_cost": 2, "is_filtering": true },
    { "category": "reproduction", "reveal_order": 1, "label": "Cubs stay in a hidden den for months.",
      "compare_tags": ["den"],                  "unlock_mode": "fragment", "base_cost": 2, "is_filtering": true },
    { "category": "conservation", "reveal_order": 1, "label": "Population fragmented and declining.",
      "compare_tags": ["iucn:EN"],              "unlock_mode": "fragment", "base_cost": 2, "is_filtering": true },
    { "category": "conservation", "reveal_order": 2, "label": "Snares and traded parts drive most losses.",
      "compare_tags": ["poaching"],             "unlock_mode": "fragment", "base_cost": 3, "is_filtering": true },
    { "category": "key_fact",     "reveal_order": 1, "label": "Cubs learn to swim before they learn to climb.",
      "compare_tags": [],                       "unlock_mode": "score",    "base_cost": 60, "is_filtering": false },
    { "category": "key_fact",     "reveal_order": 2, "label": "Roars carry across three kilometers of forest.",
      "compare_tags": [],                       "unlock_mode": "score",    "base_cost": 80, "is_filtering": false },
    { "category": "key_fact",     "reveal_order": 3, "label": "Individuals cross wide rivers between island patches.",
      "compare_tags": ["swims_between_islands"], "unlock_mode": "fragment", "base_cost": 4, "is_filtering": true }
  ]
}
```

### 6.3 Loader script

`scripts/seed-deduction.ts`:

- Reads all `db/seeds/deduction/*.json`.
- Validates each (see 6.4).
- Idempotent upsert: profile via primary key; clues via `(species_id, category, reveal_order)` unique index.
- Runnable locally against the SSH-tunneled DB (`127.0.0.1:55432` from WSL).
- Prints a coverage report at the end.

### 6.4 Validator (blocking)

- **Vocab check.** Every tag on every profile array AND every `compareTags` entry must be either:
  - a bare `TAG_VOCAB` value, e.g. `nocturnal`, `stripes`, `desert`;
  - a key-qualified `TAG_VOCAB` value, e.g. `activity_pattern:nocturnal`, `distinctive_features:stripes`, `habitat_tag:desert`;
  - or a whitelisted dynamic prefix: `family:`, `genus:`, `iucn:`, `continent:`, `signature:`, `bioregion:`, `misc:`.
- **Prefix discipline.** Do not invent prefixes such as `order:`, `region:`, `terrain:`, `hydration:`, `reproduction:`, `offspring_count:`, or `gestation_bucket:`. If no existing controlled tag fits, use at most two `misc:snake_case` tags per species and consider adding shared vocabulary later.
- **Subset check.** For each clue, `compareTags` MUST be a subset of the profile's tag array for that category.
- **Naming check.** Clue `label` MUST NOT contain: this species' `scientific_name` tokens, its `common_name` tokens, its `genus`, or any pool species' `common_name` (case-insensitive, word-boundary). Rejects "similar to the giant panda" style leaks.
- **Coverage math** across the 28-pool per category (report, not block, in v1):
  - slot_1: shared by 12–17 species (40–60%)
  - slot_2: shared by 2–5 species
  - `kf_3` / signature: shared by 1–2 species

Validator emits a machine-readable JSON report + a human summary. Blocks the loader on hard errors; warns on coverage drift.

---

## 7. Clue authoring prompt and workflow

Use this prompt when generating clues in ChatGPT, Claude, Codex, or another LLM. The output must be pasted into `db/seeds/deduction/{scientific_name_snake_case}.json` and validated with `npm run seed:deduction` before accepting it.

### Workflow

1. Pick one species from the backlog.
2. Pull its live `species` row and the full 28-mammal pool names.
3. Use web sources for factual grounding when the local row is sparse.
4. Run the prompt below and save the strict JSON output.
5. Run:

```bash
npm run typecheck
DEDUCTION_DATABASE_URL='postgres://postgres:...@127.0.0.1:55432/phaser_june' npm run seed:deduction
```

6. Fix any validator errors. Coverage warnings are expected until most of the 28 species are seeded.
7. Review prose quality manually before committing.

### Prompt

```
You write deduction seed JSON for a mobile species-ID deduction game.

Generate ONE seed file for ONE mammal. Output strict JSON only, no markdown.

Output this exact DB seed shape:

{
  "iucn_id": number,
  "scientific_name": "...",
  "common_name": "...",
  "profile": {
    "habitat_tags": [],
    "morphology_tags": [],
    "diet_tags": [],
    "behavior_tags": [],
    "reproduction_tags": [],
    "taxonomy_tags": [],
    "geography_tags": [],
    "conservation_tags": [],
    "key_fact_tags": [],
    "signature_tag": "...",
    "habitat_note": "...",
    "morphology_note": "...",
    "diet_note": "...",
    "behavior_note": "...",
    "reproduction_note": "...",
    "reference_summary": "..."
  },
  "clues": []
}

Do not output grouped prose objects such as classification/geographic/habitat_text/life_cycle.
Do not output new_tags.

Create these clue rows:
- taxonomy reveal_order 1, 2
- geography reveal_order 1, 2
- habitat reveal_order 1, 2
- morphology reveal_order 1, 2
- behavior reveal_order 1, 2
- diet reveal_order 1
- reproduction reveal_order 1
- conservation reveal_order 1, 2
- key_fact reveal_order 1, 2, 3

Clue row shape:
{
  "category": "taxonomy|geography|habitat|morphology|behavior|diet|reproduction|conservation|key_fact",
  "reveal_order": number,
  "label": "...",
  "compare_tags": [],
  "unlock_mode": "fragment|score",
  "base_cost": number,
  "is_filtering": boolean
}

Hard rules:
- Every label is 6-14 words, present tense, sensory or observable.
- Never name the species, genus, common name, or any other pool species in labels.
- No giveaway superlatives.
- All clues must read as one coherent field portrait.
- Every filtering clue's compare_tags MUST be present in that same category's profile tag array.
- reveal_order 2 must introduce at least one new narrowing tag not present in reveal_order 1 for that category.
- behavior_tags are activity, sociality, locomotion, and foraging style only.
- diet_tags are diet type and food strategy only.
- Do not put diet tags only in behavior; diet has its own clue row.

Key fact rules:
- key_fact reveal_order 1: unlock_mode "score", base_cost 60, is_filtering false, compare_tags []
- key_fact reveal_order 2: unlock_mode "score", base_cost 80, is_filtering false, compare_tags []
- key_fact reveal_order 3: unlock_mode "fragment", base_cost 4, is_filtering true
- key_fact 3 compare_tags MUST be exactly [signature_tag]

Allowed controlled-key prefixes:
activity_pattern:, sociality:, locomotion:, diet_type:, foraging_style:,
size_bucket:, body_plan:, distinctive_features:, climate_zone:, habitat_tag:,
threat_tag:, parity:, care_pattern:, lifespan_bucket:

Allowed dynamic prefixes:
family:, genus:, iucn:, continent:, signature:, bioregion:, misc:

Do not invent any other prefixes. If a concept does not fit, use misc:snake_case, max 2 misc tags per species.

Controlled vocabulary values:
- activity_pattern: nocturnal | diurnal | crepuscular | cathemeral
- sociality: solitary | pair | small_group | herd | colony
- locomotion: cursorial | arboreal | fossorial | semi_aquatic | saltatorial | scansorial
- diet_type: carnivore | herbivore | omnivore | insectivore | piscivore | folivore | frugivore | nectarivore | myrmecophage
- foraging_style: ambush | pursuit | graze | browse | forage | dig | fish | glean | scavenge
- size_bucket: mouse | rabbit | dog | human | horse | elephant
- body_plan: compact | elongated | robust | graceful | armored
- distinctive_features: horns | tusks | antlers | quills | scales | pouch | prehensile_tail | webbed_feet | wings | claws_digging | claws_climbing | mask_face | stripes | spots | tuft_ears
- climate_zone: arctic | temperate | tropical | arid | montane
- habitat_tag: rainforest | dry_forest | savanna | grassland | wetland | river | lake | mangrove | tundra | desert | montane_forest | alpine | cave | urban_fringe | coastal
- threat_tag: poaching | deforestation | climate_change | invasive | disease | agriculture | pollution | roadkill | pet_trade | trophy_hunt
- parity: semelparous | iteroparous
- care_pattern: precocial | altricial | pouch | nest | den
- lifespan_bucket: under_5y | 5_15y | 15_25y | 25_50y | over_50y

Input species row:
PASTE_SPECIES_ROW_HERE

Full 28-mammal pool names to avoid leaking in labels:
PASTE_POOL_NAMES_HERE

Coherence check before returning: re-read all 8 categories as one description. If any clue contradicts another, fix it. If any clue is boring trivia rather than observable field notes, rewrite it.
```

### Review checklist

- JSON matches the seed file shape exactly.
- `compare_tags` subset check will pass for every filtering clue.
- `key_fact` 3 uses exactly the same tag as `profile.signature_tag`.
- `key_fact` 1 and 2 are non-filtering score clues with empty `compare_tags`.
- No invented prefixes outside the allowed list.
- No more than two `misc:` tags unless a human explicitly accepts them.
- Slot 2 narrows beyond slot 1 in that category.
- Diet and behavior remain separate.
- Labels do not contain species/genus/common-name terms.
- Final read feels like one animal, not a fact pile.

---

## 8. Implementation slice (schema + skeleton, no clue content)

Order matters. Each step compiles and passes typecheck before the next.

**a. Migration** — `src/db/migrations/022_deduction_profile_tag_expansion.sql`
   - Add `geography_tags`, `conservation_tags`, `key_fact_tags` (text[] not null default '{}') + GIN indexes.
   - Add `signature_tag` (text nullable).
   - Update Drizzle schema in `src/db/schema/species.ts` to match.

**b. Vocabulary** — `src/lib/deductionTags.ts`
   - Full `TAG_VOCAB` const from §5.
   - `ALL_TAGS` set + `isKnownTag` helper.
   - Whitelisted-prefix list for taxonomy/iucn/signature-style tags.

**c. Engine refactor** — `src/lib/deductionEngine.ts` + call sites
   - `ConfirmedClue` type in `src/types/expedition.ts`.
   - `filterCandidates(profiles, confirmedClues, eliminatedIds)` new signature.
   - `FILTERING_CATEGORIES` includes `geography`, `conservation`, `key_fact`.
   - `CATEGORY_TO_PROFILE_KEY` maps the three new categories to the new profile fields.
   - Reducer branches in `ExpeditionContext.tsx` push `ConfirmedClue` objects instead of merging into per-category tag arrays.
   - `/api/species/deduction` — profile select + `toProfile` include the four new fields.
   - `FieldNotebook.tsx` — `candidateNames` calc + wrong-guess feedback consume the new shape.

**d. Loader + validator** — `scripts/seed-deduction.ts`
   - CLI: `npm run seed:deduction`.
   - Loads JSON files from `db/seeds/deduction/`.
   - Runs validator (§6.4).
   - Idempotent upsert against `species_deduction_profiles` + `species_deduction_clues`.
   - Prints coverage report.

**e. Worked example** — `db/seeds/deduction/panthera_tigris.json`
   - Full profile + 15 clues per §6.2.
   - Run through loader end-to-end.
   - Play one expedition, verify all 8 gem categories reveal correctly and filter the pool.

Then generate the other 27 mammals with the LLM prompt against the validated pipeline.

---

## 9. Species backlog

Most mammals still need enrichment. Seeded examples are committed under `db/seeds/deduction/`; the live DB is loaded via `npm run seed:deduction`.

- Addax nasomaculatus (seeded)
- Ailurus fulgens
- Bradypus pygmaeus
- Canis simensis
- Cryptochloris wintoni
- Daubentonia madagascariensis
- Dendrolagus goodfellowi
- Elephas maximus
- Equus grevyi
- Lasiorhinus krefftii
- Loxodonta cyclotis
- Macrotis lagotis
- Manis javanica
- Marmota vancouverensis
- Mustela nigripes
- Ochotona iliensis
- Okapia johnstoni
- Panthera tigris (seeded worked example)
- Pongo abelii
- Priodontes maximus
- Pseudoryx nghetinhensis
- Pteropus livingstonii
- Rhinoceros sondaicus
- Rhinopithecus roxellana
- Rhynchocyon chrysopygus
- Sarcophilus harrisii
- Solenodon paradoxus
- Zaglossus bruijnii

---

## 10. Open questions

- Coverage validator: block or warn on out-of-band slot distributions in v1?
- `distinctive_features` — currently a flat list; do we need per-feature severity (e.g. "always visible" vs "sometimes visible") for morphology filtering fairness?
- Green gem (habitat_survey) currently reveals raster percentages in order. Should any of those percentages *also* confirm `habitat_tag` compareTags in the engine, to give green real narrowing power on top of its reveal-flavor role? Or keep it strictly non-filtering to preserve its "environmental context" identity?
- Score-scale cost tuning for `kf_1`/`kf_2` — current score costs (40/60/80/100) may need rebalancing against the new fragment-cost `kf_3`.
