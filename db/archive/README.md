# Archived tables

Data-only archives of tables dropped by plan 031, taken from production
`phaser_june` on 2026-09-17 through the SSH tunnel before each `DROP TABLE`.

`pg_dump` could not be used (WSL client 14.23 vs server 17.5), so each table is
stored as a CSV produced by `\copy ... TO ... WITH (FORMAT csv, HEADER true)`
plus the `\d+` description of the table at archive time.

| Table | Rows |
|---|---|
| species_facts | 218 |
| species_deduction_clues | 371 |
| evidence_cards | 132 |

## Restore

Recreate the table from the `.schema.txt` description, then:

```
\copy public.<table> FROM 'db/archive/2026-09-17-<table>.csv' WITH (FORMAT csv, HEADER true)
```

`player_clue_unlocks` was archived here briefly and then deleted on 2026-09-18: the game is in testing and player data is not retained.

## 2026-09-17 legacy deduction profiles

`2026-09-17-species_deduction_profiles_legacy22.csv` holds the 22
`species_deduction_profiles` rows for species that belong to no `case_pools`
entry. They used the pre-canonical unprefixed tag style (`forest`,
`egg_laying`, `piscivore`) and had no evidence cards, so no expedition could
ever select them. Plan 031 Phase 5 deletes them so the `trait_tags`
vocabulary can be enforced. To bring one back, author a new pool of six and
re-tag it with the canonical `prefix:value` vocabulary in `trait_tags`.
