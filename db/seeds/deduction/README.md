# Deduction seed package

Each JSON file requires root identity fields, a `species` object, a canonical `profile`, and a `clues` array.

`species` is the reviewed source of truth for curated `public.species` fields. It includes public copy, display habitat tags (bare readable values), range flags, appearance, dimensions, diet, behavior, life history, key facts, threats, comments, and source URLs. Use `null` for unknown facts; do not infer. Do not include GIS-owned realm, subrealm, biome, or bioregion columns. `sources` must contain authoritative HTTPS URLs and remains JSON-only.

`profile` uses canonical category-qualified deduction tags. Each tag has one semantic home. Its declared signature must appear exactly once in that one host array. Avoid `misc` and cross-category duplicates.

Legacy `clues` may be empty for newly authored species because the old clue table is deprecated. A nonempty legacy deck must use the Plan 012 15-row shape: taxonomy 1-2, geography 1-2, morphology 1-2, behavior 1-2, diet 1, reproduction 1, conservation 1-2, and key_fact 1-3. Filtering clues have exactly one atomic compare tag; non-filtering clues have none.

Check only (zero writes after validation):

```sh
npm run seed:deduction -- --check
```

Write:

```sh
npm run seed:deduction
```

**Production warning:** the write command updates curated `public.species` fields, upserts deduction profiles, and replaces synchronized legacy clues in one transaction. Verify the target database and run check mode first. Never run a production write casually.
