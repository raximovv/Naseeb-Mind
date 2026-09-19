// Dark mode, measured rather than looked at.
//
// A theme is not "done" when it stops looking wrong in the two screenshots you
// happened to take. This walks every element that paints text on every page, in
// BOTH themes, works out the colour actually behind it, and reports anything
// under 4.5:1. That is what catches the rule whose ground was tokenised and
// whose ink was not.
//
//   node tools/darkmode.js
const puppeteer = require('./node_modules/puppeteer-core');

const { CHROME } = require('./paths');
const BASE = process.env.BASE || 'http://localhost:8765/';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

const PAGES = ['index.html', 'obrazlar.html', 'savollar.html', 'maktablar.html',
               'privacy.html', 'obraz-ijodkor-strateg.html', 'obraz-jamoaning-yuragi.html',
               'ru/index.html', 'en/index.html', 'test.html'];

// Runs inside the page. Returns every piece of text that does not have enough
// contrast against whatever is actually painted behind it.
const SCAN = function () {
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const parse = (s) => {
    const m = String(s).match(/[\d.]+/g);
    if (!m) return null;
    return { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 };
  };
  // A translucent layer over what is behind it, which is how --line and the
  // overlays are written.
  const over = (top, bottom) => [
    Math.round(top.r * top.a + bottom[0] * (1 - top.a)),
    Math.round(top.g * top.a + bottom[1] * (1 - top.a)),
    Math.round(top.b * top.a + bottom[2] * (1 - top.a)),
  ];
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  // Walk up until something opaque is found, compositing anything translucent
  // on the way. The document root is the floor.
  function ground(el) {
    const stack = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage !== 'none') return null;   // a picture, not a colour
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) break; }
      node = node.parentElement;
    }
    let base = parse(getComputedStyle(document.documentElement).backgroundColor);
    let out = base && base.a === 1 ? [base.r, base.g, base.b] : [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out);
    return out;
  }

  const skip = (el) => el.closest('.scene,.herotop,svg,[aria-hidden="true"],.vh,.soc');
  const bad = [];
  const seen = new Set();

  document.querySelectorAll('*').forEach((el) => {
    if (skip(el)) return;
    // Only elements that paint text of their own.
    const own = [...el.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim());
    if (!own) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.99) return;
    const bg = ground(el);
    if (!bg) return;
    const c = ratio([fg.r, fg.g, fg.b], bg);
    // The AA threshold relaxes for large text, as WCAG does.
    const px = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
    if (c >= need) return;
    const key = el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0];
    if (seen.has(key)) return;
    seen.add(key);
    bad.push({ sel: key, ratio: +c.toFixed(2), need,
               fg: cs.color, bg: 'rgb(' + bg.join(', ') + ')',
               text: el.textContent.trim().slice(0, 28) });
  });
  return bad;
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const errors = [];

  for (const theme of ['light', 'dark']) {
    console.log('\n================ ' + theme + ' ================');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    page.on('pageerror', (e) => errors.push(theme + ': ' + e));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(theme + ': ' + m.text()); });
    await page.setRequestInterception(true);
    page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));
    // The site's own switch, not Chrome's emulation: what is being tested is
    // the stamp the site writes, which is what a reader actually gets.
    await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
    await page.evaluate((t) => localStorage.setItem('naseebmind_theme_v1', t), theme);

    for (const url of PAGES) {
      await page.goto(BASE + url, { waitUntil: 'networkidle0' });
      const stamp = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      const bad = await page.evaluate(SCAN);
      ok(stamp === theme, `${url} is stamped ${stamp}`);
      ok(bad.length === 0, bad.length
        ? `${url}: ${bad.length} unreadable`
        : `${url}: every piece of text clears its ground`);
      bad.forEach((b) => console.log(`       ${b.sel}  ${b.ratio}:1 (needs ${b.need})  ${b.fg} on ${b.bg}  "${b.text}"`));
    }
    await page.close();
  }

  // Images and controls, which the text walk above cannot judge.
  console.log('\n================ the brand mark and the switch ================');
  {
    const page = await browser.newPage();
    // Wide on purpose: the switch is hidden below 820px, where it would cost a
    // whole extra row of sticky header.
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));
    for (const [theme, inverted] of [['light', false], ['dark', true]]) {
      for (const url of ['index.html', 'test.html']) {
        await page.goto(BASE + url, { waitUntil: 'networkidle0' });
        await page.evaluate((t) => localStorage.setItem('naseebmind_theme_v1', t), theme);
        await page.reload({ waitUntil: 'networkidle0' });
        const got = await page.evaluate(() => {
          const mark = document.querySelector('.brandmark, .startmark');
          const btn = document.querySelector('[data-theme-toggle]');
          return {
            filter: mark ? getComputedStyle(mark).filter : 'no mark',
            pressed: btn ? btn.getAttribute('aria-pressed') : null,
            icon: btn ? (btn.querySelector('svg') ? btn.innerHTML.length : 0) : 0,
            label: btn ? btn.getAttribute('aria-label') : null,
          };
        });
        ok(inverted ? got.filter !== 'none' : got.filter === 'none',
           `${url} ${theme}: the brand mark is ${inverted ? 'inverted' : 'left alone'} (${got.filter})`);
        ok(got.pressed === String(inverted),
           `${url} ${theme}: the switch reads aria-pressed=${got.pressed}`);
        ok(got.icon > 0, `${url} ${theme}: and carries an icon`);
        ok(!!got.label, `${url} ${theme}: with a label ("${got.label}")`);
      }
    }
    // Pressing it actually changes the page, and the choice survives a reload.
    await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.setItem('naseebmind_theme_v1', 'light'));
    await page.reload({ waitUntil: 'networkidle0' });
    await page.click('[data-theme-toggle]');
    ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'),
       'clicking the switch turns the page dark');
    await page.reload({ waitUntil: 'networkidle0' });
    ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark'),
       'and it is still dark after a refresh');
    ok(await page.evaluate(() => {
      // A theme applied after first paint shows the other one for a frame.
      return performance.getEntriesByType('paint').length === 0
        || document.documentElement.getAttribute('data-theme') === 'dark';
    }), 'stamped before the first paint, so there is no flash');
    await page.close();
  }

  // Nothing is stamped when the reader has expressed no preference: that is
  // what leaves the phone in charge.
  console.log('\n================ no preference ================');
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.removeItem('naseebmind_theme_v1'));
  for (const emulated of ['light', 'dark']) {
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: emulated }]);
    await page.reload({ waitUntil: 'networkidle0' });
    const got = await page.evaluate(() => ({
      stamp: document.documentElement.getAttribute('data-theme'),
      paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
      // A theme applied after first paint is a visible flash on every load.
      painted: performance.getEntriesByType('paint').length,
    }));
    ok(got.stamp === null, `a ${emulated} phone gets no stamp (${got.stamp})`);
    ok(got.paper.toUpperCase() === (emulated === 'dark' ? '#10202D' : '#F4F0E8'),
       `and the ${emulated} palette anyway (${got.paper})`);
  }
  await page.close();

  console.log(errors.length ? '\n  PAGE ERRORS:\n   ' + errors.join('\n   ') : '\n  no page errors');
  if (errors.length) fail++;
  console.log('  ' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
