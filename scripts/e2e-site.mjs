// End-to-end test of the website (plan 051 §11): headless Chrome opens every page of the served build
// (src/site -> out/site) on a phone and a desktop, in light and dark, and checks what a visitor and a
// search engine get: axe-core WCAG 2.1 AA with no exceptions, one h1, landmarks, the skip link and
// keyboard focus, no small text, scrolling to the footer, meta tags from src/site/config.ts (og.png served), Play links,
// the site-only button fill, no script files, same-origin requests only, no console errors.
// Repeatable artifact:
//   e2e-artifacts/<run>-site/report.json               every check, per page, size and mode
//   e2e-artifacts/<run>-site/site-<page>-<width>-<mode>.png   each page in full
//
//   npm run site:build && npm run site:serve   (in another terminal; port 3101)
//   npm run e2e:site                           env: E2E_SITE_URL (http://localhost:3101), CHROME_PATH
import { transform } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage, startBrowser } from './cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.E2E_SITE_URL ?? 'http://localhost:3101').replace(/\/$/, '');
const VIEWPORTS = [
  { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
];
const MODES = ['light', 'dark'];
// The site-only primary fill (src/site/site.css; plan 051 §8, owner 2026-10-29), white label at AA.
const PRIMARY_FILL = { light: 'rgb(0, 134, 99)', dark: 'rgb(0, 144, 108)' };
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

// The page list and its words come from the site's own config (plain TS with no imports), so the test
// can't drift from the build. Every page there is tested.
const config = await import(`data:text/javascript,${encodeURIComponent((await transform(readFileSync(path.join(root, 'src/site/config.ts'), 'utf8'), { loader: 'ts', format: 'esm' })).code)}`);
const { OG_IMAGE, PAGES, PLAY_URL, SITE_URL } = config;
// The share picture: the hashed og.png on the apex (scripts/site.mjs).
const OG_URL = new RegExp(`^${SITE_URL.replace(/[.]/g, '\\.')}/site/og\\.[0-9a-f]{10}\\.png$`);
const pages = Object.values(PAGES);
const slug = page => page.path === '/' ? 'home' : page.path.replace(/\.html$/, '').replace(/^\/|\/$/g, '');

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-site`;
const outDir = path.join(root, 'e2e-artifacts', runId);
const report = { base: BASE, pages: pages.map(page => page.path), startedAt: new Date().toISOString(), checks: [], screenshots: [] };
const check = (name, ok, detail = '') => {
  report.checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });
  if (!ok) console.log(`  FAIL ${name}${detail ? `: ${detail}` : ''}`);
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Everything a test reads from one rendered page, gathered in the page. */
function readPage() {
  const meta = selector => document.querySelector(selector)?.getAttribute('content') ?? null;
  const tooSmall = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const element = node.parentElement;
    if (!node.textContent.trim() || !element.getClientRects().length) continue;
    const size = parseFloat(getComputedStyle(element).fontSize);
    if (size < 14) tooSmall.push(`${size}px "${node.textContent.trim().slice(0, 40)}"`);
  }
  return {
    status: performance.getEntriesByType('navigation')[0]?.responseStatus ?? 0,
    theme: document.documentElement.dataset.theme ?? null,
    lang: document.documentElement.lang,
    title: document.title,
    description: meta('meta[name="description"]'),
    canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(link => link.getAttribute('href')),
    robots: meta('meta[name="robots"]'),
    og: Object.fromEntries([...document.querySelectorAll('meta[property^="og:"]')].map(tag => [tag.getAttribute('property'), tag.getAttribute('content')])),
    twitter: Object.fromEntries([...document.querySelectorAll('meta[name^="twitter:"]')].map(tag => [tag.getAttribute('name'), tag.getAttribute('content')])),
    h1: document.querySelectorAll('h1').length,
    landmarks: { header: document.querySelectorAll('body > header').length, main: document.querySelectorAll('main').length, footer: document.querySelectorAll('body > footer').length },
    noAlt: [...document.querySelectorAll('img:not([alt])')].map(img => img.getAttribute('src')),
    tooSmall,
    playLinks: [...document.querySelectorAll('a')].filter(a => /\bplay/i.test(a.textContent) || a.href.includes('play.critterconnect.org')).map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') })),
    primaryFills: [...document.querySelectorAll('.btn-primary')].map(button => getComputedStyle(button).backgroundColor),
  };
}

/** Tabs through the page from the top: each stop, its place in document order and whether its focus shows. */
async function tabWalk(page, evaluate) {
  await evaluate(() => { window.__stops = []; document.activeElement?.blur(); window.scrollTo(0, 0); });
  const stops = [];
  for (let i = 0; i < 80; i++) {
    for (const type of ['keyDown', 'keyUp']) await page('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(30);
    const stop = await evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body || window.__stops.includes(element)) return null;
      const before = window.__stops.at(-1);
      window.__stops.push(element);
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        label: `${element.tagName.toLowerCase()} "${(element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 30)}"`,
        href: element.getAttribute('href'),
        inOrder: !before || Boolean(before.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        focusVisible: element.matches(':focus-visible'),
        ring: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none',
        onScreen: rect.width > 1 && rect.height > 1,
      };
    });
    if (!stop) break;
    stops.push(stop);
  }
  return stops;
}

async function testPage(browser, page, viewport, mode) {
  const name = `${page.path} ${viewport.width} ${mode}`;
  const before = report.checks.length;
  const tab = await openPage(browser);
  const requests = [];
  const errors = [];
  browser.on(({ sessionId, method, params }) => {
    if (sessionId !== tab.sessionId) return;
    if (method === 'Network.requestWillBeSent') requests.push(params.request.url);
    else if (method === 'Network.responseReceived' && params.response.status >= 400) errors.push(`${params.response.status} ${params.response.url}`);
    else if (method === 'Network.loadingFailed' && !params.canceled) errors.push(`${params.errorText} ${params.type}`);
    else if (method === 'Runtime.consoleAPICalled' && params.type === 'error') errors.push(params.args.map(arg => arg.value ?? arg.description ?? '').join(' ').slice(0, 300));
    else if (method === 'Runtime.exceptionThrown') errors.push((params.exceptionDetails.exception?.description ?? params.exceptionDetails.text).slice(0, 300));
    else if (method === 'Log.entryAdded' && params.entry.level === 'error') errors.push(params.entry.text.slice(0, 300));
  });
  for (const domain of ['Page', 'Runtime', 'Network', 'Log']) await tab.page(`${domain}.enable`);
  await tab.page('Network.setCacheDisabled', { cacheDisabled: true });
  await tab.page('Emulation.setFocusEmulationEnabled', { enabled: true }); // focus rings show in a background tab
  await tab.page('Emulation.setDeviceMetricsOverride', viewport);
  await tab.page('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });
  await tab.page('Page.navigate', { url: `${BASE}${page.path}` });
  await tab.waitFor(async () => document.readyState === 'complete' && (await document.fonts.ready, true), `${page.path} to load`);

  const shown = await tab.evaluate(readPage);
  check(`${name}: answers 200`, shown.status === 200, `${shown.status}`);
  check(`${name}: the theme follows the system (${mode})`, shown.theme === mode, `${shown.theme}`);
  check(`${name}: lang="en"`, shown.lang === 'en', shown.lang);
  check(`${name}: title and description from config`, shown.title === page.title && shown.description === page.description, `${shown.title} | ${shown.description}`);
  const url = `${SITE_URL}${page.path}`;
  check(`${name}: ${page.indexed ? 'the exact apex canonical' : 'noindex and no canonical'}`,
    page.indexed ? shown.canonical.length === 1 && shown.canonical[0] === url && shown.robots === null : shown.canonical.length === 0 && shown.robots === 'noindex',
    JSON.stringify({ canonical: shown.canonical, robots: shown.robots }));
  const image = shown.og['og:image'] ?? '';
  const og = {
    'og:type': 'website', 'og:site_name': 'Critter Connect', 'og:title': page.title, 'og:description': page.description, ...(page.indexed ? { 'og:url': url } : {}),
    'og:image': image, 'og:image:type': 'image/png', 'og:image:width': String(OG_IMAGE.width), 'og:image:height': String(OG_IMAGE.height), 'og:image:alt': OG_IMAGE.alt,
  };
  check(`${name}: og tags, og:image the apex og.png`, OG_URL.test(image) && JSON.stringify(shown.og) === JSON.stringify(og), JSON.stringify(shown.og));
  const twitter = { 'twitter:card': 'summary_large_image', 'twitter:title': page.title, 'twitter:description': page.description, 'twitter:image': image, 'twitter:image:alt': OG_IMAGE.alt };
  check(`${name}: twitter tags, the same image`, JSON.stringify(shown.twitter) === JSON.stringify(twitter), JSON.stringify(shown.twitter));
  check(`${name}: one h1`, shown.h1 === 1, `${shown.h1}`);
  check(`${name}: one header, main and footer`, Object.values(shown.landmarks).every(count => count === 1), JSON.stringify(shown.landmarks));
  check(`${name}: alt on every image`, shown.noAlt.length === 0, shown.noAlt.join(', '));
  check(`${name}: no text under 14px`, shown.tooSmall.length === 0, shown.tooSmall.slice(0, 5).join(' | '));
  check(`${name}: Play links go to ${PLAY_URL}`, shown.playLinks.length > 0 && shown.playLinks.every(link => link.href.startsWith(PLAY_URL)), JSON.stringify(shown.playLinks));
  check(`${name}: the primary fill is the site's ${PRIMARY_FILL[mode]}`, shown.primaryFills.length > 0 && shown.primaryFills.every(fill => fill === PRIMARY_FILL[mode]), shown.primaryFills.join(', '));

  // Keyboard: the skip link comes first and moves focus to <main>; every stop is in document order with a visible ring.
  const stops = await tabWalk(tab.page, tab.evaluate);
  check(`${name}: the skip link is the first Tab stop`, stops[0]?.href === '#main' && stops[0].onScreen, JSON.stringify(stops[0] ?? null));
  const badStops = stops.filter(stop => !stop.inOrder || !stop.focusVisible || !stop.ring || !stop.onScreen);
  check(`${name}: every Tab stop is in order and shows its focus`, stops.length > 1 && badStops.length === 0,
    badStops.length ? JSON.stringify(badStops.slice(0, 3)) : stops.map(stop => stop.label).join(', '));
  await tab.evaluate(() => document.querySelector('a[href="#main"]').focus());
  for (const type of ['keyDown', 'keyUp']) await tab.page('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, ...(type === 'keyDown' ? { text: '\r' } : {}) });
  const skipped = await tab.waitFor(() => document.activeElement?.id === 'main' && 'main', 'focus on <main>', 3000).catch(() => null);
  check(`${name}: the skip link moves focus to <main>`, skipped === 'main');

  // The page scrolls (the game's own page is locked to the screen) all the way to the footer.
  const scroll = await tab.evaluate(async () => {
    const page = document.scrollingElement;
    page.scrollTo(0, page.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 300));
    const footer = document.querySelector('body > footer').getBoundingClientRect();
    return { tall: page.scrollHeight > innerHeight + 1, scrollY: Math.round(scrollY), footerBottom: Math.round(footer.bottom), innerHeight };
  });
  check(`${name}: the page scrolls to the footer`, (!scroll.tall || scroll.scrollY > 0) && scroll.footerBottom <= scroll.innerHeight + 1, JSON.stringify(scroll));

  await tab.page('Runtime.evaluate', { expression: AXE_SOURCE });
  const axe = await tab.evaluate(async tags => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return { passes: result.passes.length, violations: result.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map(node => node.target.join(' ')) })) };
  }, AXE_TAGS);
  check(`${name}: axe ${AXE_TAGS.join('/')} finds no violations`, axe.passes > 0 && axe.violations.length === 0, axe.violations.length ? JSON.stringify(axe.violations) : `${axe.passes} rules passed`);

  // Every picture loads (lazy ones too, so the full-page shot shows them); a broken one fails here.
  const pictures = await tab.evaluate(async () => {
    const images = [...document.images];
    for (const image of images) image.loading = 'eager';
    const broken = [];
    for (const image of images) await image.decode().catch(() => broken.push(image.currentSrc || image.src));
    return { count: images.length, broken };
  });
  check(`${name}: every picture loads`, pictures.broken.length === 0, pictures.broken.length ? pictures.broken.join(', ') : `${pictures.count} pictures`);

  await tab.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); }); // the shot shows the page, not the last focus
  const { cssContentSize } = await tab.page('Page.getLayoutMetrics');
  const { data } = await tab.page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: viewport.width, height: Math.ceil(cssContentSize.height), scale: 1 } });
  const shot = `site-${slug(page)}-${viewport.width}-${mode}.png`;
  writeFileSync(path.join(outDir, shot), Buffer.from(data, 'base64'));
  report.screenshots.push(shot);

  const origin = new URL(BASE).origin;
  const foreign = requests.filter(request => !request.startsWith(`${origin}/`) && !request.startsWith('data:'));
  check(`${name}: same-origin requests only`, requests.length > 0 && foreign.length === 0, foreign.length ? foreign.slice(0, 3).join(', ') : `${requests.length} requests`);
  check(`${name}: no console errors or failed requests`, errors.length === 0, errors.slice(0, 3).join(' | '));
  if (report.checks.length === before) check(`${name}: ran its checks`, false);
  await browser.send('Target.closeTarget', { targetId: tab.targetId });
}

