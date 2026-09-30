// PROTOTYPE (plan 041), throwaway. Builds src/clueGame/PROTOTYPE-041-question-match.html
// so it opens by double-click: the real rules (src/clueGame/questionMatch.ts) and
// board (src/game/BoardModel.ts), bundled, plus every animal's data.
//   node scripts/run-typescript.mjs scripts/prototype-041-question-match.ts
import { createRequire } from 'node:module';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AnimalProfile, ContentSource } from '../src/clueGame/profiles';
import { animalsFromProfiles } from '../src/clueGame/questionMatchContent';

const root = process.cwd();
const HTML = path.join(root, 'src/clueGame/PROTOTYPE-041-question-match.html');

async function main() {
  const dir = path.join(root, 'db/content');
  const files = (await readdir(path.join(dir, 'animals'))).filter(file => file.endsWith('.json')).sort();
  const profiles = await Promise.all(files.map(async file => JSON.parse(await readFile(path.join(dir, 'animals', file), 'utf8')) as AnimalProfile));
  const registry = JSON.parse(await readFile(path.join(dir, 'sources.json'), 'utf8')) as ContentSource[];
  const animals = animalsFromProfiles(profiles, registry, text => console.warn(`warning: ${text}`));

  // esbuild at run time (not bundled into this script): the rules and board as one browser global, QM.
  const { build } = createRequire(import.meta.url)('esbuild') as typeof import('esbuild');
  const bundle = await build({
    stdin: {
      contents: [
        "export * from '@/clueGame/questionMatch';",
        "export { BoardModel, neighborSwaps } from '@/game/BoardModel';",
        "export { CONTINENT_NAMES, REGIONS } from '@/clueGame/regions';",
        "export { mulberry32 } from '@/lib/seededRng';",
      ].join('\n'),
      resolveDir: root, loader: 'ts',
    },
    bundle: true, format: 'iife', globalName: 'QM', target: 'es2020', write: false, tsconfig: path.join(root, 'tsconfig.json'),
  });
  const rules = bundle.outputFiles[0].text;

  const html = await readFile(HTML, 'utf8');
  const next = html
    .replace(/\/\*DATA\*\/[\s\S]*?\/\*END DATA\*\//, () => `/*DATA*/${JSON.stringify(animals)}/*END DATA*/`)
    .replace(/\/\*RULES\*\/[\s\S]*?\/\*END RULES\*\//, () => `/*RULES*/\n${rules}/*END RULES*/`);
  if (!next.includes('/*END DATA*/') || !next.includes('/*END RULES*/')) throw new Error('DATA or RULES marker not found');
  await writeFile(HTML, next);
  const safe = animals.map(a => a.notes.length);
  console.log(`${animals.length} animals (field notes safe during a round: min ${Math.min(...safe)}, fewer than 3 for ${safe.filter(n => n < 3).length}) -> ${path.relative(root, HTML)}`);
}

main().catch(error => { console.error(error); process.exit(1); });
