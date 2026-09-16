// The palette, in both themes, in both places it is declared.
//
// Naseeb Mind has one palette with two themes. The light values are its own. The
// dark GROUNDS and ACCENTS match Naseeb Edu's current midnight and ice-blue
// theme so every page and the standalone test remain visually consistent.
//
// The thing worth guarding is DRIFT. Every token is written out twice -- in
// assets/site.css for the generated pages, and again inside test.html, which is
// standalone and loads no stylesheet -- so a colour changed in one and not the
// other is silent until somebody notices the test page looks slightly wrong.
// This reads the computed values off real pages and compares them to the list
// below, which is the only place the palette is written down once.
//
// Contrast and readability are tools/darkmode.js; this is just the values.
//
//   node tools/palette.js
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8765/';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

// The nine original tokens plus the ones the account control and the dark theme
// needed. Values, not vibes: a colour cannot change in one stylesheet without
// this saying so.
const PALETTE = {
  light: {
    '--lazur': '#8A6A3F', '--lazur-deep': '#6B5230', '--lazur-press': '#6B5230',
    '--lazur-soft': '#D9C7A4', '--ink': '#2B2620', '--paper': '#F4F0E8',
    '--card': '#FDFCF9', '--zar': '#C9A961', '--muted': '#6E6558',
    '--avatar': '#16233F', '--brand-ink': '#8A6A3F', '--hoverbg': '#F0EADD',
    '--on-accent': '#FFF',
    '--raised': '#FFFEFB', '--inset': '#E9E1D5', '--warm': '#FBF3E4',
    '--good': '#237A5E',
  },
  // Naseeb Edu's dark theme: navy grounds with ice-blue accents.
  dark: {
    '--lazur': '#9FC6E2', '--lazur-deep': '#9FC6E2', '--lazur-press': '#C3DCED',
    '--lazur-soft': '#1C3241', '--ink': '#F7F7F7', '--paper': '#10202D',
    '--card': '#162936', '--zar': '#C3DCED', '--muted': '#B5C3CE',
    '--avatar': '#9FC6E2', '--brand-ink': '#9FC6E2', '--hoverbg': '#284452',
    '--raised': '#213947', '--inset': '#0C1923', '--warm': '#1C3241',
    '--good': '#2E8B6B', '--on-accent': '#10202D',
  },
};

// site.css serves these; test.html carries its own copy of the same tokens.
const PAGES = ['index.html', 'test.html', 'ru/index.html', 'en/index.html',
               'obraz-ijodkor-strateg.html', 'savollar.html'];

// The grounds a body is allowed to sit on. The generated pages use --card and
// the test uses --paper; anything else is a literal that escaped the tokens.
const GROUNDS = {
  light: { 'rgb(253, 252, 249)': '--card', 'rgb(244, 240, 232)': '--paper' },
  dark: { 'rgb(22, 41, 54)': '--card', 'rgb(16, 32, 45)': '--paper' },
};

(async () => {
  // Headless Chrome here prefers dark; this pins the browser to light so the
  // harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));

  for (const theme of ['light', 'dark']) {
    console.log('\n================ ' + theme + ' ================');
    const want = PALETTE[theme];
    const names = Object.keys(want);
    await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
    await page.evaluate((t) => localStorage.setItem('naseebmind_theme_v1', t), theme);

    for (const url of PAGES) {
      await page.goto(BASE + url, { waitUntil: 'networkidle0' });
      const got = await page.evaluate((n) => {
        const cs = getComputedStyle(document.documentElement);
        const out = { stamp: document.documentElement.getAttribute('data-theme'),
                      bodyBg: getComputedStyle(document.body).backgroundColor,
                      // The old three-palette switcher must stay gone.
                      palsw: document.querySelectorAll('.palsw, [data-pal]').length,
                      toggle: document.querySelectorAll('[data-theme-toggle]').length };
        n.forEach((k) => { out[k] = cs.getPropertyValue(k).trim(); });
        return out;
      }, names);

      const wrong = names.filter((n) => got[n].toUpperCase() !== want[n]);
      ok(wrong.length === 0, wrong.length
        ? `${url}: ${wrong.map((n) => `${n}=${got[n]} not ${want[n]}`).join(', ')}`
        : `${url}: all ${names.length} tokens match`);
      const ground = GROUNDS[theme][got.bodyBg];
      ok(!!ground, `${url}: painted on ${ground || 'a literal outside the palette: ' + got.bodyBg}`);
      ok(got.palsw === 0, `${url}: no trace of the old three-palette switcher`);
      ok(got.toggle === 1, `${url}: exactly one light/dark button (${got.toggle})`);
    }
  }

  // A value left over from the switcher that was removed is not a theme.
  console.log('\n-- a stale preference from the old switcher');
  await page.evaluate(() => {
    localStorage.removeItem('naseebmind_theme_v1');
    localStorage.setItem('naseebmind_pal_v1', 'night');
  });
  await page.reload({ waitUntil: 'networkidle0' });
  const stale = await page.evaluate(() => ({
    stamp: document.documentElement.getAttribute('data-theme'),
    paper: getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
  }));
  ok(stale.stamp === null, 'an old "night" value is ignored, not honoured');
  ok(stale.paper.toUpperCase() === PALETTE.light['--paper'],
     `and a light browser still gets the light palette (${stale.paper})`);

  console.log(errors.length ? '\n  PAGE ERRORS:\n   ' + errors.join('\n   ') : '\n  no page errors');
  if (errors.length) fail++;
  console.log('  ' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
