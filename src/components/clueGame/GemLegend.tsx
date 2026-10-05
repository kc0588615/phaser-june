// Rules 043 (plan 043): what each gem color asks. One tile per color: its gem, the
// charges it holds toward a question, the question a match asks next, and how many
// animals that answer is sure to cross out ("4+"). When some animals have no record
// for it, the count isn't sure ("4?"): if the mystery is one of them, the answer
// crosses out none and the color's next question is asked. The sixth tile holds the
// saved field notes and the family tree.
import { Lock, TreeDeciduous } from 'lucide-react';
import { GEM_OF, SHORT_LABEL } from '@/clueGame/gems';
import { CHARGE_CATEGORIES, FAMILY_TREE_RANKS, leadQuestions, shortQuestionText, splitOf, type Book, type RoundState } from '@/clueGame/questionMatch';
import { GemIcon } from './GemIcon';
import { isLive } from './LogEntryText';

const tile = 'flex min-h-9 min-w-0 items-center gap-1.5 rounded-lg border px-1.5 py-0.5';

export function GemLegend({ book, round, onNotes, onTree }: {
  book: Book;
  round: RoundState;
  onNotes: () => void;
  onTree: () => void;
}) {
  const leads = leadQuestions(book, round);
  const cost = round.rules.questionCost;
  const sealed = isLive(round.status) && round.status !== 'last-chance';
  const treeDone = round.familyTreeSteps >= FAMILY_TREE_RANKS.length;
  return (
    <ul className="m-0 grid shrink-0 list-none grid-cols-2 gap-1 p-0" aria-label="Gem questions">
      {CHARGE_CATEGORIES.map(category => {
        const lead = leads[category];
        const held = Math.min(cost, round.charges[category]);
        const sure = lead?.unknown === 0;
        return (
          <li
            key={category}
            data-category={category}
            data-tag={lead?.tag ?? ''}
            title={lead?.text}
            aria-label={lead
              ? `${SHORT_LABEL[category]} gems ask: ${lead.text} Crosses out ${sure ? 'at least' : 'maybe'} ${splitOf(lead)}${sure ? '' : ': some animals have no record for it'}.${cost > 1 ? ` ${held} of ${cost} charges.` : ''}`
              : `${SHORT_LABEL[category]} gems: no question left.`}
            className={`${tile} ${lead ? 'border-white/15 bg-white/[.05]' : 'border-white/5 bg-transparent opacity-45'}`}
          >
            <span className="flex shrink-0 flex-col items-center gap-0.5" aria-hidden="true">
              <GemIcon gem={GEM_OF[category]} className="h-5 w-5" />
              {cost > 1 && lead && (
                <span className="flex gap-0.5">
                  {Array.from({ length: cost }, (_, index) => <i key={index} className={`h-1.5 w-1.5 rounded-full ${index < held ? 'bg-ochre' : 'bg-white/20'}`} />)}
                </span>
              )}
            </span>
            <span className="line-clamp-2 min-w-0 flex-1 text-[12px] leading-tight" aria-hidden="true">
              {lead ? shortQuestionText(lead.tag) : 'No question left'}
            </span>
            {lead && (
              <span className="shrink-0 text-center leading-none" aria-hidden="true">
                <b className="block text-[15px] tabular-nums">{splitOf(lead)}{sure ? '+' : '?'}</b>
                <span className="text-[9px] text-mist/60">out</span>
              </span>
            )}
          </li>
        );
      })}
      <li className="grid grid-cols-2 gap-1">
        <button type="button" onClick={onNotes} aria-label={`Field notes: ${round.notesCollected} saved${sealed ? ', sealed until a last chance' : ''}`} className={`${tile} justify-center border-notes/50 bg-notes/10`}>
          {sealed ? <Lock className="h-4 w-4 text-notes" aria-hidden="true" /> : <GemIcon gem={GEM_OF.notes} className="h-5 w-5" />}
          <b className="text-[15px] tabular-nums">{round.notesCollected}</b>
        </button>
        <button type="button" onClick={onTree} aria-label={`Family tree: ${round.familyTreeSteps} of ${FAMILY_TREE_RANKS.length} steps`} className={`${tile} justify-center border-action bg-action/15`}>
          <TreeDeciduous className="h-4 w-4 text-leaf" aria-hidden="true" />
          <b className="text-[13px] tabular-nums">{treeDone ? '✓' : `${round.familyTreeSteps}/${FAMILY_TREE_RANKS.length}`}</b>
        </button>
      </li>
    </ul>
  );
}
