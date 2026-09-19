// «Oʻshanda va hozir»: a student who retakes the test months later is shown what
// moved. Easy to get wrong in ways nobody would notice, comparing against the
// result just produced, showing up for a first-timer, or firing on a same-day
// retake where a "change" is noise. Each of those is checked here.
const puppeteer = require('puppeteer-core');

const { CHROME } = require('./paths');
const PAGE = 'http://localhost:8765/test.html';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

async function open(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 500));
  await page.setRequestInterception(true);
  page.on('request', r => r.url().indexOf('script.google.com') !== -1
    ? r.respond({ status: 200, body: '{"ok":true}' }) : r.continue());
  return { page, errors };
}

/** Finish the test with a chosen answer value on every item. */
const finish = (page, v) => page.evaluate(val => {
  state.answers = ITEMS.map(() => val);
  const s = scoreAnswers(state.answers);
  const key = archetypeKeyOf(s);
  paintReport(s, archetypeOf(s), key, 'female', 15);
}, v);

/** Write a fake earlier result, `days` ago, with every trait at `val`. */
const seed = (page, days, val, key) => page.evaluate((d, v, k) => {
  localStorage.setItem('testmind_history_v1', JSON.stringify([{
    ts: Date.now() - d * 864e5,
    s: { ES: v, E: v, O: v, A: v, C: v },
    key: k,
  }]));
}, days, val, key);

const block = page => page.evaluate(() => {
  const el = document.querySelector('.thennow');
  return el ? el.innerText : null;
});

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });

  console.log('\n== a first-time student sees no comparison ==');
  {
    const { page, errors } = await open(browser);
    await page.evaluate(() => localStorage.clear());
    await finish(page, 4);
    ok(await block(page) === null, 'no «Oʻshanda va hozir» block on a first result');
    ok(errors.length === 0, 'no JS errors (' + (errors.join(' | ') || 'none') + ')');
    const invite = await page.evaluate(() => document.body.innerText);
    ok(!/testni yana bir marta ishlab/.test(invite), 'the removed retake invitation stays absent');
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('testmind_history_v1')).length === 1),
      'the result is recorded for next time');
    await page.close();
  }

  console.log('\n== a same-day retake is not treated as development ==');
  {
    const { page } = await open(browser);
    await page.evaluate(() => localStorage.clear());
    await seed(page, 0, 2, 'ES|A');
    await finish(page, 5);
    ok(await block(page) === null, 'no comparison for a result from today');
    await page.close();
  }

  console.log('\n== after two months, real movement is shown ==');
  {
    const { page } = await open(browser);
    await page.evaluate(() => localStorage.clear());
    await seed(page, 200, 2, 'ES|A');     // everything low back then
    await finish(page, 5);                // everything high now
    const t = await block(page);
    ok(t !== null, 'the comparison block appears');
    ok(/oʻsibdi/i.test(t), 'traits that rose are reported as risen');
    ok(!/pasaybdi/i.test(t), 'nothing is wrongly reported as fallen');
    ok(/\d\d\.\d\d\.\d{4}/.test(t), 'the earlier date is shown');
    await page.close();
  }

  console.log('\n== when nothing really changed, it says so ==');
  {
    const { page } = await open(browser);
    await page.evaluate(() => localStorage.clear());
    // Seeding a flat "4" would NOT mean the same answers: half the items are
    // reverse-scored, so answering 4 everywhere lands near 3.0. Take the real
    // scored result, age it, then answer identically.
    await finish(page, 4);
    await page.evaluate(() => {
      const h = JSON.parse(localStorage.getItem('testmind_history_v1'));
      h[0].ts = Date.now() - 200 * 864e5;
      localStorage.setItem('testmind_history_v1', JSON.stringify([h[0]]));
    });
    await finish(page, 4);                 // identical answers, months later
    const t = await block(page);
    ok(t !== null && /oʻsha-oʻsha/i.test(t), 'reports stability instead of inventing change');
    ok(!/oʻsibdi|pasaybdi/i.test(t), 'no movement is claimed');
    await page.close();
  }

  console.log('\n== it compares against the OLD result, not the new one ==');
  {
    const { page } = await open(browser);
    await page.evaluate(() => localStorage.clear());
    await seed(page, 200, 1, 'ES|A');
    await finish(page, 5);
    const t = await block(page);
    // Comparing new-against-new would find no change at all and print the
    // "nothing moved" line, the failure mode this whole test exists for.
    ok(!/oʻsha-oʻsha/i.test(t || ''), 'a 1 -> 5 shift is not reported as "unchanged"');
    const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('testmind_history_v1')));
    ok(hist.length === 2, 'both results are kept in the local history');
    await page.close();
  }

  console.log('\n== the history is local and holds nothing identifying ==');
  {
    const { page } = await open(browser);
    await page.evaluate(() => localStorage.clear());
    await finish(page, 3);
    const raw = await page.evaluate(() => localStorage.getItem('testmind_history_v1'));
    ok(!/answers|email|name|aid/i.test(raw), 'no answers, email, name or id stored (' + raw.slice(0, 60) + '…)');
    await page.close();
  }

  await browser.close();
  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL ' + pass + ' CHECKS PASSED'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
