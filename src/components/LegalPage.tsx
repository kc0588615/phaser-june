import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const CONTACT_EMAIL = 'privacy@critterconnect.org';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-night px-4 py-10 text-mist">
      <Head>
        <title>{`${title} · Critter Connect`}</title>
      </Head>
      <main className="mx-auto max-w-2xl space-y-4 leading-relaxed [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-mist [&_a]:text-leaf [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        <Link href="/" className="text-sm">← Back to the globe</Link>
        <h1 className="font-display text-2xl font-bold text-mist">{title}</h1>
        <p className="text-sm text-sage">Last updated {updated}</p>
        {children}
      </main>
    </div>
  );
}
