# Content authoring

The app runs locally in WSL; PostgreSQL/PostGIS lives on Hetzner. Content is editable through SQL or JSON. GIS harvesting and the version-4 run snapshots are independent of this authoring workflow. Existing runs retain their saved snapshots.

## Tables and relationships

```text
species ──1:0..1── species_deduction_profiles
        └─1:many── species_notes
case_pools ──1:many── case_pool_members ──many:1── species
           ├─1:many── evidence_family_cards ──many:1── species
           ├─1:many── evidence_family_hints ──many:1── species
           └─1:many── mystery_cases ──many:1── species
                        ├─1:many── mystery_explanations
                        ├─1:1───── mystery_resolutions
                        ├─1:many── mystery_evidence_steps
                        ├─1:many── mystery_rejected_alternatives
                        └─1:many── mystery_sources
trait_tags ── vocabulary for profile tag arrays (checked by loader/view)
cascade_hints ── shared, species-independent ticker copy
mystery_cases_public ── reviewed case/choice view, excludes private answers
```

- **species**: stable identity, taxonomy, habitat, geography, appearance, size, and diet. Distribution and threats remain here because answer-prior scoring reads them.
  Key constraint: `iucn_id` is unique; all game foreign keys use `species.id`.
- **species_deduction_profiles**: the nine GIN-indexed tag arrays used to compare candidates. Only six playable profiles remain; the 22 unplayable historical profiles are archived.
  Key constraint: `species_id` is both primary key and foreign key, allowing at most one profile per species.
- **species_notes**: prose organized by topic and position. A note may have one HTTPS source URL.
  Key constraint: `(species_id, topic, sort_order)` is unique; positions are 1–9.
- **case_pools**: an authored set of six suspects. Only `reviewed` pools are selected by the run route.
  Key constraint: `slug` is unique and uses lowercase letters/digits separated by hyphens; status is `draft` or `reviewed`.
- **case_pool_members**: joins a pool to its species. The loader/compiler require exactly six members; SQL intentionally has no size trigger.
  Key constraint: `(pool_id, species_id)` is the primary key, and a member species cannot be deleted while referenced.
- **evidence_family_cards**: observations, inference, comparison tag, trait phrase, and bonus fact for each pool/species/family. Exclusions only make sense within that pool.
  Key constraint: `(pool_id, species_id, family)` is unique; family is relatives/body/behavior/habits/place.
- **evidence_family_hints**: ordered soft hints scoped to a pool/species/family. Their weak tag must not exclude the answer.
  Key constraint: `(pool_id, species_id, family, sequence_index)` is unique; indices are 0–9.
- **cascade_hints**: shared copy for cascades, independent of a species or pool. Every pool uses the same rows.
  Key constraint: `sequence_index` is unique and between 0 and 99.
- **mystery_cases**: incident, atmosphere, question, and title attached to a pool/species. Private explanation/resolution content lives in children.
  Key constraint: `(pool_id, species_id)` is unique; case slugs are globally unique.
- **mystery_explanations**: public choices plus private feedback and the answer flag. A case needs three to five choices in code.
  Key constraint: the partial unique index permits **at most one** `is_answer=true`; assembly additionally requires one. Choice slug and sort order are unique within a case.
- **mystery_resolutions**: private headline, diagnosis, ecological role, taxonomy, and misconception. These are assembled into the resolved case.
  Key constraint: `case_id` is its primary/foreign key, allowing one resolution per case.
- **mystery_evidence_steps**: ordered explanation of the evidence chain. These become `resolution.evidenceChain`.
  Key constraint: `(case_id, sequence_index)` is the primary key, with indices 0–9.
- **mystery_rejected_alternatives**: ordered reasons other explanations fail. These become `resolution.rejectedAlternatives`.
  Key constraint: `(case_id, sequence_index)` is the primary key, with indices 0–9.
- **mystery_sources**: citations for the case resolution. They are private resolution content, not public incident copy.
  Key constraint: URLs must start with `https://`; the case foreign key cascades on deletion.
- **trait_tags**: registered tag, owning profile category, filtering flag, and optional description. Includes the finite TypeScript vocabulary plus concrete family/genus/geography/signature tags used in dossiers.
  Key constraint: the tag primary key must match `^[a-z_]+:[A-Za-z0-9_]+$`; uppercase IUCN codes such as `iucn:CR` are intentional.

