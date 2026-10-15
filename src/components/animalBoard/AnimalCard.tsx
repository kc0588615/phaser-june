// Plan 046: an animal's card, the same paper polaroid hung on a pin as its board tile
// (BoardView.drawTile): the photo, then a strip with its number (or a name) in
// handwriting. Ruled out, a red marker cross and a grey photo. It fills its box's
// width; the look lives in globals.css (`.animal-card`). The mystery's card while
// playing is a camera-trap frame with no photo (`TrapCard`): a photo, even blurred,
// would let a player match it to a suspect without reading a clue.
import { useState, type CSSProperties, type ReactNode } from 'react';
import type { PoolSpecies } from '@/clueGame/pool';
import { photoAt, speciesBadge } from '@/clueGame/speciesInfo';
import { CARD_TILTS } from '@/game/constants';

export function SuspectPhoto({ species, size = 120 }: { species: PoolSpecies | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!species?.photo || failed) return <span className="grid h-full w-full place-items-center text-m" aria-hidden="true">{species ? speciesBadge(species) : '?'}</span>;
  // eslint-disable-next-line @next/next/no-img-element -- a small remote Commons thumbnail
  return <img src={photoAt(species.photo.url, size)} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} className="h-full w-full object-cover" />;
}

/** `number`: the animal's number this round (also picks its tilt); `caption`: text for the strip instead. */
export function AnimalCard({ species, number, caption, size, marked = false, picked = false }: {
  species: PoolSpecies | undefined; number?: number; caption?: string; size?: number; marked?: boolean; picked?: boolean;
}) {
  const tilt = number === undefined ? 0 : CARD_TILTS[number % CARD_TILTS.length];
  return (
    <span className={`animal-card ${marked ? 'is-out' : ''} ${picked ? 'is-picked' : ''}`} style={{ '--tilt': `${tilt}deg` } as CSSProperties} aria-hidden="true">
      <span className="animal-card-photo"><SuspectPhoto species={species} size={size} /></span>
      <span className="animal-card-strip">{caption ?? number}</span>
      <i className="animal-card-pin" />
      {marked && (
        <svg className="animal-card-x" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M14 12 L86 84 M86 12 L14 84" />
        </svg>
      )}
    </span>
  );
}

/** The mystery's card while playing: an empty camera-trap frame. `children`: what sits on it (the player's own mark count). */
export function TrapCard({ children }: { children?: ReactNode }) {
  return (
    <span className="trap-card">
      <span aria-hidden="true">?</span>
      {children}
    </span>
  );
}
