// Checks that the live game draws its board (audit A5): /explore/ answers 200 even when the game's script fails,
// because explore.tsx loads AnimalGame with ssr: false. deploy/check.sh runs it last, after every deploy.
//   node scripts/check-live-board.mjs [url]   default https://play.critterconnect.org/explore/?seed=1
//   env: CHROME_PATH (scripts/cdp.mjs), BOARD_SHOT=<file.png> (a screenshot of the last attempt)
// Prints one line in check.sh's format, `OK   <url> board drawn (…)` (exit 0) or `BAD  <url> board drawn: …` (exit 1);
// bad arguments exit 2. Needs no node_modules: deploy runs it from a fresh worktree that has none.
//
// It passes once, within 30 s of the navigation, the board has held for 2 s on a phone-sized screen: a board canvas
// of at least 100x100 px, at least one animal row, no error alert, and no failing script or script error from the
// page's own host (other hosts, such as Clerk's, are ignored). Up to 3 attempts, 10 s apart, each in a new browser.
// It loads one page and plays nothing, so it writes nothing (the game sends no POST).
//
// Its contract with the game, so a mission that renames any of these changes this script too:
//   section[aria-label="Game board"], and [role="alert"] (the load error): src/components/animalBoard/AnimalGame.tsx
//   the canvas inside that section: src/components/clueGame/PhaserGame.tsx (Phaser)
//   tr[data-suspect], one row per animal in the round: src/components/animalBoard/EvidenceGrid.tsx
import { writeFileSync } from 'node:fs';
import { openPage, startBrowser } from './cdp.mjs';

const USAGE = 'usage: node scripts/check-live-board.mjs [url]';
const DEFAULT_URL = 'https://play.critterconnect.org/explore/?seed=1';
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }; // e2e-site.mjs's phone
const LIMIT_MS = 30_000;
const SETTLE_MS = 2_000;
const POLL_MS = 250;
const HARD_MS = 45_000;
const ATTEMPTS = 3;
const PAUSE_MS = 10_000;
const MIN_PX = 100;
const LIVE_NOTE = '; the deploy is live, only this check could not run';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** The URL to check, or null when the arguments are wrong. */
function parseUrl(args) {
  if (args.length > 1) return null;
  if (args.length === 0) return DEFAULT_URL;
  try {
    const url = new URL(args[0]);
    return url.protocol === 'http:' || url.protocol === 'https:' ? args[0] : null;
  } catch {
    return null;
  }
}

/** An attempt's failure: its message is the reason on the BAD line. */
class Failed extends Error {}
/** Chrome didn't start: no more attempts. */
class NoChrome extends Error {}

const pathOf = url => { const u = new URL(url); return u.pathname + u.search; };
const firstLine = text => String(text ?? '').split('\n')[0].slice(0, 200);

/** Runs on the page: what the check reads from the DOM. */
function readBoard() {
  const canvas = document.querySelector('section[aria-label="Game board"] canvas');
  const alert = [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent.trim()).filter(Boolean).join(' | ');
  return {
    canvas: Boolean(canvas),
    w: canvas?.clientWidth ?? 0,
    h: canvas?.clientHeight ?? 0,
    animals: document.querySelectorAll('tr[data-suspect]').length,
    alert,
  };
}

/** Why a board that never passed failed, from the last state read. */
function timeoutReason(last) {
  if (!last?.canvas) return 'no board canvas in 30 s';
  if (last.w < MIN_PX || last.h < MIN_PX) return `canvas ${last.w}x${last.h} under ${MIN_PX} px`;
  if (last.animals < 1) return 'no animals (tr[data-suspect]) in 30 s';
  return 'board drawn but not steady for 2 s';
}

/** The same-host event rules: returns the reason a CDP event fails the attempt, or null. */
function eventFailure({ method, params }, sameHost, requests) {
  if (method === 'Network.requestWillBeSent') {
    requests.set(params.requestId, { url: params.request.url, type: params.type });
  } else if (method === 'Network.responseReceived') {
    const { type, response } = params;
    if (type === 'Script' && sameHost(response.url) && response.status >= 400) return `script ${pathOf(response.url)} answered ${response.status}`;
  } else if (method === 'Network.loadingFailed') {
    const request = requests.get(params.requestId);
    if (!params.canceled && params.type === 'Script' && request && sameHost(request.url)) return `script ${pathOf(request.url)} failed: ${params.errorText}`;
  } else if (method === 'Runtime.exceptionThrown') {
    const details = params.exceptionDetails;
    const url = details.url || details.stackTrace?.callFrames?.find(frame => frame.url)?.url;
    if (url && sameHost(url)) return `script error: ${firstLine(details.exception?.description ?? details.text)}`;
  }
  return null;
}

