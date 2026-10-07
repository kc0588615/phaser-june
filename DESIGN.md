---
version: alpha
name: Critter Connect — Night Field Guide
description: Dark natural-history UI for a wildlife deduction game (grades 6-12). Forest green = action, blue = place, ochre = discovery, bark = structure. The match-3 board keeps its own bright category palette.
colors:
  primary: "#56754E"
  night: "#08110D"
  forest-surface: "#151B17"
  forest-raised: "#1B241D"
  quiet-border: "#354238"
  strong-border: "#5C6B60"
  warm-mist: "#F3F1E8"
  sage-text: "#A8B1A4"
  forest-action: "#56754E"
  on-forest-action: "#F3F1E8"
  moss: "#71845A"
  bark: "#7A5B44"
  river-blue: "#47788A"
  globe-blue: "#6FA8BC"
  ochre: "#C49A43"
  on-ochre: "#08110D"
  muted-red: "#D07A6E"
  gem-body: "#ff8a3d"
  gem-habits: "#ffd84a"
  gem-habitat: "#3fcf7c"
  gem-range: "#4aa6fb"
  gem-life: "#f66aa6"
  gem-notes: "#b27dff"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
    fontVariation: "'opsz' 96"
  heading-2xl:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
  heading-xl:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.25
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.45
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
  label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.3
  caption-xs:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.3
  number:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: 700
    fontFeature: "'tnum'"
rounded:
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  tap-min: 48px
components:
  button-primary:
    backgroundColor: "{colors.forest-action}"
    textColor: "{colors.on-forest-action}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.lg}"
    height: 48px
  button-secondary:
    backgroundColor: "{colors.forest-raised}"
    textColor: "{colors.warm-mist}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.lg}"
    height: 48px
  card:
    backgroundColor: "{colors.forest-surface}"
    textColor: "{colors.warm-mist}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px
  card-raised:
    backgroundColor: "{colors.forest-raised}"
    textColor: "{colors.sage-text}"
    rounded: "{rounded.lg}"
    padding: 16px
  toast:
    backgroundColor: "{colors.forest-surface}"
    textColor: "{colors.warm-mist}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 12px
  region-label:
    backgroundColor: "{colors.night}"
    textColor: "{colors.globe-blue}"
    typography: "{typography.label-sm}"
  discovery-badge:
    backgroundColor: "{colors.ochre}"
    textColor: "{colors.on-ochre}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
  journal-chip:
    backgroundColor: "{colors.forest-raised}"
    textColor: "{colors.sage-text}"
    rounded: "{rounded.full}"
  journal-divider:
    backgroundColor: "{colors.bark}"
    height: 1px
  error-text:
    backgroundColor: "{colors.forest-surface}"
    textColor: "{colors.muted-red}"
  app-icon:
    backgroundColor: "{colors.night}"
    textColor: "{colors.globe-blue}"
    rounded: "{rounded.lg}"
---

> **Superseded in the app by the cc theme: follow [GUI.md](GUI.md).** This file records the earlier Night Field Guide identity (logo rationale, old palette and type).

## Overview

**Night Field Guide.** Critter Connect is a free wildlife deduction game for grades 6-12: pick a continent on a
globe, then find the animal hiding in the clues. It should look like a naturalist's field guide read at night.
Dark by default, natural colours in the app shell, blue only for geography, and a separate colourful match-3 board.
It should never look childish; players are treated as capable field researchers.

