import puppeteer from 'puppeteer';
import { mkdir, readdir, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANDIDATE_BROWSERS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];
async function findSystemBrowser() {
  for (const p of CANDIDATE_BROWSERS) {
    try { await access(p, FS.X_OK); return p; } catch {}
  }
  return null;
}

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUT_DIR = resolve(ROOT, 'temporary screenshots');

const url = process.argv[2];
const label = process.argv[3] || '';

if (!url) {
  console.error('usage: node screenshot.mjs <url> [label]');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const existing = await readdir(OUT_DIR);
const nums = existing
  .map(f => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map(m => parseInt(m[1], 10));
const next = (nums.length ? Math.max(...nums) : 0) + 1;
const suffix = label ? `-${label}` : '';
const outPath = resolve(OUT_DIR, `screenshot-${next}${suffix}.png`);

const executablePath = await findSystemBrowser();
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  ...(executablePath ? { executablePath } : {}),
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
// Give web fonts and any post-load JS one more beat to settle.
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(outPath);
