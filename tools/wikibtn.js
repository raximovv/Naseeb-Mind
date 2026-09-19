// The Wikipedia button on the archetype pages and on the result screen.
//
// It is one link carrying three things -- the globe, the word Wikipedia, and an
// arrow -- so the checks are about the link being ONE thing: one tab stop, one
// accessible name that says whose article it is, one press target big enough to
// hit, and the picture never cropped out of shape.
//
//   node tools/wikibtn.js
const puppeteer = require('./node_modules/puppeteer-core');

const { CHROME } = require('./paths');
const BASE = process.env.BASE || 'http://localhost:8765/';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The globe as it is stored, so a rendered box can be compared against the
// shape it is meant to keep.
const NATURAL = { w: 0, h: 0 };

// Every archetype page, in all three languages, plus the word each language
// should be printing on the button.
const PAGES = [
  ['', 'uz', 'Vikipediya'],
  ['ru/', 'ru', '\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f'],
  ['en/', 'en', 'Wikipedia'],
];
const SLUGS = ['jamoaning-yuragi', 'ishonchli-dost', 'barqaror-strateg', 'gayratli-ijodkor',
               'gayratli-tashkilotchi', 'ijodkor-insonparvar', 'ijodkor-strateg',
               'ishonchli-tayanch', 'xotirjam-kashfiyotchi', 'xotirjam-yetakchi'];

