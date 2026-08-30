# Plan 030 — 08_29: Ecological Mystery Cases

## Product direction

Evolve the current species-deduction expedition into an ecological investigation game. Each case begins with a surprising event at a real GIS location. The player conducts match-3 fieldwork, chooses which evidence to analyze, identifies the species involved, and explains what is happening in the ecosystem.

The central question becomes:

> What is happening here, which species is involved, and what does the evidence support?

This retains the current match-3 and deduction foundations while giving each expedition a stronger narrative hook and a broader educational purpose.

## Why this direction

The current game can already:

- select a real map location and local species candidates;
- generate a three-site expedition;
- represent five evidence families with gem colors;
- award controlled soft hints from direct matches and Field Signals;
- offer evidence families based on accumulated charge;
- eliminate candidates through structured deduction profiles;
- compare a wrong guess with the mystery species;
- reveal species information after resolution.

Ecological Mystery Cases can reuse these systems while adding causal reasoning. A player should learn not only how to recognize a species, but also how its traits, habitat, relatives, behavior, and ecological role fit together.

## Educational goals

Each case should exercise several forms of reasoning:

1. **Species identification** — distinguish plausible species using incomplete evidence.
2. **Taxonomic reasoning** — use shared and distinguishing family traits.
3. **Ecological reasoning** — connect organisms to habitats, resources, interactions, and environmental changes.
4. **Causal reasoning** — distinguish a cause from a correlation or an innocent bystander.
5. **Evidence literacy** — recognize that observations differ in reliability and diagnostic strength.
6. **Responsible uncertainty** — allow “insufficient evidence” when the case has not been adequately investigated.

The game should reward a defensible explanation, not merely recall of a species name.

## Core game loop

```text
Ecological incident at a GIS location
                 ↓
Review candidate species and possible explanations
                 ↓
Visit three field sites
                 ↓
Play six-move match-3 surveys
                 ↓
Choose an evidence family to analyze at each site
                 ↓
Eliminate species and competing explanations
                 ↓
Submit species identification + ecological diagnosis
                 ↓
See the outcome, ecosystem consequences, and learning summary
```

## Example case

### Incident

Young trees are dying along a river corridor.

### Candidate species

- beaver;
- deer;
- porcupine;
- invasive wood-boring beetle;
- native woodpecker;
- fungal pathogen or another non-animal explanation.

### Competing explanations

- ordinary feeding activity;
- an unusually high herbivore population;
- invasive-species damage;
- drought stress;
- habitat displacement;
- mistaken attribution of the visible animal.

### Evidence progression

- Soft observation: “Damage is concentrated beside slow-moving water.”
- Comparative observation: “The marks are cuts, not insect galleries.”
- Strong analysis: “Paired incisors produced the cutting pattern.”
- Diagnosis: beaver activity is responsible.
- Ecological reveal: localized tree loss can create wetland habitat and benefit other species.

Correctly naming the beaver should not be sufficient for full credit. The player must also interpret whether its activity is destructive, natural, beneficial, or evidence of a larger ecological change.

## Match-3 purpose

Every evidence color represents a field investigation method:

| Evidence family | Field interpretation | Example output |
|---|---|---|
| Relatives | taxonomy, comparative anatomy, genetic relationship | family-level similarities and exclusions |
| Body | tracks, scat, feathers, wounds, morphology | physical evidence and measurements |
| Behavior | camera traps, acoustic observations, movement | activity patterns and interactions |
| Habits | feeding, nesting, breeding, resource use | recurring life-history evidence |
| Place | GIS range, habitat, elevation, climate, microhabitat | spatial and environmental compatibility |

Matching a color builds charge toward that investigation method. Concentrating matches should improve the chance that the desired family is offered after the site. Splitting colors should provide broader soft information but less control over the final analysis choice.

## Board objectives

The base loop should remain short and readable. Add board objectives gradually rather than introducing all of them at once.

### Existing objective to retain

**Field Signal**

- Appears after a cascade.
- Is cleared by an adjacent match.
- Uses the clearing match’s evidence color.
- Awards one controlled hint for a 3-match and two for a 4+ match.
- Gives no special payout when destroyed by a cascade.

### Candidate future objectives

**Camera Trap**

- Charge it with adjacent Behavior matches.
- Produces a partial observation or silhouette.
- Stronger charge can improve confidence, not necessarily specificity.

**Sample Vial**

- Move it to the bottom of the board.
- Produces a Body or Relatives analysis opportunity.

**Tracks**

- Follow or clear a connected path before it fades.
- Produces movement, size, or gait evidence.

**Survey Transect**

- Make matches across marked rows or columns.
- Produces Place evidence and teaches spatial sampling.

**Environmental Interference**

