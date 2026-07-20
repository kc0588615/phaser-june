# Plan 016: Species Content System — Dossier → Tags → Evidence → Agent Workflow

> **Executor instructions**: Follow phases in order. Run every verification gate. Stop at every STOP. Do not invent board features, new gem types, or production DB writes without owner approval.
>
> **Drift check (run first)**:
> ```bash
> git rev-parse --short HEAD
> git status --short -- db/seeds src/lib/evidenceSeedValidation.ts src/lib/deductionTags.ts scripts/seed-deduction.ts scripts/seed-evidence.ts src/types/expedition.ts src/contexts/ExpeditionContext.tsx src/components/FieldNotebook.tsx plans/
> npm run typecheck && npm test
> npm run seed:deduction -- --check
> npm run seed:evidence -- --check
> ```
> Record baseline. Pre-existing test failures: note, do not silent-fix. If seed checks fail before you start, STOP and report.

## Status

- **Priority**: P0 product (after 015 browser gate is mostly green)
- **Effort**: L
- **Risk**: MED (content contracts touch loaders + notebook; wrong schema migration breaks prototype seeds)
- **Depends on**: Plan 015 readiness for playable loop; Plan 013 engine stable (case compiler + evidence_cards runtime)
- **Category**: direction + dx + docs
- **Planned at**: commit `7e6da48`, 2026-07-11 (working tree may be ahead — re-run drift check)
- **Owner decisions locked (2026-07-11 architecture review approval)**:
  1. **Authoring unit** = single package JSON (one human-editable source per species)
  2. **Guest policy** = out of this plan (015); recommend sign-in required — do not implement here
  3. **Place unlock v0** = templated from existing GIS/node fields (no new place-content table)
  4. **Pool expansion** = tooling first; expand by +0 species in this plan except one **draft** exercise species (not production-seeded)

## Why this matters

The mystery loop (earn observation → interpret → guess) is playable. Educational quality is gated by **species-specific content**, not board mechanics. IUCN rows and GIS ranges are not game-ready. Content must map cleanly:

- research claims → controlled **tags** → **evidence cards** (play)
- route/node GIS → **place notes** (travel reward, independent of answer)

Without a package + agent workflow, scaling past six mammals produces unvalidated fanfiction cards that break the case compiler. This plan builds the factory; it does not ship 500 auto-generated animals.

## Current state

### Dual seed layout (pain)

```
db/seeds/deduction/<scientific_snake>.json   # species identity + profile tags + optional legacy clues
db/seeds/evidence/<scientific_snake>.json    # 7 method cards each
```

Six prototype IUCN ids (see `EVIDENCE_PROTOTYPE_IUCN_IDS` in `src/lib/evidenceSeedValidation.ts`):

| IUCN id | Species |
|---:|---|
| 512 | Addax |
| 5748 | De Winton's Golden Mole |
| 7140 | Livingstone's Flying Fox |
| 12763 | Asian Elephant |
| 15955 | Tiger |
| 18732 | Sunda Pangolin |

Each evidence file has exactly 2 track + 2 observe + 2 survey + 1 analyze signature.

### Loaders / validators

- `scripts/seed-deduction.ts` — parses `species` + `profile` + `clues`; `--check` zero-write; production write approval-gated
- `scripts/seed-evidence.ts` — parses evidence cards; validates against deduction dossiers; `--check` / `--write`
- `src/lib/evidenceSeedValidation.ts` — `parseEvidenceSeed`, `parseEvidenceProfileDossier`, `validateEvidenceCorpus` (ordinary tag freq 2–5, signature unique, reducible chains)
- `src/lib/deductionTags.ts` — controlled vocab (`TAG_VOCAB`) + profile validators
- Tests: `tests/lib/evidenceSeedValidation.test.ts`, `tests/lib/deductionTags.test.ts`

### Runtime that must keep working

- Case compiler: `src/lib/caseCompiler.ts` (loads profiles + cards from DB at run create)
- Observations: `POST /api/runs/[runId]/observations`
- Interpretation + guess server-side
- Field notebook: `src/components/FieldNotebook.tsx`
- Run state: `src/types/expedition.ts` — `CaseState`, `ExpeditionData` (has `waypoints`, `bioregion`, `nodes`)

### Place data already available (no answer leak)

