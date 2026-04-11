import { GEM_COLOR_MAP } from '@/expedition/domain';
import type { ActionGemType } from '@/game/constants';

interface GemSwatchProps {
  gem: ActionGemType;
  size?: number;
  glow?: boolean;
  className?: string;
}

export function GemSwatch({ gem, size = 10, glow = false, className }: GemSwatchProps) {
  const color = GEM_COLOR_MAP[gem] ?? '#888';
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: glow ? `0 0 8px ${color}` : 'none',
        border: glow ? '1px solid rgba(255,255,255,0.7)' : 'none',
        flexShrink: 0,
      }}
    />
  );
}
