import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import {
  isCanonicalDeductionTag,
  isFilteringDeductionTag,
  countDeductionTagOverlaps,
  validateDeductionTagProfile,
  validateSeededSignatures,
  type DeductionTagProfile,
  type DeductionProfileCategory,
} from '../src/lib/deductionTags';

loadEnv({ path: '.env.local', quiet: true });

type DeductionCategory = DeductionProfileCategory;

type UnlockMode = 'fragment' | 'score';

type SpeciesJson = {
  conservation_text: string | null;
  habitat_description: string | null;
  habitat_tags: string[];
  geographic_description: string | null;
  marine: boolean;
  terrestrial: boolean;
  freshwater: boolean;
  colors: string[];
  pattern: string | null;
  shape_description: string | null;
  size_min_cm: number | null;
  size_max_cm: number | null;
  weight_kg: number | null;
  diet_type: string | null;
  diet_prey: string | null;
  diet_flora: string | null;
  behavior_1: string | null;
  behavior_2: string | null;
  life_description_1: string | null;
  life_description_2: string | null;
  key_fact_1: string | null;
  key_fact_2: string | null;
  key_fact_3: string | null;
  threats: string | null;
  taxonomic_comment: string | null;
  distribution_comment: string | null;
  lifespan: number | null;
  maturity: string | null;
  reproduction_type: string | null;
  clutch_size: string | null;
  sources: string[];
};

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
  species: SpeciesJson;
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

