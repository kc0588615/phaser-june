// Proof that the website leaves the game's styles alone (plan 2026-10-29-cc-website A1; owner 2026-10-29: the game's
// theme stays exactly as it is). Compiles the game's stylesheet (src/styles/globals.css, with Tailwind scanning only the
// game's own sources, minified like the production CSS) at <base> and at HEAD, and exits 0 only if the two are
// byte-identical. src/site/ is left out of HEAD's tree; the files HEAD deleted (pages the game no longer has) are left
// out of base's, and printed, so the allowance is visible.
//   node scripts/check-game-css.mjs [base=origin/main] [outDir]
// Tests what is committed: commit first. Not in CI (it fails by design on any PR that changes the game's styles).
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [base = 'origin/main', outDir = path.join(os.tmpdir(), 'cc-game-css')] = process.argv.slice(2);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

function fail(message) {
  console.error(`check-game-css: ${message}`);
  process.exit(1);
}

const dirs = [];

/** `ref`'s src/ in a fresh temp dir (removed at the end), minus `drop`, with the repo's node_modules linked in for Tailwind's imports. */
function tree(ref, drop) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-game-css-'));
  dirs.push(dir);
  const archive = path.join(dir, 'src.tar');
  git('archive', '-o', archive, ref, 'src');
  execFileSync('tar', ['-xf', archive, '-C', dir]);
  rmSync(archive);
  for (const file of drop) rmSync(path.join(dir, file), { recursive: true, force: true });
  symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'));
  return dir;
}

async function compile(dir) {
  const from = path.join(dir, 'src/styles/globals.css');
  const result = await postcss([tailwind({ base: dir, optimize: { minify: true } })]).process(readFileSync(from, 'utf8'), { from });
  return result.css;
}

if (base === 'origin/main') {
  try {
    git('fetch', '-q', 'origin', 'main');
  } catch {
    fail('git fetch origin main failed: the base would be stale');
  }
}
if (git('status', '--porcelain', '--', 'src').trim()) fail('src/ has uncommitted changes; this checks HEAD, so commit first');
try {
  git('rev-parse', '--verify', '--quiet', `${base}^{commit}`);
} catch {
  fail(`no such commit: ${base}`);
}

const deleted = git('diff', '--name-only', '--no-renames', '--diff-filter=D', base, 'HEAD', '--', 'src').split('\n').filter(Boolean);
console.log(`base ${base}, dropped from base (deleted in HEAD): ${deleted.length ? deleted.join(', ') : 'none'}`);

try {
  const [baseCss, headCss] = await Promise.all([tree(base, deleted), tree('HEAD', ['src/site'])].map(compile));
  mkdirSync(outDir, { recursive: true });
  const sums = [['base', baseCss], ['head', headCss]].map(([name, css]) => {
    writeFileSync(path.join(outDir, `${name}.css`), css);
    // One rule per line, so a diff of the two shows the rules that differ.
    writeFileSync(path.join(outDir, `${name}.rules.css`), css.replaceAll('}', '}\n'));
    const sum = createHash('sha256').update(css).digest('hex');
    console.log(`${name}: ${sum}  ${css.length} bytes`);
    return sum;
  });
  writeFileSync(path.join(outDir, 'sha256.txt'), `${sums[0]}  base.css (${base})\n${sums[1]}  head.css (HEAD ${git('rev-parse', 'HEAD').trim()})\n`);
  if (sums[0] !== sums[1]) {
    try {
      execFileSync('diff', ['-u', path.join(outDir, 'base.rules.css'), path.join(outDir, 'head.rules.css')], { stdio: 'inherit' });
    } catch {
      // diff exits 1 when the files differ; it has printed the difference.
    }
    console.error('check-game-css: the game stylesheets differ');
    process.exitCode = 1;
  } else {
    console.log(`OK: the game's stylesheet is byte-identical (${outDir})`);
  }
} finally {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
}
