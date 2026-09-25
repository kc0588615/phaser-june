// Small hand-built pool shared by the Clue Match rule tests.
import { buildSpeciesRecords } from '@/clueGame/traits';
import type { CluePool, PoolClue, PoolSpecies } from '@/clueGame/pool';
import type { GemType } from '@/game/constants';

let nextId = 1;
export const clue = (speciesId: number, category: PoolClue['category'], label: string, compareTags: string[], revealOrder = 1, isFiltering = true): PoolClue =>
  ({ id: nextId++, speciesId, category, label, compareTags, revealOrder, isFiltering });
export const species = (id: number, className: string, taxonOrder: string, family: string, genus: string): PoolSpecies =>
  ({ id, commonName: `Species ${id}`, scientificName: `${genus} sp${id}`, className, taxonOrder, family, genus, conservationCode: 'LC' });

// 1-2 frogs, 3-4 turtles (same family), 5-6 tortoises (same family), 7 tiger.
export const pool: CluePool = {
  species: [
    species(1, 'AMPHIBIA', 'ANURA', 'RHINODERMATIDAE', 'Rhinoderma'),
    species(2, 'AMPHIBIA', 'ANURA', 'BREVICIPITIDAE', 'Breviceps'),
    species(3, 'REPTILIA', 'TESTUDINES', 'EMYDIDAE', 'Emydoidea'),
    species(4, 'REPTILIA', 'TESTUDINES', 'EMYDIDAE', 'Terrapene'),
    species(5, 'REPTILIA', 'TESTUDINES', 'TESTUDINIDAE', 'Chelonoidis'),
    species(6, 'REPTILIA', 'TESTUDINES', 'TESTUDINIDAE', 'Astrochelys'),
    species(7, 'MAMMALIA', 'CARNIVORA', 'FELIDAE', 'Panthera'),
  ],
  clues: [
    clue(1, 'taxonomy', 'Class: AMPHIBIA, Order: ANURA', ['amphibia', 'anura']),
    clue(1, 'taxonomy', 'Family: Rhinodermatidae, Genus: Rhinoderma', ['rhinodermatidae', 'rhinoderma'], 2),
    clue(1, 'habitat', 'Lives in rainforest streams.', ['freshwater', 'rainforest'], 2),
    clue(1, 'habitat', 'Found near water.', ['freshwater'], 1),
    clue(1, 'reproduction', 'Lays eggs; lives a few years.', ['egg_laying', 'short_lived']),
    clue(1, 'key_fact', 'Discovered on a famous voyage.', [], 1, false),
    clue(2, 'taxonomy', 'Class: AMPHIBIA, Order: ANURA', ['amphibia', 'anura']),
    clue(2, 'habitat', 'Lives in deserts.', ['arid']),
    clue(2, 'reproduction', 'Lays eggs; long lived.', ['egg_laying', 'long_lived']),
    clue(3, 'taxonomy', 'Class: REPTILIA, Order: TESTUDINES', ['reptilia', 'testudines']),
    clue(3, 'habitat', 'Lives in rivers.', ['freshwater', 'riverine']),
    clue(4, 'taxonomy', 'Class: REPTILIA, Order: TESTUDINES', ['reptilia', 'testudines']),
    clue(4, 'habitat', 'Lives in ponds.', ['freshwater']),
    clue(5, 'taxonomy', 'Class: REPTILIA, Order: TESTUDINES', ['reptilia', 'testudines']),
    clue(5, 'habitat', 'Lives in grassland.', ['grassland']),
    clue(6, 'taxonomy', 'Class: REPTILIA, Order: TESTUDINES', ['reptilia', 'testudines']),
    clue(6, 'habitat', 'Lives in scrub.', ['scrubland']),
    clue(7, 'taxonomy', 'Family: Felidae', ['family:felidae']),
    clue(7, 'habitat', 'Lives in forests.', ['forest']),
    clue(7, 'behavior', 'Hunts alone.', ['sociality:solitary']),
    // Realms from range maps: complete wherever a species has one (3-6 have none).
    clue(1, 'geography', 'Lives in Central or South America.', ['realm:neotropical']),
    clue(2, 'geography', 'Lives in Africa south of the Sahara.', ['realm:afrotropical']),
    clue(7, 'geography', 'Lives in South or Southeast Asia.', ['realm:indomalayan']),
    clue(7, 'geography', 'Also lives in northern Asia.', ['realm:palearctic'], 2),
  ],
  facts: [
    { speciesId: 1, category: 'key_fact', text: 'Males carry tadpoles in their vocal sac.', sortOrder: 1 },
    { speciesId: 1, category: 'key_fact', text: 'Discovered on a famous voyage.', sortOrder: 2 },
  ],
};
export const records = buildSpeciesRecords(pool);
export const find = (label: string) => pool.clues.find(c => c.label === label)!;
/** Every species but 1, so a round with these as history makes species 1 the mystery. */
export const OTHERS = [2, 3, 4, 5, 6, 7];

/** A session 'matched' action: one group of `size` per gem. */
export const matched = (gems: GemType[], cascade = false, size = 3) =>
  ({ type: 'matched' as const, groups: gems.map(gem => ({ gem, size })), cascade });
