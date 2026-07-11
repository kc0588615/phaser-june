import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_ROUTE_METHODS,
  compileCase,
  type CompilerCard,
  type CompilerSpeciesProfile,
} from '@/lib/caseCompiler';
import {
  EVIDENCE_PROTOTYPE_IUCN_IDS,
  parseEvidenceProfileDossier,
  parseEvidenceSeed,
  validateEvidenceCorpus,
  type EvidenceProfileDossier,
  type EvidenceSeed,
} from '@/lib/evidenceSeedValidation';

const root = process.cwd();
const evidenceDir = path.join(root, 'db/seeds/evidence');
const deductionDir = path.join(root, 'db/seeds/deduction');

function loadJson(directory: string, fileName: string): unknown {
  return JSON.parse(readFileSync(path.join(directory, fileName), 'utf8')) as unknown;
}

function loadCorpus(): { seeds: EvidenceSeed[]; dossiers: EvidenceProfileDossier[] } {
  const seeds = readdirSync(evidenceDir)
    .filter(fileName => fileName.endsWith('.json'))
    .sort()
    .map(fileName => parseEvidenceSeed(loadJson(evidenceDir, fileName), fileName));
  const selectedIds = new Set<number>(EVIDENCE_PROTOTYPE_IUCN_IDS);
  const dossiers = readdirSync(deductionDir)
    .filter(fileName => fileName.endsWith('.json'))
    .sort()
    .map(fileName => parseEvidenceProfileDossier(loadJson(deductionDir, fileName), fileName))
    .filter(dossier => selectedIds.has(dossier.iucnId));
  return { seeds, dossiers };
}

