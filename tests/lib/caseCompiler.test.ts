import { createHash } from 'node:crypto';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CASE_TRAIT_CATEGORIES,
  FIXED_ROUTE_METHODS,
  compileCase,
  type CompileCaseInput,
  type CompiledCase,
  type CaseCompilerFailure,
  type CompilerCard,
  type CompilerSpeciesProfile,
} from '@/lib/caseCompiler';
import { createSeededStream, hash32, mulberry32 } from '@/lib/seededRng';

const SPECIES_IDS = [101, 102, 103, 104, 105, 106] as const;
const METHOD_CATEGORY = {
  track: 'morphology',
  observe: 'behavior',
  survey: 'habitat',
} as const;
const METHOD_OFFSETS = {
  track: [1, 2],
  observe: [3, 4],
  survey: [5, 1],
} as const;

function hexSeed(value: number): string {
  return value.toString(16).padStart(64, '0');
}

function emptyProfile(speciesId: number): CompilerSpeciesProfile {
  return {
    speciesId,
    habitatTags: [],
    morphologyTags: [],
    dietTags: [],
    behaviorTags: [],
    reproductionTags: [],
    taxonomyTags: [],
    geographyTags: [],
    conservationTags: [],
    keyFactTags: [`signature:${speciesId}`],
    signatureTag: `signature:${speciesId}`,
  };
}

function tagsKey(category: 'habitat' | 'morphology' | 'behavior'):
  'habitatTags' | 'morphologyTags' | 'behaviorTags' {
  return `${category}Tags` as 'habitatTags' | 'morphologyTags' | 'behaviorTags';
}

function addTag(
  profiles: CompilerSpeciesProfile[],
  category: 'habitat' | 'morphology' | 'behavior',
  tag: string,
  memberIds: readonly number[],
): void {
  const key = tagsKey(category);
  const memberSet = new Set(memberIds);
  for (const profile of profiles) {
    if (!memberSet.has(profile.speciesId)) continue;
    (profile[key] as string[]).push(tag);
  }
}

function buildCorpus(options: { singletonFor101?: boolean } = {}): CompileCaseInput {
  const profiles = SPECIES_IDS.map(emptyProfile);
  const cardsBySpecies = new Map<number, CompilerCard[]>();
  let nextCardId = 1;

  for (const method of FIXED_ROUTE_METHODS) {
    const category = METHOD_CATEGORY[method];
    for (const excludedId of SPECIES_IDS) {
      const tag = `${method}:excludes:${excludedId}`;
      addTag(
        profiles,
        category,
        tag,
        SPECIES_IDS.filter((speciesId) => speciesId !== excludedId),
      );
    }
  }

  for (let speciesIndex = 0; speciesIndex < SPECIES_IDS.length; speciesIndex += 1) {
    const speciesId = SPECIES_IDS[speciesIndex];
    const cards: CompilerCard[] = [];

    for (const method of FIXED_ROUTE_METHODS) {
      for (const offset of METHOD_OFFSETS[method]) {
        const excludedId = SPECIES_IDS[(speciesIndex + offset) % SPECIES_IDS.length];
        cards.push({
          id: nextCardId,
          speciesId,
          method,
          traitCategory: METHOD_CATEGORY[method],
          primaryPredicate: `${method}:predicate:${offset}`,
          compareTag: `${method}:excludes:${excludedId}`,
          isSignature: false,
          specificity: 2,
        });
        nextCardId += 1;
      }
    }

    cards.push({
      id: nextCardId,
      speciesId,
      method: 'analyze',
      traitCategory: 'key_fact',
      primaryPredicate: 'signature',
      compareTag: `signature:${speciesId}`,
      isSignature: true,
      specificity: 3,
    });
    nextCardId += 1;
    cardsBySpecies.set(speciesId, cards);
  }

  if (options.singletonFor101) {
    const specialTags = [
      { method: 'track', tag: 'track:special:101', members: [101, 102, 103, 104] },
      { method: 'observe', tag: 'observe:special:101', members: [101, 102] },
      { method: 'survey', tag: 'survey:special:101', members: [101, 105] },
    ] as const;
    const cards = cardsBySpecies.get(101)!;
    for (const special of specialTags) {
      addTag(profiles, METHOD_CATEGORY[special.method], special.tag, special.members);
      cards.push({
        id: nextCardId,
        speciesId: 101,
        method: special.method,
        traitCategory: METHOD_CATEGORY[special.method],
        primaryPredicate: `${special.method}:special`,
        compareTag: special.tag,
        isSignature: false,
        specificity: 3,
      });
      nextCardId += 1;
    }
  }

  return {
    caseSeed: hexSeed(1),
    prototypeSpeciesIds: [...SPECIES_IDS],
    speciesPool: profiles,
    cardsBySpecies,
    gisPrior: new Map(SPECIES_IDS.map((speciesId) => [speciesId, 1])),
    routeMethods: [...FIXED_ROUTE_METHODS],
    boardSeeds: [0, 0x8000_0000, 0xffff_ffff],
  };
}

