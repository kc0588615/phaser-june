import { Lock, TreeDeciduous } from 'lucide-react';
import { GEM_OF } from '@/clueGame/gems';
import { CATEGORY_LABELS, CHARGE_CATEGORIES, type Rules } from '@/clueGame/questionMatch';
import { GemIcon } from './GemIcon';
import { useEscapeKey } from './useEscapeKey';

/** v7: a match asks its gem's question (plan 043), so returning players see the rules once more. */
export const HOW_TO_PLAY_SEEN_KEY = 'critter-connect:how-to-play-seen:v7';

const tree = <TreeDeciduous className="inline h-4 w-4 align-[-2px] text-emerald-200" aria-hidden="true" />;

export function HowToPlay({ rules, seed, onClose }: { rules: Rules; seed: number; onClose: () => void }) {
  useEscapeKey(onClose);
  const colors = (
    <span className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
      {CHARGE_CATEGORIES.map(category => (
        <span key={category} className="flex items-center gap-1.5"><GemIcon gem={GEM_OF[category]} className="h-5 w-5" />{CATEGORY_LABELS[category]}</span>
      ))}
    </span>
  );
  return (
    <div className="fixed inset-0 z-[8100] grid place-items-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-labelledby="how-to-play-title">
      <div className="cm-pop-in flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border border-cyan-200/30 bg-[#081a21] p-4 text-white shadow-2xl">
        <h2 id="how-to-play-title" className="m-0 text-lg font-bold">How to play</h2>
        <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-snug text-white/90">
          <li>A <b>mystery animal</b> is hiding among the {rules.candidates} animals at the bottom. Find out which one it is.</li>
          <li>
            Swap two gems side by side (swipe, or tap one then the other) to line up <b>3 or more</b> of a kind. Each kind asks one kind of <b>yes/no question</b>:{colors}
            <span className="mt-1 block text-[12px] text-white/75">
              The list under the board shows the question each gem asks next, and how many animals its answer is sure to cross out (&quot;4+ out&quot;).
            </span>
          </li>
          <li>
            {rules.questionCost > 1
              ? <>A question needs <b>{rules.questionCost} charges</b> of its gem. A match of 3 earns 1 charge, 4 earns 2, 5 earns 3. When a gem&apos;s dots fill up, its question is asked at once.</>
              : <>Every match asks its gem&apos;s question at once.</>}
            {' '}The answer crosses animals out.
          </li>
          <li>
            Big matches leave a <b>toy</b> on the board. Match it to set it off:
            <span className="mt-1 block text-[12px] text-white/75">
              4 in a line makes a <b>line gem</b> that clears its row or column. An L or T makes a <b>blast gem</b> that clears the gems around it.
              5 in a line makes a <b>color gem</b>: swap it with any gem to clear every gem of that color. Swap two toys together for a big clear.
              Gems a toy clears earn charges too: every 3 gems earn 1 charge, for the gem it cleared most.
            </span>
          </li>
          <li>You have <b>{rules.moves} moves</b>. When they run out, tap an animal to guess.</li>
          <li>{tree} <b>Family tree:</b> line up {rules.familyTree.match} or more of one gem to reveal its class, then its order, then its family.</li>
          <li>
            <GemIcon gem={GEM_OF.notes} className="inline h-4 w-4 align-[-3px]" /> <b>Note gems</b> glow. Make a match next to one to save a field note <Lock className="inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />.
            If your final guess is wrong, your notes open for one more guess.
          </li>
          <li>Tap an animal to read about it and guess. A right guess scores more with moves left and animals still standing; a wrong one costs {rules.points.wrongGuess} points. Source links open once the round is over.</li>
        </ol>
        <p className="m-0 text-[12px] text-white/70">Keyboard: Tab to the board. Arrows move the cursor, <b>Shift + arrows</b> swap its gem that way.</p>
        <button type="button" onClick={onClose} className="h-12 rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 active:scale-[.98]">Let&apos;s play</button>
        <p className="m-0 text-center text-[10px] text-white/35">Seed {seed} · add ?seed={seed} to the address to replay these animals</p>
      </div>
    </div>
  );
}
