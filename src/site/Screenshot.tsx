import { FRAME } from './roles';
import type { ShotImage } from './shots';

/** The picture that leads the first screen loads first. React 18 doesn't know `fetchPriority` (it warns), so the
 * lowercase HTML attribute, passed through as is. */
export const LEAD_IMAGE: Record<string, string> = { fetchpriority: 'high' };

/** A screenshot of the game (plan 051 §4), framed: its own size against layout shift, radius m, lazy.
 * `crop`: classes that crop it (an aspect ratio, object-cover and an object position). */
export default function Screenshot({ shot, crop = '' }: { shot: ShotImage; crop?: string }) {
  return (
    <div className={FRAME}>
      <img
        src={shot.src} width={shot.width} height={shot.height} alt={shot.alt}
        className={`block h-auto w-full rounded-m ${crop}`}
        loading="lazy" decoding="async"
      />
    </div>
  );
}
