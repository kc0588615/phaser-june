export interface EcoregionPreviewProperties {
  ECO_NAME: string;
  BIOME_NAME: string;
  REALM: string;
  COLOR: string;
  COLOR_BIO: string;
  NNH: number | null;
  NNH_NAME: string | null;
}

export interface EcoregionPreviewPick {
  id: string | number | null;
  lon?: number;
  lat?: number;
  properties: EcoregionPreviewProperties;
}

export interface EcoregionPreviewFeature {
  type: 'Feature';
  id?: string | number;
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
  properties: EcoregionPreviewProperties;
}

export interface EcoregionPreviewResponse {
  type: 'FeatureCollection';
  bbox: [number, number, number, number];
  count: number;
  features: EcoregionPreviewFeature[];
}

export interface EcoregionProgress {
  ecoregion: {
    ecoregion_id: number;
    dbEcoregionId?: number;
    bioregion: string | null;
    realm: string | null;
    subrealm: string | null;
    biome: string | null;
    collectionRegion?: string | null;
    total_species: number;
    found_species: number;
  } | null;
  groups: EcoregionProgressGroup[];
  foundPoints: EcoregionFoundPoint[];
}

export interface EcoregionProgressGroup {
  animal_type: string;
  animal_icon: string;
  total_species: number;
  found_species: number;
}

export interface EcoregionFoundPoint {
  discovery_id: string;
  species_id: number;
  common_name: string | null;
  scientific_name: string | null;
  animal_type: string;
  animal_icon: string;
  lon: number;
  lat: number;
  discovered_at: string;
}

export const ANIMAL_MARKER: Record<string, string> = {
  frog: '🐸',
  paw: '🐾',
  turtle: '🐢',
  bird: '🐦',
  fish: '🐟',
  species: '◇',
};
