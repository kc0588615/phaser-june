// Headless Chrome over the DevTools Protocol, shared by the game's e2e (scripts/e2e.mjs) and the
// website's (scripts/e2e-site.mjs). No Playwright: the protocol is all either test needs.
//   env: CHROME_PATH (default /usr/bin/google-chrome)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** A minimal Chrome DevTools Protocol client over the browser's WebSocket. */
export function connect(url) {
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

export function launchChrome(profileDir) {
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

/** Chrome on a fresh profile, connected. `close()` ends it and removes the profile; so does a kill signal. */
export async function startBrowser() {
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
  const close = async () => {
    browser?.close();
    chrome.kill();
    await sleep(300);
    rmSync(profileDir, { recursive: true, force: true });
  };
  try {
    browser = connect(await endpoint);
    await browser.opened;
  } catch (error) {
    await close();
    throw error;
  }
  return { browser, close };
}

/** A new tab: `page(method, params)` sends to it; `evaluate(fn, ...args)` runs `fn` in it and returns its JSON value; `waitFor` polls `evaluate`. */
export async function openPage(browser) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => browser.send(method, params, sessionId);
  const evaluate = async (fn, ...args) => {
    const { result, exceptionDetails } = await page('Runtime.evaluate', { expression: `(${fn})(...${JSON.stringify(args)})`, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  /** Polls `fn` until it returns a truthy value (that value), or throws after `timeoutMs`. */
  const waitFor = async (fn, what, timeoutMs = 30_000, ...args) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const value = await evaluate(fn, ...args).catch(() => null);
      if (value) return value;
      await sleep(250);
    }
    throw new Error(`Timed out waiting for ${what}`);
  };
  return { targetId, sessionId, page, evaluate, waitFor };
}
