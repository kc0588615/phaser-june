// Fact lines that end in a source number, and below them a closed "Sources (n)" list with one
// full citation per page (plan 2026-11-07-fact-sources §3). Used where a player reads an animal's
// facts after a round: the round-end card and the Field Journal.
import { useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { numberSources, type Citation } from '@/clueGame/citations';
import type { Source } from '@/clueGame/questionMatch';

export interface SourcedFact { key: string | number; text: ReactNode; source: Source | null }

const LINK = 'text-color-1 underline underline-offset-2 [overflow-wrap:anywhere]';

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

export function FactsWithSources({ facts, citations, className = '', itemClassName = '' }: {
  facts: readonly SourcedFact[];
  citations: Readonly<Record<string, Citation>>;
  /** The fact list's classes (its bullets, size, gap). */
  className?: string;
  itemClassName?: string;
}) {
  const id = useId();
  const sources = useRef<HTMLDetailsElement>(null);
  const { marks, list } = numberSources(facts.map(fact => fact.source));
  // A mark opens Sources and moves focus to its entry; no hash change, so the page and URL stay put.
  // Enter on the link fires the same click.
  const jump = (event: MouseEvent<HTMLAnchorElement>, n: number) => {
    event.preventDefault();
    const entry = document.getElementById(`${id}-${n}`);
    if (!sources.current || !entry) return;
    sources.current.open = true;
    entry.focus({ preventScroll: true });
    entry.scrollIntoView({ block: 'nearest' });
  };
  return (
    <>
      <ul className={`m-0 ${className}`}>
        {facts.map((fact, i) => {
          const n = marks[i];
          return (
            <li key={fact.key} className={itemClassName}>
              {fact.text}
              {n !== null && (
                // Zero line height: the number doesn't push its line apart. The after: box widens the tap target without moving layout.
                <sup className="ml-[0.1em] text-xxs leading-[0] text-neutral-7">
                  <a href={`#${id}-${n}`} aria-label={`Source ${n}`} onClick={event => jump(event, n)} className="relative rounded-xs no-underline after:absolute after:-inset-x-xs after:-inset-y-s after:content-['']" data-source-mark={n}>{n}</a>
                </sup>
              )}
            </li>
          );
        })}
      </ul>
      {list.length > 0 && (
        <details ref={sources} className="mt-xs" data-sources>
          <summary className="cursor-pointer rounded-s py-xs text-s font-medium text-neutral-10">Sources ({list.length})</summary>
          <ol className="m-0 flex list-none flex-col gap-xxs p-0 text-xxs text-neutral-8">
            {list.map((source, i) => {
              const citation = source.url ? citations[source.url] : undefined;
              return (
                // Focus is the highlight (focus:, not focus-visible:, which Chrome skips on a scripted focus after a tap).
                // The number sits inside the entry, so the highlight takes it in.
                <li key={i} id={`${id}-${i + 1}`} tabIndex={-1} className="flex scroll-m-xs gap-xs rounded-xs p-xxs outline-none! focus:bg-color-1-transparent focus:shadow-[inset_0_0_0_2px_var(--color-1)]" data-source-entry={i + 1}>
                  <span className="shrink-0 font-data text-neutral-7">{i + 1}.</span>
                  <span>
                    {citation ? <CitationText citation={citation} /> : (
                      <>
                        {source.name}
                        {source.url && <>{' '}<a href={source.url} target="_blank" rel="noopener noreferrer" className={LINK}>{hostOf(source.url)}</a></>}
                        .
                      </>
                    )}
                    {' '}Reworded for this game.
                  </span>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </>
  );
}

function CitationText({ citation }: { citation: Citation }) {
  return (
    <>
      {citation.text}{' '}
      <a href={citation.url} target="_blank" rel="noopener noreferrer" className={LINK}>{hostOf(citation.url)}</a>
      {citation.archive && <>{' '}(<a href={citation.archive.url} target="_blank" rel="noopener noreferrer" className={LINK}>archived copy of {citation.archive.date}</a>)</>}
      .
      {citation.license && <> License: {citation.license}.</>}
    </>
  );
}
