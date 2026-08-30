# Ecological Mystery Cases

Plan 030 ships as run snapshot version 4. It keeps the v3 evidence-family board rules and adds an authored ecological incident, competing explanations, a two-part diagnosis, and a post-verdict learning resolution.

## Runtime flow

1. `POST /api/runs` chooses one of the six reviewed deduction species using the existing soft GIS prior.
2. The compiler attaches that species' authored case from `src/lib/mysteryCaseCatalog.server.ts`.
3. The client receives only incident copy, contextual GIS location text, and three or four explanation choices.
4. An incident case file must be acknowledged before site one starts.
5. Three six-move boards and evidence-family choices run unchanged.
6. The player submits a remaining species and an ecological explanation together.
7. The server evaluates both components. Wrong attempts return component-level guidance without returning either hidden answer.
8. A correct verdict returns the evidence chain, ecological role, taxonomy, misconception, rejected alternatives, and source links.

## Privacy boundary

`PublicCaseV4.mystery` contains only:

- incident title, observation, atmosphere, and question;
- GIS context with `contextual` confidence;
- explanation ids and public copy.

`PrivateCaseV4.mystery` contains:

- correct explanation id;
- feedback for every explanation;
- complete learning resolution and sources.

`parsePublicCaseSnapshot` and `parsePublicMysteryCase` rebuild public payloads from allowlisted fields. Authored-case validation rejects answer names or genus terms in pre-verdict copy. Completed owner-only run projections may include a validated verdict projection.

## Move integrity

Evidence progress no longer trusts client-asserted clears, families, cascades, Field Signal payouts, or charges. The client submits:

- row/column shift;
- move number and node index;
- resulting board checkpoint.

The server reconstructs the prior board from the server-held checkpoint, or from the stored board seed and obstacle contract for move one. It replays the move, cascades, blocker damage, Field Signal lifecycle, scoring, refill RNG, and checkpoint. Progress is accepted only when the derived checkpoint exactly matches the submission. Identical retries use a persisted submission digest; conflicting retries remain locked.

## Authored prototype set

| Species | Incident | Supported diagnosis |
|---|---|---|
| Addax | Waterless feeding ground | Plant-derived moisture supports dry-site feeding |
| De Winton's golden mole | Tracks without footprints | Shallow subsurface foraging |
| Asian elephant | Broken sapling corridor | Routine megaherbivore feeding and travel |
| Sunda pangolin | Opened insect nests | Specialist ant and termite foraging |
| Tiger | Silent prey trail | Localized predator avoidance |
| Livingstone's flying fox | Seedlings beyond the gap | Animal-mediated seed dispersal |

Every case uses the existing five reviewed evidence-family cards. Source provenance is shown only after resolution.

## Authoring gates

Each new case must pass `validateAuthoredMysteryCase`:

- three to five distinct explanations;
- one private answer matching a public choice;
- private feedback for every choice;
- at least two evidence-chain steps and two rejected alternatives;
- HTTPS source provenance;
- no answer common name, scientific name, genus, or distinctive name fragment in public copy.

Run `npm run verify:case-compiler` to validate all six cases and the 360 ordered evidence-family paths.

## Deferred

Plan phases 5 and 6 require observed playtest data. Instrumentation expansion, two additional case pools, and a new board objective should wait for those results.