`deduction_profile_unknown_tags` reports array values missing from `trait_tags`. It is a view, not a foreign key: direct SQL can introduce unknown tags, so always run it and the compiler after editing. Pool/species agreement for cases and evidence also requires the loaders/compiler; the individual foreign keys do not express that relationship.

## Connect and choose a target

Keep the existing WSL SSH tunnel open on `127.0.0.1:55432`. Every command below reads credentials from `DATABASE_URL` in `.env.local`, without printing them. `--rehearsal` selects the owner-managed `phaser_june_rehearsal` copy; `--production` selects `phaser_june`. Neither flag creates or deletes a database.

```bash
./scripts/db --rehearsal "SELECT current_database();"
./scripts/db --rehearsal
./scripts/db --production "SELECT current_database();"
```

`--exec` passes that target through `DATABASE_URL` to a loader. Without a target flag, scripts use the existing environment connection. For example, the bare command is `npm run seed:species -- --check`; its rehearsal equivalent is below. Each loader's write is one transaction. A failure rolls back that loader's whole write; the sequence of different loaders is not one transaction.

## JSON layout

```text
db/seeds/species/<scientific_name>.json
  iucn_id, scientific_name, common_name, species, profile
db/seeds/pools/<slug>/pool.json
  slug, title, review_status, species_iucn_ids[6], evidence_directory: "evidence"
db/seeds/pools/<slug>/evidence/<scientific_name>.json
  iucn_id, scientific_name, common_name, cards[5] (each with hints)
db/seeds/pools/<slug>/evidence/cascade_hints.json
  lines (shared global ticker content)
db/seeds/pools/<slug>/cases/<case-slug>.json
  species_iucn_id, public, private
```

The six existing dossiers are complete examples. Prose remains under the dossier's `species` key and is loaded into notes: `behavior_1..2` → behavior 1..2; `life_description_1..2` → life_cycle 1..2; `lifespan`/`maturity` → life_cycle 3/4; `key_fact_1..3` → key_fact 1..3; `taxonomic_comment` → taxonomy 1; `reproduction_type`/`clutch_size` → reproduction 1/2; distribution/threats → their topic, position 1. Distribution/threats also update the retained species columns. The first dossier source becomes the note citation. Notes outside these named slots survive loader writes; explicit null clears the corresponding slot.

## Workflow 1: add a species

1. Copy a dossier into `db/seeds/species/`, assign its real IUCN ID and names, and author the species fields, sources, and nine profile arrays. Taxonomy fields may be supplied in `species` using database column names. A species alone is not playable: it also needs a complete pool.
2. Use registered tags: `./scripts/db --rehearsal "SELECT tag, category FROM trait_tags ORDER BY category, tag;"`. Register new concrete dynamic tags in SQL first. A new finite vocabulary value also needs a matching TypeScript change and generated SQL (`node scripts/run-typescript.mjs scripts/generate-trait-tags.ts`). Never reuse a tag for a different category.
3. Validate and write (natural key: `iucn_id`):
   ```bash
   ./scripts/db --rehearsal --exec npm run seed:species -- --check
   ./scripts/db --rehearsal --exec npm run seed:species -- --write
   ./scripts/db --rehearsal "SELECT * FROM deduction_profile_unknown_tags;"
   ./scripts/db --rehearsal --exec npm run verify:case-compiler
   ```
   The bare forms are `npm run seed:species -- --check` and `npm run seed:species -- --write`. Re-running updates existing species rather than duplicating them. `--check` validates dossiers and database vocabulary; it does not claim a full species drift comparison.
4. After reviewing rehearsal, run the same check/write commands with `--production`. Print relevant counts before and after production writes.

## Workflow 2: build a pool

1. Create `db/seeds/pools/<slug>/pool.json` with exactly six existing species IDs and `review_status: "draft"`. Add thirty evidence cards, their hints, and six cases under the layout above. Case slugs must be unique across pools. Copy the shared cascade JSON unchanged unless deliberately editing global ticker copy.
2. Create/upsert the pool row and six member rows. The prototype commands below are executable examples; substitute your directory slug when authoring another pool:
   ```bash
   ./scripts/db --rehearsal --exec npm run seed:pools -- --pool=prototype-six --check
   ./scripts/db --rehearsal --exec npm run seed:pools -- --pool=prototype-six --write
   ```
   Existing content prevents the pool loader from removing species that still have cards, hints, or cases. Reauthor/remove that content explicitly first.
