// Website build (plan 051 §10): src/site -> out/site, static files for critterconnect.org (pages, stylesheet, shots, og.png,
// /teachers/' inline class link script).
// `npm run site:build`; preview with `npm run site:serve`. Deterministic: same sources, same bytes.
//
// Not run through scripts/run-typescript.mjs: Tailwind's native modules can't be bundled, so this calls
// postcss + Tailwind directly and bundles only src/site/render.tsx (React to HTML) with esbuild.
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = path.join(root, 'src/site');
const outDir = path.join(root, 'out/site');

/** Writes `content` to out/site/site/<name>.<hash>.<ext> and returns its URL path. */
function writeHashed(name, content) {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 10);
  const ext = path.extname(name);
  const file = `${path.basename(name, ext)}.${hash}${ext}`;
  writeFileSync(path.join(outDir, 'site', file), content);
  return `/site/${file}`;
}

function writeOut(file, content) {
  const target = path.join(outDir, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

async function compileCss() {
  const from = path.join(siteDir, 'site.css');
  const result = await postcss([tailwind({ base: siteDir, optimize: { minify: true } })]).process(readFileSync(from, 'utf8'), { from });
  return result.css;
}

/** The class link maker's browser code (src/site/classLink.client.ts), minified for /teachers/ to inline. */
async function bundleClient() {
  const { outputFiles } = await build({
    entryPoints: [path.join(siteDir, 'classLink.client.ts')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    logLevel: 'warning',
  });
  return outputFiles[0].text.trim();
}

/** Bundles src/site/render.tsx for Node and returns its renderSite(). */
async function loadRenderer() {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'cc-site-'));
  const outfile = path.join(tempDir, 'render.cjs');
  try {
    await build({
      entryPoints: [path.join(siteDir, 'render.tsx')],
      outfile,
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      logLevel: 'warning',
    });
    return createRequire(import.meta.url)(outfile).renderSite;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(path.join(outDir, 'site'), { recursive: true });

const stylesheet = writeHashed('site.css', await compileCss());
// The game's screenshots (src/site/shots.ts) and the share picture, hashed like the stylesheet.
const shotsDir = path.join(siteDir, 'shots');
const shots = Object.fromEntries(readdirSync(shotsDir).filter(file => file.endsWith('.webp')).sort()
  .map(file => [file, writeHashed(file, readFileSync(path.join(shotsDir, file)))]));
const ogImage = writeHashed('og.png', readFileSync(path.join(siteDir, 'og.png')));
const renderSite = await loadRenderer();
const classLinkScript = await bundleClient();
for (const { file, content } of await renderSite({ stylesheet, ogImage, shots, classLinkScript })) writeOut(file, content);

// The game's served fonts, wordmarks and favicon, at the same paths (globals.css names /fonts/...).
cpSync(path.join(root, 'public/fonts'), path.join(outDir, 'fonts'), { recursive: true });
for (const file of ['branding/critterconnect-logo.svg', 'branding/critterconnect-logo-light.svg', 'favicon.svg']) {
  cpSync(path.join(root, 'public', file), path.join(outDir, file));
}

console.log(`site: ${path.relative(root, outDir)} (${stylesheet})`);