/** Loads the page in `browser` and watches it until the board passes (returns the state) or fails (throws Failed). */
async function watch(browser, url, attempt) {
  const host = new URL(url).host;
  const sameHost = other => { try { return new URL(other).host === host; } catch { return false; } };
  const requests = new Map();
  const tab = await openPage(browser);
  browser.on(message => {
    if (message.sessionId !== tab.sessionId || attempt.failure) return;
    attempt.failure = eventFailure(message, sameHost, requests);
  });
  await tab.page('Page.enable');
  await tab.page('Runtime.enable');
  await tab.page('Network.enable');
  await tab.page('Emulation.setDeviceMetricsOverride', PHONE);

  let result;
  let error;
  try {
    const { errorText } = await tab.page('Page.navigate', { url });
    if (errorText) throw new Failed(`navigation failed: ${errorText}`);
    const deadline = Date.now() + LIMIT_MS;
    let last = null;
    let drawnSince = null;
    while (!result) {
      if (attempt.cancelled) return null;
      if (attempt.failure) throw new Failed(attempt.failure);
      if (Date.now() >= deadline) throw new Failed(timeoutReason(last));
      const state = await tab.evaluate(readBoard).catch(() => null); // throws while the page navigates: not yet
      if (attempt.failure) throw new Failed(attempt.failure);
      if (state) {
        if (state.alert) throw new Failed(`alert "${state.alert}"`);
        last = state;
        const drawn = state.canvas && state.w >= MIN_PX && state.h >= MIN_PX && state.animals >= 1;
        drawnSince = drawn ? (drawnSince ?? Date.now()) : null;
        if (drawn && Date.now() - drawnSince >= SETTLE_MS && Date.now() <= deadline) result = state;
      }
      if (!result) await sleep(POLL_MS);
    }
  } catch (caught) {
    error = caught;
  }
  if (process.env.BOARD_SHOT && !attempt.cancelled) {
    try {
      const { data } = await tab.page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(process.env.BOARD_SHOT, Buffer.from(data, 'base64'));
    } catch (shotError) {
      console.error(`warning: BOARD_SHOT ${process.env.BOARD_SHOT} not written: ${shotError.message}`);
    }
  }
  if (error) throw error;
  return result;
}

/** One attempt in a new browser: the board's state on a pass; throws Failed, or NoChrome when Chrome won't start. */
async function runAttempt(url) {
  let session;
  try {
    session = await startBrowser();
  } catch (error) {
    throw new NoChrome(`could not start Chrome (${error.message}; CHROME_PATH=${process.env.CHROME_PATH ?? 'unset'})`);
  }
  const attempt = { failure: null, cancelled: false };
  let timer;
  const hard = new Promise((_, reject) => {
    timer = setTimeout(() => { attempt.cancelled = true; reject(new Failed('Chrome stopped answering in 45 s')); }, HARD_MS);
  });
  try {
    return await Promise.race([watch(session.browser, url, attempt), hard]);
  } finally {
    clearTimeout(timer);
    attempt.cancelled = true;
    await session.close();
  }
}

/** Every attempt: the one stdout line and its exit code. */
async function check(url) {
  const start = Date.now();
  const reasons = [];
  for (let k = 1; k <= ATTEMPTS; k++) {
    try {
      const board = await runAttempt(url);
      const seconds = ((Date.now() - start) / 1000).toFixed(1);
      return { code: 0, line: `OK   ${url} board drawn (${board.w}x${board.h} canvas, ${board.animals} animals, attempt ${k}, ${seconds} s)` };
    } catch (error) {
      if (error instanceof NoChrome) {
        reasons.push(`attempt ${k}: ${error.message}${k === 1 ? LIVE_NOTE : ''}`);
        break;
      }
      reasons.push(`attempt ${k}: ${error instanceof Failed ? error.message : `unexpected error: ${firstLine(error.stack ?? error)}`}`);
    }
    if (k < ATTEMPTS) await sleep(PAUSE_MS);
  }
  return { code: 1, line: `BAD  ${url} board drawn: ${reasons.join('; ')}` };
}

const url = parseUrl(process.argv.slice(2));
if (!url) {
  console.error(USAGE);
  process.exit(2);
}
const { code, line } = await check(url).catch(error => ({ code: 1, line: `BAD  ${url} board drawn: unexpected error: ${firstLine(error.stack ?? error)}` }));
// cdp.mjs leaves a timer and signal handlers behind, so end the process once the line is out.
process.stdout.write(`${line}\n`, () => process.exit(code));
