import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';

const PORT = Number(process.env.MEASURE_PORT || 4173);
const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TARGET_PATH = '/ordSPD/index.html';
const MAX_WAIT_MS = Number(process.env.MEASURE_TIMEOUT_MS || 180000);
const TARGET_AUDIO_DECODE_COUNT = Number(process.env.MEASURE_TARGET_DECODE_COUNT || 10);
const FORCE_DEFERRED_PRELOAD = process.env.MEASURE_FORCE_DEFERRED_PRELOAD;
const OVERRIDE_IMMEDIATE_PRELOAD_COUNT = process.env.MEASURE_IMMEDIATE_PRELOAD_COUNT;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon'
};

const rootDir = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function withinRoot(resolvedPath) {
  const normalizedRoot = path.resolve(rootDir) + path.sep;
  return resolvedPath === path.resolve(rootDir) || resolvedPath.startsWith(normalizedRoot);
}

function createStaticServer() {
  return http.createServer(async (req, res) => {
    try {
      const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const joinedPath = path.join(rootDir, requestPath === '/' ? TARGET_PATH : requestPath);
      const resolvedPath = path.resolve(joinedPath);

      if (!withinRoot(resolvedPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const stat = await fs.stat(resolvedPath).catch(() => null);
      if (!stat || !stat.isFile()) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      const body = await fs.readFile(resolvedPath);
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
      res.end(body);
    } catch (error) {
      res.writeHead(500);
      res.end(`Server Error: ${error.message}`);
    }
  });
}

async function run() {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const metrics = {
    domContentLoadedMs: null,
    loadMs: null,
    iframesCreatedMs: null,
    firstAudioDecodeMs: null,
    tenthAudioDecodeMs: null,
    audioDecodeCount: 0,
    timedOutWaitingForDecodeTarget: false,
    errors: []
  };

  let navStart = Date.now();
  let browser;

  try {
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(
      ({ forceDeferred, immediateCount }) => {
        if (forceDeferred !== null) {
          window.ORDSPD_ENABLE_DEFERRED_PRELOAD = forceDeferred;
        }
        if (immediateCount !== null) {
          window.ORDSPD_STARTUP_IMMEDIATE_PRELOAD_COUNT = immediateCount;
        }
      },
      {
        forceDeferred:
          FORCE_DEFERRED_PRELOAD === undefined
            ? null
            : FORCE_DEFERRED_PRELOAD.toLowerCase() === 'true',
        immediateCount:
          OVERRIDE_IMMEDIATE_PRELOAD_COUNT === undefined
            ? null
            : Number(OVERRIDE_IMMEDIATE_PRELOAD_COUNT)
      }
    );

    page.on('pageerror', (err) => metrics.errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      const text = msg.text();
      const nowMs = Date.now() - navStart;

      if (text.includes('[IframeManager] DEBUG All iframes created') && metrics.iframesCreatedMs === null) {
        metrics.iframesCreatedMs = nowMs;
      }

      if (text.includes('[fetchAndDecodeAudio] Audio data fetched and decoded successfully.')) {
        metrics.audioDecodeCount += 1;
        if (metrics.firstAudioDecodeMs === null) {
          metrics.firstAudioDecodeMs = nowMs;
        }
        if (metrics.audioDecodeCount === 10 && metrics.tenthAudioDecodeMs === null) {
          metrics.tenthAudioDecodeMs = nowMs;
        }
      }
    });

    page.on('load', () => {
      if (metrics.loadMs === null) {
        metrics.loadMs = Date.now() - navStart;
      }
    });

    navStart = Date.now();
    await page.goto(`http://127.0.0.1:${PORT}${TARGET_PATH}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    metrics.domContentLoadedMs = Date.now() - navStart;

    const deadline = Date.now() + MAX_WAIT_MS;
    while (metrics.audioDecodeCount < TARGET_AUDIO_DECODE_COUNT && Date.now() < deadline) {
      await page.waitForTimeout(100);
    }
    if (metrics.audioDecodeCount < TARGET_AUDIO_DECODE_COUNT) {
      metrics.timedOutWaitingForDecodeTarget = true;
    }

    const output = {
      url: `http://127.0.0.1:${PORT}${TARGET_PATH}`,
      timeoutMs: MAX_WAIT_MS,
      targetAudioDecodeCount: TARGET_AUDIO_DECODE_COUNT,
      forcedDeferredPreload:
        FORCE_DEFERRED_PRELOAD === undefined ? 'default' : FORCE_DEFERRED_PRELOAD.toLowerCase() === 'true',
      overrideImmediatePreloadCount:
        OVERRIDE_IMMEDIATE_PRELOAD_COUNT === undefined ? 'default' : Number(OVERRIDE_IMMEDIATE_PRELOAD_COUNT),
      ...metrics
    };
    console.log(JSON.stringify(output, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
