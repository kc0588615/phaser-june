import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { CompilerEvidenceFamilyCard, CompilerEvidenceFamilyHint } from '../src/lib/caseCompilerV3';
import { compileCaseV3, verifyCaseCorpusV3 } from '../src/lib/caseCompilerV3';
import {
  EVIDENCE_PROTOTYPE_IUCN_IDS,
  parseEvidenceProfileDossier,
} from '../src/lib/evidenceSeedValidation';
import {
  familySeedToCompilerProfiles,
  parseCascadeHintSeed,
  parseEvidenceFamilySeed,
  validateEvidenceFamilyCorpus,
} from '../src/lib/evidenceFamilySeedValidation';

const root = process.cwd();
const reportOnly = process.argv.slice(2).includes('--report');

function loadJson(directory: string, fileName: string): unknown {
  return JSON.parse(readFileSync(path.join(directory, fileName), 'utf8')) as unknown;
}

const selected = new Set<number>(EVIDENCE_PROTOTYPE_IUCN_IDS);
const dossiers = readdirSync(path.join(root, 'db/seeds/deduction'))
  .filter(file => file.endsWith('.json'))
  .sort()
  .map(file => parseEvidenceProfileDossier(loadJson(path.join(root, 'db/seeds/deduction'), file), file))
  .filter(dossier => selected.has(dossier.iucnId));
const profiles = familySeedToCompilerProfiles(dossiers);
const familySeeds = readdirSync(path.join(root, 'db/seeds/evidence-family'))
  .filter(file => file.endsWith('.json') && file !== 'cascade_hints.json')
  .sort()
  .map(file => parseEvidenceFamilySeed(loadJson(path.join(root, 'db/seeds/evidence-family'), file), file));
const cascadeHints = parseCascadeHintSeed(
  loadJson(path.join(root, 'db/seeds/evidence-family'), 'cascade_hints.json'),
  'cascade_hints.json',
).map((hint, id) => ({ id: id + 1, sequenceIndex: hint.sequence_index, hintText: hint.hint_text }));

let familyCardId = 1;
const familyCards = new Map<number, CompilerEvidenceFamilyCard[]>(familySeeds.map(seed => [
  seed.iucn_id,
  seed.cards.map(card => ({
    id: familyCardId++,
    speciesId: seed.iucn_id,
    family: card.family,
    observationText: card.observation_text,
    inferenceText: card.inference_text,
    traitPhrase: card.trait_phrase,
    bonusFactText: card.bonus_fact_text,
    traitCategory: card.trait_category,
    compareTag: card.compare_tag,
  })),
]));
let familyHintId = 1;
const familyHints = new Map<number, CompilerEvidenceFamilyHint[]>(familySeeds.map(seed => [
  seed.iucn_id,
  seed.cards.flatMap(card => card.hints.map((hintText, sequenceIndex) => ({
    id: familyHintId++,
    speciesId: seed.iucn_id,
    family: card.family,
    sequenceIndex,
    hintText,
    weakTag: card.compare_tag,
  }))),
]));

const verification = verifyCaseCorpusV3(profiles, familyCards, familyHints);
const errors = [
  ...validateEvidenceFamilyCorpus(familySeeds, dossiers),
  ...verification.errors,
];
const forcedCases = profiles.map(profile => compileCaseV3({
  caseSeed: 'c'.repeat(64),
  prototypeSpeciesIds: profiles.map(item => item.speciesId),
  speciesPool: profiles,
  cardsBySpecies: familyCards,
  hintsBySpecies: familyHints,
  cascadeHints,
  gisPrior: new Map(),
  boardSeeds: [11, 22, 33],
  mapView: {
    bounds: [-1, -1, 3, 3],
    route: [0, 1, 2].map(nodeIndex => ({
      nodeIndex,
      lon: nodeIndex,
      lat: nodeIndex,
      biome: 'Test biome',
      nearestFeature: `Site ${nodeIndex + 1}`,
    })) as import('../src/expedition/mapView').ExpeditionMapView['route'],
  },
  forcedAnswerId: profile.speciesId,
}));
if (forcedCases.some(compiled => 'error' in compiled)) errors.push('Forced-answer v3 compilation failed.');
const publicVariants = new Set(forcedCases.flatMap(compiled => 'error' in compiled ? [] : [JSON.stringify(compiled.public)]));
if (publicVariants.size !== 1) errors.push('V3 public projection changes with forced answer.');
if (verification.pathCount !== 360) errors.push(`Expected 360 v3 paths, got ${verification.pathCount}.`);

console.log(`Enumerated ${verification.pathCount.toLocaleString()} v3 family paths.`);
console.log(`V3 residual distribution: ${JSON.stringify(verification.residualCounts)}.`);
for (const warning of verification.warnings) console.warn(`Warning: ${warning}`);
if (errors.length > 0) {
  for (const error of errors.slice(0, 30)) console.log(`- ${error}`);
  if (!reportOnly) process.exitCode = 1;
} else {
  console.log('V3 answer survival, monotone candidates, residual, hint safety, and answer-neutral public projection passed.');
}
