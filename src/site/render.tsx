// The site's files as text (plan 051 §10), rendered by scripts/site.mjs, which writes them to out/site.
// Pure: the same sources give the same bytes (no dates, no random values).
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readProfiles } from '@/lib/contentProfiles';
import { PAGES, SITE_URL, type SitePage } from './config';
import Layout, { type PhotoCredit } from './Layout';
import NotFound from './pages/NotFound';
import { SHOTS, type Shot, type ShotName } from './shots';

export type SiteFile = { file: string; content: string };
/** URL paths of the hashed files scripts/site.mjs wrote: the stylesheet, og.png and each file in src/site/shots/. */
export type SiteAssets = { stylesheet: string; ogImage: string; shots: Record<string, string> };
/** A shot as a page shows it: shots.ts's record plus its hashed URL. */
export type ShotImage = Shot & { src: string };
/** A page gets only the shots its route lists, so the footer credits every photo it shows. */
export type PageProps = { shots: Partial<Record<ShotName, ShotImage>> };

const ROUTES: Array<{ page: SitePage; Page: ComponentType<PageProps>; shots: ShotName[] }> = [
  { page: PAGES.notFound, Page: NotFound, shots: [] },
];

function sitemap(pages: SitePage[]): string {
  const urls = pages.map(page => `  <url><loc>${SITE_URL}${page.path}</loc></url>\n`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}

/** Each shot's photo credits, in shot order. Every shot is checked, used or not: an animal with no profile or no photo throws. */
async function photoCredits(): Promise<Record<ShotName, PhotoCredit[]>> {
  const profiles = new Map((await readProfiles()).map(({ profile }) => [profile.id, profile]));
  return Object.fromEntries(Object.entries(SHOTS).map(([name, shot]) => [name, shot.photos.map((id): PhotoCredit => {
    const profile = profiles.get(id);
    if (!profile) throw new Error(`src/site/shots.ts: ${name} lists animal ${id}, which has no profile in db/content/animals`);
    if (!profile.photo) throw new Error(`src/site/shots.ts: ${name} lists ${profile.commonName} (${id}), whose profile has no photo`);
    return { id, name: profile.commonName, credit: profile.photo.credit, license: profile.photo.license, page: profile.photo.page };
  })])) as Record<ShotName, PhotoCredit[]>;
}

/** Throws if the shot's file isn't in src/site/shots/ (every shot is checked, used or not). */
function shotImage(name: ShotName, assets: SiteAssets): ShotImage {
  const shot = SHOTS[name];
  const src = assets.shots[shot.file];
  if (!src) throw new Error(`src/site/shots.ts: ${name}'s file src/site/shots/${shot.file} is missing`);
  return { ...shot, src };
}

export async function renderSite(assets: SiteAssets): Promise<SiteFile[]> {
  const credits = await photoCredits();
  const images = Object.fromEntries((Object.keys(SHOTS) as ShotName[]).map(name => [name, shotImage(name, assets)])) as Record<ShotName, ShotImage>;
  const pages = ROUTES.map(({ page, Page, shots }) => {
    const pageCredits = [...new Map(shots.flatMap(name => credits[name]).map(credit => [credit.id, credit])).values()];
    const pageShots = Object.fromEntries(shots.map(name => [name, images[name]]));
    const html = renderToStaticMarkup(
      <Layout page={page} stylesheet={assets.stylesheet} ogImage={assets.ogImage} credits={pageCredits}><Page shots={pageShots} /></Layout>,
    );
    return { file: page.file, content: `<!DOCTYPE html>${html}\n` };
  });
  return [
    ...pages,
    { file: 'robots.txt', content: `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n` },
    { file: 'sitemap.xml', content: sitemap(ROUTES.map(route => route.page).filter(page => page.indexed)) },
  ];
}
