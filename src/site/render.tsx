// The site's files as text (plan 051 §10), rendered by scripts/site.mjs, which writes them to out/site.
// Pure: the same sources give the same bytes (no dates, no random values).
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PAGES, SITE_URL, type SitePage } from './config';
import Layout from './Layout';
import NotFound from './pages/NotFound';

export type SiteFile = { file: string; content: string };
export type SiteAssets = { stylesheet: string };

const ROUTES: Array<{ page: SitePage; Page: ComponentType }> = [
  { page: PAGES.notFound, Page: NotFound },
];

function sitemap(pages: SitePage[]): string {
  const urls = pages.map(page => `  <url><loc>${SITE_URL}${page.path}</loc></url>\n`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
}

export function renderSite(assets: SiteAssets): SiteFile[] {
  const pages = ROUTES.map(({ page, Page }) => ({
    file: page.file,
    content: `<!DOCTYPE html>${renderToStaticMarkup(<Layout page={page} stylesheet={assets.stylesheet}><Page /></Layout>)}\n`,
  }));
  return [
    ...pages,
    { file: 'robots.txt', content: `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n` },
    { file: 'sitemap.xml', content: sitemap(ROUTES.map(route => route.page).filter(page => page.indexed)) },
  ];
}
