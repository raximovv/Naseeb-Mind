// A contact sheet of the header in every state worth looking at, so the two
// auth states can be compared side by side the way the mockup showed them.
//
// Each strip is the real header, screenshotted from the real page; they are then
// laid out on one sheet so there is a single thing to look at rather than nine.
const fs = require('fs');
const path = require('path');
const puppeteer = require('./node_modules/puppeteer-core');

const { CHROME } = require('./paths');
const BASE = process.env.BASE || 'http://localhost:8765/';
const OUT = process.env.OUT || path.join(require('os').tmpdir(), 'naseeb-header.png');

function fakeSession(name) {
  return JSON.stringify({
    access: 'test-access-token', refresh: 'test-refresh-token',
    expires: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '0-0-0-0-1', email: 'rahim@example.com', name: name || '' },
  });
}

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));

  const strips = [];

  // The header plus a slice of what is under it, so the dropdown has somewhere
  // to fall and the page's own ground is visible behind it.
  async function strip(caption, url, { name, open, width = 1500, height = 300, theme } = {}) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 2 });
    await page.goto(BASE + url, { waitUntil: 'networkidle0' });
    await page.evaluate((v, t) => {
      if (v === null) localStorage.removeItem('naseebmind_session_v1');
      else localStorage.setItem('naseebmind_session_v1', v);
      if (t) localStorage.setItem('naseebmind_theme_v1', t);
      else localStorage.removeItem('naseebmind_theme_v1');
    }, name === null ? null : fakeSession(name), theme || '');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 250));
    if (open) {
      await page.click('.acctbtn');
      await new Promise((r) => setTimeout(r, 150));
    }
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width, height }, encoding: 'base64' });
    strips.push({ caption, buf, width });
    console.log('  shot ' + caption);
  }

  await strip('Kirishdan oldin — index.html', 'index.html', { name: null });
  await strip('Kirgandan keyin — nomi yoʻq hisob', 'index.html', { name: '', open: true });
  await strip('Kirgandan keyin — nomi bor hisob', 'index.html', { name: 'Rahim', open: true });
  await strip('test.html — oltita sinov kirmasdan ham koʻrinadi', 'test.html', { name: null, height: 460 });
  await strip('test.html — hisob menyusi', 'test.html', { name: 'Rahim', open: true });
  await strip('ru/index.html', 'ru/index.html', { name: '', open: true });
  await strip('en/index.html', 'en/index.html', { name: 'Rahim', open: true });
  await strip('360px — nom yashirinadi, menyu ekranda qoladi', 'index.html',
              { name: 'Rahim', open: true, width: 360, height: 330 });
  // Dark, which is Naseeb Edu's own dark theme copied token for token.
  await strip('Tungi rejim — index.html', 'index.html', { name: 'Rahim', open: true, theme: 'dark', height: 420 });
  await strip('Tungi rejim — obrazlar.html', 'obrazlar.html', { name: null, theme: 'dark', height: 560 });
  await strip('Tungi rejim — test.html', 'test.html', { name: null, theme: 'dark', height: 560 });
  await strip('Tungi rejim — obraz sahifasi', 'obraz-jamoaning-yuragi.html', { name: null, theme: 'dark', height: 560 });

  // The sheet itself.
  const sheet = await browser.newPage();
  const body = strips.map((s) => `
    <figure>
      <figcaption>${s.caption}</figcaption>
      <img src="data:image/png;base64,${s.buf}" style="width:${Math.min(s.width, 1500)}px">
    </figure>`).join('');
  await sheet.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:30px;background:#EFEBE3;
         font:600 15px/1.4 'Segoe UI',system-ui,sans-serif;color:#2B2620}
    figure{margin:0 0 26px}
    figcaption{margin:0 0 7px;font-size:14px;letter-spacing:.01em;color:#6E6558}
    img{display:block;border:1px solid #DCD4C4;border-radius:10px;
        box-shadow:0 4px 14px rgba(43,38,32,.09)}
  </style>${body}`, { waitUntil: 'load' });
  await sheet.setViewport({ width: 1560, height: 1000, deviceScaleFactor: 1 });
  await new Promise((r) => setTimeout(r, 200));
  fs.writeFileSync(OUT, await sheet.screenshot({ fullPage: true }));
  console.log('\nwrote ' + OUT);
  await browser.close();
})();