async function main() {
  try {
    const response = await fetch(`${BASE}/robots.txt`);
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) {
    throw new Error(`The site isn't served at ${BASE} (${error.message}). Run \`npm run site:build && npm run site:serve\`.`);
  }
  mkdirSync(outDir, { recursive: true });

  // The files as served: no script files on any page; robots and the sitemap name the indexed pages.
  for (const page of pages) {
    const response = await fetch(`${BASE}${page.path}`);
    const html = await response.text();
    check(`${page.path}: served (200)`, response.status === 200, `${response.status}`);
    check(`${page.path}: no <script src`, !/<script[^>]*\ssrc\s*=/i.test(html));
  }
  // The share picture is served here as a 1200x630 PNG (its size from the PNG header).
  const ogTag = (await (await fetch(`${BASE}${pages[0].path}`)).text()).match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? '';
  const ogResponse = OG_URL.test(ogTag) ? await fetch(`${BASE}${new URL(ogTag).pathname}`) : null;
  const png = ogResponse?.ok ? Buffer.from(await ogResponse.arrayBuffer()) : Buffer.alloc(0);
  const ogSize = png.length > 24 && png.toString('latin1', 1, 4) === 'PNG' ? [png.readUInt32BE(16), png.readUInt32BE(20)] : null;
  check('og.png is served here: 200, image/png, its tagged size', ogResponse?.status === 200 && ogResponse.headers.get('content-type')?.startsWith('image/png') && ogSize?.join('x') === `${OG_IMAGE.width}x${OG_IMAGE.height}`,
    JSON.stringify({ ogTag, status: ogResponse?.status ?? null, type: ogResponse?.headers.get('content-type') ?? null, size: ogSize }));
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check('robots.txt names the sitemap', robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`), robots);
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort();
  const indexed = pages.filter(page => page.indexed).map(page => `${SITE_URL}${page.path}`).sort();
  check('sitemap.xml lists exactly the indexed pages as apex URLs', sitemap.includes('<urlset') && JSON.stringify(listed) === JSON.stringify(indexed), JSON.stringify(listed));

  const { browser, close } = await startBrowser();
  try {
    for (const page of pages) {
      for (const viewport of VIEWPORTS) {
        for (const mode of MODES) await testPage(browser, page, viewport, mode);
      }
    }
  } finally {
    await close();
  }
}

main()
  .catch(error => {
    report.error = error.message;
    check('run completed', false, error.message);
  })
  .finally(() => {
    report.finishedAt = new Date().toISOString();
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    const failed = report.checks.filter(result => !result.ok);
    console.log(`${report.checks.length - failed.length}/${report.checks.length} checks passed, ${report.screenshots.length} screenshots. Artifact: ${path.relative(root, outDir)}/`);
    process.exitCode = failed.length ? 1 : 0;
  });
