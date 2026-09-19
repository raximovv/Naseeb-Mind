// The result summary panel, rendered from a complete sitting.
//
// Fills all six challenges with a deliberately UNEVEN answer sheet -- straight
// lines would draw a regular hexagon and hide exactly the bugs worth catching
// (an axis read from the wrong bank, a rank that ignores ties, a shape drawn
// from means that are all equal).
//
//   node tools/summary_shot.js            uz, phone
//   node tools/summary_shot.js en 1100    another language, another width
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { settleFigureChoice } = require('./figure_choice');

const { CHROME } = require('./paths');
const LANG = process.argv[2] || 'uz';
const WIDTH = parseInt(process.argv[3] || '390', 10);
const BASE = 'http://localhost:8765/test.html' + (LANG === 'uz' ? '' : `?lang=${LANG}`);
const OUT = path.join(__dirname, 'build', 'summary');

// Man first, then woman: the order the archetype pages already use.
const MAN = { uz: 'Erkak', ru: 'Мужчина', en: 'Man' };

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  // Nothing outbound: no account, no sheet, no database.
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const u = r.url();
    if (u.indexOf('supabase.co') !== -1) {
      // The preflight has to be answered too, or the browser logs a CORS error
      // that looks like a page bug and has nothing to do with the panel.
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
  await page.evaluate(() => {
    localStorage.setItem('naseebmind_session_v1', JSON.stringify({
      access: 'stub', refresh: 'stub', expires: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'student@example.com' },
    }));
  });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.chlist');

  // A whole sitting, answered unevenly.
  const filled = await page.evaluate(() => {
    const a = state.answers;
    for (let i = 0; i < CAREER_START; i++) a[i] = (i % 5) + 1;
    // Interests: a real profile rather than a flat one, so the hexagon is lopsided.
    const weight = { R: 5, I: 4, A: 4, S: 2, E: 1, C: 3 };
    for (let i = CAREER_START; i < CAREER_START + CAREER_COUNT; i++) a[i] = weight[ITEMS[i].s];
    for (let i = VALUES_START; i < VALUES_START + VALUES_COUNT; i++) a[i] = ((i * 3) % 5) + 1;
    for (let i = SCHOOL_START; i < SCHOOL_START + SCHOOL_COUNT; i++) a[i] = ((i * 2) % 5) + 1;
    for (let i = 0; i < WIL_COUNT; i++) a[WIL_START + i] = Math.floor(i / 4) + 1;
    for (let i = 0; i < MATRIX_COUNT; i++) a[MATRIX_START + i] = ITEMS[MATRIX_START + i].answer + 1;
    return { all: allChallengesDone(a), done: CHALLENGES.filter((c) => challengeDone(c, a)).length };
  });
  ok(filled.all && filled.done === 6, `all six challenges register as finished (${filled.done})`);

  await page.evaluate(() => { state.view = 'result'; render(); });
  // renderReport() opens the figure question and returns without painting; the
  // report only exists on the other side of it.
  await new Promise((r) => setTimeout(r, 400));
  ok(await settleFigureChoice(page, 'male', 15), 'the figure question was asked and answered');
  await page.waitForSelector('.rsum', { timeout: 10000 });

  const panel = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.rsumlines > div')]
      .map((d) => [d.querySelector('dt').textContent, d.querySelector('dd').textContent]);
    const pts = (document.querySelector('.rpoly .shape') || {}).getAttribute
      ? document.querySelector('.rpoly .shape').getAttribute('points') : null;
    return {
      rows,
      code: (document.querySelector('.rsumcode') || {}).textContent || null,
      axes: [...document.querySelectorAll('.rpoly .axlbl')].map((t) => t.textContent),
      vertices: document.querySelectorAll('.rpoly .vertex').length,
      shapePoints: pts,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  console.log('  code: ' + panel.code + '   axes: ' + panel.axes.join(''));
  panel.rows.forEach(([k, v]) => console.log('    ' + k.padEnd(26) + ' ' + v));

  ok(panel.rows.length === 6, `one line per challenge (${panel.rows.length})`);
  ok(panel.rows.every(([, v]) => v.trim().length > 0), 'no line is blank');
  ok(panel.axes.join('') === 'RIASEC', `axes follow Holland's order (${panel.axes.join('')})`);
  ok(panel.vertices === 6, `six vertices (${panel.vertices})`);
  ok(panel.code === 'RIA', `the badge shows the top three interests (${panel.code})`);
  // A flat shape would mean the axes were read from the wrong place.
  const ys = (panel.shapePoints || '').split(' ').map((p) => parseFloat(p.split(',')[1]));
  ok(new Set(ys.map((y) => y.toFixed(0))).size > 2, 'the shape is lopsided, not a regular hexagon');
  ok(!panel.overflow, 'the panel does not push the page sideways');

  // Pointing at a corner has to say which scale it is and what it scored -- the
  // shape cannot be read off to that precision, which is the whole reason it is
  // shipped alongside the numbers rather than instead of them.
  const before = await page.$eval('.rpoly figcaption', (e) => e.textContent.trim());
  await page.hover('.rpoly .hit');
  const during = await page.evaluate(() => ({
    cap: document.querySelector('.rpoly figcaption').textContent.trim(),
    lit: document.querySelectorAll('.rpoly .vertex.on, .rpoly .axlbl.on').length,
  }));
  await page.mouse.move(2, 2);
  const after = await page.$eval('.rpoly figcaption', (e) => e.textContent.trim());
  console.log('  hover reads: ' + during.cap);
  ok(during.cap !== before && /\d\.\d \/ 5$/.test(during.cap),
     'hovering a corner names the scale and its score');
  ok(during.lit === 2, `the corner and its label both light up (${during.lit})`);
  ok(after === before, 'the caption goes back when the pointer leaves');
  // Every corner has a target big enough to hit with a thumb.
  const hits = await page.$$eval('.rpoly .hit', (c) => c.map((e) => e.getBoundingClientRect().width));
  ok(hits.length === 6 && Math.min(...hits) >= 24,
     `six corners, smallest target ${Math.min(...hits).toFixed(0)}px`);

  // The figure: a real person who had the same strength, between the summary
  // lines and the fold, with a way out to read about them.
  const fig = await page.evaluate(() => {
    const f = document.querySelector('.rfig');
    if (!f) return null;
    const link = f.querySelector('.rfiglink');
    const order = [...f.querySelectorAll('.rfigsw button')].map((b) => b.textContent.trim());
    const lines = document.querySelector('.rsumlines'), fold = document.querySelector('.rfold');
    return {
      who: f.querySelector('h4').childNodes[0].textContent.trim(),
      years: f.querySelector('h4 small').textContent.trim(),
      why: f.querySelector('p').textContent.trim(),
      href: link ? link.getAttribute('href') : null,
      rel: link ? link.getAttribute('rel') : null,
      order,
      active: (f.querySelector('.rfigsw button.is-active') || {}).textContent,
      // Between the lines and the fold, the way Naseeb Edu orders them.
      afterLines: !!(lines.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeFold: !!(f.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  ok(!!fig, 'the panel carries the historical figure');
  ok(fig.afterLines && fig.beforeFold, 'the figure sits between the summary lines and the fold');
  ok(fig.who.length > 2 && /\d{3,4}/.test(fig.years), `a named figure with years (${fig.who}, ${fig.years})`);
  // Man before woman: the order the archetype pages already use.
  ok(fig.order.length === 2 && fig.order[0] === MAN[LANG],
     `the man is listed before the woman (${fig.order.join(' / ')})`);
  ok(/^https:\/\/\w+\.wikipedia\.org\//.test(fig.href || ''),
     `the link goes to Wikipedia (${fig.href})`);
  ok((fig.rel || '').indexOf('noopener') !== -1, 'the outbound link is rel=noopener');
  console.log('  figure: ' + fig.who + ' (' + fig.years + ') -> ' + fig.href);

  // Switching sides swaps the person and keeps the panel in place.
  const swapped = await page.evaluate(async () => {
    const other = [...document.querySelectorAll('.rfigsw button')].find((b) => !b.classList.contains('is-active'));
    other.click();
    await new Promise((r) => setTimeout(r, 60));
    const f = document.querySelector('.rfig');
    return {
      who: f.querySelector('h4').childNodes[0].textContent.trim(),
      href: (f.querySelector('.rfiglink') || {}).getAttribute
        ? f.querySelector('.rfiglink').getAttribute('href') : null,
      stillOnePanel: document.querySelectorAll('.rsum').length,
      hexagonAlive: !!document.querySelector('.rpoly .shape'),
    };
  });
  ok(swapped.who !== fig.who, `the switch changes the person (${fig.who} -> ${swapped.who})`);
  ok(swapped.href !== fig.href, 'and the Wikipedia link follows the person');
  ok(swapped.stillOnePanel === 1, 'the panel is replaced, not duplicated');
  ok(swapped.hexagonAlive, 'the hexagon survives the switch');

  // The fold: the evidence under the headline lines.
  const fold = await page.evaluate(() => {
    const d = document.querySelector('.rfold');
    if (!d) return null;
    const shut = d.querySelectorAll('.rpanel').length && d.open;
    d.open = true;
    return {
      wasClosed: !shut,
      label: d.querySelector('summary').textContent.trim(),
      blocks: [...d.querySelectorAll('.rpanel > header h3')].map((h) => h.textContent),
      badges: [...d.querySelectorAll('.rpanel > header .rbadge')].map((b) => b.textContent),
      typeCode: (d.querySelector('.rtype') || {}).textContent || null,
      axes: d.querySelectorAll('.raxtrack .raxdot').length,
      bars: d.querySelectorAll('.rbar i').length,
      widths: [...d.querySelectorAll('.rbar i')].map((e) => e.style.width),
      matrix: (d.querySelector('.rmx b') || {}).textContent || null,
      notIq: [...d.querySelectorAll('.rnote')].some((e) => e.textContent.length > 80),
    };
  });
  ok(!!fold, 'the panel carries a "show the full numbers" fold');
  ok(fold.wasClosed, 'the fold starts closed');
  ok(fold.blocks.length === 7,
     `a panel per finished challenge, plus the type panel (${fold.blocks.length})`);
  ok(/^[IE][SN][TF][PJ]-[AT]$/.test((fold.typeCode || '').replace(/\s/g, '')),
     `the four-letter code reads as a code (${fold.typeCode})`);
  ok(fold.axes === 5, `five spectrums behind the code (${fold.axes})`);
  ok(fold.badges.length >= 2, `panels carry badges (${fold.badges.join(', ')})`);
  // 5 traits + 6 interests + 10 values + 11 subjects + 6 work values = 38.
  ok(fold.bars === 38, `every scale gets a bar (${fold.bars})`);
  ok(new Set(fold.widths).size > 3, 'the bars are not all the same length');
  ok(fold.matrix === '12 / 12', `the puzzle count is shown as a count (${fold.matrix})`);
  ok(fold.notIq, 'the reasoning block carries the not-an-IQ sentence');
  console.log('  fold "' + fold.label + '": ' + fold.blocks.join(' | '));

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `summary-${LANG}-${WIDTH}.png`);
  // clip is in DOCUMENT coordinates, not viewport ones, so the scroll offset has
  // to be added -- without it the shot lands wherever the panel used to be.
  await page.screenshot({ path: file, captureBeyondViewport: true, clip: await page.evaluate(() => {
    const r = document.querySelector('.rsum').getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY,
             width: r.width, height: r.height };
  }) });
  console.log('  ' + file);

  console.log(errors.length ? '\n  PAGE ERRORS:\n   ' + errors.join('\n   ') : '\n  no page errors');
  console.log('  ' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  await browser.close();
  process.exit(fail || errors.length ? 1 : 0);
})();
