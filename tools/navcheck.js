// Measures the nav on every page, in every language, at phone width, with no
// npm dependencies at all.
//
// Why this exists: puppeteer-core cannot be installed on this machine (the Node
// install has no node_modules/npm), and Russian and English nav labels are
// longer than the Uzbek ones the layout was designed around. Node 24 ships a
// global WebSocket, so Chrome can be driven over the DevTools protocol directly.
//
//   python -m http.server 8765     (from the repo root)
//   node navcheck.js
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { CHROME, SITE_DIR } = require('./paths');
const BASE = 'http://localhost:8765/';
const DIR = SITE_DIR;
const PORT = 9333;
// 900 and 1024 are here because they were missing. The desktop nav row demands
// ~1050px on the Uzbek pages and the wrap rules used to start at 820, so every
// window between those two numbers -- a 1024x768 laptop, any half-screen browser
// -- pushed the CTA off the right edge. Three widths that happened to sit either
// side of the gap reported "no horizontal overflow" for months. 1024 is the
// laptop; 900 is the middle of the band; 1100 is just above the wrap cutoff,
// where the single-row layout has to start being correct again.
const WIDTHS = [360, 768, 900, 1024, 1100, 1280];

const LANGDIRS = ['', 'ru/', 'en/'];
const PAGES = LANGDIRS.flatMap(d => fs.existsSync(DIR + d)
  ? fs.readdirSync(DIR + d).filter(f => f.endsWith('.html')).sort().map(f => d + f)
  : []);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// What we ask each page, once it has loaded and its fonts are settled.
const PROBE = `(() => {
  const r = el => el ? el.getBoundingClientRect() : null;
  const de = document.documentElement;
  const nav = document.querySelector('.navin');
  const brand = document.querySelector('.brand');
  const sw = document.querySelector('.langsw');
  const cta = document.querySelector('.navin > .btn');
  const acct = document.querySelector('.navin > .navacct');
  const links = [...document.querySelectorAll('.navlinks a')];
  // Group into visual rows by overlapping vertical span. Comparing raw .top
  // would report three rows for three items of different heights sitting side
  // by side, which is what a first attempt at this did.
  const boxes = [brand, sw, acct, cta].filter(Boolean).map(r)
    .filter(b => b.width > 0 && b.height > 0)
    .sort((a, b) => a.top - b.top);
  const bands = [];
  for (const b of boxes) {
    const band = bands.find(x => b.top < x.bottom - 2 && b.bottom > x.top + 2);
    if (band) { band.top = Math.min(band.top, b.top); band.bottom = Math.max(band.bottom, b.bottom); }
    else bands.push({ top: b.top, bottom: b.bottom });
  }
  const rows = bands;
  const swItems = sw ? [...sw.children].map(el => {
    const b = r(el); return { w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
  }) : [];
  // header.js replaces the three pills with a dropdown (.langpick) and hides
  // .langsw, which is the no-JS fallback. A hidden element measures 0px and
  // would fail a tap-target check on every page, so measure what is painted.
  let swTap = [];
  const pick = document.querySelector('.langpick');
  if (pick) {
    const lbtn = pick.querySelector('.langbtn');
    if (lbtn) {
      swTap.push(+r(lbtn).height.toFixed(1));
      lbtn.click();                       // the menu stays hidden until opened
      swTap.push(...[...pick.querySelectorAll('.langmenu .langitem')]
        .map(el => +r(el).height.toFixed(1)));
      lbtn.click();                       // leave the page as it was found
    }
  } else if (sw) {
    swTap = [...sw.children].map(el => +r(el).height.toFixed(1));
  }
  // Anything sticking out past the viewport is a real horizontal-scroll bug.
  const wide = [...document.querySelectorAll('body *')].filter(el => {
    const b = el.getBoundingClientRect();
    return b.width > 0 && (b.right > de.clientWidth + 1 || b.left < -1);
  }).slice(0, 4).map(el => el.tagName.toLowerCase() +
      (el.className && typeof el.className === 'string'
        ? '.' + el.className.split(' ').filter(Boolean).slice(0,2).join('.') : ''));
  return JSON.stringify({
    lang: de.getAttribute('lang'),
    docOverflow: de.scrollWidth - de.clientWidth,
    navRows: rows.length,
    navBottom: nav ? Math.round(r(nav).bottom) : 0,
    swItems,
    swTap,
    swCurrent: sw ? (sw.querySelector('[aria-current="true"]') || {}).textContent : null,
    swLinks: sw ? [...sw.querySelectorAll('a')].map(a => a.getAttribute('href')) : [],
    navLinkCount: links.length,
    acct: acct ? { w: Math.round(r(acct).width), h: Math.round(r(acct).height),
                   text: acct.textContent.trim() } : null,
    // The Obrazlar page builds its ten characters client-side from
    // characters.js + strings.js, so it is the one place where a translation
    // can be correct in the file and still wrong on screen.
    bands: (document.getElementById('bands') || {}).textContent || null,
    wide
  });
})()`;

// ---------- minimal DevTools client ----------
let ws, nextId = 1, waiters = new Map(), events = new Map();