- Mud, vegetation, weather, noise, or human disturbance obscures selected cells.
- Clearing it improves evidence quality rather than directly giving a clue.

Only one new objective family should be prototyped at a time. Each must create an understandable board decision and an educationally meaningful result.

## Information ladder

Information must become more specific only as the player invests effort and commits to an investigative direction.

### Level 1 — Atmosphere

Broad context that creates curiosity without filtering heavily:

> The disturbance is concentrated near slow-moving water.

### Level 2 — Soft field hint

Suggestive evidence compatible with multiple candidates:

> The marks appear repeatedly at roughly the same height.

### Level 3 — Comparative evidence

Evidence that eliminates some candidates while preserving a meaningful choice:

> The damage was made by teeth rather than an insect larva.

### Level 4 — Strong analysis

An observation earned by selecting and charging an evidence family:

> Tooth spacing is consistent with a large semiaquatic rodent.

### Level 5 — Resolution and teaching

Explicit species facts, causal explanation, misconceptions, and ecosystem consequences appear after the player commits.

This ladder prevents an unrestricted random fact from solving the case prematurely.

## Case structure

Each authored or generated case requires:

- a GIS location or location-selection rule;
- a visible ecological incident;
- one responsible species or biological process;
- five or six plausible species candidates;
- two or more plausible causal explanations;
- evidence-family observations at several strengths;
- at least one misleading correlation that can be rejected fairly;
- a resolution explaining both identity and ecological significance;
- post-case learning material and source provenance.

Cases should not imply that every ecological change has a single organism as its cause. Later cases may include interacting causes or require the player to conclude that the evidence is insufficient.

## Case categories

Initial cases should use observable, comprehensible phenomena:

1. Feeding or structural damage.
2. Missing pollinators or seed dispersers.
3. Unusual tracks, scat, calls, or camera-trap activity.
4. A species apparently outside its expected range.
5. Changed activity time or seasonal behavior.
6. Predator disappearance and prey increase.
7. Possible invasive-species introduction.
8. Habitat disturbance incorrectly blamed on a visible species.

Avoid disease outbreaks, toxic contamination, or multi-factor climate cases until the evidence and explanation model can represent them responsibly.

## Difficulty progression

### Introductory cases

- Identify one species from clear indirect evidence.
- Use obviously distinct candidates.
- Present one causal question with immediate feedback.

### Intermediate cases

- Distinguish close relatives.
- Include convergent traits and habitat overlap.
- Require both species identification and ecological interpretation.

### Advanced cases

- Separate correlation from causation.
- Weigh conflicting or low-confidence observations.
- Consider multiple interacting species.
- Allow “insufficient evidence” or multiple defensible diagnoses.

## Scoring

Score should reward investigation quality rather than speed alone:

- efficient match-3 play;
- deliberate pursuit of useful evidence families;
- correct species identification;
- correct causal explanation;
- calibrated confidence;
- fewer unsupported accusations or guesses;
- identifying why rejected candidates do not fit;
- optional ecological-role and taxonomy questions after the case.

Do not reward withholding all guesses indefinitely. Limited field sites, move budgets, and analysis choices should force a decision.

## Content safety and clue rules

Pre-guess content must:

- remain compatible with more than one candidate unless it is a deliberately earned strong analysis;
- avoid species names, genus names, unique common-name fragments, and unmistakable signature facts;
- describe observable evidence before interpreting it;
- distinguish confidence from certainty;
- use structured tags for filtering rather than relying on prose parsing;
- record whether a clue is atmospheric, comparative, filtering, or post-resolution.

Highly diagnostic legacy facts should be retained as post-discovery educational content, not emitted randomly during match-3 play.

## GIS use

GIS should materially affect the case rather than serving as decorative scenery.

Potential inputs include:

- candidate range compatibility;
- ecoregion and biome;
- raster habitat composition;
- elevation and terrain;
- water proximity;
- habitat fragmentation and corridors;
- seasonality where reliable data exists;
- nearby land use or disturbance layers;
- route and field-site placement.

Every GIS-derived claim must expose its source and confidence. Missing or coarse data should broaden uncertainty rather than produce false precision.

## Taxonomy integration

Taxonomy should support play at multiple levels:

- eliminate an entire order or family through strong evidence;
- compare close relatives without treating one trait as universal;
- ask players to place the resolved species in its family;
- explain homologous traits versus convergent adaptations;
- unlock family-level journal pages after several related cases.

Taxonomic information should not routinely reveal the answer early. Exact genus or highly distinctive family labels belong in strong analysis or post-resolution material.

## Minimum viable prototype

Build one handcrafted case using the current six-species v3 deduction pool.

The prototype should include:

