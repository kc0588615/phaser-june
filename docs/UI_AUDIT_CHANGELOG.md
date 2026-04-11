# UI Architecture Audit — Changelog

## Files Created

| File | Purpose |
|------|---------|
| `src/components/ui/glass-panel.tsx` | Reusable glass-morphism panel (forwardRef), replaces 12+ inline reimplementations |
| `src/components/ui/gem-swatch.tsx` | Colored gem circle indicator, deduplicates RunTrack + ActiveEncounterPanel |
| `src/components/ui/stat-pill.tsx` | Label/value display pair using ds-* tokens |
| `src/components/ui/modal-overlay.tsx` | Backdrop overlay with blur + centering |
| `src/components/CesiumInfoBox.tsx` | Extracted info box overlay from CesiumMap, inline styles → Tailwind |
| `src/hooks/useExpeditionRun.ts` | ~500 lines of expedition state extracted from MainAppLayout |
| `src/hooks/useCesiumFullscreen.ts` | Fullscreen toggle button extracted from CesiumMap |
| `src/hooks/useCesiumTrail.ts` | Trail polyline + node markers + spatial layer loading extracted from CesiumMap |
| `src/hooks/useSpeciesPanelState.tsx` | 8 EventBus listeners + clue/HUD state extracted from SpeciesPanel |

## Files Modified

### Phase 1 — Foundation

| File | Changes |
|------|---------|
| `src/styles/globals.css` | Added 17 z-index CSS custom properties (`--z-base` through `--z-guess-dropdown`), 2 gradient tokens (`--ds-gradient-cta`, `--ds-gradient-progress`) |
| `tailwind.config.js` | Added `zIndex` extend mapping CSS vars to Tailwind tokens |
| `src/components/BankedScore.tsx` | Rewritten using GlassPanel + StatPill primitives |
| `src/components/GemWallet.tsx` | Inline styles → Tailwind + GlassPanel |
| `src/components/SpookMeter.tsx` | Inline styles → Tailwind + GlassPanel, simplified TIER_CONFIG |
| `src/components/ConsumableTray.tsx` | Inline styles → Tailwind + GlassPanel, responsive max-width |
| `src/components/SouvenirPouch.tsx` | Inline styles → Tailwind + GlassPanel |
| `src/components/RunTrack.tsx` | Inline styles → Tailwind + GemSwatch, `role=progressbar`, `aria-label` on nodes, responsive scroll |
| `src/components/ActiveEncounterPanel.tsx` | Full rewrite: Tailwind + GemSwatch, TIER_COLORS/TIER_LABELS use CSS vars, `<section>` + `aria-label`, responsive sizing |
| `src/components/CrisisOverlay.tsx` | Rewritten using ModalOverlay + GlassPanel, `role=alertdialog` + `aria-modal`, focus trap |
| `src/components/ClueSheetWrapper.tsx` | Inline portal styles → Tailwind z-tokens, `role=dialog` + `aria-modal` + `aria-label`, Escape key, focus trap |
| `src/components/DeductionCamp.tsx` | Full rewrite: Tailwind + GlassPanel + StatPill, `aria-label` on buy buttons, `role=status`/`role=alert` on results |
| `src/components/ExpeditionBriefing.tsx` | Full rewrite: Tailwind, responsive grid (`grid-cols-2 sm:grid-cols-4`), `role=radiogroup` + `aria-checked` on affinities, responsive node circles |

### Phase 1 — Z-Index Migration

| File | Changes |
|------|---------|
| `src/components/BottomTabBar.tsx` | `z-[9000]` → `z-tab-bar`, `<div>` → `<nav>`, `aria-current` on active item, focus-visible ring |
| `src/components/ui/dialog.tsx` | `z-[9999]`/`z-[10000]` → `z-modal-backdrop`/`z-modal` |
| `src/components/ui/sheet.tsx` | `z-[99999]`/`z-[100000]` → `z-sheet-backdrop`/`z-sheet` |
| `src/PhaserGame.tsx` | `zIndex: 1` → `z-game` token |
| `src/components/CesiumMap.tsx` | `zIndex: '999'` → `z-menu` token (info box), full rewrite using extracted hooks |
| `src/components/FamilyCardStack.tsx` | Navigation arrows z-index → `z-carousel-nav` |
| `src/components/SpeciesCarousel.tsx` | Navigation arrows z-index → `z-carousel-nav` |
| `src/components/CategoryGenusPickerFixed.tsx` | Dropdown z-index → `z-dropdown` |
| `src/components/CategoryGenusPicker.tsx` | Dropdown z-index → `z-dropdown` |
| `src/components/CategoryGenusPickerSimple.tsx` | Inline styles → Tailwind (`bg-slate-800/90`, `border-slate-600`, `text-slate-200`, `text-red-500`), z-dropdown |
| `src/components/SpeciesGuessSelector.tsx` | Dropdown z-index → `z-guess-dropdown` |

### Phase 2 — Architecture

| File | Changes |
|------|---------|
| `src/MainAppLayout.tsx` | ~1080 → ~280 lines. Uses `useExpeditionRun()` hook. `RunCompleteSummary` extracted as local component. Remaining inline styles → Tailwind + GlassPanel. |
| `src/components/DenseClueGrid.tsx` | Card variant inline styles → Tailwind (`bg-white/5`, `text-slate-200`) |
| `src/components/SpeciesPanel.tsx` | 350 → 82 lines. Uses `useSpeciesPanelState()` hook. HUD inline styles → Tailwind. |

### Backend Bugs

| File | Changes |
|------|---------|
| `src/middleware.ts` | Changed from catch-all `/api/player/(.*)` to explicit protected route list (`ensure-profile`, `start-session`). Allows unauthenticated `GET /api/player/profile` for shareable profile links. |

## Summary Stats

- **Components migrated to Tailwind**: 13
- **Components with new ARIA/semantics**: 10
- **Components with responsive breakpoints**: 5
- **Z-index values centralized**: 17 layers across 15+ files
- **Reusable primitives created**: 4
- **State hooks extracted**: 3 (useExpeditionRun, useCesiumTrail, useSpeciesPanelState)
- **Utility hooks extracted**: 1 (useCesiumFullscreen)
- **Line reductions**: MainAppLayout 74%, SpeciesPanel 77%, CesiumMap 43%