function forceAnswer(input: CompileCaseInput, answerId: number): void {
  input.gisPrior = new Map(SPECIES_IDS.map((speciesId) => [speciesId, speciesId === answerId ? 1 : 0]));
}

function assertCompiled(result: ReturnType<typeof compileCase>): asserts result is CompiledCase {
  assert.ok(!('error' in result), 'expected a compiled case');
}

function assertFailure(
  result: ReturnType<typeof compileCase>,
): asserts result is CaseCompilerFailure {
  assert.ok('error' in result, 'expected a compiler failure');
}

function compileError(input: CompileCaseInput): CaseCompilerFailure {
  const result = compileCase(input);
  assertFailure(result);
  return result;
}

function cloneInputInReverse(input: CompileCaseInput): CompileCaseInput {
  return {
    ...structuredClone(input),
    prototypeSpeciesIds: [...input.prototypeSpeciesIds].reverse(),
    speciesPool: [...input.speciesPool].reverse().map((profile) => ({
      ...structuredClone(profile),
      habitatTags: [...profile.habitatTags].reverse(),
      morphologyTags: [...profile.morphologyTags].reverse(),
      dietTags: [...profile.dietTags].reverse(),
      behaviorTags: [...profile.behaviorTags].reverse(),
      reproductionTags: [...profile.reproductionTags].reverse(),
      taxonomyTags: [...profile.taxonomyTags].reverse(),
      geographyTags: [...profile.geographyTags].reverse(),
      conservationTags: [...profile.conservationTags].reverse(),
      keyFactTags: [...profile.keyFactTags].reverse(),
    })),
    cardsBySpecies: new Map(
      [...input.cardsBySpecies.entries()]
        .reverse()
        .map(([speciesId, cards]) => [speciesId, [...cards].reverse()]),
    ),
    gisPrior: new Map([...input.gisPrior.entries()].reverse()),
  };
}

function findCard(input: CompileCaseInput, cardId: number): CompilerCard {
  for (const cards of input.cardsBySpecies.values()) {
    const card = cards.find((candidate) => candidate.id === cardId);
    if (card) return card;
  }
  throw new Error(`missing test card ${cardId}`);
}

function profileHasCardTag(profile: CompilerSpeciesProfile, card: CompilerCard): boolean {
  const categoryIndex = CASE_TRAIT_CATEGORIES.indexOf(card.traitCategory);
  assert.notEqual(categoryIndex, -1);
  const key = `${card.traitCategory === 'key_fact' ? 'keyFact' : card.traitCategory}Tags` as keyof CompilerSpeciesProfile;
  return (profile[key] as readonly string[]).includes(card.compareTag);
}

