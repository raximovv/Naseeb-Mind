// Every section of the site, in both themes, compared.
//
// tools/darkmode.js walks TEXT on the FIRST paint of each static page. That
// leaves most of the product unchecked: the whole result screen, every challenge
// screen, the figure chooser, the sign-in dialog, the account menu, and every
// border and filled shape on all of them. This drives the app into each of those
// states and measures there.
//
// It reports three things per section, and only where dark is worse than light:
//   ink      text against whatever is actually painted behind it
//   border   a rule or outline against the surface it sits on
//   fill     a filled shape against its ground -- how findable a control is
//
// See tools/contrast.js for why this compares the two themes rather than judging
// dark against an absolute floor.
//
//   node tools/darkstates.js            every state
//   node tools/darkstates.js result     just the states whose name matches
const puppeteer = require('./node_modules/puppeteer-core');
const { COLLECT, resolve, needed } = require('./contrast');

const { CHROME } = require('./paths');
const BASE = process.env.BASE || 'http://localhost:8765/';
const ONLY = process.argv[2] || '';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

const SESSION = JSON.stringify({
  access: 'test-access-token', refresh: 'test-refresh-token',
  expires: Math.floor(Date.now() / 1000) + 3600,
  user: { id: '00000000-0000-4000-8000-000000000001', email: 'nm-test@example.com', name: 'Rahim' },
});

// Fill one challenge with a plausible, uneven answer sheet. Lifted from
// tools/hub_summary.js, which does the same thing for the same reason.
const finish = (page, key) => page.evaluate((k) => {
  openChallenge(k);
  const c = challengeBy(k);
  const weight = { R: 5, I: 4, A: 4, S: 2, E: 1, C: 3 };
  const fillPlan = () => {
    for (let n = 0; n < state.plan.length; n++) {
      const i = state.plan[n], it = ITEMS[i];
      if (state.answers[i]) continue;
      if (it.sec === 'm') state.answers[i] = it.answer + 1;
      else if (it.sec === 'c') state.answers[i] = weight[it.s];
      else state.answers[i] = (n % 5) + 1;
    }
  };
  fillPlan();
  for (let guard = 0; guard < 4 && c.extend; guard++) {
    const more = c.extend(state.answers);
    if (!more.length) break;
    state.plan = state.plan.concat(more);
    fillPlan();
  }
  finishChallenge();
  return challengeDone(c, state.answers);
}, key);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Each entry: a name, the page to open, and what to do once it is open. The
// `signed` flag decides whether a session is written before the load.
const STATES = [
  { name: 'home', url: 'index.html' },
  { name: 'the ten characters', url: 'obrazlar.html' },
  { name: 'a character page', url: 'obraz-jamoaning-yuragi.html' },
  { name: 'a character page (ru)', url: 'ru/obraz-ishonchli-dost.html' },
  { name: 'questions', url: 'savollar.html', after: async (p) => {
      const d = await p.$('details'); if (d) await p.evaluate((e) => { e.open = true; }, d);
    } },
  { name: 'for schools', url: 'maktablar.html' },
  { name: 'privacy', url: 'privacy.html' },

  { name: 'the hub, signed out', url: 'test.html' },
  { name: 'the sign-in dialog', url: 'test.html', after: async (p) => {
      await p.evaluate(() => { authMode = 'signin'; renderAuth(true); });
      await wait(200);
    } },
  { name: 'the sign-up dialog', url: 'test.html', after: async (p) => {
      await p.evaluate(() => { authMode = 'signup'; renderAuth(true); });
      await wait(200);
    } },
  { name: 'the account menu', url: 'index.html', signed: true, after: async (p) => {
      await p.setViewport({ width: 1280, height: 900 });
      await p.click('.acctbtn'); await wait(150);
    } },

  { name: 'a rating challenge', url: 'test.html', signed: true, after: async (p) => {
      await p.evaluate(() => openChallenge('personality')); await wait(250);
      // One answered, one not: the dimmed state and the live state together.
      await p.evaluate(() => {
        const r = document.querySelector('#item-0 input[value="4"]');
        if (r) r.click();
      });
      await wait(250);
    } },
  { name: 'the reasoning challenge', url: 'test.html', signed: true, after: async (p) => {
      await p.evaluate(() => openChallenge('reasoning'));
      await wait(900);   // the tiles are fetched lazily
    } },
  { name: 'the hub, part way through', url: 'test.html', signed: true, after: async (p) => {
      await finish(p, 'personality'); await wait(300);
    } },
  { name: 'the hub with a full result', url: 'test.html', signed: true, after: async (p) => {
      for (const k of ['personality', 'interests', 'values', 'school', 'workimportance', 'reasoning']) {
        await finish(p, k); await wait(120);
      }
      await p.evaluate(() => { state.view = 'hub'; render(); });
      await wait(400);
      // The fold is closed by default and holds half the panels.
      await p.evaluate(() => { const f = document.querySelector('.rfold'); if (f) f.open = true; });
      await wait(300);
    } },
  { name: 'the full report', url: 'test.html', signed: true, after: async (p) => {
      for (const k of ['personality', 'interests', 'values', 'school', 'workimportance', 'reasoning']) {
        await finish(p, k); await wait(120);
      }
      await p.evaluate(() => { state.view = 'result'; render(); });
      await wait(700);
      const fc = await p.$('.fcwrap');
      if (fc) {
        await p.click('.fcopt input[value="male"]');
        await p.type('#fcage', '15');
        await p.click('#fcgo');
        await wait(900);
      }
      await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await wait(400);
    } },
];

