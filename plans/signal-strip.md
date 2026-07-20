# Match Signal Strip (replaces obstacle banner)

The amber "Limited Signal · Unknown Terrain" text at the top of the Phaser board is
the old node-obstacle indicator (`obstacleText`, src/game/scenes/Game.ts ~472 and
~1272) — vestigial copy from the stripped RPG system. Replace it with a
FieldNotebook-styled React strip showing a color dot per gem category that lights
up as each category is matched.

Single commit: `feat: gem signal strip replaces obstacle banner`.
Gate: `npm run typecheck` + `npm run build`.

1. **Remove the Phaser banner.** Delete `obstacleText` (field, creation at ~472,
   the setText/setVisible block at ~1272, and any resize repositioning). The
   obstacle data/cell seeding stays — only the text banner goes.
2. **Track matched categories.** Add `matchedGemCategories: ClueCategoryKey[]` to
   RunState (src/types/expedition.ts) + INITIAL_RUN_STATE. In
   `handleDeductionClueTriggered` (ExpeditionContext — it already fires on every
   match and patches state), append the wallet key if not present. Ensure the
   expedition-data-ready handler seeds it `[]` for each new run.
3. **New `src/components/GemSignalStrip.tsx`.** Slim glass bar pinned to the TOP of
   `#phaser-game-wrapper` (mirror FieldNotebook's collapsed-bar styling: ~40px,
   GlassPanel or same border/backdrop classes, `absolute top-0 left-0 right-0
   z-panel`). Content: small label `FIELD SIGNAL` (same style as the notebook's
   `FIELD NOTEBOOK` header caption) + 8 dots in LOOT_GEM_TYPES order using each
   gem's color from GEM_REGISTRY (src/expedition/domain.ts GEM_COLOR_MAP).
   - Unmatched: hollow ring (border in gem color at ~45% opacity, transparent
     fill).
   - Matched (wallet key in matchedGemCategories): filled with the gem color +
     subtle glow.
   - On the match event for a category (listen to EventBus
     `deduction-clue-triggered` locally for the transient), pulse that dot
     (CSS keyframe scale ~1.35 → 1, ~400ms) — including re-matches of an
     already-filled dot.
   - `title` tooltip per dot: the gem's category label (use the clue category
     labels the notebook/legend already uses, e.g. "Geography & Habitat" for
     blue, "Habitat Survey" for green).
4. **Mount in MainAppLayout** inside `#phaser-game-wrapper`, rendered when
   `inRun && runState.phase === 'mystery'`, alongside FieldNotebook. Must not
   block board input outside its own bar (pointer-events pattern as
   FieldNotebook).
5. Check nothing else renders into that top strip area (score/moves text live at
   the bottom corners — leave them).
