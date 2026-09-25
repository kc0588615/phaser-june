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
    clue(1, 'taxonomy', "It's an amphibian (class Amphibia).", ['class:amphibia']),
    clue(1, 'taxonomy', 'Its family is Rhinodermatidae.', ['family:rhinodermatidae'], 2),
    clue(1, 'habitat', 'It lives in cold rainforest streams.', ['system:freshwater', 'cold_streams'], 2),
    clue(1, 'habitat', 'It lives in fresh water.', ['system:freshwater'], 1),
    clue(1, 'reproduction', 'Lays eggs; lives a few years.', ['birth:eggs', 'lifespan:short']),
    clue(1, 'key_fact', 'Discovered on a famous voyage.', [], 1, false),
    clue(2, 'taxonomy', "It's an amphibian (class Amphibia).", ['class:amphibia']),
    clue(2, 'habitat', 'It lives in desert.', ['habitat:desert']),
    clue(2, 'reproduction', 'Lays eggs; long lived.', ['birth:eggs', 'lifespan:long']),
    clue(3, 'taxonomy', "It's a reptile (class Reptilia).", ['class:reptilia']),
    clue(3, 'habitat', 'It lives in rivers.', ['system:freshwater', 'wetlands:permanent_rivers']),
    clue(3, 'reproduction', 'It lays eggs.', ['birth:eggs']),
    clue(4, 'taxonomy', "It's a reptile (class Reptilia).", ['class:reptilia']),
    clue(4, 'habitat', 'It lives in ponds.', ['system:freshwater']),
    clue(5, 'taxonomy', "It's a reptile (class Reptilia).", ['class:reptilia']),
    clue(5, 'habitat', 'It lives in grassland.', ['habitat:grassland']),
    clue(6, 'taxonomy', "It's a reptile (class Reptilia).", ['class:reptilia']),
    clue(6, 'habitat', 'It lives in shrubland.', ['habitat:shrubland']),
    clue(7, 'taxonomy', 'Its family is Felidae.', ['family:felidae']),
    clue(7, 'habitat', 'It lives in forests.', ['habitat:forest']),
    clue(7, 'behavior', 'It lives alone.', ['social:alone']),
    clue(7, 'reproduction', 'It gives birth to live young.', ['birth:live']),
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
