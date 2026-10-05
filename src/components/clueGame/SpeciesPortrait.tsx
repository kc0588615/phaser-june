import { useState } from 'react';
import type { PoolSpecies } from '@/clueGame/pool';
import { photoAt, speciesBadge } from '@/clueGame/speciesInfo';

/** The animal's photo in a circle, or its emoji badge when there is no photo (or it fails to load). */
export function SpeciesPortrait({ species, className, width = 120 }: {
  species: Pick<PoolSpecies, 'commonName' | 'className' | 'taxonOrder' | 'family' | 'photo'>;
  /** Size, border and background of the circle. */
  className: string;
  /** Thumbnail width to request (a Commons standard size). */
  width?: number;
}) {
  const [failed, setFailed] = useState(false);
  const photo = species.photo && !failed ? species.photo : null;
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`} aria-hidden="true">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small remote Commons thumbnail
        <img src={photoAt(photo.url, width)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : speciesBadge(species)}
    </span>
  );
}

/** "Photo: Charles J. Sharp, CC BY-SA 4.0", linked to the file page (the license asks for credit). */
export function PhotoCredit({ photo, className = '' }: { photo: NonNullable<PoolSpecies['photo']>; className?: string }) {
  return (
    <a href={photo.page} target="_blank" rel="noopener noreferrer" className={`text-mist/45 underline decoration-white/20 underline-offset-2 hover:text-mist/70 ${className}`}>
      Photo: {photo.credit}, {photo.license}
    </a>
  );
}
