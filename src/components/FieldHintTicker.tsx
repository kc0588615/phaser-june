import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { CaseState } from '@/types/expedition';
import { cn } from '@/lib/utils';

type Hint = CaseState['hintFeed'][number];
const HINT_DISPLAY_MS = 3_200;

export function FieldHintTicker({ feed, className = '' }: { feed: Hint[]; className?: string }) {
  const [current, setCurrent] = useState<Hint | null>(() => feed.at(-1) ?? null);
  const queuedRef = useRef<Hint[]>([]);
  const seenIdsRef = useRef<Set<string> | null>(null);
  if (seenIdsRef.current === null) {
    seenIdsRef.current = new Set(feed.map(hint => hint.id));
  }
  const seenIds = seenIdsRef.current;

  useEffect(() => {
    if (feed.length === 0) {
      queuedRef.current = [];
      seenIds.clear();
      return;
    }

    const additions = feed.filter(hint => {
      if (seenIds.has(hint.id)) return false;
      seenIds.add(hint.id);
      return true;
    });
    if (additions.length === 0) return;

    const wasIdle = queuedRef.current.length === 0;
    queuedRef.current.push(...additions);
    if (wasIdle) setCurrent(queuedRef.current.shift() ?? null);
  }, [feed, seenIds]);

  useEffect(() => {
    if (queuedRef.current.length === 0) return;
    const timer = window.setTimeout(() => {
      setCurrent(queuedRef.current.shift() ?? null);
    }, HINT_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [current]);

  const visibleCurrent = current && feed.includes(current) ? current : feed[0] ?? null;

  return (
    <section
      className={cn(
        'flex h-8 min-w-0 items-center overflow-hidden rounded-lg border border-cyan-100/15 bg-[rgba(3,18,22,.88)] shadow-lg backdrop-blur-sm',
        className,
      )}
      aria-label="Field radio"
    >
      <span className="grid h-full w-7 shrink-0 place-items-center text-cyan-200/65" aria-hidden="true">
        {visibleCurrent?.kind === 'cascade'
          ? <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          : <ChevronRight className="h-4 w-4" />}
      </span>
      <div className="h-full min-w-0 flex-1 pr-2" aria-live="polite" aria-atomic="true">
        {visibleCurrent ? (
          <p key={visibleCurrent.id} className="field-hint-arrive m-0 flex h-full items-center truncate font-mono text-[10px] italic text-cyan-50/85">
            {visibleCurrent.kind === 'cascade' ? 'MULTIPLE SIGNALS · ' : 'FIELD TEAM · '}{visibleCurrent.text}
          </p>
        ) : (
          <p className="m-0 flex h-full items-center truncate font-mono text-[10px] italic text-white/38">Listening for field signals…</p>
        )}
      </div>
    </section>
  );
}
