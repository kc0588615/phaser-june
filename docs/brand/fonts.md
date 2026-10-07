# Critter Connect — fonts

> Night Field Guide fonts, no longer loaded by the app. The cc theme (`GUI.md`) names:
> - **Open Runde** (data: counts, numbers). OFL-1.1, bundled: `public/fonts/open-runde/` (Regular 400, Bold 700, which also serves 800), `@font-face` in `src/styles/globals.css`.
> - **GT Maru** (ui, brand, editorial). Paid Grilli Type web license (trial fonts are for testing only), not bought. **Nunito** stands in (chosen 2026-10-06 over Nunito Sans, M PLUS Rounded 1c, Zen Maru Gothic, Varela Round): rounded like GT Maru, real 400/700/800, compact enough for the phone grid. OFL-1.1, bundled: `public/fonts/nunito/` (Fontsource 5.3.0, latin + latin-ext). To switch to GT Maru later: add its files and `@font-face` rules, and set `--font-ui`, `--font-brand` and `--font-editorial` back to `"GT Maru", sans-serif` in `src/styles/globals.css`.

Font files are not part of this kit. Get them from the source below under their licence.

## Display: Bricolage Grotesque

- Source: google — https://fonts.google.com/specimen/Bricolage+Grotesque
- Licence: OFL-1.1
- Weights: 700; axes: wght 700, opsz 96, wdth 100
- Tracking: -20/1000 em; Case: as written
- Features: defaults
- Fallback: system-ui, sans-serif

## Text: Atkinson Hyperlegible Next

- Source: google — https://fonts.google.com/specimen/Atkinson+Hyperlegible+Next
- Licence: OFL-1.1
- Weights: 400, 700; axes: wght 400
- Tracking: 0/1000 em; Case: as written
- Features: tnum
- Fallback: system-ui, sans-serif
