import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { glossaryParts, type GlossaryTerm } from '@/clueGame/glossary';
import { popoverMotion } from '@/lib/motion';
import { learnWord } from './useWordsLearned';

/** Text whose science words can be tapped; the tapped word's meaning opens underneath. */
export function GlossaryText({ text }: { text: string }) {
  const [open, setOpen] = useState<GlossaryTerm | null>(null);
  const definitionId = useId();
  const definitionRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    learnWord(open.term);
    definitionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
            className="inline cursor-help p-0 text-left text-inherit underline decoration-neutral-6 decoration-dotted underline-offset-[3px] active:text-neutral-10"
          >
            {part.text}
          </button>
        ))}
      <AnimatePresence initial={false}>
        {open && (
          <motion.span key="definition" ref={definitionRef} id={definitionId} role="note" className="mt-xxs block origin-top rounded-m bg-neutral-1 p-m text-s text-neutral-10 shadow-m" {...popoverMotion}>
            <b className="font-medium">{open.term}:</b> {open.definition}
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
}
