// End-to-end play test. Headless Chrome plays the dev build like a player: the
// globe's place list, then Clue Match rounds for one place, driven through the
// real board (window.__cc, dev only). It checks the rules a player relies on
// after every move and writes a repeatable artifact:
//   e2e-artifacts/<run>/report.json   what was played, every check, errors
//   e2e-artifacts/<run>/*.png         what the player saw
// Same seed and place, same mysteries and boards.
//
//   npm run dev        (in another terminal)
//   npm run e2e        env: E2E_BASE_URL, E2E_SEED (7), E2E_ROUNDS (3), E2E_PLACE (a place key), CHROME_PATH
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = (process.env.E2E_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const SEED = Number(process.env.E2E_SEED ?? 7);
const ROUNDS = Number(process.env.E2E_ROUNDS ?? 3);
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const MAX_MOVES = 25;

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-seed${SEED}`;
const outDir = path.join(process.cwd(), 'e2e-artifacts', runId);
const report = { base: BASE, seed: SEED, place: null, viewport: '390x844 mobile touch', startedAt: new Date().toISOString(), rounds: [], checks: [], consoleErrors: [], failedRequests: [], screenshots: [] };
const check = (name, ok, detail = '') => { report.checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) }); if (!ok) console.log(`  FAIL ${name}${detail ? `: ${detail}` : ''}`); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** A minimal Chrome DevTools Protocol client over the browser's WebSocket. */
function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const waiting = message.id && pending.get(message.id);
    if (waiting) {
      pending.delete(message.id);
      if (message.error) waiting.reject(new Error(`${waiting.method}: ${message.error.message}`));
      else waiting.resolve(message.result);
    } else {
      for (const listener of listeners) listener(message);
    }
  };
  return {
    opened: new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error(`Could not connect to ${url}`)); }),
    send: (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    }),
    on: listener => listeners.push(listener),
    close: () => ws.close(),
  };
}

function launchChrome(profileDir) {
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, '--no-first-run', '--no-default-browser-check',
    '--enable-unsafe-swiftshader', '--mute-audio', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = new Promise((resolve, reject) => {
    let output = '';
    chrome.stderr.on('data', chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]);
    });
    chrome.on('error', reject);
    chrome.on('exit', code => reject(new Error(`Chrome exited early (code ${code})`)));
    setTimeout(() => reject(new Error('Chrome did not start in 20 s')), 20_000);
  });
  return { chrome, endpoint };
}

async function main() {
  try {
    const response = await fetch(`${BASE}/api/places/`);
    if (!response.ok) throw new Error(`status ${response.status}`);
  } catch (error) {
    throw new Error(`The dev server isn't answering at ${BASE} (${error.message}). Start it with \`npm run dev\`.`);
  }
  mkdirSync(outDir, { recursive: true });
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'cc-e2e-'));
  const { chrome, endpoint } = launchChrome(profileDir);
  let browser;
  try {
    browser = connect(await endpoint);
    await browser.opened;
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => browser.send(method, params, sessionId);

    browser.on(message => {
      if (message.sessionId !== sessionId) return;
      const { method, params } = message;
      if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
        report.consoleErrors.push(params.args.map(arg => arg.value ?? arg.description ?? '').join(' ').slice(0, 300));
      } else if (method === 'Runtime.exceptionThrown') {
        report.consoleErrors.push((params.exceptionDetails.exception?.description ?? params.exceptionDetails.text).slice(0, 300));
      } else if (method === 'Network.responseReceived' && params.response.url.startsWith(BASE) && params.response.status >= 400) {
        report.failedRequests.push(`${params.response.status} ${params.response.url}`);
      } else if (method === 'Network.loadingFailed' && !params.canceled) {
        report.failedRequests.push(`${params.errorText} (${params.type})`);
      }
    });
    await page('Page.enable');
    await page('Runtime.enable');
    await page('Network.enable');
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await page('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    // A returning player: skip the how-to-play dialog.
    await page('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('clue-match:how-to-play-seen:v1', '1'); } catch {}" });

    const evaluate = async (fn, ...args) => {
      const { result, exceptionDetails } = await page('Runtime.evaluate', { expression: `(${fn})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    };
    const waitFor = async (fn, what, timeoutMs = 30_000, ...args) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const value = await evaluate(fn, ...args).catch(() => null);
        if (value) return value;
        await sleep(250);
      }
      throw new Error(`Timed out waiting for ${what}`);
    };
    const goto = async url => {
      await page('Page.navigate', { url });
      await waitFor(() => document.readyState === 'complete', `${url} to load`);
    };
    const screenshot = async name => {
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
      report.screenshots.push(name);
    };

    // 1. Globe: the place list loads; pick the place to play.
    await goto(`${BASE}/`);
    const { places } = await evaluate(async () => (await fetch('/api/places/')).json());
    const place = process.env.E2E_PLACE
      ? places.find(candidate => candidate.key === process.env.E2E_PLACE)
      : [...places].filter(candidate => candidate.kind === 'country').sort((a, b) => b.speciesIds.length - a.speciesIds.length || a.key.localeCompare(b.key))[0];
    if (!place) throw new Error(`No place ${process.env.E2E_PLACE ?? 'with animals'}`);
    report.place = { key: place.key, name: place.name, animals: place.speciesIds.length };
    const listed = await waitFor(() => document.querySelector('[aria-label="Kind of place"]') && document.querySelectorAll('ul button, ol button').length, 'the place list', 30_000).catch(() => 0);
    check('the globe lists places', listed > 3, `${listed} rows shown, ${places.length} places from /api/places`);
    await sleep(1500);
    await screenshot('01-globe.png');

    // 2. Clue Match for that place.
    await goto(`${BASE}/clue-match/?seed=${SEED}&place=${encodeURIComponent(place.key)}`);
    await waitFor(() => window.__cc?.clue?.() && window.__cc.state().ready, 'the Clue Match session (window.__cc; is this a dev build?)', 60_000);
    await evaluate(() => window.__cc.speed(4));
    await screenshot('02-first-round.png');

    for (let n = 1; n <= ROUNDS; n++) {
      const start = await evaluate(() => window.__cc.clue());
      const mysteryName = await evaluate(async id => (await (await fetch('/api/clue-game/pool/')).json()).species.find(s => s.id === id)?.commonName, start.mysteryId);
      check(`round ${n}: the mystery lives in ${place.name}`, place.speciesIds.includes(start.mysteryId), `mystery ${start.mysteryId}`);
      let state = start;
      let moves = 0;
      while (state.phase === 'playing' && state.live.length > 1 && moves < MAX_MOVES) {
        const before = state;
        const result = await evaluate(async () => {
          const cc = window.__cc;
          const [move] = cc.validMoves().sort((a, b) => b.largest - a.largest || b.matches - a.matches || a.rowOrCol.localeCompare(b.rowOrCol) || a.index - b.index || a.amount - b.amount);
          if (!move) return null;
          const drag = await cc.drag(move, { input: 'touch', timeoutMs: 20_000 });
          return { counted: drag.counted, timedOut: drag.timedOut, clue: cc.clue() };
        });
        if (!result) break;
        moves++;
        state = result.clue;
        check(`round ${n} move ${moves}: settles`, !result.timedOut);
        if (result.counted) check(`round ${n} move ${moves}: counts once`, state.moves === before.moves + 1, `${before.moves} -> ${state.moves}`);
        check(`round ${n} move ${moves}: the answer is never ruled out`, !state.ruledOut.includes(state.mysteryId));
      }
      // Guess the live candidate with the most matching clues, as a careful player would.
      const guessResult = await evaluate(async () => {
        const buttons = [...document.querySelectorAll('[aria-label="Possible animals"] button')];
        const clue = window.__cc.clue();
        const ranked = buttons.map((button, index) => ({ button, id: clue.candidateIds[index], matches: Number(button.getAttribute('aria-label').match(/(\d+) of/)?.[1] ?? 0) }))
          .filter(({ button }) => !button.disabled).sort((a, b) => b.matches - a.matches);
        const guesses = [];
        for (const { button, id } of ranked) {
          button.click();
          await new Promise(resolve => setTimeout(resolve, 150));
          [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('Guess'))?.click();
          await new Promise(resolve => setTimeout(resolve, 600));
          guesses.push(id);
          if (window.__cc.clue().phase === 'solved') break;
        }
        return { guesses, clue: window.__cc.clue(), noScroll: document.documentElement.scrollHeight <= innerHeight + 1 };
      });
      check(`round ${n}: solved`, guessResult.clue.phase === 'solved', `guesses ${guessResult.guesses.join(', ')}`);
      check(`round ${n}: no page scroll`, guessResult.noScroll);
      const reveal = await waitFor(() => {
        const sheet = document.querySelector('section[aria-label^="It was the"]');
        if (!sheet) return null;
        const photo = sheet.querySelector('img');
        return { name: sheet.getAttribute('aria-label').replace('It was the ', ''), photo: photo ? photo.complete && photo.naturalWidth > 0 : 'no photo', redList: Boolean([...sheet.querySelectorAll('a')].find(a => a.textContent.includes('Red List'))), fact: sheet.innerText.includes('Did you know?') };
      }, 'the reveal card', 10_000);
      await sleep(800);
      check(`round ${n}: the reveal names the mystery`, reveal.name === mysteryName, reveal.name);
      check(`round ${n}: the reveal photo loads`, reveal.photo !== false, String(reveal.photo));
      check(`round ${n}: the reveal links the Red List`, reveal.redList);
      await screenshot(`03-round-${n}-reveal.png`);
      report.rounds.push({
        round: start.round, mysteryId: start.mysteryId, mystery: mysteryName, candidates: start.candidateIds,
        moves: guessResult.clue.moves, liveAtGuess: state.live.length, wrongGuesses: guessResult.guesses.length - 1,
        score: guessResult.clue.score, revealedByGem: guessResult.clue.revealedByGem, factShown: reveal.fact,
      });
      console.log(`  round ${n}: ${mysteryName} in ${guessResult.clue.moves} moves, ${guessResult.guesses.length - 1} wrong`);
      if (n < ROUNDS) {
        await evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Next animal')?.click());
        await waitFor(round => window.__cc.clue().round === round && window.__cc.clue().phase === 'playing', 'the next round', 15_000, n + 1);
      }
    }

    // 3. The Field Journal lists what was found.
    const journal = await evaluate(async () => {
      document.querySelector('button[aria-label="Field journal"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 1200));
      return document.querySelector('[role=dialog] #journal-title')?.nextElementSibling?.textContent ?? '';
    });
    const found = new Set(report.rounds.map(round => round.mysteryId)).size;
    check('the journal counts the animals found', journal.startsWith(`${found} of`), journal);
    await screenshot('04-journal.png');

    check('no console errors', report.consoleErrors.length === 0, report.consoleErrors.slice(0, 3).join(' | '));
    check('no failed requests', report.failedRequests.length === 0, report.failedRequests.slice(0, 3).join(' | '));
  } finally {
    browser?.close();
    chrome.kill();
    await sleep(300);
    rmSync(profileDir, { recursive: true, force: true });
  }
}

main()
  .catch(error => {
    report.error = error.message;
    check('run completed', false, error.message);
  })
  .finally(() => {
    report.finishedAt = new Date().toISOString();
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    const failed = report.checks.filter(result => !result.ok);
    console.log(`${report.checks.length - failed.length}/${report.checks.length} checks passed. Artifact: ${path.relative(process.cwd(), outDir)}/`);
    process.exitCode = failed.length ? 1 : 0;
  });
