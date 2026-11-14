// End-to-end play test. Headless Chrome plays the dev build like a player: the
// globe's continent list, then rounds of the animal board (plans 044 and 045) for one
// continent at /explore, driven through the real board (window.__cc, dev only) and
// the real evidence grid and buttons. It checks the rules a player relies on after every
// move and writes a repeatable artifact:
//   e2e-artifacts/<run>/report.json   what was played, every check, errors
//   e2e-artifacts/<run>/*.png         what the player saw
//   (the newest 10 runs are kept)
// Same seed and place, same mysteries and boards. Resume uses its own fixed seed.
// Sources (plan 2026-11-07-fact-sources): every round-end card's and journal's fact numbers resolve to a closed
// Sources list; an AmphibiaWeb-sourced animal (found by probing seeds) shows its full CC BY-NC citation.
//
//   npm run e2e:fresh  starts its own dev server (scripts/e2e-fresh.mjs)
//   npm run e2e        against a running `npm run dev`. env: E2E_BASE_URL, E2E_SEED (7), E2E_RESUME_SEED (7), E2E_ROUNDS (4), E2E_PLACE (a continent key, e.g. continent:africa), E2E_CPU_THROTTLE (slow Chrome down N times, like a CI runner), CHROME_PATH
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openPage, startBrowser } from './cdp.mjs';

