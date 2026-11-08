import { Fragment } from 'react';
import { BLANK } from '@/clueGame/questionMatchContent';

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
