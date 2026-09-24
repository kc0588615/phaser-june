// Content checks for the Clue Match pool. Errors make the game wrong or
// unplayable; warnings are content worth a human look. Used by the unit tests
// (on the checked-in snapshot) and by `npm run clue:pool -- --check` (live DB).
import { GEM_CATEGORIES } from '@/clueGame/categories';
import { fitClue, isDeductive } from '@/clueGame/deduction';
import type { CluePool } from '@/clueGame/pool';
import { EXCLUSIVE_AXES, buildSpeciesRecords, clueTags, rankOfTag } from '@/clueGame/traits';
import { playableSpeciesIds } from '@/clueGame/round';

export interface PoolReport {
  errors: string[];
  warnings: string[];
  summary: { species: number; playable: number; clues: number; deductiveClues: number; facts: number };
}

export function validatePool(pool: CluePool): PoolReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const speciesById = new Map(pool.species.map(species => [species.id, species]));
  const name = (id: number) => speciesById.get(id)?.commonName ?? `species ${id}`;
  const records = buildSpeciesRecords(pool);

  for (const clue of pool.clues) {
    if (!speciesById.has(clue.speciesId)) errors.push(`clue ${clue.id}: species ${clue.speciesId} is missing from the pool`);
    if (!clue.label.trim()) errors.push(`clue ${clue.id}: empty text`);
  }
  for (const fact of pool.facts) {
    if (!speciesById.has(fact.speciesId)) errors.push(`fact for species ${fact.speciesId}: species is missing from the pool`);
    if (!fact.text.trim()) errors.push(`fact for ${name(fact.speciesId)}: empty text`);
  }

  const orderKeys = new Set<string>();
  for (const clue of pool.clues) {
    const key = `${clue.speciesId}|${clue.category}|${clue.revealOrder}`;
    if (orderKeys.has(key)) errors.push(`${name(clue.speciesId)}: two ${clue.category} clues share reveal order ${clue.revealOrder}`);
    orderKeys.add(key);
  }

  for (const clue of pool.clues.filter(isDeductive)) {
    // The answer must always fit its own clues, or a round could rule it out.
    if (fitClue(clue, clue.speciesId, records) !== 'fits') {
      errors.push(`clue ${clue.id} (${name(clue.speciesId)}, ${clue.category}): does not fit its own species`);
    }
    if (clue.category === 'taxonomy') {
      const own = records.get(clue.speciesId);
      const unranked = own ? clueTags(clue).filter(tag => !rankOfTag(tag, own.taxonomy)) : [];
      if (unranked.length) warnings.push(`clue ${clue.id} (${name(clue.speciesId)}): taxonomy tags [${unranked.join(', ')}] match none of its class/order/family/genus`);
    }
  }

  for (const [id, record] of records) {
    const traits = new Set([...record.traits.values()].flatMap(tags => [...tags]));
    for (const [axis, values] of Object.entries(EXCLUSIVE_AXES)) {
      const held = values.filter(value => traits.has(value));
      if (held.length > 1) warnings.push(`${name(id)}: record holds both ${held.join(' and ')} (${axis})`);
    }
    if (!record.taxonomy.class) warnings.push(`${name(id)}: no class in the species table, so taxonomy clues can't rule it in or out`);
  }

  for (const id of playableSpeciesIds(pool)) {
    const own = pool.clues.filter(clue => clue.speciesId === id && isDeductive(clue));
    for (const category of GEM_CATEGORIES) {
      const deducesHere = own.some(clue => category.clueCategories.includes(clue.category));
      const hasClues = pool.clues.some(clue => clue.speciesId === id && category.clueCategories.includes(clue.category));
      const hasFacts = pool.facts.some(fact => fact.speciesId === id && category.factCategories.includes(fact.category));
      if (category.deduces && !deducesHere) warnings.push(`${name(id)}: no tagged ${category.label} clue, so that color never narrows its rounds`);
      if (!hasClues && !hasFacts) warnings.push(`${name(id)}: no ${category.label} notes at all`);
    }
  }

  return {
    errors,
    warnings,
    summary: {
      species: pool.species.length,
      playable: playableSpeciesIds(pool).length,
      clues: pool.clues.length,
      deductiveClues: pool.clues.filter(isDeductive).length,
      facts: pool.facts.length,
    },
  };
}
