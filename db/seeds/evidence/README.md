# Evidence cards

Reviewed local source for Plan 013's six-mammal prototype. Each file has exactly:

- two `track`, two `observe`, and two `survey` cards;
- one `analyze` signature card;
- one canonical compare tag per card;
- a source URL copied from its deduction dossier.

Validate locally without a database connection:

```bash
npx tsx scripts/seed-evidence.ts --check
```

Production loading is an explicit opt-in and requires migration 024 plus owner approval:

```bash
npx tsx scripts/seed-evidence.ts --write
```

`--write` replaces evidence rows only for the six selected species, in one transaction.

