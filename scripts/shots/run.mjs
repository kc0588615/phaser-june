// Retake the website's screenshots: play (dev build, a seeded trail through window.__cc), start (production build,
// round-start shots), convert (raw PNGs -> src/site/shots/*.webp, src/site/og.png). Then check every shot by eye.
//   npm run site:shots              play, start, convert
//   npm run site:shots -- convert   any subset, same order
//   env: CHROME_PATH (cdp.mjs), SHOTS_PORT (3106), SHOTS_DIR (e2e-artifacts/shots-raw), SHOT_SEED (1), SHOT_PLACE (continent:africa)
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convert } from './convert.mjs';
import { take } from './take.mjs';

const STEPS = ['play', 'start', 'convert'];
const UP_TIMEOUT_MS = 180_000;
const DOWN_TIMEOUT_MS = 15_000;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.SHOTS_PORT ?? 3106);
const base = `http://localhost:${port}`;
const outDir = path.resolve(root, process.env.SHOTS_DIR ?? 'e2e-artifacts/shots-raw');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const asked = process.argv.slice(2);
const unknown = asked.filter(step => !STEPS.includes(step));
if (unknown.length) throw new Error(`unknown step ${unknown.join(', ')}: use ${STEPS.join(', ')}`);
const steps = asked.length ? STEPS.filter(step => asked.includes(step)) : STEPS;

const portBusy = () => new Promise(resolve => {
  const socket = net.connect(port, 'localhost');
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
});

/** The server runs in its own process group, as npx and next each spawn children. */
const killGroup = (server, signal) => {
  try { process.kill(-server.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
};

let running = null;
process.on('exit', () => { if (running) killGroup(running, 'SIGKILL'); });
// Deferred so cdp.mjs's later signal handler (kills Chrome, removes its profile) runs first.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => setImmediate(() => process.exit(130)));

async function waitUp(server, logName) {
  const deadline = Date.now() + UP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`next exited (${server.exitCode}): see ${path.join(outDir, logName)}`);
    const up = await fetch(`${base}/`, { signal: AbortSignal.timeout(deadline - Date.now()) }).then(response => response.ok, () => false);
    if (up) return;
    await sleep(1000);
  }
  throw new Error(`${base}/ not up in ${UP_TIMEOUT_MS / 1000} s: see ${path.join(outDir, logName)}`);
}

async function stop(server) {
  killGroup(server, 'SIGTERM');
  const deadline = Date.now() + DOWN_TIMEOUT_MS;
  while (await portBusy()) {
    if (Date.now() > deadline) { killGroup(server, 'SIGKILL'); break; }
    await sleep(250);
  }
  running = null;
}

/** `-H localhost`: next dev 16 bound to 127.0.0.1 fails its proxying. */
async function withServer(command, mode) {
  const logName = `next-${command}.log`;
  const log = openSync(path.join(outDir, logName), 'w');
  const server = spawn('npx', ['next', command, '-p', String(port), '-H', 'localhost'], { cwd: root, detached: true, stdio: ['ignore', log, log] });
  running = server;
  try {
    await waitUp(server, logName);
    await take({ mode, base, outDir });
  } finally {
    await stop(server);
  }
}

mkdirSync(outDir, { recursive: true });
if (steps.some(step => step !== 'convert') && await portBusy()) throw new Error(`port ${port} is busy: set SHOTS_PORT`);
for (const step of steps) {
  console.log(`== ${step}`);
  if (step === 'play') await withServer('dev', 'play');
  if (step === 'start') {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
    if (build.status !== 0) throw new Error(`npm run build failed (${build.status ?? build.signal})`);
    await withServer('start', 'start');
  }
  if (step === 'convert') await convert(outDir);
}
