import { useEffect, useState } from 'react';
import { Radio, Sparkles } from 'lucide-react';
import type { CaseState } from '@/types/expedition';

type Hint = CaseState['hintFeed'][number];
const MESSAGE_DURATION_MS = 4000;

export function FieldHintTicker({ feed }: { feed: Hint[] }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const current = feed[messageIndex] ?? feed[0] ?? null;

  useEffect(() => {
    setMessageIndex(index => feed.length === 0 ? 0 : Math.min(index, feed.length - 1));
  }, [feed.length]);

  useEffect(() => {
    if (!current || feed.length < 2) return;
    const timer = window.setTimeout(() => {
      setMessageIndex(index => (index + 1) % feed.length);
    }, MESSAGE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [current?.id, feed.length]);

  return (
    <section className="pointer-events-none absolute left-3 right-3 top-0 z-[70] flex h-9 items-center overflow-hidden border-b border-cyan-200/25 bg-[rgb(6,22,27)] md:left-14 md:right-40" aria-label="Field radio">
      <div className="flex h-full shrink-0 items-center gap-1.5 border-r border-cyan-100/20 bg-[rgb(10,35,41)] px-3 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-100">
        {current?.kind === 'cascade' ? <Sparkles className="h-3.5 w-3.5 text-amber-300" /> : <Radio className="h-3.5 w-3.5 text-cyan-300" />}
        Radio
      </div>
      <div className="h-full min-w-0 flex-1" aria-live="polite" aria-atomic="true">
        {current ? (
          <p key={current.id} className="m-0 flex h-full items-center truncate px-4 font-mono text-xs text-cyan-50">
            {current.kind === 'cascade' ? 'MULTIPLE SIGNALS · ' : 'FIELD TEAM · '}{current.text}
          </p>
        ) : (
          <p className="m-0 flex h-full items-center px-4 font-mono text-[11px] text-cyan-100/50">Listening for field signals…</p>
        )}
      </div>
    </section>
  );
}
