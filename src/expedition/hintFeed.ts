import type { CaseState } from '@/types/expedition';

type Hint = CaseState['hintFeed'][number];

export function mergeHintFeed(
  current: readonly Hint[],
  incoming: readonly Hint[],
  limit = 32,
): Hint[] {
  const seen = new Set(current.map(hint => hint.id));
  const additions = incoming.filter(hint => {
    if (seen.has(hint.id)) return false;
    seen.add(hint.id);
    return true;
  });
  return [...current, ...additions].slice(-limit);
}
