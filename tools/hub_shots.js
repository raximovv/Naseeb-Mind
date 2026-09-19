// Screenshots of the six-challenge flow, in real Chrome, with the account API
// stubbed so nothing reaches Supabase and no test student is created.
//
//   node tools/hub_shots.js            uz, phone
//   node tools/hub_shots.js ru 900     another language, another width
//
// Signs a fake session into localStorage rather than driving the gate, because
// the gate's own screenshot is taken first and separately: everything after it
// needs an account, and creating twenty real ones to take screenshots would be
// twenty rows in a live database.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const { CHROME } = require('./paths');
const LANG = process.argv[2] || 'uz';
const WIDTH = parseInt(process.argv[3] || '390', 10);
const BASE = 'http://localhost:8765/test.html' + (LANG === 'uz' ? '' : `?lang=${LANG}`);
const OUT = process.env.SHOTS || path.join(__dirname, 'build', 'hub-shots');

const shots = [];
let pass = 0;
let fail = 0;
const ok = (condition, message) => {
  condition ? (pass++, console.log('  PASS ' + message))
            : (fail++, console.log('  FAIL ' + message));
};

async function shoot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}-${LANG}-${WIDTH}.png`);
  await page.screenshot({ path: file, fullPage: true });
  shots.push(file);
  console.log('  ' + file);
}

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 900 });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // Nothing outbound. Supabase and the Apps Script are both stubbed: a
  // screenshot run must not sign anyone up or post a row anywhere.
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const url = r.url();
    if (url.indexOf('supabase.co') !== -1) {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      };
      if (r.method() === 'OPTIONS')
        return r.respond({ status: 200, headers: cors, body: '' });
      if (url.indexOf('/rest/v1/attempts') !== -1 || url.indexOf('/rest/v1/progress') !== -1)
        return r.respond({ status: 200, headers: cors, contentType: 'application/json', body: '[]' });
      return r.respond({ status: 200, headers: cors, contentType: 'application/json', body: '{}' });
    }
    if (url.indexOf('script.google.com') !== -1)
      return r.respond({ status: 200, body: '{"ok":true}' });
    return r.continue();
  });

  // 1. Signed-out students can inspect every challenge; starting one opens the account modal.
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.chlist', { timeout: 10000 });
  ok((await page.$$('.chcard')).length === 6, 'signed-out students can see all six challenges');
  ok(await page.$eval('[data-acct] .acctnm', (e) => e.textContent.trim() === 'Kirish'),
     'signed out, the header pill says Kirish');
  await page.click('.chgo');
  await page.waitForSelector('#authForm', { timeout: 10000 });
  ok(!!(await page.$('#authDialog [role="dialog"]')), 'create account opens in a modal');
  await shoot(page, '1-gate');
  await page.click('#authClose');
  await page.evaluate(() => document.querySelector('[data-acct] .acctbtn').click());
  ok(await page.evaluate(() => authMode === 'signin' && !!document.getElementById('authDialog')),
     'the header account link opens sign-in');

  // From here on, pretend we are signed in.
  await page.evaluate(() => {
    localStorage.setItem('naseebmind_session_v1', JSON.stringify({
      access: 'stub', refresh: 'stub',
      expires: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'student@example.com' },
    }));
  });

  // 2. The hub, untouched.
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.chlist', { timeout: 10000 });
  const cards = await page.$$eval('.chcard h2', (h) => h.map((x) => x.textContent));
  console.log('  challenges on the hub: ' + cards.join(' | '));
  ok(cards.length === 6, 'the hub shows six challenges');
  // No name on this stub account, and none is guessed from the email, so the
  // pill falls back to "Hisobim" and opens a menu rather than a page.
  ok(await page.$eval('[data-acct] .acctnm', (e) => e.textContent.trim() === 'Hisobim'),
     'signed in, the pill says Hisobim');
  ok(await page.$eval('[data-acct] .acctbtn', (e) => {
    const b = e.getBoundingClientRect();
    return e.tagName === 'BUTTON' && b.width > 0 && b.height >= 24;
  }), 'the account button is a menu button and visible at phone width');
  await page.click('[data-acct] .acctbtn');
  ok(await page.$$eval('[data-acct] [role="menuitem"]', (m) => m.length === 3),
     'and its menu holds the three items');
  await page.keyboard.press('Escape');
  await shoot(page, '2-hub');

  // 3. A scale challenge.
  await page.evaluate(() => window.openChallenge('personality'));
  await page.waitForSelector('.item', { timeout: 10000 });
  await shoot(page, '3-scale');

  // 4. Work importance uses the same familiar five-point scale as the other
  // rating challenges.
  await page.evaluate(() => window.openChallenge('workimportance'));
  await page.waitForSelector('.item', { timeout: 10000 });
  await shoot(page, '4-work-importance');
  await page.click('.item input[type=radio]');
  await shoot(page, '5-work-importance-picked');

  // 6. A matrix puzzle.
  await page.evaluate(() => window.openChallenge('reasoning'));
  await page.waitForSelector('.mxgrid svg', { timeout: 10000 });
  await shoot(page, '6-matrix');

  // 7. The hub again, with work part done, so the progress states are visible.
  await page.evaluate(() => {
    for (let i = 0; i < 20; i++) state.answers[WIL_START + i] = Math.floor(i / 4) + 1;
    for (let i = 0; i < 12; i++) state.answers[MATRIX_START + i] = 1;
    for (let i = 0; i < 14; i++) state.answers[i] = 3;
    backToHub();
  });
  await page.waitForSelector('.chlist', { timeout: 10000 });
  await shoot(page, '7-hub-partial');

  console.log('\n  resume and retake checks');
  ok(await page.evaluate(() => {
    state.answers[MATRIX_START] = 8;
    saveDraft();
    return loadDraft().answers[MATRIX_START] === 8;
  }), 'matrix options 6-8 survive a local draft reload');

  const retake = await page.evaluate(() => {
    openChallenge('workimportance');
    const c = challengeBy('workimportance');
    return { answered: c.answered(state.answers), done: challengeDone(c, state.answers) };
  });
  ok(retake.answered === 0 && !retake.done, 'retake starts with a clean answer sheet');

  const sync = await page.evaluate(async () => {
    localStorage.removeItem(SAVE_KEY);
    state.answers = new Array(ITEMS.length).fill(0);
    const now = Date.now();
    const score = { ES: 4, E: 3, O: 5, A: 2, C: 4 };
    NMAccount.attempts = () => Promise.resolve([
      { challenge: 'personality', answers: { 0: 5 }, scores: score,
        completed_at: new Date(now - 10 * 864e5).toISOString() },
      { challenge: 'personality', answers: { 0: 4 },
        scores: { ES: 2, E: 2, O: 2, A: 2, C: 2 },
        completed_at: new Date(now - 100 * 864e5).toISOString() },
    ]);
    NMAccount.progress = () => Promise.resolve([
      { challenge: 'personality', answers: { 0: 2 },
        updated_at: new Date(now - 1 * 864e5).toISOString() },
    ]);
    await pullSaved();
    const previous = previousResult();
    return {
      answer: state.answers[0], answered: challengeBy('personality').answered(state.answers),
      history: accountHistory.length, previous: previous && previous.s.ES,
    };
  });
  ok(sync.answer === 2 && sync.answered === 1,
     'a newer in-progress retake wins over the older completed attempt');
  ok(sync.history === 2 && sync.previous === 2,
     'an older account attempt is available to the result comparison');

  console.log(errors.length ? '\n  PAGE ERRORS:\n   ' + errors.join('\n   ')
                            : '\n  no page errors');
  console.log('  ' + pass + ' checks passed' + (fail ? ', ' + fail + ' failed' : ''));
  await browser.close();
  process.exit(errors.length || fail ? 1 : 0);
})();
