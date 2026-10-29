import type { ReactNode } from 'react';
import Wordmark from '@/components/Wordmark';
import { THEME_COLORS, THEME_SCRIPT } from '@/lib/theme';
import { CONTACT_EMAIL, OG_IMAGE, OPERATOR, PLAY_URL, SITE_URL, type SitePage } from './config';

const LINK = 'text-neutral-10 underline';

/** A photo shown in the page's screenshots, credited in its footer (plan 051 §9): the profile's Commons credit. */
export type PhotoCredit = { id: number; name: string; credit: string; license: string; page: string };

/** The whole document for one site page (plan 051 §4 Layout): head, skip link, header, main, footer. */
export default function Layout({ page, stylesheet, ogImage, credits, children }: {
  page: SitePage; stylesheet: string; ogImage: string; credits: PhotoCredit[]; children: ReactNode;
}) {
  const url = `${SITE_URL}${page.path}`;
  const image = `${SITE_URL}${ogImage}`;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        {page.indexed ? <link rel="canonical" href={url} /> : <meta name="robots" content="noindex" />}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Critter Connect" />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        {page.indexed && <meta property="og:url" content={url} />}
        <meta property="og:image" content={image} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content={String(OG_IMAGE.width)} />
        <meta property="og:image:height" content={String(OG_IMAGE.height)} />
        <meta property="og:image:alt" content={OG_IMAGE.alt} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.description} />
        <meta name="twitter:image" content={image} />
        <meta name="twitter:image:alt" content={OG_IMAGE.alt} />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={THEME_COLORS.light} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={THEME_COLORS.dark} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Light/dark before first paint, the game's own pick or the system's (src/lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="stylesheet" href={stylesheet} />
      </head>
      {/* Ground, text color and the s text step come from globals.css's body rule (cte-canvas = neutral-1, cte-text = neutral-10). */}
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-m focus:top-m focus:z-10 focus:rounded-xs focus:bg-neutral-1 focus:p-s">Skip to content</a>
        <header className="mx-auto flex w-full max-w-6xl items-center gap-m px-m py-s">
          <a href="/" className="mr-auto min-w-0"><Wordmark /></a>
          <a href="/teachers/" className="whitespace-nowrap text-m text-neutral-10 hover:underline focus-visible:underline">For teachers</a>
          <a href={PLAY_URL} className="btn btn-primary">Play</a>
        </header>
        <main id="main" tabIndex={-1} className="flex-1 text-m">{children}</main>
        <footer className="bg-neutral-2 text-s text-neutral-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-s px-m py-xl">
            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-x-l gap-y-xs">
                <li><a href="/teachers/" className={LINK}>For teachers</a></li>
                <li><a href="/privacy/" className={LINK}>Privacy</a></li>
                <li><a href="/terms/" className={LINK}>Terms</a></li>
                <li><a href={PLAY_URL} className={LINK}>Play</a></li>
              </ul>
            </nav>
            <p>Questions: <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a></p>
            <p>Made by {OPERATOR}</p>
            {credits.length > 0 && (
              <div>
                <p>Photos in the screenshots, from Wikimedia Commons:</p>
                <ul>
                  {credits.map(photo => (
                    <li key={photo.id}><a href={photo.page} className={LINK}>{photo.name}</a>: {photo.credit}, {photo.license}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </footer>
      </body>
    </html>
  );
}
