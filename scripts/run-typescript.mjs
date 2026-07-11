// Offline TypeScript script runner using the repo's existing esbuild dependency.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [entryArg, ...scriptArgs] = process.argv.slice(2);
if (!entryArg) {
  console.error('Usage: node scripts/run-typescript.mjs <entry.ts> [...args]');
  process.exit(1);
}

const entry = path.resolve(root, entryArg);
const scriptsRoot = `${path.join(root, 'scripts')}${path.sep}`;
if (!entry.startsWith(scriptsRoot) || !entry.endsWith('.ts')) {
  console.error('Entry must be a TypeScript file under scripts/.');
  process.exit(1);
}

const tempDir = mkdtempSync(path.join(os.tmpdir(), 'phaser-june-script-'));
const outfile = path.join(tempDir, 'script.cjs');

try {
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    define: { 'import.meta.url': JSON.stringify(pathToFileURL(entry).href) },
  });
  const result = spawnSync(process.execPath, [outfile, ...scriptArgs], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
