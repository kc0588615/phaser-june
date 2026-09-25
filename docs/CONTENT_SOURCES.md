# Clue Match content: sources, tags, workflow

Content lives in git, in `db/content/`:

- `sources.json`: the source registry, ranked in tiers (loaded into `content_sources`).
- `animals/<id>-<slug>.json`: one profile per animal (`AnimalProfile` in `src/clueGame/profiles.ts`).

`npm run content -- build` turns the profiles into `species`, `species_deduction_clues` and `species_facts` rows. Postgres is a copy; edit the files, not the rows.

## Source tiers

| Tier | Keys | Use for |
|---|---|---|
| 1 | `iucn`, `iucn_range` | Red List category, year, trend, habitats (IUCN classification), elevation, threats, ecology text. `iucn_range`: realms and countries computed from the range polygons. |
| 2 | `tftsg`, `amphibiaweb`, `asw`, `reptile_db`, `adw`, `mdd`, `literature` | Size, diet, breeding, lifespan, behavior; `literature` is a paper (DOI link). |
| 3 | `smithsonian`, `sdzwa`, `government`, `ngo`, `britannica` | Zoo fact sheets, recovery programs, recent counts. |
| 4 | `wikipedia`, `news` | Only what higher tiers don't cover (recent discoveries, "first in 50 years"). Check the article's own cited source. |

Rules:

- Take each fact from the highest tier that states it. When sources disagree, the higher tier wins (ADW's Asian elephant gestation "18 to 23 weeks" lost to Smithsonian's 18 to 22 months).
- Every trait, clue and fact names its `source` key. `url` points to the exact page when it isn't the profile's page for that key (a news story, a DOI).
- Red List data comes from the latest assessment; `redList.url` is its page. `year` is the year published.
- Habitats are IUCN classes and level-2 kinds, marginal ones included. Add a kind the IUCN text supports but its table omits (the Sunda pangolin's "lowland dipterocarp forest"), so a clue can't wrongly rule the animal out. Never add one no source supports.
- Leave a trait out when no source documents it. Missing data never rules a candidate out.
- Photos: Wikimedia Commons, public domain, CC0, CC BY or CC BY-SA only, credited. A real photo of the right species; no photo beats a wrong one (the extinct Floreana tortoise has none).

## From profile to clues

Every animal gets template clues from its shared traits, so decoys share them and the answer shows itself slowly. Then come its own clues. Per color, the game shows the clues that fit the most candidates first, so broad clues come first and unique ones last.

| Color | Template clues |
|---|---|
| Family tree | class, order, family, genus |
| Habitat | land/fresh water/sea, IUCN habitat classes, their kinds, elevation |
| Range | realms (≥10% of the range), then the globe countries (≥5% or 5,000 km²) |
| Body | covering, size |
| Behavior & diet | diet, activity, social life |
| Life cycle | eggs or live birth, young per litter, lifespan |
| Conservation | Red List category (year), trend |

## Tags

`prefix:value`, lowercase. How a clue's tag compares with a candidate (`src/clueGame/deduction.ts`):

- **One value per animal** (exclusive): `class`, `order`, `family`, `genus`, `size`, `lifespan`, `diet`, `activity`, `birth`, `young`, `social`, `covering`. Another value rules the candidate out.
- **Full list** (complete, one source for every animal): `realm`, `country`, `system`, `habitat`, and each habitat class as the prefix of its kinds (`forest:tropical_moist_lowland`). A candidate with some values but not this one is ruled out.
- **Open traits** (no prefix): written in `clues[].tags`. A candidate without the tag has "no record", which proves nothing. Reuse a tag when two animals truly share the trait; that is what makes look-alikes confusing (`burrower`: frogs, tortoises, pangolin, wombat; `pouch`: marsupials and the echidna; `stripes`: tiger, okapi, zebra). Unique tags are the late "aha" clues.

Trait values (templates in `profiles.ts`):

| Trait | Values |
|---|---|
| size | tiny < 100 g, small 100 g to 2 kg, medium 2 to 30 kg, large 30 to 300 kg, huge > 300 kg |
| lifespan | short < 5 years, medium 5 to 20, long > 20 (longest known, zoo records included) |
| young | one (1 or 2 per litter or clutch), few (3 to 10), many (> 10) |
| diet | plants, meat, insects (and other small invertebrates), mixed |
| activity | day, night, twilight, any |
| social | alone, pairs, groups |
| covering | fur, spines, scales, armor, shell, skin (mostly bare) |

Look-alike decoys are the animals sharing the most traits, rare ones weighted most (`similarity` in `src/clueGame/round.ts`).

## Workflow

1. Edit or add `db/content/animals/<id>-<slug>.json` (a new animal takes the next id; ids never change).
2. `npm run content -- preview [name]`: the clues and facts a profile makes, and any problems.
3. New animal: `npm run content -- ranges` (realms and countries from its IUCN polygon, keyed by `iucnId`) and `npm run content -- photos` (look at the result).
4. `npm run content -- build` (one transaction), then `npm run content -- check`.
5. If the set of animals or their ranges changed, refresh `clue_match_ranges` and `clue_match_places` (docs/CLUE_MATCH.md).
6. `npm test` validates every profile and simulates rounds; then play `/clue-match?seed=1`.

Copy is for grades 6 to 12: short sentences, no gore, no medical words. Science words stay and get a glossary entry (`src/clueGame/glossary.ts`).
