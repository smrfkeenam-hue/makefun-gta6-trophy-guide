// Takes the entry's screenshots: serves app/ locally, renders each view from
// shots.json in headless Chromium over the DevTools protocol, and writes the
// shots as JPEGs into screenshots/ (each at most 256 KiB, 1280x800).
// Each shot may scroll the page first (shots.json "scroll") so the capture
// shows the part of the guide it is about — the trophy list with a guide open,
// the roadmap stages, the spoiler setting at work. The shots are real renders
// of this app's own code in a browser, never edited, composited or borrowed.
// Run from the repository root:  node shots.mjs
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const PORT = 8901;
const DEBUG_PORT = 9222;
const MAX_BYTES = 262144;

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

function waitForServer(port, tries = 40) {
  return new Promise((resolvePromise, rejectPromise) => {
    const tick = async (left) => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/index.html`);
        if (res.ok) return resolvePromise();
      } catch { /* not up yet */ }
      if (left <= 0) return rejectPromise(new Error('server did not come up'));
      setTimeout(() => tick(left - 1), 200);
    };
    tick(tries);
  });
}

// Minimal DevTools-protocol client over the built-in WebSocket.
class DevToolsPage {
  constructor(wsUrl) {
    this.socket = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.loadWaiters = [];
    this.socket.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolvePromise, rejectPromise } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) rejectPromise(new Error(msg.error.message));
        else resolvePromise(msg.result);
      } else if (msg.method === 'Page.loadEventFired') {
        for (const waiter of this.loadWaiters.splice(0)) waiter();
      }
    });
  }

  ready() {
    return new Promise((resolvePromise) => {
      this.socket.addEventListener('open', resolvePromise, { once: true });
    });
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, { resolvePromise, rejectPromise });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitForLoad() {
    return new Promise((resolvePromise) => this.loadWaiters.push(resolvePromise));
  }

  async navigate(url) {
    const loaded = this.waitForLoad();
    await this.call('Page.navigate', { url });
    await loaded;
    await sleep(900);
  }

  async scrollTo(y) {
    await this.call('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
    await sleep(400);
  }

  async screenshot(jpgPath) {
    for (const quality of [80, 60, 40]) {
      const { data } = await this.call('Page.captureScreenshot', { format: 'jpeg', quality });
      const bytes = Buffer.from(data, 'base64');
      if (bytes.length <= MAX_BYTES) {
        writeFileSync(jpgPath, bytes);
        return bytes.length;
      }
    }
    throw new Error(`${jpgPath} is still over 256 KiB at the lowest quality`);
  }

  close() {
    this.socket.close();
  }
}

async function takeShot(page, shot) {
  const jpgPath = join(repoRoot, 'screenshots', shot.file);
  await page.navigate(`http://127.0.0.1:${PORT}${shot.path}`);
  if (shot.scroll) await page.scrollTo(shot.scroll);
  const bytes = await page.screenshot(jpgPath);
  console.log(`${shot.file}: 1280x800, ${bytes} bytes — ${shot.note}`);
}

async function main() {
  const shots = JSON.parse(readFileSync(join(repoRoot, 'shots.json'), 'utf8'));
  mkdirSync(join(repoRoot, 'screenshots'), { recursive: true });
  if (!existsSync(CHROME)) throw new Error(`Chromium not found at ${CHROME}`);
  const profile = join('/tmp', 'leonida-shot-profile');
  rmSync(profile, { recursive: true, force: true });

  const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: repoRoot, stdio: 'ignore' });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--user-data-dir=${profile}`, '--window-size=1280,800',
    `--remote-debugging-port=${DEBUG_PORT}`, 'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitForServer(PORT);
    let targets;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
        break;
      } catch {
        await sleep(200);
      }
    }
    const pageTarget = (targets ?? []).find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('no DevTools page target found');
    const page = new DevToolsPage(pageTarget.webSocketDebuggerUrl);
    await page.ready();
    await page.call('Page.enable');
    await page.call('Runtime.enable');
    await page.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    for (const shot of shots) await takeShot(page, shot);
    page.close();
    console.log(`All ${shots.length} screenshots written to screenshots/.`);
  } finally {
    server.kill();
    chrome.kill();
    rmSync(profile, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
