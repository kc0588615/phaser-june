// Drives Chrome over the game and writes <outDir>/<shot>.png and <outDir>/<mode>.json.
//   start: round-start shots from the production build (no dev bridge).
//   play:  a seeded trail played through window.__cc on the dev server.
// The manifest holds what the shots were taken from (commit: the game's, a branch's own commits don't count; pool: the bytes
// the deal reads), the rounds played, any API writes, and per shot its animals, theme, page text, board rect and round state.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage, startBrowser } from '../cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SEED = Number(process.env.SHOT_SEED ?? 1);
const PLACE = process.env.SHOT_PLACE ?? 'continent:africa';
/** The scout flash (globals.css .ev-flash, 1.8 s) and the reveal state (AnimalGame.tsx REVEAL_MS, 3.1 s) are over. */
const AFTER_REVEAL_MS = 3200;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function poolHash(base) {
  const response = await fetch(`${base}/api/clue-game/pool/`);
  if (!response.ok) throw new Error(`GET the pool: ${response.status}`);
  return createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex').slice(0, 10);
}

export async function take({ mode, base, outDir }) {
  // Written only when capture ends, so a kill must not leave the old manifest vouching for overwritten PNGs.
  rmSync(path.join(outDir, `${mode}.json`), { force: true });
  const commit = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: root, encoding: 'utf8' }).trim();
  const pool = await poolHash(base);
  const { browser, close } = await startBrowser();
  const record = { mode, base, commit, pool, seed: SEED, place: PLACE, takenAt: new Date().toISOString(), rounds: [], writes: [], shots: {} };
  try {
    const { page, evaluate, waitFor, sessionId } = await openPage(browser);
    browser.on(message => {
      if (message.sessionId !== sessionId || message.method !== 'Network.requestWillBeSent') return;
      const { method, url } = message.params.request;
      if (method !== 'GET' && url.startsWith(`${base}/api/`)) record.writes.push(`${method} ${url}`);
    });
    await page('Page.enable');
    await page('Runtime.enable');
    await page('Network.enable');
    await page('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    await page('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('critter-connect:slide-hint:v1', '1'); } catch {}" });
    const viewport = (width, height, deviceScaleFactor, mobile) => Promise.all([
      page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile }),
      page('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false }),
    ]);
    const goto = async url => {
      await page('Page.navigate', { url });
      await waitFor(() => document.readyState === 'complete', `${url} to load`);
    };
    const shot = async (name, ids) => {
      // A script's focus (Next focuses the board) would show a ring and keys hint a tapping player doesn't see.
      await evaluate(() => document.activeElement?.blur());
      await sleep(200);
      const facts = await evaluate(() => ({
        howTo: Boolean(document.getElementById('animal-how-title')),
        slideHint: Boolean(document.querySelector('.ev-hint')),
        theme: document.documentElement.dataset.theme ?? null,
        text: document.body.innerText,
        board: (rect => rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height })(document.querySelector('[aria-label="Game board"]')?.getBoundingClientRect()),
        clue: window.__cc?.clue?.() ?? null,
      }));
      if (facts.howTo) throw new Error(`${name}: the how-to dialog is up`);
      if (facts.slideHint) throw new Error(`${name}: the slide hint is up`);
      if (facts.theme !== 'light') throw new Error(`${name}: theme is ${facts.theme}, not light`);
      await evaluate(() => document.head.insertAdjacentHTML('beforeend', '<style id="shot-no-badge">nextjs-portal { display: none !important; }</style>'));
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      await evaluate(() => document.getElementById('shot-no-badge')?.remove());
      writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
      record.shots[name] = { ids, theme: facts.theme, text: facts.text, board: facts.board ?? null, clue: facts.clue };
      console.log(`  ${name}: ${JSON.stringify(ids)}`);
    };
    /** A new player's first board opens on how to play; found by its title, so a bump of its storage key can't break the shots. */
    const dismissHowTo = async () => {
      await evaluate(() => {
        if (document.getElementById('animal-how-title')) [...document.querySelectorAll('button')].find(button => button.textContent.trim() === "Let's play")?.click();
      });
      await waitFor(() => !document.getElementById('animal-how-title'), 'the how-to dialog to close');
    };
    const suspects = () => evaluate(() => [...document.querySelectorAll('table[aria-label="Evidence"] tr[data-suspect]')].map(row => Number(row.dataset.suspect)));
    const imagesLoaded = () => [...document.images].every(img => img.complete);
    const board = `${base}/explore/?seed=${SEED}&place=${encodeURIComponent(PLACE)}`;

    if (mode === 'start') {
      await viewport(390, 844, 2, true);
      await goto(`${base}/`);
      await waitFor(() => document.querySelectorAll('ul button').length, 'the continent list');
      await sleep(3000);
      await shot('globe', []);
      for (const [name, size] of [['board-phone', [390, 844, 2, true]], ['hero-board', [1440, 900, 1, false]], ['og', [1200, 630, 1, false]]]) {
        await viewport(...size);
        await goto(board);
        await waitFor(() => document.querySelectorAll('table[aria-label="Evidence"] tr[data-suspect]').length === 5, 'the board');
        await waitFor(imagesLoaded, 'the photos');
        await dismissHowTo();
        await sleep(3000);
        await shot(name, await suspects());
      }
    } else {
      await viewport(390, 844, 2, true);
      await page('Page.addScriptToEvaluateOnNewDocument', { source: `
        window.__pill = id => document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + id + '"] button[data-pill]');
        window.__slidePill = async id => {
          const pill = window.__pill(id);
          const r = pill.getBoundingClientRect();
          const y = r.top + r.height / 2;
          const at = (type, x) => pill.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }));
          at('pointerdown', r.left + 10);
          for (let x = 10; x <= 120; x += 10) { at('pointermove', r.left + 10 + x); await new Promise(res => setTimeout(res, 16)); }
          at('pointerup', r.left + 130);
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
      const closeDialog = () => evaluate(async () => {
        [...document.querySelectorAll('[role=dialog] button')].find(b => /^Close/.test(b.getAttribute('aria-label') ?? ''))?.click();
        await new Promise(resolve => setTimeout(resolve, 400));
        return !document.querySelector('[role=dialog]');
      });
      await goto(board);
      await waitFor(() => window.__cc?.clue?.() && window.__cc.state().ready && window.__cc.state().pins.length === 5, 'the board (dev build?)', 60_000);
      await waitFor(imagesLoaded, 'the photos');
      await dismissHowTo();
      await sleep(2000);
      const start = await evaluate(() => window.__cc.clue());

      // Field guide of the first row's animal, the board behind it.
      const guideId = start.suspects[0];
      await evaluate(id => window.__holdPill(id), guideId);
      await waitFor(() => document.querySelector('[role=dialog]') && [...document.images].every(img => img.complete), 'the field guide');
      await sleep(1500);
      await shot('field-guide', start.suspects);
      if (!await closeDialog()) throw new Error('the field guide did not close');

      // Play carefully (as e2e's careful round): rule out what the answers rule out, swap for useful gems.
      // Round 1 gives grid-marked and round-end; later rounds play on until a witness note shows (not every round has one).
      await evaluate(() => window.__cc.speed(4));
      const found = [];
      let marked = false;
      let notes = false;
      for (let n = 1; n <= 4 && !notes; n++) {
        let state = await evaluate(() => window.__cc.clue());
        for (let move = 0; state.status === 'playing' && move < 45; move++) {
          // Close to the end, rule out the rest so the round ends as a find (the shots show a full round).
          const toMark = state.movesLeft <= 6 ? state.suspects.filter(id => id !== state.mysteryId) : state.suspects.filter(id => !state.possible.includes(id));
          for (const id of toMark.filter(id => !state.marked.includes(id) && !state.released.includes(id))) {
            await evaluate(async id => { window.__pill(id)?.click(); await new Promise(r => setTimeout(r, 250)); await window.__slidePill(id); }, id);
            state = await evaluate(() => window.__cc.clue());
            if (!marked && state.marked.includes(id) && state.orders.some(order => order.answer)) {
              marked = true;
              await sleep(AFTER_REVEAL_MS);
              await shot('grid-marked', state.suspects.filter(s => !state.released.includes(s)));
            }
          }
          if (!notes && state.notes > 0 && state.status === 'playing') {
            notes = true;
            await evaluate(() => document.querySelector('table[aria-label="Evidence"] tr[data-mystery] button[data-flight-target="notes"]')?.click());
            await waitFor(() => Boolean(document.querySelector('[role=dialog]')), 'the witness notes');
            await sleep(800);
            await shot('witness-note', state.suspects.filter(s => !state.released.includes(s)));
            if (!await closeDialog()) throw new Error('the witness notes did not close');
          }
          state = await evaluate(async () => {
            const cc = window.__cc;
            const clue = cc.clue();
            const live = new Set(clue.marked.filter(id => !clue.released.includes(id)));
            const useful = new Set(clue.orders.filter(order => !order.answer).map(order => order.gem));
            const value = m => 10 * cc.touchedBy(m).filter(id => live.has(id)).length + (m.colors.some(color => useful.has(color)) ? 3 : 0) + (clue.notes === 0 && m.colors.includes('purple') ? 8 : 0) + m.largest;
            const moves = cc.validMoves();
            if (moves.length) {
              const result = await cc.drag(moves.reduce((best, m) => (value(m) > value(best) ? m : best)), { input: 'touch', timeoutMs: 30_000 });
              if (result.blocked) throw new Error(`a swipe was blocked by ${result.blocked}`);
              if (result.timedOut) throw new Error('a swipe never settled');
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            return cc.clue();
          });
        }
        record.rounds.push({ round: n, suspects: state.suspects, mysteryId: state.mysteryId, status: state.status, lostBy: state.lostBy, movesUsed: state.movesUsed, notes: state.notes, outcome: state.end?.outcome ?? null });
        if (state.end?.outcome !== 'found') throw new Error(`round ${n} ended ${state.status} ${state.lostBy}: try another seed`);
        found.push(state.mysteryId);
        await waitFor(() => Boolean(document.querySelector('section[aria-labelledby="end-title"]')), 'the round-end card', 60_000);
        if (n === 1) {
          await waitFor(imagesLoaded, 'its photos');
          await sleep(3000);
          await shot('round-end', [state.mysteryId, ...state.suspects.filter(id => id !== state.mysteryId)]);
        }
        if (notes) break;
        await evaluate(() => [...document.querySelectorAll('button')].find(b => ['Next animal', 'New trail'].includes(b.textContent.trim()))?.click());
        await waitFor(round => window.__cc.clue().roundNo === round && window.__cc.clue().status === 'playing' && window.__cc.state().ready && window.__cc.state().pins.length === 5, 'the next round', 30_000, n + 1);
        await sleep(1500);
      }
      if (!notes) throw new Error('no witness note in 4 rounds: try another seed');

      // Field journal (menu).
      await evaluate(async () => {
        document.querySelector('button[aria-label="Menu"]')?.click();
        await new Promise(resolve => setTimeout(resolve, 300));
        [...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent === 'Field journal')?.click();
      });
      await waitFor(() => Boolean(document.querySelector('[role=dialog] #journal-title')), 'the journal');
      await waitFor(imagesLoaded, 'its photos');
      await sleep(2000);
      await shot('journal', found);

      // The globe with the find glowing.
      await goto(`${base}/`);
      await waitFor(() => document.querySelectorAll('.maplibregl-marker').length > 0, 'the globe markers');
      await sleep(3000);
      await shot('globe-found', found);
    }
  } finally {
    writeFileSync(path.join(outDir, `${mode}.json`), `${JSON.stringify(record, null, 2)}\n`);
    console.log(`${mode}: rounds played: ${record.rounds.length}, API writes: ${record.writes.length}`);
    await close();
  }
}
