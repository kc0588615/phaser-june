// End-to-end play test. Headless Chrome plays the dev build like a player: the
// globe's continent list, then rounds of the animal board (plan 044) for one
// continent at /explore, driven through the real board (window.__cc, dev only) and
// the real cards and buttons. It checks the rules a player relies on after every
// move and writes a repeatable artifact:
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
const MAX_MOVES = 45;

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
    await page('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('critter-connect:animal-board-how-to:v1', '1'); } catch {}" });

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
    // The gem legend as shown: each tile's category, question tag and visible text (after React has painted).
    const readLegend = () => evaluate(async () => {
      await new Promise(resolve => setTimeout(resolve, 80));
      return [...document.querySelectorAll('[aria-label="Gem questions"] li[data-category]')]
        .map(li => ({ category: li.dataset.category, tag: li.dataset.tag || null, text: li.innerText.replace(/\s+/g, ' ').trim() }));
    });
    const legendMismatch = (shown, legend) => legend.filter(row => {
      const tile = shown.find(candidate => candidate.category === row.category);
      return !tile || tile.tag !== row.tag || (row.text && !tile.text.includes(row.text));
    }).map(row => ({ want: row, shown: shown.find(candidate => candidate.category === row.category) ?? null }));
    const screenshot = async name => {
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
      report.screenshots.push(name);
    };

    // 1. Globe: the continent list loads; pick the continent to play (the one with the most animals).
    await goto(`${BASE}/`);
    const { places } = await evaluate(async () => (await fetch('/api/places/')).json());
    const continents = places.filter(candidate => candidate.kind === 'continent');
    const place = process.env.E2E_PLACE
      ? places.find(candidate => candidate.key === process.env.E2E_PLACE)
      : [...continents].sort((a, b) => b.speciesIds.length - a.speciesIds.length || a.key.localeCompare(b.key))[0];
    if (!place) throw new Error(`No place ${process.env.E2E_PLACE ?? 'with animals'}`);
    report.place = { key: place.key, name: place.name, animals: place.speciesIds.length };
    const listed = await waitFor(() => document.querySelectorAll('ul button').length, 'the continent list', 30_000).catch(() => 0);
    check('the globe lists the continents', listed === continents.length, `${listed} rows shown, ${continents.length} continents from /api/places`);
    await sleep(1500);
    await screenshot('01-globe.png');

    // 2. The animal board for that continent (plan 044).
    await goto(`${BASE}/explore/?seed=${SEED}&place=${encodeURIComponent(place.key)}`);
    await waitFor(() => window.__cc?.clue?.() && window.__cc.state().ready && window.__cc.state().pins.length === 5, 'the animal board (window.__cc; is this a dev build?)', 60_000);
    await evaluate(() => window.__cc.speed(4));
    await sleep(2500); // the animal photos load
    await screenshot('02-board.png');
    const names = new Map((await evaluate(async () => (await (await fetch('/api/clue-game/pool/')).json()).species.map(s => [s.id, s.commonName]))));
    const sound = await evaluate(async () => {
      const button = document.querySelector('button[aria-label^="Sound"]');
      if (!button) return null;
      const before = button.getAttribute('aria-pressed');
      button.click();
      await new Promise(resolve => setTimeout(resolve, 100));
      const after = document.querySelector('button[aria-label^="Sound"]').getAttribute('aria-pressed');
      document.querySelector('button[aria-label^="Sound"]').click();
      return { before, after };
    });
    check('sound starts off and its button turns it on', sound?.before === 'false' && sound?.after === 'true', JSON.stringify(sound));

    const journalFinds = new Set();
    let previewChecked = false;
    let notesChecked = false;
    let markShot = false;
    for (let n = 1; n <= ROUNDS; n++) {
      const start = await evaluate(() => window.__cc.clue());
      const pins = await evaluate(() => window.__cc.state().pins);
      const mysteryName = names.get(start.mysteryId);
      check(`round ${n}: 5 suspects, the mystery among them, each pinned on the board`, start.suspects.length === 5 && start.suspects.includes(start.mysteryId)
        && start.suspects.every(id => pins.some(([, pin]) => pin === id)), JSON.stringify(pins));
      check(`round ${n}: starts with the rules' moves`, start.movesLeft === start.moves && start.status === 'playing', `${start.movesLeft} of ${start.moves}, ${start.status}`);
      const corner = ([x, y]) => (x === 0 || x === 6) && (y === 0 || y === 6);
      check(`round ${n}: tiles at least 3 apart and never in a corner`, pins.every(([a]) => !corner(a) && pins.every(([b]) => a === b || Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) >= 3)));
      const screen = await evaluate(() => ({
        cards: document.querySelectorAll('[aria-label="Suspects"] li').length,
        orders: [...document.querySelectorAll('[aria-label="Clue orders"] li')].map(li => li.dataset.tag),
      }));
      check(`round ${n}: 5 suspect cards and the 4 clue orders on screen`, screen.cards === 5 && screen.orders.join() === start.orders.map(order => order.tag).join(), JSON.stringify(screen));
      const trailBefore = start.trail;
      // Round 2 rules out the mystery (an escape); round 3 rules out nothing (out of moves, then a name); others play carefully.
      const mode = n === 2 ? 'reckless' : n === 3 ? 'idle' : 'careful';
      let state = start;
      let moves = 0;
      while (state.status === 'playing' && moves < MAX_MOVES) {
        // Rule out, through the real card and its field guide: careful, every suspect the answers and notes so far rule
        // out; reckless, the mystery itself; idle, nobody.
        const toMark = mode === 'careful' ? state.suspects.filter(id => !state.possible.includes(id))
          : mode === 'reckless' ? [state.mysteryId] : [];
        for (const id of toMark.filter(id => !state.marked.includes(id) && !state.released.includes(id))) {
          const marked = await evaluate(async id => {
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
            document.querySelector(`[data-suspect="${id}"] button`)?.click();
            await wait(250);
            const button = [...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent === 'Rule out');
            button?.click();
            await wait(200);
            return window.__cc.clue().marked.includes(id);
          }, id);
          check(`round ${n}: Rule out in the field guide marks the ${names.get(id)}`, marked);
          if (mode === 'reckless') check(`round ${n}: ruling out the mystery doesn't release it by itself`, (await evaluate(() => window.__cc.clue())).status === 'playing');
          if (marked && !markShot) { markShot = true; await sleep(400); await screenshot('02b-marked.png'); }
        }
        state = await evaluate(() => window.__cc.clue());
        // Once a run: tap a gem whose swap would release a marked animal, and see the preview outline it.
        if (!previewChecked) {
          const preview = await evaluate(async () => {
            const cc = window.__cc;
            const clue = cc.clue();
            const live = clue.marked.filter(id => !clue.released.includes(id));
            const move = cc.validMoves().find(candidate => cc.touchedBy(candidate).some(id => live.includes(id)));
            if (!move) return null;
            await cc.tap(move.from, { input: 'touch' });
            const shown = cc.state().preview;
            await cc.tap(move.from, { input: 'touch' }); // tap again: drop it
            return { shown, expected: cc.touchedBy(move).filter(id => live.includes(id)), after: cc.state().preview };
          });
          if (preview) {
            previewChecked = true;
            check(`round ${n}: tapping a gem outlines the marked animals its swap would release`, preview.expected.every(id => preview.shown.includes(id)) && preview.after.length === 0, JSON.stringify(preview));
          }
        }
        const before = state;
        const result = await evaluate(async () => {
          const cc = window.__cc;
          const clue = cc.clue();
          const live = new Set(clue.marked.filter(id => !clue.released.includes(id)));
          const useful = new Set(clue.orders.filter(order => !order.answer).map(order => order.gem));
          // (Reckless aims at its marked animal, the mystery, the same way: a clear next to it.)
          const value = move => 10 * cc.touchedBy(move).filter(id => live.has(id)).length + (move.colors.some(color => useful.has(color)) ? 3 : 0) + move.largest;
          const moves = cc.validMoves();
          if (moves.length === 0) return null;
          const move = moves.reduce((best, candidate) => (value(candidate) > value(best) ? candidate : best));
          const drag = await cc.drag(move, { input: 'touch', timeoutMs: 30_000 });
          await new Promise(resolve => setTimeout(resolve, 150));
          const { pins, view } = cc.state();
          const orders = [...document.querySelectorAll('[aria-label="Clue orders"] li')].map(li => ({ tag: li.dataset.tag, label: li.getAttribute('aria-label') }));
          return { counted: drag.counted, timedOut: drag.timedOut, pins, view, orders, clue: cc.clue() };
        });
        if (!result) break;
        moves++;
        state = result.clue;
        check(`round ${n} move ${moves}: settles`, !result.timedOut);
        if (result.counted) check(`round ${n} move ${moves}: uses exactly one move`, state.movesLeft === before.movesLeft - 1, `${before.movesLeft} -> ${state.movesLeft}`);
        check(`round ${n} move ${moves}: only ruled-out animals leave the board`, state.released.every(id => state.marked.includes(id)), JSON.stringify({ released: state.released, marked: state.marked }));
        check(`round ${n} move ${moves}: the mystery leaves only by escaping, which loses the round`,
          !state.released.includes(state.mysteryId) || (state.status === 'lost' && state.lostBy === 'escaped'));
        // After an escape the board may release more marked animals in the move's last cascades; the round is over by then.
        const left = 5 - state.released.length;
        check(`round ${n} move ${moves}: tiles never move; released ones are gone`, result.pins.every(([cell, id]) => pins.some(([c, i]) => i === id && c[0] === cell[0] && c[1] === cell[1]))
          && (state.status === 'lost' ? result.pins.length <= left : result.pins.length === left), JSON.stringify({ pins: result.pins, released: state.released }));
        check(`round ${n} move ${moves}: the view shows a tile exactly on each pinned cell`, result.view.every((column, x) => column.every((key, y) => (key === 'tile') === result.pins.some(([[px, py]]) => px === x && py === y))));
        check(`round ${n} move ${moves}: the clue orders on screen match the rules`, state.orders.every(order => {
          const tile = result.orders.find(candidate => candidate.tag === order.tag);
          return tile && (order.answer ? tile.label.includes(`Answer: ${order.answer}`) : tile.label.includes(`${order.have} of`));
        }), JSON.stringify(result.orders));
        if (!notesChecked && state.notes > 0) {
          notesChecked = true;
          const notes = await evaluate(async () => {
            document.querySelector('button[aria-label^="Witness notes"]')?.click();
            await new Promise(resolve => setTimeout(resolve, 250));
            const text = document.querySelector('[role=dialog]')?.innerText ?? '';
            [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent === 'Close')?.click();
            return text;
          });
          check(`round ${n}: a witness note says how many of the 5 field guides agree`, /of the 5/.test(notes), notes.slice(0, 120));
          await screenshot('02c-notes.png');
        }
      }
      // Out of moves: the round is lost; naming one only fills the journal.
      if (state.status === 'out-of-moves') {
        await screenshot(`03-round-${n}-out-of-moves.png`);
        const pickName = names.get(mode === 'idle' ? state.mysteryId : state.possible[0]);
        const named = await evaluate(async pickName => {
          const sheet = document.querySelector('[aria-label="Out of moves"]');
          const buttons = [...(sheet?.querySelectorAll('button') ?? [])];
          (buttons.find(b => b.textContent === pickName) ?? buttons[0])?.click();
          await new Promise(resolve => setTimeout(resolve, 300));
          return { sheet: Boolean(sheet), clue: window.__cc.clue() };
        }, pickName);
        check(`round ${n}: out of moves, the name sheet shows`, named.sheet);
        state = named.clue;
        check(`round ${n}: out of moves loses the round, even named right`, state.status === 'lost' && state.lostBy === 'out-of-moves', `${state.status} ${state.lostBy}`);
      }
      const end = state.end;
      check(`round ${n}: the round ends`, Boolean(end), state.status);
      if (mode === 'reckless') check(`round ${n}: releasing the ruled-out mystery loses the round (it escapes)`, state.status === 'lost' && state.lostBy === 'escaped', `${state.status} ${state.lostBy}`);
      if (mode === 'idle') check(`round ${n}: with nobody ruled out, nothing leaves and the moves run out`, state.released.length === 0 && state.lostBy === 'out-of-moves', JSON.stringify({ released: state.released, lostBy: state.lostBy }));
      check(`round ${n}: the trail moves on: a find, or one heart less`, end?.outcome === 'found'
        ? state.trail.finds === trailBefore.finds + 1 && state.trail.hearts === trailBefore.hearts
        : state.trail.hearts === trailBefore.hearts - 1, JSON.stringify({ before: trailBefore, after: state.trail }));
      const namedRight = state.logTail.some(entry => entry.kind === 'named' && entry.correct);
      if (end?.outcome === 'found' || namedRight) journalFinds.add(start.mysteryId);
      const reveal = await waitFor(() => {
        const sheet = document.querySelector('section[aria-label^="It was the"]');
        return sheet ? { name: sheet.getAttribute('aria-label').replace('It was the ', ''), text: sheet.innerText } : null;
      }, 'the round-end card', 10_000);
      check(`round ${n}: the round-end card names the mystery`, reveal.name === mysteryName, reveal.name);
      check(`round ${n}: the round-end card shows the family tree`, reveal.text.includes('Animalia › Chordata'));
      await screenshot(`04-round-${n}-end.png`);
      report.rounds.push({
        round: start.roundNo, mysteryId: start.mysteryId, mystery: mysteryName, suspects: start.suspects.map(id => names.get(id)),
        outcome: end?.outcome, lostBy: state.lostBy, stars: end?.stars, points: end?.points, movesUsed: state.movesUsed,
        answers: state.orders.filter(order => order.answer).length, notes: state.notes, marked: state.marked.length, released: state.released.length,
        trail: state.trail, score: state.score,
      });
      console.log(`  round ${n}: ${mysteryName} ${end?.outcome ?? '?'}${state.lostBy ? ` (${state.lostBy})` : ''}, ${state.movesUsed} moves, ${state.orders.filter(order => order.answer).length} answers, ${state.notes} notes, +${end?.points ?? 0}`);
      if (n < ROUNDS) {
        await evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Next animal' || b.textContent.trim() === 'New trail')?.click());
        await waitFor(round => window.__cc.clue().roundNo === round && window.__cc.clue().status === 'playing' && window.__cc.state().ready && window.__cc.state().pins.length === 5, 'the next round', 20_000, n + 1);
        await sleep(800);
      }
    }
    check('the release preview was checked at least once', previewChecked);

    // 3. The Field Journal lists the finds (and right names at the end of moves).
    const journal = await evaluate(async () => {
      document.querySelector('button[aria-label="Field journal"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 1200));
      return document.querySelector('[role=dialog] #journal-title')?.nextElementSibling?.textContent ?? '';
    });
    check('the journal counts the animals found (and named right when moves ran out)', journal.startsWith(`${journalFinds.size} of`), `${journal} (expected ${journalFinds.size})`);
    await screenshot('05-journal.png');

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
