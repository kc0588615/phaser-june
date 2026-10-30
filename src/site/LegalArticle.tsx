import type { ReactNode } from 'react';
import { H1, MEASURE, NOTE } from './roles';

/** The privacy policy and the terms (plan 051 §4 Legal pages): the shared roles on plain h2, p, ul and a children. */
const PROSE = '[&_h2]:pt-m [&_h2]:font-brand [&_h2]:text-l [&_h2]:font-heavy [&_a]:text-neutral-10 [&_a]:underline [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-xxs [&_ul]:pl-l';

export default function LegalArticle({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-m py-xxl">
      <article className={`${MEASURE} flex flex-col gap-m ${PROSE}`}>
        <h1 className={H1}>{title}</h1>
        <p className={NOTE}>Last updated {updated}</p>
        {children}
      </article>
    </div>
  );
}
