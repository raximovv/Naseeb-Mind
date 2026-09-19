// Drives the real test page through a full run in real Chrome and checks the result.
// Served over http://localhost:8765 so characters.js loads exactly as it does live.
const puppeteer = require('puppeteer-core');

const { CHROME } = require('./paths');
const URL = 'http://localhost:8765/test.html';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

let browser;
async function open() {
  const p = await browser.newPage();
  await p.setViewport({ width: 390, height: 844 });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.setRequestInterception(true);
  p.on('request', r => {
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
  await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  // Use a fake local session; the requests above are stubbed, so no account or
  // student row is created by the test suite.
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('naseebmind_session_v1', JSON.stringify({
      access: 'stub', refresh: 'stub', expires: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' },
    }));
  });
  await p.reload({ waitUntil: 'networkidle2' });
  await p.evaluate(() => openChallenge('personality'));
  return { p, errs };
}

// Answer every question through the real UI, page by page.
async function fullRun(pattern) {
  const { p, errs } = await open();
  // This suite drives the personality challenge through the real pointer UI.
  // Fill the other five with legal values so completing personality opens the
  // combined result, which is what the report assertions below exercise.
  await p.evaluate(() => {
    for (const c of CHALLENGES) {
      if (c.key === 'personality') continue;
      const plan = c.plan();
      for (let j = 0; j < plan.length; j++) {
        if (c.interaction === 'sort') state.answers[plan[j]] = Math.floor(j / 4) + 1;
        else state.answers[plan[j]] = (j % 5) + 1;
      }
      const more = c.extend ? c.extend(state.answers) : [];
      for (let j = 0; j < more.length; j++) state.answers[more[j]] = (j % 5) + 1;
    }
  });
  // The test is adaptive: item i is not on page floor(i/5) any more, and the
  // plan grows by a block when the student's 2nd and 3rd traits come out level.
  // So read the plan each page rather than assuming a fixed 50/5 walk.
  for (let page = 0; page < 20; page++) {
    // The figure-choice modal is appended to <body>, and the finished question
    // page stays in #app behind it -- so "there are still .item elements" does
    // NOT mean there are still questions. Check the modal first.
    if (await p.$('.fcwrap')) break;
    const asked = await p.evaluate(() => {
      const el = document.querySelectorAll('#app .item');
      return Array.prototype.map.call(el, e => parseInt(e.id.slice(5), 10));
    });
    if (!asked.length) break;
    for (const i of asked) {
      await p.evaluate((i, v) => {
        document.querySelector('input[name=q' + i + '][value="' + v + '"]').click();
      }, i, pattern(i));
    }
    const next = await p.$('#nextBtn');
    if (!next) break;
    await next.click();
    await new Promise(r => setTimeout(r, 60));
  }
  // Finishing the last challenge lands on the HUB, not on the report: the
  // results now live on the hub and grow there, and the full archetype report is
  // one button away rather than sprung at the end. So the walk above ends at the
  // hub, and this is the click a student makes to reach the report.
  const toReport = await p.$('#hubResult');
  if (toReport) {
    await toReport.click();
    await new Promise(r => setTimeout(r, 300));
  }
  await settleFigureChoice(p);
  await new Promise(r => setTimeout(r, 300));
  return { p, errs };
}

// The last question is no longer the last thing between a student and the
// result: an archetype with two illustrations asks which to draw, in a modal
// over the finished page. Answer it the way a reader would, or nothing past
// this point is testing the report at all.
async function settleFigureChoice(p, gender, age) {
  const there = await p.$('.fcwrap');
  if (!there) return false;
  await p.click('.fcopt input[value="' + (gender || 'female') + '"]');
  await p.type('#fcage', String(age || 15));
  await new Promise(r => setTimeout(r, 80));
  await p.click('#fcgo');
  await new Promise(r => setTimeout(r, 500));
  return true;
}

