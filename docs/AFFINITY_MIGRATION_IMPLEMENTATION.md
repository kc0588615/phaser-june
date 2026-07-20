# Affinity Implementation Notes

Affinities are still live, but only as lightweight taxonomy-derived run modifiers.

## Current Behavior

- `CesiumMap` derives available affinities from nearby species.
- The first available affinity is selected by default.
- `ExpeditionContext` threads `activeAffinities` through run state, run metadata, node initialization, and board spawn config.
- `createBoardSpawnConfig` gives a small spawn-weight boost to the selected affinity gem.
- Completed authenticated runs add selected affinity tags to `species_cards.affinity_tags`.

## Current Files

- `src/expedition/affinities.ts`
- `src/expedition/domain.ts`
- `src/components/CesiumMap.tsx`
- `src/contexts/ExpeditionContext.tsx`
- `src/MainAppLayout.tsx`
- `src/app/api/runs/route.ts`
- `src/app/api/runs/[runId]/route.ts`
- `src/components/album/SpeciesTCGCard.tsx`

## Cleanup Notes

If affinities stop carrying product value, remove them in one pass from run payloads, run metadata, board spawn config, card tags, and album UI.