1. One ecological incident tied to an existing supported GIS location.
2. Six candidate species.
3. Three field sites with the current six-move boards.
4. Existing direct-match hints, cascade hints, and Field Signal behavior.
5. One strong observation selected after each site.
6. A final two-part answer:
   - Which species is involved?
   - Which explanation best accounts for the incident?
7. Wrong-answer feedback that contrasts both species and explanation.
8. A post-resolution ecology summary.

The first prototype should not add another special gem, generalized case generation, multi-cause incidents, or a large new scoring economy.

## Implementation phases

### Phase 0 — Content and model audit

- Inventory current deduction profiles, evidence hints, GIS fields, and post-discovery facts.
- Identify one case that can be supported without inventing unavailable data.
- Mark legacy clues as safe pre-guess, strong evidence, post-resolution, or rewrite.
- Define the incident and explanation vocabulary.

### Phase 1 — Case contract

- Extend the private case model with incident and explanation data.
- Extend the public projection with safe incident text and explanation choices.
- Keep the responsible species and answer hidden server-side.
- Add validation preventing answer-bearing fields from entering public payloads.

### Phase 2 — Author one complete case

- Write observations for all five evidence families.
- Confirm every filtering observation matches structured profile tags.
- Write wrong-answer contrasts and the ecological resolution.
- Review the case for ambiguity, factual accuracy, and premature identity leaks.

### Phase 3 — Final diagnosis interaction

- Add explanation selection alongside the species guess.
- Evaluate species and explanation independently.
- Return contrastive feedback without revealing the answer after an incorrect attempt.
- Preserve server ownership of the hidden answer and scoring.

### Phase 4 — Learning resolution

- Explain the evidence chain after success.
- Show the species’ taxonomic placement and ecological role.
- Clarify common misconceptions and why plausible alternatives were rejected.
- Preserve diagnostic facts for this post-resolution moment.

### Phase 5 — Playtest and tune

- Measure which evidence families players pursue.
- Record when players can identify the species or cause.
- Detect clues that reveal too much or fail to affect reasoning.
- Compare enjoyment and comprehension with the current species-only deduction loop.

### Phase 6 — Expand cautiously

- Add two contrasting cases only after the prototype passes its gates.
- Introduce one new board objective in an isolated prototype.
- Build reusable case-authoring validation before attempting procedural generation.

## Technical integrity requirement

Before competitive scoring or public progression depends on the mechanic, evidence progress must be verifiable by the server. The current server accepts client-asserted direct clears, match families, and Field Signal payout details. A modified client can therefore fabricate investigation progress while supplying a superficially valid checkpoint.

Acceptable approaches include:

- submit the selected swap and replay the deterministic board transition server-side; or
- submit a compact move log and verify it against the previous server-held checkpoint.

The server should derive evidence charges, direct-match families, cascades, signal state, and hint awards from the verified transition.

## Success criteria

The prototype succeeds if:

- players understand the incident before entering the first board;
- board colors produce intentional investigation choices;
- most players cannot solve the species from the first soft hint;
- strong evidence meaningfully changes the candidate or explanation set;
- players can explain why their final answer fits;
- the post-case reveal teaches an ecological relationship they did not already know;
- the ecological diagnosis feels more satisfying than a species-name reveal alone;
- the game remains playable with the current short three-site structure.

## Failure signals

Reconsider the design if:

- the incident is merely flavor text for the same species guessing loop;
- one random hint routinely identifies the answer;
- explanation choices can be solved without species or GIS evidence;
- match-3 decisions do not affect the investigation path;
- players must read long passages between every move;
- GIS data produces implausible certainty;
- authoring one reliable case requires unsustainable bespoke logic;
- players remember the answer but cannot explain the ecology.

## Explicit non-goals for the first release

- Fully procedural ecological mysteries.
- Real-time ecosystem simulation.
- An unrestricted random-clue gem.
- Simultaneous operation of the legacy clue-reveal ruleset.
- Exact population forecasting.
- Diagnosing real environmental emergencies.
- Multiplayer competition or global leaderboards.
- A large inventory, crafting, or energy economy.

## Recommended first decision

Choose one existing six-species deduction set and write a single ecological incident around evidence already present in the database. Test the narrative and two-part diagnosis using the current board before adding another match-3 mechanic.

The first question to answer is not “Which power-up should be added?” It is:

> Does explaining an ecological mystery make the current evidence choices more exciting and memorable than identifying the species alone?

## Implementation status — 2026-08-29

Phases 0–4 and the technical integrity requirement are implemented in run snapshot v4. The existing six-species pool now has six authored incident variants, a pre-board case-file beat, server-authoritative two-part diagnosis, contrastive feedback, post-resolution ecology/taxonomy/source material, and deterministic server replay of every submitted board move.

Phases 5–6 remain gated on observed playtests. See `docs/ECOLOGICAL_MYSTERY_CASES.md`.
