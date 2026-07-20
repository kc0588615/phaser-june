# Strip fixes: full-width ticker text + more translucent glass with AA contrast

Playtest feedback. One commit: `polish: full-width ticker, translucent strip glass`.
Gate: `npm run typecheck` + `npm run build`.

1. **Ticker text must read until the color dots.** In
   src/components/GemSignalStrip.tsx the bar has ticker text and the dots list
   BOTH `flex-1`, so dots reserve ~half the bar and text truncates early even
   with free space. Fix: ticker span stays `min-w-0 flex-1 truncate`; the dots
   `<ul>` becomes `flex-none` (content width). Long clues may still ellipsize at
   the dots — that's fine.
2. **More translucent glass on the two strips, WCAG AA (>= 4.5:1) preserved.**
   Do NOT change `--ds-glass-bg` (0.85 alpha, used app-wide). Add a new utility
   in globals.css next to `.glass-bg`:
   ```css
   .glass-strip {
     background: rgba(8, 12, 28, 0.6);
     backdrop-filter: blur(14px);
     -webkit-backdrop-filter: blur(14px);
   }
   ```
   Verified math (worst case: pure-white gem behind the strip):
   rgba(8,12,28,0.6) over #fff -> effective ~#6B6D77, relative luminance ~0.153;
   white text (L=1.0) -> (1.05)/(0.203) ~= 5.2:1  PASS;
   --ds-text-primary (#f8fafc-ish, L~0.96) -> ~5.0:1  PASS.
   Do not raise translucency past this (0.55 alpha drops near 4.5 borderline).
   Apply `.glass-strip` (replacing `glass-bg`) to:
   - GemSignalStrip bar
   - FieldNotebook collapsed bar
   Ensure primary text on both bars is `text-ds-text-primary` or white; the cyan
   "FIELD SIGNAL"/"FIELD NOTEBOOK" caption is fine (bold small caps; check
   --ds-cyan on the effective bg — if below 4.5, bump those captions to a
   lighter cyan e.g. #7dd3fc, which passes). Add
   `text-shadow: 0 1px 2px rgba(0,0,0,0.45)` on the strip text (readability
   margin over busy gems; not counted for WCAG).
3. **FieldNotebook collapsed bar text width**: same flex audit — the flash/count
   span should get remaining width (`min-w-0 flex-1 truncate`), chevron
   `flex-none`, so flashed clue labels also read as far as possible.