3. Validate/write cards and hints, then cases:
   ```bash
   ./scripts/db --rehearsal --exec npm run seed:evidence-family -- --pool=prototype-six --check
   ./scripts/db --rehearsal --exec npm run seed:evidence-family -- --pool=prototype-six --write
   ./scripts/db --rehearsal --exec npm run seed:mystery-cases -- --pool=prototype-six --check
   ./scripts/db --rehearsal --exec npm run seed:mystery-cases -- --pool=prototype-six --write
   ./scripts/db --rehearsal --exec npm run seed:mystery-cases -- --pool=prototype-six --check
   ```
   The first mystery `--check` exits nonzero for new/missing or different database cases: review those differences, then write. Evidence `--check` validates JSON offline; `--dry-run` compares with the database without keeping writes. Mystery `--check` compares database content and prints stored JSON for differing cases. Mystery writes use the case slug, replacing only that case's child rows.
4. Compile the draft pool explicitly, then publish it:
   ```bash
   ./scripts/db --rehearsal --exec npm run verify:case-compiler -- --pool=prototype-six
   ./scripts/db --rehearsal "UPDATE public.case_pools SET review_status='reviewed' WHERE slug='prototype-six';"
   ```
   Set the JSON pool status to `reviewed` too. Repeat against production after rehearsal. Runtime selects uniformly among reviewed pools using the run's deterministic seed. Never mark incomplete content reviewed.

## Workflow 3: edit SQL directly and reconcile JSON

1. Make a concrete edit in a transaction. This rehearsal example changes the title only:
   ```bash
   ./scripts/db --rehearsal -c "BEGIN; UPDATE public.mystery_cases SET title='The Waterless Feeding Ground — field revision' WHERE slug='waterless-feeding-ground'; COMMIT;"
   ```
2. Detect the drift:
   ```bash
   ./scripts/db --rehearsal --exec npm run seed:mystery-cases -- --check
   ```
   Expect a nonzero exit and the stored database JSON. To keep the SQL change, copy that JSON into the named case file and rerun `--check`; it must report zero differences. `--check` never overwrites files. To accept the existing JSON as truth instead:
   ```bash
   ./scripts/db --rehearsal --exec npm run seed:mystery-cases -- --write
   ./scripts/db --rehearsal --exec npm run seed:mystery-cases -- --check
   ```
3. Validate the resulting corpus:
   ```bash
   ./scripts/db --rehearsal --exec npm run verify:case-compiler
   ```
   Keep JSON and SQL synchronized before the next load. Direct SQL changes to notes/profiles likewise need to be reflected in the dossier if the loader owns those fields.

## What the database refuses

- Duplicate pool/species/family cards or duplicate choice order: `duplicate key value violates unique constraint`.
- A second answer for one case: `duplicate key value violates unique constraint "uq_mystery_one_answer"`.
- Unknown referenced species/case/pool: `insert or update ... violates foreign key constraint`.
- Invalid topic, family, review status, slug, position, or tag spelling: `new row ... violates check constraint`.
- Non-HTTPS mystery sources or note source URLs: the same check-constraint error.
- Missing required copy/keys: `null value in column ... violates not-null constraint`.

No trigger forces pool size, completeness, or tag-array membership. The schema also does not require an answer/resolution row to exist: the compiler does. The public mystery view excludes answer flags, feedback, resolutions, and sources; it is not a substitute for database access permissions.

## What code still checks

Six distinct pool members; one usable profile/case per member; one valid answer with a complete resolution; no answer-name leaks in public copy; copy length/completeness; evidence tag meaning and hint safety; and all 360 evidence-family paths. The compiler also checks finite TypeScript vocabulary synchronization and zero rows in `deduction_profile_unknown_tags`. Seed parsers validate JSON shape before writing. The species loader rejects tags missing from `trait_tags` or assigned to the wrong category.

## Rehearsal record and operations

The three command workflows were exercised on the existing prototype corpus: species upsert, pool/evidence/case upsert, and a committed SQL title edit detected as drift and restored from JSON. This avoids leaving a second content pool behind. Migrations 027–031 were rehearsed before production. CSV/schema archives (including the 22 unplayable profiles) are under `db/archive/`; the owner approved these in place of `pg_dump` because installed client/server versions differed. Historical SQL migrations and archive files necessarily retain retired table names.

The retired Vercel configuration/build script are removed. The authenticated stale-run API remains available, but this local setup does not schedule it through Vercel. No dev server or browser is started by these authoring commands. The owner manages the rehearsal database's lifetime.
