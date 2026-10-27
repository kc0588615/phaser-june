// End-to-end play test. Headless Chrome plays the dev build like a player: the
// globe's continent list, then rounds of the animal board (plans 044 and 045) for one
// continent at /explore, driven through the real board (window.__cc, dev only) and
// the real evidence grid and buttons. It checks the rules a player relies on after every
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
  const [load] = os.loadavg();
  if (load > os.cpus().length) console.log(`WARN load ${load.toFixed(0)} on ${os.cpus().length} cores: expect timeouts. Look for stray Chrome (ps -eo pcpu,args --sort=-pcpu | head)`);
  mkdirSync(outDir, { recursive: true });
  const profileDir = mkdtempSync(path.join(os.tmpdir(), 'cc-e2e-'));
  const { chrome, endpoint } = launchChrome(profileDir);
  // A killed run (timeout, Ctrl-C) would otherwise orphan Chrome and slow every later run.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => {
      chrome.kill('SIGKILL');
      rmSync(profileDir, { recursive: true, force: true });
      process.exit(130);
    });
  }
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
    await page('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('critter-connect:animal-board-how-to:v3', '1'); localStorage.setItem('critter-connect:slide-hint:v1', '1'); } catch {}" });
    // Plan 045: an animal's name in the grid takes a drag of its photo (rule out / back in) and a long press (its field guide).
    await page('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__pill = id => document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + id + '"] button[data-pill]');
      window.__slidePill = async (id, distance, from = 10) => {
        const pill = window.__pill(id);
        const r = pill.getBoundingClientRect();
        const y = r.top + r.height / 2;
        const at = (type, x) => pill.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }));
        at('pointerdown', r.left + from);
        for (let x = 10; x <= distance; x += 10) { at('pointermove', r.left + from + x); await new Promise(res => setTimeout(res, 16)); }
        at('pointerup', r.left + from + distance);
        pill.click();
        await new Promise(res => setTimeout(res, 250));
      };
      window.__holdPill = async id => {
        const pill = window.__pill(id);
        const r = pill.getBoundingClientRect();
        const opts = { bubbles: true, clientX: r.left + 20, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
        pill.dispatchEvent(new PointerEvent('pointerdown', opts));
        await new Promise(res => setTimeout(res, 650));
        pill.dispatchEvent(new PointerEvent('pointerup', opts));
        pill.click();
        await new Promise(res => setTimeout(res, 400));
      };
    ` });

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
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      document.querySelector('button[aria-label="Menu"]')?.click();
      await wait(250);
      const soundSwitch = () => [...document.querySelectorAll('[role=switch]')].find(b => b.textContent === 'Sound');
      if (!soundSwitch()) return null;
      const before = soundSwitch().getAttribute('aria-checked');
      soundSwitch().click();
      await wait(100);
      const after = soundSwitch().getAttribute('aria-checked');
      soundSwitch().click();
      await wait(100);
      [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
      await wait(250);
      return { before, after, closed: !document.querySelector('[role=dialog]') };
    });
    check('sound starts off and its button in the menu turns it on', sound?.before === 'false' && sound?.after === 'true' && sound?.closed, JSON.stringify(sound));
    // The evidence grid and the board fit a small phone (iPhone SE in Safari is 375x548): the board keeps at least 210 px.
    const fit = await evaluate(() => {
      const grid = document.querySelector('table[aria-label="Evidence"]')?.getBoundingClientRect();
      const board = document.querySelector('section[aria-label="Game board"]')?.getBoundingClientRect();
      return grid && board ? { viewport: [innerWidth, innerHeight], grid: Math.round(grid.height), board: [Math.round(board.width), Math.round(board.height)] } : null;
    });
    check('the evidence grid leaves the board most of the screen', Boolean(fit) && Math.min(...fit.board) >= Math.min(fit.viewport[0] - 8, fit.viewport[1] - 340), JSON.stringify(fit));
    // The same on an iPhone SE in Safari (375x548), then back.
    await page('Emulation.setDeviceMetricsOverride', { width: 375, height: 548, deviceScaleFactor: 2, mobile: true });
    await sleep(800);
    const small = await evaluate(() => {
      const grid = document.querySelector('table[aria-label="Evidence"]')?.getBoundingClientRect();
      const board = document.querySelector('section[aria-label="Game board"]')?.getBoundingClientRect();
      return grid && board ? { viewport: [innerWidth, innerHeight], grid: Math.round(grid.height), board: [Math.round(board.width), Math.round(board.height)] } : null;
    });
    await screenshot('02-board-375x548.png');
    check('on a 375x548 phone the board keeps at least 210 px', Boolean(small) && Math.min(...small.board) >= 210, JSON.stringify(small));
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(800);
    report.layout = { phone: fit, small };

    const journalFinds = new Set();
    let previewChecked = false;
    let scoutChecked = false;
    let hintChecked = false;
    let notesChecked = false;
    let markShot = false;
    let calledShot = false;
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
        rows: [...document.querySelectorAll('table[aria-label="Evidence"] tr[data-suspect]')].map(row => Number(row.dataset.suspect)),
        columns: [...document.querySelectorAll('table[aria-label="Evidence"] th[data-tag]')].map(th => th.dataset.tag),
        mystery: document.querySelector('table[aria-label="Evidence"] tr[data-mystery] th')?.textContent ?? '',
      }));
      check(`round ${n}: the evidence grid has a row per suspect and a column per clue`, screen.rows.join() === start.suspects.join() && screen.columns.join() === start.orders.map(order => order.tag).join(), JSON.stringify(screen));
      check(`round ${n}: the grid doesn't name the mystery while it's hidden`, screen.mystery.includes('Camera saw') && !screen.mystery.includes(mysteryName), screen.mystery);
      if (n === 1) {
        // Tap an animal's tile: it's picked in the grid (its actions in the status line); tap again to drop it.
        const tile = await evaluate(async () => {
          const [[cell, id]] = window.__cc.state().pins;
          await window.__cc.tap(cell, { input: 'touch' });
          await new Promise(resolve => setTimeout(resolve, 200));
          return { cell, id, picked: window.__pill(id)?.getAttribute('aria-pressed') === 'true' };
        });
        await screenshot('02a-picked.png');
        const dropped = await evaluate(async ([cell, id]) => {
          await window.__cc.tap(cell, { input: 'touch' });
          await new Promise(resolve => setTimeout(resolve, 200));
          return window.__pill(id)?.getAttribute('aria-pressed') === 'false';
        }, [tile.cell, tile.id]);
        check('tapping an animal\'s tile picks it in the grid; tapping it again drops it', tile.picked && dropped, JSON.stringify({ ...tile, dropped }));
        // Plan 045: every suspect answer starts hidden; tapping one pencils a guess (yes, no, blank) that changes no rule.
        const pencil = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const grid = document.querySelector('table[aria-label="Evidence"]');
          const hidden = grid.querySelectorAll('tr[data-suspect] td[data-hidden]').length;
          const cell = grid.querySelector('tr[data-suspect] td[data-hidden]');
          const id = Number(cell.closest('tr').dataset.suspect);
          const tag = cell.dataset.tag;
          const at = () => grid.querySelector(`tr[data-suspect="${id}"] td[data-tag="${tag}"]`);
          const before = JSON.stringify({ ...window.__cc.clue(), pencil: null });
          const steps = [];
          for (let i = 0; i < 3; i++) { at().querySelector('button').click(); await wait(150); steps.push(at().dataset.pencil); }
          const clue = window.__cc.clue();
          return { hidden, steps, same: JSON.stringify({ ...clue, pencil: null }) === before, cleared: Object.keys(clue.pencil).length === 0, stillHidden: at().hasAttribute('data-hidden') };
        });
        check('every suspect answer starts hidden', pencil.hidden === 20, `${pencil.hidden} hidden`);
        check('tapping a hidden answer pencils yes, then no, then blank, and changes no rule', pencil.steps.join() === 'yes,no,' && pencil.same && pencil.cleared && pencil.stillHidden, JSON.stringify(pencil));
        // Holding an answer cell highlights it (no pencil) and its column's gem glows; holding again clears both.
        const highlight = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const grid = document.querySelector('table[aria-label="Evidence"]');
          const first = grid.querySelector('tr[data-suspect] td[data-hidden]');
          const id = first.closest('tr').dataset.suspect;
          const tag = first.dataset.tag;
          const at = () => grid.querySelector(`tr[data-suspect="${id}"] td[data-tag="${tag}"]`);
          const glow = () => Boolean(grid.querySelector(`th[data-tag="${tag}"] .ev-glow`));
          const hold = async () => {
            const button = at().querySelector('button');
            const r = button.getBoundingClientRect();
            const opts = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
            button.dispatchEvent(new PointerEvent('pointerdown', opts));
            await wait(1150);
            const during = at().hasAttribute('data-highlight');
            button.dispatchEvent(new PointerEvent('pointerup', opts));
            button.click();
            await wait(200);
            return during;
          };
          const during = await hold();
          const on = { during, cell: at().dataset.highlight === 'true', glow: glow(), pencil: at().dataset.pencil, state: window.__cc.clue().highlight.join() };
          await hold();
          return { on, off: { cell: at().hasAttribute('data-highlight'), glow: glow(), pencil: at().dataset.pencil, state: window.__cc.clue().highlight.length }, key: `${id}:${tag}` };
        });
        check('holding an answer cell highlights it (before release) and glows its gem (no pencil); holding again clears it',
          highlight.on.during && highlight.on.cell && highlight.on.glow && highlight.on.pencil === '' && highlight.on.state === highlight.key && !highlight.off.cell && !highlight.off.glow && highlight.off.pencil === '' && highlight.off.state === 0,
          JSON.stringify(highlight));
        await screenshot('02a-hidden.png');
        // The field guide offers a pencil mark for each hidden answer.
        const guide = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const row = document.querySelector('table[aria-label="Evidence"] tr[data-suspect]');
          await window.__holdPill(row.dataset.suspect);
          const notScouted = document.querySelectorAll('[role=dialog] button[data-pencil-guide="yes"]').length;
          [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
          await wait(250);
          return { hidden: row.querySelectorAll('td[data-hidden]').length, notScouted };
        });
        check('the field guide offers a pencil mark for each hidden answer', guide.hidden > 0 && guide.notScouted === guide.hidden, JSON.stringify(guide));
        // A long press on a row opens its field guide (and doesn't pick it); pencilling there keeps the guide open.
        const held = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const row = document.querySelector('table[aria-label="Evidence"] tr[data-suspect]');
          const id = row.dataset.suspect;
          await window.__holdPill(id);
          const dialog = document.querySelector('[role=dialog]');
          const opened = Boolean(dialog) && window.__pill(id).getAttribute('aria-pressed') === 'false';
          const tag = dialog?.querySelector('button[data-pencil-guide="yes"]') ? [...document.querySelectorAll(`table[aria-label="Evidence"] tr[data-suspect="${id}"] td[data-hidden]`)][0]?.dataset.tag : null;
          dialog?.querySelector('button[data-pencil-guide="yes"]')?.click();
          await wait(200);
          const cell = () => document.querySelector(`table[aria-label="Evidence"] tr[data-suspect="${id}"] td[data-tag="${tag}"]`);
          const pencilled = cell()?.dataset.pencil;
          const stillOpen = Boolean(document.querySelector('[role=dialog]'));
          document.querySelector('[role=dialog] button[data-pencil-guide="yes"]')?.click(); // again: clears it
          await wait(200);
          const cleared = cell()?.dataset.pencil;
          // The grid stays tappable under the guide: pencil there (the guide stays open), and another row switches the guide.
          cell()?.querySelector('button')?.click();
          await wait(200);
          const gridPencil = cell()?.dataset.pencil;
          const openAfterGrid = Boolean(document.querySelector('[role=dialog]'));
          cell()?.querySelector('button')?.click();
          cell()?.querySelector('button')?.click(); // yes -> no -> blank
          await wait(200);
          const other = [...document.querySelectorAll('table[aria-label="Evidence"] tr[data-suspect]')].find(tr => tr.dataset.suspect !== id);
          other.querySelector('th button').click();
          await wait(400);
          const switched = document.querySelector('[role=dialog] h2')?.textContent ?? '';
          const otherName = other.querySelector('th button').getAttribute('aria-label').replace(/^\d+: /, '').replace(/,.*$/, '');
          [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
          await wait(300);
          if (other.querySelector('button[data-pill]').getAttribute('aria-pressed') === 'true') other.querySelector('button[data-pill]').click(); // drop the pick
          await wait(150);
          return { opened, tag, pencilled, stillOpen, cleared, gridPencil, openAfterGrid, switched, otherName };
        });
        check('a long press on an animal\'s row opens its field guide without picking it', held.opened, JSON.stringify(held));
        check('pencilling in the field guide marks the grid and keeps the guide open', held.pencilled === 'yes' && held.stillOpen && held.cleared === '', JSON.stringify(held));
        check('with the field guide open, pencilling in the grid keeps it open', held.gridPencil === 'yes' && held.openAfterGrid, JSON.stringify(held));
        check('with the field guide open, tapping another row switches the guide to that animal', held.switched.endsWith(held.otherName), JSON.stringify(held));
        // Plan 048: the field guide's photo row follows a sideways drag and flips past a quarter of its width; a short or
        // up-and-down drag doesn't; its numbers, a swipe on its title row and ←/→ switch animals too; neighbours' photos peek.
        const flip = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const heights = new Set();
          const overflow = [];
          const current = () => {
            const h2 = document.querySelector('[role=dialog] h2');
            // drawer height / top of the scrolling body (the photo row sits at its top)
            heights.add(`${Math.round(h2.closest('.rounded-t-m').getBoundingClientRect().height)}/${Math.round(header().nextElementSibling.getBoundingClientRect().top)}`);
            // A long sign list takes turns in pages beside the photo; the page showing must fit there.
            const signs = document.querySelector('[role=dialog] [data-guide-signs]');
            const chips = [...(signs?.querySelector('ul.inset-0')?.children ?? [])];
            // ...and a short last page keeps its chips one line tall (not stretched to fill the space).
            if (chips.some(chip => chip.getBoundingClientRect().bottom > signs.getBoundingClientRect().bottom + 1 || chip.getBoundingClientRect().height > 2 * parseFloat(getComputedStyle(chip).lineHeight))) overflow.push(h2.textContent);
            return Number(document.querySelector('[role=dialog] [data-guide-number][aria-current]')?.dataset.guideNumber);
          };
          const drag = async (el, dx, dy = 0, stepMs = 16) => {
            const r = el.getBoundingClientRect();
            const x0 = r.left + r.width / 2, y0 = r.top + 30, steps = 10;
            const at = (type, f) => (type === 'pointerdown' ? el : window).dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x0 + dx * f, clientY: y0 + dy * f, pointerId: 7, pointerType: 'touch', isPrimary: true }));
            at('pointerdown', 0);
            for (let i = 1; i <= steps; i++) { at('pointermove', i / steps); await wait(stepMs); }
            el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x0 + dx, clientY: y0 + dy, pointerId: 7, pointerType: 'touch', isPrimary: true }));
            window.dispatchEvent(new PointerEvent('pointerup', { clientX: x0 + dx, clientY: y0 + dy, pointerId: 7, pointerType: 'touch', isPrimary: true }));
            await wait(450);
          };
          await window.__holdPill(document.querySelector('table[aria-label="Evidence"] tr[data-suspect]').dataset.suspect);
          const row = () => document.querySelector('[role=dialog] [data-guide-swipe]');
          const header = () => document.querySelector('[role=dialog] h2').parentElement.parentElement;
          const result = { start: current(), peeks: row()?.querySelectorAll('[aria-hidden="true"] img').length ?? 0 };
          await drag(row(), -15, 0, 60); result.short = current();
          await drag(row(), -20, 160, 30); result.vertical = current();
          await drag(row(), -160); result.left = current();
          await drag(row(), 160); result.right = current();
          document.querySelector('[role=dialog] [data-guide-number="4"]').click(); await wait(300); result.tapped = current();
          await drag(header(), 120); result.header = current();
          document.querySelector('[role=dialog] [data-guide-number][aria-current]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await wait(300); result.key = current();
          document.querySelector('[role=dialog] [data-guide-number="5"]').click(); await wait(300);
          document.querySelector('[role=dialog] [data-guide-number="5"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); await wait(300); result.wrapped = current();
          result.heights = [...heights];
          result.overflow = overflow;
          // Signs in pages take turns on their own; a tap pauses them, another resumes and moves on.
          const signs = () => document.querySelector('[role=dialog] [data-guide-signs]');
          // A smaller photo leaves room for fewer signs, so this animal's split into pages (as a long list would).
          const figure = row().querySelector('figure');
          figure.style.width = '32px';
          await wait(300);
          if (Number(signs()?.dataset.guideSigns) > 1) {
            const counter = () => signs().previousElementSibling.textContent;
            const pause = () => signs().querySelector('button[aria-label="Pause the signs"]');
            const tap = el => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' })); el.click(); };
            const first = counter();
            await wait(5600);
            const turned = counter();
            tap(pause()); await wait(5600);
            const held = counter(), pressed = pause().getAttribute('aria-pressed');
            tap(pause()); await wait(600);
            result.signPages = { first, turned, held, pressed, resumed: counter(), unpressed: pause().getAttribute('aria-pressed') };
          }
          figure.style.width = '';
          // The longest name in the content (30 chars) fits whole without moving the body.
          const name = document.querySelector('[role=dialog] [data-guide-name]');
          name.textContent = 'Yangtze Giant Softshell Turtle';
          current();
          result.longName = { lines: Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)), clipped: name.scrollWidth > name.clientWidth || name.scrollHeight > name.clientHeight || header().scrollWidth > header().clientWidth };
          result.heights = [...heights];
          [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
          await wait(300);
          const pressed = document.querySelector('table[aria-label="Evidence"] button[data-pill][aria-pressed="true"]');
          if (pressed) pressed.click(); // drop the pick the guide made
          await wait(150);
          return result;
        });
        check('field guide: a short or up-and-down drag of the photo row doesn\'t flip; a long one flips next/previous', flip.start === 1 && flip.short === 1 && flip.vertical === 1 && flip.left === 2 && flip.right === 1, JSON.stringify(flip));
        check('field guide: its numbers jump, a swipe on the title row flips, ←/→ flip and wrap 5 -> 1', flip.tapped === 4 && flip.header === 3 && flip.key === 4 && flip.wrapped === 1, JSON.stringify(flip));
        check('field guide: both neighbours\' photos peek at the sides', flip.peeks === 2, JSON.stringify(flip));
        check('field guide: the drawer keeps one height and its photo row one place through all 5 and the longest name', flip.heights.length === 1, JSON.stringify(flip));
        check('field guide: the signs showing fit beside the photo, chips one line tall', flip.overflow.length === 0, JSON.stringify(flip));
        { const p = flip.signPages;
          check('field guide: signs in pages turn on their own, a tap pauses them, another resumes and moves on', p && p.turned !== p.first && p.held === p.turned && p.pressed === 'true' && p.resumed !== p.held && p.unpressed === 'false', JSON.stringify(p ?? 'signs never split into pages')); }
        check('field guide: the longest name shows whole on two lines', flip.longName.lines === 2 && !flip.longName.clipped, JSON.stringify(flip));
        // A long press on a board tile opens the field guide too.
        const tileHeld = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const [[cell, id]] = window.__cc.state().pins;
          await window.__cc.tap(cell, { input: 'touch', holdMs: 700 });
          await wait(400);
          const title = document.querySelector('[role=dialog] h2')?.textContent ?? '';
          const picked = window.__pill(id)?.getAttribute('aria-pressed') === 'true';
          [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
          await wait(300);
          return { id, title, picked, held: window.__cc.events(50).some(e => e.name === 'clue-board-tile-hold' && e.payload?.id === id) };
        });
        const slid = await evaluate(async () => {
          const id = window.__cc.clue().suspects[0];
          const gridHeight = () => Math.round(document.querySelector('table[aria-label="Evidence"]').getBoundingClientRect().height);
          const before = gridHeight();
          await window.__slidePill(id, 20);
          const short = window.__cc.clue().marked.includes(id);
          await window.__slidePill(id, 90, 60); // from the name, not the photo
          const fromName = window.__cc.clue().marked.includes(id);
          if (window.__pill(id).getAttribute('aria-pressed') === 'true') window.__pill(id).click();
          await window.__slidePill(id, 120);
          const out = window.__cc.clue().marked.includes(id);
          const heightOut = gridHeight();
          await window.__slidePill(id, 120);
          const back = window.__cc.clue().marked.includes(id);
          return { short, fromName, out, back, picked: window.__pill(id).getAttribute('aria-pressed'), before, heightOut };
        });
        check('ruling an animal out doesn\'t change the grid\'s height (the board keeps its size)', slid.heightOut === slid.before, JSON.stringify(slid));
        check('dragging an animal\'s photo a little does nothing; from its name, nothing; all the way rules it out; again brings it back', !slid.short && !slid.fromName && slid.out && !slid.back && slid.picked === 'false', JSON.stringify(slid));
        check('a long press on a board tile opens that animal\'s field guide without picking it', tileHeld.held && tileHeld.title?.endsWith(names.get(tileHeld.id)) && !tileHeld.picked, JSON.stringify(tileHeld));
      }
      // Pencil a guess in every hidden answer (yes, no, yes, ...), so scouting shows right and wrong guesses.
      await evaluate(async () => {
        const cells = [...document.querySelectorAll('table[aria-label="Evidence"] tr[data-suspect] td[data-hidden]')];
        for (const [i, td] of cells.entries()) for (let tap = 0; tap <= i % 2; tap++) td.querySelector('button').click();
        await new Promise(resolve => setTimeout(resolve, 200));
      });
      const trailBefore = start.trail;
      // Round 2 rules out the mystery (an escape); round 3 rules out nothing (out of moves, then a name); others play carefully.
      const mode = n === 2 ? 'reckless' : n === 3 ? 'idle' : 'careful';
      let state = start;
      let moves = 0;
      let pinsBefore = pins;
      while (state.status === 'playing' && moves < MAX_MOVES) {
        // Rule out, through the real grid (tap the name pill, then slide it right): careful, every suspect the
        // answers and notes so far rule out; reckless, the mystery itself; idle, nobody.
        const toMark = mode === 'careful' ? state.suspects.filter(id => !state.possible.includes(id))
          : mode === 'reckless' ? [state.mysteryId] : [];
        for (const id of toMark.filter(id => !state.marked.includes(id) && !state.released.includes(id))) {
          let marked = await evaluate(async id => {
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
            window.__pill(id)?.click();
            await wait(250);
            const picked = window.__cc.events(50).filter(e => e.name === 'clue-board-select').at(-1)?.payload?.id ?? null;
            await window.__slidePill(id, 120);
            const cell = document.querySelector('table[aria-label="Evidence"] tr[data-mystery] th');
            const counter = cell?.querySelector('button')?.getAttribute('aria-label') ?? cell?.textContent ?? '';
            const clue = window.__cc.clue();
            const dim = Number(getComputedStyle(document.querySelector(`table[aria-label="Evidence"] tr[data-suspect="${id}"] td`)).opacity);
            return { marked: clue.marked.includes(id), picked, counter, count: clue.marked.length, dim };
          }, id);
          check(`round ${n}: picking the ${names.get(id)}'s row tells the board to pulse its tile`, marked.picked === id, JSON.stringify(marked));
          check(`round ${n}: sliding the ${names.get(id)}'s name right rules it out`, marked.marked);
          check(`round ${n}: the grid counts the player's own marks`, marked.counter.includes(`${marked.count} ruled out`), marked.counter);
          check(`round ${n}: a ruled-out animal's row dims`, marked.dim < 1, String(marked.dim));
          marked = marked.marked;
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
        // Once a run: tap a gem whose swap would scout a hidden answer, and see the question gems over that animal only.
        if (!scoutChecked) {
          const scout = await evaluate(async () => {
            const cc = window.__cc;
            const clue = cc.clue();
            const hidden = (id, gem) => !clue.marked.includes(id) && clue.orders.some(order => order.gem === gem && !order.seen[clue.suspects.indexOf(id)]);
            const move = cc.validMoves().find(candidate => cc.nearColorsBy(candidate).some(([id, colors]) => colors.some(gem => hidden(id, gem))));
            if (!move) return null;
            const expected = [];
            for (const to of [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => [move.from[0] + dx, move.from[1] + dy])) {
              for (const [id, colors] of cc.nearColorsBy({ from: move.from, to })) for (const gem of colors) if (hidden(id, gem)) expected.push(`${id}:${gem}`);
            }
            await cc.tap(move.from, { input: 'touch' });
            const shown = cc.state().scout.flatMap(([id, gems]) => gems.map(gem => `${id}:${gem}`));
            await cc.tap(move.from, { input: 'touch' });
            return { shown: [...new Set(shown)].sort(), expected: [...new Set(expected)].sort(), after: cc.state().scout };
          });
          if (scout) {
            scoutChecked = true;
            check(`round ${n}: tapping a gem shows the hidden answers its swap would scout, on unmarked animals only`, JSON.stringify(scout.shown) === JSON.stringify(scout.expected) && scout.after.length === 0, JSON.stringify(scout));
          }
        }
        // Once a run: left idle, the board outlines a swap: one that releases a marked animal if any, else one that scouts, else any; a tap hides it.
        if (!hintChecked) {
          const hint = await evaluate(async () => {
            const cc = window.__cc;
            for (let i = 0; i < 80 && !cc.state().hint; i++) await new Promise(resolve => setTimeout(resolve, 100));
            const shown = cc.state().hint;
            if (!shown) return { shown };
            const clue = cc.clue();
            const rank = move => {
              const near = cc.nearColorsBy(move);
              return near.some(([id]) => clue.marked.includes(id)) ? 2
                : near.some(([id, colors]) => colors.some(gem => clue.orders.some(order => order.gem === gem && !order.seen[clue.suspects.indexOf(id)]))) ? 1 : 0;
            };
            const valid = cc.validMoves().some(move => JSON.stringify([move.from, move.to]) === JSON.stringify([shown.from, shown.to]));
            const best = Math.max(...cc.validMoves().map(rank));
            await cc.tap(shown.from, { input: 'touch' });
            const after = cc.state().hint;
            await cc.tap(shown.from, { input: 'touch' });
            return { shown, valid, rank: rank(shown), best, after };
          });
          hintChecked = true;
          check(`round ${n}: left idle, the board hints the most useful kind of swap, and a tap hides it`, Boolean(hint.shown) && hint.valid && hint.rank === hint.best && hint.after === null, JSON.stringify(hint));
        }
        const before = state;
        const result = await evaluate(async () => {
          const cc = window.__cc;
          const clue = cc.clue();
          const live = new Set(clue.marked.filter(id => !clue.released.includes(id)));
          const useful = new Set(clue.orders.filter(order => !order.answer).map(order => order.gem));
          // What a move's own clear would scout: each unmarked animal's hidden answers for the colors cleared next to it.
          const scouts = move => cc.nearColorsBy(move).filter(([id]) => !clue.marked.includes(id) && !clue.released.includes(id)).flatMap(([id, colors]) =>
            clue.orders.filter(order => colors.includes(order.gem) && !order.seen[clue.suspects.indexOf(id)]).map(order => `${id}:${order.tag}`));
          // (Reckless aims at its marked animal, the mystery, the same way: a clear next to it.)
          const value = move => 10 * cc.touchedBy(move).filter(id => live.has(id)).length + 2 * scouts(move).length + (move.colors.some(color => useful.has(color)) ? 3 : 0) + move.largest;
          const moves = cc.validMoves();
          if (moves.length === 0) return null;
          const move = moves.reduce((best, candidate) => (value(candidate) > value(best) ? candidate : best));
          const expected = scouts(move);
          const drag = await cc.drag(move, { input: 'touch', timeoutMs: 30_000 });
          await new Promise(resolve => setTimeout(resolve, 150));
          const { pins, view } = cc.state();
          const grid = document.querySelector('table[aria-label="Evidence"]');
          const orders = [...grid.querySelectorAll('tr[data-mystery] td[data-tag]')].map(td => ({ tag: td.dataset.tag, have: Number(td.dataset.have), answer: td.dataset.answer || null }));
          const misses = grid.querySelectorAll('[data-miss]').length;
          const cells = [...grid.querySelectorAll('tr[data-suspect] td[data-tag]')].map(td => ({
            id: Number(td.closest('tr').dataset.suspect), tag: td.dataset.tag, hidden: td.hasAttribute('data-hidden'),
            yes: td.dataset.yes ?? null, said: td.querySelector('.sr-only')?.textContent ?? null, guess: td.dataset.guess ?? null,
          }));
          const glimmer = grid.querySelectorAll('[data-guess="right"] .ev-sparkle').length;
          return { counted: drag.counted, timedOut: drag.timedOut, blocked: drag.blocked ?? null, pins, view, orders, misses, cells, glimmer, expected, clue: cc.clue() };
        });
        if (!result) break;
        moves++;
        state = result.clue;
        check(`round ${n} move ${moves}: settles`, !result.timedOut);
        check(`round ${n} move ${moves}: nothing on screen covers the board`, !result.blocked, result.blocked ?? '');
        if (result.counted) check(`round ${n} move ${moves}: uses exactly one move`, state.movesLeft === before.movesLeft - 1, `${before.movesLeft} -> ${state.movesLeft}`);
        check(`round ${n} move ${moves}: only ruled-out animals leave the board`, state.released.every(id => state.marked.includes(id)), JSON.stringify({ released: state.released, marked: state.marked }));
        check(`round ${n} move ${moves}: the mystery leaves only by escaping, which loses the round`,
          !state.released.includes(state.mysteryId) || (state.status === 'lost' && state.lostBy === 'escaped'));
        // Plan 047: an escape is decided once the move is done, so every release in it (steps too) is counted.
        check(`round ${n} move ${moves}: released animals are gone from the board`, result.pins.length === 5 - state.released.length, JSON.stringify({ pins: result.pins, released: state.released }));
        // Plan 047: an unmarked card never moves; a marked one still on the board took one step its way (or waited behind another card).
        const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const cellOf = (list, id) => list.find(([, other]) => other === id)?.[0];
        const strays = result.pins.filter(([cell, id]) => {
          const was = cellOf(pinsBefore, id);
          if (!before.marked.includes(id)) return cell[0] !== was[0] || cell[1] !== was[1];
          const [dx, dy] = STEP[before.headings[id]];
          const stepped = cell[0] === was[0] + dx && cell[1] === was[1] + dy;
          const waited = cell[0] === was[0] && cell[1] === was[1]
            && [...pinsBefore, ...result.pins].some(([[x, y], other]) => other !== id && x === was[0] + dx && y === was[1] + dy);
          return !stepped && !waited;
        });
        check(`round ${n} move ${moves}: unmarked cards stay put; marked ones step one cell their way (or wait behind a card)`, strays.length === 0, JSON.stringify({ strays, before: pinsBefore, headings: before.headings }));
        pinsBefore = result.pins;
        check(`round ${n} move ${moves}: the view shows a tile exactly on each pinned cell`, result.view.every((column, x) => column.every((key, y) => (key === 'tile') === result.pins.some(([[px, py]]) => px === x && py === y))));
        check(`round ${n} move ${moves}: the grid's Mystery row matches the rules`, state.orders.every(order => {
          const cell = result.orders.find(candidate => candidate.tag === order.tag);
          return cell && cell.have === order.have && cell.answer === order.answer;
        }), JSON.stringify(result.orders));
        check(`round ${n} move ${moves}: during play the grid never points at a mismatch`, result.misses === 0, `${result.misses} cells`);
        // Plan 045: the move's own clear scouts exactly the hidden answers next to unmarked animals in the colors it
        // cleared there (cascades scout nothing), and a hidden answer is nowhere in the page.
        const seenKeys = clue => new Set(clue.orders.flatMap(order => clue.suspects.filter((_id, i) => order.seen[i]).map(id => `${id}:${order.tag}`)));
        const was = seenKeys(before);
        const scouted = [...seenKeys(state)].filter(key => !was.has(key)).sort();
        if (result.counted) check(`round ${n} move ${moves}: the move scouts exactly the answers next to unmarked animals in its colors`, scouted.join() === [...result.expected].sort().join(), JSON.stringify({ scouted, expected: result.expected }));
        const leaks = result.cells.filter(cell => {
          const order = state.orders.find(candidate => candidate.tag === cell.tag);
          const i = state.suspects.indexOf(cell.id);
          return cell.hidden ? order.seen[i] || cell.yes !== null || /yes|no/.test(cell.said ?? '') : !order.seen[i] || cell.yes !== String(order.row[i]);
        });
        check(`round ${n} move ${moves}: the grid shows exactly the scouted answers, and no hidden one`, leaks.length === 0, JSON.stringify(leaks.slice(0, 3)));
        // A scouted cell with a pencilled guess says whether it was right (gold check) or wrong; a hidden one says nothing.
        const misjudged = result.cells.filter(cell => {
          const order = state.orders.find(candidate => candidate.tag === cell.tag);
          const guess = state.pencil[`${cell.id}:${cell.tag}`];
          const expected = cell.hidden || !guess ? null : (guess === 'yes') === order.row[state.suspects.indexOf(cell.id)] ? 'right' : 'wrong';
          return cell.guess !== expected;
        });
        check(`round ${n} move ${moves}: each scouted guess shows right or wrong, and no hidden one does`, misjudged.length === 0, JSON.stringify(misjudged.slice(0, 3)));
        const calledNow = scouted.filter(key => {
          const [id, tag] = [Number(key.split(':')[0]), key.slice(key.indexOf(':') + 1)];
          const guess = state.pencil[key];
          return guess && (guess === 'yes') === state.orders.find(order => order.tag === tag).row[state.suspects.indexOf(id)];
        });
        check(`round ${n} move ${moves}: a right guess just scouted sparkles`, result.glimmer >= calledNow.length, JSON.stringify({ glimmer: result.glimmer, calledNow }));
        if (calledNow.length > 0 && !calledShot) { calledShot = true; await screenshot('03-called-it.png'); }
        if (!notesChecked && state.notes > 0) {
          notesChecked = true;
          const notes = await evaluate(async () => {
            const book = document.querySelector('table[aria-label="Evidence"] tr[data-mystery] button[data-flight-target="notes"]');
            const corner = { inRow: Boolean(book), count: book?.dataset.notes ?? null, label: book?.getAttribute('aria-label') ?? '', flash: Boolean(book?.querySelector('.ev-pulse')) };
            book?.click();
            await new Promise(resolve => setTimeout(resolve, 250));
            const text = document.querySelector('[role=dialog]')?.innerText ?? '';
            [...document.querySelectorAll('[role=dialog] button')].find(button => button.getAttribute('aria-label') === 'Close')?.click();
            return { text, ...corner };
          });
          check(`round ${n}: a witness note says how many of the 5 field guides agree`, /of 5\s+field guides say this too/.test(notes.text), notes.text.slice(0, 120));
          check(`round ${n}: the Mystery cell opens the witness notes, counts them and pulses`, notes.inRow && notes.count === String(state.notes) && notes.label.includes(`${state.notes} witness note`) && notes.flash, JSON.stringify({ ...notes, text: undefined }));
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
          (buttons.find(b => b.textContent.endsWith(pickName)) ?? buttons[0])?.click();
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
      // The Camera row slides onto the mystery's row and lights it, before the card opens.
      await waitFor(() => document.querySelector('table[aria-label="Evidence"] tr[data-match]') && true, 'the Camera row landing', 10_000);
      await screenshot(`04-round-${n}-landed.png`);
      const reveal = await waitFor(() => {
        const sheet = document.querySelector('section[aria-label^="It was the"]');
        return sheet ? { name: sheet.getAttribute('aria-label').replace('It was the ', ''), text: sheet.innerText } : null;
      }, 'the round-end card', 10_000);
      check(`round ${n}: the round-end card names the mystery`, reveal.name === mysteryName, reveal.name);
      const landed = await evaluate(id => Boolean(document.querySelector(`table[aria-label="Evidence"] tr[data-suspect="${id}"][data-match]`)), start.mysteryId);
      check(`round ${n}: before the card, the grid's Camera row lands on the mystery's own row`, landed);
      check(`round ${n}: the round-end card says the camera saw that animal's number`, reveal.text.includes(`The camera saw #${start.suspects.indexOf(start.mysteryId) + 1}`), reveal.text.slice(0, 120));
      check(`round ${n}: the round-end card shows the family tree`, reveal.text.includes('Animalia › Chordata'));
      // The card replays the grid: the mystery's row outlined, and red exactly where an earned answer rules a suspect out.
      const replay = await evaluate(() => {
        const grid = document.querySelector('table[aria-label="How the evidence lined up"]');
        if (!grid) return null;
        const answers = Object.fromEntries([...grid.querySelectorAll('tr[data-mystery] td[data-tag]')].map(td => [td.dataset.tag, td.dataset.answer || null]));
        const cells = [...grid.querySelectorAll('tr[data-suspect] td[data-tag]')];
        const wrong = cells.filter(td => td.hasAttribute('data-miss') !== (answers[td.dataset.tag] !== null && (td.dataset.yes === 'true') !== (answers[td.dataset.tag] === 'yes')));
        const clue = window.__cc.clue();
        const truth = cells.map(td => {
          const id = Number(td.closest('tr').dataset.suspect);
          const guess = clue.pencil[`${id}:${td.dataset.tag}`];
          return { shown: td.dataset.guess ?? null, expected: guess ? ((guess === 'yes') === (td.dataset.yes === 'true') ? 'right' : 'wrong') : null };
        });
        const tally = `${truth.filter(cell => cell.expected === 'right').length}/${truth.filter(cell => cell.expected).length}`;
        return {
          match: grid.querySelector('tr[data-match]')?.dataset.suspect ?? '', misses: grid.querySelectorAll('[data-miss]').length, wrong: wrong.length, hidden: grid.querySelectorAll('[data-hidden]').length,
          guessesWrong: truth.filter(cell => cell.shown !== cell.expected).length, tally, shownTally: document.querySelector('[data-guesses]')?.dataset.guesses ?? null,
        };
      });
      check(`round ${n}: the round-end card replays the grid, red where an earned answer rules an animal out`, Boolean(replay) && replay.wrong === 0 && replay.hidden === 0 && replay.match === String(start.mysteryId), JSON.stringify(replay));
      check(`round ${n}: the round-end card marks every guess right or wrong and counts them`, Boolean(replay) && replay.guessesWrong === 0 && replay.tally === replay.shownTally, JSON.stringify(replay));
      await screenshot(`04-round-${n}-end.png`);
      report.rounds.push({
        round: start.roundNo, mysteryId: start.mysteryId, mystery: mysteryName, suspects: start.suspects.map(id => names.get(id)),
        outcome: end?.outcome, lostBy: state.lostBy, stars: end?.stars, points: end?.points, movesUsed: state.movesUsed,
        answers: state.orders.filter(order => order.answer).length, notes: state.notes, scouted: state.orders.reduce((sum, order) => sum + order.seen.filter(Boolean).length, 0), marked: state.marked.length, released: state.released.length,
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
    check('the scouting preview was checked at least once', scoutChecked);
    check('the idle hint was checked at least once', hintChecked);

    // 3. The Field Journal lists the finds (and right names at the end of moves).
    const journal = await evaluate(async () => {
      document.querySelector('button[aria-label="Menu"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 250));
      [...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent === 'Field journal')?.click();
      await new Promise(resolve => setTimeout(resolve, 1200));
      return document.querySelector('[role=dialog] #journal-title')?.nextElementSibling?.textContent ?? '';
    });
    check('the journal counts the animals found (and named right when moves ran out)', journal.startsWith(`${journalFinds.size} of`), `${journal} (expected ${journalFinds.size})`);
    await screenshot('05-journal.png');

    // 4. Resume: a game without ?seed= is saved for the tab; a reload picks it up (marks, pencil, released animals, gems, toys).
    await goto(`${BASE}/`); // the globe starts the next game fresh
    await goto(`${BASE}/explore/?place=${encodeURIComponent(place.key)}`);
    const boardReady = () => window.__cc?.clue?.() && window.__cc.state().ready;
    await waitFor(boardReady, 'the unseeded board', 60_000);
    await evaluate(() => window.__cc.speed(4));
    await sleep(1500);
    check('coming from the globe starts a new round 1', await evaluate(() => window.__cc.clue().roundNo === 1 && window.__cc.clue().movesLeft === window.__cc.clue().moves));
    const played = await evaluate(async () => {
      const cc = window.__cc;
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const first = cc.clue();
      const marked = first.suspects.find(id => id !== first.mysteryId);
      await window.__slidePill(marked, 120);
      // Aim at the marked animal until it's released, and make big matches until a toy is on the board (up to 20 moves).
      const hasToy = () => cc.state().toys.flat().some(Boolean);
      for (let i = 0; i < 20 && (!cc.clue().released.includes(marked) || !hasToy()) && cc.clue().status === 'playing'; i++) {
        const moves = cc.validMoves();
        if (!moves.length) break;
        const released = cc.clue().released.includes(marked);
        const move = (!released && moves.find(candidate => cc.touchedBy(candidate).includes(marked)))
          || moves.reduce((best, candidate) => (candidate.largest > best.largest ? candidate : best));
        await cc.drag(move, { input: 'touch', timeoutMs: 30_000 });
        await wait(150);
      }
      // Plan 047: rule out another look-alike and play one move, so a card stands where it walked to.
      // A card whose first step stays on the board (one on an edge walking out would just leave).
      const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      let walker = null;
      for (const id of cc.clue().suspects.filter(other => other !== first.mysteryId && !cc.clue().released.includes(other) && !cc.clue().marked.includes(other))) {
        if (cc.clue().status !== 'playing') break;
        await window.__slidePill(id, 120);
        const [x, y] = cc.state().pins.find(([, other]) => other === id)[0];
        const [dx, dy] = STEP[cc.clue().headings[id]];
        if (x + dx >= 0 && x + dx < 7 && y + dy >= 0 && y + dy < 7) { walker = id; break; }
        await window.__slidePill(id, 120); // back
      }
      let walked = null;
      if (walker) {
        const from = cc.state().pins.find(([, id]) => id === walker)?.[0];
        const moves = cc.validMoves().filter(candidate => !cc.touchedBy(candidate).includes(walker));
        if (moves.length) await cc.drag(moves[0], { input: 'touch', timeoutMs: 30_000 });
        await wait(150);
        const to = cc.state().pins.find(([, id]) => id === walker)?.[0] ?? null;
        walked = { id: walker, from, to };
      }
      const cell = document.querySelector('table[aria-label="Evidence"] tr[data-suspect] td[data-hidden] button');
      cell?.click();
      await wait(400); // the save effect runs
      const { grid, toys, pins } = cc.state();
      return { clue: cc.clue(), grid, toys, pins, walked, saved: Boolean(sessionStorage.getItem('cc:explore:game')) };
    });
    await screenshot('06-before-reload.png');
    await page('Page.reload');
    await waitFor(() => document.readyState === 'complete', 'the reload');
    await waitFor(boardReady, 'the resumed board', 60_000);
    await sleep(1500);
    const resumed = await evaluate(() => { const { grid, toys, pins } = window.__cc.state(); return { clue: window.__cc.clue(), grid, toys, pins }; });
    await screenshot('06-after-reload.png');
    const toyCount = played.toys.flat().filter(Boolean).length;
    report.resume = { movesUsed: played.clue.movesUsed, marked: played.clue.marked, released: played.clue.released, pencil: played.clue.pencil, toys: toyCount };
    check('the game in progress is saved for the tab', played.saved);
    check('a reload resumes the round: rules, marks, pencil, moves, score', JSON.stringify(resumed.clue) === JSON.stringify(played.clue), JSON.stringify({ before: played.clue.movesLeft, after: resumed.clue.movesLeft }));
    check('a reload resumes the board: gems and toys', JSON.stringify(resumed.grid) === JSON.stringify(played.grid) && JSON.stringify(resumed.toys) === JSON.stringify(played.toys), `${toyCount} toys`);
    check('a reload keeps released animals off the board', JSON.stringify(resumed.pins) === JSON.stringify(played.pins), JSON.stringify({ released: played.clue.released, pins: resumed.pins.length }));
    const { walked } = played;
    check('a card that walked stays where it walked to after a reload (plan 047)', Boolean(walked?.to) && JSON.stringify(walked.to) !== JSON.stringify(walked.from)
      && JSON.stringify(resumed.pins.find(([, id]) => id === walked.id)?.[0]) === JSON.stringify(walked.to), JSON.stringify(walked));
    // Play the round out, then reload on its end card: the journal doesn't count the find twice.
    await evaluate(() => window.__cc.speed(4));
    const journalBefore = await evaluate(() => localStorage.getItem('clue-match:journal:v1'));
    await evaluate(async mysteryName => {
      const cc = window.__cc;
      for (let i = 0; i < 40 && cc.clue().status === 'playing'; i++) {
        const moves = cc.validMoves();
        if (!moves.length) break;
        await cc.drag(moves[0], { input: 'touch', timeoutMs: 30_000 });
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      // Out of moves: name the mystery right, so the journal records it.
      await new Promise(resolve => setTimeout(resolve, 300));
      [...(document.querySelector('[aria-label="Out of moves"]')?.querySelectorAll('button') ?? [])].find(b => b.textContent.endsWith(mysteryName))?.click();
    }, names.get(resumed.clue.mysteryId));
    await waitFor(() => window.__cc.clue().end, 'the resumed round to end', 20_000).catch(() => null);
    await sleep(1000);
    const ended = await evaluate(() => ({ end: window.__cc.clue().end, journal: localStorage.getItem('clue-match:journal:v1') }));
    await page('Page.reload');
    await waitFor(() => document.readyState === 'complete', 'the reload');
    await waitFor(boardReady, 'the resumed end card', 60_000);
    await sleep(1500);
    const afterEnd = await evaluate(() => ({ end: window.__cc.clue().end, journal: localStorage.getItem('clue-match:journal:v1') }));
    await screenshot('06-end-after-reload.png');
    check('the resumed round, named right, is written to the journal once', ended.journal !== journalBefore);
    check('a reload on the round-end card resumes it without writing the journal again', Boolean(ended.end) && JSON.stringify(afterEnd.end) === JSON.stringify(ended.end) && afterEnd.journal === ended.journal, JSON.stringify({ ended: ended.end?.outcome ?? null, after: afterEnd.end?.outcome ?? null, sameJournal: afterEnd.journal === ended.journal }));

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
    for (const result of failed.slice(0, 5)) console.log(`  FAIL ${result.name}`);
    console.log(`${report.checks.length - failed.length}/${report.checks.length} checks passed. Artifact: ${path.relative(process.cwd(), outDir)}/`);
    process.exitCode = failed.length ? 1 : 0;
  });
