// The charge row: one chip per color (tap to see its questions), the saved field
// notes, and the family tree (plan 041).
import { Lock, TreeDeciduous } from 'lucide-react';
import { GEM_OF, SHORT_LABEL } from '@/clueGame/gems';
import { CHARGE_CATEGORIES, FAMILY_TREE_RANKS, type ChargeCategory, type RoundState } from '@/clueGame/questionMatch';
import { GemIcon } from './GemIcon';
import { isLive, plural } from './LogEntryText';

const chip = 'flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl border px-0.5 py-1 leading-none active:scale-[.97]';

/** Colors collected toward a family tree step (one of each), or ✓ when the tree is done. */
function treeProgress(round: RoundState): string {
  if (round.familyTreeSteps >= FAMILY_TREE_RANKS.length) return '✓';
  const { cost, charges } = round.rules.familyTree;
  if (cost === 'one-of-each') return `${CHARGE_CATEGORIES.filter(category => round.charges[category] > 0).length}/5`;
  if (cost === 'charges') return `${Math.min(charges, CHARGE_CATEGORIES.reduce((sum, category) => sum + round.charges[category], 0))}/${charges}`;
  return `${round.familyTreeSteps}/3`;
}

export function ChargeChips({ round, treeReady, onCategory, onNotes, onTree }: {
  round: RoundState;
  /** A family tree step can be paid for now. */
  treeReady: boolean;
  onCategory: (category: ChargeCategory) => void;
  onNotes: () => void;
  onTree: () => void;
}) {
  const sealed = isLive(round.status) && round.status !== 'last-chance';
  return (
    <div className="grid shrink-0 grid-cols-7 gap-1" aria-label="Charges">
      {CHARGE_CATEGORIES.map(category => (
        <button
          key={category}
          type="button"
          onClick={() => onCategory(category)}
          aria-label={`${SHORT_LABEL[category]}: ${plural(round.charges[category], 'charge')}. Show questions`}
          className={`${chip} ${round.charges[category] ? 'border-white/25 bg-white/[.08]' : 'border-white/10 bg-white/[.02] opacity-60'}`}
        >
          <span className="flex items-center gap-0.5"><GemIcon gem={GEM_OF[category]} className="h-5 w-5" /><b className="text-[15px] tabular-nums">{round.charges[category]}</b></span>
          <span className="mt-0.5 text-[10px] text-white/70">{SHORT_LABEL[category]}</span>
        </button>
      ))}
      <button type="button" onClick={onNotes} aria-label={`Field notes: ${round.notesCollected} saved${sealed ? ', sealed until a last chance' : ''}`} className={`${chip} border-violet-300/40 bg-violet-400/10`}>
        <span className="flex items-center gap-0.5">
          {sealed ? <Lock className="h-4 w-4 text-violet-200" aria-hidden="true" /> : <GemIcon gem={GEM_OF.notes} className="h-5 w-5" />}
          <b className="text-[15px] tabular-nums">{round.notesCollected}</b>
        </span>
        <span className="mt-0.5 text-[10px] text-white/70">Notes</span>
      </button>
      <button
        type="button"
        onClick={onTree}
        aria-label={`Family tree: ${treeProgress(round)}${treeReady ? ', a step is ready' : ''}`}
        className={`${chip} border-emerald-300/40 bg-emerald-400/10 ${treeReady ? 'shadow-[0_0_12px_rgba(110,231,183,.55)]' : ''}`}
      >
        <span className="flex items-center gap-0.5"><TreeDeciduous className="h-4 w-4 text-emerald-200" aria-hidden="true" /><b className="text-[13px] tabular-nums">{treeProgress(round)}</b></span>
        <span className="mt-0.5 text-[10px] text-white/70">Tree</span>
      </button>
    </div>
  );
}
