// Raw PNG shots -> the site's WebP (src/site/shots/) and og.png (the og shot, the game at 1200x630). Which files and what
// size come from src/site/shots.ts and config.ts. sharp arrives as next's optional dependency: not in package.json,
// as adding it needs a lockfile update (npm ci in the Dockerfile).
import { transform } from 'esbuild';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SAME_ACROSS_MANIFESTS = ['commit', 'pool', 'seed', 'place'];

const loadTs = async file => import(`data:text/javascript,${encodeURIComponent((await transform(readFileSync(path.join(root, file), 'utf8'), { loader: 'ts', format: 'esm' })).code)}`);
const kb = file => Math.round(statSync(file).size / 1024);

/** Refuses a partial rerun that would mix shots from different commits, pools or trails, or a failed run's gaps. */
async function check(rawDir, wanted) {
  const [play, start] = ['play', 'start'].map(mode => JSON.parse(readFileSync(path.join(rawDir, `${mode}.json`), 'utf8')));
  for (const field of SAME_ACROSS_MANIFESTS) {
    if (play[field] !== start[field]) throw new Error(`play and start differ in ${field}: ${play[field]} vs ${start[field]}`);
  }
  for (const { name, width, height } of wanted) {
    if (!play.shots[name] && !start.shots[name]) throw new Error(`${name} is in neither manifest: retake it`);
    const raw = await sharp(path.join(rawDir, `${name}.png`)).metadata();
    if (raw.width !== width || raw.height !== height) throw new Error(`${name}.png is ${raw.width}x${raw.height}, the record says ${width}x${height}`);
  }
}

export async function convert(rawDir) {
  const [{ SHOTS }, { OG_IMAGE }] = await Promise.all(['src/site/shots.ts', 'src/site/config.ts'].map(loadTs));
  const shots = Object.values(SHOTS).map(shot => ({ name: path.basename(shot.file, '.webp'), file: shot.file, width: shot.width, height: shot.height }));
  await check(rawDir, [...shots, { name: 'og', ...OG_IMAGE }]);

  for (const { name, file } of shots) {
    const out = path.join(root, 'src/site/shots', file);
    const info = await sharp(path.join(rawDir, `${name}.png`)).webp({ quality: 78, effort: 6 }).toFile(out);
    console.log(`${file} ${info.width}x${info.height} ${kb(out)} KB`);
  }
  const og = path.join(root, 'src/site/og.png');
  const info = await sharp(path.join(rawDir, 'og.png')).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(og);
  console.log(`og.png ${info.width}x${info.height} ${kb(og)} KB`);
}
