import type { ReactNode } from 'react';

/** One page section (plan 051 §4): canvas, or a `neutral-3` band; the page's margins and section spacing. */
export default function Section({ band = false, labelledBy, className = '', children }: {
  band?: boolean; labelledBy: string; className?: string; children: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className={band ? 'bg-neutral-3' : undefined}>
      <div className={`mx-auto w-full max-w-6xl px-m py-xxl md:py-xxxl ${className}`}>{children}</div>
    </section>
  );
}
