# Strip Polish: frosted glass, no auto-expand, clue ticker

Playtest feedback on the Field Signal / Field Notebook bars. Three changes, one
commit: `polish: frosted strips, no auto-expand, clue ticker`.
Gate: `npm run typecheck` + `npm run build`.

1. **Frosted glass on both bars.** The collapsed FieldNotebook bar
   (src/components/FieldNotebook.tsx) and the GemSignalStrip bar
   (src/components/GemSignalStrip.tsx) currently use
   `bg-ds-surface-elevated/95 backdrop-blur-md` — nearly opaque. Switch both to
   the app's frosted utility: `glass-bg` (globals.css:321 —
   var(--ds-glass-bg) + 12px blur) so the gems show through. Keep the border +
   text styling. If contrast suffers over bright gems, a light
   `bg-black/10`-style tint on top of glass-bg is acceptable — but keep it
   clearly translucent. Leave the EXPANDED notebook panel as is (already
   GlassPanel).
2. **Never auto-expand the notebook.** Remove the first-clue auto-expand in
   FieldNotebook (the `autoExpandedRef` logic + its branch in the
   processedClues effect). The collapsed-bar flash/pulse on new clues stays.
   Player expands only by tapping.
3. **Clue ticker in the signal strip.** In GemSignalStrip, once the first clue
   unlocks, the left "FIELD SIGNAL" caption is replaced by a rotating readout of
   unlocked clue texts: each shows for 3 seconds, then the next, in unlock
   order, looping continuously. New unlocks show immediately (jump the
   rotation to the new text, then continue in order). Dots on the right stay.
   - Sources: species/site facts (comp.processedClues labels, array order =
     unlock order) AND revealed habitat-survey entries
     (`{habitatType} {percentage}%`). Simplest robust approach: keep a local
     queue in the component — on each render, diff current
     processedClues/revealed-survey against a known-ids ref and append new
     labels; a 3s interval advances the display index, looping.
   - GemSignalStrip will need access to `runState.comparativeDeduction`
     (processedClues + habitatSurvey) — extend its props from MainAppLayout.
   - Reset the queue when the run changes (key off runState.expedition identity
     or phase leaving 'mystery' — same reset idiom as FieldNotebook's
     notebookRunId).
   - Single line, truncate with ellipsis; keep the text style consistent with
     the current caption (small caps cyan is fine for "FIELD SIGNAL"; clue text
     should be normal-case `text-ds-text-primary` caption size).
   - Before the first unlock, show "FIELD SIGNAL" as today.
