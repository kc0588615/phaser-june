# Critter Connect — Design Guide

Brand, art, and content standard for Critter Connect: the game UI, marketing/website pages, and any new art assets (cards, icons, OG images, banners). Grounded in the tokens and copy rules already live in this repo — extend these, don't invent parallel ones.

Status: living standard. Update this file when tokens or tone rules change; don't fork a second style doc.

---

## 1. Who this is for

**Audience: grades 6–12** ([[feedback_audience_tone]] memory; confirmed in `docs/DEDUCTION_CAMP_ECONOMY.md` and copy across `src/game/matchBattle/catalog.ts`).

This governs every visual and verbal decision below:

- **Not a kids' app** — no baby-ish rounded mascots, no primary-color-block "learning app" look. Treat the player like a field researcher, not a toddler.
- **Not a college course either** — no dense tables, no citation-heavy layouts, no gray institutional chrome.
- **Outdoor-tech, not military/medical.** Reference points: trail cameras, spotting scopes, smartwatches, drone HUDs, field journals — not weapons, hospitals, or combat UI, even though the underlying system is a battler (see §5).
- **Cool > cute.** Kids reject anything that reads as "trying too hard to be educational." The bar is: would a 14-year-old screenshot this to show a friend?

## 2. Core fantasy

From `docs/SPECIES_ALBUM_TCG_SYSTEM_SPEC.md`: the player is not reading a database — they're building a **field binder of hard-won discoveries**. Every surface should reinforce three things simultaneously:

1. **Identity** — this is a real, specific, endangered species.
2. **Evidence** — the facts on screen were *earned* through deduction, not handed over.
3. **Place** — the GIS route/expedition context that produced this discovery is part of the trophy, not throwaway metadata.

Art and copy should always answer "what did I *find*, and how do I *know*?" — never just "here is a fact."

## 3. Visual identity — source of truth

The live design system lives in `src/styles/globals.css:256-317` (`--ds-*` custom properties) and `src/game/gemSemantics.ts` / `src/expedition/domain.ts` (`GEM_REGISTRY`). This is a **dark-only** app — do not design light-mode marketing pages that clash with it; extend the dark palette outward instead.

### 3.1 Surfaces (do not redefine — reuse these variables)

| Token | Value | Use |
|---|---|---|
| `--ds-background` | `#0a0e1a` | App/page background |
| `--ds-surface` | `#131a2e` | Cards, panels |
| `--ds-surface-elevated` | `#1c2541` | Modals, popovers, raised chrome |
| `--ds-border-subtle` | `rgba(255,255,255,0.08)` | Default hairline borders |
| `--ds-border-accent` | `rgba(34,211,238,0.3)` | Focused/active borders |
| `--ds-text-primary` | `#f1f5f9` | Body/heading text |
| `--ds-text-secondary` | `#94a3b8` | Supporting text |
| `--ds-text-muted` | `#64748b` | Disabled/tertiary text |

### 3.2 Brand accents

| Token | Value | Use |
|---|---|---|
| `--ds-accent-cyan` | `#22d3ee` | Primary brand color — CTAs, links, active states, `--primary` in shadcn bridge (`globals.css:125`) |
| `--ds-accent-amber` | `#f59e0b` | Warnings, energy/resource highlights |
| `--ds-accent-emerald` | `#10b981` | Success, positive conservation status |
| `--ds-accent-rose` | `#f43f5e` | Destructive, danger, `--destructive` |

**Website pages must reuse `--ds-accent-cyan` as the single primary brand color.** Do not introduce a second "marketing" brand color — the game and the website are one product to the player, and a mismatched landing-page palette is the fastest way to make the site look like a different app than the game.

### 3.3 Gem/category colors (already load-bearing — never repurpose)

These map 1:1 to the 8 clue categories in `src/game/clueConfig.ts` (`GemCategory` enum) and drive both board gems and clue-shop UI. They are semantic, not decorative — reusing e.g. `--ds-gem-observe` for something unrelated to Classification will confuse returning players.

| Gem var | Hex | Clue category | Icon |
|---|---|---|---|
| `--ds-gem-observe` | `#ef4444` | Classification | 🧬 |
| `--ds-gem-camouflage` | `#22c55e` | Habitat | 🌳 |
| `--ds-gem-scan` | `#3b82f6` | Geographic | 🗺️ |
| `--ds-gem-traverse` | `#f59e0b` | Morphology | 🐾 |
| `--ds-gem-pack` | `#fb923c` | Behavior | 💨 |
| `--ds-gem-notes` | `#cbd5e1` | Life Cycle | ⏳ |
| `--ds-gem-focus` | `#8b5cf6` | Key Facts | 🔮 |
| `--ds-gem-burst` | `#06b6d4` | Conservation | 🛡️ |

When designing new art (cards, badges, chart legends) for a specific clue category, pull the color from this table — don't eyeball a new shade.

### 3.4 Effects vocabulary

- **Glassmorphism** (`.glass-bg`, `.glass-strip` in `globals.css:319-339`): translucent `rgba(8,12,28,0.6)` + `blur(12–14px)`, used for HUD strips floating over the map/board. This is the signature "field device overlay" look — a heads-up display over the natural world, not a flat card. Reuse it for any new floating UI (banners, tooltips, notification toasts).
- **Glow** (`.glow-cyan/.glow-amber/.glow-rose`): soft `box-shadow` halos for active/important elements. Use sparingly — glow signals "this is interactive or notable," not decoration.
- **Contrast floor**: the `.glass-strip` comment (`globals.css:326-328`) documents a real constraint — 0.6 alpha is the minimum to keep `#f1f5f9` text at ~4.7:1 (WCAG AA) over a worst-case light background. Any new translucent surface must be checked against this same floor, not assumed safe.

