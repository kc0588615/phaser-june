// `npm run e2e` on a dev server of its own: a free port and a separate output directory (NEXT_DIST_DIR,
// next.config.mjs), so it runs beside `npm run dev` and can't be hit by that server's HMR state or closing.
// Same env as scripts/e2e.mjs. Server log: .next-e2e/server.log.
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';

const DIR = '.next-e2e';
const LOG = `${DIR}/server.log`;
const UP_TIMEOUT_MS = 180_000;
const STOP_TIMEOUT_MS = 5_000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** A child in its own process group, so stopping it takes what it started too (next-server, Chrome). */
function startGroup(command, args, options) {
  const child = spawn(command, args, { ...options, detached: true });
  return { pid: child.pid, exited: new Promise(resolve => { child.once('exit', code => resolve(code ?? 1)); child.once('error', () => resolve(1)); }) };
}

/** Asks the group to stop, then makes sure. */
async function stopGroup({ pid, exited }) {
  const signal = name => { try { process.kill(-pid, name); } catch { /* already gone */ } };
  signal('SIGTERM');
  await Promise.race([exited, sleep(STOP_TIMEOUT_MS)]);
  signal('SIGKILL');
}

const port = await new Promise((resolve, reject) => {
  const probe = createServer().once('error', reject).listen(0, () => {
    const { port: free } = probe.address();
    probe.close(() => resolve(free));
  });
});
const base = `http://localhost:${port}`;

mkdirSync(DIR, { recursive: true });
const log = openSync(LOG, 'w');
const groups = [startGroup('node_modules/.bin/next', ['dev', '-p', String(port)], { env: { ...process.env, NEXT_DIST_DIR: DIR }, stdio: ['ignore', log, log] })];
const [server] = groups;
for (const name of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.once(name, async () => {
    await Promise.all(groups.map(stopGroup));
    process.exit(1);
  });
}

/** Resolves once the path answers 200 by the deadline; compiling a page on first request can take a while. */
async function warm(pathname, deadline) {
  while (Date.now() < deadline) {
    const answered = await fetch(`${base}${pathname}`, { signal: AbortSignal.timeout(deadline - Date.now()) }).then(response => response.ok, () => false);
    if (answered) return true;
    const gone = await Promise.race([server.exited.then(() => true), sleep(1000).then(() => false)]);
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
  const run = startGroup(process.execPath, ['scripts/e2e.mjs'], { env: { ...process.env, E2E_BASE_URL: base }, stdio: 'inherit' });
  groups.push(run);
  code = await run.exited;
} catch (error) {
  console.error(`e2e:fresh: ${error.message}`);
} finally {
  await stopGroup(server);
}
process.exit(code);
