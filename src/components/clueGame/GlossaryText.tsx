import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { glossaryParts, type GlossaryTerm } from '@/clueGame/glossary';

/** Text whose science words can be tapped; the tapped word's meaning opens underneath. */
export function GlossaryText({ text }: { text: string }) {
  const [open, setOpen] = useState<GlossaryTerm | null>(null);
  const definitionId = useId();
  const definitionRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (open) definitionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]);

  return (
    <>
      {glossaryParts(text).map((part, index) => typeof part === 'string'
        ? <Fragment key={index}>{part}</Fragment>
        : (
          <button
            key={index}
            type="button"
            onClick={() => setOpen(current => (current === part.term ? null : part.term))}
            aria-expanded={open === part.term}
            aria-controls={definitionId}
            className="inline cursor-help p-0 text-left text-inherit underline decoration-cyan-200/70 decoration-dotted underline-offset-[3px] active:text-cyan-100"
          >
            {part.text}
          </button>
        ))}
      {open && (
        <span ref={definitionRef} id={definitionId} role="note" className="cm-feed-in mt-1 block rounded-md border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-[12px] leading-snug text-cyan-50">
          <b>{open.term}:</b> {open.definition}
        </span>
      )}
    </>
  );
}
