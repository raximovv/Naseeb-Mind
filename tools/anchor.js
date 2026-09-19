// The pointer must not have to move between questions. Answers are given with a
// real mouse that is parked at ONE screen position for the whole page: if the
// next circle does not arrive under it, the click misses and nothing is recorded.
const puppeteer = require('puppeteer-core');
const { questionsOnPage } = require('./figure_choice');
const { CHROME, SITE_URL } = require('./paths');
const URL = SITE_URL + 'test.html';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });

  for (const [label, w, h] of [['desktop 1440x900', 1440, 900], ['laptop 1280x720', 1280, 720], ['phone 390x844', 390, 844]]) {
    console.log('\n== ' + label + ' ==');
    const p = await browser.newPage();
    await p.setViewport({ width: w, height: h });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL, { waitUntil: 'networkidle2' });
    await p.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('naseebmind_session_v1', JSON.stringify({
        access: 'stub', refresh: 'stub', expires: Math.floor(Date.now() / 1000) + 3600,
        user: { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' },
      }));
    });
    await p.reload({ waitUntil: 'networkidle2' });
    await p.evaluate(() => openChallenge('personality'));
    await new Promise(r => setTimeout(r, 200));

    // A real student scrolls past the three step cards to question 1 first.
    await p.evaluate(() => document.getElementById('item-0').scrollIntoView({ block: 'center' }));
    await new Promise(r => setTimeout(r, 250));
    // Then parks the mouse on its 2nd circle and never moves it again.
    const spot = await p.$eval('input[name=q0][value="2"]', e => {
      const r = e.closest('.opt').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });

    const drift = [];
    for (let i = 0; i < 5; i++) {
      await p.mouse.click(spot.x, spot.y);
      await new Promise(r => setTimeout(r, 900));   // let the smooth scroll settle
      if (i < 4) {
        const d = await p.evaluate((idx, sy) => {
          const row = document.getElementById('item-' + state.plan[idx + 1]).querySelector('.dots');
          const r = row.getBoundingClientRect();
          return Math.round((r.top + r.height / 2) - sy);
        }, i, spot.y);
        drift.push(d);
      }
    }

    const answers = await p.evaluate(() => state.answers.slice(0, 5));
    ok(answers.every(v => v === 2),
      'all five answered without moving the mouse once: [' + answers.join(',') + ']');
    ok(drift.every(d => Math.abs(d) <= 6),
      'each next row arrives under the pointer (drift px: ' + drift.join(', ') + ')');
    ok(errs.length === 0, 'no JS errors (' + (errs[0] || 'none') + ')');
    await p.close();
  }

  // Steps 2..10 have no intro above them, so they open with the first row higher up
  // the screen than step 1 does - a different, and harder, starting position.
  console.log('\n== a middle step, opened the way the app opens it ==');
  for (const [label, w, h] of [['desktop 1440x900', 1440, 900], ['phone 390x844', 390, 844]]) {
    const p = await browser.newPage();
    await p.setViewport({ width: w, height: h });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto(URL, { waitUntil: 'networkidle2' });
    await p.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('naseebmind_session_v1', JSON.stringify({
        access: 'stub', refresh: 'stub', expires: Math.floor(Date.now() / 1000) + 3600,
        user: { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' },
      }));
    });
    await p.reload({ waitUntil: 'networkidle2' });
    await p.evaluate(() => { openChallenge('personality'); state.page = 3; renderPage(); });
    await new Promise(r => setTimeout(r, 300));
    // Which questions a step holds is decided by the plan, not by the step number
    // -- step 4 is items 17,18,24,25,26, not 15..19 -- so read them off the page.
    const asked = await questionsOnPage(p);
    const first = asked[0];
    // The opener (mark + title + 3 cards) now sits above the questions on every
    // step, so on a phone the first question of a middle step opens below the fold.
    // A real student scrolls it into view before answering; do the same, then park
    // the mouse on its 2nd circle and never move it again.
    await p.evaluate(i => document.getElementById('item-' + i).scrollIntoView({ block: 'center' }), first);
    await new Promise(r => setTimeout(r, 250));
    const spot = await p.$eval('input[name=q' + first + '][value="2"]', e => {
      const r = e.closest('.opt').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: Math.round(r.top + r.height / 2) };
    });
    for (let i = 0; i < 5; i++) { await p.mouse.click(spot.x, spot.y); await new Promise(r => setTimeout(r, 800)); }
    const got = await p.evaluate(list => list.map(i => state.answers[i]), asked);
    ok(got.every(v => v === 2), label + ': all five answered from a standing mouse at '
      + Math.round(spot.y / h * 100) + '% down [' + got.join(',') + ']');
    ok(errs.length === 0, label + ': no JS errors (' + (errs[0] || 'none') + ')');
    await p.close();
  }

  await browser.close();
  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL ' + pass + ' CHECKS PASSED'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
