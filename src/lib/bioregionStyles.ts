/** Bioregion biome/realm → color mapping for Cesium polygon styling */

const BIOME_STYLES: Record<string, { fill: string; outline: string }> = {
  'Tropical & Subtropical Moist Broadleaf Forests': { fill: '#2f855a', outline: '#14532d' },
  'Tropical & Subtropical Dry Broadleaf Forests': { fill: '#b7791f', outline: '#92400e' },
  'Tropical & Subtropical Coniferous Forests': { fill: '#276749', outline: '#166534' },
  'Temperate Broadleaf & Mixed Forests': { fill: '#68d391', outline: '#2f855a' },
  'Temperate Conifer Forests': { fill: '#0f766e', outline: '#115e59' },
  'Boreal Forests/Taiga': { fill: '#38b2ac', outline: '#0f766e' },
  'Tropical & Subtropical Grasslands, Savannas & Shrublands': { fill: '#d69e2e', outline: '#b45309' },
  'Temperate Grasslands, Savannas & Shrublands': { fill: '#84cc16', outline: '#4d7c0f' },
  'Flooded Grasslands & Savannas': { fill: '#38bdf8', outline: '#0369a1' },
  'Montane Grasslands & Shrublands': { fill: '#7c3aed', outline: '#5b21b6' },
  Tundra: { fill: '#94a3b8', outline: '#475569' },
  'Mediterranean Forests, Woodlands & Scrub': { fill: '#f97316', outline: '#c2410c' },
  'Deserts & Xeric Shrublands': { fill: '#eab308', outline: '#a16207' },
  Mangroves: { fill: '#14b8a6', outline: '#0f766e' },
};

const REALM_STYLES: Record<string, { fill: string; outline: string }> = {
  Afrotropics: { fill: '#b45309', outline: '#7c2d12' },
  Antarctic: { fill: '#cbd5f5', outline: '#64748b' },
  Australasian: { fill: '#0f766e', outline: '#134e4a' },
  Indomalayan: { fill: '#15803d', outline: '#14532d' },
  Nearctic: { fill: '#2563eb', outline: '#1d4ed8' },
  Neotropic: { fill: '#16a34a', outline: '#166534' },
  Oceania: { fill: '#0891b2', outline: '#155e75' },
  Palearctic: { fill: '#7c3aed', outline: '#5b21b6' },
};

const DEFAULT_STYLE = { fill: '#64748b', outline: '#334155' };

function normalizeBiome(biome?: string): string | undefined {
  if (!biome) return undefined;
  const cleaned = biome.replace(/\\&/g, '&').trim();
  switch (cleaned) {
    case 'Mediterranean Shrublands & Woodlands': return 'Mediterranean Forests, Woodlands & Scrub';
    case 'Polar & Alpine Tundra': return 'Tundra';
    case 'Temperate Grasslands, Shrublands & Heathlands': return 'Temperate Grasslands, Savannas & Shrublands';
    default: return cleaned;
  }
}

export function getBioregionStyle(biome?: string, realm?: string): { fill: string; outline: string } {
  const nb = normalizeBiome(biome);
  if (nb && BIOME_STYLES[nb]) return BIOME_STYLES[nb];
  if (realm && REALM_STYLES[realm]) return REALM_STYLES[realm];
  return DEFAULT_STYLE;
}

export interface BioregionPoly {
  id: string;
  name: string;
  biome: string;
  realm: string;
  fill: string;
  degrees: number[];
}

/** Parse the near-point API bioregions response into renderable polygon data */
export function parseBioregionFeatures(bioregions: any): BioregionPoly[] {
  if (!bioregions?.features?.length) return [];
  const result: BioregionPoly[] = [];
  for (const f of bioregions.features) {
    const props = f.properties ?? {};
    const biome = props.classification_value || props.biome || '';
    const realm = props.realm || '';
    const name = props.bioregion || 'bioregion';
    const style = getBioregionStyle(biome, realm);
    const geom = f.geometry;
    if (!geom) continue;
    const polygons: number[][][][] = geom.type === 'MultiPolygon'
      ? geom.coordinates
      : geom.type === 'Polygon' ? [geom.coordinates] : [];
    for (const poly of polygons) {
      const outer = poly[0];
      if (!outer || outer.length < 3) continue;
      const degrees: number[] = [];
      for (const c of outer) degrees.push(c[0], c[1]);
      result.push({
        id: `${props.ogc_fid ?? result.length}-${result.length}`,
        name, biome, realm, fill: style.fill, degrees,
      });
    }
  }
  return result;
}