**Logo: Graticule.** A globe drawn only as its grid: an outline, the equator, two parallels and one meridian, tilted
23.5° (Earth's axis), in Globe Blue, next to a Bricolage Grotesque 700 wordmark in Warm Mist. The tilt is what
makes the mark ours. Untilted, it is the stock "language" icon. The favicon drops to outline + equator + meridian.
Files: `docs/brand/logo/`, `public/favicon.svg`, `public/branding/critterconnect-logo.svg`. The full guide (clear
space, minimum sizes, misuse) is in `docs/brand/critter-connect-guidelines.pdf`.

## Colors

Each accent has **one job**. Contrast was measured on Night / Forest Surface.

- **Night (#08110D):** app background. Never pure black.
- **Forest Surface (#151B17) / Forest Raised (#1B241D):** cards, headers, sheets; raised = elevated or selected.
  Depth comes from lighter surfaces, never from shadows.
- **Quiet Border (#354238):** decorative separation only (1.8:1). **Strong Border (#5C6B60):** inputs and
  boundaries that must be seen (3.4:1, meets the 3:1 UI rule).
- **Warm Mist (#F3F1E8):** primary text (16.9:1). **Sage Text (#A8B1A4):** secondary text (7.9:1 on surface).
- **Forest Action (#56754E, `primary`):** action. Primary buttons, selected nav, confirm, controls. Warm Mist labels on it
  measure 4.58:1, so labels must be 14 px bold or larger.
- **River Blue (#47788A):** place. Map lines, graticule, map controls (3.9:1: lines and icons, **not text**).
- **Globe Blue (#6FA8BC):** the logo and any blue *text* (region names, coordinates), at 7.3:1.
- **Ochre (#C49A43):** discovery. New species, mastery, rare finds, celebration (6.7:1). Night text on ochre fills.
- **Bark (#7A5B44):** structure. Dividers, secondary badges, journal details. Decoration only (2.8:1).
- **Moss (#71845A):** secondary natural accent: icons, chip edges (4.3:1 on surface, 3.9:1 on raised; not small text).
- **Muted Red (#D07A6E):** errors only (5.6:1 on surface).

**Game category colours** (`gem-*`, from `src/clueGame/gems.ts`) are game data: Body orange, Habits yellow,
Habitat green, Range blue, Life pink, Notes violet. They live on the board and in clue chips, and never colour
buttons, notifications or navigation. A green gem means Habitat; a green button means action.

## Typography

Two families, both OFL on Google Fonts.

- **Bricolage Grotesque** (display/brand): wordmark, major screen titles, marketing. 700, `opsz` 96, tight tracking.
- **Atkinson Hyperlegible Next** (UI/reading): buttons, clues, species names, notifications, settings, HUD. Its
  capital I, lower-case l and 1 are clearly different (audit overlap 0.66 vs Inter's 0.95), which matters when
  players scan species names.

Scale: 13 / 14 / 16 / 18 / 22 / 28 / 36 px. Essential text is never below 14 px; clue and body text is 16 px or
larger. Scores and counters use `tnum`. The Phaser board's canvas text should use Atkinson once loaded, not Arial.

## Layout

Mobile-first, full-height, no page scroll. 4 px base (4/8/12/16/24). Every tap target is at least 48 px. One
exception: the game screen's evidence grid (plan 044) uses 12 px labels and names and 34 px rows, so a 375×548 phone
keeps a playable board; a whole row is its tap target, and ruling out takes a second tap in the status line. Screens:
**Globe** (Night, Globe Blue globe, Warm Mist type, Forest Action CTA) · **Match-3** (existing navy board and bright
gems inside a natural-dark HUD) · **Species/Journal** (forest surfaces, bark/moss details; photos lead) · **Maps**
(River Blue more prominent) · **Rewards** (Ochre more prominent).

## Elevation & Depth

Level 0 Night → Level 1 Forest Surface (cards, containers) → Level 2 Forest Raised (sheets, popovers, selection).
No drop shadows; edges use Quiet Border, or Strong Border where the edge must be found.

## Shapes

12 px radius for buttons, cards and sheets; 8 px for small rows; full pills for chips and badges. The app icon tile
uses about 22% radius. The logo itself has no container.

## Components

- **Buttons:** primary = Forest Action fill + Warm Mist bold label; secondary = Forest Raised + Strong Border.
- **Toasts/notifications:** always a Forest Surface card. Only the icon and a 3 px left edge change colour:
  success forest green, info River Blue, warning ochre, error muted red, discovery ochre + sparkle. No full-colour
  banners.
- **Focus ring:** 2 px Globe Blue plus 2 px Night offset (works on every surface).
- **State is double-coded:** every colour state also has an icon or a word (✓ Yes / ✗ No, "New species").

## Do's and Don'ts

- Do give each accent only its job: green acts, blue locates, ochre rewards, bark structures.
- Don't use gem colours outside the board and clue chips.
- Don't set text in River Blue, Bark or Quiet Border; use Globe Blue, Sage Text or Warm Mist.
- Don't straighten, fill, recolour or add continents to the favicon-size globe; the tilted open grid is the mark.
- Don't use the old paw emblem, cyan `#67e8f9` or gold `#fcd34d` in new work.
- Do load both fonts (e.g. `next/font/google`); never name a font the page doesn't load.
