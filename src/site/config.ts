// The website at critterconnect.org (plan 051): a static build of src/site (scripts/site.mjs), served by Caddy.
// No Next or Clerk here (eslint.config.mjs): every page is plain HTML and CSS.

export const SITE_URL = 'https://critterconnect.org';
export const PLAY_URL = 'https://play.critterconnect.org/';
export const CONTACT_EMAIL = 'privacy@critterconnect.org';
export const OPERATOR = 'Haunted Pavement LLC';
/** A class link (plan 051 §4 /teachers/ row 4): everyone who opens it plays the same session (`?seed=N` replays it). */
export const classLinkUrl = (seed: number) => `${PLAY_URL}explore/?seed=${seed}`;
/** The link /teachers/ shows without JS; with JS, classLink.client.ts draws a random seed. */
export const CLASS_LINK_EXAMPLE_SEED = 1;
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
  teachers: {
    path: '/teachers/',
    file: 'teachers/index.html',
    title: 'Critter Connect for teachers: free, no student accounts',
    description: 'What students do in a round, what they practice, student privacy, and how to give a class the same animals.',
    indexed: true,
  },
  privacy: {
    path: '/privacy/',
    file: 'privacy/index.html',
    title: 'Privacy Policy · Critter Connect',
    description: 'What Critter Connect keeps if you sign in, what stays on your device, and how to delete it. No ads, no tracking.',
    indexed: true,
  },
  terms: {
    path: '/terms/',
    file: 'terms/index.html',
    title: 'Terms of Service · Critter Connect',
    description: `The short terms for playing Critter Connect, a free animal deduction game run by ${OPERATOR}.`,
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
