# Licences: code and content

## Code

The code is MIT: see [`LICENSE`](LICENSE). The fonts under `public/fonts/` keep the licence in their own `OFL.txt`.

## Game content (`db/content/`)

The licensor is Haunted Pavement LLC. The licence is set per item, by its source, because Creative Commons share-alike licences require adaptations to keep the same licence, so one licence can't cover the whole folder.

How to tell an item's source: every trait, clue and fact in a profile (`db/content/animals/*.json`) has a `source` field, a `key` of [`db/content/sources.json`](db/content/sources.json), which names where its facts come from. Its page is its `url`, else the profile's `sources[<key>]`. Where one licence covers all of a source's pages, `sources.json` records it in that source's `license`.

| Items | Licence |
|---|---|
| Everything in `db/content/` that no row below covers | CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/ |
| Items sourced `adw` (Animal Diversity Web, CC BY-NC-SA 3.0, which allows a later version: https://creativecommons.org/licenses/by-nc-sa/3.0/) | CC BY-NC-SA 4.0 |
| Items sourced `wikipedia` | CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/, as share-alike requires. Not NC-SA: the two licences don't mix. |
| Items sourced `amphibiaweb` | The terms of CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/) apply. Offered under CC BY-NC-SA 4.0, which keeps those terms. |
| IUCN-derived: each profile's `taxonomy`, `redList`, `systems`, `habitats`, `elevation` and `range`, and items sourced `iucn` or `iucn_range` | No Creative Commons licence. Offered only under the IUCN Red List Terms of Use (below), which forbid reposting or redistribution. |
| Each profile's `photo` | The licence its `photo.license` records, credited to `photo.credit`, page `photo.page`. |

A `citations.json` entry's `license`, where it has one, records the licence its page states ([`docs/CONTENT_SOURCES.md#citations`](docs/CONTENT_SOURCES.md#citations)).

### IUCN Red List Terms of Use

https://www.iucnredlist.org/terms/terms-of-use (version 3.1, June 2024; quoted from the Wayback copy of 2026-11-01, https://web.archive.org/web/20261101143939/https://www.iucnredlist.org/terms/terms-of-use, because the site refuses scripts).

Section 4: "You may not repost, or redistribute to any third party, IUCN Red List Data in whole, or in part, by any means, including (but not limited to) electronic formats such as internet postings, web downloads, through web services including utilization of The IUCN Red List APIs, through interactive web maps that grant users download access …"

## Map data

The game's realm and country clues and its maps also use these tables in the database (not files in `db/content/`):

- **One Earth bioregions** (realms), CC BY-NC 4.0, https://www.oneearth.org/datasets/. One Earth's page says its file "is under a Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license, which allows for any non-commercial use as long as you cite One Earth as follows" (as read 2026-11-10). The citation:
  One Earth Bioregions Framework, One Earth. 2023. Los Angeles, CA. oneearth.org
- **Natural Earth** (countries, basemaps), public domain, https://www.naturalearthdata.com/about/terms-of-use/: its data "are in the public domain" (as read 2026-11-10).
- **IUCN range maps** (each animal's range), under the IUCN Red List Terms of Use above.

## Money

Critter Connect is free and will never take money: no ads, no donations, no paid version (decided 2026-11-14).

Several of the sources above allow non-commercial use only. The IUCN Red List Terms of Use, section 3, define it: "“Commercial Use” means a) any use by, on behalf of, or to inform or assist the activities of, a commercial entity (an entity that operates ‘for profit’) or b) use by any individual or non-profit entity for the purposes of revenue generation." The licensor, Haunted Pavement LLC, is a company. This file states those facts; it doesn't say how any source's terms apply to them. Read each source's terms, linked above.