function send(method, params = {}, sessionId) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    waiters.set(id, { resolve, reject });
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId }
                                     : { id, method, params }));
  });
}
const once = name => new Promise(r => events.set(name, r));

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-nav-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + PORT, '--no-sandbox', '--blink-settings=preferredColorScheme=1',
    '--disable-gpu', '--hide-scrollbars', '--user-data-dir=' + profile,
    'about:blank',
  ], { stdio: 'ignore' });

  // Wait for the debugging endpoint to come up.
  let info = null;
  for (let i = 0; i < 60 && !info; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) info = await res.json();
    } catch { await sleep(250); }
  }
  if (!info) { console.error('Chrome did not start a debug port'); process.exit(1); }

  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && waiters.has(m.id)) {
      const w = waiters.get(m.id); waiters.delete(m.id);
      m.error ? w.reject(new Error(m.error.message)) : w.resolve(m.result);
    } else if (m.method && events.has(m.method)) {
      const r = events.get(m.method); events.delete(m.method); r(m.params);
    }
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  await call('Page.enable');
  await call('Runtime.enable');

  const problems = [];
  let checked = 0;

  for (const width of WIDTHS) {
    await call('Emulation.setDeviceMetricsOverride', {
      width, height: 820, deviceScaleFactor: 1, mobile: width < 700,
    });
    for (const page of PAGES) {
      const loaded = new Promise(r => events.set('Page.loadEventFired', r));
      await call('Page.navigate', { url: BASE + page });
      await Promise.race([loaded, sleep(8000)]);
      await call('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
      const { result } = await call('Runtime.evaluate', { expression: PROBE, returnByValue: true });
      const d = JSON.parse(result.value);
      checked++;

      const at = `${page} @${width}`;
      // test.html is the standalone test app: it has its own chrome rather than
      // the site nav, so the site-wide nav checks below do not apply. It used to
      // have no switcher either, because the instrument was Uzbek-only -- it now
      // ships in three languages, so the switcher has to be there instead.
      const hasNav = page !== 'test.html';
      if (!hasNav) {
        if (d.swItems.length !== 3)
          problems.push(`${at}: test.html switcher has ${d.swItems.length} items, expected 3`);
        continue;
      }
      if (d.docOverflow > 0)
        problems.push(`${at}: page scrolls horizontally by ${d.docOverflow}px  ${d.wide.join(', ')}`);
      if (d.swItems.length !== 3)
        problems.push(`${at}: language switcher has ${d.swItems.length} items, expected 3`);
      if (d.swLinks.length !== 2)
        problems.push(`${at}: switcher offers ${d.swLinks.length} other languages, expected 2`);
      if (!d.swCurrent)
        problems.push(`${at}: switcher does not mark the current language`);
      if (!d.acct || d.acct.w === 0 || d.acct.h === 0)
        problems.push(`${at}: the account button is missing or hidden`);
      else if (d.acct.h < 24)
        problems.push(`${at}: account button only ${d.acct.h}px tall`);
      if (d.navLinkCount !== 4)
        problems.push(`${at}: ${d.navLinkCount} nav links, expected 4`);
      // 24px is the tap target the switcher must not fall below on a phone.
      // Measured on the control that is painted, not the hidden fallback.
      if (width === 360 && !d.swTap.length)
        problems.push(`${at}: no language control painted`);
      else if (width === 360 && d.swTap.some(h => h < 24))
        problems.push(`${at}: switcher tap target only ${Math.min(...d.swTap)}px tall`);
      // Brand, switcher and CTA must share one row. If the CTA wraps, the
      // sticky header eats a quarter of a 360x640 screen.
      if (width === 360 && d.navRows !== 1)
        problems.push(`${at}: nav header wraps to ${d.navRows} rows (${d.navBottom}px tall)`);
      const expLang = page.startsWith('ru/') ? 'ru' : page.startsWith('en/') ? 'en' : 'uz';
      if (d.lang !== expLang)
        problems.push(`${at}: <html lang="${d.lang}"> but lives in ${page}`);

      if (page.endsWith('obrazlar.html')) {
        const b = d.bands || '';
        if (b.length < 400)
          problems.push(`${at}: character bands did not render (${b.length} chars)`);
        // Each language must render in its own script, from the same JS.
        // Deliberately not the Leaders family: four archetypes lost their
        // adjective, and the bare "Yetakchi"/"Leader"/"Лидер" left behind is a
        // substring of the family heading above it, so this check would pass on
        // the heading alone even if every card vanished.
        const want = { uz: 'Ishonchli Doʻst', ru: 'Надёжный Друг', en: 'Trusted Friend' }[expLang];
        if (!b.includes(want))
          problems.push(`${at}: bands missing "${want}"`);
        const wrong = { uz: 'Trusted Friend', ru: 'Ishonchli Doʻst', en: 'Надёжный Друг' }[expLang];
        if (b.includes(wrong))
          problems.push(`${at}: bands leaked "${wrong}" into the ${expLang} page`);
      }

      if (width === 360 && page.endsWith('index.html'))
        console.log(`  ${at.padEnd(22)} lang=${d.lang}  nav rows=${d.navRows}  ` +
                    `nav height=${d.navBottom}px  switcher=${d.swItems.map(i => i.w + 'x' + i.h).join(' ')}`);
    }
  }

  console.log(`\nchecked ${checked} page-widths (${PAGES.length} pages x ${WIDTHS.length} widths)`);
  if (problems.length) {
    console.log(`\n${problems.length} PROBLEMS:`);
    problems.slice(0, 30).forEach(p => console.log('  ' + p));
  } else {
    console.log('no horizontal overflow; switcher correct on every page and width');
  }

  chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(problems.length ? 1 : 0);
}

// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
main().catch(e => { console.error(e); process.exit(1); });
