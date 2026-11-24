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
- Countries are the confirmed extant range: `range.countries` (the range maps' output, never hand-edited) minus `redList.notPresent`, a list of `{ code, status }` where `status` is `uncertain`, `possibly-extinct` or `extinct`, cited by `redList.url` (the same assessment's Country Occurrence list). Codes are Natural Earth 3-letter codes, as in `range.countries`: `checkProfile` rejects an ISO alias (`SSD`, `ESH`) and names the code to use (`SDS`, `SAH`). List every country in `range.countries`, or overlapping the animal's range polygons, that the assessment marks extinct, possibly extinct or presence uncertain; `presentCountries` drops them from the country clue and the regions. A code may be missing from `range.countries` (a country stays only while 2+ animals share it, `HAVING count(*) >= 2`), so adding or removing another animal never breaks the entry. `checkProfile` fails on an ISO alias, a code that isn't a known 3-letter uppercase country code, a bad status, a code listed twice, or a list that removes every country.
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
| size | tiny < 100 g, small 100 g to 2 kg, medium over 2 up to 30 kg, large over 30 up to 300 kg, huge over 300 kg (an animal's typical adult weight decides) |
| lifespan | short < 5 years, medium 5 to 20, long > 20 (longest known, zoo records included) |
| young | one (1 or 2 per litter or clutch), few (3 to 10), many (> 10) |
| diet | plants, meat, insects (mostly insects and other small invertebrates), mixed (first match in the order below) |
| activity | day, night, twilight, any |
| social | alone, pairs, groups |
| covering | fur, spines, scales, armor, shell, skin (mostly bare) |
| trees | yes, no (only `yes` is ever asked: "Does it live in trees?"; `no` records the answer) |

`diet` is the first of these that fits: 1. **plants** when sources name no animal food (for a plant-eater, any animal food a source names counts); 2. **insects** when sources say it eats mostly small animals without backbones (insects, worms, snails, crayfish and other invertebrates); 3. **meat** when sources name no plant food (grass or other plant bits a meat-eater swallows in small amounts don't count; plant food it seeks out, like fruit or nectar, does); 4. otherwise **mixed**. Leave `diet` unrecorded when sources list both invertebrates and vertebrates without proportions, so `insects` vs `meat` can't be settled.

`trees` (plan 055; rules written before the research, `docs/research/2026-11-07-moves-and-signs.md` §2): **yes** when it spends most of its active life up in trees: it feeds and rests or sleeps there, and comes down rarely. The source must say "arboreal", "lives in trees", "spends most of its time in the canopy" or the like. **No** when a source says it lives mostly on the ground, underground or in water; an animal that climbs but lives mostly on the ground is a no (with a quote) or no record. Its `note` uses only ground, branch or burrow words (no habitat, water, diet, size, day/night, social or birth words), because it shows whenever its own question isn't dealt.

### Signs

A clue's open tags are its **signs**: each shows as a phrase (`digging_claws` → "digging claws") beside the field guide's photo, in its question category's group, and is never hidden during play. `SIGNS` in `src/clueGame/signs.ts` is the vocabulary and is authoritative: each active entry gives its category, its `meaning` (the one-line definition: what counts and what doesn't), its `witness` (`string | null`, the standard witness sentence) and its rules, `implies` and `denies`. Tag a note only with signs whose `meaning` its words state. A new tag needs its entry there; `checkProfile` (so `content -- preview` and `build`) runs `signProblems`, which flags an open tag missing from `SIGNS`, a retired tag, a sign whose rules (or those of a broader sign it implies) contradict its holder's traits or other signs, and a narrower and broader sign on the same note. `docs/research/2026-11-07-moves-and-signs/sign-map.csv` is the research record it came from; the definitions' sign-off is plan `plans/2026-11-23-sign-audit.md`.

Witness sentences (rules 055-2, `plans/2026-11-24-witness-signs.md`):
- Every active entry has `witness: string | null`; a retired entry has none. A sentence is one short present-tense line for grades 6–12, true of every holder under the `meaning`, naming no animal, group or place, and saying the sign in other words than its label. `null`, with a comment saying why, keeps the sign out of witness notes (today `floreana_island`, `pinta_island`, `prairie_dog_towns`).
- `signTableProblems` (at load and in `npm test`) flags an empty or untrimmed sentence, a `_` blank, or the sign's label (`signPhrase`) as a whole phrase, any case.
- `witnessNameProblems` (`npm run content -- preview` and `tests/clueGame/content.test.ts`) flags a sentence that names a holder (common name, group noun, genus or species, country or region), including holders by implication.
- The live pool door (`animalsFromPool`) skips an unknown open tag with a warning, and `witnessSentence` returns `null` for a retired, unknown or `null` sign, so rows an older content build wrote still load; the authoring checks (`animalsFromProfiles`, `checkProfile`) stay strict.

Rules, from `SIGNS`:
- Trait `implies`: the holder's record must not rule it out (`algae_fur` implies `covering:fur`; `never_climbs` implies `trees:no`). Trait `denies`: the holder must not hold it (`leaf_eater` denies `diet:meat` and `diet:insects`).
- Open `denies`: the holder must not hold that sign or one implying it (`forest_floor` denies `often_in_trees`).
- `climber` and `swimmer` carry no trait `implies`: climbing rocks isn't living in trees, and swimming isn't fresh water.

Narrower and broader signs (Goal 2 of the sign audit):
- A narrower sign lists its strictly broader sign in `implies` (`climbs_boulders` → `climber`, `dung_piles` → `scent_marks`) once the edge passes entailment under the approved `meaning`s. The sign audit's second gate, wording (zero false fits on notes tagged with the broader sign), now holds by construction: since rules 055-2 a witness note is the broader sign's standard sentence, true of every holder.
- Fits are counted per sign, and `animalFitsNote` closes over wired `implies` edges: a holder of the narrower sign fits a witness note for the broader one, for witness fits and deduction (`witnessNotes`, `stillPossible`).
- One sign per fact **per note**: never tag one note with a narrower sign and a broader sign it implies (`signProblems` flags it); keep the narrower one its words state. A broad tag on a **different** note stays, so that note can still be dealt. `signsOf` drops implied broader signs, so the field guide shows one badge per fact.

Ten edges the sign audit deferred are **wired in rules 055-2** (`plans/2026-11-24-witness-signs.md`), once per-sign standard sentences replaced hand-written witness text. Historical blocking notes from `sign-audit` (`speciesId:clue`, from the audit's `definitions.csv`): live notes tagged with the broader sign used narrower wording that the narrower sign's holders didn't match.

| Edge | Blocking notes |
|---|---|
| `backward_pouch` → `pouch` | 43:4 "Its pouch opens forward, like other kangaroos'." |
| `carries_young_on_back` → `mother_carries_young` | 10:7 "Its eggs sink into pockets in the mother's back and hatch there as tiny toads, with no tadpole stage."; 54:6 "A mother carries her baby clinging to her belly." |
| `face_mask` → `face_markings` | 42:0 "It has white patches on its nose, chin, forehead and chest." |
| `feathery_gills` → `underwater_breathing` | 2:3 "It can take in oxygen underwater through its skin and throat."; 62:2 "Folds of skin along its sides help it take in oxygen from the water through its skin."; 75:1 "Loose, wrinkly folds of skin along its sides help it breathe through its skin." |
| `s_shaped_horns` → `horns` | 29:3 "Males have two short horns covered in skin."; 38:0 "Both males and females have long, straight, nearly parallel horns."; 68:0 "Both males and females have sharp, ringed horns that curve up like a lyre." |
| `shoulder_stripe` → `stripes` | 29:1 "Its legs have white and brown stripes, like a zebra's."; 43:1 "It has two golden stripes down its back." |
| `spectacles` → `face_markings` | 38:2 "It has white patches on its face, hiding what may be the biggest face scent glands of any mammal."; 50:2 "It has a dark tuft of hair on its forehead and white markings on its face." |
| `spiral_horns` → `horns` | 29:3, 38:0, 68:0 (above); 66:0 "It has two horns, one behind the other; the front one can be more than a metre long." |
| `tear_lines` → `face_markings` | 50:2 (above) |
| `walks_upright` → `stands_on_hind_legs` | 36:2 "It can stand up on its back legs and tail to reach into termite mounds."; 57:7 "If it can't dig away from danger, it stands up on its back legs and tail and defends itself with its claws."; 61:3 "On the ground it hops upright on its back legs, holding its arms above its head." |

The sign rule:
- A sign names evidence from its own note, in the note's own words ("sleeps high in trees", "seldom on ground"), never a question's answer (`tree_dweller` is "Lives in trees: yes" and is retired).
- If no active sign's `meaning` fits the note's evidence, leave the note untagged; never invent one.
- Reuse a shared tag where notes say the same thing: a witness note shows when 2 to 4 suspects hold its sign (and no narrower dealt sign already implies it; rules 055-2).
- Retired tags (`retired: true`, no rules and no `meaning`) stay in `SIGNS` only so new code still loads rows an older content build wrote; `signProblems` rejects one on any profile.

Look-alike suspects come from `pickSuspectSet` in `src/clueGame/animalBoard.ts`: relatives first (the most shared family-tree ranks), then `likeness` in `src/clueGame/questionMatch.ts` (+1 for each trait category two animals share, -1 for each they differ on; no weight for rare traits).

## Workflow

Adding or changing an animal, step by step and who runs each: [`docs/SHAPEFILE_BEST_PRACTICES.md#adding-or-changing-an-animal`](SHAPEFILE_BEST_PRACTICES.md#adding-or-changing-an-animal).

Copy is for grades 6 to 12: short sentences, no gore, no medical words. Science words stay and get a glossary entry (`src/clueGame/glossary.ts`).

## Research access

- **IUCN**: `iucnredlist.org` blocks bots. The `parallel-search` MCP (a tool the owner has used in his own sessions; the repo's `.mcp.json` doesn't set it up) `web_fetch` can read `https://staging-www.iucnredlist.org/details/<taxon>/0` (latest assessment: category, year, trend, habitat classes, elevation, citation with assessment id) and `https://staging-www.iucnredlist.org/species/<taxon>/<assessment>/pdf` (full text + Appendix habitat table). Batch ~7 URLs per call. Excerpts can silently drop table rows (the savanna elephant's wetland and desert rows only came back on a second fetch): when a habitat class on the details page has no kinds in the table, refetch with objective "every row of the Appendix Habitats table" and `search_queries`.
- **parallel-search `web_search`** (same tool, owner's sessions only, not in `.mcp.json`) **hits a free-tier rate limit** after a burst (~15 calls); `web_fetch` kept working. Fall back to direct fetches.
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

**Map data** (database tables the realms, countries and maps come from, not `db/content/`):

- One Earth bioregions (realms): CC BY-NC 4.0 (https://www.oneearth.org/datasets/), cited as One Earth asks: One Earth Bioregions Framework, One Earth. 2023. Los Angeles, CA. oneearth.org
- Natural Earth (countries, basemaps): public domain (https://www.naturalearthdata.com/about/terms-of-use/).
- IUCN range maps: under the IUCN Red List Terms of Use (https://www.iucnredlist.org/terms/terms-of-use).

Which licence covers which item of `db/content/`, and the no-money condition: [`CONTENT_LICENSE.md`](../CONTENT_LICENSE.md).

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
