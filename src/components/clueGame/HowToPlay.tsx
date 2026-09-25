import { GEM_CATEGORIES } from '@/clueGame/categories';
import { FIT_DOTS } from './CandidateGrid';
import { GemIcon } from './GemIcon';
import { useEscapeKey } from './useEscapeKey';

export const HOW_TO_PLAY_SEEN_KEY = 'clue-match:how-to-play-seen:v1';

export function HowToPlay({ seed, onClose }: { seed: number; onClose: () => void }) {
  useEscapeKey(onClose);
  return (
    <div className="fixed inset-0 z-[8100] grid place-items-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-labelledby="how-to-play-title">
      <div className="cm-pop-in flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border border-cyan-200/30 bg-[#081a21] p-4 text-white shadow-2xl">
        <h2 id="how-to-play-title" className="m-0 text-lg font-bold">How to play</h2>
        <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-snug text-white/90">
          <li>
            Drag a row or column to line up <b>3 or more gems</b> of the same color. Line up 4 or 5 for extra clues.
            <span className="mt-1 flex gap-1" aria-hidden="true"><GemIcon gem="green" /><GemIcon gem="green" /><GemIcon gem="green" /></span>
          </li>
          <li>
            Each color reveals a kind of clue about the <b>mystery animal</b>:
            <span className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
              {GEM_CATEGORIES.map(category => (
                <span key={category.gem} className="flex items-center gap-1.5"><GemIcon gem={category.gem} className="h-5 w-5" />{category.label}</span>
              ))}
            </span>
            <span className="mt-1.5 block text-[12px] text-white/75">A <b className="text-cyan-200">★</b> on a color means its next clue can still narrow down the animals. Dashed colors give fun notes to learn from.</span>
          </li>
          <li>
            Watch each animal&apos;s dots. For every clue:
            <span className="mt-1.5 flex flex-col gap-1 text-[12px]">
              {Object.values(FIT_DOTS).map(item => <span key={item.label} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />{item.label}</span>)}
            </span>
          </li>
          <li>Tap the animal you think it is, then <b>Guess</b>. Fewer moves score more points; a wrong guess costs 30.</li>
          <li>Tap an <span className="underline decoration-cyan-200/70 decoration-dotted underline-offset-[3px]">underlined word</span> in a clue to learn what it means.</li>
        </ol>
        <button type="button" onClick={onClose} className="h-12 rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 active:scale-[.98]">Let&apos;s play</button>
        <p className="m-0 text-center text-[10px] text-white/35">Seed {seed} · add ?seed={seed} to the address to replay these animals</p>
      </div>
    </div>
  );
}