function toCompilerProfile(dossier: EvidenceProfileDossier): CompilerSpeciesProfile {
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

function compilerCorpus(seeds: readonly EvidenceSeed[], dossiers: readonly EvidenceProfileDossier[]): {
  profiles: CompilerSpeciesProfile[];
  cardsBySpecies: Map<number, CompilerCard[]>;
  cardsById: Map<number, CompilerCard>;
} {
  let cardId = 1;
  const cardsBySpecies = new Map<number, CompilerCard[]>();
  const cardsById = new Map<number, CompilerCard>();
  for (const seed of [...seeds].sort((left, right) => left.iucn_id - right.iucn_id)) {
    const cards = seed.cards.map((card): CompilerCard => {
      const compilerCard: CompilerCard = {
        id: cardId,
        speciesId: seed.iucn_id,
        method: card.method,
        traitCategory: card.trait_category,
        primaryPredicate: card.primary_predicate,
        compareTag: card.compare_tags[0],
        isSignature: card.is_signature,
        specificity: card.specificity,
      };
      cardsById.set(cardId, compilerCard);
      cardId += 1;
      return compilerCard;
    });
    cardsBySpecies.set(seed.iucn_id, cards);
  }
  return {
    profiles: dossiers.map(toCompilerProfile),
    cardsBySpecies,
    cardsById,
  };
}

function profileHasCardTag(profile: CompilerSpeciesProfile, card: CompilerCard): boolean {
  const key = {
    habitat: 'habitatTags',
    morphology: 'morphologyTags',
    diet: 'dietTags',
    behavior: 'behaviorTags',
    reproduction: 'reproductionTags',
    taxonomy: 'taxonomyTags',
    geography: 'geographyTags',
    conservation: 'conservationTags',
    key_fact: 'keyFactTags',
  }[card.traitCategory] as keyof CompilerSpeciesProfile;
  return (profile[key] as readonly string[]).includes(card.compareTag);
}

describe('evidence seed corpus', () => {
  test('loads exactly 42 reviewed cards with valid atomic tags, sources, and chains', () => {
    const { seeds, dossiers } = loadCorpus();
    const validation = validateEvidenceCorpus(seeds, dossiers);

    assert.deepEqual(validation.errors, []);
    assert.equal(seeds.length, 6);
    assert.equal(seeds.reduce((total, seed) => total + seed.cards.length, 0), 42);
    assert.equal(validation.reports.length, 6);
    for (const report of validation.reports) {
      assert.equal(report.steps.length, 3);
      assert.ok(report.steps.every(step => step.eliminatedIucnIds.length > 0));
      assert.deepEqual(report.finalCandidateIds, [report.iucnId]);
    }
    assert.ok(validation.ordinaryTagFrequencies.every(entry => entry.count >= 2 && entry.count <= 5));
  });

  test('compiler resolves every possible answer across deterministic tie-breaks with no dead reveal', () => {
    const { seeds, dossiers } = loadCorpus();
    const { profiles, cardsBySpecies, cardsById } = compilerCorpus(seeds, dossiers);
    const prototypeSpeciesIds = [...EVIDENCE_PROTOTYPE_IUCN_IDS];

    for (const answerId of prototypeSpeciesIds) {
      for (let sample = 1; sample <= 24; sample += 1) {
        const result = compileCase({
          caseSeed: (answerId * 100 + sample).toString(16).padStart(64, '0'),
          prototypeSpeciesIds,
          speciesPool: profiles,
          cardsBySpecies,
          gisPrior: new Map(prototypeSpeciesIds.map(speciesId => [speciesId, speciesId === answerId ? 1 : 0])),
          routeMethods: [...FIXED_ROUTE_METHODS],
          boardSeeds: [11, 22, 33],
        });

        assert.ok(!('error' in result), 'expected evidence corpus to compile');
        assert.equal(result.private.answerId, answerId);
        assert.equal(result.private.chainCardIds.length, 3, 'ordinary cards should uniquely solve the prototype');

        let liveProfiles = profiles;
        for (const cardId of result.private.chainCardIds) {
          const card = cardsById.get(cardId);
          assert.ok(card);
          const next = liveProfiles.filter(profile => profileHasCardTag(profile, card));
          assert.ok(next.length < liveProfiles.length, 'every issued card must eliminate at least one candidate');
          assert.ok(next.some(profile => profile.speciesId === answerId), 'answer must survive every card');
          liveProfiles = next;
        }
        assert.deepEqual(liveProfiles.map(profile => profile.speciesId), [answerId]);
      }
    }
  });

  test('rejects non-atomic cards, non-dossier sources, and prohibited ordinary tags', () => {
    const { seeds, dossiers } = loadCorpus();
    const mutated = structuredClone(seeds);
    mutated[0].cards[0].compare_tags.push(mutated[0].cards[1].compare_tags[0]);
    mutated[1].cards[0].source = 'https://example.com/not-reviewed';
    mutated[2].cards[0].trait_category = 'taxonomy';
    mutated[2].cards[0].compare_tags = ['genus:elephas'];

    const errors = validateEvidenceCorpus(mutated, dossiers).errors.join('\n');
    assert.match(errors, /compare_tags must contain exactly one tag/u);
    assert.match(errors, /source must exactly match/u);
    assert.match(errors, /ordinary tag uses prohibited prefix/u);
  });

  test('rejects a misplaced signature and a corpus without a viable three-step chain', () => {
    const { seeds, dossiers } = loadCorpus();
    const mutated = structuredClone(seeds);
    const signature = mutated[0].cards.find(card => card.is_signature)!;
    signature.trait_category = 'habitat';

    const golden = mutated.find(seed => seed.iucn_id === 5_748)!;
    golden.cards[0].trait_category = 'morphology';
    golden.cards[0].primary_predicate = 'distinctive_features:claws_digging';
    golden.cards[0].compare_tags = ['distinctive_features:claws_digging'];

    const errors = validateEvidenceCorpus(mutated, dossiers).errors.join('\n');
    assert.match(errors, /signature tag must occur in exactly its one declared profile array/u);
    assert.match(errors, /no viable three-step positive-elimination chain/u);
  });
});