describe('seeded RNG', () => {
  test('pins hash and mulberry32 output', () => {
    assert.equal(hash32('case-compiler'), 3_134_666_217);
    const first = mulberry32(123456);
    const second = mulberry32(123456);
    assert.deepEqual(
      [first(), first(), first()],
      [second(), second(), second()],
    );
    assert.deepEqual(
      [mulberry32(0)(), mulberry32(1)()],
      [0.26642920868471265, 0.6270739405881613],
    );
  });

  test('named streams are deterministic and independent', () => {
    const seed = hexSeed(9);
    const answerA = createSeededStream(seed, 'answer-choice');
    const answerB = createSeededStream(seed, 'answer-choice');
    const candidates = createSeededStream(seed, 'candidate-shuffle');
    assert.equal(answerA(), answerB());
    assert.notEqual(answerA(), candidates());
  });
});

describe('compileCase', () => {
  test('is byte-identical, hash-pinned, input-order independent, and non-mutating', () => {
    const input = buildCorpus();
    input.caseSeed = hexSeed(42);
    const before = structuredClone(input);
    const first = compileCase(input);
    const second = compileCase(input);
    const reordered = compileCase(cloneInputInReverse(input));

    assertCompiled(first);
    assertCompiled(second);
    assertCompiled(reordered);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    assert.equal(JSON.stringify(first), JSON.stringify(reordered));
    assert.deepEqual(input, before);
    assert.equal(
      createHash('sha256').update(JSON.stringify(first)).digest('hex'),
      'f4866e2f6641dae6925e5668f60f34935768a0023a386113a0b8b019f017bc4c',
    );
  });

  test('uses exactly all six candidates and the fixed route', () => {
    const result = compileCase(buildCorpus());
    assertCompiled(result);
    assert.equal(result.public.version, 1);
    assert.deepEqual([...result.public.candidateIds].sort((a, b) => a - b), SPECIES_IDS);
    assert.deepEqual(result.public.nodeMethods, ['track', 'observe', 'survey']);
    assert.equal(result.public.candidateIds.length, 6);
  });

  test('copies independent public board seeds without deriving them from caseSeed', () => {
    const firstInput = buildCorpus();
    firstInput.caseSeed = hexSeed(12);
    firstInput.boardSeeds = [7, 8, 9];
    const secondInput = buildCorpus();
    secondInput.caseSeed = firstInput.caseSeed;
    secondInput.boardSeeds = [101, 102, 103];
    const first = compileCase(firstInput);
    const second = compileCase(secondInput);
    assertCompiled(first);
    assertCompiled(second);

    assert.deepEqual(first.public.boardSeeds, [7, 8, 9]);
    assert.deepEqual(second.public.boardSeeds, [101, 102, 103]);
    assert.deepEqual(first.public.candidateIds, second.public.candidateIds);
    assert.deepEqual(first.private, second.private);
  });

  test('each regular card positively eliminates and preserves a viable later step', () => {
    for (const answerId of SPECIES_IDS) {
      const input = buildCorpus();
      forceAnswer(input, answerId);
      input.caseSeed = hexSeed(answerId);
      const result = compileCase(input);
      assertCompiled(result);
      assert.equal(result.private.answerId, answerId);
      assert.equal(result.private.chainCardIds.length, 4);

      let live = input.speciesPool.map((profile) => profile.speciesId);
      for (let step = 0; step < 3; step += 1) {
        const card = findCard(input, result.private.chainCardIds[step]);
        assert.equal(card.method, FIXED_ROUTE_METHODS[step]);
        const nextLive = live.filter((speciesId) => {
          const profile = input.speciesPool.find((candidate) => candidate.speciesId === speciesId)!;
          return profileHasCardTag(profile, card);
        });
        assert.ok(nextLive.length < live.length, `step ${step} must eliminate a candidate`);
        assert.ok(nextLive.includes(answerId));
        assert.ok(nextLive.length >= 3 - step);
        live = nextLive;
      }
    }
  });

  test('appends a signature iff regular evidence leaves ambiguity', () => {
    const ambiguousInput = buildCorpus();
    forceAnswer(ambiguousInput, 101);
    const ambiguous = compileCase(ambiguousInput);
    assertCompiled(ambiguous);
    assert.equal(ambiguous.private.chainCardIds.length, 4);
    assert.equal(findCard(ambiguousInput, ambiguous.private.chainCardIds[3]).isSignature, true);

    const singletonInput = buildCorpus({ singletonFor101: true });
    forceAnswer(singletonInput, 101);
    const singleton = compileCase(singletonInput);
    assertCompiled(singleton);
    assert.equal(singleton.private.chainCardIds.length, 3);
    assert.equal(singleton.private.chainCardIds.some((id) => findCard(singletonInput, id).isSignature), false);
  });

  test('accepts repeated predicates without imposing a pairwise relationship rule', () => {
    const input = buildCorpus();
    for (const cards of input.cardsBySpecies.values()) {
      for (const card of cards) card.primaryPredicate = 'shared-predicate';
    }
    const result = compileCase(input);
    assertCompiled(result);
  });

  test('all-zero GIS priors use deterministic uniform choice', () => {
    const answers = new Set<number>();
    for (let seed = 1; seed <= 100; seed += 1) {
      const input = buildCorpus();
      input.caseSeed = hexSeed(seed);
      input.gisPrior = new Map(SPECIES_IDS.map((speciesId) => [speciesId, 0]));
      const result = compileCase(input);
      assertCompiled(result);
      answers.add(result.private.answerId);
    }
    assert.deepEqual([...answers].sort((a, b) => a - b), SPECIES_IDS);
  });

  test('treats missing prototype priors as zero and excludes a seventh high-prior profile', () => {
    const input = buildCorpus();
    input.gisPrior = new Map([[999, 1_000_000]]);
    input.speciesPool = [...input.speciesPool, emptyProfile(999)];
    const result = compileCase(input);
    assertCompiled(result);
    assert.ok(SPECIES_IDS.includes(result.private.answerId as typeof SPECIES_IDS[number]));
    assert.equal(result.public.candidateIds.includes(999), false);
  });

  test('a single positive prototype prior forces that answer for every seed', () => {
    for (const answerId of SPECIES_IDS) {
      for (let seed = 1; seed <= 5; seed += 1) {
        const input = buildCorpus();
        input.caseSeed = hexSeed(seed);
        forceAnswer(input, answerId);
        const result = compileCase(input);
        assertCompiled(result);
        assert.equal(result.private.answerId, answerId);
      }
    }
  });

  test('varies candidate order and avoids a biased answer position', () => {
    const orders = new Set<string>();
    const positionCounts = Array.from({ length: 6 }, () => 0);
    const answerCounts = new Map<number, number>(SPECIES_IDS.map((speciesId) => [speciesId, 0]));

    for (let seed = 1; seed <= 100; seed += 1) {
      const input = buildCorpus();
      input.caseSeed = hexSeed(seed);
      const result = compileCase(input);
      assertCompiled(result);
      orders.add(result.public.candidateIds.join(','));
      positionCounts[result.public.candidateIds.indexOf(result.private.answerId)] += 1;
      answerCounts.set(result.private.answerId, answerCounts.get(result.private.answerId)! + 1);
    }

    assert.ok(orders.size > 1);
    assert.ok(positionCounts.every((count) => count > 0 && count <= 30), positionCounts.join(','));
    assert.ok([...answerCounts.values()].every((count) => count > 0 && count <= 30));
  });

  test('pins answer positions for fixed seeds', () => {
    const fixtures = [1, 2, 3, 4, 5].map((seed) => {
      const input = buildCorpus();
      input.caseSeed = hexSeed(seed);
      const result = compileCase(input);
      assertCompiled(result);
      return [result.private.answerId, result.public.candidateIds.indexOf(result.private.answerId)];
    });
    assert.deepEqual(fixtures, [
      [106, 1],
      [106, 5],
      [106, 0],
      [103, 0],
      [101, 5],
    ]);
  });

  test('rejects malformed cardinality, routes, board seeds, and GIS priors', () => {
    const seed = buildCorpus();
    seed.caseSeed = 'not-a-hmac';
    assert.equal(compileError(seed).error, 'invalid_case_seed');

    const five = buildCorpus();
    five.prototypeSpeciesIds = five.prototypeSpeciesIds.slice(0, 5);
    assert.equal(compileError(five).error, 'invalid_prototype_species_ids');

    const route = buildCorpus();
    route.routeMethods = ['track', 'survey', 'observe'];
    assert.equal(compileError(route).error, 'invalid_route_methods');

    const board = buildCorpus();
    board.boardSeeds = [1, 2, UINT32_OVERFLOW];
    assert.equal(compileError(board).error, 'invalid_board_seeds');

    const prior = buildCorpus();
    prior.gisPrior = new Map(prior.gisPrior);
    (prior.gisPrior as Map<number, number>).set(101, Number.NaN);
    assert.equal(compileError(prior).error, 'invalid_gis_prior');

    const overflowPrior = buildCorpus();
    overflowPrior.gisPrior = new Map(
      SPECIES_IDS.map((speciesId) => [speciesId, Number.MAX_VALUE]),
    );
    assert.equal(compileError(overflowPrior).error, 'invalid_gis_prior');
  });

  test('rejects missing profiles, globally duplicated card ids, and insufficient methods', () => {
    const profile = buildCorpus();
    profile.speciesPool = profile.speciesPool.filter((candidate) => candidate.speciesId !== 106);
    assert.equal(compileError(profile).error, 'invalid_species_pool');

    const duplicate = buildCorpus();
    duplicate.cardsBySpecies.get(102)![0].id = duplicate.cardsBySpecies.get(101)![0].id;
    assert.equal(compileError(duplicate).error, 'invalid_card_corpus');

    const insufficient = buildCorpus();
    const cards = insufficient.cardsBySpecies.get(101)! as CompilerCard[];
    const trackIndex = cards.findIndex((card) => card.method === 'track' && !card.isSignature);
    cards.splice(trackIndex, 1);
    assert.equal(compileError(insufficient).error, 'invalid_card_corpus');
  });

  test('rejects ordinary tags outside frequency 2..5 and non-unique signatures', () => {
    const ubiquitous = buildCorpus();
    const first = ubiquitous.cardsBySpecies.get(101)![0];
    const commonTag = 'track:common-to-all';
    for (const profile of ubiquitous.speciesPool) {
      (profile.morphologyTags as string[]).push(commonTag);
    }
    first.compareTag = commonTag;
    assert.equal(compileError(ubiquitous).error, 'invalid_card_corpus');

    const signature = buildCorpus();
    (signature.speciesPool.find((profile) => profile.speciesId === 102)!.keyFactTags as string[])
      .push('signature:101');
    assert.equal(compileError(signature).error, 'invalid_card_corpus');
  });

  test('rejects genus, misc, and signature prefixes on ordinary cards', () => {
    for (const prefix of ['genus:', 'misc:', 'signature:']) {
      const input = buildCorpus();
      const prohibitedTag = `${prefix}ordinary-test`;
      for (const profile of input.speciesPool.slice(0, 5)) {
        (profile.morphologyTags as string[]).push(prohibitedTag);
      }
      input.cardsBySpecies.get(101)![0].compareTag = prohibitedTag;
      assert.equal(compileError(input).error, 'invalid_card_corpus');
    }
  });

  test('returns a typed unsolvable_step when later fixed methods cannot eliminate', () => {
    const input = buildCorpus();
    const cards = input.cardsBySpecies.get(101)!;
    for (const card of cards) {
      if (card.method === 'track' && !card.isSignature) {
        card.compareTag = 'track:excludes:102';
      }
      if (card.method === 'observe' && !card.isSignature) {
        card.compareTag = 'observe:excludes:102';
      }
    }
    const result = compileCase(input);
    assertFailure(result);
    assert.equal(result.error, 'unsolvable_step');
    assert.equal('speciesId' in result, false);
  });
});

const UINT32_OVERFLOW = 0x1_0000_0000;