async function measure(browser, state, theme) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE + state.url, { waitUntil: 'networkidle0' });
  await page.evaluate((t, s) => {
    localStorage.setItem('naseebmind_theme_v1', t);
    if (s) localStorage.setItem('naseebmind_session_v1', s);
    else localStorage.removeItem('naseebmind_session_v1');
  }, theme, state.signed ? SESSION : '');
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(250);
  if (state.after) await state.after(page);

  const rows = await page.evaluate(COLLECT);
  await page.close();
  return { rows, errors };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const allErrors = [];

  for (const state of STATES) {
    if (ONLY && state.name.indexOf(ONLY) < 0) continue;
    const light = await measure(browser, state, 'light');
    const dark = await measure(browser, state, 'dark');
    allErrors.push(...light.errors.map((e) => state.name + ' light: ' + e));
    allErrors.push(...dark.errors.map((e) => state.name + ' dark: ' + e));

    const byKey = new Map();
    light.rows.forEach((r) => byKey.set(r.key, { l: r }));
    dark.rows.forEach((r) => { const e = byKey.get(r.key); if (e) e.d = r; });

    const problems = [];
    const seen = new Set();
    for (const [, pair] of byKey) {
      if (!pair.d) continue;
      const L = resolve(pair.l), D = resolve(pair.d);
      if (!L || !D) continue;
      const row = pair.d;

      const check = (what, lv, dv, floor) => {
        if (lv == null || dv == null) return;
        // Worse in dark, and low enough to matter. Either an outright failure
        // the light theme did not have, or a collapse to near-invisible.
        const brokeThreshold = lv >= floor && dv < floor;
        const collapsed = dv < 1.12 && lv >= 1.25;
        if (!brokeThreshold && !collapsed) return;
        const id = what + '|' + row.cls + '|' + row.tag;
        if (seen.has(id)) return;
        seen.add(id);
        problems.push({
          section: row.section, what, tag: row.tag, cls: row.cls,
          light: lv.toFixed(2), dark: dv.toFixed(2),
          text: row.text, need: floor,
        });
      };

      check('ink', L.text, D.text, needed(row));
      // A rule that survives in light and vanishes in dark. 1.25 is not a WCAG
      // number; it is where a hairline stops being visible on a real screen.
      check('border', L.border, D.border, 1.25);
      // A panel is allowed to be a quiet tonal band -- but it has to still BE
      // one. Perceptual distance, so a band that separates by hue rather than
      // by brightness is not called a failure. About 3 is a subtle-but-real step.
      // ...unless a border is doing the delineating, which is the header bar's
      // whole design: a flat tone bounded by a rule.
      const bordered = D.border != null && D.border >= 1.25;
      if (!bordered) check('band', L.fill, D.fill, 3);
      // A control is held to WCAG 1.4.11 on luminance as well, because that is
      // what the standard asks of something a reader operates.
      if (row.control) check('fill', L.fillRatio, D.fillRatio, 3);
    }

    console.log('\n== ' + state.name + '  (' + light.rows.length + ' elements)');
    if (!problems.length) {
      ok(true, 'dark holds up everywhere light does');
    } else {
      const bySection = {};
      problems.forEach((p) => { (bySection[p.section] = bySection[p.section] || []).push(p); });
      ok(false, `${problems.length} worse in dark`);
      Object.keys(bySection).sort().forEach((s) => {
        console.log('     [' + s + ']');
        bySection[s].forEach((p) => console.log(
          `       ${p.what.padEnd(6)} ${(p.tag + '.' + p.cls).padEnd(22)} ` +
          `light ${p.light} -> dark ${p.dark} (needs ${p.need})` +
          (p.text ? `  "${p.text}"` : '')));
      });
    }
  }

  console.log(allErrors.length ? '\n  PAGE ERRORS:\n   ' + allErrors.join('\n   ') : '\n  no page errors');
  if (allErrors.length) fail++;
  console.log('\n  ' + pass + ' states clean' + (fail ? ', ' + fail + ' with problems' : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