// Answer through the real pointer path, from where the app actually puts the
// question: centred in the viewport, clear of the fixed step bar.
async function answer(p, i, v) {
  await p.evaluate(i => {
    const el = document.getElementById('item-' + i);
    if (el) el.scrollIntoView({ block: 'center' });
  }, i);
  await new Promise(r => setTimeout(r, 90));
  await p.click('input[name=q' + i + '][value="' + v + '"]');
  await new Promise(r => setTimeout(r, 140));
}

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });

  console.log('\n== full run through the real UI ==');
  {
    const { p, errs } = await fullRun(i => (i % 5) + 1);
    ok(errs.length === 0, 'no JS errors (' + (errs[0] || 'none') + ')');
    // The five scores behind a <details class="deep"> toggle are gone: the result
    // was reworked on 2026-08-02 around the figure choice and the life sections,
    // and the toggle went with it. The CSS for it is still in test.html, unused.
    // Characters are raster artwork inside the <svg> now, not drawn paths, so the
    // artwork check counts what is actually there rather than shape primitives.
    const r = await p.evaluate(() => ({
      hero: !!document.querySelector('.hero'),
      art: document.querySelectorAll('.herotop svg image,.herotop svg path').length,
      name: (document.querySelector('.archname') || {}).textContent || '',
      lines: document.querySelectorAll('.archlines li').length,
      strength: !!document.querySelector('.strength'),
      heroText: document.querySelector('.hero').textContent,
      life: document.querySelectorAll('.lifefull').length,
      btns: !!document.getElementById('shareBtn') && !!document.getElementById('againBtn'),
      capture: !!document.getElementById('capEmail')
    }));
    ok(r.hero, 'hero card rendered');
    ok(r.art > 0, 'character artwork present (' + r.art + ')');
    ok(r.name.length > 3, 'archetype name shown: ' + r.name);
    ok(r.lines === 2, 'two description lines');
    ok(r.strength, 'strength line shown');
    ok(!/\d\.\d\s*\/\s*5/.test(r.heroText), 'no "x.x / 5" score leaks into the hero');
    ok(r.life === 1, 'the life sections rendered');
    ok(r.btns && r.capture, 'share, restart and email capture all present');
    await p.close();
  }

  console.log('\n== a challenge opens directly into its questions ==');
  {
    const { p } = await open();
    ok(!(await p.$('#startBtn')), 'no start button to press');
    ok(!!(await p.$('#nextBtn')), 'question 1 is on screen immediately');
    ok((await p.$$('.item')).length === 5, 'the first five questions are rendered');
    ok(!!(await p.$('#hubBack')), 'the challenge has a way back to the hub');
    ok((await p.$$('.step')).length === 0, 'the obsolete three-step opener is gone');
    ok((await p.$$('#app input, #app textarea, #app select[name]')).length === 25,
      'the only inputs are the 5 questions x 5 circles - nothing to fill in');
    const txt = await p.$eval('#app', e => e.textContent);
    ok(!/Ismingiz|Yoshingiz/.test(txt), 'never asks for a name or an age');
    ok(await p.evaluate(() => !('name' in state) && !('age' in state)),
      'state carries no name and no age');
    // open() wipes localStorage after load, so answer one question to write a draft.
    await p.click('input[name=q0][value="3"]');
    ok(await p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('testmind_draft_v1'));
      return d && !('name' in d) && !('age' in d);
    }), 'the saved draft carries no name and no age');
    await p.close();
  }

  console.log('\n== answering advances, and fades the question behind you ==');
  {
    const { p, errs } = await open();
    const stamp = () => p.evaluate(() => { window.__t = document.querySelector('.card'); });
    await stamp();
    await p.click('input[name=q0][value="4"]');
    await new Promise(r => setTimeout(r, 450));
    ok(await p.evaluate(() => document.getElementById('item-0').classList.contains('done')),
      'the answered question is dimmed');
    ok(await p.evaluate(() => !document.getElementById('item-1').classList.contains('done')),
      'the next question is not');
    ok(await p.evaluate(() => window.__t === document.querySelector('.card')),
      'the page was not re-rendered - only that one row changed');
    ok(await p.evaluate(() => {
      const r = document.getElementById('item-1').getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    }), 'question 2 was brought into view');

    // Editing an earlier answer must NOT throw them down the page.
    await p.evaluate(() => document.getElementById('item-2').scrollIntoView({block:'center'}));
    await new Promise(r => setTimeout(r, 120));
    const before = await p.evaluate(() => window.scrollY);
    await p.click('input[name=q0][value="2"]');
    await new Promise(r => setTimeout(r, 400));
    ok(Math.abs(await p.evaluate(() => window.scrollY) - before) < 12,
      're-answering an earlier question leaves them where they were');
    ok(await p.evaluate(() => state.answers[0] === 2), 'the edit still took effect');

    // Tapping the chosen circle again clears it, and un-dims the row.
    await p.click('input[name=q0][value="2"]');
    await new Promise(r => setTimeout(r, 150));
    ok(await p.evaluate(() => state.answers[0] === 0), 'tapping the chosen circle clears it');
    ok(await p.evaluate(() => !document.getElementById('item-0').classList.contains('done')),
      'a cleared question is no longer dimmed');
    ok(errs.length === 0, 'no JS errors (' + (errs.join(' | ') || 'none') + ')');
    await p.close();
  }

  console.log('\n== finishing a page moves to the next one ==');
  {
    const { p } = await open();
    for (let i = 0; i < 5; i++) await answer(p, i, 4);
    await new Promise(r => setTimeout(r, 700));
    ok(await p.evaluate(() => state.page === 1), 'the last answer on a page advances it');
    ok(!!(await p.$('#hubBack')), 'the challenge header stays on later pages');
    ok((await p.$$('.item.done')).length === 0, 'the new page starts with nothing dimmed');
    await p.close();
  }

  console.log('\n== archetypes, art and scoring ==');
  {
    const { p } = await open();
    const r = await p.evaluate(() => {
      const keys = Object.keys(ARCHETYPES), bad = [], fams = {};
      keys.forEach(function (k) {
        const a = ARCHETYPES[k];
        if (!a.name || !a.fam || !a.strength) bad.push(k + ':copy');
        if (!Array.isArray(a.lines) || a.lines.length !== 2) bad.push(k + ':lines');
        if (!FAMILIES[a.fam]) bad.push(k + ':family');
        if (!TM_ART[k]) bad.push(k + ':art');
        // The 1500-character floor here was a proxy for "the figure is actually
        // drawn" back when every character was hand-built vector shapes. They are
        // painted artwork referenced by <image> now, so a valid figure is a short
        // string. Check for the thing that matters instead: an <svg> that carries
        // either a picture or drawn geometry.
        const svg = charSvg(k);
        if (!svg || svg.indexOf('<svg') !== 0) bad.push(k + ':svg');
        else if (!/<image\s|<path\s|<circle\s|<rect\s/.test(svg)) bad.push(k + ':svg-empty');
        if (/undefined|null/.test(svg)) bad.push(k + ':svg-undefined');
        fams[a.fam] = (fams[a.fam] || 0) + 1;
      });
      const props = keys.map(function (k) { return TM_ART[k].prop; });

      const flat = function (v) { return new Array(ITEMS.length).fill(v); };
      const sN = scoreAnswers(flat(3)), sA = scoreAnswers(flat(5));
      const sM = scoreAnswers(ITEMS.map(function (it) {
        return it.d === 'N' ? (it.r ? 5 : 1) : (it.r ? 1 : 5);
      }));
      const T = ['ES', 'E', 'O', 'A', 'C'];
      const missing = {}, seen = {};
      for (let t = 0; t < 4000; t++) {
        const a = ITEMS.map(function () { return 1 + Math.floor(Math.random() * 5); });
        const s = scoreAnswers(a), key = archetypeKeyOf(s);
        seen[key] = 1;
        if (!ARCHETYPES[key] || !TM_ART[key]) missing[key] = 1;
        for (let z = 0; z < T.length; z++) {
          if (s[T[z]] < 1 || s[T[z]] > 5) missing['range:' + T[z]] = 1;
        }
      }
      const every = function (o, f) { return T.every(f); };
      return {
        n: keys.length, bad: bad, fams: fams, uniqProps: Object.keys(props.reduce(
          function (m, x) { m[x] = 1; return m; }, {})).length,
        neutral: every(sN, function (k) { return Math.abs(sN[k] - 3) < 1e-9; }),
        agreeAll: every(sA, function (k) { return Math.abs(sA[k] - 3) < 1e-9; }),
        max: every(sM, function (k) { return Math.abs(sM[k] - 5) < 1e-9; }),
        emptyES: scoreAnswers(flat(0)).ES,
        missing: Object.keys(missing), seen: Object.keys(seen).length
      };
    });
    ok(r.n === 10, '10 archetypes defined');
    ok(r.bad.length === 0, 'all 10 have copy + family + art + svg (' + (r.bad.join(', ') || 'clean') + ')');
    ok(Object.keys(r.fams).length === 4, 'four families used: ' + JSON.stringify(r.fams));
    ok(r.uniqProps === 10, 'every archetype holds a different object');
    ok(r.neutral, 'all-neutral answers -> exactly 3.0 on every trait');
    ok(r.agreeAll, 'agreeing with everything -> flat 3.0 (straightlining protection)');
    ok(r.max, 'max profile -> 5.0 on every trait');
    ok(r.emptyES === 0, 'no answers -> ES is 0, not 6');
    ok(r.missing.length === 0, '4000 random respondents: every result maps to real art, all scores in 1..5 ('
      + (r.missing.join(',') || 'clean') + ')');
    console.log('  distinct archetypes reached by random data:', r.seen);
    await p.close();
  }

  console.log('\n== every archetype has a downloadable guide ==');
  {
    // The result screen offers "Qoʻllanmani yuklab olish". If a PDF is missing,
    // the student gets a 404 at the one moment they were promised something.
    const { p } = await open();
    const slugs = await p.evaluate(() =>
      Object.keys(ARCHETYPES).map(k => ARCHETYPES[k].slug));
    const codes = await p.evaluate(async function (list) {
      const out = {};
      for (const s of list) {
        const r = await fetch('guides/' + s + '.pdf', { method: 'HEAD' });
        out[s] = r.status;
      }
      return out;
    }, slugs);
    const broken = slugs.filter(s => codes[s] !== 200);
    ok(slugs.length === 10, 'ten archetypes');
    ok(broken.length === 0, 'every archetype PDF is downloadable (' +
      (broken.join(',') || 'all 10 present') + ')');
    await p.close();
  }

  console.log('\n== restart ==');
  {
    const { p } = await fullRun(function () { return 4; });
    await p.click('#againBtn');
    await new Promise(r => setTimeout(r, 150));
    ok(await p.evaluate(() => state.page === 0 && state.view === 'hub'), 'restart returns to the hub');
    ok((await p.$$('.chcard')).length === 6, 'all six challenge cards are shown again');
    ok((await p.$$('.item.done')).length === 0, 'no answers carried over');
    ok(await p.evaluate(() => statsSent === false && abandonSent === false && leadSent === false),
      'all send-once flags reset for the next student');
    await p.close();
  }

  await browser.close();
  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL ' + pass + ' CHECKS PASSED'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
