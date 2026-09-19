// The results live ON the hub and grow as challenges are finished.
//
// This is the thing that must not regress: a student should learn something
// about themselves after challenge ONE, not be handed everything at the end.
// So the test finishes them one at a time and checks the panel grows by exactly
// one line each time -- and that the hexagon appears only once the interests
// challenge is actually done, rather than being drawn from a handful of answers.
//
//   node tools/hub_summary.js
const path = require('path');
const puppeteer = require('puppeteer-core');

const { CHROME } = require('./paths');
const LANG = process.argv[2] || 'uz';
const BASE = 'http://localhost:8765/test.html' + (LANG === 'uz' ? '' : `?lang=${LANG}`);
const OUT = path.join(__dirname, 'build', 'summary');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

const read = (page) => page.evaluate(() => ({
  onHub: !!document.querySelector('.chlist'),
  hasPanel: !!document.querySelector('.rsum'),
  // The panel must sit ABOVE the challenge list, the way Naseeb Edu orders them.
  panelFirst: (() => {
    const p = document.querySelector('.rsum'), l = document.querySelector('.chlist');
    if (!p || !l) return null;
    return !!(p.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING);
  })(),
  leads: [...document.querySelectorAll('.rsumlines dt')].map((e) => e.textContent),
  values: [...document.querySelectorAll('.rsumlines dd')].map((e) => e.textContent),
  hexagon: !!document.querySelector('.rpoly .shape'),
  code: (document.querySelector('.rsumcode') || {}).textContent || null,
}));

// Fill one challenge's items with a plausible, uneven answer sheet.
const finish = (page, key) => page.evaluate((k) => {
  openChallenge(k);
  const c = challengeBy(k);
  const weight = { R: 5, I: 4, A: 4, S: 2, E: 1, C: 3 };
  const fillPlan = () => {
    for (let n = 0; n < state.plan.length; n++) {
      const i = state.plan[n], it = ITEMS[i];
      if (state.answers[i]) continue;
      if (it.sec === 'm') state.answers[i] = it.answer + 1;          // reasoning: correct
      else if (it.sec === 'c') state.answers[i] = weight[it.s];      // a real interest profile
      else state.answers[i] = (n % 5) + 1;
    }
  };
  fillPlan();
  // A challenge can grow a follow-up block once its opening is answered.
  for (let guard = 0; guard < 4 && c.extend; guard++) {
    const more = c.extend(state.answers);
    if (!more.length) break;
    state.plan = state.plan.concat(more);
    fillPlan();
  }
  finishChallenge();
  return challengeDone(c, state.answers);
}, key);

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const u = r.url();
    if (u.indexOf('supabase.co') !== -1) {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      };
      if (r.method() === 'OPTIONS') return r.respond({ status: 200, headers: cors, body: '' });
      return r.respond({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
    }
    if (u.indexOf('script.google.com') !== -1)
      return r.respond({ status: 200, contentType: 'application/json', body: '{}' });
    return r.continue();
  });

  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('naseebmind_session_v1', JSON.stringify({
    access: 'stub', refresh: 'stub', expires: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'student@example.com' },
  })));
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.chlist');

  const start = await read(page);
  ok(!start.hasPanel, 'an untouched hub shows no results panel');

  const order = await page.evaluate(() => CHALLENGES.map((c) => c.key));
  let previous = 0;
  for (let n = 0; n < order.length; n++) {
    const key = order[n];
    ok(await finish(page, key), `challenge ${n + 1} (${key}) registers as finished`);
    await page.waitForSelector('.chlist', { timeout: 10000 });
    const now = await read(page);

    ok(now.onHub, `after finishing ${key}, the student is back on the hub`);
    ok(now.hasPanel, `the results panel is on the hub after ${key}`);
    ok(now.panelFirst, 'the panel sits above the challenge list');
    ok(now.leads.length === previous + 1,
       `the panel grew by exactly one line (${previous} -> ${now.leads.length})`);
    ok(now.values.every((v) => v.trim().length > 0), 'no line on the panel is blank');
    previous = now.leads.length;

    const interestsDone = order.slice(0, n + 1).indexOf('interests') !== -1;
    ok(now.hexagon === interestsDone,
       interestsDone ? 'the hexagon is drawn once interests is done'
                     : 'no hexagon before interests is done');
    if (n === 0) {
      console.log('    after one challenge: ' + now.leads[0] + ' -> ' + now.values[0]);
      await page.screenshot({ path: path.join(OUT, `hub-after-1-${LANG}.png`), fullPage: true });
    }
  }

  const end = await read(page);
  console.log('  final panel (' + end.code + '):');
  end.leads.forEach((l, i) => console.log('    ' + l.padEnd(26) + ' ' + end.values[i]));
  ok(end.leads.length === order.length, `all six lines present at the end (${end.leads.length})`);
  ok(end.onHub, 'finishing the last challenge still lands on the hub, not a result screen');
  await page.screenshot({ path: path.join(OUT, `hub-after-6-${LANG}.png`), fullPage: true });

  console.log(errors.length ? '\n  PAGE ERRORS:\n   ' + errors.join('\n   ') : '\n  no page errors');
  console.log('  ' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
