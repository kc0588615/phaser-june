import type { PoolSpecies } from '@/clueGame/pool';

export function GuessBar({ selected, canGuess, onGuess }: {
  selected: PoolSpecies | null;
  canGuess: boolean;
  onGuess: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onGuess}
      disabled={!selected || !canGuess}
      className="h-12 w-full shrink-0 rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 shadow-[0_0_16px_rgba(103,232,249,.35)] transition-all active:scale-[.98] disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none"
    >
      {selected && canGuess ? `Guess: ${selected.commonName}` : 'Tap an animal, then guess'}
    </button>
  );
}