From `ExpeditionData` / `RunNode` (`src/lib/nodeScoring.ts`):

- `node_type`, `rationale`, difficulty, method in boardContext
- waypoints (name, type, lon/lat)
- bioregion / realm / biome
- habitat signal ratios on expedition

Missing: notebook unlock of a **PlaceNote** on successful node complete.

### Sacred contracts (do not re-litigate)

1. Methods (`track|observe|listen|survey|analyze`) = board verbs; traits = content dimensions; tags = elimination language.
2. Ordinary evidence: exactly one `compare_tag`, present in profile[trait_category], freq 2–5 across prototype pool, never `genus:` / `misc:` / `signature:` as ordinary.
3. Signature: unique; optional 4th observation; not an ordinary eliminator.
4. Answer id / private case seed / chain never client-side.
5. Place stream never carries mystery identity.
6. Agents research **claims with sources** before cards — never cards-first.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test` | all pass (record count) |
| Deduction check | `npm run seed:deduction -- --check` | validates dossiers, zero DB write |
| Evidence check | `npm run seed:evidence -- --check` | validates 42 cards + reduction report |
| Content package check (new) | `npm run seed:package -- --check` | validates packages + emits JSON report |
| Dev | `npm run dev` | http://localhost:8080 |

No network installs. Use `node scripts/run-typescript.mjs` pattern (already used by seed scripts) — do not add `tsx` dep.

## Scope

**In scope**

- `db/seeds/packages/` (new) — single-package JSON for the six prototype species
- `db/seeds/_templates/` — JSON Schema + empty package template
- `db/seeds/prompts/` — agent prompt pack (research, tag, card, corpus-repair)
- `db/seeds/drafts/` — gitignored drafts dir + `.gitkeep` or documented ignore
- `docs/CONTENT_AUTHORING.md` — human + agent contract
- `src/lib/speciesPackage.ts` (new) — parse/split/validate package
- `src/lib/placeNotes.ts` (new) — pure PlaceNote builder from expedition/node public data
- `scripts/seed-package.ts` (new) — check + optional emit dual seeds for backward compat
- `scripts/seed-deduction.ts` / `scripts/seed-evidence.ts` — accept packages dir **or** keep reading emitted dual files (see Phase 1 choice)
- `package.json` scripts: `seed:package`
- `tests/lib/speciesPackage.test.ts`, `tests/lib/placeNotes.test.ts`
- Place unlock wiring: `src/types/expedition.ts`, `src/contexts/ExpeditionContext.tsx`, `src/components/FieldNotebook.tsx` (minimal UI)
- `plans/README.md` status row
- `db/seeds/deduction/README.md`, `db/seeds/evidence/README.md` — point at packages as source of truth

**Out of scope**

- Board gem redesign, 1-of-2 method choice, Insight tile, GIS board physics
- Production DB writes / expanding `EVIDENCE_PROTOTYPE_IUCN_IDS`
- Legacy clue shop revival; dropping `species_deduction_clues` table
- Guest auth / partial-start (Plan 015)
- Normalized trait graph tables, CMS, admin UI
- Automatic LLM write to prod
- Competitive scoring authority changes

## Git workflow

- Branch: `advisor/016-species-content-system` (or work on main if owner prefers local-only — match recent repo practice)
- Commit style from log: short imperative (`feat: …`, `fix: …`, `docs: …`)
- Commit per phase when green
- Do **not** push, open PR, or write production DB unless owner asks

## Phases

### Phase 0 — Baseline + contracts freeze

1. Run drift check commands above; paste results into a short note at top of PR/commit message if anything is dirty.
2. Read fully:
   - `db/seeds/deduction/README.md`
   - `db/seeds/evidence/README.md`
   - `src/lib/evidenceSeedValidation.ts`
   - one full pair: `db/seeds/deduction/panthera_tigris.json` + `db/seeds/evidence/panthera_tigris.json`
   - `src/lib/deductionTags.ts` (TAG_VOCAB)
3. Confirm six evidence files still 7 cards each and deduction profiles parse.

**Verify**: `npm run seed:deduction -- --check` and `npm run seed:evidence -- --check` exit 0.

**STOP** if corpus already fails validation — fix is not this plan's invent-new-content path; report.

---

### Phase 1 — Single package schema + migration of 6 species

#### 1.1 Package shape (locked)

Path: `db/seeds/packages/{scientific_name_snake_case}.json`

```json
{
  "iucn_id": 15955,
  "scientific_name": "Panthera tigris",
  "common_name": "Tiger",
  "identity": { },
  "research": {
    "claims": [
      {
        "id": "claim_swim_8km",
        "text": "Individuals can swim about 8 km between land patches.",
        "sources": ["https://…"],
        "confidence": "high",
        "maps_to": {
          "profile_category": "key_fact",
          "tags": ["signature:swims_eight_kilometers"]
        }
      }
    ]
  },
  "profile": { },
  "evidence": {
    "cards": [ ]
  },
  "legacy_clues": []
}
```

Field mapping from current dual files:

| Package key | Current source |
|---|---|
| `identity` | deduction file `species` object (same fields) |
| `profile` | deduction file `profile` |
| `evidence.cards` | evidence file `cards` |
| `legacy_clues` | deduction file `clues` (Tiger/Addax keep 15; others `[]`) |
| `research.claims` | **new** — seed minimally for v0: derive 3–7 claims from existing key_fact / signature / sources so agents have a pattern; do not invent new biology |

#### 1.2 Implement `src/lib/speciesPackage.ts`

Exports (names may match style of `evidenceSeedValidation.ts`):

- `parseSpeciesPackage(raw, fileName)` — hard validation
- `packageToDeductionSeed(pkg)` → shape seed-deduction expects
- `packageToEvidenceSeed(pkg)` → `{ iucn_id, scientific_name, common_name, cards }`
- `validatePackageAgainstVocab(pkg)` — tags via existing `validateDeductionTagProfile` / `isCanonicalDeductionTag`
- `splitPackageToLegacyFiles(pkg)` optional helper for emit

Rules to enforce in parse:

- `identity.sources` nonempty HTTPS URLs (same as seed-deduction)
- profile tag arrays valid; signature membership rule (signature in exactly one host array) — reuse existing validators
- evidence cards: same rules as `parseEvidenceSeed` (review_status reviewed, one compare tag, etc.)
- every card `compare_tags[0]` must be in `profile[{trait_category}_tags]` (or signature path for signature cards)
- every claim `maps_to.tags` must appear somewhere in profile (warn if orphan claims; **block** if card tag has zero claim mapping only when `research.claims` is nonempty — for migration allow empty claims array temporarily with a **warning**, then Phase 3 requires ≥1 claim per signature + per ordinary primary_predicate)

#### 1.3 Migrate six packages

1. Create six package JSON files by merging existing deduction + evidence files.
2. Keep dual files **as emitted artifacts** for one transition: either
   - **(A recommended)** loaders read packages only; dual dirs become generated by `seed:package --emit` for human diff comfort, OR
   - **(B)** packages are source; `seed-deduction` / `seed-evidence` open packages and ignore dual dirs if packages exist.

**Locked choice: (B)** — simplest. Update both seed scripts to:

1. Prefer `db/seeds/packages/*.json` when present.
2. Fall back to legacy dual files only if packages dir empty (transition safety).
3. Print which mode they used.

After six packages exist and pass check, dual files may remain in git for one release as mirrors — update with `--emit` or delete in Phase 7. Prefer **keep dual files in sync via emit** so existing tests that read `db/seeds/evidence` keep working without a giant test rewrite in one step.

**Practical step order:**

1. Write packages from current dual content.
2. Add `scripts/seed-package.ts --check` (validate packages).
3. Add `scripts/seed-package.ts --emit` that writes/updates `db/seeds/deduction/*.json` and `db/seeds/evidence/*.json` from packages (identity→species key rename on emit).
4. Existing seed scripts keep reading dual files for DB load; packages become authoring source.
5. Tests for packages + existing evidence tests still pass after emit.

#### 1.4 JSON Schema

- `db/seeds/_templates/species.package.schema.json` — draft-07 or 2020-12; document required fields
- `db/seeds/_templates/species.package.example.json` — minimal valid stub (fictional or tiger-thin)

#### 1.5 npm script

```json
"seed:package": "node scripts/run-typescript.mjs scripts/seed-package.ts"
```

**Verify**:

```bash
npm run seed:package -- --check
npm run seed:package -- --emit
npm run seed:deduction -- --check
npm run seed:evidence -- --check
npm run typecheck && npm test
```

All exit 0. Emit is idempotent (second emit no content drift).

**STOP**: if emit reorders JSON destructively and huge noisy diffs, stabilize key order (identity field order match existing seed-deduction) before continuing.

---

### Phase 2 — Machine-readable corpus reports

Extend validation to write agent-friendly JSON:

1. `scripts/seed-package.ts --check --json` prints or writes `db/seeds/.last-check-report.json` (gitignore the report file if large; prefer stdout JSON for CI).
2. Report must include:
   - per-species: card counts by method, signature tag, claim count
   - ordinary tag frequency table `{tag, traitCategory, count}`
   - unusable tags: count==1 non-signature OR count==6 (pool size)
   - solvability: reuse `validateEvidenceCorpus` reduction steps
   - name-leak failures if any
3. Add `tests/lib/speciesPackage.test.ts`:
   - parses all six packages
   - rejects package with genus ordinary compare tag
   - rejects card tag missing from profile
   - report builder marks freq-1 ordinary tag

**Verify**: `npm test` includes new tests; `npm run seed:package -- --check --json` outputs parseable JSON with `ok: true`.

---

### Phase 3 — Prompt pack + authoring docs

Create:

1. `docs/CONTENT_AUTHORING.md` covering:
   - three streams (dossier / evidence / place)
   - method vs trait vs tag
   - voice rules (6–14 words observation, field-note, no species name)
   - research → claim → tag → card order
   - commands + review rubric (accuracy, sources, no-leak, educational, corpus freq)
   - De Winton reproduction null rule (do not invent)
2. `db/seeds/prompts/01-research.md` — agent browses sources; outputs claims JSON only
3. `db/seeds/prompts/02-tag-map.md` — maps claims → TAG_VOCAB; may propose new tags as PR text to `deductionTags.ts`
4. `db/seeds/prompts/03-cards.md` — generates evidence cards from profile+claims only
5. `db/seeds/prompts/04-corpus-repair.md` — given frequency report, suggests tag/card edits without identity leaks

**Dry-run gate (no DB write)**:

Using any agent CLI available, produce **one draft package** under `db/seeds/drafts/` for a **non-prototype** mammal the owner names, OR if no name given use a placeholder species **not** in the six (e.g. document the process with a stub `db/seeds/drafts/README.md` explaining the workflow and requiring owner-picked species before real research).

**Minimum for DONE of Phase 3 without live agent:**

- All prompt files exist
- `docs/CONTENT_AUTHORING.md` complete
- `db/seeds/drafts/README.md` explains: copy template → research → check with `seed:package` → human review → only then promote to `packages/`

**STOP**: do not promote drafts into `packages/` or expand `EVIDENCE_PROTOTYPE_IUCN_IDS` without owner sign-off.

---

### Phase 4 — PlaceNote unlock (templated spatial context)

#### 4.1 Pure builder

`src/lib/placeNotes.ts`:

```ts
export type PlaceNote = {
  nodeIndex: number;
  title: string;          // waypoint name or "Site {n}"
  nodeType: string;
  rationale: string;      // from RunNode
  bioregionLabel: string | null;
  habitatHints: string[]; // from signals / node family — short chips
  unlockedAtMs: number;
};
```

`buildPlaceNote({ node, nodeIndex, expedition, nowMs })` — pure, no answer/species ids.

#### 4.2 Run state

In `src/types/expedition.ts` / RunState:

- `placeNotes: PlaceNote[]` (default `[]`)

On successful node objective (same path that issues observation — victory, not escaped):

- append PlaceNote if not already present for that `nodeIndex`

Primary wiring file: `src/contexts/ExpeditionContext.tsx` (node advance / observation earned handlers). Keep pure: compute next notes outside side-effectful toast paths where possible.

#### 4.3 Notebook UI

`src/components/FieldNotebook.tsx`:

- small **Sites** section listing unlocked place notes (title, rationale, bioregion, chips)
- empty state: "Travel sites appear after you complete fieldwork there."
- no map rewrite; recap map stays as-is

#### 4.4 Tests

`tests/lib/placeNotes.test.ts`:

- builds note from fixture node + expedition
- never includes species id/name fields
- stable title fallback when waypoint missing

**Verify**:

```bash
npm run typecheck && npm test
```

Manual (if dev server available): complete board 1 victory → notebook shows one site note; escaped node does **not** unlock (match observation stake).

**STOP**: if node advance path no longer has a clear victory branch (drift from 013/015), report — do not invent a second advance pipeline.

---

### Phase 5 — Docs + dual-seed deprecation path (no hard delete yet)

1. Update `db/seeds/deduction/README.md` and `db/seeds/evidence/README.md`:
   - **Source of truth**: `db/seeds/packages/`
   - dual files are emitted mirrors for DB loaders / git history
   - author only packages; run `npm run seed:package -- --emit` before seed:deduction/evidence writes
2. Update `docs/DEVELOPER_ONBOARDING.md` Docs Map with `CONTENT_AUTHORING.md` one-liner (if file exists and pattern allows short add).
3. `plans/README.md` — mark 016 phases status.

**Verify**: READMEs mention packages first; no instruction to hand-edit dual files as primary.

---

### Phase 6 — Optional corpus hygiene (only if time)

- Ensure every package has `research.claims` covering at least: signature tag + each ordinary card primary_predicate (can be thin claims pointing at existing sources)
- Re-run `--check --json`; zero unusable ordinary tags if feasible without changing biology

**STOP**: do not rewrite observation prose for "style" unless validator fails — content review is human-owned.

---

## Test plan

| Test file | Cases |
|---|---|
| `tests/lib/speciesPackage.test.ts` | parse 6 packages; reject bad tag; reject card/profile mismatch; emit round-trip stable; JSON report ok |
| `tests/lib/placeNotes.test.ts` | build from fixture; no species fields; missing waypoint fallback |
| existing `tests/lib/evidenceSeedValidation.test.ts` | still passes after emit |
| existing caseCompiler / run tests | untouched behavior |

Pattern: node:test + assert/strict like `tests/lib/evidenceSeedValidation.test.ts`.

## Done criteria

- [ ] `npm run typecheck` exit 0
- [ ] `npm test` exit 0 including new tests
- [ ] `npm run seed:package -- --check` exit 0 for 6 packages
- [ ] `npm run seed:package -- --emit` then dual seed checks exit 0
- [ ] `docs/CONTENT_AUTHORING.md` + 4 prompts exist
- [ ] PlaceNote unlocks on node victory and renders in FieldNotebook
- [ ] No expansion of `EVIDENCE_PROTOTYPE_IUCN_IDS`
- [ ] No production DB write performed by executor
- [ ] `plans/README.md` status for 016 updated
- [ ] No files outside Scope modified except unavoidable package.json script line

## STOP conditions

Stop and report if:

- Drift check shows evidence corpus already invalid
- Emit produces unmanageable dual-file churn after one ordering fix attempt
- Place unlock requires server secret/answer fields
- Owner has not approved promoting any draft species
- Plan 013 observation/interpret path missing (cannot find victory branch)
- Network install required (do not install)

## Maintenance notes

- **Tags are API**: new gameplay tag → PR to `src/lib/deductionTags.ts` first; then packages.
- **Corpus-relative balance**: when adding a 7th playable species later, re-run frequency report; expect retunes of ordinary tags (2–5 band becomes 2–N).
- **Reviewer focus**: claim→tag→card chain integrity; answer non-leak in PlaceNotes; packages remain sole authoring surface.
- **Deferred**: pool expansion, agent CLI automation script, place authored blurbs, legacy clue table drop, 013 Phase 8.5 features.

## Relationship to Plan 015

015 remains the short runtime checklist (browser acceptance, partial-start, guest policy, wrong-guess decay, Vercel secret). Execute 015 hygiene as needed; **do not block** Phase 1–3 content tooling on full 015 completion. Phase 4 PlaceNotes needs a working node-complete path (already in 013).

## Execution order (within 016)

1. Phase 0 baseline  
2. Phase 1 packages + emit  
3. Phase 2 JSON reports  
4. Phase 3 docs + prompts  
5. Phase 4 PlaceNotes  
6. Phase 5 README deprecation notes  
7. Phase 6 optional claim coverage  

Update this plan's status in `plans/README.md` when complete.
