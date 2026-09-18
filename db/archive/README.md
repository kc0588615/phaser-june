# Archived tables

Data-only archives of tables dropped by plan 031, taken from production
`phaser_june` on 2026-09-17 through the SSH tunnel before each `DROP TABLE`.

`pg_dump` could not be used (WSL client 14.23 vs server 17.5), so each table is
stored as a CSV produced by `\copy ... TO ... WITH (FORMAT csv, HEADER true)`
plus the `\d+` description of the table at archive time.

| Table | Rows |
|---|---|
| player_clue_unlocks | 55 |
| species_facts | 218 |
| species_deduction_clues | 371 |
| evidence_cards | 132 |

## Restore

Recreate the table from the `.schema.txt` description, then:

```
\copy public.<table> FROM 'db/archive/2026-09-17-<table>.csv' WITH (FORMAT csv, HEADER true)
```

`player_clue_unlocks` contains player identifiers. Keep this directory private.