const BASE = (process.env.E2E_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
const SEED = Number(process.env.E2E_SEED ?? 7);
const RESUME_SEED = Number(process.env.E2E_RESUME_SEED ?? 7);
const ROUNDS = Number(process.env.E2E_ROUNDS ?? 4);
const MAX_MOVES = 45;
const CPU_THROTTLE = Number(process.env.E2E_CPU_THROTTLE ?? 1);

const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-seed${SEED}`;
const outDir = path.join(process.cwd(), 'e2e-artifacts', runId);
const report = { base: BASE, seed: SEED, cpuThrottle: CPU_THROTTLE, place: null, viewport: '390x844 mobile touch', startedAt: new Date().toISOString(), rounds: [], checks: [], consoleErrors: [], failedRequests: [], screenshots: [] };
// A kind of check: its name without numbers ("round 1 move 40: ..." -> "round N move N: ..."). One FAIL line per kind.
const kind = name => name.replace(/\d+/g, 'N');
const failKinds = new Set();
const check = (name, ok, detail = '') => {
  report.checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });
  if (!ok && !failKinds.has(kind(name))) { failKinds.add(kind(name)); console.log(`  FAIL ${name}${detail ? `: ${detail}` : ''}`); }
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const KEEP_RUNS = 10;
/** Which category asks each trait prefix, as the game says (PREFIX_CATEGORY): what the player should see on screen. */
const CATEGORY = { size: 'body', covering: 'body', diet: 'habits', activity: 'habits', social: 'habits', trees: 'habits', system: 'habitat', habitat: 'habitat', region: 'range', birth: 'life', young: 'life', lifespan: 'life' };
const CATEGORY_WORD = { body: 'Body', habits: 'Habits', habitat: 'Habitat', range: 'Range', life: 'Life cycle' };
const CATEGORY_ORDER = Object.keys(CATEGORY_WORD);
/** Plan 058: a list of sign groups beside the photo runs in the guide's category order, each led by one icon (its own). */
const signGroupProblems = (where, groups) => groups.flatMap((group, i) => {
  const problems = [];
  if (i > 0 && CATEGORY_ORDER.indexOf(group.cat) <= CATEGORY_ORDER.indexOf(groups[i - 1].cat)) problems.push(`${where}: ${group.cat} after ${groups[i - 1].cat}`);
  if (!CATEGORY_ORDER.includes(group.cat) || group.marks !== 1 || group.first !== group.cat || group.tags.length === 0) problems.push(`${where}: group ${group.cat} has ${group.marks} marks, first ${group.first}, ${group.tags.length} chips`);
  return problems;
});
/** Plan 058: a sheet's sign pages (from __allPages) as P1 wants them: each page's groups as signGroupProblems wants and
 * fitting the box, numbered 1..n, and joined (a run continuing the last page's group merged into it) equal to the list. */
const pagingProblems = sheet => {
  const problems = sheet.pages.flatMap(page => [...signGroupProblems(`page ${page.page}`, page.shown), ...(page.fits ? [] : [`page ${page.page} overflows`])]);
  const numbers = sheet.pages.map(page => page.page).join();
  if (numbers !== sheet.pages.map((_, i) => i + 1).join() || sheet.pages.some(page => page.pages !== sheet.pages.length)) problems.push(`pages ${numbers} of ${sheet.pages[0]?.pages}`);
  const joined = sheet.pages.flatMap(page => page.shown).reduce((runs, group) => {
    const last = runs.at(-1);
    if (last?.cat === group.cat) last.tags.push(...group.tags);
    else runs.push({ cat: group.cat, tags: [...group.tags] });
    return runs;
  }, []);
  const want = sheet.all.map(({ cat, tags }) => ({ cat, tags }));
  if (JSON.stringify(joined) !== JSON.stringify(want)) problems.push(`pages ${JSON.stringify(joined)} != list ${JSON.stringify(want)}`);
  return problems;
};
/** A paged sheet's breaks, judged from the measuring list's chip offsets (P2). T is the top of page k's first chip, F page
 * k+1's first chip. A split (same group both sides) must be forced: F didn't fit, and the group is page k's only run or
 * taller than a page. A new group whose first chip would have fitted is a move: the group must fit a page whole and must
 * not have fitted on page k. Otherwise page k was full. */
const pageBreaks = sheet => {
  const height = sheet.pages[0].height;
  const chips = new Map(sheet.all.flatMap(group => group.tags.map((tag, i) => [tag, { top: group.boxes[i].top, bottom: group.boxes[i].top + group.boxes[i].height }])));
  const extent = new Map(sheet.all.map(group => {
    const boxes = group.tags.map(tag => chips.get(tag));
    return [group.cat, { top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)) }];
  }));
  const span = cat => extent.get(cat).bottom - extent.get(cat).top;
  return sheet.pages.slice(0, -1).map((page, k) => {
    const before = page.shown, after = sheet.pages[k + 1].shown;
    const T = chips.get(before[0].tags[0]).top, F = chips.get(after[0].tags[0]), last = before.at(-1), next = after[0];
    const kind = last.cat === next.cat ? 'split' : F.bottom - T <= height ? 'move' : 'full';
    const ok = kind === 'split' ? F.bottom - T > height && (before.length === 1 || span(next.cat) > height)
      : kind === 'move' ? span(next.cat) <= height && extent.get(next.cat).bottom - T > height : true;
    return { id: sheet.id, kind, ok, at: `${last.cat}: ${last.tags.join(' · ')} | ${next.cat}: ${next.tags.join(' · ')}` };
  });
};
/** The grid's sort, from `rows` facts (window.__gridFacts): out below; no contradiction above any; more matches higher; then the card's number. */
const sortFacts = (facts, view = fact => fact) => [...facts]
  .sort((a, b) => a.out - b.out || view(a).contradicted - view(b).contradicted || view(b).matches - view(a).matches || a.number - b.number)
  .map(fact => fact.id);
const sameList = (a, b) => a.join() === b.join();

/** Keeps the newest KEEP_RUNS runs in e2e-artifacts/ (run names sort by time). */
function pruneArtifacts() {
  const root = path.dirname(outDir);
  const runs = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  for (const run of runs.slice(0, -KEEP_RUNS)) rmSync(path.join(root, run), { recursive: true, force: true });
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
  const { browser, close } = await startBrowser();
  try {
    const { sessionId, page, evaluate, waitFor } = await openPage(browser);
    if (CPU_THROTTLE > 1) await page('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });

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
    await page('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.setItem('critter-connect:animal-board-how-to:v5', '1'); localStorage.setItem('critter-connect:slide-hint:v1', '1'); } catch {}" });
    // Plan 045: an animal's name in the grid takes a drag of its photo (rule out / back in) and a long press (its field guide).
    await page('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__pill = id => document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + id + '"] button[data-pill]');
      window.__slidePill = async (id, distance, from = 10) => {
        const pill = window.__pill(id);
        const frame = () => new Promise(res => requestAnimationFrame(res));
        // The row reads the slide's direction from its own mark, so wait until it shows a mark just made.
        const showsOut = () => /, (ruled out|released)$/.test(pill.getAttribute('aria-label'));
        for (let i = 0; i < 100 && showsOut() !== window.__cc.clue().marked.includes(id); i++) await new Promise(res => setTimeout(res, 50));
        const r = pill.getBoundingClientRect();
        const y = r.top + r.height / 2;
        const at = (type, x) => pill.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }));
        const handle = pill.querySelector('[data-handle]');
        const overPhoto = from <= handle.clientWidth;
        at('pointerdown', r.left + from);
        // Over the photo, passing 10 px starts the slide and ends the hold timer, so the rest spans painted frames.
        // From the name it stays a press, kept to one turn: a press this long on a slow machine would be a long press.
        for (let x = 10; x <= distance; x += 10) {
          at('pointermove', r.left + from + x);
          if (overPhoto && x >= 20) await frame();
        }
        if (overPhoto) await frame();
        const dragged = { moved: parseFloat(handle.style.transform.replace('translateX(', '')) || 0, track: Boolean(pill.parentElement.querySelector(':scope > span[aria-hidden]')) };
        at('pointerup', r.left + from + distance);
        pill.click();
        await new Promise(res => setTimeout(res, 250));
        return dragged;
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
      // Names an animal from its field guide ("It's this one!", then yes); returns the ask's text.
      window.__nameIt = async id => {
        await window.__holdPill(id);
        document.querySelector('[role=dialog] button[data-name-it]')?.click();
        await new Promise(res => setTimeout(res, 250));
        const confirm = document.querySelector('[role=dialog] [data-name-confirm]');
        const text = confirm?.innerText ?? '';
        [...(confirm?.querySelectorAll('button') ?? [])].find(other => other.textContent !== 'Back')?.click();
        await new Promise(res => setTimeout(res, 500));
        return text;
      };
      // Polls instead of a fixed wait: a loaded machine runs a hold's timer late, and a finger lifted before it fires is a tap.
      window.__until = async (ok, ms = 4000) => { for (const end = Date.now() + ms; !ok() && Date.now() < end;) await new Promise(res => setTimeout(res, 30)); return ok(); };
      // The live sort: the rows as drawn, and what the screen shows for each animal (the Camera row's stamped answers, the
      // scouted cells, never data-answer or the rules' row). \`cheat\` is what knowing the hidden cells would give.
      window.__rows = () => [...document.querySelectorAll('table[aria-label="Evidence"] tr[data-suspect]')].map(row => Number(row.dataset.suspect));
      window.__keyMark = (id, ruledOut) => window.__pill(id).dispatchEvent(new KeyboardEvent('keydown', { key: ruledOut ? 'ArrowRight' : 'ArrowLeft', bubbles: true }));
      window.__gridFlying = () => [...document.querySelectorAll('table[aria-label="Evidence"] tr[data-mystery] td[data-tag]')].some(td => (td.dataset.answer ? !/YES|NO/.test(td.textContent) : !td.textContent.startsWith(td.dataset.have + '/')));
      window.__gridFacts = () => {
        const grid = document.querySelector('table[aria-label="Evidence"]');
        if (!grid) return null;
        const clue = window.__cc.clue();
        const camera = Object.fromEntries([...grid.querySelectorAll('tr[data-mystery] td[data-tag]')].map(td => [td.dataset.tag, /YES/.test(td.textContent) ? 'yes' : /NO/.test(td.textContent) ? 'no' : null]));
        const rows = window.__rows();
        const facts = clue.suspects.flatMap((id, number) => {
          const row = grid.querySelector('tr[data-suspect="' + id + '"]');
          if (!row) return [];
          const seen = { matches: 0, contradicted: false };
          const cheat = { matches: 0, contradicted: false };
          for (const order of clue.orders) {
            const answer = camera[order.tag];
            if (!answer) continue;
            const tally = (to, same) => { if (same) to.matches++; else to.contradicted = true; };
            tally(cheat, order.row[number] === (answer === 'yes'));
            const td = row.querySelector('td[data-tag="' + order.tag + '"]');
            if (!td.hasAttribute('data-hidden')) tally(seen, (td.dataset.yes === 'true') === (answer === 'yes'));
          }
          return [{ id, number, out: clue.marked.includes(id) || clue.released.includes(id), ...seen, cheat }];
        });
        // The number a row wears, on its card and in its name, against the animal's place in the rules.
        const numbers = rows.map(id => {
          const pill = window.__pill(id);
          return { id, want: clue.suspects.indexOf(id) + 1, card: Number(pill.querySelector('.animal-card-num')?.textContent), label: Number(pill.getAttribute('aria-label').split(':')[0]) };
        });
        const board = document.querySelector('section[aria-label="Game board"]')?.getBoundingClientRect();
        return { rows, facts, numbers, height: Math.round(grid.getBoundingClientRect().height), board: board ? [Math.round(board.width), Math.round(board.height)] : null };
      };
      // Waits out the gems in flight, so the grid has shown all a move did.
      window.__gridRest = async () => {
        for (let i = 0; i < 80 && window.__gridFlying(); i++) await new Promise(res => setTimeout(res, 50));
        for (let i = 0; i < 2; i++) await new Promise(res => requestAnimationFrame(res));
      };
      // The rows on the last frame the grid was live, on the frame before the mystery's row began to rise, whether any frame since differs, and of the round-end replay.
      window.__reviewRows = () => [...document.querySelectorAll('table[aria-label="How the evidence lined up"] tr[data-suspect]')].map(row => Number(row.dataset.suspect));
      (function trackLiveRows() {
        const grid = document.querySelector('table[aria-label="Evidence"]');
        if (grid) {
          const rows = [...grid.querySelectorAll('tr[data-suspect]')].map(row => Number(row.dataset.suspect));
          if (!grid.querySelector('tr[data-suspect].z-30, tr[data-mystery][data-match]')) {
            window.__endRows = null;
            window.__movedInRise = false;
          } else {
            window.__endRows ??= window.__lastLiveRows ?? rows; // the frame before the rise (a reload can open on the rise)
            const inBoth = (list, other) => list.filter(id => other.includes(id)).join();
            if (inBoth(rows, window.__endRows) !== inBoth(window.__endRows, rows)) window.__movedInRise = true;
          }
          window.__lastLiveRows = rows;
        }
        requestAnimationFrame(trackLiveRows);
      })();
      // Every re-order from here until stopped, and whether gems were still flying when it came.
      window.__watchRows = () => {
        const changes = [];
        let last = window.__rows().join();
        const observer = new MutationObserver(() => {
          const now = window.__rows().join();
          if (now !== last) changes.push({ at: Date.now(), flying: window.__gridFlying(), from: last, to: now });
          last = now;
        });
        observer.observe(document.querySelector('table[aria-label="Evidence"] tbody'), { childList: true });
        window.__stopWatchingRows = () => { observer.disconnect(); return changes; };
      };
      // The home globe's spin (window.__globe, dev only): one sample a frame from here until stopped, and the fps.
      window.__watchGlobe = () => {
        const samples = window.__globeSamples = [];
        let on = true;
        const tick = () => {
          if (!on) return;
          const map = window.__globe;
          if (map) samples.push({ t: performance.now(), lng: map.getCenter().lng, zoom: map.getZoom(), moving: map.isMoving() });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        window.__stopWatchingGlobe = () => {
          on = false;
          const span = samples.length > 1 ? samples.at(-1).t - samples[0].t : 0;
          return { samples, fps: span ? Math.round((samples.length - 1) * 1000 / span) : 0 };
        };
      };
      // The spin's speed over one window, re-anchored at its start (so the anchor stays near the centre, off the limb):
      // degrees of longitude a second at the view's centre, and how fast that ground crosses the screen.
      window.__globeRate = async (ms = 500) => {
        const map = window.__globe;
        const frame = () => new Promise(res => requestAnimationFrame(res));
        await frame();
        const anchor = map.getCenter();
        const x0 = map.project(anchor).x;
        const t0 = performance.now();
        await new Promise(res => setTimeout(res, ms));
        await frame();
        const s = (performance.now() - t0) / 1000;
        const dLng = ((map.getCenter().lng - anchor.lng + 540) % 360) - 180;
        return { degPerS: dLng / s, pxPerS: (x0 - map.project(anchor).x) / s, zoom: map.getZoom() };
      };
    ` });

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
      // The dev build's Next badge isn't the game: hide it for the shot (the site uses these, plan 051 §9).
      // Next re-adds a removed <nextjs-portal>, so a style hides it, and goes after the shot.
      await evaluate(() => document.head.insertAdjacentHTML('beforeend', '<style id="e2e-no-badge">nextjs-portal { display: none !important; }</style>'));
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      await evaluate(() => document.getElementById('e2e-no-badge')?.remove());
      writeFileSync(path.join(outDir, name), Buffer.from(data, 'base64'));
      report.screenshots.push(name);
    };
    // Sources (plan 2026-11-07-fact-sources §6). Every fact list in `scope`, in one DOM read: each line's source numbers,
    // the Sources list's entries, whether it's open and its summary.
    const CARD = 'section[aria-labelledby="end-title"]';
    const JOURNAL = '[role=dialog]';
    const readSources = scope => evaluate(scope => [...document.querySelectorAll(`${scope} ul[data-sourced-facts]`)].map(list => {
      const details = list.nextElementSibling?.matches('details[data-sources]') ? list.nextElementSibling : null;
      return {
        lines: [...list.children].map(li => [...li.querySelectorAll('[data-source-mark]')].map(mark => Number(mark.dataset.sourceMark))),
        entries: details ? [...details.querySelectorAll('[data-source-entry]')].map(entry => Number(entry.dataset.sourceEntry)) : [],
        open: details?.open ?? null, summary: details?.querySelector('summary')?.textContent ?? null,
      };
    }), scope);
    const sourcesProblem = list => {
      if (list.lines.some(line => line.length !== 1)) return 'a fact line without exactly one number';
      const order = [...new Set(list.lines.flat())];
      const oneToN = order.map((_n, i) => i + 1);
      if (!sameList(order, oneToN)) return 'the numbers don\'t run 1..n in order of first use';
      if (!sameList(list.entries, oneToN)) return 'the numbers and the Sources entries differ';
      if (list.open !== false) return 'Sources isn\'t closed at first';
      if (list.summary !== `Sources (${list.entries.length})`) return 'the summary isn\'t "Sources (n)"';
      return null;
    };
    // A number on the first list, tapped (`click`) or Enter on it (`Enter`, a real key press), with Sources closed first:
    // Sources opens, focus is on that number's entry, and the entry is in its scroller's view.
    const jumpToSource = async (scope, how) => {
      const target = await evaluate(({ scope, how }) => {
        const list = document.querySelector(`${scope} ul[data-sourced-facts]`);
        const marks = [...(list?.querySelectorAll('[data-source-mark]') ?? [])];
        if (!list?.nextElementSibling?.matches('details[data-sources]') || marks.length === 0) return null;
        list.nextElementSibling.open = false;
        // Enter goes to another number than the tap's, when there is one.
        const mark = how === 'click' ? marks[0] : marks.findLast(other => other.dataset.sourceMark !== marks[0].dataset.sourceMark) ?? marks.at(-1);
        if (how === 'click') mark.click(); else mark.focus();
        return Number(mark.dataset.sourceMark);
      }, { scope, how });
      if (target === null) return null;
      if (how === 'Enter') {
        await page('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
        await page('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      }
      return evaluate(async ({ scope, target }) => {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const details = document.querySelector(`${scope} ul[data-sourced-facts]`).nextElementSibling;
        const active = document.activeElement;
        let scroller = active?.parentElement;
        while (scroller && !(/auto|scroll/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight)) scroller = scroller.parentElement;
        const box = active.getBoundingClientRect();
        const view = scroller?.getBoundingClientRect() ?? { top: 0, bottom: innerHeight };
        return { target, open: details.open, focused: active?.dataset.sourceEntry ?? null, inSources: details.contains(active), inView: box.top >= Math.max(view.top, 0) - 1 && box.bottom <= Math.min(view.bottom, innerHeight) + 1 };
      }, { scope, target });
    };
    /** The Sources checks on every fact list in `scope`; the jumps on its first. Returns how many lists it saw. */
    const checkSources = async (label, scope, required = true) => {
      const lists = await readSources(scope);
      if (required || lists.length) {
        const problems = lists.map(sourcesProblem);
        check(`${label}: sources: every fact line has one number, the numbers run 1..n by first use and match the closed "Sources (n)" list`, lists.length > 0 && problems.every(problem => problem === null), JSON.stringify({ lists: lists.length, problems: problems.filter(Boolean), first: lists[0] }));
      }
      if (!lists.length) return 0;
      for (const how of ['click', 'Enter']) {
        const jump = await jumpToSource(scope, how);
        check(`${label}: sources: ${how === 'click' ? 'tapping' : 'Enter on'} a number opens Sources and focuses its entry, in view`, Boolean(jump) && jump.open && jump.inSources && jump.focused === String(jump.target) && jump.inView, JSON.stringify(jump));
      }
      return lists.length;
    };
    // While the round-end card is open, the facts live on the card: the status line (sampled for one dwell, ~4 s) never
    // rotates the clue facts, and the desktop witness notes aren't drawn.
    const reviewHidesFacts = () => evaluate(async () => {
      const seen = { samples: 0, ticker: false, clue: null, sideNotes: false };
      for (const end = Date.now() + 4000; Date.now() < end; await new Promise(resolve => setTimeout(resolve, 200))) {
        const ticker = document.querySelector('button[aria-label="Pause the clue line"]');
        seen.samples++;
        seen.ticker ||= Boolean(ticker);
        seen.clue ??= ticker?.textContent.match(/Clue \d+ of \d+/)?.[0] ?? null;
        seen.sideNotes ||= Boolean(document.getElementById('side-notes'));
      }
      return seen;
    });
    const sideNotesAt = async (width, height, mobile) => {
      await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await sleep(800);
      return evaluate(() => ({ wide: matchMedia('(min-width: 64rem)').matches, sideNotes: Boolean(document.getElementById('side-notes')) }));
    };
    const PHONE = [390, 844, true];
    // Runs `shoot(mode)` in the light theme, then the dark one, and puts back the theme the device had.
    const inThemes = async shoot => {
      const theme = await evaluate(() => ({ data: document.documentElement.dataset.theme ?? null, stored: localStorage.getItem('critter-connect:theme') }));
      for (const mode of ['light', 'dark']) {
        await evaluate(mode => { document.documentElement.dataset.theme = mode; localStorage.setItem('critter-connect:theme', mode); }, mode);
        await shoot(mode);
      }
      await evaluate(({ data, stored }) => {
        if (data) document.documentElement.dataset.theme = data; else delete document.documentElement.dataset.theme;
        if (stored) localStorage.setItem('critter-connect:theme', stored); else localStorage.removeItem('critter-connect:theme');
      }, theme);
    };
    // The menu's Auto rule-out switch, set to `on` (opens the menu unless it's already open, then closes it),
    // with what was stored on the device before and after.
    const autoSwitch = on => evaluate(async on => {
      const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
      const KEY = 'critter-connect:auto-rule-out:v1';
      const find = () => [...document.querySelectorAll('[role=switch]')].find(b => b.textContent === 'Auto rule-out');
      const storedBefore = localStorage.getItem(KEY);
      if (!find()) {
        document.querySelector('button[aria-label="Menu"]')?.click();
        await wait(250);
      }
      const button = find();
      const before = button?.getAttribute('aria-checked') ?? null;
      if (button && (before === 'true') !== on) button.click();
      await wait(100);
      const after = button?.getAttribute('aria-checked') ?? null;
      const storedAfter = localStorage.getItem(KEY);
      [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
      await wait(250);
      return { before, after, storedBefore, storedAfter };
    }, on);

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
    const listedAt = Date.now();
    await sleep(1500);
    await screenshot('01-globe.png');

    // 1b. The globe's spin (plan 2026-11-07-globe-spin-resume): input pauses it, it rests, then eases back in.
    // Real touches and keys through CDP at the globe's centre. A deterministic gesture holds still 300 ms before
    // lifting, so it leaves no momentum; only the fling lifts while moving.
    const IDLE_MS = 3000, EASE_MS = 1500, FULL_ZOOM = 1; // mirror of src/components/globe/globeSpin.ts; change both
    const IDLE_WINDOW = [IDLE_MS - 500, IDLE_MS + 4000]; // the pause before the spin returns, as measured
    const STILL_DEG = 1e-6;
    const inIdleWindow = gap => gap >= IDLE_WINDOW[0] && gap <= IDLE_WINDOW[1];
    const dLng = (from, to) => ((to - from + 540) % 360) - 180;
    const pageNow = () => evaluate(() => performance.now());
    const globeView = () => evaluate(() => ({ lng: window.__globe.getCenter().lng, zoom: window.__globe.getZoom() }));
    // Each sample's lng unwrapped across ±180, and its kind: momentum (the map is moving: a gesture or its ease),
    // spin (not moving, yet lng changed since the sample before) or still.
    const classify = samples => {
      let shift = 0;
      const unwrapped = samples.map((sample, i) => {
        if (i) shift -= 360 * Math.round((sample.lng - samples[i - 1].lng) / 360);
        return { ...sample, lng: sample.lng + shift };
      });
      return unwrapped.map((sample, i) => ({ ...sample, kind: sample.moving ? 'momentum' : i && Math.abs(sample.lng - unwrapped[i - 1].lng) >= STILL_DEG ? 'spin' : 'still' }));
    };
    const watchGlobe = () => evaluate(() => window.__watchGlobe());
    const stopWatchingGlobe = async () => {
      const { samples, fps } = await evaluate(() => window.__stopWatchingGlobe());
      return { samples: classify(samples), fps };
    };
    const isStill = samples => samples.length > 1 && samples.every(sample => Math.abs(sample.lng - samples[0].lng) < STILL_DEG && sample.zoom === samples[0].zoom);
    /** Watches (already started) until the first spin sample, then `after` ms more; gives up after `ms`. */
    const untilSpin = async (ms, after = 0) => {
      const end = Date.now() + ms;
      for (let seen = []; Date.now() < end; await sleep(100)) {
        seen = seen.concat(await evaluate(from => window.__globeSamples.slice(from), seen.length));
        if (classify(seen).some(sample => sample.kind === 'spin')) break;
      }
      await sleep(after);
      return stopWatchingGlobe();
    };
    /** The spin's return: its first sample, the still one before it (where the player left the view) and the rest before it, from `since` or the last input-driven move. */
    const spinReturn = (samples, since) => {
      const i = samples.findIndex(sample => sample.kind === 'spin');
      if (i < 1) return null;
      const lastMoving = samples.slice(0, i).findLast(sample => sample.kind === 'momentum');
      return { first: samples[i], rest: samples[i - 1], gap: Math.round(samples[i].t - Math.max(since, lastMoving?.t ?? -Infinity)) };
    };
    const touch = (type, points = []) => page('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
    const mouse = (type, x, y) => page('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
    const key = async (keyName, keyCode) => {
      for (const type of ['keyDown', 'keyUp']) await page('Input.dispatchKeyEvent', { type, key: keyName, code: keyName, windowsVirtualKeyCode: keyCode });
    };
    await waitFor(() => Boolean(window.__globe), 'the globe (window.__globe; is this a dev build?)');
    const [cx, cy, globeTop] = await evaluate(() => {
      const box = document.querySelector('section[aria-label="Globe"]').getBoundingClientRect();
      return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2), Math.round(box.top)];
    });
    const centreHit = await evaluate((x, y) => document.elementFromPoint(x, y)?.className ?? null, cx, cy);

    await watchGlobe();
    const firstSpin = spinReturn((await untilSpin(Math.max(0, 10_000 - (Date.now() - listedAt)))).samples, 0);
    const startRate = firstSpin ? await evaluate(() => window.__globeRate(1000)) : null;
    check('the globe spins on its own', Boolean(firstSpin) && startRate.degPerS > 0, JSON.stringify({ degPerS: startRate?.degPerS.toFixed(2), within10s: Boolean(firstSpin) }));

    const beforeDrag = await globeView();
    await touch('touchStart', [[cx, cy]]);
    for (let x = 10; x <= 150; x += 10) {
      await touch('touchMove', [[cx + x, cy]]);
      await sleep(16);
    }
    await sleep(300);
    const dragged = dLng(beforeDrag.lng, (await globeView()).lng);
    check('a drag moves the globe while it was spinning', dragged < -10, JSON.stringify({ dLng: dragged.toFixed(1), at: [cx, cy], hit: centreHit }));

    await watchGlobe();
    await sleep(IDLE_MS + 1000);
    await screenshot('01b-globe-held.png');
    const held = await stopWatchingGlobe();
    check('a finger holding the globe keeps it still', isStill(held.samples), JSON.stringify({ heldMs: IDLE_MS + 1000, samples: held.samples.length, fps: held.fps, dLng: held.samples.length ? dLng(held.samples[0].lng, held.samples.at(-1).lng) : null }));
    await touch('touchEnd');

    await watchGlobe();
    await touch('touchStart', [[cx + 80, cy]]);
    for (let x = 40; x <= 160; x += 40) {
      await sleep(16);
      await touch('touchMove', [[cx + 80 - x, cy]]);
    }
    await touch('touchEnd');
    const flungAt = await pageNow();
    // Headless Chrome on a slow GPU (SwiftShader) draws the moving globe at a few fps, and MapLibre's inertia keeps only
    // moves from the last 160 ms, so a fling there may get no momentum: the rest counts from the later of the lift and the momentum's end.
    const fling = await untilSpin(5000 + IDLE_WINDOW[1], 1000);
    const flingReturn = spinReturn(fling.samples, flungAt);
    const momentum = fling.samples.filter(sample => sample.kind === 'momentum' && sample.t > flungAt);
    const flungDeg = flingReturn ? flingReturn.rest.lng - fling.samples[0].lng : 0;
    check('after a fling, the globe rests about 3 s once its momentum ends, then spins again', flungDeg > 10 && inIdleWindow(flingReturn.gap), JSON.stringify({ flungDeg: flungDeg.toFixed(1), momentumMs: momentum.length ? Math.round(momentum.at(-1).t - flungAt) : 0, restMs: flingReturn?.gap, window: IDLE_WINDOW, fps: fling.fps }));

    // The steady speed, after the ease: the baseline for the zoomed-in check.
    let baseRate = null;
    let easeIn = null;
    if (flingReturn) {
      const { first, rest } = flingReturn;
      const later = fling.samples.find(sample => sample.t >= rest.t + 250);
      easeIn = later ? (later.lng - rest.lng) / ((later.t - rest.t) / 1000) : null;
      await sleep(Math.max(0, first.t + EASE_MS + 200 - await pageNow()));
      baseRate = await evaluate(() => window.__globeRate(1500)); // several frames even at a few fps
    }
    await screenshot('01c-globe-spin-back.png');
    const spinBack = flingReturn && { jumpDeg: Math.abs(flingReturn.first.lng - flingReturn.rest.lng), zoomChange: Math.abs(flingReturn.first.zoom - flingReturn.rest.zoom), easeInDegPerS: easeIn, degPerS0: baseRate?.degPerS, pxPerS0: baseRate?.pxPerS, zoom0: baseRate?.zoom };
    // A snap would land somewhere else; the eased first step at a few fps moves up to ~0.15°.
    check('the spin comes back where the player left it, at their zoom, easing in', Boolean(spinBack) && spinBack.jumpDeg < 0.5 && spinBack.zoomChange < 1e-6 && easeIn !== null && baseRate.degPerS > 0 && easeIn < 0.4 * baseRate.degPerS, JSON.stringify(spinBack));

    await evaluate(() => document.querySelector('.maplibregl-canvas').focus());
    const beforeKey = await globeView();
    const keyAt = await pageNow();
    await key('ArrowLeft', 37);
    await watchGlobe();
    await sleep(1000);
    const keyed = dLng(beforeKey.lng, (await globeView()).lng);
    const keyReturn = spinReturn((await untilSpin(IDLE_WINDOW[1] + 1000)).samples, keyAt);
    check('arrow keys move the globe while it spins, then the spin returns', keyed < -5 && Boolean(keyReturn) && inIdleWindow(keyReturn.gap), JSON.stringify({ dLng: keyed.toFixed(1), restMs: keyReturn?.gap, window: IDLE_WINDOW }));

    // Two fingers spread 60 -> 240 px apart (zoom +2), then hold still.
    const beforePinch = await globeView();
    await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
    for (let half = 45; half <= 120; half += 15) {
      await sleep(16);
      await touch('touchMove', [[cx - half, cy], [cx + half, cy]]);
    }
    await sleep(300);
    await watchGlobe();
    await sleep(1000);
    const pinchHeld = await stopWatchingGlobe();
    const pinchZoom = (await globeView()).zoom - beforePinch.zoom;
    check('a pinch zooms in and holds the globe still', pinchZoom >= 1.5 && isStill(pinchHeld.samples), JSON.stringify({ zoomFrom: beforePinch.zoom.toFixed(2), dZoom: pinchZoom.toFixed(2), samples: pinchHeld.samples.length, fps: pinchHeld.fps }));

    // Lift finger 2 only: CDP releases the points a touchMove no longer lists.
    await touch('touchMove', [[cx - 120, cy]]);
    await watchGlobe();
    await sleep(IDLE_MS + 1000);
    const halfHeld = await stopWatchingGlobe();
    await touch('touchEnd');
    const liftedAt = await pageNow();
    await watchGlobe();
    const liftReturn = spinReturn((await untilSpin(IDLE_WINDOW[1] + 1000)).samples, liftedAt);
    check('lifting one finger of a pinch keeps the globe still while the other stays down', isStill(halfHeld.samples) && Boolean(liftReturn) && inIdleWindow(liftReturn.gap), JSON.stringify({ heldMs: IDLE_MS + 1000, samples: halfHeld.samples.length, restMs: liftReturn?.gap, window: IDLE_WINDOW }));

    // Ratios against check 5's baseline, so the headless frame rate cancels out.
    let zoomRate = null;
    if (liftReturn && baseRate) {
      await sleep(Math.max(0, liftReturn.first.t + EASE_MS + 200 - await pageNow()));
      zoomRate = await evaluate(() => window.__globeRate(1500));
    }
    await screenshot('01d-globe-zoomed-spin.png');
    const zoomed = zoomRate && {
      zoom0: baseRate.zoom, zoom1: zoomRate.zoom, degPerS1: zoomRate.degPerS, pxPerS1: zoomRate.pxPerS,
      degRatio: zoomRate.degPerS / baseRate.degPerS, wantDegRatio: 2 ** -(zoomRate.zoom - Math.max(baseRate.zoom, FULL_ZOOM)),
      pxRatio: zoomRate.pxPerS / baseRate.pxPerS,
    };
    check('zoomed in, the spin is slower in degrees but about as fast on screen', Boolean(zoomed) && Math.abs(zoomed.degRatio / zoomed.wantDegRatio - 1) <= 0.3 && zoomed.pxRatio >= 0.7 && zoomed.pxRatio <= 1.4, JSON.stringify(zoomed));

    // Pick the continent to play: the globe flies to it, then holds still.
    await evaluate(name => [...document.querySelectorAll('ul button')].find(button => button.textContent.includes(name)).click(), place.name);
    await waitFor(() => !window.__globe.isMoving() && Boolean(document.querySelector('button[aria-label="Back to all places"]')), 'the pick\'s flight to end', 15_000);
    await watchGlobe();
    await sleep(IDLE_MS + EASE_MS + 1000);
    const picked = await stopWatchingGlobe();
    check('a picked place holds the globe still', isStill(picked.samples), JSON.stringify({ place: place.key, heldMs: IDLE_MS + EASE_MS + 1000, samples: picked.samples.length, zoom: picked.samples[0]?.zoom.toFixed(2) }));

    const backAt = await pageNow();
    await watchGlobe();
    await evaluate(() => document.querySelector('button[aria-label="Back to all places"]').click());
    const backReturn = spinReturn((await untilSpin(IDLE_WINDOW[1] + 1000)).samples, backAt);
    check('back to all places lets the spin return after the pause', Boolean(backReturn) && inIdleWindow(backReturn.gap), JSON.stringify({ restMs: backReturn?.gap, window: IDLE_WINDOW }));

    // Released off the globe, over the header, then held still: MapLibre ends its pan only on a mouseup over the map,
    // so the controller forwards the release; without that the drag stays active and the spin never returns.
    const off = [40, globeTop - 20];
    const offHit = await evaluate((x, y) => document.elementFromPoint(x, y)?.getAttribute('alt') ?? document.elementFromPoint(x, y)?.tagName ?? null, ...off);
    const beforeMouse = await globeView();
    await mouse('mousePressed', cx, cy);
    for (let i = 1; i <= 10; i++) {
      await mouse('mouseMoved', Math.round(cx + (off[0] - cx) * i / 10), Math.round(cy + (off[1] - cy) * i / 10));
      await sleep(16);
    }
    await sleep(300);
    const mouseDragged = dLng(beforeMouse.lng, (await globeView()).lng);
    await mouse('mouseReleased', ...off);
    const releasedAt = await pageNow();
    await watchGlobe();
    const mouseReturn = spinReturn((await untilSpin(IDLE_WINDOW[1] + 1000)).samples, releasedAt);
    check('a mouse drag released off the globe lets the spin return', Math.abs(mouseDragged) > 5 && Boolean(mouseReturn) && inIdleWindow(mouseReturn.gap), JSON.stringify({ dLng: mouseDragged.toFixed(1), releasedOn: offHit, restMs: mouseReturn?.gap, window: IDLE_WINDOW }));

    // Reduced motion, last in the block: the emulation is cleared before the game.
    const reduceMotion = on => page('Emulation.setEmulatedMedia', { features: on ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [] });
    const spinningBefore = Boolean(mouseReturn);
    await reduceMotion(true);
    await sleep(300);
    await watchGlobe();
    await sleep(1000);
    const reduced = await stopWatchingGlobe();
    check('turning reduced motion on stops the spin at once', spinningBefore && isStill(reduced.samples), JSON.stringify({ spinningBefore, samples: reduced.samples.length, fps: reduced.fps }));

    await goto(`${BASE}/`);
    await waitFor(() => Boolean(window.__globe) && document.querySelectorAll('ul button').length > 0, 'the globe after a reload', 30_000);
    await watchGlobe();
    await sleep(4500);
    const reducedLoad = await stopWatchingGlobe();
    const beforeReducedDrag = await globeView();
    await touch('touchStart', [[cx, cy]]);
    for (let x = 10; x <= 150; x += 10) {
      await touch('touchMove', [[cx + x, cy]]);
      await sleep(16);
    }
    await sleep(300);
    await touch('touchEnd');
    const reducedDragged = dLng(beforeReducedDrag.lng, (await globeView()).lng);
    await watchGlobe();
    await sleep(5000);
    const reducedAfter = await stopWatchingGlobe();
    await reduceMotion(false);
    check('with reduced motion the globe never spins', isStill(reducedLoad.samples) && reducedDragged < -10 && isStill(reducedAfter.samples), JSON.stringify({ loadSamples: reducedLoad.samples.length, dLng: reducedDragged.toFixed(1), afterSamples: reducedAfter.samples.length }));

    // A tap while the map still loads: its idle pause outlives the load. The land data is held back so the tap
    // comes first; if the map has loaded by the tap anyway, the check fails rather than pass without testing.
    let heldLand = null;
    browser.on(message => { if (message.sessionId === sessionId && message.method === 'Fetch.requestPaused') heldLand = message.params.requestId; });
    await page('Fetch.enable', { patterns: [{ urlPattern: '*world-land.geojson*' }] });
    await goto(`${BASE}/`);
    await waitFor(() => Boolean(window.__globe), 'the globe after a reload', 30_000);
    for (const end = Date.now() + 15_000; !heldLand && Date.now() < end;) await sleep(50);
    await evaluate(() => { window.__globeLoadAt = null; window.__globe.once('load', () => { window.__globeLoadAt = performance.now(); }); });
    await touch('touchStart', [[cx, cy]]);
    await sleep(100);
    await touch('touchEnd');
    const tapAt = await pageNow();
    const loadedAtTap = await evaluate(() => window.__globe.loaded());
    await sleep(500);
    if (heldLand) await page('Fetch.continueRequest', { requestId: heldLand });
    await page('Fetch.disable');
    await watchGlobe();
    const loadReturn = spinReturn((await untilSpin(IDLE_WINDOW[1] + 5000)).samples, tapAt);
    const loadAt = await evaluate(() => window.__globeLoadAt);
    const loadGap = loadAt === null ? null : Math.round(loadAt - tapAt);
    check('a tap just before the globe loads keeps its idle pause', Boolean(heldLand) && !loadedAtTap && loadGap > 0 && Boolean(loadReturn) && inIdleWindow(loadReturn.gap), JSON.stringify({ landHeld: Boolean(heldLand), loadedAtTap, loadMsAfterTap: loadGap, restMs: loadReturn?.gap, window: IDLE_WINDOW }));

    // 2. The animal board for that continent (plan 044).
    // A ?seed= game is never saved, so each load deals the same round 1 afresh (localStorage carries over).
    const loadBoard = async () => {
      await goto(`${BASE}/explore/?seed=${SEED}&place=${encodeURIComponent(place.key)}`);
      await waitFor(() => window.__cc?.clue?.() && window.__cc.state().ready && window.__cc.state().pins.length === 5, 'the animal board (window.__cc; is this a dev build?)', 60_000);
      await evaluate(() => window.__cc.speed(4));
      await sleep(2500); // the animal photos load
    };
    await loadBoard();
    await screenshot('02-board.png');
    const poolData = await evaluate(async () => {
      const pool = await (await fetch('/api/clue-game/pool/')).json();
      // Each animal's signs: the open tags (no colon) on its clues.
      const open = {};
      for (const clue of pool.clues) for (const tag of clue.compareTags) if (!tag.includes(':')) (open[clue.speciesId] ??= new Set()).add(tag);
      return {
        species: pool.species.map(s => [s.id, { name: s.commonName, scientificName: s.scientificName, family: s.family, genus: s.genus }]),
        open: Object.entries(open).map(([id, tags]) => [Number(id), [...tags]]),
      };
    });
    const poolSpecies = new Map(poolData.species);
    const openTags = new Map(poolData.open);
    const names = new Map([...poolSpecies].map(([id, species]) => [id, species.name]));
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
    // Auto rule-out is on unless the player turned it off: this run's Chrome profile is new, so nothing is stored yet.
    await evaluate(async () => {
      document.querySelector('button[aria-label="Menu"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 250));
    });
    await screenshot('02-menu-fresh-profile.png');
    const fresh = await autoSwitch(false);
    check(`a new profile (nothing stored) starts with Auto rule-out on, and its switch turns it off and stores 'off'`, fresh.storedBefore === null && fresh.before === 'true' && fresh.after === 'false' && fresh.storedAfter === 'off', JSON.stringify(fresh));
    await loadBoard();
    const storedOff = await autoSwitch(true);
    check(`a stored 'off' starts off after a reload, and the switch turns it back on`, storedOff.storedBefore === 'off' && storedOff.before === 'false' && storedOff.after === 'true' && storedOff.storedAfter === 'on', JSON.stringify(storedOff));
    await loadBoard();
    const storedOn = await autoSwitch(false); // left off: round 1's grid checks below run as before
    check(`a stored 'on' starts on after a reload`, storedOn.storedBefore === 'on' && storedOn.before === 'true', JSON.stringify(storedOn));
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
    // 351px wide and under (`narrow`, globals.css): the grid shows initials for the names, fitting beside the cards.
    await page('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 2, mobile: true });
    await sleep(800);
    const narrow = await evaluate(() => {
      const grid = document.querySelector('table[aria-label="Evidence"]');
      const board = document.querySelector('section[aria-label="Game board"]')?.getBoundingClientRect();
      const rows = [...(grid?.querySelectorAll('tr[data-mystery], tr[data-suspect]') ?? [])].map(row => Math.round(row.getBoundingClientRect().height));
      const initials = [...(grid?.querySelectorAll('[data-name] [aria-hidden]') ?? [])].map(name => ({ text: name.textContent, shown: name.getClientRects().length > 0, fits: name.parentElement.scrollWidth <= name.parentElement.clientWidth }));
      return grid && board ? { viewport: [innerWidth, innerHeight], rows, initials, board: [Math.round(board.width), Math.round(board.height)] } : null;
    });
    await screenshot('02-board-320x720.png');
    check('on a 320px-wide phone the grid shows names as initials that fit, its rows keep one height and the board keeps at least 280 px', Boolean(narrow) && narrow.initials.length === 5 && narrow.initials.every(name => name.shown && name.fits && name.text) && Math.max(...narrow.rows) - Math.min(...narrow.rows) <= 1 && Math.min(...narrow.board) >= 280, JSON.stringify(narrow));
    // Board size beats grid reflow (owner, PR #44): the grid can't squeeze the gems. Floors measured 2026-11-02, the same on seeds 7, 11, 23.
    const sizes = [];
    for (const [width, height, floor] of [[320, 720, 40], [340, 720, 46], [351, 720, 47], [352, 720, 48], [360, 740, 49], [375, 548, 35], [375, 667, 44], [390, 844, 53]]) {
      await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
      await sleep(800);
      const size = await evaluate(() => {
        const [left, right] = [window.__cc.cellCenter(0, 0), window.__cc.cellCenter(1, 0)];
        const grid = document.querySelector('table[aria-label="Evidence"]');
        const rows = [...grid.querySelectorAll('tr[data-mystery], tr[data-suspect]')].map(row => row.getBoundingClientRect().height);
        const camera = grid.querySelector('tr[data-mystery] button');
        return { gem: Math.round(right.x - left.x), rowSpread: Math.max(...rows) - Math.min(...rows), cameraClip: camera.scrollWidth - camera.clientWidth };
      });
      sizes.push({ viewport: [width, height], floor, ...size });
      check(`at ${width}x${height} the gems stay at least ${floor} px, the grid's rows one height and "On camera" unclipped`, size.gem >= floor && size.rowSpread <= 1 && size.cameraClip <= 0, JSON.stringify(size));
    }
    await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(800);
    report.layout = { phone: fit, small, narrow, sizes };

    const journalFinds = new Set();
    let previewChecked = false;
    let scoutChecked = false;
    let hintChecked = false;
    let notesChecked = false;
    let markShot = false;
    let calledShot = false;
    let autoBackChecked = false;
    // Which of the sort's rules this run really saw decide two rows (real boards, so a run must meet each).
    const sortSaw = { contradiction: false, matches: false, tie: false, ruledOut: false, hiddenWouldMove: false, frozenOutOfOrder: false };
    const noteSort = ({ rows, facts }) => {
      const place = id => rows.indexOf(id);
      for (const a of facts) for (const b of facts) {
        if (a.number >= b.number) continue; // a has the lower number, so it'd be above b if nothing else decided
        const flipped = place(a.id) > place(b.id);
        if (flipped && a.out && !b.out) sortSaw.ruledOut = true;
        if (a.out || b.out) continue;
        if (flipped && a.contradicted && !b.contradicted) sortSaw.contradiction = true;
        if (flipped && a.contradicted === b.contradicted && b.matches > a.matches) sortSaw.matches = true;
        if (!flipped && a.contradicted === b.contradicted && a.matches === b.matches && a.matches > 0) sortSaw.tie = true;
      }
      if (!sameList(sortFacts(facts), sortFacts(facts, fact => fact.cheat))) sortSaw.hiddenWouldMove = true;
    };
    let pagingShot = null;
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
      // A yes/no trait's `no` is recorded, never asked (plan 055: trees:no).
      check(`round ${n}: no column asks a "no" value`, screen.columns.every(tag => !tag.endsWith(':no')), screen.columns.join());
      check(`round ${n}: the grid doesn't name the mystery while it's hidden`, screen.mystery.includes('On camera') && !screen.mystery.includes(mysteryName), screen.mystery);
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
        // Holding an answer cell highlights it (no pencil) and glows its gem on the board next to that animal only; holding again clears both.
        const highlight = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const grid = document.querySelector('table[aria-label="Evidence"]');
          const first = grid.querySelector('tr[data-suspect] td[data-hidden]');
          const id = first.closest('tr').dataset.suspect;
          const tag = first.dataset.tag;
          const at = () => grid.querySelector(`tr[data-suspect="${id}"] td[data-tag="${tag}"]`);
          const gem = window.__cc.clue().orders.find(order => order.tag === tag).gem;
          // The board's last glow: this gem next to this animal only, nothing board-wide (the header gem stays plain).
          const glow = () => {
            const last = window.__cc.events(200).filter(e => e.name === 'clue-board-highlight').at(-1)?.payload;
            const near = last?.near.find(([other]) => String(other) === id)?.[1] ?? [];
            return { near: near.includes(gem), all: (last?.all.length ?? 0) > 0, header: Boolean(grid.querySelector(`th[data-tag="${tag}"] .ev-glow`)) };
          };
          const hold = async () => {
            const button = at().querySelector('button');
            const r = button.getBoundingClientRect();
            const opts = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
            const was = at().hasAttribute('data-highlight');
            button.dispatchEvent(new PointerEvent('pointerdown', opts));
            await window.__until(() => at().hasAttribute('data-highlight') !== was);
            const during = at().hasAttribute('data-highlight');
            button.dispatchEvent(new PointerEvent('pointerup', opts));
            button.click();
            await window.__until(() => window.__cc.clue().highlight.length === (was ? 0 : 1));
            await wait(200);
            return during;
          };
          const during = await hold();
          const on = { during, cell: at().dataset.highlight === 'true', glow: glow(), pencil: at().dataset.pencil, state: window.__cc.clue().highlight.join() };
          await hold();
          return { on, off: { cell: at().hasAttribute('data-highlight'), glow: glow(), pencil: at().dataset.pencil, state: window.__cc.clue().highlight.length }, key: `${id}:${tag}` };
        });
        check('holding an answer cell highlights it (before release) and glows its gem (no pencil); holding again clears it',
          highlight.on.during && highlight.on.cell && highlight.on.glow.near && !highlight.on.glow.all && !highlight.on.glow.header && highlight.on.pencil === '' && highlight.on.state === highlight.key
            && !highlight.off.cell && !highlight.off.glow.near && highlight.off.pencil === '' && highlight.off.state === 0,
          JSON.stringify(highlight));
        // Holding a question's gem up top highlights it and glows its gem board-wide; holding again clears it (opens no sheet).
        const column = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const head = document.querySelector('table[aria-label="Evidence"] thead th[data-tag]');
          const tag = head.dataset.tag;
          const gem = window.__cc.clue().orders.find(order => order.tag === tag).gem;
          const all = () => (window.__cc.events(200).filter(e => e.name === 'clue-board-highlight').at(-1)?.payload.all ?? []).includes(gem);
          const hold = async () => {
            const button = head.querySelector('button');
            const r = button.getBoundingClientRect();
            const opts = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
            const was = head.hasAttribute('data-highlight');
            button.dispatchEvent(new PointerEvent('pointerdown', opts));
            await window.__until(() => head.hasAttribute('data-highlight') !== was);
            button.dispatchEvent(new PointerEvent('pointerup', opts));
            button.click();
            await window.__until(() => window.__cc.clue().highlight.length === (was ? 0 : 1));
            await wait(200);
          };
          await hold();
          const on = { head: head.dataset.highlight === 'true', glow: Boolean(head.querySelector('.ev-glow')), all: all(), sheet: document.querySelectorAll('[role=dialog]').length };
          await hold();
          return { on, off: { head: head.hasAttribute('data-highlight'), all: all(), state: window.__cc.clue().highlight.length } };
        });
        check('holding a question gem highlights it and glows its gems board-wide (no sheet); holding again clears it',
          column.on.head && column.on.glow && column.on.all && column.on.sheet === 0 && !column.off.head && !column.off.all && column.off.state === 0, JSON.stringify(column));
        await screenshot('02a-hidden.png');
        // The field guide offers a pencil mark for each hidden answer.
        const guide = await evaluate(async () => {
          const row = document.querySelector('table[aria-label="Evidence"] tr[data-suspect]');
          await window.__holdPill(row.dataset.suspect);
          const notScouted = document.querySelectorAll('[role=dialog] button[data-pencil-guide="yes"]').length;
          return { hidden: row.querySelectorAll('td[data-hidden]').length, notScouted };
        });
        await sleep(1000); // its photo loads
        await screenshot('02d-field-guide.png');
        const onePage = await evaluate(() => { const box = document.querySelector('[role=dialog] [data-guide-signs]'); return { pages: Number(box?.dataset.guideSigns ?? 0), signs: box?.querySelectorAll('[data-sign-measure] [data-sign]').length ?? 0 }; });
        check('field guide: the 02d shot\'s sheet shows its signs on one page', onePage.signs > 0 && onePage.pages === 1, JSON.stringify(onePage));
        // Plan 055: the sheet during play, light and dark: its top, then scrolled to the guide's category rows.
        await inThemes(async mode => {
          for (const [shot, rows] of [['02d-field-guide', false], ['02e-field-guide-rows', true]]) {
            await evaluate(rows => {
              if (rows) document.querySelector('[role=dialog] [data-guide-cat] dt')?.scrollIntoView({ block: 'start' });
              else document.querySelector('[role=dialog] [data-guide-swipe]')?.scrollIntoView({ block: 'end' });
            }, rows);
            await sleep(300);
            await screenshot(`${shot}-${mode}.png`);
          }
        });
        await evaluate(() => document.querySelector('[role=dialog] [data-guide-swipe]')?.scrollIntoView({ block: 'end' }));
        await evaluate(async () => {
          [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
          await new Promise(resolve => setTimeout(resolve, 250));
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
          const current = () => {
            const h2 = document.querySelector('[role=dialog] h2');
            // drawer height / top of the scrolling body (the photo row sits at its top)
            heights.add(`${Math.round(h2.closest('.rounded-t-m').getBoundingClientRect().height)}/${Math.round(header().nextElementSibling.getBoundingClientRect().top)}`);
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
          // The longest name in the content (30 chars) fits whole without moving the body.
          const name = document.querySelector('[role=dialog] [data-guide-name]');
          name.textContent = 'Yangtze Giant Softshell Turtle';
          current();
          result.longName = { clipped: name.scrollWidth > name.clientWidth || name.scrollHeight > name.clientHeight || header().scrollWidth > header().clientWidth };
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
        check('field guide: the longest name shows whole', !flip.longName.clipped, JSON.stringify(flip));
        // Plan 058: each of the 5 guides, during play. Signs sit beside the photo in category groups (one icon each), none
        // hidden, none in the guide rows; the guide's own lines for a dealt question stay hidden (plan 045) while that
        // category's signs show.
        let sheetTiles = [];
        const sheets = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          // A category mark as the e2e sees it: its category and its icon's lucide-* class.
          window.__mark = el => { const mark = el.querySelector('[data-category-mark]'); return { cat: mark?.dataset.categoryMark ?? null, icon: [...(mark?.querySelector('svg')?.classList ?? [])].filter(c => c.startsWith('lucide-')).sort().join(' ') }; };
          // The open sheet's signs beside the photo: the measuring list (with chip offsets), the page showing (read once the
          // crossfade has left exactly one), whether it fits the box, the screen-reader list and the pause state.
          window.__signs = async () => {
            const box = () => document.querySelector('[role=dialog] [data-guide-signs]');
            if (!box()) return null;
            await window.__until(() => box().querySelectorAll('[data-sign-page]').length === 1);
            const b = box(), rect = b.getBoundingClientRect(), shown = b.querySelector('[data-sign-page]');
            const groupsOf = (ul, offsets) => [...ul.children].map(li => {
              const chips = [...li.querySelectorAll('[data-sign]')];
              return { cat: li.dataset.signGroup ?? null, first: li.firstElementChild?.dataset.categoryMark ?? null, marks: li.querySelectorAll('[data-category-mark]').length, icon: window.__mark(li).icon, tags: chips.map(chip => chip.dataset.sign), offsetHeight: li.offsetHeight, ...(offsets ? { boxes: chips.map(chip => ({ top: chip.offsetTop, height: chip.offsetHeight })) } : {}) };
            });
            const fits = [...shown.querySelectorAll('[data-sign]')].every(chip => {
              const r = chip.getBoundingClientRect();
              return r.top >= rect.top - 1 && r.bottom <= rect.bottom + 1 && r.left >= rect.left - 1 && r.right <= rect.right + 1 && r.height <= 2 * parseFloat(getComputedStyle(chip).lineHeight);
            });
            const button = b.querySelector('button[aria-label="Pause the signs"]');
            return {
              pages: Number(b.dataset.guideSigns), page: Number(shown.dataset.signPage), height: b.clientHeight,
              all: groupsOf(b.querySelector('[data-sign-measure]'), true), shown: groupsOf(shown, false), fits,
              sr: [...b.querySelectorAll('[data-sign-list] li')].map(li => li.textContent),
              counter: b.previousElementSibling?.querySelector('.font-data')?.textContent ?? null,
              pressed: button?.getAttribute('aria-pressed') ?? null, mark: Boolean(b.previousElementSibling?.querySelector('svg')),
            };
          };
          // Every page of the open sheet's signs, in page order: pause, then turn one page at a time (tap resumes and turns,
          // a second tap pauses again). A tap is pointerdown/up then click, so the photo row's drag guard lets it through.
          const pause = () => document.querySelector('[role=dialog] [data-guide-signs] button[aria-label="Pause the signs"]');
          const tap = el => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' })); el.click(); };
          const turn = async () => { tap(pause()); await wait(50); tap(pause()); await wait(450); };
          window.__allPages = async () => {
            const first = await window.__signs();
            if (!first || first.pages < 2) return first ? [first] : [];
            tap(pause()); await wait(50);
            const read = [await window.__signs()];
            for (let k = 1; k < first.pages; k++) { await turn(); read.push(await window.__signs()); }
            return read.sort((a, b) => a.page - b.page);
          };
          // Pauses the open sheet's signs on page k (for a shot) and returns what shows.
          window.__signPage = async k => {
            if (pause().getAttribute('aria-pressed') !== 'true') { tap(pause()); await wait(50); }
            for (let i = 0; i < 5 && (await window.__signs()).page !== k; i++) await turn();
            const { page, pages, pressed, mark, counter } = await window.__signs();
            return { page, pages, pressed, mark, counter };
          };
          // Closes the field guide and drops the pick it made.
          window.__closeGuide = async () => {
            [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
            await wait(300);
            const pressed = document.querySelector('table[aria-label="Evidence"] button[data-pill][aria-pressed="true"]');
            if (pressed) pressed.click();
            await wait(150);
          };
          window.__tiles = [...document.querySelectorAll('table[aria-label="Evidence"] thead th[data-tag]')].map(th => ({ tag: th.dataset.tag, label: th.querySelector('button')?.getAttribute('aria-label') ?? '', ...window.__mark(th) }));
          await window.__holdPill(document.querySelector('table[aria-label="Evidence"] tr[data-suspect]').dataset.suspect);
          const { suspects } = window.__cc.clue();
          const read = [];
          for (let i = 1; i <= suspects.length; i++) {
            document.querySelector(`[role=dialog] [data-guide-number="${i}"]`).click();
            await wait(300);
            const dialog = document.querySelector('[role=dialog]');
            const pages = await window.__allPages();
            read.push({
              id: suspects[i - 1],
              status: window.__cc.clue().status,
              pages,
              all: pages[0]?.all ?? [],
              sr: pages[0]?.sr ?? [],
              outside: [...dialog.querySelectorAll('[data-sign]')].filter(li => !li.closest('[data-guide-swipe] [data-guide-signs]')).length,
              rows: [...dialog.querySelectorAll('[data-guide-cat]')].map(row => ({ cat: row.dataset.guideCat, mark: row.querySelector('dt [data-category-mark]')?.dataset.categoryMark ?? null, lines: row.querySelectorAll('[data-guide-line]').length })),
              linePrefixes: [...dialog.querySelectorAll('[data-guide-line]')].flatMap(line => line.dataset.guideLine.split(' ').filter(Boolean)),
              answers: [...dialog.querySelectorAll('[data-answer-tag]')].map(li => ({ tag: li.dataset.answerTag, ...window.__mark(li) })),
              headings: [...dialog.querySelectorAll('[data-guide-cat] dt')].map(dt => window.__mark(dt)),
            });
          }
          await window.__closeGuide();
          return { read, tiles: window.__tiles };
        }).then(({ read, tiles }) => { sheetTiles = tiles; return read; });
        { const dealt = start.orders.map(order => order.tag.split(':')[0]);
          const groupOf = new Map();
          const bad = sheets.flatMap(sheet => {
            const shown = sheet.all.flatMap(group => group.tags).sort().join();
            const want = [...(openTags.get(sheet.id) ?? [])].sort().join();
            const problems = [];
            if (sheet.status !== 'playing') problems.push('not playing');
            if (sheet.outside > 0) problems.push(`${sheet.outside} outside the box beside the photo`);
            if (shown !== want) problems.push(`shown ${shown} != its signs ${want}`);
            problems.push(...signGroupProblems('all', sheet.all), ...sheet.pages.flatMap(page => signGroupProblems(`page ${page.page}`, page.shown)));
            for (const group of sheet.all) for (const tag of group.tags) {
              if (groupOf.has(tag) && groupOf.get(tag) !== group.cat) problems.push(`${tag} in ${group.cat} here, ${groupOf.get(tag)} elsewhere`);
              groupOf.set(tag, group.cat);
            }
            if (sheet.sr.length !== sheet.all.length || sheet.all.some((group, i) => !sheet.sr[i]?.startsWith(`${CATEGORY_WORD[group.cat]}: `))) problems.push(`screen-reader list ${JSON.stringify(sheet.sr)}`);
            for (const row of sheet.rows) if (row.mark !== row.cat || row.lines === 0) problems.push(`row ${row.cat}: mark ${row.mark}, ${row.lines} lines`);
            return problems.length ? [{ id: sheet.id, problems }] : [];
          });
          check('field guide: signs sit beside the photo, grouped in the guide\'s category order, one icon per group before its chips; none hidden, none in the guide rows', sheets.length === 5 && bad.length === 0, JSON.stringify(bad.length ? bad : sheets.map(sheet => [sheet.id, sheet.all.map(group => `${group.cat}:${group.tags.length}`).join(' '), `${sheet.pages.length} page(s)`])));
          const overflowing = sheets.flatMap(sheet => sheet.pages.filter(page => !page.fits).map(page => `${sheet.id} page ${page.page}`));
          check('field guide: the signs showing fit beside the photo, chips one line tall', overflowing.length === 0, JSON.stringify(overflowing));
          const leaked = sheets.flatMap(sheet => sheet.linePrefixes.filter(prefix => dealt.includes(prefix)).map(prefix => `${sheet.id}:${prefix}`));
          const bearing = sheets.flatMap(sheet => dealt.filter(prefix => sheet.all.some(group => group.cat === CATEGORY[prefix])).map(prefix => `${sheet.id}:${prefix}`));
          check('field guide: a dealt question\'s guide lines stay hidden while its category\'s signs show beside the photo', leaked.length === 0 && bearing.length > 0, JSON.stringify({ dealt, leaked, bearing }));
          // E3: each question tile, its "Its answers" row and its category's guide heading carry the same mark.
          const iconOf = new Map(sheets.flatMap(sheet => sheet.headings).filter(h => h.cat).map(h => [h.cat, h.icon]));
          const mismatched = sheetTiles.flatMap(tile => {
            const problems = [];
            if (tile.cat !== CATEGORY[tile.tag.split(':')[0]] || !tile.icon) problems.push(`tile ${tile.cat} ${tile.icon}`);
            if (!tile.label.startsWith(`${CATEGORY_WORD[tile.cat]}: `)) problems.push(`label "${tile.label}"`);
            for (const sheet of sheets) {
              const row = sheet.answers.find(answer => answer.tag === tile.tag);
              if (!row || row.cat !== tile.cat || row.icon !== tile.icon) problems.push(`${sheet.id} answer ${JSON.stringify(row)}`);
            }
            if (iconOf.has(tile.cat) && iconOf.get(tile.cat) !== tile.icon) problems.push(`heading ${iconOf.get(tile.cat)}`);
            return problems.length ? [{ tag: tile.tag, problems }] : [];
          });
          const headingMatches = sheetTiles.filter(tile => iconOf.get(tile.cat) === tile.icon).length;
          const headingsOneIcon = sheets.every(sheet => sheet.headings.every(h => !iconOf.has(h.cat) || iconOf.get(h.cat) === h.icon));
          // ...and each sign group beside the photo leads with that same icon.
          const tileIcon = new Map(sheetTiles.map(tile => [tile.cat, tile.icon]));
          const groups = sheets.flatMap(sheet => sheet.all.map(group => ({ id: sheet.id, ...group })));
          const groupMismatch = groups.filter(group => !group.icon || (tileIcon.has(group.cat) && tileIcon.get(group.cat) !== group.icon) || (iconOf.has(group.cat) && iconOf.get(group.cat) !== group.icon)).map(group => `${group.id} ${group.cat} ${group.icon}`);
          const groupMatches = groups.filter(group => tileIcon.get(group.cat) === group.icon).length;
          check('each question tile, its answer row, its guide heading and its sign group carry the same category icon', sheetTiles.length === start.orders.length && mismatched.length === 0 && headingMatches > 0 && headingsOneIcon && groupMismatch.length === 0 && groupMatches > 0, JSON.stringify({ mismatched, groupMismatch, headingMatches, groupMatches, tiles: sheetTiles.map(tile => [tile.tag, tile.cat, tile.icon]) })); }
        // Plan 058, paging. Every sheet's signs, read page by page from a fresh guide; `force` pins the box at w x h px
        // (re-split by its ResizeObserver) and lets go after.
        const guideSheets = force => evaluate(async force => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          await window.__holdPill(document.querySelector('table[aria-label="Evidence"] tr[data-suspect]').dataset.suspect);
          const { suspects } = window.__cc.clue();
          const read = [];
          for (let i = 1; i <= suspects.length; i++) {
            document.querySelector(`[role=dialog] [data-guide-number="${i}"]`).click();
            await wait(300);
            const box = document.querySelector('[role=dialog] [data-guide-signs]');
            if (force && box) { Object.assign(box.style, { flex: 'none', width: `${force[0]}px`, height: `${force[1]}px` }); await wait(300); }
            const pages = await window.__allPages();
            if (force && box) box.removeAttribute('style');
            read.push({ id: suspects[i - 1], all: pages[0]?.all ?? [], pages });
          }
          await window.__closeGuide();
          return read;
        }, force);
        // The forced box: 2 chip lines tall (so a group can move), narrow enough for multi-line groups (so one can split).
        const FORCED = [144, 40];
        const forced = await guideSheets(FORCED);
        { const bad = forced.flatMap(sheet => {
            const problems = pagingProblems(sheet);
            if (sheet.pages.some(page => page.height !== FORCED[1])) problems.push(`box ${sheet.pages.map(page => page.height).join()} px`);
            return problems.length ? [{ id: sheet.id, problems }] : [];
          });
          const paged = forced.filter(sheet => sheet.pages.length > 1);
          check('field guide: signs that don\'t fit split into pages; each part follows its icon, in category order, and fits; the pages together are the list, in order', forced.length === 5 && paged.length > 0 && bad.length === 0, JSON.stringify(bad.length ? bad : forced.map(sheet => [sheet.id, sheet.pages.map(page => page.shown.map(group => `${group.cat}: ${group.tags.join(' · ')}`).join(' / ')).join(' | ')])));
          const breaks = paged.flatMap(pageBreaks);
          const count = kind => breaks.filter(b => b.kind === kind).length;
          check('field guide: a sign group that fits on a page starts the next page whole; a longer one breaks at a line and repeats its icon; no break comes early', count('split') >= 1 && count('move') >= 1 && breaks.every(b => b.ok), JSON.stringify({ splits: count('split'), moves: count('move'), bad: breaks.filter(b => !b.ok).length, breaks })); }
        // P3: the sheet with the most signs, its box forced so it pages: the pages turn on their own; a tap pauses (the mark
        // shows, the page holds); another resumes and moves on. The next animal's box starts on page 1, not paused.
        const most = forced.reduce((best, sheet, i) => sheet.all.flatMap(group => group.tags).length > forced[best].all.flatMap(group => group.tags).length ? i : best, 0) + 1;
        const turns = await evaluate(async ({ most, force }) => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const box = () => document.querySelector('[role=dialog] [data-guide-signs]');
          const shown = () => Number([...(box()?.querySelectorAll('[data-sign-page]') ?? [])].at(-1)?.dataset.signPage ?? 0);
          const button = () => box()?.querySelector('button[aria-label="Pause the signs"]');
          const state = () => ({ page: shown(), pressed: button()?.getAttribute('aria-pressed') ?? null, mark: Boolean(box()?.previousElementSibling?.querySelector('svg')) });
          const tap = el => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' })); el.click(); };
          const number = i => { document.querySelector(`[role=dialog] [data-guide-number="${i}"]`).click(); return wait(300); };
          await window.__holdPill(document.querySelector('table[aria-label="Evidence"] tr[data-suspect]').dataset.suspect);
          await number(most === 1 ? 2 : 1);
          await number(most); // a fresh mount: page 1, not paused
          Object.assign(box().style, { flex: 'none', width: `${force[0]}px`, height: `${force[1]}px` });
          await window.__until(() => Number(box().dataset.guideSigns) > 1);
          const result = { pages: Number(box().dataset.guideSigns), start: state() };
          result.turned = await window.__until(() => shown() === 2, 5600);
          tap(button()); await wait(100);
          result.paused = state();
          await wait(5600);
          result.held = state();
          tap(button());
          await window.__until(() => shown() !== result.held.page, 1000);
          result.resumed = state();
          box().removeAttribute('style');
          await number(most % 5 + 1);
          result.next = box() ? { page: shown(), pressedTrue: Boolean(box().querySelector('[aria-pressed="true"]')) } : null;
          await window.__closeGuide();
          return result;
        }, { most, force: FORCED });
        check('field guide: signs in pages turn on their own, a tap pauses them, another resumes and moves on', turns.pages > 1 && turns.start.page === 1 && turns.start.pressed === 'false' && turns.turned && turns.paused.pressed === 'true' && turns.paused.mark && turns.held.page === turns.paused.page && turns.resumed.pressed === 'false' && !turns.resumed.mark && turns.resumed.page !== turns.held.page && (!turns.next || (turns.next.page === 1 && !turns.next.pressedTrue)), JSON.stringify({ sheet: most, ...turns }));
        // S3: on a 320 px phone the natural box is narrower; long lists page there instead of overflowing.
        await sideNotesAt(320, 720, true);
        const narrow = await guideSheets(null);
        await sideNotesAt(...PHONE);
        { const bad = narrow.flatMap(sheet => { const problems = pagingProblems(sheet); return problems.length ? [{ id: sheet.id, problems }] : []; });
          check('field guide: on a 320 px phone the signs page instead of overflowing: every page fits, groups and icons as at 390, the pages together are the list', narrow.length === 5 && narrow.some(sheet => sheet.pages.length > 1) && bad.length === 0, JSON.stringify(bad.length ? bad : narrow.map(sheet => [sheet.id, sheet.pages.map(page => page.shown.map(group => `${group.cat}: ${group.tags.join(' · ')}`).join(' / ')).join(' | ')]))); }
        // A long press on a board tile opens the field guide too.
        const tileHeld = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const [[cell, id]] = window.__cc.state().pins;
          // Waits on what's on screen, not a fixed time: a busy machine opens the guide late, after a Close click.
          const until = async (ok, ms = 3000) => { for (const end = Date.now() + ms; !ok() && Date.now() < end;) await wait(50); return ok(); };
          await window.__cc.tap(cell, { input: 'touch', holdMs: 700 });
          await until(() => document.querySelector('[role=dialog] h2')?.textContent);
          const title = document.querySelector('[role=dialog] h2')?.textContent ?? '';
          const picked = window.__pill(id)?.getAttribute('aria-pressed') === 'true';
          [...document.querySelectorAll('[role=dialog] button')].find(b => b.getAttribute('aria-label') === 'Close')?.click();
          const closed = await until(() => !document.querySelector('[role=dialog]'));
          return { id, title, picked, closed, held: window.__cc.events(50).some(e => e.name === 'clue-board-tile-hold' && e.payload?.id === id) };
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
          const dragged = await window.__slidePill(id, 120);
          const out = window.__cc.clue().marked.includes(id);
          const heightOut = gridHeight();
          await window.__slidePill(id, 120);
          const back = window.__cc.clue().marked.includes(id);
          return { short, fromName, out, back, dragged, picked: window.__pill(id).getAttribute('aria-pressed'), before, heightOut };
        });
        check('while dragged, an animal\'s photo follows the finger over its track', slid.dragged?.moved > 10 && slid.dragged?.track, JSON.stringify(slid.dragged));
        check('ruling an animal out doesn\'t change the grid\'s height (the board keeps its size)', slid.heightOut === slid.before, JSON.stringify(slid));
        check('dragging an animal\'s photo a little does nothing; from its name, nothing; all the way rules it out; again brings it back', !slid.short && !slid.fromName && slid.out && !slid.back && slid.picked === 'false', JSON.stringify(slid));
        check('a long press on a board tile opens that animal\'s field guide without picking it', tileHeld.held && tileHeld.title?.endsWith(names.get(tileHeld.id)) && !tileHeld.picked, JSON.stringify(tileHeld));
        check('its Close button closes that field guide (it would cover the board)', tileHeld.closed, JSON.stringify(tileHeld));
        // The live sort, on the real grid. Ruling out through the keyboard is what changes the order here: it needs no
        // finger, so a finger can be down elsewhere while it happens.
        const [a, b, c, d, e] = start.suspects;
        const sorting = await evaluate(async ([a, b, c, name]) => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const MOVE_MS = 500; // a row's slide and a margin
          const rows = window.__rows;
          const rowOf = id => document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + id + '"]');
          const tops = () => rows().map(id => rowOf(id).getBoundingClientRect().top);
          const result = { start: rows() };
          // Ruled out sinks, with its animation, its number and the keyboard's focus; a second sits below by number; both come back.
          window.__pill(a).focus();
          const pillA = window.__pill(a);
          window.__keyMark(a, true);
          let slid = false;
          for (const end = Date.now() + 300; Date.now() < end;) { await new Promise(resolve => requestAnimationFrame(resolve)); if (getComputedStyle(rowOf(a)).transform !== 'none') slid = true; }
          await wait(MOVE_MS);
          const atRest = tops();
          result.oneOut = { rows: rows(), slid, focusKept: document.activeElement === pillA && pillA.isConnected, inOrderOnScreen: atRest.every((top, i) => i === 0 || top > atRest[i - 1]), label: pillA.getAttribute('aria-label'), card: pillA.querySelector('.animal-card-num')?.textContent };
          window.__keyMark(b, true);
          await wait(MOVE_MS);
          result.twoOut = rows();
          window.__keyMark(b, false);
          await wait(MOVE_MS);
          // b now sits on a's old row. Everything still works on a row that moved.
          const cell = () => rowOf(b).querySelector('td[data-hidden]');
          const tag = cell().dataset.tag;
          const at = () => rowOf(b).querySelector('td[data-tag="' + tag + '"]');
          const before = rows();
          at().querySelector('button').click();
          await wait(200);
          result.moved = { first: before[0], pencil: at().dataset.pencil, afterPencil: rows() };
          at().querySelector('button').click();
          await wait(100);
          at().querySelector('button').click();
          await wait(200);
          result.moved.pencilCleared = at().dataset.pencil;
          const hold = async () => {
            const button = at().querySelector('button');
            const r = button.getBoundingClientRect();
            const opts = { bubbles: true, clientX: r.left + 5, clientY: r.top + 5, pointerId: 1, pointerType: 'touch' };
            const was = at().hasAttribute('data-highlight');
            button.dispatchEvent(new PointerEvent('pointerdown', opts));
            await window.__until(() => at().hasAttribute('data-highlight') !== was);
            button.dispatchEvent(new PointerEvent('pointerup', opts));
            button.click();
            await wait(200);
          };
          await hold();
          result.moved.highlight = at().dataset.highlight === 'true';
          await hold();
          result.moved.highlightCleared = !at().hasAttribute('data-highlight');
          at().querySelector('button').dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
          await wait(150);
          result.moved.keyHighlight = at().dataset.highlight === 'true';
          at().querySelector('button').dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
          await wait(150);
          await window.__holdPill(b);
          result.moved.guide = { title: document.querySelector('[role=dialog] h2')?.textContent ?? '', number: document.querySelector('[role=dialog] [data-guide-number][aria-current]')?.dataset.guideNumber ?? null, wanted: name };
          [...document.querySelectorAll('[role=dialog] button')].find(button => button.getAttribute('aria-label') === 'Close')?.click();
          await wait(300);
          result.moved.rows = rows();
          window.__keyMark(a, false);
          await wait(MOVE_MS);
          result.back = rows();
          // A finger down on another row holds the order until it lifts: a long press on a name, a photo slide, a hold on a cell.
          const fingerOn = async (press, lift, heldMs) => {
            const before = rows();
            press();
            await wait(50);
            window.__keyMark(b, true);
            await wait(heldMs);
            const held = rows();
            lift();
            await wait(MOVE_MS);
            const after = rows();
            window.__keyMark(b, false);
            await wait(MOVE_MS);
            return { before, held, after, back: rows() };
          };
          const pill = window.__pill(c);
          const box = pill.getBoundingClientRect();
          const pointer = (el, type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }));
          const midY = box.top + box.height / 2;
          result.name = await fingerOn(() => pointer(pill, 'pointerdown', box.left + 60, midY), () => pointer(pill, 'pointerup', box.left + 60, midY), 650);
          [...document.querySelectorAll('[role=dialog] button')].find(button => button.getAttribute('aria-label') === 'Close')?.click();
          await wait(300);
          const slidePill = window.__pill(c);
          const slideBox = slidePill.getBoundingClientRect();
          result.slide = await fingerOn(() => {
            pointer(slidePill, 'pointerdown', slideBox.left + 10, slideBox.top + slideBox.height / 2);
            pointer(slidePill, 'pointermove', slideBox.left + 26, slideBox.top + slideBox.height / 2); // short of ruling it out
          }, () => pointer(slidePill, 'pointerup', slideBox.left + 26, slideBox.top + slideBox.height / 2), 200);
          const hidden = rowOf(c).querySelector('td[data-hidden] button');
          const hiddenBox = hidden.getBoundingClientRect();
          result.cell = await fingerOn(() => pointer(hidden, 'pointerdown', hiddenBox.left + 5, hiddenBox.top + 5), () => pointer(hidden, 'pointerup', hiddenBox.left + 5, hiddenBox.top + 5), 200);
          result.marked = window.__cc.clue().marked;
          return result;
        }, [a, b, c, names.get(b)]);
        const card = start.suspects;
        check('the sort: ties keep the cards\' order at the start', sameList(sorting.start, card), JSON.stringify(sorting.start));
        check('the sort: a ruled-out animal sinks below the others, keeping its number and the keyboard\'s focus', sameList(sorting.oneOut.rows, [b, c, d, e, a]) && sorting.oneOut.focusKept && sorting.oneOut.inOrderOnScreen && sorting.oneOut.label.startsWith('1: ') && sorting.oneOut.card === '1', JSON.stringify(sorting.oneOut));
        check('the sort: a row slides to its new place', sorting.oneOut.slid, JSON.stringify(sorting.oneOut));
        check('the sort: two ruled out sit by number under the others', sameList(sorting.twoOut, [c, d, e, a, b]), JSON.stringify(sorting.twoOut));
        check('the sort: taking a mark back returns the row to its place', sameList(sorting.back, card), JSON.stringify(sorting.back));
        { const m = sorting.moved;
          check('a moved row still pencils, and a pencil guess moves no row', m.first === b && m.pencil === 'yes' && m.pencilCleared === '' && sameList(m.afterPencil, [b, c, d, e, a]), JSON.stringify(m));
          check('a moved row still highlights (hold, and H), which moves no row', m.highlight && m.highlightCleared && m.keyHighlight && sameList(m.rows, [b, c, d, e, a]), JSON.stringify(m));
          check('a moved row still opens its own field guide, on its own number', m.guide.title.endsWith(m.guide.wanted) && m.guide.number === '2', JSON.stringify(m.guide)); }
        for (const [what, seen] of [['a long press on a name', sorting.name], ['a photo slide', sorting.slide], ['a hold on a cell', sorting.cell]]) {
          check(`the sort: ${what} holds the order until the finger lifts, then applies it`, sameList(seen.held, seen.before) && sameList(seen.after, [a, c, d, e, b]) && sameList(seen.back, card), JSON.stringify(seen));
        }
        check('the sort tests leave nobody ruled out', sorting.marked.length === 0, JSON.stringify(sorting.marked));
        // A real finger (the browser's own touch, not a dispatched event). A long hold: the row stays under it, its guide opens, and lifting applies the order.
        const closeAndUnmark = async (bid, cid) => evaluate(async ([bid, cid]) => {
          [...document.querySelectorAll('[role=dialog] button')].find(button => button.getAttribute('aria-label') === 'Close')?.click();
          if (window.__pill(cid).getAttribute('aria-pressed') === 'true') window.__pill(cid).click();
          window.__keyMark(bid, false);
          await new Promise(resolve => setTimeout(resolve, 500));
        }, [bid, cid]);
        const liftState = id => evaluate(id => ({ rows: window.__rows(), picked: window.__pill(id).getAttribute('aria-pressed'), guide: document.querySelector('[role=dialog] h2')?.textContent ?? null }), id);
        const point = await evaluate(id => { const r = window.__pill(id).getBoundingClientRect(); return { x: r.left + 60, y: r.top + r.height / 2 }; }, c);
        await page('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
        await evaluate(id => window.__keyMark(id, true), b);
        await sleep(700);
        const underFinger = await evaluate(() => window.__rows());
        await page('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await sleep(600);
        const heldUp = await liftState(c);
        check('the sort: under a real finger\'s long hold the row stays, its guide opens, and lifting applies the order', sameList(underFinger, card) && sameList(heldUp.rows, [a, c, d, e, b]) && heldUp.guide?.endsWith(names.get(c)), JSON.stringify({ underFinger, heldUp }));
        await closeAndUnmark(b, c);
        await sleep(300);
        // A quick tap with a new order waiting (it comes while the finger is down, and applies on the lift): the tap must still pick the animal under the finger.
        await evaluate(id => window.addEventListener('pointerdown', () => window.__keyMark(id, true), { once: true }), b);
        await Promise.all([
          page('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] }),
          page('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
        ]);
        await sleep(800);
        const tapped = await liftState(c);
        check('the sort: a quick tap picks the animal under the finger, though the rows re-order as it lifts', sameList(tapped.rows, [a, c, d, e, b]) && tapped.picked === 'true' && !tapped.guide, JSON.stringify(tapped));
        await closeAndUnmark(b, c);
        await sleep(300);
        // A press that lands while the rows are still sliding: the row stops under the finger, and lifting finishes the move.
        const midPress = await evaluate(async ([a, c]) => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
          const rowOf = id => document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + id + '"]');
          const top = id => rowOf(id).getBoundingClientRect().top;
          for (let tries = 0; tries < 5; tries++) {
            const from = top(c);
            const to = from - (rowOf(c).getBoundingClientRect().height + 2); // the slot above: a's sinking lifts c one row
            window.__keyMark(a, true);
            let mid = false;
            for (const end = Date.now() + 300; Date.now() < end && !mid;) {
              await frame();
              mid = top(c) < from - 1 && top(c) > to + 1;
            }
            if (!mid) { window.__keyMark(a, false); await wait(600); continue; }
            const pill = window.__pill(c);
            const box = pill.getBoundingClientRect();
            const at = (type, x, y) => pill.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }));
            const [x, y] = [box.left + 60, box.top + box.height / 2];
            at('pointerdown', x, y);
            const pressedAt = top(c);
            const tops = [];
            for (const end = Date.now() + 350; Date.now() < end;) { await frame(); tops.push(top(c)); }
            at('pointerup', x, y);
            await wait(700);
            const after = top(c);
            [...document.querySelectorAll('[role=dialog] button')].find(button => button.getAttribute('aria-label') === 'Close')?.click();
            const rows = window.__rows();
            window.__keyMark(a, false);
            await wait(600);
            return { tries, from, to, pressedAt, drift: Math.max(...tops.map(value => Math.abs(value - pressedAt))), after, rows, back: top(c) };
          }
          return null;
        }, [a, c]);
        check('the sort: a press during a row\'s slide stops it under the finger, and lifting finishes the move', Boolean(midPress) && midPress.drift <= 1 && Math.abs(midPress.after - midPress.to) <= 1 && sameList(midPress.rows, [b, c, d, e, a]) && Math.abs(midPress.back - midPress.from) <= 1, JSON.stringify(midPress));
        // A real click on a row that a waiting re-order moves in the DOM (taking a's mark back puts a first, so React re-inserts
        // every other row): the order applies after the click, which still lands on what was pressed.
        const clickWithReorderWaiting = async (where, type) => {
          await evaluate(async id => { window.__keyMark(id, true); await new Promise(resolve => setTimeout(resolve, 500)); }, a);
          const spot = await evaluate(where => {
            const row = document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + where.id + '"]');
            const el = where.cell ? row.querySelector('td[data-hidden] button') : row.querySelector('button[data-pill]');
            const r = el.getBoundingClientRect();
            return { x: r.left + (where.cell ? r.width / 2 : 60), y: r.top + r.height / 2, tag: row.querySelector('td[data-hidden]')?.dataset.tag };
          }, where);
          await evaluate(id => window.addEventListener('pointerdown', () => window.__keyMark(id, false), { once: true }), a);
          const point = { x: spot.x, y: spot.y };
          await Promise.all(type === 'touch' ? [
            page('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] }),
            page('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
          ] : [
            page('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 }),
            page('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 }),
          ]);
          await sleep(800);
          return evaluate(({ id, tag }) => ({
            rows: window.__rows(), picked: window.__pill(id).getAttribute('aria-pressed'), guide: document.querySelector('[role=dialog] h2')?.textContent ?? null,
            pencil: document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + id + '"] td[data-tag="' + tag + '"]')?.dataset.pencil ?? null, tag,
          }), { id: where.id, tag: spot.tag });
        };
        const dropPick = id => evaluate(async id => { if (window.__pill(id).getAttribute('aria-pressed') === 'true') window.__pill(id).click(); await new Promise(resolve => setTimeout(resolve, 200)); }, id);
        const mouseName = await clickWithReorderWaiting({ id: c }, 'mouse');
        check('the sort: a mouse click on a name that a waiting re-order moves still picks that animal', sameList(mouseName.rows, card) && mouseName.picked === 'true' && !mouseName.guide, JSON.stringify(mouseName));
        await dropPick(c);
        const mouseCell = await clickWithReorderWaiting({ id: d, cell: true }, 'mouse');
        check('the sort: a mouse click on a hidden cell that a waiting re-order moves still pencils it', sameList(mouseCell.rows, card) && mouseCell.pencil === 'yes', JSON.stringify(mouseCell));
        await evaluate(async ({ id, tag }) => {
          for (let i = 0; i < 2; i++) {
            document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + id + '"] td[data-tag="' + tag + '"] button').click();
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }, { id: d, tag: mouseCell.tag });
        const touchName = await clickWithReorderWaiting({ id: e }, 'touch');
        check('the sort: a quick tap on a name that a waiting re-order moves still picks that animal', sameList(touchName.rows, card) && touchName.picked === 'true' && !touchName.guide, JSON.stringify(touchName));
        await dropPick(e);
      }
      // Plan 058: no round-1 sheet pages at 390 px, so the paging shots come from the first later round that deals one,
      // before its first move: both pages, light and dark, then the same sheet at 1280 px. It plays no move.
      if (n > 1 && !pagingShot) {
        const found = await evaluate(async () => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          await window.__holdPill(document.querySelector('table[aria-label="Evidence"] tr[data-suspect]').dataset.suspect);
          const { suspects } = window.__cc.clue();
          for (let i = 1; i <= suspects.length; i++) {
            document.querySelector(`[role=dialog] [data-guide-number="${i}"]`).click();
            const pages = () => Number(document.querySelector('[role=dialog] [data-guide-signs]')?.dataset.guideSigns ?? 0);
            if (await window.__until(() => pages() > 1, 800)) return { id: suspects[i - 1], pages: pages() };
          }
          await window.__closeGuide();
          return null;
        });
        if (found) {
          const shots = {};
          await sleep(1000); // its photo loads
          await inThemes(async mode => {
            await evaluate(() => document.querySelector('[role=dialog] [data-guide-swipe]')?.scrollIntoView({ block: 'end' }));
            await sleep(300);
            for (const k of [1, 2]) {
              shots[`${k}-${mode}`] = await evaluate(k => window.__signPage(k), k);
              await screenshot(`02f-signs-page-${k}-${mode}.png`);
            }
          });
          await sideNotesAt(1280, 800, false);
          await evaluate(() => document.querySelector('[role=dialog] [data-guide-swipe]')?.scrollIntoView({ block: 'end' }));
          shots.desktop = await evaluate(async () => { await new Promise(resolve => setTimeout(resolve, 300)); return window.__signs().then(s => s && { page: s.page, pages: s.pages }); });
          await screenshot('02g-signs-desktop.png');
          await sideNotesAt(...PHONE);
          // Keyboard focus on the pause button (Shift+Tab away, Tab back, real keys): its ring must sit inside the box,
          // which clips its overflow (plan 058 audit).
          await evaluate(() => document.querySelector('[role=dialog] [data-guide-signs] button[aria-pressed]')?.focus());
          for (const modifiers of [8, 0]) for (const type of ['keyDown', 'keyUp']) await page('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
          await sleep(100);
          shots.focus = await evaluate(() => {
            const button = document.querySelector('[role=dialog] [data-guide-signs] button[aria-pressed]');
            const style = button && getComputedStyle(button);
            return button && { focused: document.activeElement === button, visible: button.matches(':focus-visible'), outline: style.outlineStyle, width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset) };
          });
          await screenshot('02h-signs-focus.png');
          // Astra code review: a photo-row drag leaves the drag guard set, which swallowed the pause button's keyboard
          // clicks too. Resume by tap, drag the row with a real mouse and bring it back (no flip), focus the button by
          // Tab, then Space pauses (the page holds 5.6 s) and Space again resumes and moves on.
          const sheetNow = () => evaluate(() => {
            const b = document.querySelector('[role=dialog] [data-guide-signs]'), button = b?.querySelector('button[aria-pressed]');
            return { name: document.querySelector('[role=dialog] [data-guide-name]')?.textContent ?? null, page: Number(b?.querySelector('[data-sign-page]')?.dataset.signPage ?? 0), pressed: button?.getAttribute('aria-pressed') ?? null, focused: Boolean(button && document.activeElement === button), x: document.querySelector('[role=dialog] [data-guide-swipe]')?.style.transform ?? '' };
          });
          await evaluate(async () => {
            const button = document.querySelector('[role=dialog] [data-guide-signs] button[aria-pressed]');
            if (button?.getAttribute('aria-pressed') === 'true') { button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })); button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' })); button.click(); }
            document.querySelector('[role=dialog] [data-guide-swipe]')?.scrollIntoView({ block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 300));
          });
          const from = await evaluate(() => { const r = document.querySelector('[role=dialog] [data-guide-swipe] figure').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 3) }; });
          const drag = { before: await sheetNow() };
          const mouseAt = (type, dx) => page('Input.dispatchMouseEvent', { type, x: from.x + dx, y: from.y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
          await mouseAt('mousePressed', 0);
          for (const dx of [5, 10, 15, 20, 25, 30]) { await mouseAt('mouseMoved', dx); await sleep(16); }
          drag.during = await sheetNow();
          for (const dx of [25, 20, 15, 10, 5, 0]) { await mouseAt('mouseMoved', dx); await sleep(16); }
          await mouseAt('mouseReleased', 0);
          await sleep(500);
          drag.after = await sheetNow();
          await evaluate(() => document.querySelector('[role=dialog] [data-guide-signs] button[aria-pressed]')?.focus());
          for (const modifiers of [8, 0]) for (const type of ['keyDown', 'keyUp']) await page('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
          const space = async () => { for (const type of ['keyDown', 'keyUp']) await page('Input.dispatchKeyEvent', { type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, ...(type === 'keyDown' ? { text: ' ' } : {}) }); await sleep(100); };
          await space();
          drag.paused = await sheetNow();
          await sleep(5600);
          drag.held = await sheetNow();
          await space();
          await sleep(500);
          drag.resumed = await sheetNow();
          shots.keyboardAfterDrag = drag;
          // Astra code review: ←/→ from the pause button remounted the signs and dropped focus to the page, so the next
          // arrow did nothing. Tab to the pause button, then ArrowRight twice (real keys): each flips, focus stays in the sheet.
          const focusNow = () => evaluate(() => {
            const dialog = document.querySelector('[role=dialog]'), active = document.activeElement;
            return { name: dialog?.querySelector('[data-guide-name]')?.textContent ?? null, inSheet: Boolean(dialog && active && active !== document.body && dialog.contains(active)), on: active?.hasAttribute('aria-pressed') ? 'pause' : active?.hasAttribute('data-guide-swipe') ? 'row' : active?.tagName ?? null };
          });
          await evaluate(() => document.querySelector('[role=dialog] [data-guide-signs] button[aria-pressed]')?.focus());
          for (const modifiers of [8, 0]) for (const type of ['keyDown', 'keyUp']) await page('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers });
          const arrows = [await focusNow()];
          for (let i = 0; i < 2; i++) {
            for (const type of ['keyDown', 'keyUp']) await page('Input.dispatchKeyEvent', { type, key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
            await sleep(400);
            arrows.push(await focusNow());
          }
          shots.arrowsKeepFocus = arrows;
          await evaluate(() => window.__closeGuide());
          pagingShot = { round: n, animal: names.get(found.id), pages: found.pages, shots };
        }
      }
      // Pencil a guess in every hidden answer (yes, no, yes, ...), so scouting shows right and wrong guesses.
      const pencilled = await evaluate(async () => {
        const before = window.__rows();
        const cells = [...document.querySelectorAll('table[aria-label="Evidence"] tr[data-suspect] td[data-hidden]')];
        for (const [i, td] of cells.entries()) for (let tap = 0; tap <= i % 2; tap++) td.querySelector('button').click();
        await new Promise(resolve => setTimeout(resolve, 200));
        return { before, after: window.__rows(), ...window.__gridFacts() };
      });
      check(`round ${n}: a pencil guess in every hidden answer moves no row`, sameList(pencilled.before, pencilled.after), JSON.stringify(pencilled));
      const gridSize = { height: pencilled.height, board: pencilled.board };
      const trailBefore = start.trail;
      // Round 2 rules out the mystery (an escape); round 3 rules out nothing (out of moves, then names it: a find);
      // round 4 turns on Auto rule-out and marks nothing itself; others play carefully.
      const mode = n === 2 ? 'reckless' : n === 3 ? 'idle' : n === 4 ? 'auto' : 'careful';
      // Each round sets Auto rule-out through the menu on purpose (on for the auto round only), not by the default.
      const set = await autoSwitch(mode === 'auto');
      check(`round ${n}: Auto rule-out set ${mode === 'auto' ? 'on' : 'off'} through the menu for this round`, set.after === String(mode === 'auto'), JSON.stringify(set));
      let state = start;
      let moves = 0;
      let pinsBefore = pins;
      // Plan 053: the field guide's "It's this one!" asks first; Back leaves the round playing.
      if (mode === 'idle') {
        const asked = await evaluate(async id => {
          const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
          await window.__holdPill(id);
          const dialog = document.querySelector('[role=dialog]');
          dialog?.querySelector('button[data-name-it]')?.click();
          await wait(200);
          const confirm = document.querySelector('[role=dialog] [data-name-confirm]');
          const text = confirm?.innerText ?? '';
          [...(confirm?.querySelectorAll('button') ?? [])].find(button => button.textContent === 'Back')?.click();
          await wait(200);
          const back = Boolean(document.querySelector('[role=dialog] button[data-name-it]'));
          [...document.querySelectorAll('[role=dialog] button')].find(button => button.getAttribute('aria-label') === 'Close')?.click();
          await wait(200);
          return { button: Boolean(dialog), text, back, status: window.__cc.clue().status };
        }, start.suspects.find(id => id !== start.mysteryId));
        check(`round ${n}: "It's this one!" asks first, warning it's one try`, /One try only/.test(asked.text), JSON.stringify(asked));
        check(`round ${n}: Back keeps the round playing, nobody named`, asked.back && asked.status === 'playing', JSON.stringify(asked));
      }
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
            for (let i = 0; i < 200 && !cc.state().hint; i++) await new Promise(resolve => setTimeout(resolve, 100)); // HINT_MS is 8 s
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
          window.__watchRows();
          window.__dragStart = Date.now();
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
          const sparkling = [...grid.querySelectorAll('[data-guess="right"]:has(.ev-sparkle)')].map(td => `${td.closest('tr').dataset.suspect}:${td.dataset.tag}`);
          return { counted: drag.counted, timedOut: drag.timedOut, blocked: drag.blocked ?? null, pins, view, orders, misses, cells, sparkling, expected, clue: cc.clue() };
        });
        if (!result) break;
        moves++;
        state = result.clue;
        const rest = await evaluate(async () => {
          await window.__gridRest();
          const changes = window.__stopWatchingRows();
          const settledAt = window.__cc.events(1e6).filter(e => e.name === 'clue-board-settled' && e.at >= window.__dragStart).at(0)?.at ?? null;
          return { changes, settledAt, ...window.__gridFacts() };
        });
        check(`round ${n} move ${moves}: no row moves until the move has settled and its gems have landed`, rest.changes.every(change => !change.flying && (rest.settledAt === null || change.at >= rest.settledAt)), JSON.stringify({ settledAt: rest.settledAt, changes: rest.changes }));
        if (rest.rows && (state.status === 'playing' || state.status === 'out-of-moves')) {
          noteSort(rest);
          check(`round ${n} move ${moves}: the rows sort by what shows: ruled out below, no contradiction above, more matches higher, then the card's number`, sameList(rest.rows, sortFacts(rest.facts)), JSON.stringify({ rows: rest.rows, facts: rest.facts }));
          check(`round ${n} move ${moves}: every row keeps its animal's number`, rest.numbers.every(row => row.card === row.want && row.label === row.want), JSON.stringify(rest.numbers));
          // (Out of moves the grid is 2 px shorter whatever the order: its sr-only <caption> goes with onMark, and a caption adds one border-spacing to the table's height. The board keeps its size.)
          check(`round ${n} move ${moves}: sorting keeps the grid's height and the board's size`, (state.status !== 'playing' || rest.height === gridSize.height) && sameList(rest.board, gridSize.board), JSON.stringify({ was: gridSize, now: { height: rest.height, board: rest.board } }));
        }
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
        check(`round ${n} move ${moves}: during play no cell is marked as a mismatch`, result.misses === 0, `${result.misses} cells`);
        // Auto rule-out: after the move, every suspect whose shown answer differs from a shown camera answer is marked, and
        // nobody else is (the player marked nobody); off, the game marks nobody.
        const shownMiss = state.suspects.filter((id, i) => state.orders.some(order => order.answer && order.seen[i] && order.row[i] !== (order.answer === 'yes')));
        if (mode === 'auto' && state.status === 'playing') check(`round ${n} move ${moves}: auto rule-out marks exactly the animals a shown answer rules out`, state.marked.slice().sort().join() === shownMiss.slice().sort().join(), JSON.stringify({ marked: state.marked, shownMiss }));
        if (mode === 'auto') check(`round ${n} move ${moves}: auto rule-out never marks the mystery`, !state.marked.includes(state.mysteryId));
        // Ruling an auto-marked animal back in: it stays out (it still doesn't match), and the game says why.
        const back = state.marked.find(id => !state.released.includes(id));
        if (mode === 'auto' && !autoBackChecked && state.status === 'playing' && back !== undefined) {
          autoBackChecked = true;
          const again = await evaluate(async id => {
            const since = Date.now();
            await window.__slidePill(id, 120);
            await new Promise(resolve => setTimeout(resolve, 300));
            const flicker = window.__cc.events(1e6).some(e => e.at >= since && e.name === 'clue-board-marks' && !e.payload.marked.includes(id));
            return { marked: window.__cc.clue().marked.includes(id), flicker, said: document.body.innerText.includes('Auto rule-out is on') };
          }, back);
          check(`round ${n}: with Auto rule-out, an animal ruled back in stays out (never unmarked on the board) and the game says why`, again.marked && !again.flicker && again.said, JSON.stringify({ back, ...again }));
          state = await evaluate(() => window.__cc.clue());
        }
        if (mode === 'idle') check(`round ${n} move ${moves}: with Auto rule-out off, the game marks nobody`, state.marked.length === 0, JSON.stringify(state.marked));
        // Plan 045: the move's own clear scouts exactly the hidden answers next to unmarked animals in the colors it
        // cleared there (cascades scout nothing), and a hidden answer is nowhere in the page.
        const seenKeys = clue => new Set(clue.orders.flatMap(order => clue.suspects.filter((_id, i) => order.seen[i]).map(id => `${id}:${order.tag}`)));
        const was = seenKeys(before);
        const scouted = [...seenKeys(state)].filter(key => !was.has(key)).sort();
        if (result.counted) check(`round ${n} move ${moves}: the move scouts exactly the answers next to unmarked animals in its colors`, scouted.join() === [...result.expected].sort().join(), JSON.stringify({ scouted, expected: result.expected }));
        // Found/lost starts the answer reveal immediately, before the end card opens.
        // Out of moves still allows naming, so its unscouted answers must stay hidden.
        const revealed = state.status === 'found' || state.status === 'lost';
        const leaks = result.cells.filter(cell => {
          const order = state.orders.find(candidate => candidate.tag === cell.tag);
          const i = state.suspects.indexOf(cell.id);
          const visible = revealed || order.seen[i];
          return cell.hidden ? visible || cell.yes !== null || /yes|no/.test(cell.said ?? '') : !visible || cell.yes !== String(order.row[i]);
        });
        check(`round ${n} move ${moves}: ${revealed ? 'the ended round reveals the answers' : 'the grid shows exactly the scouted answers, and no hidden one'}`, result.cells.length > 0 && leaks.length === 0, JSON.stringify({ status: state.status, leaks: leaks.slice(0, 3) }));
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
        // Older sparkles stay mounted, so look at the cells just called. The end-of-round reveal shows none.
        if (calledNow.length > 0 && !revealed) check(`round ${n} move ${moves}: a right guess just scouted sparkles`, calledNow.every(key => result.sparkling.includes(key)), JSON.stringify({ sparkling: result.sparkling, calledNow }));
        if (calledNow.length > 0 && !calledShot) { calledShot = true; await screenshot('03-called-it.png'); }
        if (!notesChecked && state.notes > 0) {
          notesChecked = true;
          const notes = await evaluate(async () => {
            const book = document.querySelector('table[aria-label="Evidence"] tr[data-mystery] button[data-flight-target="notes"]');
            const pulse = book?.querySelector('.ev-unread')?.getAnimations().find(animation => animation.animationName === 'ev-unread');
            const at = pulse?.currentTime;
            await new Promise(resolve => setTimeout(resolve, 80));
            const corner = { inRow: Boolean(book), count: book?.dataset.notes ?? null, label: book?.getAttribute('aria-label') ?? '', flash: pulse?.playState === 'running' && pulse.currentTime > at };
            book?.click();
            await new Promise(resolve => setTimeout(resolve, 250));
            const text = document.querySelector('[role=dialog]')?.innerText ?? '';
            const marks = [...document.querySelectorAll('[role=dialog] ol > li')].map(li => [...li.querySelectorAll('[data-category-mark]')].map(mark => mark.dataset.categoryMark));
            [...document.querySelectorAll('[role=dialog] button')].find(button => button.getAttribute('aria-label') === 'Close')?.click();
            return { text, marks, ...corner };
          });
          check(`round ${n}: a witness note says how many of the 5 field guides agree`, /of 5\s+field guides say this too/.test(notes.text), notes.text.slice(0, 120));
          check(`round ${n}: each witness note carries one mark per category of its signs, none repeated`, notes.marks.length === state.notes && notes.marks.every(cats => cats.length > 0 && new Set(cats).size === cats.length), JSON.stringify(notes.marks));
          check(`round ${n}: the Mystery cell opens the witness notes, counts them and pulses`, notes.inRow && notes.count === String(state.notes) && notes.label.includes(`${state.notes} witness note`) && notes.flash, JSON.stringify({ ...notes, text: undefined, marks: undefined }));
          await screenshot('02c-notes.png');
        }
      }
      // Out of moves: a last name. Right finds it (one star, no heart lost).
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
        const right = state.logTail.some(entry => entry.kind === 'named' && entry.correct);
        check(`round ${n}: out of moves, a right name finds it, with one star (two with a Sharp eye, plan 054)`, !right || (state.status === 'found' && state.end?.stars === (state.sharp ? 2 : 1)), `${state.status} ${state.end?.stars} sharp ${state.sharp}`);
        check(`round ${n}: out of moves, a wrong name loses the round`, right || (state.status === 'lost' && state.lostBy === 'wrong-name'), `${state.status} ${state.lostBy}`);
      }
      const end = state.end;
      check(`round ${n}: the round ends`, Boolean(end), state.status);
      if (mode === 'reckless') check(`round ${n}: releasing the ruled-out mystery loses the round (it escapes)`, state.status === 'lost' && state.lostBy === 'escaped', `${state.status} ${state.lostBy}`);
      if (mode === 'auto') check(`round ${n}: the rule-back-in check ran`, autoBackChecked);
      if (mode === 'auto') {
        check(`round ${n}: with Auto rule-out, the mystery never escapes`, state.lostBy !== 'escaped', `${state.status} ${state.lostBy}`);
        // Back off: the resume and rise sections below run with it off (every other round set it off too).
        const toggled = await autoSwitch(false);
        check(`round ${n}: the Auto rule-out switch turns back off`, toggled.before === 'true' && toggled.after === 'false', JSON.stringify(toggled));
      }
      if (mode === 'idle') check(`round ${n}: with nobody ruled out, nothing leaves, the moves run out, and naming it right finds it`, state.released.length === 0 && state.movesLeft === 0 && state.status === 'found', JSON.stringify({ released: state.released, status: state.status }));
      check(`round ${n}: the trail moves on: a find, or one heart less`, end?.outcome === 'found'
        ? state.trail.finds === trailBefore.finds + 1 && state.trail.hearts === trailBefore.hearts
        : state.trail.hearts === trailBefore.hearts - 1, JSON.stringify({ before: trailBefore, after: state.trail }));
      if (end?.outcome === 'found') journalFinds.add(start.mysteryId);
      // The mystery's row rises into the Camera row, which becomes that animal, before the card opens.
      await waitFor(() => document.querySelector('table tr[data-mystery][data-match]') && true, 'the mystery rising into the Camera row', 10_000);
      await screenshot(`04-round-${n}-landed.png`);
      const reveal = await waitFor(() => {
        const sheet = document.querySelector('section[aria-labelledby="end-title"]');
        return sheet ? { name: sheet.querySelector('#end-title > :last-child')?.textContent ?? '', text: sheet.innerText.replace(/\s+/g, ' '), tree: sheet.querySelector('ol[aria-label="Family tree"]')?.innerText.replace(/\s+/g, ' ') ?? '', focused: document.activeElement?.id ?? '' } : null;
      }, 'the round-end card', 10_000);
      check(`round ${n}: the round-end card names the mystery`, reveal.name === mysteryName, reveal.name);
      check(`round ${n}: focus moves to the round-end card's name`, reveal.focused === 'end-title', reveal.focused);
      const landed = await evaluate(id => ({ camera: document.querySelector('table tr[data-mystery]')?.dataset.match ?? null, ownRow: Boolean(document.querySelector(`table tr[data-suspect="${id}"]`)) }), start.mysteryId);
      check(`round ${n}: the mystery's row rises into the Camera row (the Camera row is that animal, its own row gone)`, landed.camera === String(start.mysteryId) && !landed.ownRow, JSON.stringify(landed));
      check(`round ${n}: the round-end card says the camera saw that animal's number`, reveal.text.includes(`The camera saw #${start.suspects.indexOf(start.mysteryId) + 1}`), reveal.text.slice(0, 120));
      const { family, genus } = poolSpecies.get(start.mysteryId);
      check(`round ${n}: the round-end card shows that animal's family tree`, reveal.tree.startsWith('Animalia › Chordata') && reveal.tree.toLowerCase().endsWith(`${family} › ${genus}`.toLowerCase()), JSON.stringify({ tree: reveal.tree, family, genus }));
      // The game's own grid turns into the replay (plan 052): the mystery's row outlined, and red exactly where an earned answer rules a suspect out.
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
        // Every pencilled guess counts, the risen mystery's too (its row is now the Camera row).
        const all = clue.suspects.flatMap((id, i) => clue.orders.flatMap(order => {
          const guess = clue.pencil[`${id}:${order.tag}`];
          return guess ? [(guess === 'yes') === order.row[i]] : [];
        }));
        const tally = `${all.filter(Boolean).length}/${all.length}`;
        return {
          match: grid.querySelector('tr[data-mystery]')?.dataset.match ?? '', misses: grid.querySelectorAll('[data-miss]').length, wrong: wrong.length, hidden: grid.querySelectorAll('[data-hidden]').length,
          guessesWrong: truth.filter(cell => cell.shown !== cell.expected).length, tally, shownTally: document.querySelector('[data-guesses]')?.dataset.guesses ?? null,
          rows: [...grid.querySelectorAll('tr[data-suspect]')].map(row => Number(row.dataset.suspect)),
        };
      });
      check(`round ${n}: the round-end card replays the grid, red where an earned answer rules an animal out`, Boolean(replay) && replay.wrong === 0 && replay.hidden === 0 && replay.match === String(start.mysteryId), JSON.stringify(replay));
      // The order froze when the mystery's row began to rise, and stayed through the rise and onto the round-end card.
      const rowsAt = await evaluate(() => ({ end: window.__endRows, last: window.__lastLiveRows, moved: window.__movedInRise }));
      const endRows = (rowsAt.end ?? []).filter(id => id !== start.mysteryId);
      check(`round ${n}: the order freezes when the round ends`, rowsAt.end !== null && !rowsAt.moved && sameList(rowsAt.last.filter(id => id !== start.mysteryId), endRows), JSON.stringify(rowsAt));
      check(`round ${n}: the round-end card keeps the order the round ended on`, Boolean(replay) && rowsAt.end !== null && sameList(replay.rows, endRows), JSON.stringify({ rows: replay?.rows, endRows }));
      if (rowsAt.end !== null && !sameList(endRows, start.suspects.filter(id => id !== start.mysteryId))) sortSaw.frozenOutOfOrder = true;
      check(`round ${n}: the round-end card marks every guess right or wrong and counts them`, Boolean(replay) && replay.guessesWrong === 0 && replay.tally === replay.shownTally, JSON.stringify(replay));
      const below = await evaluate(() => {
        const grid = document.querySelector('table[aria-label="How the evidence lined up"]')?.getBoundingClientRect();
        const card = document.querySelector('section[aria-labelledby="end-title"]')?.getBoundingClientRect();
        return grid && card ? { gridBottom: Math.round(grid.bottom), cardTop: Math.round(card.top) } : null;
      });
      check(`round ${n}: the round-end card covers the board only, the replay grid stays in view`, Boolean(below) && below.cardTop >= below.gridBottom - 1, JSON.stringify(below));
      await sleep(1500); // the Camera row slides back up and the photo pops in
      await screenshot(`04-round-${n}-end.png`);
      await checkSources(`round ${n}`, CARD);
      const review = await reviewHidesFacts();
      check(`round ${n}: sources: while the card is open the status line shows no "Clue n of m" and there are no side notes`, review.ticker && review.clue === null && !review.sideNotes, JSON.stringify(review));
      if (n === 1) {
        // At 390 px the side notes are never drawn, so the review check needs a desktop width once.
        const desk = await sideNotesAt(1280, 800, false);
        await sideNotesAt(...PHONE);
        check('sources: at 1280 px, the round-end card open, there are no side notes', desk.wide && !desk.sideNotes, JSON.stringify(desk));
      }
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
    { const shown = pagingShot && ['light', 'dark'].every(mode => [1, 2].every(k => { const shot = pagingShot.shots[`${k}-${mode}`]; return shot.page === k && shot.pages > 1 && shot.pressed === 'true' && shot.mark && shot.counter === `${k}/${shot.pages}`; }));
      check('field guide: a sheet whose signs page at 390 px was found and shot (both pages, light and dark, and at 1280 px)', Boolean(shown && pagingShot.shots.desktop), JSON.stringify(pagingShot));
      const focus = pagingShot?.shots.focus;
      check('field guide: the signs\' pause button shows its keyboard focus ring inside the box', Boolean(focus?.focused && focus.visible && focus.outline !== 'none' && focus.width > 0 && focus.offset + focus.width <= 0), JSON.stringify(focus ?? null));
      const kd = pagingShot?.shots.keyboardAfterDrag;
      check('field guide: signs keyboard pause after drag: after a photo-row drag (no flip), Space on the pause button pauses the pages and Space again resumes them', Boolean(kd && kd.before.pressed === 'false' && kd.during.x && kd.during.x !== 'none' && !/translateX\(0px\)/.test(kd.during.x) && kd.after.name === kd.before.name && kd.paused.focused && kd.paused.pressed === 'true' && kd.held.pressed === 'true' && kd.held.page === kd.paused.page && kd.resumed.pressed === 'false' && kd.resumed.page !== kd.held.page && kd.resumed.name === kd.before.name), JSON.stringify(kd ?? null));
      const ak = pagingShot?.shots.arrowsKeepFocus;
      check('field guide: signs arrows keep focus: from the pause button, ArrowRight twice shows the next animal each time and focus stays in the sheet', Boolean(ak && ak.length === 3 && ak[0].on === 'pause' && ak.every(at => at.inSheet) && new Set(ak.map(at => at.name)).size === 3), JSON.stringify(ak ?? null)); }
    check('the release preview was checked at least once', previewChecked);
    check('the scouting preview was checked at least once', scoutChecked);
    check('the idle hint was checked at least once', hintChecked);
    report.sortSaw = sortSaw;
    check('the sort: a run sees a contradiction sink an animal below a higher-numbered one', sortSaw.contradiction, JSON.stringify(sortSaw));
    check('the sort: a run sees more matches lift an animal above a lower-numbered one', sortSaw.matches, JSON.stringify(sortSaw));
    check('the sort: a run sees a tie (same matches, none contradicted) kept in the cards\' order', sortSaw.tie, JSON.stringify(sortSaw));
    check('the sort: a run sees a ruled-out animal sit below a higher-numbered one', sortSaw.ruledOut, JSON.stringify(sortSaw));
    check('the sort: a run reaches a board where hidden answers would change the order, and they don\'t', sortSaw.hiddenWouldMove, JSON.stringify(sortSaw));
    check('the sort: a run freezes a sorted order at a round\'s end', sortSaw.frozenOutOfOrder, JSON.stringify(sortSaw));

    // 3. The Field Journal lists the finds (and right names at the end of moves).
    const journal = await evaluate(async () => {
      document.querySelector('button[aria-label="Menu"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 250));
      [...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent === 'Field journal')?.click();
      await new Promise(resolve => setTimeout(resolve, 1200));
      return document.querySelector('[role=dialog] #journal-title')?.nextElementSibling?.textContent ?? '';
    });
    check('the journal counts the animals found (by release or by name)', journal.startsWith(`${journalFinds.size} of`), `${journal} (expected ${journalFinds.size})`);
    await screenshot('05-journal.png');
    let journalSources = await checkSources('journal', JOURNAL, false);

    // 4. Resume: a game without ?seed= is saved for the tab; a reload picks it up (marks, pencil, released animals, gems, toys).
    await goto(`${BASE}/`); // the globe starts the next game fresh
    await goto(`${BASE}/explore/?place=${encodeURIComponent(place.key)}`);
    const boardReady = () => window.__cc?.clue?.() && window.__cc.state().ready;
    await waitFor(boardReady, 'the unseeded board', 60_000);
    check('coming from the globe starts a new round 1', await evaluate(() => window.__cc.clue().roundNo === 1 && window.__cc.clue().movesLeft === window.__cc.clue().moves));
    // URL seeds disable saving. Bootstrap a repeatable fresh deal through the saved seed instead:
    // a different requested place discards the saved round, while retaining its seed.
    await waitFor(() => sessionStorage.getItem('cc:explore:game'), 'the initial save');
    await evaluate(seed => {
      const saved = JSON.parse(sessionStorage.getItem('cc:explore:game'));
      saved.seed = seed;
      saved.requested = null;
      sessionStorage.setItem('cc:explore:game', JSON.stringify(saved));
    }, RESUME_SEED);
    await page('Page.reload');
    await waitFor(() => document.readyState === 'complete', 'the resume fixture reload');
    await waitFor(boardReady, 'the repeatable resume board', 60_000);
    await evaluate(() => window.__cc.speed(4));
    await sleep(1500);
    check('the resume fixture starts a fresh round with its fixed seed', await evaluate(seed => window.__cc.clue().seed === seed && window.__cc.clue().movesUsed === 0, RESUME_SEED));
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
      // A cascade after its step can release it before the reload; then try another card (up to 3).
      let walked = null;
      for (let tries = 0; tries < 3 && !walked?.to; tries++) {
        let walker = null;
        for (const id of cc.clue().suspects.filter(other => other !== first.mysteryId && !cc.clue().released.includes(other) && !cc.clue().marked.includes(other))) {
          if (cc.clue().status !== 'playing') break;
          await window.__slidePill(id, 120);
          const [x, y] = cc.state().pins.find(([, other]) => other === id)[0];
          const [dx, dy] = STEP[cc.clue().headings[id]];
          if (x + dx >= 0 && x + dx < 7 && y + dy >= 0 && y + dy < 7) { walker = id; break; }
          await window.__slidePill(id, 120); // back
        }
        if (!walker) break;
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
      return { clue: cc.clue(), grid, toys, pins, walked };
    });
    report.resume = { seed: played.clue.seed, status: played.clue.status, walked: played.walked, movesUsed: played.clue.movesUsed, marked: played.clue.marked, released: played.clue.released, pencil: played.clue.pencil, toys: played.toys.flat().filter(Boolean).length };
    await screenshot('06-before-reload.png');
    // A released walker is a setup failure, not a persistence bug. Retrying on random boards
    // used to release every look-alike and win before the journal baseline was captured.
    const readyToResume = played.clue.status === 'playing' && played.walked?.to && JSON.stringify(played.walked.to) !== JSON.stringify(played.walked.from);
    check('the resume setup leaves a walked card in a playing round', readyToResume, JSON.stringify(report.resume));
    if (!readyToResume) throw new Error(`Resume setup failed (seed ${played.clue.seed}); see report.resume`);
    await page('Page.reload');
    await waitFor(() => document.readyState === 'complete', 'the reload');
    await waitFor(boardReady, 'the resumed board', 60_000);
    await sleep(1500);
    const resumed = await evaluate(() => { const { grid, toys, pins } = window.__cc.state(); return { clue: window.__cc.clue(), grid, toys, pins }; });
    await screenshot('06-after-reload.png');
    const resumedRows = await evaluate(async () => { await window.__gridRest(); return window.__gridFacts(); });
    check('a reload draws the rows sorted, by the same rule', sameList(resumedRows.rows, sortFacts(resumedRows.facts)) && resumedRows.numbers.every(row => row.card === row.want && row.label === row.want), JSON.stringify(resumedRows));
    const toyCount = played.toys.flat().filter(Boolean).length;
    check('a reload resumes the round: rules, marks, pencil, moves, score', JSON.stringify(resumed.clue) === JSON.stringify(played.clue), JSON.stringify({ before: played.clue.movesLeft, after: resumed.clue.movesLeft }));
    check('a reload resumes the board: gems and toys', JSON.stringify(resumed.grid) === JSON.stringify(played.grid) && JSON.stringify(resumed.toys) === JSON.stringify(played.toys), `${toyCount} toys`);
    check('a reload keeps every card in place: walked ones where they walked to (plan 047), released ones off the board', JSON.stringify(resumed.pins) === JSON.stringify(played.pins), JSON.stringify({ walked: played.walked, released: played.clue.released, pins: resumed.pins.length }));
    // Play the round out, then reload on its end card: the journal doesn't count the find twice.
    await evaluate(() => window.__cc.speed(4));
    const journalBefore = await evaluate(() => localStorage.getItem('clue-match:journal:v1'));
    await evaluate(async () => {
      const cc = window.__cc;
      for (let i = 0; i < 40 && cc.clue().status === 'playing'; i++) {
        const moves = cc.validMoves();
        if (!moves.length) break;
        await cc.drag(moves[0], { input: 'touch', timeoutMs: 30_000 });
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      if (cc.clue().status !== 'out-of-moves') throw new Error(`Expected resumed round out of moves, got ${cc.clue().status}`);
    });
    // Wait for the actual choice, not a guessed animation delay; a missing choice must fail here.
    const mysteryName = names.get(resumed.clue.mysteryId);
    await waitFor(name => [...(document.querySelector('[aria-label="Out of moves"]')?.querySelectorAll('button') ?? [])].some(b => b.textContent.endsWith(name)), 'the resumed round name choice', 20_000, mysteryName);
    await evaluate(name => [...document.querySelector('[aria-label="Out of moves"]').querySelectorAll('button')].find(b => b.textContent.endsWith(name)).click(), mysteryName);
    await waitFor(() => window.__cc.clue().end, 'the resumed round to end', 20_000);
    await sleep(1000);
    const ended = await evaluate(() => ({ end: window.__cc.clue().end, journal: localStorage.getItem('clue-match:journal:v1') }));
    const replayRows = () => waitFor(() => { const rows = window.__reviewRows(); return rows.length > 0 && rows; }, 'the round-end replay', 20_000);
    const savedRowOrder = () => evaluate(() => JSON.parse(sessionStorage.getItem('cc:explore:game'))?.rowOrder?.ids ?? []);
    const beforeEndReload = await replayRows();
    const withoutMystery = rows => rows.filter(id => id !== resumed.clue.mysteryId);
    check('the round-end order is saved with the game', sameList(withoutMystery(await savedRowOrder()), beforeEndReload), JSON.stringify({ saved: await savedRowOrder(), shown: beforeEndReload }));
    await page('Page.reload');
    await waitFor(() => document.readyState === 'complete', 'the reload');
    await waitFor(boardReady, 'the resumed end card', 60_000);
    await sleep(1500);
    const afterEnd = await evaluate(() => ({ end: window.__cc.clue().end, journal: localStorage.getItem('clue-match:journal:v1') }));
    await screenshot('06-end-after-reload.png');
    const afterEndReload = await replayRows();
    check('a reload on the round-end card keeps the order on screen', sameList(afterEndReload, beforeEndReload), JSON.stringify({ before: beforeEndReload, after: afterEndReload }));
    // The saved order is what draws it, not the same order worked out again: a reversed save shows reversed.
    await evaluate(() => {
      const saved = JSON.parse(sessionStorage.getItem('cc:explore:game'));
      saved.rowOrder?.ids.reverse();
      sessionStorage.setItem('cc:explore:game', JSON.stringify(saved));
    });
    const reversed = withoutMystery(await savedRowOrder());
    await page('Page.reload');
    await waitFor(() => document.readyState === 'complete', 'the reload');
    await waitFor(boardReady, 'the resumed end card', 60_000);
    const fromSave = await replayRows();
    check('a reload draws the round-end order from the save', reversed.length > 0 && sameList(fromSave, reversed), JSON.stringify({ reversed, shown: fromSave }));
    // Plan 055: a save whose witness notes the content would no longer deal (here a note on the retired tag tree_dweller,
    // as an old-content save holds) isn't resumed: a fresh round 1 is dealt from the saved seed.
    const staleSeed = await evaluate(() => {
      const saved = JSON.parse(sessionStorage.getItem('cc:explore:game'));
      saved.session.round.notesLeft.push({ text: 'It sleeps high in the trees.', tags: ['tree_dweller'], fits: 2, source: { name: 'Old content', url: null } });
      sessionStorage.setItem('cc:explore:game', JSON.stringify(saved));
      return saved.seed;
    });
    await page('Page.reload');
    await waitFor(() => document.readyState === 'complete', 'the reload');
    await waitFor(boardReady, 'the board after a stale save', 60_000);
    const afterStale = await evaluate(() => { const clue = window.__cc.clue(); return { end: clue.end, movesUsed: clue.movesUsed, roundNo: clue.roundNo, seed: clue.seed }; });
    check('a save whose witness notes no longer fit the content deals a fresh round, not a resume', afterStale.end === null && afterStale.movesUsed === 0 && afterStale.roundNo === 1 && afterStale.seed === staleSeed, JSON.stringify({ ...afterStale, staleSeed }));
    const solves = raw => Object.values(JSON.parse(raw ?? '{}')).find(entry => entry.commonName === mysteryName)?.timesSolved ?? 0;
    check('the resumed round, named right, is written to the journal once', ended.end?.outcome === 'found' && solves(ended.journal) === solves(journalBefore) + 1, JSON.stringify({ mysteryName, before: solves(journalBefore), after: solves(ended.journal), outcome: ended.end?.outcome }));
    check('a reload on the round-end card resumes it without writing the journal again', Boolean(ended.end) && JSON.stringify(afterEnd.end) === JSON.stringify(ended.end) && afterEnd.journal === ended.journal, JSON.stringify({ ended: ended.end?.outcome ?? null, after: afterEnd.end?.outcome ?? null, sameJournal: afterEnd.journal === ended.journal }));

    // Back on the globe: each animal found has its range drawn and an emoji marker.
    await goto(`${BASE}/`);
    const found = Object.keys(JSON.parse(afterEnd.journal ?? '{}')).length;
    const markers = await waitFor(n => document.querySelectorAll('.maplibregl-marker').length >= n && document.querySelectorAll('.maplibregl-marker').length, 'the globe markers', 30_000, found).catch(() => 0);
    check('the globe marks each animal found', found > 0 && markers === found, `${markers} markers, ${found} in the journal`);
    await sleep(1500);
    await screenshot('07-globe-found.png');

    // A round that ends with rows mid-slide, a finger holding a slide paused, or a press just after the end: the row's
    // slide finishes where it was going, with no jump, and only then does it rise from its real slot into the Camera row.
    // A wrong name ends it, so the journal and globe above stand.
    for (const [label, ending] of [['sliding', 'running'], ['held paused', 'paused'], ['pressed just after the end', 'late']]) {
      await goto(`${BASE}/explore/?seed=${SEED}&place=${encodeURIComponent(report.place.key)}`);
      await waitFor(boardReady, 'a fresh board', 60_000);
      await sleep(1500);
      const rise = await evaluate(async ending => {
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
        const { mysteryId, suspects } = window.__cc.clue();
        const rows = window.__rows();
        const moved = rows.at(-1) === mysteryId ? rows[0] : mysteryId; // ruling out the mystery sinks its row the furthest
        const wrong = suspects.find(id => id !== mysteryId && id !== moved);
        await window.__holdPill(wrong);
        document.querySelector('[role=dialog] button[data-name-it]')?.click();
        await wait(200);
        const yes = [...(document.querySelector('[role=dialog] [data-name-confirm]')?.querySelectorAll('button') ?? [])].find(button => button.textContent !== 'Back');
        const mysteryRow = () => document.querySelector('table[aria-label="Evidence"] tr[data-suspect="' + mysteryId + '"]');
        window.__keyMark(moved, true);
        await frame();
        await frame();
        const finger = { bubbles: true, pointerId: 77, pointerType: 'touch' };
        const press = () => mysteryRow().querySelector('td').dispatchEvent(new PointerEvent('pointerdown', finger));
        if (ending === 'paused') { press(); await frame(); }
        const slide = mysteryRow().getAnimations().find(animation => animation.effect?.getKeyframes().some(keyframe => keyframe.transform?.startsWith('translateY')));
        const before = slide?.playState ?? null;
        const samples = [];
        const sample = () => {
          const row = mysteryRow();
          if (row) samples.push({ top: row.getBoundingClientRect().top, rising: row.classList.contains('z-30') });
        };
        sample();
        yes?.click();
        if (ending === 'late') { await frame(); press(); }
        let atRise = null;
        for (let i = 0; i < 400 && !document.querySelector('tr[data-mystery][data-match]'); i++) {
          await frame();
          sample();
          if (atRise === null && samples.at(-1)?.rising) atRise = slide?.playState ?? null;
        }
        const camera = document.querySelector('tr[data-mystery]').getBoundingClientRect().top;
        window.dispatchEvent(new PointerEvent('pointerup', finger));
        const rising = samples.filter(now => now.rising);
        const tops = samples.map(now => Math.round(now.top));
        return { before, atRise, camera: Math.round(camera), tops: tops.filter((_top, i) => i < 4 || i % 8 === 0 || i === tops.length - 1), rose: rising.length > 5, neverDown: rising.every((now, i) => i === 0 || now.top <= rising[i - 1].top + 1), end: Math.round(rising.at(-1)?.top ?? -1), matched: Boolean(document.querySelector('tr[data-mystery][data-match]')) };
      }, ending);
      check(`the sort: this test catches the rows ${label} as the round ends`, rise.before === (ending === 'paused' ? 'paused' : 'running'), JSON.stringify(rise));
      check(`the sort: a round ending with rows ${label}: the slide finishes, not cut short, before the rise starts`, rise.atRise === 'finished', JSON.stringify(rise));
      check(`the sort: a round ending with rows ${label}: the mystery's row rises without dropping`, rise.rose && rise.neverDown, JSON.stringify(rise));
      // 12 px: the last frame sampled comes just before the rise lands.
      check(`the sort: a round ending with rows ${label}: the mystery's row ends at the Camera row`, rise.matched && Math.abs(rise.end - rise.camera) <= 12, JSON.stringify(rise));
    }

    // Plan 054: a right name scores the pencil marks once an animal is ruled out. One pencil on a look-alike's first
    // question (another look-alike's too, wrong, for 'mixed'), then `out` look-alikes ruled out and "It's this one!" on
    // `named`: right with 1 out (bonus = weight x 1 category x 4 still in x 2), right with 3 out (x 2 still in), right
    // and wrong pencils in one column (0), nobody out (no bonus), and a look-alike named (lost, no bonus). 'sharp':
    // every look-alike's first two questions pencilled right, 1 out: the bonus caps at 50, a second star, a Sharp eye
    // badge on the card and in the journal. 'taken back': 3 out, then 2 brought back before the name: the multiplier
    // stays the fewest still in (2), not 4 (054-1). A single pencil never earns Sharp eye (it needs 4, 054-1).
    const WEIGHT = { body: 1, habitat: 2, range: 2, habits: 3, life: 3 };
    for (const [scenario, out] of [['right', 1], ['right, 3 out', 3], ['mixed', 1], ['nobody out', 0], ['wrong animal', 1], ['sharp', 1], ['taken back', 3]]) {
      await goto(`${BASE}/explore/?seed=${SEED}&place=${encodeURIComponent(report.place.key)}`);
      await waitFor(boardReady, 'a fresh board', 60_000);
      await sleep(1500);
      const named = await evaluate(async ({ scenario, out }) => {
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const start = window.__cc.clue();
        const journalBefore = localStorage.getItem('clue-match:journal:v1');
        const { mysteryId, suspects, orders } = start;
        const others = suspects.filter(id => id !== mysteryId);
        const tag = orders[0].tag;
        const truth = (id, column = 0) => orders[column].row[suspects.indexOf(id)];
        // A hidden cell's taps: one pencils yes, two pencil no.
        const pencil = async (id, yes, column = 0) => {
          for (let tap = 0; tap < (yes ? 1 : 2); tap++) {
            document.querySelector(`table[aria-label="Evidence"] tr[data-suspect="${id}"] td[data-tag="${orders[column].tag}"] button`).click();
            await wait(150);
          }
        };
        if (scenario === 'sharp') { for (const id of others) for (const column of [0, 1]) await pencil(id, truth(id, column), column); }
        else await pencil(others[0], truth(others[0]));
        if (scenario === 'mixed') await pencil(others[1], !truth(others[1]));
        for (const id of others.slice(0, out)) { window.__keyMark(id, true); await wait(250); }
        if (scenario === 'taken back') for (const id of others.slice(1, 3)) { window.__keyMark(id, false); await wait(250); }
        const text = await window.__nameIt(scenario === 'wrong animal' ? others[3] : mysteryId);
        return { text, tag, streak: start.streak, clue: window.__cc.clue(), journalBefore };
      }, { scenario, out });
      const scored = out > 0;
      check(`pencil bonus (${scenario}): the name's ask ${scored ? 'mentions' : "doesn't mention"} the pencil bonus`, /One try only/.test(named.text) && /pencil marks/.test(named.text) === scored, named.text);
      const state = named.clue;
      if (scenario === 'wrong animal') {
        check('pencil bonus (wrong animal): a wrong name loses the round, no bonus', state.status === 'lost' && state.lostBy === 'wrong-name' && state.pencilBonus === null, JSON.stringify({ status: state.status, lostBy: state.lostBy, pencilBonus: state.pencilBonus }));
        continue;
      }
      const weight = WEIGHT[CATEGORY[named.tag.slice(0, named.tag.indexOf(':'))]];
      // 'sharp': at least 4 look-alikes x 2 cells x weight 1, x 4 still in x 2: well over the cap.
      const expected = !scored ? null : scenario === 'sharp' ? 50 : scenario === 'mixed' ? 0 : Math.min(50, weight * (5 - out) * 2);
      const sharp = scenario === 'sharp';
      check(`pencil bonus (${scenario}): finds it, ${sharp ? 'two stars (Sharp eye)' : 'one star'}, bonus ${expected}`, state.status === 'found' && state.end?.stars === (sharp ? 2 : 1) && state.sharp === sharp && state.pencilBonus === expected, JSON.stringify({ status: state.status, stars: state.end?.stars, sharp: state.sharp, pencilBonus: state.pencilBonus, tag: named.tag }));
      // A find by name: the star's 50 plus streak, no moves left (plan 053), plus the bonus.
      const streakPoints = Math.min(100, named.streak * 10);
      check(`pencil bonus (${scenario}): in the round's points (${sharp ? 100 : 50} + streak ${streakPoints} + ${expected ?? 0})`, state.end?.points === (sharp ? 100 : 50) + streakPoints + (expected ?? 0), JSON.stringify({ points: state.end?.points, streak: named.streak }));
      const card = await waitFor(() => {
        const sheet = document.querySelector('section[aria-labelledby="end-title"]');
        return sheet ? { bonus: sheet.querySelector('[data-pencil-bonus]')?.getAttribute('data-pencil-bonus') ?? null, sharp: Boolean(sheet.querySelector('[data-sharp-eye]')) } : null;
      }, 'the round-end card', 10_000);
      check(`pencil bonus (${scenario}): the round-end card ${scored ? 'shows the bonus' : 'shows no bonus'}${sharp ? ' and the Sharp eye' : ''}`, card.bonus === (expected === null ? null : String(expected)) && card.sharp === sharp, JSON.stringify(card));
      const mystery = poolSpecies.get(state.mysteryId).scientificName;
      const eyes = raw => JSON.parse(raw ?? '{}')[mystery]?.sharpEyes ?? 0;
      const journalAfter = await evaluate(() => localStorage.getItem('clue-match:journal:v1'));
      check(`pencil bonus (${scenario}): the journal ${sharp ? 'adds a Sharp eye badge' : 'adds no badge'} to that animal`, eyes(journalAfter) === eyes(named.journalBefore) + (sharp ? 1 : 0), JSON.stringify({ before: eyes(named.journalBefore), after: eyes(journalAfter) }));
      if (scenario === 'sharp') {
        const shown = await evaluate(async () => {
          document.querySelector('button[aria-label="Menu"]')?.click();
          await new Promise(resolve => setTimeout(resolve, 250));
          [...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent === 'Field journal')?.click();
          await new Promise(resolve => setTimeout(resolve, 1200));
          return Boolean(document.querySelector('[role=dialog] [data-sharp-eyes]'));
        });
        check('pencil bonus (sharp): the Field Journal shows the Sharp eye badge', shown);
        await screenshot('09-journal-sharp-eye.png');
        journalSources += await checkSources('journal (sharp eye)', JOURNAL, false);
        await screenshot('11-journal-sources-open.png');
      }
      if (scenario === 'right') await screenshot('08-pencil-bonus-end.png');
    }

    check('sources: the journal showed a fact list with sources', journalSources > 0, `${journalSources} lists`);

    // An AmphibiaWeb-sourced animal's card cites it in full (CC BY-NC). Whatever the database holds: the pool names the
    // animals, the continent with the most of them is played, and the first seed that deals one as the mystery is named.
    const probeStart = Date.now();
    const amphibia = await evaluate(async () => {
      const pool = await (await fetch('/api/clue-game/pool/')).json();
      const { places } = await (await fetch('/api/places/')).json();
      const ids = [...new Set(pool.facts.filter(fact => fact.source?.url && new URL(fact.source.url).hostname.endsWith('amphibiaweb.org') && pool.citations?.[fact.source.url]).map(fact => fact.speciesId))];
      const [place] = places.filter(candidate => candidate.kind === 'continent')
        .map(candidate => ({ key: candidate.key, ids: candidate.speciesIds.filter(id => ids.includes(id)) }))
        .filter(candidate => candidate.ids.length > 0).sort((a, b) => b.ids.length - a.ids.length);
      return { ids, place: place ?? null };
    });
    check('sources: the pool has AmphibiaWeb-sourced facts with their citations, on a continent', Boolean(amphibia.place), JSON.stringify(amphibia));
    if (amphibia.place) {
      let hit = null;
      for (let seed = 1; seed <= 40 && !hit; seed++) {
        await evaluate(() => { sessionStorage.removeItem('cc:explore:game'); localStorage.clear(); });
        await goto(`${BASE}/explore/?seed=${seed}&place=${encodeURIComponent(amphibia.place.key)}`);
        const mysteryId = await waitFor(() => window.__cc?.clue?.()?.mysteryId ?? null, 'a dealt round', 60_000);
        if (amphibia.place.ids.includes(mysteryId)) hit = { seed, mysteryId };
      }
      const probeMs = Date.now() - probeStart;
      report.sources = { amphibiaweb: { seed: hit?.seed ?? null, place: amphibia.place.key, speciesId: hit?.mysteryId ?? null, probeMs } };
      console.log(`  sources: AmphibiaWeb probe ${probeMs} ms, seed ${hit?.seed ?? 'none'}`);
      check('sources: a seed (1..40) deals an AmphibiaWeb-sourced animal as the mystery', Boolean(hit), JSON.stringify(report.sources.amphibiaweb));
      if (hit) {
        await waitFor(boardReady, 'a fresh board', 60_000);
        await sleep(1500);
        // The control for the review check: during play at 1280 px the side notes are drawn.
        const playing = await sideNotesAt(1280, 800, false);
        await sideNotesAt(...PHONE);
        check('sources: at 1280 px during play the side notes are drawn (control for the review check)', playing.wide && playing.sideNotes, JSON.stringify(playing));
        await evaluate(id => window.__nameIt(id), hit.mysteryId);
        await waitFor(selector => document.querySelector(selector) && true, 'the round-end card', 10_000, CARD);
        await sleep(1500);
        await checkSources('AmphibiaWeb card', CARD);
        const entry = await evaluate(selector => {
          const li = [...document.querySelectorAll(`${selector} [data-source-entry]`)].find(item => [...item.querySelectorAll('a')].some(a => new URL(a.href).hostname.endsWith('amphibiaweb.org')));
          return li?.textContent.replace(/\s+/g, ' ') ?? null;
        }, CARD);
        check('sources: the AmphibiaWeb entry cites AmphibiaWeb, CC BY-NC, reworded', Boolean(entry) && entry.includes('AmphibiaWeb') && entry.includes('License: CC BY-NC') && entry.includes('Reworded for this game.'), entry ?? 'no entry links to amphibiaweb.org');
        // Closed and open, light and dark; the theme as it was afterwards.
        await inThemes(async mode => {
          for (const open of [false, true]) {
            await evaluate(({ selector, open }) => {
              const details = document.querySelector(`${selector} details[data-sources]`);
              details.open = open;
              const entry = [...details.querySelectorAll('[data-source-entry]')].find(item => [...item.querySelectorAll('a')].some(a => new URL(a.href).hostname.endsWith('amphibiaweb.org')));
              (open ? entry : details).scrollIntoView({ block: 'nearest' });
            }, { selector: CARD, open });
            await sleep(300);
            await screenshot(`10-sources-${open ? 'open' : 'closed'}-${mode}.png`);
          }
        });
      }
    }

    check('no console errors', report.consoleErrors.length === 0, report.consoleErrors.slice(0, 3).join(' | '));
    check('no failed requests', report.failedRequests.length === 0, report.failedRequests.slice(0, 3).join(' | '));
  } finally {
    await close();
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
    const kinds = Map.groupBy(failed, result => kind(result.name));
    if (failed.length) console.log(`First failure: ${failed[0].name}${failed[0].detail ? `\n  ${failed[0].detail}` : ''}`);
    for (const [, results] of [...kinds].slice(0, 8)) console.log(`  FAIL ${results[0].name}${results.length > 1 ? ` (x${results.length})` : ''}`);
    pruneArtifacts();
    console.log(`${report.checks.length - failed.length}/${report.checks.length} checks passed. Artifact: ${path.relative(process.cwd(), outDir)}/`);
    process.exitCode = failed.length ? 1 : 0;
  });
