---
name: seed-evidence
description: Author or edit evidence cards and ladder rungs in db/seeds/pools/<slug>/evidence/*.json, then validate and (on request) reload them. Use whenever a pool's evidence JSON, hints, rungs, weak_tag, explains, or cascade_hints are edited.
argument-hint: [--pool=<slug>] [--write]
---

# Seed evidence

Source of truth: `docs/CONTENT_AUTHORING.md` (read the "evidence_family_hints" and "Workflow 2" sections before editing). Parser/validator: `src/lib/evidenceFamilySeedValidation.ts`.

## Authoring rules

- File: `db/seeds/pools/<slug>/evidence/<scientific_name>.json`; `cards[5]` for families relatives/body/behavior/habits/place; each card `hints[3-5]`.
- Rung = `"text"` (reuses card `compare_tag`) or `{ "text", "weak_tag", "explains"? }`.
- `weak_tag` must be a canonical tag in the card's `trait_category` that the answer profile holds (`db/seeds/species/<name>.json`).
- Author broad → narrow. Each rung alone leaves 2–5 survivors; cumulative survivors shrink every rung; final rung keeps ≥2.
- Copy: ≤140 chars, complete sentence, no candidate name terms, grades 6–12 tone, no academic/violent/medical words.
- `explains.supports|contradicts` slugs must be explanation ids from that species' `cases/*.json`; never contradict the answer explanation.
- Never edit `cascade_hints.json` unless the user asks for global ticker copy changes.

## Validate (always, offline)

```bash
npm run seed:evidence-family -- --pool=<slug> --check
npm run verify:case-compiler -- --pool=<slug>
npm test -- --test-name-pattern="evidence"
```

Fix every reported violation before reporting done. `--check` is offline; `--dry-run` compares to DB.

## Reload (only when user passes --write or asks)

Requires tunnel + `DATABASE_URL` (see postgres-tunnel skill). Print row counts before/after.

```bash
npm run seed:evidence-family -- --pool=<slug> --dry-run
npm run seed:evidence-family -- --pool=<slug> --write
npm run verify:case-compiler -- --pool=<slug>
```

Production write needs explicit owner OK in this conversation.
