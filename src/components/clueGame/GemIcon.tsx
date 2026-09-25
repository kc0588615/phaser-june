import type { GemType } from '@/game/constants';

export function GemIcon({ gem, className = 'h-6 w-6' }: { gem: GemType; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG icon
  return <img src={`/assets/evidence/${gem}.svg`} alt="" aria-hidden="true" draggable={false} className={`${className} shrink-0 select-none`} />;
}
