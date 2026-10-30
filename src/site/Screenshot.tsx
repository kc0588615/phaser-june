import { FRAME } from './roles';
import type { ShotImage } from './shots';

/** The picture that leads the first screen loads first. React 18 doesn't know `fetchPriority` (it warns), so the
 * lowercase HTML attribute, passed through as is. */
export const LEAD_IMAGE: Record<string, string> = { fetchpriority: 'high' };

/** A screenshot of the game (plan 051 §4), framed: its own size against layout shift, radius m, lazy unless it leads.
 * `crop`: classes that crop it (an aspect ratio, object-cover and an object position). */
export default function Screenshot({ shot, crop = '', lead = false }: { shot: ShotImage; crop?: string; lead?: boolean }) {
  return (
    <div className={FRAME}>
      <img
        src={shot.src} width={shot.width} height={shot.height} alt={shot.alt}
        className={`block h-auto w-full rounded-m ${crop}`}
        {...(lead ? LEAD_IMAGE : { loading: 'lazy' as const, decoding: 'async' as const })}
      />
    </div>
  );
}
