// Regenerate the INSERT block in migration 031 after editing the canonical vocabulary.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalTraitVocabulary, isFilteringDeductionTag } from '../src/lib/deductionTags';
import { parseEvidenceProfileDossier } from '../src/lib/evidenceSeedValidation';
import { CASE_TRAIT_CATEGORIES } from '../src/lib/caseTraits';

const tags = new Map(canonicalTraitVocabulary().map(row => [row.tag, row]));
const directory = path.join(process.cwd(), 'db/seeds/species');
for (const file of readdirSync(directory).filter(file => file.endsWith('.json')).sort()) {
  const dossier = parseEvidenceProfileDossier(JSON.parse(readFileSync(path.join(directory, file), 'utf8')), file);
  for (const category of CASE_TRAIT_CATEGORIES) for (const tag of dossier.profile[category]) {
    tags.set(tag, { tag, category, isFiltering: isFilteringDeductionTag(tag) });
  }
}
for (const code of ['EX', 'EW', 'CR', 'EN', 'VU', 'NT', 'LC', 'DD', 'NE']) {
  tags.set(`iucn:${code}`, { tag: `iucn:${code}`, category: 'conservation', isFiltering: true });
}
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
for (const row of [...tags.values()].sort((a, b) => a.tag.localeCompare(b.tag))) {
  console.log(`INSERT INTO trait_tags (tag, category, is_filtering) VALUES (${quote(row.tag)}, ${quote(row.category)}, ${row.isFiltering}) ON CONFLICT (tag) DO NOTHING;`);
}