// What the browser actually painted, per link.
const READ = (sel) => Array.from(document.querySelectorAll(sel)).map((a) => {
  const img = a.querySelector('img');
  const ir = img ? img.getBoundingClientRect() : null;
  const r = a.getBoundingClientRect();
  const cs = getComputedStyle(a);
  const fig = a.closest('.afig, .rfig');
  const p = fig ? fig.querySelector('p') : null;
  return {
    href: a.getAttribute('href'),
    target: a.getAttribute('target'),
    rel: a.getAttribute('rel'),
    label: a.getAttribute('aria-label'),
    title: a.getAttribute('title'),
    text: a.textContent.replace(/\u2197/g, '').trim(),
    h: r.height, w: r.width,
    img: ir ? { w: ir.width, h: ir.height, src: img.currentSrc || img.src,
                fit: getComputedStyle(img).objectFit,
                nw: img.naturalWidth, nh: img.naturalHeight } : null,
    // Under the description, which is the whole point of option 3.
    belowText: p ? (p.getBoundingClientRect().bottom <= r.top + 1) : null,
    // One tab stop: nothing inside it is separately focusable.
    innerFocusable: a.querySelectorAll('a,button,[tabindex]').length,
    border: cs.borderTopWidth,
    decoration: cs.textDecorationLine,
  };
});

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    // Headless Chrome on this machine defaults to dark; pin light so a page
    // measured here is the page most readers see.
    args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'],
  });

  // ------------------------------------------------- the archetype pages --
  for (const [dir, lang, word] of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 900 });
    const misses = [];
    page.on('response', (r) => { if (r.status() >= 400) misses.push(r.status() + ' ' + r.url()); });

    let totalLinks = 0, bad = [];
    for (const slug of SLUGS) {
      await page.goto(BASE + dir + 'obraz-' + slug + '.html', { waitUntil: 'networkidle0' });
      const links = await page.evaluate(READ, '.afigwiki');
      const figs = await page.$$eval('.afig', (n) => n.length);
      totalLinks += links.length;
      if (links.length !== figs) bad.push(`${dir}${slug}: ${links.length} links for ${figs} figures`);
      for (const l of links) {
        if (!/^https:\/\/\w+\.wikipedia\.org\/wiki\/.+/.test(l.href || '')
            || /wikipedia\.org\/?$/.test(l.href || '')) bad.push(`${slug}: href ${l.href}`);
        if (l.target !== '_blank') bad.push(`${slug}: target ${l.target}`);
        if ((l.rel || '').indexOf('noopener') < 0 || (l.rel || '').indexOf('noreferrer') < 0)
          bad.push(`${slug}: rel ${l.rel}`);
        if (l.text !== word) bad.push(`${slug}: label "${l.text}" not "${word}"`);
        if (!l.label || l.label.length < 8) bad.push(`${slug}: aria-label "${l.label}"`);
        if (l.title !== l.label) bad.push(`${slug}: title does not match aria-label`);
        if (l.h < 44 || l.h > 48) bad.push(`${slug}: ${l.h.toFixed(1)}px tall`);
        if (!l.img) bad.push(`${slug}: no globe`);
        else {
          if (l.img.fit !== 'contain') bad.push(`${slug}: object-fit ${l.img.fit}`);
          if (!l.img.nw) bad.push(`${slug}: globe did not load (${l.img.src})`);
          if (Math.abs(l.img.w - l.img.h) > 0.5) bad.push(`${slug}: globe box ${l.img.w}x${l.img.h}`);
          NATURAL.w = l.img.nw; NATURAL.h = l.img.nh;
        }
        if (l.belowText !== true) bad.push(`${slug}: not below the description`);
        if (l.innerFocusable) bad.push(`${slug}: ${l.innerFocusable} focusable children`);
        if (l.decoration !== 'none') bad.push(`${slug}: underlined (${l.decoration})`);
      }
    }
    ok(totalLinks === 20, `${lang}: 20 links over 10 pages (${totalLinks})`);
    ok(!bad.length, `${lang}: every link is a whole button` + (bad.length ? '\n       ' + bad.slice(0, 6).join('\n       ') : ''));
    ok(!misses.length, `${lang}: nothing 404s` + (misses.length ? ' -- ' + misses.slice(0, 3).join(', ') : ''));
    await page.close();
  }
  ok(NATURAL.w === NATURAL.h, `the globe is square at source (${NATURAL.w}x${NATURAL.h}), so a square box cannot distort it`);

  // ------------------------------------------------------------ keyboard --
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 900 });
    await page.goto(BASE + 'obraz-jamoaning-yuragi.html', { waitUntil: 'networkidle0' });
    const reached = await page.evaluate(async () => {
      const a = document.querySelector('.afigwiki');
      a.focus();
      const cs = getComputedStyle(a);
      return {
        isFocused: document.activeElement === a,
        // A focus ring the reader can actually see, not the UA default that the
        // button's own border would swallow.
        outline: cs.outlineStyle + ' ' + cs.outlineWidth,
      };
    });
    ok(reached.isFocused, 'the whole button takes focus, not a piece of it');
    ok(/solid/.test(reached.outline) && parseFloat(reached.outline.split(' ')[1]) >= 2,
       `and shows a visible ring (${reached.outline})`);

    // Hover has to change something, or it does not read as pressable.
    const moved = await page.evaluate(() => {
      const a = document.querySelector('.afigwiki');
      const before = getComputedStyle(a).backgroundColor;
      return { before };
    });
    // Scroll it into view first: the figures sit well below the fold, and a
    // pointer moved to an off-screen coordinate hovers nothing. The rect is read
    // in a SECOND call because site.css sets scroll-behavior:smooth, so the
    // scroll is still animating when the first one returns.
    await page.$eval('.afigwiki', (a) => a.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await wait(120);
    const box = await page.$eval('.afigwiki', (a) => {
      const r = a.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    await wait(80);
    const after = await page.$eval('.afigwiki', (a) => getComputedStyle(a).backgroundColor);
    ok(after !== moved.before, `hover changes the button (${moved.before} -> ${after})`);
    await page.close();
  }

  // ----------------------------------------------------------- 360px wide --
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 740, isMobile: true, deviceScaleFactor: 2 });
    await page.goto(BASE + 'obraz-jamoaning-yuragi.html', { waitUntil: 'networkidle0' });
    const phone = await page.evaluate(READ, '.afigwiki');
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(phone.every((l) => l.h >= 44 && l.h <= 48),
       `on a 360px phone the button stays 44-48px (${phone.map((l) => l.h.toFixed(0)).join(', ')})`);
    ok(phone.every((l) => l.w >= 44), 'and wide enough to hit with a thumb');
    ok(overflow <= 0, `the page does not scroll sideways (${overflow}px)`);
    await page.close();
  }

  // ------------------------------------------------- the result screen ----
  // The figure panel only exists once a result does, so the six challenges are
  // answered first. Same approach as tools/darkstates.js.
  for (const [lang, word] of [['uz', 'Vikipediya'], ['ru', '\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f'], ['en', 'Wikipedia']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE + 'test.html?lang=' + lang, { waitUntil: 'networkidle0' });
    // One challenge per evaluate, with a beat between: the reasoning bank is
    // fetched lazily, so driving all six inside one call outruns it.
    for (const k of ['personality', 'interests', 'values', 'school', 'workimportance', 'reasoning']) {
      await page.evaluate((key) => {
        openChallenge(key);
        const c = challengeBy(key);
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
      }, k);
      await wait(200);
    }
    await page.evaluate(() => { state.view = 'result'; render(); });
    await wait(700);
    // The figure chooser stands between the reader and the panel on a fresh run.
    if (await page.$('.fcwrap')) {
      await page.click('.fcopt input[value="male"]');
      await page.type('#fcage', '15');
      await page.click('#fcgo');
      await wait(900);
    }
    const links = await page.evaluate(READ, '.rfiglink');
    ok(links.length === 1, `result screen (${lang}): one Wikipedia link (${links.length})`);
    const l = links[0] || {};
    ok(l.text === word, `  it says "${l.text}"`);
    ok(/^https:\/\/\w+\.wikipedia\.org\/wiki\/.+/.test(l.href || '') && !/wikipedia\.org\/?$/.test(l.href || ''),
       `  and goes to a person's article (${l.href})`);
    ok(l.target === '_blank' && (l.rel || '').indexOf('noopener') >= 0
       && (l.rel || '').indexOf('noreferrer') >= 0, '  in a new tab, rel=noopener noreferrer');
    ok(!!l.label && l.label === l.title && l.label.indexOf(word.slice(0, 4)) !== 0,
       `  named for the person, not the site ("${l.label}")`);
    ok(l.h >= 44 && l.h <= 48, `  44-48px tall (${(l.h || 0).toFixed(1)})`);
    ok(l.img && l.img.nw > 0 && l.img.fit === 'contain', '  the globe loaded, uncropped');
    ok(l.belowText === true, '  under the description');
    ok(!errors.length, '  no page errors' + (errors.length ? ': ' + errors[0] : ''));
    await page.close();
  }

  console.log('\n  ' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
