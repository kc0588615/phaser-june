import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { CompilerCard, CompilerSpeciesProfile } from '../src/lib/caseCompiler';
import type { CompilerEvidenceFamilyCard, CompilerEvidenceFamilyHint } from '../src/lib/caseCompilerV3';
import { compileCaseV3, verifyCaseCorpusV3 } from '../src/lib/caseCompilerV3';
import { CASE_COMPILER_SHAPE_COUNT, verifyTieredCaseCorpus } from '../src/lib/caseCorpusVerifier';
import {
  EVIDENCE_PROTOTYPE_IUCN_IDS,
  parseEvidenceProfileDossier,
  parseEvidenceSeed,
  type EvidenceProfileDossier,
} from '../src/lib/evidenceSeedValidation';
import { parseEvidenceFamilySeed, validateEvidenceFamilyCorpus } from '../src/lib/evidenceFamilySeedValidation';

const root = process.cwd();

function loadJson(directory: string, fileName: string): unknown {
  return JSON.parse(readFileSync(path.join(directory, fileName), 'utf8')) as unknown;
}

function toProfile(dossier: EvidenceProfileDossier): CompilerSpeciesProfile {
  return {
    speciesId: dossier.iucnId,
    habitatTags: dossier.profile.habitat,
    morphologyTags: dossier.profile.morphology,
    dietTags: dossier.profile.diet,
    behaviorTags: dossier.profile.behavior,
    reproductionTags: dossier.profile.reproduction,
    taxonomyTags: dossier.profile.taxonomy,
    geographyTags: dossier.profile.geography,
    conservationTags: dossier.profile.conservation,
    keyFactTags: dossier.profile.key_fact,
    signatureTag: dossier.profile.signatureTag,
  };
}

function loadCorpus() {
  const selected = new Set<number>(EVIDENCE_PROTOTYPE_IUCN_IDS);
  const profiles = readdirSync(path.join(root, 'db/seeds/deduction'))
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => parseEvidenceProfileDossier(loadJson(path.join(root, 'db/seeds/deduction'), file), file))
    .filter(dossier => selected.has(dossier.iucnId))
    .map(toProfile);
  const seeds = readdirSync(path.join(root, 'db/seeds/evidence'))
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => parseEvidenceSeed(loadJson(path.join(root, 'db/seeds/evidence'), file), file));

  let cardId = 1;
  const cardsBySpecies = new Map<number, CompilerCard[]>();
  for (const seed of seeds.sort((a, b) => a.iucn_id - b.iucn_id)) {
    cardsBySpecies.set(seed.iucn_id, seed.cards.map((card): CompilerCard => ({
      id: cardId++,
      speciesId: seed.iucn_id,
      method: card.method,
      traitCategory: card.trait_category,
      primaryPredicate: card.primary_predicate,
      compareTag: card.compare_tags[0],
      isSignature: card.is_signature,
      specificity: card.specificity,
    })));
  }
  return { profiles, cardsBySpecies };
}

const reportOnly = process.argv.slice(2).includes('--report');
const { profiles, cardsBySpecies } = loadCorpus();
const result = verifyTieredCaseCorpus(profiles, cardsBySpecies);

console.log(`Enumerated ${result.shapeCount.toLocaleString()} case shapes.`);
console.log(`Residual distribution: ${JSON.stringify(result.residualCounts)}.`);
console.log(`Tier-1 corroborations: ${result.corroborationCount}.`);
if (result.shapeCount !== CASE_COMPILER_SHAPE_COUNT) {
  throw new Error(`Expected ${CASE_COMPILER_SHAPE_COUNT.toLocaleString()} shapes, got ${result.shapeCount.toLocaleString()}.`);
}
if (result.errors.length > 0) {
  console.log(`Corpus errors: ${result.errors.length}.`);
  for (const error of result.errors.slice(0, 30)) console.log(`- ${error}`);
  if (result.errors.length > 30) console.log(`- … ${result.errors.length - 30} more`);
  if (!reportOnly) process.exitCode = 1;
} else {
  console.log('Tier nesting, survivor safety, reduction, residual, and signature assertions passed.');
}

