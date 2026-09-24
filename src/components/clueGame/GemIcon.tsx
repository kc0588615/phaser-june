import type { LootGemType } from '@/expedition/domain';

export function GemIcon({ gem, className = 'h-6 w-6' }: { gem: LootGemType; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG icon
  return <img src={`/assets/evidence/${gem}.svg`} alt="" aria-hidden="true" draggable={false} className={`${className} shrink-0 select-none`} />;
}
