import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const CONTACT_EMAIL = 'privacy@critterconnect.org';

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-1 px-m py-xxl text-m text-neutral-8">
      <Head>
        <title>{`${title} · Critter Connect`}</title>
      </Head>
      <main className="mx-auto max-w-2xl space-y-m [&_h2]:pt-m [&_h2]:font-brand [&_h2]:text-m [&_h2]:font-medium [&_h2]:text-neutral-10 [&_a]:text-color-1 [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-xxs [&_ul]:pl-l">
        <Link href="/" className="text-s">← Back to the globe</Link>
        <h1 className="font-brand text-l font-heavy text-neutral-10">{title}</h1>
        <p className="text-s text-neutral-7">Last updated {updated}</p>
        {children}
      </main>
    </div>
  );
}