const familySeeds = readdirSync(path.join(root, 'db/seeds/evidence-family'))
  .filter(file => file.endsWith('.json') && file !== 'cascade_hints.json')
  .sort()
  .map(file => parseEvidenceFamilySeed(loadJson(path.join(root, 'db/seeds/evidence-family'), file), file));
const dossierById = new Map(readdirSync(path.join(root, 'db/seeds/deduction'))
  .filter(file => file.endsWith('.json'))
  .map(file => parseEvidenceProfileDossier(loadJson(path.join(root, 'db/seeds/deduction'), file), file))
  .map(dossier => [dossier.iucnId, dossier]));
const familyValidationErrors = validateEvidenceFamilyCorpus(familySeeds, [...dossierById.values()].filter(dossier => EVIDENCE_PROTOTYPE_IUCN_IDS.includes(dossier.iucnId as typeof EVIDENCE_PROTOTYPE_IUCN_IDS[number])));
let familyCardId = 1;
const familyCards = new Map<number, CompilerEvidenceFamilyCard[]>(familySeeds.map(seed => [
  seed.iucn_id,
  seed.cards.map(card => ({
    id: familyCardId++, speciesId: seed.iucn_id, family: card.family,
    observationText: card.observation_text, inferenceText: card.inference_text,
    traitPhrase: card.trait_phrase, bonusFactText: card.bonus_fact_text, traitCategory: card.trait_category, compareTag: card.compare_tag,
  })),
]));
let familyHintId = 1;
const familyHints = new Map<number, CompilerEvidenceFamilyHint[]>(familySeeds.map(seed => [seed.iucn_id, seed.cards.flatMap(card =>
  card.hints.map((hintText, sequenceIndex) => ({
    id: familyHintId++, speciesId: seed.iucn_id, family: card.family, sequenceIndex, hintText, weakTag: card.compare_tag,
  })),
)]));
const v3 = verifyCaseCorpusV3(profiles, familyCards, familyHints);
console.log(`Enumerated ${v3.pathCount.toLocaleString()} v3 family paths.`);
console.log(`V3 residual distribution: ${JSON.stringify(v3.residualCounts)}.`);
for (const warning of v3.warnings) console.warn(`Warning: ${warning}`);
const v3Errors = [...familyValidationErrors, ...v3.errors];
const forcedCases = profiles.map(profile => compileCaseV3({
  caseSeed: 'c'.repeat(64), prototypeSpeciesIds: profiles.map(item => item.speciesId), speciesPool: profiles,
  cardsBySpecies: familyCards, hintsBySpecies: familyHints,
  cascadeHints: Array.from({ length: 15 }, (_, sequenceIndex) => ({ id: 10_000 + sequenceIndex, sequenceIndex, hintText: `Cascade ${sequenceIndex}.` })),
  gisPrior: new Map(), boardSeeds: [11, 22, 33],
  mapView: {
    bounds: [-1, -1, 3, 3],
    route: [0, 1, 2].map(nodeIndex => ({ nodeIndex, lon: nodeIndex, lat: nodeIndex, biome: 'Test biome', nearestFeature: `Site ${nodeIndex + 1}` })) as import('../src/expedition/mapView').ExpeditionMapView['route'],
  },
  forcedAnswerId: profile.speciesId,
}));
if (forcedCases.some(compiled => 'error' in compiled)) v3Errors.push('Forced-answer v3 compilation failed.');
const publicVariants = new Set(forcedCases.flatMap(compiled => 'error' in compiled ? [] : [JSON.stringify(compiled.public)]));
if (publicVariants.size !== 1) v3Errors.push('V3 public projection changes with forced answer.');
if (v3.pathCount !== 360) v3Errors.push(`Expected 360 v3 paths, got ${v3.pathCount}.`);
if (v3Errors.length > 0) {
  for (const error of v3Errors.slice(0, 30)) console.log(`- ${error}`);
  if (!reportOnly) process.exitCode = 1;
} else {
  console.log('V3 answer survival, monotone candidates, residual, hint safety, and answer-neutral public projection passed.');
}
