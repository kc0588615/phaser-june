import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { TAG_VOCAB, WHITELISTED_TAG_PREFIXES, isKnownTag, type TagCategory } from '../src/lib/deductionTags';

loadEnv({ path: '.env.local', quiet: true });

type DeductionCategory =
  | 'habitat'
  | 'morphology'
  | 'diet'
  | 'behavior'
  | 'reproduction'
  | 'taxonomy'
  | 'key_fact'
  | 'geography'
  | 'conservation';

type UnlockMode = 'fragment' | 'score';

type ProfileJson = {
  habitat_tags: string[];
  morphology_tags: string[];
  diet_tags: string[];
  behavior_tags: string[];
  reproduction_tags: string[];
  taxonomy_tags: string[];
  geography_tags: string[];
  conservation_tags: string[];
  key_fact_tags: string[];
  signature_tag: string | null;
  habitat_note: string | null;
  morphology_note: string | null;
  diet_note: string | null;
  behavior_note: string | null;
  reproduction_note: string | null;
  reference_summary: string | null;
};

type ClueJson = {
  category: DeductionCategory;
  reveal_order: number;
  label: string;
  compare_tags: string[];
  unlock_mode: UnlockMode;
  base_cost: number;
  is_filtering: boolean;
};

type SeedJson = {
  iucn_id: number;
  scientific_name: string;
  common_name: string;
  profile: ProfileJson;
  clues: ClueJson[];
};

type ProfileTagKey =
  | 'habitat_tags'
  | 'morphology_tags'
  | 'diet_tags'
  | 'behavior_tags'
  | 'reproduction_tags'
  | 'taxonomy_tags'
  | 'geography_tags'
  | 'conservation_tags'
  | 'key_fact_tags';

