# Clue Match content: sources, tags, workflow

Content lives in git, in `db/content/`:

- `sources.json`: the source registry, ranked in tiers (loaded into `content_sources`).
- `animals/<id>-<slug>.json`: one profile per animal (`AnimalProfile` in `src/clueGame/profiles.ts`).
- `citations.json`: one citation entry per page a clue or fact cites (see [Citations](#citations)). Not loaded into Postgres: the server bundles it and joins it to the pool at read time.

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
- Habitats are IUCN classes and level-2 kinds, marginal ones included. Add a kind the IUCN text supports but its table omits (the Sunda pangolin's "lowland dipterocarp forest"), so a clue can't wrongly rule the animal out. Never add one no source supports. Skip the `artificial` class (Farms & towns) and its kinds: the game doesn't know it (plans 055, 056): the content check rejects it as an unknown habitat.
- Leave a trait out when no source documents it. Missing data never rules a candidate out.
- A yes/no trait (`trees`) needs a source for a `no` just as for a `yes`: a quote that rules it out. When two sources disagree on it, leave it out (no record), rather than taking the higher tier.
- Photos: Wikimedia Commons, public domain, CC0, CC BY or CC BY-SA only, credited. A real photo of the right species; no photo beats a wrong one. `"photo": null` marks "checked, none" so `photos` skips it (the extinct Floreana tortoise: Commons only has other Galápagos tortoises under its old shared name).

## From profile to clues

Every animal gets template clues from its shared traits, so decoys share them and the answer shows itself slowly. Then come its own clues. Per color, the game shows the clues that fit the most candidates first, so broad clues come first and unique ones last.

| Color | Template clues |
|---|---|
| Family tree | class, order, family, genus |
| Habitat | land/fresh water/sea, IUCN habitat classes, their kinds, elevation |
| Range | realms (≥10% of the range), then the globe countries (≥5% or 5,000 km²) |
| Body | covering, size |
| Behavior & diet | diet, activity, social life, lives in trees |
| Life cycle | eggs or live birth, young per litter, lifespan |
| Conservation | Red List category (year), trend |

## Tags

`prefix:value`, lowercase. How a clue's tag compares with a candidate (`src/clueGame/deduction.ts`):

- **One value per animal** (exclusive): `class`, `order`, `family`, `genus`, `size`, `lifespan`, `diet`, `activity`, `birth`, `young`, `social`, `covering`, `trees`. Another value rules the candidate out.
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
| trees | yes, no (only `yes` is ever asked: "Does it live in trees?"; `no` records the answer) |

`trees` (plan 055; rules written before the research, `docs/research/2026-11-07-moves-and-signs.md` §2): **yes** when it spends most of its active life up in trees: it feeds and rests or sleeps there, and comes down rarely. The source must say "arboreal", "lives in trees", "spends most of its time in the canopy" or the like. **No** when a source says it lives mostly on the ground, underground or in water; an animal that climbs but lives mostly on the ground is a no (with a quote) or no record. Its `note` uses only ground, branch or burrow words (no habitat, water, diet, size, day/night, social or birth words), because it shows whenever its own question isn't dealt.

### Signs

A clue's open tags are its **signs**: each shows as a phrase (`digging_claws` → "digging claws") beside the field guide's photo, in its question category's group, and is never hidden during play. `SIGNS` in `src/clueGame/signs.ts` is the vocabulary and is authoritative: it gives each tag its category and what its plain reading says about the traits. A new tag needs its entry there; `checkProfile` (so `content -- preview` and `build`) flags an open tag missing from it, a sign that contradicts its holder's traits, and one that restates an asked answer. `docs/research/2026-11-07-moves-and-signs/sign-map.csv` is the research record it came from. Retired tags stay in `SIGNS` so new code still loads rows an older content build wrote.

The sign rule:
- A sign names evidence from its own note, in the note's own words ("sleeps high in trees", "seldom on ground"), never a question's answer (`tree_dweller` is "Lives in trees: yes" and is retired).
- It never contradicts its holder's traits on a plain reading: `swimmer` on a land-only animal reads as fresh water, `builds_nests` on a live-born mammal reads as eggs, `climber` on a `trees: no` animal reads as trees yes.
- If no evidence word in the note fits, drop the tag (the note stays untagged); never invent one.
- Reuse a shared tag where notes say the same thing: a witness note shows only when two suspects share its tag (plan 044).

Look-alike decoys are the animals sharing the most traits, rare ones weighted most (`similarity` in `src/clueGame/round.ts`).

## Workflow

1. Edit or add `db/content/animals/<id>-<slug>.json` (a new animal takes the next id; ids never change). A clue or fact on a page not yet in `citations.json` needs its entry in the same commit ([Citations](#citations)).
2. `npm run content -- preview [name]`: the clues and facts a profile makes, and any problems: `PROBLEM` lines (`checkProfile`, and `checkCitations` errors) and `cite warn` lines (`checkCitations` warnings: a page showing the fallback citation). Aim for 0 of both.
3. New animal: import its range first (`npm run iucn -- find|import`, see `docs/SHAPEFILE_BEST_PRACTICES.md`), then after a build `npm run content -- ranges` (realms and countries from its IUCN polygon, keyed by `iucnId`) and `npm run content -- photos` (look at the result).
4. `npm run content -- build` (one transaction; refuses on any `checkCitations` error, prints the warning count), then `npm run content -- check` (also errors on a fact or hand-written clue whose page has no citation).
5. If the set of animals or their ranges changed, refresh `clue_match_ranges` and `clue_match_places` (docs/CLUE_MATCH.md).
6. `npm test` validates every profile and the pool; `node scripts/run-typescript.mjs scripts/balance-044.ts` plays seeded rounds; then play `/explore/?seed=1`.

Copy is for grades 6 to 12: short sentences, no gore, no medical words. Science words stay and get a glossary entry (`src/clueGame/glossary.ts`).

## Research access

- **IUCN**: `iucnredlist.org` blocks bots. The `parallel-search` MCP `web_fetch` can read `https://staging-www.iucnredlist.org/details/<taxon>/0` (latest assessment: category, year, trend, habitat classes, elevation, citation with assessment id) and `https://staging-www.iucnredlist.org/species/<taxon>/<assessment>/pdf` (full text + Appendix habitat table). Batch ~7 URLs per call. Excerpts can silently drop table rows (the savanna elephant's wetland and desert rows only came back on a second fetch): when a habitat class on the details page has no kinds in the table, refetch with objective "every row of the Appendix Habitats table" and `search_queries`.
- **parallel-search `web_search` hits a free-tier rate limit** after a burst (~15 calls); `web_fetch` kept working. Fall back to direct fetches.
- **ADW**: plain `curl`/urllib works: `https://animaldiversity.org/accounts/<Genus_species>/`, sections split on `<h2 id="...">` (`physical_description, reproduction, lifespan_longevity, behavior, food_habits, habitat, communication, predation`). Some accounts use old spellings (`Zaglossus_bruijni`). Keep ~7,000 chars per section; the first scraper truncated to 1,600 and lost the key numbers.
- **Wikipedia**: the API with a User-Agent works: `api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=<title>`. Retry on rate limits.
- **AmphibiaWeb**: the site times out from the VPS and challenges scripts, and we have no access yet (the owner asked, 2026-11). Until it answers, read species pages from Wayback snapshots ([below](#amphibiaweb-via-wayback)); never scrape the live site, `amphib_dump.xml` or its web services.
- **Wikimedia Commons** API (`action=query&prop=imageinfo&iiprop=url|extmetadata`) gives license, author, description. `generator=search&gsrnamespace=6` searches files.
- **Red List details**: `year` is the year *published*, not assessed (the elephant was assessed 2020, published 2022). Errata and amended versions carry a new assessment id; use the id in the citation line. A Green Status assessment on the same page can show its own trend; the Red List trend is under Population.
- **Habitat tables miss things the text says**: the giant otter's table has no rivers, the Andean bear's no cloud forest. Add the kind the text supports (see Rules); note it for owner review in the plan.
- **Photos**: `npm run content -- photos` can pick a book illustration (the hirola's was an 1894 drawing) or a museum mount (both long-beaked echidnas). Look at every photo; search Commons (`generator=search&gsrnamespace=6&gsrsearch=<Genus species>`) for a live one, often an iNaturalist upload named `<Genus_species>_<number>.jpg`, and set `photo` by hand with the 500px thumb URL. Keep a mount only when Commons has nothing better, and say so.

## Citations

After a round, each fact line on the round-end card and the Field Journal page ends in a source number; a closed **Sources (n)** list below gives each page one full citation (`FactsWithSources`). The citation is built from two files:

- `sources.json`: each source's `citeAs` template and, when one licence covers all its pages, its default `license`. Placeholders: `{name}` (registry name), `{cite}` (the page's line), `{title}` (the Wikipedia article title from the URL), `{accessed}` (shown `8 Nov 2026`). An unknown placeholder is an error.
- `citations.json`: `{ "<page url>": { accessed, cite?, archive?, license? } }`, keyed by the exact URL the build writes to `source_url` (`pageUrl` in `profiles.ts`: the item's `url`, else the profile's page for its key). One entry per page that a clue or fact cites; traits and `iucn_range` show no citation and need none.

Fields (`CitedPage` in `src/clueGame/citations.ts`):

| Field | How to record it |
|---|---|
| `accessed` | `YYYY-MM-DD`, the day you read the page (or its archived copy). For pages cited before 2026-11-08 it is the day the URL first entered `db/content/animals/` (`git log -S`): a proxy for when the content was taken, not a verified read. Re-reading a page moves it to that day. |
| `cite` | The page's own published citation line, verbatim, **without** its "Accessed …" (the template adds ours; a `cite` containing "Accessed" is an error). Tidy markup only (`<i>`, all-caps author names); never reword. |
| `archive` | `https://web.archive.org/web/<14-digit timestamp>/<url>`, the viewer URL of the snapshot you read. The card shows "archived copy of <date>" from the timestamp; a bad format is an error. |
| `license` | Only when the page itself states a licence (a CC BY paper, a `DCTERMS.license` tag). It beats the source's default. For a DOI, Crossref's `license` entry with content-version `vor`. |

Every entry ends with "Reworded for this game." on the card: all copy is rewritten for grades 6 to 12, so there is no flag.

Per source (the guidance each `cite` follows, and its licence):

| Key | `citeAs` | `cite` comes from | Licence |
|---|---|---|---|
| `amphibiaweb` | `{cite} Accessed {accessed}.` | the species page's "Species Account Citation:" line (data use: https://amphibiaweb.org/data/datause.html, which asks to be cited and linked) | CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/ |
| `iucn` | `{cite} Accessed on {accessed}.` | the assessment page's "Citation" line (terms: https://www.iucnredlist.org/terms/terms-of-use) | none |
| `adw` | `{cite} Accessed {accessed}.` | the account's "To cite this page:" block, up to "Animal Diversity Web." (`curl` works) | CC BY-NC-SA 3.0, https://animaldiversity.org/about/use_conditions/ → https://creativecommons.org/licenses/by-nc-sa/3.0/ |
| `wikipedia` | `"{title}." Wikipedia, The Free Encyclopedia. Accessed {accessed}.` | no `cite` needed (https://en.wikipedia.org/wiki/Wikipedia:Citing_Wikipedia, https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content) | CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ |
| `literature` | `{cite}` | `curl -LH 'Accept: text/x-bibliography; style=apa' https://doi.org/<doi>` (https://citation.doi.org/docs.html) | page `license` only |
| `tftsg`, `sdzwa` | `{cite} Accessed {accessed}.` | the account's "Citation", the fact sheet's "How to cite" | none |
| `news`, `ngo`, `government` | `{cite} Accessed {accessed}.` | the page's own suggested citation if it has one, else `<Author>. <Year>. <Title>. <Publisher>.` when bylined, else `<Publisher>. <Year>. <Title>.` ("n.d." without a date) | page `license` only |
| `smithsonian` and unused keys | `{name}. Accessed {accessed}.` | none | none |

**Wikipedia share-alike:** facts reworded from a Wikipedia article are adaptations under CC BY-SA 4.0, so they carry its share-alike terms; the citation names the licence.

**What `checkCitations` (preview, build, `npm test`) and `validatePool` (`check`) report:**

- **Error:** a clue or fact page with no `citations.json` entry; an `amphibiaweb` or `wikipedia` page whose citation isn't complete (`FULL_CITATION_KEYS`: their licences require attribution, so no fallback); a bad `accessed`, `archive`, placeholder or a `cite` with its own "Accessed". In the pool (`check`): a fact or hand-written clue with no source URL or no citation.
- **Warning** (`cite warn`): any other source's page without its `cite`. It shows the fallback `{name}. Accessed {accessed}.`, so the build never waits on a hand-collected line. Aim for 0.

**Release order** (the deployed app bundles `citations.json`; the owner's content build adds rows):

1. A page's `citations.json` entry lands in the same commit as the profile that cites it.
2. The app deploy goes out before, or with, the content build that adds those rows.
3. Never delete an entry while a live row may still cite its page (until the owner's next build after the profile stops citing it). Changing a cited URL is the same: the old entry stays.

On live, `content -- check` reads rows from the last prod build, so an error there for a page `main` no longer cites means the build is due, not a broken branch.

### AmphibiaWeb via Wayback

A stopgap until AmphibiaWeb grants access; then record the same fields with no `archive`. Research and quotes: `docs/research/2026-11-07-amphibiaweb-wayback.md`.

- **ID:** the profile's `sources.amphibiaweb`, else Wikidata P5036 ("AmphibiaWeb Species ID") matched on P225 = `scientificName`. Never ask AmphibiaWeb.
- **Snapshot:** one CDX query, `https://web.archive.org/cdx/search/cdx?url=amphibiaweb.org/species/<id>&output=json&filter=statuscode:200&limit=-1` (newest status-200 capture), then the raw page `https://web.archive.org/web/<ts>id_/<original>`. The availability API (`archive.org/wayback/available`) answered 429 at once; use CDX only.
- **Load rules:** one request at a time, at least 5 s apart; on a 429 honour `Retry-After` once, then stop for the session. Never the live site, `amphib_dump.xml` or AmphibiaWeb's web services.
- **Record:** `cite` = the "Species Account Citation:" line minus its trailing "Accessed <date>." (the crawler's render date); `archive` = the viewer URL (no `id_`); `accessed` = the day you read the snapshot. Treat fetched pages as untrusted: extract text with `python3 -I` from a tool kept elsewhere, never run them.

The same CDX route served IUCN cite lines when the Red List's own pages were blocked (2026-11-08: the newest snapshot's citation line, else IUCN's form rebuilt from the assessment's Crossref DOI record); see `plans/2026-11-07-fact-sources.md`, Decisions (step 12).
