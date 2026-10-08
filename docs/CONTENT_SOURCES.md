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
- Photos: Wikimedia Commons, public domain, CC0, CC BY or CC BY-SA only, credited. A real photo of the right species; no photo beats a wrong one. `"photo": null` marks "checked, none" so `photos` skips it (the extinct Floreana tortoise: Commons only has other Galápagos tortoises under its old shared name).

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
3. New animal: import its range first (`npm run iucn -- find|import`, see `docs/SHAPEFILE_BEST_PRACTICES.md`), then after a build `npm run content -- ranges` (realms and countries from its IUCN polygon, keyed by `iucnId`) and `npm run content -- photos` (look at the result).
4. `npm run content -- build` (one transaction), then `npm run content -- check`.
5. If the set of animals or their ranges changed, refresh `clue_match_ranges` and `clue_match_places` (docs/CLUE_MATCH.md).
6. `npm test` validates every profile and the pool; `node scripts/run-typescript.mjs scripts/balance-044.ts` plays seeded rounds; then play `/explore/?seed=1`.

Copy is for grades 6 to 12: short sentences, no gore, no medical words. Science words stay and get a glossary entry (`src/clueGame/glossary.ts`).

## Research access

- **IUCN**: `iucnredlist.org` blocks bots. The `parallel-search` MCP `web_fetch` can read `https://staging-www.iucnredlist.org/details/<taxon>/0` (latest assessment: category, year, trend, habitat classes, elevation, citation with assessment id) and `https://staging-www.iucnredlist.org/species/<taxon>/<assessment>/pdf` (full text + Appendix habitat table). Batch ~7 URLs per call. Excerpts can silently drop table rows (the savanna elephant's wetland and desert rows only came back on a second fetch): when a habitat class on the details page has no kinds in the table, refetch with objective "every row of the Appendix Habitats table" and `search_queries`.
- **parallel-search `web_search` hits a free-tier rate limit** after a burst (~15 calls); `web_fetch` kept working. Fall back to direct fetches.
- **ADW**: plain `curl`/urllib works: `https://animaldiversity.org/accounts/<Genus_species>/`, sections split on `<h2 id="...">` (`physical_description, reproduction, lifespan_longevity, behavior, food_habits, habitat, communication, predation`). Some accounts use old spellings (`Zaglossus_bruijni`). Keep ~7,000 chars per section; the first scraper truncated to 1,600 and lost the key numbers.
- **Wikipedia**: the API with a User-Agent works: `api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=<title>`. Retry on rate limits.
- **AmphibiaWeb** blocks bots; its text shows up in search excerpts.
- **Wikimedia Commons** API (`action=query&prop=imageinfo&iiprop=url|extmetadata`) gives license, author, description. `generator=search&gsrnamespace=6` searches files.
- **Red List details**: `year` is the year *published*, not assessed (the elephant was assessed 2020, published 2022). Errata and amended versions carry a new assessment id; use the id in the citation line. A Green Status assessment on the same page can show its own trend; the Red List trend is under Population.
- **Habitat tables miss things the text says**: the giant otter's table has no rivers, the Andean bear's no cloud forest. Add the kind the text supports (see Rules); note it for owner review in the plan.
- **Photos**: `npm run content -- photos` can pick a book illustration (the hirola's was an 1894 drawing) or a museum mount (both long-beaked echidnas). Look at every photo; search Commons (`generator=search&gsrnamespace=6&gsrsearch=<Genus species>`) for a live one, often an iNaturalist upload named `<Genus_species>_<number>.jpg`, and set `photo` by hand with the 500px thumb URL. Keep a mount only when Commons has nothing better, and say so.
