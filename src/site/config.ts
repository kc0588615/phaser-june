// The website at critterconnect.org (plan 051): a static build of src/site (scripts/site.mjs), served by Caddy.
// No Next or Clerk here (eslint.config.mjs): every page is plain HTML and CSS.

export const SITE_URL = 'https://critterconnect.org';
export const PLAY_URL = 'https://play.critterconnect.org/';
export const CONTACT_EMAIL = 'privacy@critterconnect.org';
export const OPERATOR = 'Haunted Pavement LLC';
/** The share picture: src/site/og.png, the game at 1200x630 (a round start, seed 1, Africa; see shots.ts). PNG, as some scrapers reject WebP. */
export const OG_IMAGE = { width: 1200, height: 630, alt: 'A round of Critter Connect: five animal cards pinned on a board of gems, the evidence grid beside it' };

export type SitePage = {
  /** URL path on the apex. */
  path: string;
  /** Output file under out/site. */
  file: string;
  title: string;
  description: string;
  /** In the sitemap, with an apex canonical; the 404 is neither. */
  indexed: boolean;
};

export const PAGES = {
  home: {
    path: '/',
    file: 'index.html',
    title: 'Critter Connect: a free animal deduction game for grades 6–12',
    description: 'Find the animal the camera saw. Match gems to answer questions, then rule out the look-alikes. Free, no account.',
    indexed: true,
  },
  notFound: {
    path: '/404.html',
    file: '404.html',
    title: 'Page not found · Critter Connect',
    description: 'This page isn\'t here. Critter Connect, a free animal deduction game, is one click away.',
    indexed: false,
  },
} satisfies Record<string, SitePage>;
