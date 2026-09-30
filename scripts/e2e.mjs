// End-to-end play test. Headless Chrome plays the dev build like a player: the
// globe's continent list, then rounds of the game for one continent at /explore,
// driven through the real board (window.__cc, dev only) and the real buttons. It checks the rules a player relies on
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
const MAX_MOVES = 10;

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
    await page('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('critter-connect:how-to-play-seen:v6', '1'); } catch {}" });

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

    // 2. The game for that continent.
    await goto(`${BASE}/explore/?seed=${SEED}&place=${encodeURIComponent(place.key)}`);
    await waitFor(() => window.__cc?.clue?.() && window.__cc.state().ready, 'the game session (window.__cc; is this a dev build?)', 60_000);
    await evaluate(() => window.__cc.speed(4));
    await screenshot('02-first-round.png');
    const names = new Map((await evaluate(async () => (await (await fetch('/api/clue-game/pool/')).json()).species.map(s => [s.id, s.commonName]))));
    // Sound starts off; its button turns it on and off.
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
    // Toys: a big match leaves one, and matching it sets it off (checked once a run, when a move can use one).
    let toySeen = false;
    let toyFired = false;
    let triggerFired = false;

    for (let n = 1; n <= ROUNDS; n++) {
      const start = await evaluate(() => window.__cc.clue());
      const mysteryName = names.get(start.mysteryId);
      check(`round ${n}: ${start.candidates} animals, the mystery among them`, start.candidateIds.length === start.candidates && start.candidateIds.includes(start.mysteryId), `${start.candidateIds.length} animals`);
      check(`round ${n}: starts with the rules' moves`, start.movesLeft === start.moves && start.status === 'playing', `${start.movesLeft} of ${start.moves} moves, ${start.status}`);
      let state = start;
      let moves = 0;
      let askedOne = false;
      while (state.status === 'playing' && moves < MAX_MOVES) {
        const before = state;
        const result = await evaluate(async ({ preferToy, preferTrigger }) => {
          const cc = window.__cc;
          const toys = cc.state().toys;
          const moves = cc.validMoves().sort((a, b) => b.largest - a.largest || b.matches - a.matches || a.from[0] - b.from[0] || a.from[1] - b.from[1] || a.to[0] - b.to[0] || a.to[1] - b.to[1]);
          // A move that only sets toys off (a color gem, or two toys side by side), once a run when one shows up.
          const triggerMove = preferTrigger ? moves.find(candidate => candidate.trigger) : undefined;
          const toyMove = triggerMove ?? (preferToy ? moves.find(candidate => toys[candidate.from[0]][candidate.from[1]] || toys[candidate.to[0]][candidate.to[1]]) : undefined);
          const move = toyMove ?? moves[0];
          if (!move) return null;
          const since = Date.now();
          const drag = await cc.drag(move, { input: 'touch', timeoutMs: 20_000 });
          const blasts = cc.events(200).filter(event => event.at >= since && event.name === 'gems-matched' && event.payload.groups.some(group => group.blast)).length;
          return { counted: drag.counted, timedOut: drag.timedOut, toyMove: Boolean(toyMove), triggerMove: Boolean(triggerMove), blasts, toys: cc.state().toys.flat().filter(Boolean).length, clue: cc.clue() };
        }, { preferToy: !toyFired, preferTrigger: !triggerFired });
        if (!result) break;
        moves++;
        state = result.clue;
        if (result.toys > 0 && !toySeen) await screenshot('02b-toy.png');
        if (result.toys > 0) toySeen = true;
        if (result.triggerMove && !triggerFired) {
          triggerFired = true;
          check(`round ${n} move ${moves}: a color gem (or two toys) swapped without a match goes off`, result.counted && result.blasts > 0, `${result.blasts} blasts`);
        }
        if (result.toyMove && result.blasts > 0 && !toyFired) {
          toyFired = true;
          check(`round ${n} move ${moves}: a matched toy goes off and its clear still leaves charges at zero or more`, Object.values(result.clue.charges).every(count => count >= 0));
        }
        check(`round ${n} move ${moves}: settles`, !result.timedOut);
        if (result.counted) check(`round ${n} move ${moves}: uses exactly one move`, state.movesLeft === before.movesLeft - 1, `${before.movesLeft} -> ${state.movesLeft}`);
        check(`round ${n} move ${moves}: charges never go below zero`, Object.values(state.charges).every(count => count >= 0), JSON.stringify(state.charges));
        check(`round ${n} move ${moves}: the mystery is never crossed out`, !state.out.includes(state.mysteryId));
        // Once, ask a question the way a player does: tap a color with a charge, then Ask.
        if (!askedOne && state.status === 'playing') {
          const asked = await evaluate(async () => {
            const chip = [...document.querySelectorAll('[aria-label="Charges"] button')].find(button => /: [1-9]\d* charge/.test(button.getAttribute('aria-label')));
            if (!chip) return null;
            chip.click();
            await new Promise(resolve => setTimeout(resolve, 250));
            const ask = [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent === 'Ask' && !button.disabled);
            if (!ask) { [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent === 'Close')?.click(); return { none: true }; }
            const before = window.__cc.clue();
            ask.click();
            await new Promise(resolve => setTimeout(resolve, 250));
            const after = window.__cc.clue();
            const links = document.querySelectorAll('main a[href^="http"], [role=dialog] a[href^="http"]').length;
            [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent === 'Close')?.click();
            return { asked: after.asked.length > before.asked.length, links, mysteryOut: after.out.includes(after.mysteryId) };
          });
          if (asked && !asked.none) {
            askedOne = true;
            check(`round ${n}: a question from its sheet gets answered`, asked.asked);
            check(`round ${n}: no source link while the round is on`, asked.links === 0, `${asked.links} links`);
            check(`round ${n}: an answer never crosses out the mystery`, !asked.mysteryOut);
            state = await evaluate(() => window.__cc.clue());
          }
        }
      }
      // Round 2 plays carelessly: spends nothing and guesses the mystery last, so wrong guesses,
      // the last chance (when notes were saved) and a lost round get played too.
      const careless = n === 2;
      // Out of moves: the spend panel covers the board; spend everything in it, one tap each.
      const spent = await evaluate(async careless => {
        const panel = document.querySelector('[aria-label="Spend your charges"]');
        if (!panel) return { panel: false };
        let taps = 0;
        for (let i = 0; i < (careless ? 0 : 60); i++) {
          const button = document.querySelector('[aria-label="Spend your charges"] button');
          if (!button) break;
          button.click();
          taps++;
          await new Promise(resolve => setTimeout(resolve, 60));
        }
        const clue = window.__cc.clue();
        return { panel: true, taps, clue, links: document.querySelectorAll('main a[href^="http"]').length, noScroll: document.documentElement.scrollHeight <= innerHeight + 1 };
      }, careless);
      check(`round ${n}: out of moves, the spend panel shows`, spent.panel);
      if (spent.panel) {
        check(`round ${n}: the board is locked out of moves`, await evaluate(() => window.__cc.state().locked));
        check(`round ${n}: the mystery is still standing`, !spent.clue.out.includes(spent.clue.mysteryId));
        check(`round ${n}: no source link out of moves`, spent.links === 0, `${spent.links} links`);
        check(`round ${n}: no page scroll`, spent.noScroll);
        await screenshot(`03-round-${n}-spend.png`);
      }
      // Guess the animals still standing, first to last, through each one's field guide (a last chance opens on the way if notes were saved).
      const guessed = await evaluate(async careless => {
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const guesses = [];
        let sawLastChance = false;
        for (let i = 0; i < 6 && !window.__cc.clue().end; i++) {
          const clue = window.__cc.clue();
          const order = careless ? [...clue.standing].sort((a, b) => Number(a === clue.mysteryId) - Number(b === clue.mysteryId)) : clue.standing;
          const id = order.find(candidate => !guesses.includes(candidate));
          const index = clue.candidateIds.indexOf(id);
          document.querySelectorAll('[aria-label="Possible animals"] button')[index].click();
          await wait(250);
          [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent.startsWith('Guess'))?.click();
          await wait(500);
          guesses.push(id);
          if (window.__cc.clue().status === 'last-chance') sawLastChance = sawLastChance || Boolean(document.querySelector('[aria-label="Last chance"]'));
        }
        return { guesses, clue: window.__cc.clue(), sawLastChance };
      }, careless);
      const end = guessed.clue.end;
      check(`round ${n}: the round ends`, Boolean(end), guessed.clue.status);
      if (careless && guessed.guesses.length > 1) {
        const standingAtGuess = spent.clue ? spent.clue.standing.length : 0;
        const notes = spent.clue ? spent.clue.notesCollected : 0;
        check(`round ${n}: a wrong final guess opens a last chance only with saved notes`, notes > 0 ? guessed.sawLastChance || standingAtGuess <= 2 : !guessed.sawLastChance, `${notes} notes, last chance ${guessed.sawLastChance}`);
        check(`round ${n}: a wrong guess ends the streak`, guessed.clue.streak === (end?.outcome === 'solved' ? 1 : 0), `streak ${guessed.clue.streak}`);
        if (end?.outcome === 'solved') check(`round ${n}: a last-chance solve scores 50 only`, !end.lastChance || end.points === 50, `${end.points}`);
      }
      const reveal = await waitFor(() => {
        const sheet = document.querySelector('section[aria-label^="It was the"]');
        if (!sheet) return null;
        const photo = sheet.querySelector('img');
        return {
          name: sheet.getAttribute('aria-label').replace('It was the ', ''), photo: photo ? photo.complete && photo.naturalWidth > 0 : 'no photo',
          redList: Boolean([...sheet.querySelectorAll('a')].find(a => a.textContent.includes('Red List'))),
          sources: sheet.querySelectorAll('a[href^="http"]').length, tree: sheet.innerText.includes('Animalia › Chordata'),
        };
      }, 'the reveal card', 10_000);
      await sleep(800);
      check(`round ${n}: the reveal names the mystery`, reveal.name === mysteryName, reveal.name);
      check(`round ${n}: the reveal photo loads`, reveal.photo !== false, String(reveal.photo));
      check(`round ${n}: the reveal links the Red List`, reveal.redList);
      check(`round ${n}: the reveal shows the family tree`, reveal.tree);
      check(`round ${n}: source links open after the round`, reveal.sources > 1, `${reveal.sources} links`);
      await screenshot(`04-round-${n}-reveal.png`);
      report.rounds.push({
        round: start.roundNo, mysteryId: start.mysteryId, mystery: mysteryName, candidates: start.candidateIds,
        outcome: end?.outcome, points: end?.points, lastChance: end?.lastChance, movesUsed: guessed.clue.movesUsed,
        questions: guessed.clue.asked.length, notesSaved: guessed.clue.notesCollected, treeSteps: guessed.clue.familyTreeSteps, treeStepsTaken: guessed.clue.treeStepsTaken,
        wrongGuesses: guessed.clue.wrongGuesses.length, score: guessed.clue.score,
      });
      console.log(`  round ${n}: ${mysteryName} ${end?.outcome ?? '?'}${end?.lastChance ? ' on a last chance' : ''}, ${guessed.clue.asked.length} questions, ${guessed.clue.wrongGuesses.length} wrong, +${end?.points ?? 0}`);
      if (n < ROUNDS) {
        await evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Next animal')?.click());
        await waitFor(round => window.__cc.clue().roundNo === round && window.__cc.clue().status === 'playing' && window.__cc.state().ready, 'the next round', 15_000, n + 1);
      }
    }

    // 2b. Naming the animal and starting the next one while gems still fall must leave the board showing the model's
    // board (a move from the old board used to keep animating on the new one).
    const race = await evaluate(async () => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const cc = window.__cc;
      const nextAnimal = () => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Next animal')?.click();
      nextAnimal();
      for (let i = 0; i < 60 && !(cc.state().ready && cc.clue().status === 'playing' && !cc.state().isResolvingMove); i++) await wait(250);
      const clue = cc.clue();
      const move = cc.validMoves().find(candidate => !candidate.trigger);
      if (!move) return null;
      cc.speed(0.15);
      const since = Date.now();
      const drag = cc.drag(move, { input: 'touch', timeoutMs: 30_000 });
      for (let i = 0; i < 120 && !cc.events(50).some(event => event.at >= since && event.name === 'gems-matched'); i++) await wait(25);
      document.querySelectorAll('[aria-label="Possible animals"] button')[clue.candidateIds.indexOf(clue.mysteryId)].click();
      await wait(150);
      [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent.startsWith('Guess'))?.click();
      await wait(300);
      nextAnimal();
      await drag.catch(() => undefined);
      cc.speed(4);
      for (let i = 0; i < 80 && (cc.state().isResolvingMove || !cc.state().ready); i++) await wait(100);
      await wait(800);
      const { grid, toys, view } = cc.state();
      const mismatches = [];
      grid.forEach((column, x) => column.forEach((gem, y) => {
        const toy = toys[x][y];
        const want = toy === 'color' ? 'toy_color' : toy ? `toy_${toy}_${gem}` : `gem_${gem}`;
        if (view[x]?.[y] !== want) mismatches.push([x, y, view[x]?.[y], want]);
      }));
      return { solvedId: clue.mysteryId, mismatches };
    });
    check('starting the next animal while gems fall leaves the board showing the real board', race && race.mismatches.length === 0, JSON.stringify(race?.mismatches?.slice(0, 3) ?? 'no move'));
    if (race) report.rounds.push({ round: 'race', mysteryId: race.solvedId, outcome: 'solved' });

    check('a big match leaves a toy on the board', toySeen);
    check('matching a toy sets it off', toyFired);

    // 3. The Field Journal lists what was solved (lost rounds aren't discoveries).
    const journal = await evaluate(async () => {
      document.querySelector('button[aria-label="Field journal"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 1200));
      return document.querySelector('[role=dialog] #journal-title')?.nextElementSibling?.textContent ?? '';
    });
    const found = new Set(report.rounds.filter(round => round.outcome === 'solved').map(round => round.mysteryId)).size;
    check('the journal counts the animals solved', journal.startsWith(`${found} of`), journal);
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
