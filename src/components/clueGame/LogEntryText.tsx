// How the round's log reads: answers, field notes, family tree steps and guesses.
// A source links out only once the round is over, because a source page names the
// animal (plan 041).
import { Fragment } from 'react';
import { GEM_OF } from '@/clueGame/gems';
import { CATEGORY_LABELS, type LogEntry, type RoundStatus, type Source } from '@/clueGame/questionMatch';
import { BLANK } from '@/clueGame/questionMatchContent';
import { GemIcon } from './GemIcon';

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
export const rankName = (rank: string) => rank.charAt(0).toUpperCase() + rank.slice(1);

/** Still guessing: no answer is out yet, so sources stay unlinked. */
export const isLive = (status: RoundStatus) => status === 'playing' || status === 'out-of-moves' || status === 'last-chance';

export function SourceLine({ source, live }: { source: Source | null | undefined; live: boolean }) {
  if (!source) return null;
  if (live || !source.url) {
    return <span className="text-xs text-neutral-7"> Source: {source.name}{source.url ? ' (link opens once you name the animal)' : ''}</span>;
  }
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-color-1 underline underline-offset-2">
      {' '}Source: {source.name}
    </a>
  );
}

/** A field note with its blanks (words that would name the animal) picked out. */
export function WithBlanks({ text }: { text: string }) {
  const parts = text.split(BLANK);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && <span className="rounded-xs bg-color-3-transparent px-xxs font-heavy text-neutral-10" title="A word that would name the animal">{BLANK}</span>}
        </Fragment>
      ))}
    </>
  );
}

export function LogEntryText({ entry, status, nameOf }: { entry: LogEntry; status: RoundStatus; nameOf: (id: number) => string }) {
  const live = isLive(status);
  const names = (ids: number[]) => ids.map(nameOf).join(', ');
  switch (entry.kind) {
    case 'answer':
      return (
        <span>
          <GemIcon gem={GEM_OF[entry.category]} className="mr-xxs inline h-4 w-4 align-[-3px]" />
          {entry.question}{' '}
          {entry.answer === 'no-record' ? (
            <><b>No record:</b> the field guide doesn&apos;t say, for this animal. Your charges came back.</>
          ) : (
            <>
              <b className={entry.answer === 'yes' ? 'text-color-1' : 'text-error'}>{entry.answer === 'yes' ? 'Yes' : 'No'}.</b>{' '}
              {entry.ruledOut.length ? `Crossed out ${plural(entry.ruledOut.length, 'animal')}.` : 'Nothing crossed out.'}
              {entry.auto && <span className="text-neutral-7"> (Asked for you: your {CATEGORY_LABELS[entry.category]} charges covered every {CATEGORY_LABELS[entry.category]} question.)</span>}
              {entry.noRecord.length > 0 && <span className="text-neutral-7"> No record for: {names(entry.noRecord)}.</span>}
            </>
          )}
          <SourceLine source={entry.source} live={live} />
        </span>
      );
    case 'note':
      return <span>📓 {!live && entry.full ? entry.full : <WithBlanks text={entry.text} />}<SourceLine source={entry.source} live={live} /></span>;
    case 'notes-empty':
      return <span>📓 No more field notes for this animal.</span>;
    case 'step':
      return (
        <span>
          🌳 {rankName(entry.rank)} <b>{entry.name.latin}</b>{entry.name.plain ? ` (${entry.name.plain})` : ''}.{' '}
          {entry.ruledOut.length > 0 && `Crossed out ${plural(entry.ruledOut.length, 'animal')}. `}
          <span className="text-neutral-7">
            {entry.free ? 'Free: every animal left is one.'
              : entry.paid ? `Used ${Object.entries(entry.paid).map(([category, n]) => `${n} ${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}`).join(', ')}.`
              : 'Revealed by a big match!'}
          </span>
          <SourceLine source={entry.source} live={live} />
        </span>
      );
    case 'guess':
      return <span>{entry.correct ? `You guessed the ${nameOf(entry.id)}. Right!` : `Not the ${nameOf(entry.id)}.`}</span>;
    case 'last-chance':
      return <span>📓 <b>Last chance!</b> Your {plural(entry.notes, 'field note')} opened. Guess again.</span>;
  }
}
