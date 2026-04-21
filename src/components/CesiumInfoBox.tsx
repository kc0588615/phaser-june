import React from 'react';
import HabitatLegend from './HabitatLegend';
import type { Species } from '../types/database';

interface InfoBoxData {
  lon?: number;
  lat?: number;
  habitats: string[];
  species: Species[];
  rasterHabitats?: Array<{ habitat_type: string; percentage: number }>;
  bioregion?: {
    bioregion?: string | null;
    realm?: string | null;
    biome?: string | null;
  };
  habitatCount?: number;
  topHabitat?: string;
  message?: string | null;
}

interface Props {
  data: InfoBoxData;
  isLoading: boolean;
  radiusKm: number;
  showBioregionPolygons: boolean;
  onToggleBioregionPolygons: () => void;
}

export const CesiumInfoBox: React.FC<Props> = ({
  data,
  isLoading,
  radiusKm,
  showBioregionPolygons,
  onToggleBioregionPolygons,
}) => {
  return (
    <div className="absolute top-3 left-3 glass-bg shadow-card rounded-2xl border border-ds-subtle text-ds-text-primary text-xs max-w-[320px] z-menu pointer-events-auto px-3.5 py-2.5 flex flex-col gap-1.5">
      {data.message ? (
        <p className="m-0 text-ds-text-secondary">{data.message}</p>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[13px]">
              {data.topHabitat || 'Unknown Biome'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ds-surface-elevated text-ds-cyan">
              {data.species.length} species
            </span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(5, Math.max(1, Math.ceil(data.species.length / 3))) }, (_, i) => (
              <span key={i} className="text-[10px] text-ds-amber">★</span>
            ))}
          </div>
        </>
      )}
      {isLoading && <p className="m-0 text-ds-text-muted italic">Loading...</p>}

      {(data.bioregion || (data.rasterHabitats && data.rasterHabitats.length > 0)) && (
        <HabitatLegend
          habitats={data.rasterHabitats ?? []}
          radiusKm={radiusKm}
          bioregion={data.bioregion}
          showBioregionPolygons={showBioregionPolygons}
          onToggleBioregionPolygons={onToggleBioregionPolygons}
        />
      )}
    </div>
  );
};