type SpeciesRow = {
  id: number;
  iucn_id: number;
  scientific_name: string;
  common_name: string;
  genus: string | null;
  class: string | null;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const seedDir = path.join(repoRoot, 'db/seeds/deduction');

const PROFILE_KEYS_BY_CATEGORY: Record<DeductionCategory, ProfileTagKey> = {
  habitat: 'habitat_tags',
  morphology: 'morphology_tags',
  diet: 'diet_tags',
  behavior: 'behavior_tags',
  reproduction: 'reproduction_tags',
  taxonomy: 'taxonomy_tags',
  geography: 'geography_tags',
  conservation: 'conservation_tags',
  key_fact: 'key_fact_tags',
};

const ARRAY_PROFILE_KEYS: ProfileTagKey[] = Object.values(PROFILE_KEYS_BY_CATEGORY);
const TAG_VOCAB_KEYS = new Set<string>(Object.keys(TAG_VOCAB));
const TAG_VOCAB_BY_KEY = TAG_VOCAB as Record<TagCategory, readonly string[]>;

function stripPgBouncer(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('pgbouncer');
  return parsed.toString();
}

function assertSeed(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireStringArray(value: unknown, context: string): string[] {
  assertSeed(Array.isArray(value), `${context} must be an array`);
  for (const item of value) {
    assertSeed(typeof item === 'string', `${context} must contain only strings`);
  }
  return value;
}

function parseSeed(raw: unknown, fileName: string): SeedJson {
  assertSeed(isPlainObject(raw), `${fileName}: seed must be an object`);
  assertSeed(typeof raw.iucn_id === 'number', `${fileName}: iucn_id must be a number`);
  assertSeed(typeof raw.scientific_name === 'string', `${fileName}: scientific_name must be a string`);
  assertSeed(typeof raw.common_name === 'string', `${fileName}: common_name must be a string`);
  assertSeed(isPlainObject(raw.profile), `${fileName}: profile must be an object`);
  assertSeed(Array.isArray(raw.clues), `${fileName}: clues must be an array`);

  const profile = raw.profile;
  for (const key of ARRAY_PROFILE_KEYS) {
    requireStringArray(profile[key], `${fileName}: profile.${key}`);
  }
  assertSeed(
    profile.signature_tag === null || profile.signature_tag === undefined || typeof profile.signature_tag === 'string',
    `${fileName}: profile.signature_tag must be string or null`,
  );

  const clues = raw.clues.map((item, index): ClueJson => {
    assertSeed(isPlainObject(item), `${fileName}: clues[${index}] must be an object`);
    assertSeed(typeof item.category === 'string' && item.category in PROFILE_KEYS_BY_CATEGORY, `${fileName}: clues[${index}].category invalid`);
    assertSeed(typeof item.reveal_order === 'number' && Number.isInteger(item.reveal_order), `${fileName}: clues[${index}].reveal_order must be an integer`);
    assertSeed(typeof item.label === 'string' && item.label.trim().length > 0, `${fileName}: clues[${index}].label required`);
    assertSeed(item.unlock_mode === 'fragment' || item.unlock_mode === 'score', `${fileName}: clues[${index}].unlock_mode invalid`);
    assertSeed(typeof item.base_cost === 'number' && Number.isInteger(item.base_cost), `${fileName}: clues[${index}].base_cost must be an integer`);
    assertSeed(typeof item.is_filtering === 'boolean', `${fileName}: clues[${index}].is_filtering must be boolean`);
    return {
      category: item.category as DeductionCategory,
      reveal_order: item.reveal_order,
      label: item.label,
      compare_tags: requireStringArray(item.compare_tags, `${fileName}: clues[${index}].compare_tags`),
      unlock_mode: item.unlock_mode,
      base_cost: item.base_cost,
      is_filtering: item.is_filtering,
    };
  });

  return {
    iucn_id: raw.iucn_id,
    scientific_name: raw.scientific_name,
    common_name: raw.common_name,
    profile: {
      habitat_tags: requireStringArray(profile.habitat_tags, `${fileName}: profile.habitat_tags`),
      morphology_tags: requireStringArray(profile.morphology_tags, `${fileName}: profile.morphology_tags`),
      diet_tags: requireStringArray(profile.diet_tags, `${fileName}: profile.diet_tags`),
      behavior_tags: requireStringArray(profile.behavior_tags, `${fileName}: profile.behavior_tags`),
      reproduction_tags: requireStringArray(profile.reproduction_tags, `${fileName}: profile.reproduction_tags`),
      taxonomy_tags: requireStringArray(profile.taxonomy_tags, `${fileName}: profile.taxonomy_tags`),
      geography_tags: requireStringArray(profile.geography_tags, `${fileName}: profile.geography_tags`),
      conservation_tags: requireStringArray(profile.conservation_tags, `${fileName}: profile.conservation_tags`),
      key_fact_tags: requireStringArray(profile.key_fact_tags, `${fileName}: profile.key_fact_tags`),
      signature_tag: typeof profile.signature_tag === 'string' ? profile.signature_tag : null,
      habitat_note: nullableString(profile.habitat_note),
      morphology_note: nullableString(profile.morphology_note),
      diet_note: nullableString(profile.diet_note),
      behavior_note: nullableString(profile.behavior_note),
      reproduction_note: nullableString(profile.reproduction_note),
      reference_summary: nullableString(profile.reference_summary),
    },
    clues,
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isVocabKeyQualifiedTag(tag: string): boolean {
  const [key, value] = tag.split(':', 2);
  if (!key || !value || !TAG_VOCAB_KEYS.has(key)) return false;
  return TAG_VOCAB_BY_KEY[key as TagCategory].includes(value);
}

function isAllowedTag(tag: string): boolean {
  return isKnownTag(tag) || isVocabKeyQualifiedTag(tag);
}

function normalizeTerms(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map(term => term.trim())
    .filter(term => term.length >= 4);
}

function findLeakedTerms(label: string, seed: SeedJson, pool: SpeciesRow[]): string[] {
  const terms = new Set<string>();
  for (const term of normalizeTerms(seed.scientific_name)) terms.add(term);
  for (const term of normalizeTerms(seed.common_name)) terms.add(term);
  const genus = seed.scientific_name.split(/\s+/u)[0];
  if (genus) terms.add(genus.toLowerCase());

  for (const species of pool) {
    for (const term of normalizeTerms(species.common_name)) terms.add(term);
  }

  const lowerLabel = ` ${label.toLowerCase()} `;
  return [...terms].filter(term => new RegExp(`\\b${escapeRegExp(term)}\\b`, 'u').test(lowerLabel));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateSeed(seed: SeedJson, fileName: string, pool: SpeciesRow[]): string[] {
  const errors: string[] = [];

  for (const key of ARRAY_PROFILE_KEYS) {
    for (const tag of seed.profile[key]) {
      if (!isAllowedTag(tag)) errors.push(`${fileName}: profile.${key} unknown tag "${tag}"`);
    }
  }
  if (seed.profile.signature_tag && !isAllowedTag(seed.profile.signature_tag)) {
    errors.push(`${fileName}: profile.signature_tag unknown tag "${seed.profile.signature_tag}"`);
  }

  for (const clue of seed.clues) {
    const profileKey = PROFILE_KEYS_BY_CATEGORY[clue.category];
    const profileTags = new Set(seed.profile[profileKey]);

    for (const tag of clue.compare_tags) {
      if (!isAllowedTag(tag)) {
        errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} unknown tag "${tag}"`);
      }
      if (!profileTags.has(tag)) {
        errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} tag "${tag}" missing from profile.${profileKey}`);
      }
    }

    if (!clue.is_filtering && clue.compare_tags.length > 0) {
      errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} has compare_tags but is_filtering=false`);
    }

    const leaked = findLeakedTerms(clue.label, seed, pool);
    if (leaked.length > 0) {
      errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} label leaks name terms: ${leaked.join(', ')}`);
    }
  }

  return errors;
}

function printCoverageReport(seeds: SeedJson[]): void {
  console.log('\nCoverage report (warnings only)');
  if (seeds.length < 10) {
    console.log(`- only ${seeds.length} seed file(s) loaded; coverage will be below final 28-species targets`);
  }

  for (const seed of seeds) {
    for (const clue of seed.clues.filter(clue => clue.is_filtering && clue.compare_tags.length > 0)) {
      const profileKey = PROFILE_KEYS_BY_CATEGORY[clue.category];
      const count = seeds.filter(candidate => (
        clue.compare_tags.some(tag => candidate.profile[profileKey].includes(tag))
      )).length;
      const target = coverageTarget(clue);
      const inBand = count >= target.min && count <= target.max;
      const marker = inBand ? 'ok' : 'warn';
      console.log(`- ${marker}: ${seed.scientific_name} ${clue.category}/${clue.reveal_order} matches ${count} loaded species; target ${target.min}-${target.max}`);
    }
  }
}

function coverageTarget(clue: ClueJson): { min: number; max: number } {
  if (clue.category === 'key_fact' && clue.reveal_order === 3) return { min: 1, max: 2 };
  if (clue.reveal_order === 1) return { min: 12, max: 17 };
  if (clue.reveal_order === 2) return { min: 2, max: 5 };
  return { min: 1, max: 2 };
}

async function loadSeeds(): Promise<Array<{ fileName: string; seed: SeedJson }>> {
  const entries = await readdir(seedDir, { withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort();

  const seeds = [];
  for (const fileName of files) {
    const filePath = path.join(seedDir, fileName);
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
    seeds.push({ fileName, seed: parseSeed(raw, fileName) });
  }
  return seeds;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DEDUCTION_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Set DEDUCTION_DATABASE_URL or DATABASE_URL before running this script.');
    process.exit(1);
  }

  const sql = postgres(stripPgBouncer(databaseUrl), {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    const seeds = await loadSeeds();
    if (seeds.length === 0) {
      console.log('No deduction seed files found.');
      return;
    }

    const speciesRows = await sql<SpeciesRow[]>`
      SELECT id, iucn_id, scientific_name, common_name, genus, class
      FROM public.species
      ORDER BY scientific_name
    `;
    const mammalPool = speciesRows.filter(row => row.class === 'MAMMALIA');
    const pool = mammalPool.length > 0 ? mammalPool : speciesRows;

    const errors = seeds.flatMap(({ fileName, seed }) => validateSeed(seed, fileName, pool));
    if (errors.length > 0) {
      console.error('Deduction seed validation failed:');
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }

    printCoverageReport(seeds.map(({ seed }) => seed));

    await sql.begin(async transaction => {
      const tx = transaction as unknown as typeof sql;
      for (const { seed } of seeds) {
        const species = speciesRows.find(row => (
          row.iucn_id === seed.iucn_id || row.scientific_name === seed.scientific_name
        ));
        if (!species) throw new Error(`No species row found for ${seed.scientific_name} (${seed.iucn_id})`);

        await tx`
          INSERT INTO public.species_deduction_profiles (
            species_id,
            habitat_tags,
            morphology_tags,
            diet_tags,
            behavior_tags,
            reproduction_tags,
            taxonomy_tags,
            geography_tags,
            conservation_tags,
            key_fact_tags,
            signature_tag,
            habitat_note,
            morphology_note,
            diet_note,
            behavior_note,
            reproduction_note,
            reference_summary,
            updated_at
          )
          VALUES (
            ${species.id},
            ${tx.array(seed.profile.habitat_tags)},
            ${tx.array(seed.profile.morphology_tags)},
            ${tx.array(seed.profile.diet_tags)},
            ${tx.array(seed.profile.behavior_tags)},
            ${tx.array(seed.profile.reproduction_tags)},
            ${tx.array(seed.profile.taxonomy_tags)},
            ${tx.array(seed.profile.geography_tags)},
            ${tx.array(seed.profile.conservation_tags)},
            ${tx.array(seed.profile.key_fact_tags)},
            ${seed.profile.signature_tag},
            ${seed.profile.habitat_note},
            ${seed.profile.morphology_note},
            ${seed.profile.diet_note},
            ${seed.profile.behavior_note},
            ${seed.profile.reproduction_note},
            ${seed.profile.reference_summary},
            NOW()
          )
          ON CONFLICT (species_id) DO UPDATE SET
            habitat_tags = EXCLUDED.habitat_tags,
            morphology_tags = EXCLUDED.morphology_tags,
            diet_tags = EXCLUDED.diet_tags,
            behavior_tags = EXCLUDED.behavior_tags,
            reproduction_tags = EXCLUDED.reproduction_tags,
            taxonomy_tags = EXCLUDED.taxonomy_tags,
            geography_tags = EXCLUDED.geography_tags,
            conservation_tags = EXCLUDED.conservation_tags,
            key_fact_tags = EXCLUDED.key_fact_tags,
            signature_tag = EXCLUDED.signature_tag,
            habitat_note = EXCLUDED.habitat_note,
            morphology_note = EXCLUDED.morphology_note,
            diet_note = EXCLUDED.diet_note,
            behavior_note = EXCLUDED.behavior_note,
            reproduction_note = EXCLUDED.reproduction_note,
            reference_summary = EXCLUDED.reference_summary,
            updated_at = NOW()
        `;

        for (const clue of seed.clues) {
          await tx`
            INSERT INTO public.species_deduction_clues (
              species_id,
              category,
              label,
              compare_tags,
              reveal_order,
              unlock_mode,
              base_cost,
              is_filtering
            )
            VALUES (
              ${species.id},
              ${clue.category},
              ${clue.label},
              ${tx.array(clue.compare_tags)},
              ${clue.reveal_order},
              ${clue.unlock_mode},
              ${clue.base_cost},
              ${clue.is_filtering}
            )
            ON CONFLICT (species_id, category, reveal_order) DO UPDATE SET
              label = EXCLUDED.label,
              compare_tags = EXCLUDED.compare_tags,
              unlock_mode = EXCLUDED.unlock_mode,
              base_cost = EXCLUDED.base_cost,
              is_filtering = EXCLUDED.is_filtering
          `;
        }

        console.log(`Upserted ${seed.scientific_name}: 1 profile, ${seed.clues.length} clues`);
      }
    });

    console.log(`Done. Seeded ${seeds.length} species.`);
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error('Deduction seed failed:', err);
  process.exit(1);
});
