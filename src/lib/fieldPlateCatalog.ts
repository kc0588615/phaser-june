import portraitPool from '../../db/seeds/pools/prototype-six/pool.json';

export const FIELD_PLATE_IUCN_IDS = portraitPool.species_iucn_ids;

const FIELD_PLATE_IUCN_ID_SET = new Set<number>(FIELD_PLATE_IUCN_IDS);

export function hasFieldPlatePortrait(iucnId: number): boolean {
  return FIELD_PLATE_IUCN_ID_SET.has(iucnId);
}
