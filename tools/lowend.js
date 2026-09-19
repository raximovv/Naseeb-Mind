// Simulates a cheap Android on a slow connection, the device most Uzbek students
// actually own (89% of internet users there are mobile-only). Desktop Chrome at a
// 390px viewport is NOT this: it has no CPU limit, no latency, and no data cost.
//
// Fails on things a student would actually feel: a slow first paint, tap targets
// too small for a thumb, text too small to read, or the page shipping more bytes
// than a metered connection should be asked for.
const puppeteer = require('puppeteer-core');

const { CHROME } = require('./paths');
const BASE = 'http://localhost:8765/';

// Slow 4G as Chrome DevTools defines it, and a 4x CPU slowdown for a budget SoC.
const NET = { offline: false, downloadThroughput: 400 * 1024 / 8,
              uploadThroughput: 400 * 1024 / 8, latency: 400 };
const CPU = 4;
const VIEWPORT = { width: 360, height: 640, deviceScaleFactor: 2, isMobile: true,
                   hasTouch: true };

let pass = 0, fail = 0, warn = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };
const note = m => { warn++; console.log('  WARN ' + m); };

async function measure(browser, path) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setRequestInterception(true);
  page.on('request', r => {
    if (r.url().indexOf('supabase.co') !== -1) {
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      };
      if (r.method() === 'OPTIONS') return r.respond({ status: 200, headers, body: '' });
      return r.respond({ status: 200, headers, contentType: 'application/json', body: '[]' });
    }
    if (r.url().indexOf('script.google.com') !== -1)
      return r.respond({ status: 200, body: '{"ok":true}' });
    return r.continue();
  });
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', NET);
  await client.send('Emulation.setCPUThrottlingRate', { rate: CPU });

  let bytes = 0;
  const heavy = [];
  page.on('response', async r => {
    const len = Number(r.headers()['content-length'] || 0);
    if (len) { bytes += len; if (len > 60000) heavy.push([r.url().split('/').pop(), len]); }
  });

  const t0 = Date.now();
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 120000 });
  const load = Date.now() - t0;
  const paint = await page.evaluate(() =>
    Math.round((performance.getEntriesByType('paint')
      .find(e => e.name === 'first-contentful-paint') || { startTime: 0 }).startTime));
  return { page, load, paint, bytes, heavy };
}

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
                                           args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });

  console.log('\n== the test page on a cheap phone (360px, 4x slower CPU, slow 4G) ==');
  const { page, load, paint, bytes, heavy } = await measure(browser, 'test.html');
  console.log('  first paint ' + paint + 'ms · load ' + load + 'ms · ' +
              (bytes / 1024).toFixed(0) + ' KB over the wire');
  heavy.forEach(([n, b]) => console.log('    heavy: ' + n + ' ' + (b / 1024).toFixed(0) + ' KB'));
  ok(paint < 3000, 'something is on screen within 3s (' + paint + 'ms)');
  // The local preview server does not gzip text, while GitHub Pages does. This
  // uncompressed ceiling still catches accidental video/bitmap payloads and is
  // sized for the six challenge banks now available from the hub.
  ok(bytes < 650 * 1024, 'uncompressed first load stays under 650 KB (' +
     (bytes / 1024).toFixed(0) + ' KB)');

  ok((await page.$$('.chcard')).length === 6, 'all challenges are visible before registration');
  await page.click('.chgo');
  ok(!!(await page.$('#authForm')), 'the account modal opens on the cheap phone');
  await page.evaluate(() => {
    localStorage.setItem('naseebmind_session_v1', JSON.stringify({
      access: 'stub', refresh: 'stub', expires: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' },
    }));
  });
  await page.reload({ waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => openChallenge('personality'));

  console.log('\n== can a thumb actually hit the answer circles ==');
  // The radio itself is opacity:0 / pointer-events:none, measuring it would be
  // measuring nothing. `.opt` is the label that actually receives the tap, and its
  // padding counts towards the hit area even though the ring looks smaller.
  const taps = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.opt')];
    const sizes = opts.map(o => { const r = o.getBoundingClientRect(); return Math.min(r.width, r.height); });
    // and confirm the tap really lands on the option, not on something above it
    const stolen = opts.filter(o => {
      const r = o.getBoundingClientRect();
      // elementFromPoint is probed at the CENTRE, so the centre is what has to be
      // on screen. Guarding on r.top let through options straddling the fold,
      // which returned null and were counted as intercepted.
      const cy = r.top + r.height / 2;
      if (cy < 0 || cy > innerHeight) return false;               // off-screen, can't test
      const hit = document.elementFromPoint(r.left + r.width / 2, cy);
      return !(hit && o.contains(hit));
    }).length;
    return { n: opts.length, min: Math.min(...sizes), max: Math.max(...sizes), stolen };
  });
  console.log('  ' + taps.n + ' targets, smallest ' + taps.min.toFixed(0) +
              'px, largest ' + taps.max.toFixed(0) + 'px');
  // 44px is the long-standing minimum comfortable touch target; 24px is the floor.
  ok(taps.min >= 24, 'no answer target below the 24px floor (smallest ' + taps.min.toFixed(0) + 'px)');
  ok(taps.stolen === 0, 'every visible option receives its own tap (' + taps.stolen + ' intercepted)');
  if (taps.min < 44) note('smallest target is ' + taps.min.toFixed(0) + 'px, under the 44px comfort guideline');

  console.log('\n== is the question text readable at arm\'s length ==');
  const type = await page.evaluate(() => {
    const q = document.querySelector('.qtext, .item h2, .item p');
    return q ? parseFloat(getComputedStyle(q).fontSize) : 0;
  });
  ok(type >= 16, 'question text is at least 16px (' + type + 'px)');

  console.log('\n== nothing spills sideways ==');
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(over <= 1, 'no horizontal overflow (' + over + 'px)');

  console.log('\n== finishing the test on this device ==');
  const t1 = Date.now();
  await page.evaluate(() => {
    state.answers = ITEMS.map((it, i) => (i % 5) + 1);
    const s = scoreAnswers(state.answers);
    const key = archetypeKeyOf(s);
    paintReport(s, archetypeOf(s), key, 'female', 15);
  });
  await new Promise(r => setTimeout(r, 400));
  const render = Date.now() - t1;
  ok(render < 4000, 'the result screen renders in under 4s (' + render + 'ms)');
  const hasPdf = await page.evaluate(() => !!document.querySelector('.btn.pdf'));
  ok(hasPdf, 'the PDF download is offered on the result screen');

  console.log('\n== what the PDF actually costs a student on mobile data ==');
  const pdf = await page.evaluate(async () => {
    const href = document.querySelector('.btn.pdf').getAttribute('href');
    const r = await fetch(href, { method: 'HEAD' });
    return { href, kb: Math.round(Number(r.headers.get('content-length') || 0) / 1024) };
  });
  console.log('  ' + pdf.href + ' = ' + pdf.kb + ' KB');
  ok(pdf.kb > 0, 'the guide is reachable from the result screen');
  // Measured breakdown of the 778 KB guide (2026-07-27), so nobody re-derives it:
  //   ~303 KB embedded font subsets (Chrome embeds one per page, ~30 in total)
  //   ~167 KB the cover artwork, 4 KB of SVG, but the tiled ikat pattern expands
  //   ~308 KB the actual page content
  // Not worth optimising yet: the fonts and the artwork ARE the design, and two of
  // the three delivery routes (Telegram file, email attachment) never make the
  // student download it over the web at all. Revisit if it passes ~1 MB.
  ok(pdf.kb < 1024, 'the guide stays under 1 MB (' + pdf.kb + ' KB)');
  if (pdf.kb > 500) note(pdf.kb + ' KB is ~' + (pdf.kb * 8 / 400).toFixed(0) +
                         's on slow 4G, acceptable, but do not let it grow');

  await page.close();
  await browser.close();
  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL ' + pass + ' CHECKS PASSED') +
              (warn ? '  (' + warn + ' warning' + (warn > 1 ? 's' : '') + ')' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