### 3.5 New static assets (logo, OG image, banners, cards)

None of these exist in the codebase yet — flagged here as gaps rather than guessed:

- **Background**: always `--ds-background` (`#0a0e1a`) or a subtle gradient toward `--ds-surface`. Never white/light backgrounds behind the logo — it will look like a different, unrelated app when placed next to in-product screenshots.
- **Primary mark color**: `--ds-accent-cyan`. A secondary color pulled from the gem table is acceptable for a two-tone lockup (e.g., cyan + emerald for a "field + conservation" feel) but never introduce a hue absent from §3.2/§3.3.
- **Texture**: subtle glass/glow treatment consistent with §3.4 — a flat vector logo with no glow will read as off-brand next to real UI screenshots.
- **OG image / banner copy**: must pass the tone rules in §4 (no academic or violent framing) since these are the first thing a non-player sees.

## 4. Voice and copy standard

Full lexicon lives in [[project_match_battle_theme]] — this section is the summary for anyone writing new copy (UI strings, marketing pages, card flavor text).

**Rule:** every player-facing string is filtered through the **research/discovery** frame, never combat/medical/academic framing, even where the underlying system is literally combat or literally scientific.

| Reject (academic) | Reject (violent/medical) | Use instead |
|---|---|---|
| Census, Transect, Specimen Sample | Assault, Adrenaline Shot, Maul | Field Notes, Critter Track, Trail Mix |
| Observation | Data / Field Notes | "+5 Data" (must read as a natural stat) |
| Keystone Species | — | Apex Specimen |
| — | Disturbance Flare | Camera Flash |

**Test before shipping any new string:** would a 14-year-old think this word is "cool," or does it sound like a textbook / a war game? If either fails, rename. The user kid-tests names directly — default to the simpler word when unsure.

**Internal vs. player-facing (critical, see [[project_match_battle_theme]]):** this rule applies to labels, descriptions, and log strings only. Never rename internal ids (`ActionGemType` values, node types, debuff ids like `burn`/`web`) — they're persisted in `eco_run_sessions.metadata`. Map raw ids to on-brand copy at the display layer (e.g. `DEBUFF_LABELS`), never by renaming the id itself.

This same filter applies to website copy: marketing pages, page titles, button labels, error states. A pricing page or 404 page should sound like the same voice as the in-game HUD, not switch to generic corporate SaaS copy.

## 5. Education and scientific rigor

Critter Connect's educational credibility is a **data-integrity** property, not a tone property — it comes from what's true underneath the fun surface, not from adding textbook-style chrome on top.

- **Real taxonomic data.** Clue content (`src/game/clueConfig.ts`, `CLASSIFICATION_SEQUENCE`, `KEY_FACTS_SEQUENCE`, etc.) is sourced from real `Species` fields: `phylum`, `class`, `taxon_order`, `family`, `genus`, `scientific_name`. Never invent placeholder taxonomy for new content — it must trace to the `species` table.
- **Real conservation status.** `conservationCode`/`conservationText` (`src/db/schema/species.ts:87-88`) trace to actual IUCN Red List data (`src/db/schema/species.ts:29`, joined via `iucn_id`). This is the one place where accuracy is non-negotiable even under the fun-first tone rules in §4 — a conservation status badge must reflect the real IUCN code, not a game-invented tier.
- **Deduction, not lookup.** The economy (`docs/DEDUCTION_CAMP_ECONOMY.md`) is built so facts are *purchased/revealed progressively* through clue categories, mirroring how field scientists build a case from partial evidence rather than being told the answer. Any new content or UI should preserve this reveal structure — don't add a "just show me the species" shortcut that undercuts the deduction loop, since that loop *is* the scientific-method framing.
- **Place-based learning.** GIS-backed run generation ties each discovery to a real geographic/habitat context (`docs/ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md`). New art or copy referencing habitat/geography clues should stay anchored to the actual run's GIS data, not generic stock nature flavor text.
- **Rigor lives in the data model, fun lives in the presentation.** When in doubt about a tradeoff, keep the underlying fact/species/conservation data accurate and put the "kid-tested, cool" treatment (§4) entirely into labels, animation, and framing — never into the fact itself.

## 6. Applying this guide

- **New UI components**: pull colors exclusively from `--ds-*` tokens (§3) and the shadcn bridge (`globals.css:117-140`) — never hardcode a hex not already in this table.
- **New copy**: run it through §4's test before merging.
- **New species/clue content**: verify against §5 before treating it as ship-ready — a clue that isn't traceable to a real `species` row or real IUCN code is a bug, not a content choice.
- **Website pages** (landing, marketing, any non-game route): same token set as §3, same voice as §4. The website is not a separate brand from the in-game HUD.
- **Conflicts**: if a new design need doesn't fit an existing token (e.g., a genuinely new semantic color), extend `--ds-*` in `globals.css` and add it to the tables in this doc in the same change — don't introduce an ad hoc value elsewhere and leave this guide stale.
