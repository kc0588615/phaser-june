# Evidence-family clue copy: authoring brief

## Scope

Edit only `observation_text` and `inference_text` in the six species files
under `db/seeds/evidence-family/`. Preserve tags, trait phrases, bonus facts,
sources, review status, hints, and cascade hints unless the task includes them.

Read `docs/EXPEDITION_RUN_LOOP.md` for the current gameplay flow. The player
receives three family clues from five available families across six candidates.

## Meaning before style

A clue must remain compatible with EVERY candidate carrying its
`compare_tag` in the matching category of `db/seeds/deduction/*.json`.
Tags drive elimination in `src/lib/runCaseState.ts`; the engine does not
interpret the prose. Unchanged tags do not guarantee unchanged meaning.

For each card:

1. List all candidates carrying its tag and those excluded by it.
2. Check both sentences against every retained candidate, not only the answer.
3. Verify biological details against dossiers and credible wildlife sources.
   A profile tag describes game logic; it is not independent biological evidence.
4. Ensure the inference follows from the observation without extra exclusions.
5. Check hints separately: unchanged hints can still disclose the answer.

Most current comparison tags exclude one particular candidate. Honest wording
may therefore be a negative comparison. Do not invent a footprint, kill site,
DNA marker, exact location, or social group to make such a tag sound vivid.
An unseen behavior in one encounter does not establish its absence in a species.
Use a record or comparison when the claim concerns a species-wide trait.

Keep the prose approachable and vary sentence rhythm where meaning permits.
Specific positive clues require shared traits and compatible profiles; changing
that design is a separate task, not a copy-only rewrite.

Example: tiger habits uses `comparison_diet:not_bulk_browser`, shared by
tiger, addax, golden mole, pangolin, and fruit bat. A kill site excludes some
of those survivors. The revised clue instead excludes the daily vegetation
bulk required by the multi-tonne browser. It does not imply that all survivors
eat meat.

Geographic profiles overlap. A range that differs from another species'
distribution need not be disjoint from it. Do not turn a range comparison into
a claim that the subject lives on one island or in one narrow forest belt.

## What the validator actually checks

Source: `src/lib/evidenceFamilySeedValidation.ts`.

- Exactly six distinct species matching the loaded deduction profiles, with
  matching names and one card per family.
- Valid family/category, canonical comparison tag, membership in the answer
  profile, and tag frequency of 2–5 across the six profiles.
- Nonempty trimmed strings and `review_status: "reviewed"`.
- Observation/inference at most 180 characters each; bonus fact at most 240;
  trait phrase at most 64; each of 3–5 hints at most 140.
- Observation, inference, bonus fact, and hints end with period, exclamation
  mark, or question mark. Trait phrases and URLs do not need this punctuation.
- Source begins with `https://`; this does not verify availability or support.
- Observation, inference, and family hints contain no blocked name tokens.
  Names are split into alphanumeric tokens; tokens of at least four characters
  are matched case-insensitively at word boundaries. `asian` is exempt.
  For example, `flying` is blocked by the roster's common names.
  This is not arbitrary substring matching or a semantic giveaway detector.

Preserving other fields is an authoring constraint, not enforced by comparing
against earlier seed versions. Review the diff for that.

The checker does NOT verify biological truth, semantic equivalence, writing
quality, rendered layout, or whether surviving candidates remain plausible.
`verifyCaseCorpusV3` in `src/lib/caseCompilerV3.ts` separately checks tag-based
paths and warns about some negative wording. Such warnings are not proof of a
bad clue; passing path checks is not proof of accurate prose.

## Validation and display

Run:

```bash
npm run seed:evidence-family -- --check
```

Expected: 30 cards, 120 family hints, 15 cascade hints, six species.
This command opens no database connection. It does not run the full compiler
path verifier. Review the copy diff and survivor compatibility as well.

`src/components/EvidenceLog.tsx` truncates the compact observation and renders
full observation/inference in detail view. Check that opening detail works and
that text remains readable at mobile width; character limits alone cannot
establish that.

Database preview/publishing is separate. `--dry-run` connects to the database;
`--write` publishes and can synchronize hints/cascades and delete stale rows.
Use the installed postgres-tunnel skill for WSL database work.

## Larger rosters and remaining work

This brief cannot extend the roster by adding files alone. The seed validator
requires six species, and the seed loader selects `EVIDENCE_PROTOTYPE_IUCN_IDS`.
Roster expansion needs a separate review of loading, validation, candidate
selection, profiles, and compiler paths.

Existing hints need a semantic pass: tiger habits mentions protein remains and
moving food despite retaining plant eaters; tiger place implies northern Asian
records despite retaining African and island candidates. They were preserved
in this copy-only pass and remain a release concern.

Some cited URLs could not be opened during review. Alternative sources consulted:

- [Smithsonian: addax](https://nationalzoo.si.edu/animals/addax)
- [Smithsonian: Asian elephant](https://nationalzoo.si.edu/animals/asian-elephant)
- [Smithsonian: tiger](https://www.nationalzoo.si.edu/animals/tiger)
- [Animal Diversity Web: Sunda pangolin](https://animaldiversity.org/accounts/Manis_javanica/)
- [Animal Diversity Web: Livingstone's fruit bat](https://animaldiversity.org/accounts/Pteropus_livingstonii/)
- [Endangered Wildlife Trust: golden mole rediscovery](https://ewt.org/a-quest-for-gold/)

These support background biology, not a claim that every generated sentence
has received expert biological review. Existing source fields remain unchanged.