type ExistingProfileRow = {
  species_id: number;
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

function requireNullableString(value: unknown, context: string): string | null {
  assertSeed(value === null || typeof value === 'string', `${context} must be a string or null`);
  return value;
}

function requireNullableNumber(value: unknown, context: string): number | null {
  assertSeed(value === null || (typeof value === 'number' && Number.isFinite(value)), `${context} must be a finite number or null`);
  return value;
}

function parseSeed(raw: unknown, fileName: string): SeedJson {
  assertSeed(isPlainObject(raw), `${fileName}: seed must be an object`);
  assertSeed(typeof raw.iucn_id === 'number', `${fileName}: iucn_id must be a number`);
  assertSeed(typeof raw.scientific_name === 'string', `${fileName}: scientific_name must be a string`);
  assertSeed(typeof raw.common_name === 'string', `${fileName}: common_name must be a string`);
  assertSeed(isPlainObject(raw.species), `${fileName}: species must be an object`);
  assertSeed(isPlainObject(raw.profile), `${fileName}: profile must be an object`);
  assertSeed(Array.isArray(raw.clues), `${fileName}: clues must be an array`);

  const profile = raw.profile;
  const species = raw.species;
  const stringFields = [
    'conservation_text', 'habitat_description', 'geographic_description', 'pattern',
    'shape_description', 'diet_type', 'diet_prey', 'diet_flora', 'behavior_1', 'behavior_2',
    'life_description_1', 'life_description_2', 'key_fact_1', 'key_fact_2', 'key_fact_3',
    'threats', 'taxonomic_comment', 'distribution_comment', 'maturity', 'reproduction_type', 'clutch_size',
  ] as const;
  const numberFields = ['size_min_cm', 'size_max_cm', 'weight_kg', 'lifespan'] as const;
  for (const key of stringFields) requireNullableString(species[key], `${fileName}: species.${key}`);
  for (const key of numberFields) requireNullableNumber(species[key], `${fileName}: species.${key}`);
  for (const key of ['marine', 'terrestrial', 'freshwater'] as const) {
    assertSeed(typeof species[key] === 'boolean', `${fileName}: species.${key} must be boolean`);
  }
  const habitatTags = requireStringArray(species.habitat_tags, `${fileName}: species.habitat_tags`);
  const colors = requireStringArray(species.colors, `${fileName}: species.colors`);
  assertSeed(colors.length <= 2, `${fileName}: species.colors supports at most two values`);
  const sources = requireStringArray(species.sources, `${fileName}: species.sources`);
  assertSeed(sources.length > 0 && sources.every(source => /^https:\/\//u.test(source)), `${fileName}: species.sources must contain authoritative HTTPS URLs`);
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
    species: {
      conservation_text: requireNullableString(species.conservation_text, `${fileName}: species.conservation_text`),
      habitat_description: requireNullableString(species.habitat_description, `${fileName}: species.habitat_description`),
      habitat_tags: habitatTags,
      geographic_description: requireNullableString(species.geographic_description, `${fileName}: species.geographic_description`),
      marine: species.marine as boolean,
      terrestrial: species.terrestrial as boolean,
      freshwater: species.freshwater as boolean,
      colors,
      pattern: requireNullableString(species.pattern, `${fileName}: species.pattern`),
      shape_description: requireNullableString(species.shape_description, `${fileName}: species.shape_description`),
      size_min_cm: requireNullableNumber(species.size_min_cm, `${fileName}: species.size_min_cm`),
      size_max_cm: requireNullableNumber(species.size_max_cm, `${fileName}: species.size_max_cm`),
      weight_kg: requireNullableNumber(species.weight_kg, `${fileName}: species.weight_kg`),
      diet_type: requireNullableString(species.diet_type, `${fileName}: species.diet_type`),
      diet_prey: requireNullableString(species.diet_prey, `${fileName}: species.diet_prey`),
      diet_flora: requireNullableString(species.diet_flora, `${fileName}: species.diet_flora`),
      behavior_1: requireNullableString(species.behavior_1, `${fileName}: species.behavior_1`),
      behavior_2: requireNullableString(species.behavior_2, `${fileName}: species.behavior_2`),
      life_description_1: requireNullableString(species.life_description_1, `${fileName}: species.life_description_1`),
      life_description_2: requireNullableString(species.life_description_2, `${fileName}: species.life_description_2`),
      key_fact_1: requireNullableString(species.key_fact_1, `${fileName}: species.key_fact_1`),
      key_fact_2: requireNullableString(species.key_fact_2, `${fileName}: species.key_fact_2`),
      key_fact_3: requireNullableString(species.key_fact_3, `${fileName}: species.key_fact_3`),
      threats: requireNullableString(species.threats, `${fileName}: species.threats`),
      taxonomic_comment: requireNullableString(species.taxonomic_comment, `${fileName}: species.taxonomic_comment`),
      distribution_comment: requireNullableString(species.distribution_comment, `${fileName}: species.distribution_comment`),
      lifespan: requireNullableNumber(species.lifespan, `${fileName}: species.lifespan`),
      maturity: requireNullableString(species.maturity, `${fileName}: species.maturity`),
      reproduction_type: requireNullableString(species.reproduction_type, `${fileName}: species.reproduction_type`),
      clutch_size: requireNullableString(species.clutch_size, `${fileName}: species.clutch_size`),
      sources,
    },
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
    for (const term of normalizeTerms(species.scientific_name)) terms.add(term);
    for (const term of normalizeTerms(species.common_name)) terms.add(term);
    if (species.genus) terms.add(species.genus.toLowerCase());
  }

  const lowerLabel = ` ${label.toLowerCase()} `;
  return [...terms].filter(term => new RegExp(`\\b${escapeRegExp(term)}\\b`, 'u').test(lowerLabel));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateSeed(seed: SeedJson, fileName: string, pool: SpeciesRow[]): string[] {
  const errors: string[] = [];
  const profileErrors = validateDeductionTagProfile({
    habitat: seed.profile.habitat_tags,
    morphology: seed.profile.morphology_tags,
    diet: seed.profile.diet_tags,
    behavior: seed.profile.behavior_tags,
    reproduction: seed.profile.reproduction_tags,
    taxonomy: seed.profile.taxonomy_tags,
    geography: seed.profile.geography_tags,
    conservation: seed.profile.conservation_tags,
    key_fact: seed.profile.key_fact_tags,
    signatureTag: seed.profile.signature_tag,
  });
  errors.push(...profileErrors.map(error => `${fileName}: profile ${error}`));

  if (seed.clues.length > 0) {
    const expectedShape: Record<DeductionCategory, number[]> = {
      taxonomy: [1, 2], geography: [1, 2], morphology: [1, 2], behavior: [1, 2],
      diet: [1], reproduction: [1], conservation: [1, 2], key_fact: [1, 2, 3], habitat: [],
    };
    const keys = seed.clues.map(clue => `${clue.category}:${clue.reveal_order}`);
    if (new Set(keys).size !== keys.length) errors.push(`${fileName}: clue deck contains duplicate category/reveal_order rows`);
    const expectedKeys = Object.entries(expectedShape).flatMap(([category, orders]) => orders.map(order => `${category}:${order}`)).sort();
    if (keys.length !== 15 || keys.slice().sort().join('|') !== expectedKeys.join('|')) {
      errors.push(`${fileName}: nonempty clue deck must use the Plan 012 fifteen-row shape`);
    }
  }

  for (const clue of seed.clues) {
    const profileKey = PROFILE_KEYS_BY_CATEGORY[clue.category];
    const profileTags = new Set(seed.profile[profileKey]);

    for (const tag of clue.compare_tags) {
      if (!isCanonicalDeductionTag(tag, clue.category)) {
        errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} non-canonical or misplaced tag "${tag}"`);
      }
      if (!profileTags.has(tag)) {
        errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} tag "${tag}" missing from profile.${profileKey}`);
      }
    }

    if (clue.is_filtering && clue.compare_tags.length !== 1) {
      errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} filtering clue must have exactly one compare tag`);
    }
    if (clue.is_filtering && clue.compare_tags.some(tag => !isFilteringDeductionTag(tag))) {
      errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} genus/misc tags cannot filter`);
    }

    if (!clue.is_filtering && clue.compare_tags.length !== 0) {
      errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} non-filtering clue must have zero compare tags`);
    }

    const leaked = findLeakedTerms(clue.label, seed, pool);
    if (leaked.length > 0) {
      errors.push(`${fileName}: clue ${clue.category}/${clue.reveal_order} label leaks name terms: ${leaked.join(', ')}`);
    }
  }

  return errors;
}

function toTagProfile(profile: ProfileJson | ExistingProfileRow): DeductionTagProfile {
  return {
    habitat: profile.habitat_tags,
    morphology: profile.morphology_tags,
    diet: profile.diet_tags,
    behavior: profile.behavior_tags,
    reproduction: profile.reproduction_tags,
    taxonomy: profile.taxonomy_tags,
    geography: profile.geography_tags,
    conservation: profile.conservation_tags,
    key_fact: profile.key_fact_tags,
    signatureTag: profile.signature_tag,
  };
}

function printOverlapReport(seeds: SeedJson[]): void {
  console.log('\nLoaded profile overlaps (shared tags only)');
  const overlaps = countDeductionTagOverlaps(seeds.map(seed => toTagProfile(seed.profile)));
  for (const category of Object.keys(PROFILE_KEYS_BY_CATEGORY).sort() as DeductionCategory[]) {
    const values = overlaps[category];
    console.log(`- ${category}: ${values.length === 0 ? 'none' : values.map(({ tag, count }) => `${tag}=${count}`).join(', ')}`);
  }
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
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const unknownArgs = args.filter(arg => arg !== '--check');
  if (unknownArgs.length > 0) throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}`);

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

    const selected = seeds.map(({ seed }) => ({
      seed,
      species: speciesRows.find(row => row.iucn_id === seed.iucn_id || row.scientific_name === seed.scientific_name),
    }));

    const errors = seeds.flatMap(({ fileName, seed }) => validateSeed(seed, fileName, pool));
    for (const { seed, species } of selected) {
      if (!species) errors.push(`No species row found for ${seed.scientific_name} (${seed.iucn_id})`);
    }

    const existingProfiles = await sql<ExistingProfileRow[]>`
      SELECT species_id, habitat_tags, morphology_tags, diet_tags, behavior_tags,
        reproduction_tags, taxonomy_tags, geography_tags, conservation_tags,
        key_fact_tags, signature_tag
      FROM public.species_deduction_profiles
      ORDER BY species_id
    `;
    const corpus = new Map(existingProfiles.map(profile => [
      profile.species_id,
      { id: profile.species_id, ...toTagProfile(profile) },
    ]));
    const seededIds = new Set<number>();
    for (const { seed, species } of selected) {
      if (!species) continue;
      seededIds.add(species.id);
      corpus.set(species.id, { id: species.id, ...toTagProfile(seed.profile) });
    }
    errors.push(...validateSeededSignatures([...corpus.values()], seededIds));
    if (errors.length > 0) {
      console.error('Deduction seed validation failed:');
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }

    printOverlapReport(seeds.map(({ seed }) => seed));

    if (checkMode) {
      console.log(`Check complete. Validated ${seeds.length} species; no writes performed.`);
      return;
    }

    await sql.begin(async transaction => {
      const tx = transaction as unknown as typeof sql;
      for (const { seed } of seeds) {
        const species = selected.find(candidate => candidate.seed === seed)?.species;
        if (!species) throw new Error(`No species row found for ${seed.scientific_name} (${seed.iucn_id})`);

        await tx`
          UPDATE public.species SET
            common_name = ${seed.common_name},
            conservation_text = ${seed.species.conservation_text},
            habitat_description = ${seed.species.habitat_description},
            habitat_tags = ${tx.array(seed.species.habitat_tags)},
            geographic_description = ${seed.species.geographic_description},
            marine = ${seed.species.marine}, terrestrial = ${seed.species.terrestrial}, freshwater = ${seed.species.freshwater},
            color_primary = ${seed.species.colors[0] ?? null}, color_secondary = ${seed.species.colors[1] ?? null},
            pattern = ${seed.species.pattern}, shape_description = ${seed.species.shape_description},
            size_min_cm = ${seed.species.size_min_cm}, size_max_cm = ${seed.species.size_max_cm}, weight_kg = ${seed.species.weight_kg},
            diet_type = ${seed.species.diet_type}, diet_prey = ${seed.species.diet_prey}, diet_flora = ${seed.species.diet_flora},
            behavior_1 = ${seed.species.behavior_1}, behavior_2 = ${seed.species.behavior_2},
            life_description_1 = ${seed.species.life_description_1}, life_description_2 = ${seed.species.life_description_2},
            key_fact_1 = ${seed.species.key_fact_1}, key_fact_2 = ${seed.species.key_fact_2}, key_fact_3 = ${seed.species.key_fact_3},
            threats = ${seed.species.threats}, taxonomic_comment = ${seed.species.taxonomic_comment},
            distribution_comment = ${seed.species.distribution_comment}, lifespan = ${seed.species.lifespan}, maturity = ${seed.species.maturity},
            reproduction_type = ${seed.species.reproduction_type}, clutch_size = ${seed.species.clutch_size}, updated_at = NOW()
          WHERE id = ${species.id}
        `;

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

        await tx`
          DELETE FROM public.species_deduction_clues
          WHERE species_id = ${species.id}
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
