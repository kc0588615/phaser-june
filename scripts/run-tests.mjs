// Offline test runner.
//
// This repo can't install test frameworks (network-restricted), so we lean on
// two things that are already here:
//   1. esbuild (a devDependency) bundles each `tests/**/*.test.ts` file into
//      plain JavaScript, resolving the `@/` path alias to `src/`.
//   2. Node's built-in test runner (`node --test`) executes the bundles.
//
// Usage: npm test          (all tests)
//        npm test -- --test-name-pattern="score"   (filter by name)
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'tests');
const outDir = path.join(root, '.test-dist');

const entryPoints = readdirSync(testsDir, { recursive: true })
  .map(String)
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => path.join(testsDir, file));

if (entryPoints.length === 0) {
  console.error('No *.test.ts files found under tests/');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });

await build({
  entryPoints,
  outdir: outDir,
  outbase: testsDir,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: 'inline',
  // package.json has no "type": "module", so emit .mjs to force ESM semantics.
  outExtension: { '.js': '.mjs' },
  alias: { '@': path.join(root, 'src') },
});

const bundles = readdirSync(outDir, { recursive: true })
  .map(String)
  .filter((file) => file.endsWith('.test.mjs'))
  .map((file) => path.join(outDir, file));

const result = spawnSync(
  process.execPath,
  ['--test', ...process.argv.slice(2), ...bundles],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
