# Execution Rules — deduction-first-redesign.md

You (codex) are implementing `plans/deduction-first-redesign.md`. Read it in full
first — it has exact file lists, function names, event names, and firm design
decisions. These rules govern how you execute it.

1. **Phases 1 → 6 in order, one at a time. Skip Phase 7 (backlog).**
2. **Gate per phase**: `npm run typecheck` must pass, then `git commit` (concise
   message, repo convention, e.g. `phase 1: strip RPG scaffolding`). Do not start
   the next phase until the previous one is committed.
3. **Firm decisions are settled — do not redesign.** If code contradicts the plan
   (file missing, different signature, line drift), adapt minimally and note it in
   the commit body. If genuinely blocked, stop and print `BLOCKED: <reason>` and
   wait for instructions in your pane.
4. **Phase 3 verify-first**: the live `/api/species/deduction` fetch and the
   hardcoded album stub (`ids 1..24 minus {mysteryId,4,11}`) live in
   `src/contexts/ExpeditionContext.tsx` — plan citations pointed at dead
   `src/hooks/useExpeditionRun.ts` (deleted in Phase 1). Locate the real sites
   before editing.
5. **Phase 5 verify-first**: read `src/lib/speciesCardUnlocks.ts` and the
   `/api/player/track` handler in full; confirm they accept `DeductionClueCategory`
   values before wiring the journal write path. If they only accept legacy
   `GemCategory` strings, extend them minimally.
6. **DB constraint (verified live)**: `eco_run_nodes.node_type` CHECK allows only
   `riverbank_sweep, dense_canopy, urban_fringe, elevation_ridge, storm_window,
   crisis, analysis, custom`. Single-node writes use `'custom'`. Never invent a new
   value. No SQL migrations needed anywhere in this plan.
7. **Constraints**: no npm installs, no destructive git commands, do not touch the
   items in `docs/POST_REVERT_HYGIENE_BACKLOG.md` (separate track). TypeScript
   everywhere, `@/` path alias, keep React/Phaser components mounted
   (`display: none` over unmount) to preserve EventBus listeners.
8. **Done state**: phases 1–6 committed, `npm run typecheck` clean, and
   `npm run build` passing at the end. Manual playtest is handled by us — do not
   attempt to run the dev server or browser. Finish by printing a summary list of
   your commits (hash + subject).
