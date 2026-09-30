// Out of moves, the board has nothing left to give, so this panel covers it (plan
// 041): every question the player can still pay for, one tap each, and the family
// tree step when a set is ready (rules 043 ask as you match, so usually there's
// nothing to spend). On a last chance it shows the opened field notes.
// The animal tiles below stay in view for the guess.
import { TreeDeciduous } from 'lucide-react';
import { GEM_OF } from '@/clueGame/gems';
import { CATEGORY_LABELS, CHARGE_CATEGORIES, canAsk, familyTreeQuote, questionsFor, type Book, type RoundState } from '@/clueGame/questionMatch';
import { GemIcon } from './GemIcon';
import { LogEntryText, plural } from './LogEntryText';

export function SpendPanel({ book, round, nameOf, onAsk, onBuy }: {
  book: Book;
  round: RoundState;
  nameOf: (id: number) => string;
  onAsk: (tag: string) => void;
  onBuy: () => void;
}) {
  const questions = questionsFor(book, round);
  const quote = familyTreeQuote(book, round);
  const categories = CHARGE_CATEGORIES.filter(category => canAsk(round, category) && questions[category].length > 0).sort((a, b) => round.charges[b] - round.charges[a]);
  const canSpend = Boolean(quote?.affordable) || categories.length > 0;
  const lastChance = round.status === 'last-chance';
  return (
    <div className="cm-pop-in absolute inset-0 z-10 flex flex-col overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-[#081a21] p-3" role="region" aria-label={lastChance ? 'Last chance' : 'Out of moves'}>
      {lastChance ? (
        <>
          <h2 className="m-0 text-base font-bold">📓 Last chance!</h2>
          <p className="m-0 mb-1 text-[13px] text-white/70">Your field notes opened. A blank (____) hides a word that would name the animal. Tap an animal to guess again.</p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {round.log.filter(entry => entry.kind === 'note').map((entry, index) => (
              <li key={index} className="rounded-lg border border-violet-300/25 bg-violet-400/10 p-2 text-[13px] leading-snug"><LogEntryText entry={entry} status={round.status} nameOf={nameOf} /></li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className="m-0 text-base font-bold">Out of moves!</h2>
          <p className="m-0 text-[13px] text-white/70">
            {canSpend ? 'Spend your charges, then tap an animal to guess.' : 'Tap an animal to guess.'}
            {round.notesCollected > 0 && ` If you're wrong, your ${plural(round.notesCollected, 'field note')} ${round.notesCollected === 1 ? 'gives' : 'give'} you a last chance.`}
          </p>
        </>
      )}
      {quote?.affordable && (
        <button type="button" onClick={onBuy} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 text-sm font-bold text-slate-950 active:scale-[.98]">
          <TreeDeciduous className="h-4 w-4" aria-hidden="true" /> Reveal its {quote.rank} (one charge of each color)
        </button>
      )}
      {categories.map(category => (
        <section key={category} className="mt-2">
          <h3 className="m-0 flex items-center gap-1.5 text-[13px] font-semibold">
            <GemIcon gem={GEM_OF[category]} className="h-4 w-4" /> {CATEGORY_LABELS[category]}
            <span className="ml-auto font-normal text-white/55">{plural(round.charges[category], 'charge')}</span>
          </h3>
          {questions[category].map(question => (
            <button key={question.tag} type="button" onClick={() => onAsk(question.tag)} className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-white/[.05] px-3 py-2 text-left text-sm active:bg-white/15">
              {question.text}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
