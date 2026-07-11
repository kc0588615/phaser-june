import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { compileCase, FIXED_ROUTE_METHODS, type CompilerCard, type CompilerSpeciesProfile } from '../src/lib/caseCompiler';
import { EVIDENCE_PROTOTYPE_IUCN_IDS, parseEvidenceProfileDossier, parseEvidenceSeed, type EvidenceProfileDossier } from '../src/lib/evidenceSeedValidation';

const SAMPLE_COUNT = 200;
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
  const dossiers = readdirSync(path.join(root, 'db/seeds/deduction'))
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => parseEvidenceProfileDossier(loadJson(path.join(root, 'db/seeds/deduction'), file), file))
    .filter(dossier => selected.has(dossier.iucnId));
  const seeds = readdirSync(path.join(root, 'db/seeds/evidence'))
    .filter(file => file.endsWith('.json'))
    .sort()
    .map(file => parseEvidenceSeed(loadJson(path.join(root, 'db/seeds/evidence'), file), file));

  let cardId = 1;
  const cardsBySpecies = new Map<number, CompilerCard[]>();
  const cardsById = new Map<number, CompilerCard>();
  for (const seed of seeds.sort((a, b) => a.iucn_id - b.iucn_id)) {
    const cards = seed.cards.map((card): CompilerCard => {
      const value: CompilerCard = {
        id: cardId++, speciesId: seed.iucn_id, method: card.method,
        traitCategory: card.trait_category, primaryPredicate: card.primary_predicate,
        compareTag: card.compare_tags[0], isSignature: card.is_signature, specificity: card.specificity,
      };
      cardsById.set(value.id, value);
      return value;
    });
    cardsBySpecies.set(seed.iucn_id, cards);
  }
  return { profiles: dossiers.map(toProfile), cardsBySpecies, cardsById };
}

function profileHasTag(profile: CompilerSpeciesProfile, card: CompilerCard): boolean {
  const key = {
    habitat: 'habitatTags', morphology: 'morphologyTags', diet: 'dietTags', behavior: 'behaviorTags',
    reproduction: 'reproductionTags', taxonomy: 'taxonomyTags', geography: 'geographyTags',
    conservation: 'conservationTags', key_fact: 'keyFactTags',
  }[card.traitCategory] as keyof CompilerSpeciesProfile;
  return (profile[key] as readonly string[]).includes(card.compareTag);
}

function runSamples() {
  const { profiles, cardsBySpecies, cardsById } = loadCorpus();
  const prototypeSpeciesIds = [...EVIDENCE_PROTOTYPE_IUCN_IDS];
  const eliminationsByStep = [[], [], [], []] as number[][];
  let signatureCases = 0;
  const snapshots: string[] = [];

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const favored = prototypeSpeciesIds[sample % prototypeSpeciesIds.length];
    const gisPrior = new Map(prototypeSpeciesIds.map((id, index) => [id, id === favored ? 1 : ((sample + index) % 4) / 20]));
    const caseSeed = createHash('sha256').update(`case-compiler-sample:${sample}`).digest('hex');
    const result = compileCase({
      caseSeed, prototypeSpeciesIds, speciesPool: profiles, cardsBySpecies, gisPrior,
      routeMethods: [...FIXED_ROUTE_METHODS], boardSeeds: [sample, sample + 1, sample + 2],
    });
    if ('error' in result) throw new Error(`sample ${sample} failed: ${result.error} ${result.message}`);

    let live = profiles;
    for (const [step, cardId] of result.private.chainCardIds.entries()) {
      const card = cardsById.get(cardId);
      if (!card) throw new Error(`sample ${sample} references missing card ${cardId}`);
      const next = live.filter(profile => profileHasTag(profile, card));
      const eliminated = live.length - next.length;
      if (eliminated < 1) throw new Error(`sample ${sample} has dead reveal at step ${step + 1}`);
      eliminationsByStep[step].push(eliminated);
      live = next;
    }
    if (live.length !== 1 || live[0].speciesId !== result.private.answerId) {
      throw new Error(`sample ${sample} did not resolve uniquely`);
    }
    if (result.private.chainCardIds.length === 4) signatureCases += 1;
    snapshots.push(JSON.stringify(result));
  }

  const signatureRate = signatureCases / SAMPLE_COUNT;
  if (signatureRate > 0.1) throw new Error(`signature rate ${(signatureRate * 100).toFixed(1)}% exceeds 10%`);
  return {
    hash: createHash('sha256').update(snapshots.join('\n')).digest('hex'),
    signatureCases,
    signatureRate,
    eliminationsByStep: eliminationsByStep.map(values => ({
      samples: values.length,
      mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
      distribution: Object.fromEntries([...new Set(values)].sort().map(value => [value, values.filter(entry => entry === value).length])),
    })),
  };
}

const first = runSamples();
const second = runSamples();
if (first.hash !== second.hash) throw new Error('compiler snapshot hash changed between identical runs');

console.log(`Compiled ${SAMPLE_COUNT} deterministic cases.`);
console.log(`Signature fallback: ${first.signatureCases}/${SAMPLE_COUNT} (${(first.signatureRate * 100).toFixed(1)}%).`);
first.eliminationsByStep.forEach((step, index) => {
  if (step.samples > 0) console.log(`Step ${index + 1}: mean ${step.mean.toFixed(2)}, distribution ${JSON.stringify(step.distribution)}.`);
});
console.log(`Snapshot hash: ${first.hash}`);
