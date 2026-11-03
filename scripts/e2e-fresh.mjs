// `npm run e2e` on a dev server of its own: a free port and a separate output directory (NEXT_DIST_DIR,
// next.config.mjs), so it runs beside `npm run dev` and can't be hit by that server's HMR state or closing.
// Same env as scripts/e2e.mjs. Server log: .next-e2e/server.log.
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';

const DIR = '.next-e2e';
const LOG = `${DIR}/server.log`;
const UP_TIMEOUT_MS = 180_000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const port = await new Promise((resolve, reject) => {
  const probe = createServer().once('error', reject).listen(0, () => {
    const { port: free } = probe.address();
    probe.close(() => resolve(free));
  });
});
const base = `http://localhost:${port}`;

mkdirSync(DIR, { recursive: true });
const log = openSync(LOG, 'w');
// Its own process group, so stopping it takes next-server too.
const server = spawn('node_modules/.bin/next', ['dev', '-p', String(port)], { env: { ...process.env, NEXT_DIST_DIR: DIR }, stdio: ['ignore', log, log], detached: true });
const exited = new Promise(resolve => server.once('exit', resolve));
const stop = () => { try { process.kill(-server.pid); } catch { /* already gone */ } };
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stop(); process.exit(1); });

/** Resolves once the path answers 200; compiling a page on first request can take a while. */
async function warm(pathname, deadline) {
  while (Date.now() < deadline) {
    const answered = await fetch(`${base}${pathname}`).then(response => response.ok, () => false);
    if (answered) return true;
    const gone = await Promise.race([exited.then(() => true), sleep(1000).then(() => false)]);
    if (gone) return false;
  }
  return false;
}

let code = 1;
try {
  const deadline = Date.now() + UP_TIMEOUT_MS;
  for (const pathname of ['/api/places/', '/', '/explore/', '/api/clue-game/pool/']) {
    if (!await warm(pathname, deadline)) throw new Error(`the dev server never answered ${pathname}. ${LOG} ends:\n${readFileSync(LOG, 'utf8').slice(-1500)}`);
  }
  const run = spawn(process.execPath, ['scripts/e2e.mjs'], { env: { ...process.env, E2E_BASE_URL: base }, stdio: 'inherit' });
  code = await new Promise(resolve => run.once('exit', exitCode => resolve(exitCode ?? 1)));
} catch (error) {
  console.error(`e2e:fresh: ${error.message}`);
} finally {
  stop();
}
process.exit(code);
