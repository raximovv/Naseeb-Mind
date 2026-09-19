// The header account control, in a real browser, in both states.
//
// The two states are genuinely different controls -- a link out to the sign-in
// dialog, and a menu button over a session -- so both are driven here rather
// than inspected. Signing in is faked by writing the session localStorage key
// that account.js reads; the Supabase calls that follow are blocked, because
// what is under test is the header, not the network.
const puppeteer = require('./node_modules/puppeteer-core');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:8765/';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

// A session that account.js will accept: an access token and an expiry an hour
// out. `name` is what Supabase puts in user_metadata when an account has one.
function fakeSession(name) {
  return JSON.stringify({
    access: 'test-access-token',
    refresh: 'test-refresh-token',
    expires: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-4000-8000-000000000001', email: 'nm-test@example.com', name: name || '' },
  });
}

async function signIn(page, name) {
  await page.evaluate((v) => localStorage.setItem('naseebmind_session_v1', v), fakeSession(name));
}
async function signOut(page) {
  await page.evaluate(() => localStorage.removeItem('naseebmind_session_v1'));
}

const shot = (page) => page.evaluate(() => {
  const box = document.querySelector('[data-acct]');
  if (!box) return null;
  const btn = box.querySelector('.acctbtn');
  const menu = box.querySelector('.acctmenu');
  const items = [...box.querySelectorAll('[role="menuitem"]')];
  const r = btn ? btn.getBoundingClientRect() : { width: 0, height: 0 };
  return {
    tag: btn ? btn.tagName : null,
    href: btn ? btn.getAttribute('href') : null,
    name: btn ? (btn.querySelector('.acctnm') || {}).textContent : null,
    avatar: btn ? (btn.querySelector('.acctav') || {}).innerHTML.slice(0, 5) : null,
    caret: !!(btn && btn.querySelector('.acctcar')),
    expanded: btn ? btn.getAttribute('aria-expanded') : null,
    menuOpen: !!(menu && !menu.hidden),
    items: items.map((el) => ({
      text: el.textContent.trim(), href: el.getAttribute('href'), tag: el.tagName,
    })),
    // What a screen reader would announce: the avatar is aria-hidden, so its
    // initial is decoration and must not be counted as the button's name.
    accName: btn ? [...btn.childNodes]
      .filter((n) => !(n.nodeType === 1 && n.getAttribute('aria-hidden') === 'true'))
      .map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim() : null,
    nameVisible: btn && btn.querySelector('.acctnm')
      ? btn.querySelector('.acctnm').getBoundingClientRect().width > 4 : false,
    w: Math.round(r.width), h: Math.round(r.height),
    // Nothing in the header may still offer to start or continue the test --
    // except inside the account menu, where "carry on" is the whole point.
    navCta: [...document.querySelectorAll('.nav a, .topnav a, .nav button, .topnav button')]
      .filter((a) => !a.closest('[data-acct]'))
      .map((a) => a.textContent.trim())
      .filter((s) => /Testni boshlash|Testni davom ettirish|Пройти тест|Продолжить тест|Take the test|Continue the test/.test(s)),
  };
});

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [], blocked = [], stray = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Each blocked Supabase call logs one "Failed to load resource", which is this
  // harness's own doing. Those lines are dropped and the requests that actually
  // failed are checked instead, so a genuinely broken asset cannot hide behind
  // them.
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on('requestfailed', (r) => {
    (r.url().indexOf('supabase.co') >= 0 ? blocked : stray).push(r.url());
  });
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    if (r.url().indexOf('supabase.co') >= 0) return r.abort();
    r.continue();
  });

  // =================================================== signed out, uz ======
  console.log('\n-- signed out, uz/index.html');
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
  await signOut(page);
  await page.reload({ waitUntil: 'networkidle0' });
  let s = await shot(page);
  ok(s && s.tag === 'A', 'signed out it is a link, so it works with no JS');
  ok(s.href === 'test.html?auth=signin', `it opens the sign-in dialog (${s.href})`);
  ok(s.name === 'Kirish', `it says Kirish (${s.name})`);
  ok(/<svg/.test(s.avatar || ''), 'the navy disc holds a person icon');
  ok(!s.caret, 'no caret: there is no menu to open');
  ok(s.items.length === 0, 'no menu in the DOM at all');
  ok(s.navCta.length === 0, `nothing in the header starts or continues the test (${JSON.stringify(s.navCta)})`);

  const pill = await page.evaluate(() => {
    const c = getComputedStyle(document.querySelector('.acctbtn'));
    const av = getComputedStyle(document.querySelector('.acctav'));
    return { bg: c.backgroundColor, radius: c.borderRadius, colour: c.color,
             avBg: av.backgroundColor, avRadius: av.borderRadius, border: c.borderTopWidth };
  });
  console.log('  ' + JSON.stringify(pill));
  ok(pill.bg === 'rgb(244, 240, 232)', `warm beige pill (${pill.bg})`);
  ok(pill.radius === '999px', `fully rounded (${pill.radius})`);
  ok(pill.avBg === 'rgb(22, 35, 63)', `navy avatar (${pill.avBg})`);
  ok(pill.avRadius === '50%', 'the avatar is a circle');
  ok(pill.border === '1px', 'a subtle border, not a filled button');

  // ==================================================== signed in, uz ======
  console.log('\n-- signed in, uz/index.html (no display name on the account)');
  await signIn(page, '');
  await page.reload({ waitUntil: 'networkidle0' });
  s = await shot(page);
  ok(s.tag === 'BUTTON', 'signed in it is a menu button');
  ok(s.name === 'Hisobim', `no name on the account, so "Hisobim" and not a guess (${s.name})`);
  ok(/<svg/.test(s.avatar || ''), 'and no initial either: the person icon stays');
  ok(s.caret, 'a caret says there is a menu');
  ok(s.expanded === 'false', 'which starts closed');
  ok(!s.menuOpen, 'and is hidden');

  console.log('\n-- signed in, with a display name');
  await signIn(page, 'Rahim');
  await page.reload({ waitUntil: 'networkidle0' });
  s = await shot(page);
  ok(s.name === 'Rahim', `the account's own name (${s.name})`);
  ok(s.avatar === 'R', `its initial in the disc (${s.avatar})`);

  // ============================================================ the menu ===
  console.log('\n-- the menu');
  await page.click('.acctbtn');
  s = await shot(page);
  ok(s.menuOpen && s.expanded === 'true', 'a click opens it');
  ok(s.items.length === 2, `two items (${s.items.length})`);
  ok(s.items[0].text === 'Testni davom ettirish' && s.items[0].href === 'test.html?view=resume',
     `Testni davom ettirish -> ${s.items[0].href}`);
  ok(s.items[1].text === 'Chiqish' && s.items[1].tag === 'BUTTON',
     'Chiqish is a button, not a link: it changes state');
  const sep = await page.evaluate(() => !!document.querySelector('.acctsep'));
  ok(sep, 'a divider above it');
  const menuStyle = await page.evaluate(() => {
    const c = getComputedStyle(document.querySelector('.acctmenu'));
    return { border: c.borderTopWidth, shadow: c.boxShadow !== 'none', bg: c.backgroundColor };
  });
  ok(menuStyle.border === '1px' && menuStyle.shadow, 'subtle border and a shadow');

  // Escape closes it and puts focus back where it came from.
  await page.keyboard.press('Escape');
  s = await shot(page);
  ok(!s.menuOpen, 'Escape closes it');
  ok(await page.evaluate(() => document.activeElement.classList.contains('acctbtn')),
     'and focus goes back to the button');

  // A click anywhere else closes it.
  await page.click('.acctbtn');
  await page.click('h1');
  s = await shot(page);
  ok(!s.menuOpen, 'a click outside closes it');

  // Keyboard: down opens onto the first item and wraps through the two.
  await page.focus('.acctbtn');
  await page.keyboard.press('ArrowDown');
  ok(await page.evaluate(() => document.activeElement.getAttribute('data-do') === 'resume'),
     'ArrowDown opens it on the first item');
  await page.keyboard.press('ArrowDown');
  ok(await page.evaluate(() => document.activeElement.getAttribute('data-do') === 'out'),
     'ArrowDown walks down');
  await page.keyboard.press('ArrowDown');
  ok(await page.evaluate(() => document.activeElement.getAttribute('data-do') === 'resume'),
     'and wraps round');
  await page.keyboard.press('ArrowUp');
  ok(await page.evaluate(() => document.activeElement.getAttribute('data-do') === 'out'),
     'ArrowUp wraps the other way');
  await page.keyboard.press('Escape');

  // ========================================================== signing out ==
  console.log('\n-- signing out from an ordinary page');
  await page.click('.acctbtn');
  await page.click('[data-do="out"]');
  await new Promise((r) => setTimeout(r, 350));
  s = await shot(page);
  ok(s.tag === 'A' && s.name === 'Kirish', 'the pill goes back to Kirish with no reload');
  ok(await page.evaluate(() => !localStorage.getItem('naseebmind_session_v1')),
     'and the session is gone');
  await page.reload({ waitUntil: 'networkidle0' });
  s = await shot(page);
  ok(s.tag === 'A' && s.name === 'Kirish', 'still signed out after a refresh');

  // ======================================================= ru and en =======
  for (const [dir, lang, login, account, resume] of [
    ['ru/', 'ru', 'Войти', 'Мой аккаунт', 'Продолжить тест'],
    ['en/', 'en', 'Log in', 'My account', 'Continue the test'],
  ]) {
    console.log(`\n-- ${dir}index.html`);
    await page.goto(BASE + dir + 'index.html', { waitUntil: 'networkidle0' });
    await signOut(page);
    await page.reload({ waitUntil: 'networkidle0' });
    s = await shot(page);
    ok(s.name === login, `signed out says ${login} (${s.name})`);
    ok(s.href === `../test.html?lang=${lang}&auth=signin`, `and keeps the language (${s.href})`);
    await signIn(page, '');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.click('.acctbtn');
    s = await shot(page);
    ok(s.name === account, `signed in says ${account} (${s.name})`);
    ok(s.items[0].text === resume, `the menu is translated (${s.items[0].text})`);
    ok(s.items[0].href === `../test.html?lang=${lang}&view=resume`,
       `and its links keep the language (${s.items[0].href})`);
    ok(s.navCta.length === 0, 'still nothing in the header that starts the test');
  }

  // ========================================================= the palettes ==
  // Hover included: the hover colour was a hardcoded cream, which is only
  // invisible while the palette happens to be light. It is a token now, and
  // tools/palette.js is what guards the palette itself.
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const rgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
  const contrast = (a, b) => {
    const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  {
    console.log('\n-- colour');
    await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
    await signIn(page, 'Rahim');
    await page.reload({ waitUntil: 'networkidle0' });
    const c = await page.evaluate(() => {
      const btn = document.querySelector('.acctbtn');
      const g = (el, prop) => getComputedStyle(el)[prop];
      const rest = g(btn, 'backgroundColor');
      // Read the hover colour off the rule rather than trying to hold a pointer
      // still: what matters is that the declared colour is the right one.
      const probe = document.createElement('style');
      probe.textContent = '.acctbtn{background:var(--hoverbg)!important}';
      document.head.appendChild(probe);
      const hover = g(btn, 'backgroundColor');
      probe.remove();
      return { rest, hover, text: g(btn, 'color'),
               av: g(document.querySelector('.acctav'), 'backgroundColor') };
    });
    ok(contrast(c.rest, c.text) >= 4.5,
       `name readable at rest (${contrast(c.rest, c.text).toFixed(2)}:1 on ${c.rest})`);
    ok(contrast(c.hover, c.text) >= 4.5,
       `name readable on hover (${contrast(c.hover, c.text).toFixed(2)}:1 on ${c.hover})`);
    ok(contrast(c.av, 'rgb(255,255,255)') >= 4.5,
       `initial readable on the navy disc (${contrast(c.av, 'rgb(255,255,255)').toFixed(2)}:1 on ${c.av})`);
  }
  // =========================================================== an obraz ====
  console.log('\n-- an archetype page, to prove it is every page and not just the home one');
  await page.goto(BASE + 'obraz-ijodkor-strateg.html', { waitUntil: 'networkidle0' });
  await signIn(page, '');
  await page.reload({ waitUntil: 'networkidle0' });
  s = await shot(page);
  ok(s.tag === 'BUTTON' && s.name === 'Hisobim', 'the same control, signed in');

  // ================================================================ phone ==
  console.log('\n-- 360px');
  await page.setViewport({ width: 360, height: 780 });
  await page.goto(BASE + 'index.html', { waitUntil: 'networkidle0' });
  s = await shot(page);
  ok(!s.nameVisible, 'the name gives up its width');
  ok(/Hisobim/.test(s.accName), `but is still announced (${JSON.stringify(s.accName)})`);
  ok(s.h >= 36, `the target is still ${s.h}px tall`);
  const fits = await page.evaluate(() => {
    const bar = document.querySelector('.navin').getBoundingClientRect();
    const b = document.querySelector('.acctbtn').getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > window.innerWidth,
             inside: b.right <= bar.right + 1 };
  });
  ok(!fits.overflow, 'the page does not scroll sideways');
  ok(fits.inside, 'and the pill is inside the bar');
  await page.click('.acctbtn');
  const onScreen = await page.evaluate(() => {
    const m = document.querySelector('.acctmenu').getBoundingClientRect();
    return m.left >= 0 && m.right <= window.innerWidth + 1;
  });
  ok(onScreen, 'the menu opens on screen, not off the right edge');

  // ================================================= the sticky header =====
  // What the theme button broke when it was added: one more control pushed the
  // header onto a third row, and a 137px sticky header then sat on top of the
  // first question, so tapping an answer hit the nav instead. Height is the
  // symptom; being covered is the bug, so this checks the bug.
  console.log('\n-- the header does not sit on the page');
  for (const w of [360, 390, 768]) {
    await page.setViewport({ width: w, height: 844 });
    for (const url of ['index.html', 'test.html']) {
      await page.goto(BASE + url, { waitUntil: 'networkidle0' });
      const got = await page.evaluate(() => {
        const bar = document.querySelector('.nav, .topnav');
        const h = Math.round(bar.getBoundingClientRect().height);
        // Rows, not pixels: the two headers are built differently and a pixel
        // budget that fits one is arbitrary for the other. What went wrong was
        // a THIRD row, so that is what is counted. Controls inside one row do
        // not share a top (a 30px pill and a 38px brand sit differently), so
        // tops within 22px of each other are the same row.
        const tops = [...bar.querySelectorAll(':scope > * > *')]
          .filter((e) => e.offsetParent)
          .map((e) => Math.round(e.getBoundingClientRect().top))
          .sort((a, b) => a - b);
        let rows = 0, last = -99;
        tops.forEach((t) => { if (t - last > 22) { rows++; last = t; } });
        // The first thing a reader would try to touch, wherever it is.
        const target = document.querySelector('#app .chgo, .btn.big, main a.btn, .chgo');
        if (!target) return { h, covered: false, what: 'nothing to tap' };
        target.scrollIntoView({ block: 'center' });
        const r = target.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { h, rows, covered: !!(at && at.closest('.nav, .topnav')),
                 what: target.textContent.trim().slice(0, 20) };
      });
      ok(!got.covered, `${url} @${w}: the header (${got.h}px) does not cover "${got.what}"`);
      ok(got.rows <= 2, `${url} @${w}: and stays ${got.rows} rows (${got.h}px)`);
    }
  }
  await page.setViewport({ width: 1280, height: 900 });

  // ============================================================ test.html ==
  console.log('\n-- test.html');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE + 'test.html', { waitUntil: 'networkidle0' });
  await signOut(page);
  await page.reload({ waitUntil: 'networkidle0' });
  s = await shot(page);
  ok(s.tag === 'A' && s.name === 'Kirish', 'signed out: Kirish');
  ok(s.navCta.length === 0, 'and no "Testni boshlash" beside it');
  const cards = await page.evaluate(() => document.querySelectorAll('.chlist li').length);
  ok(cards === 6, `all six challenges are visible signed out (${cards})`);
  // The pill is a link, but on this page it must open the dialog rather than
  // reload the page it is already on.
  const before = page.url();
  await page.click('.acctbtn');
  await new Promise((r) => setTimeout(r, 200));
  ok(page.url() === before, 'clicking it does not reload the page');
  ok(await page.evaluate(() => !!document.getElementById('authDialog')),
     'it opens the existing sign-in dialog in place');
  await page.keyboard.press('Escape');

  await signIn(page, 'Rahim');
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  s = await shot(page);
  ok(s.tag === 'BUTTON' && s.name === 'Rahim', 'signed in: the name and the menu');
  await page.click('.acctbtn');
  s = await shot(page);
  ok(s.items.length === 3 && s.items[0].href === null,
     'here the items are buttons: they change the view, they do not load a page');

  // Continue the test: the first unfinished challenge opens.
  await page.click('[data-do="resume"]');
  await new Promise((r) => setTimeout(r, 300));
  const opened = await page.evaluate(() => ({ view: state.view, ch: state.challenge,
                                              url: location.href }));
  ok(opened.view === 'challenge' && opened.ch === 'personality',
     `it opens the challenge they are on (${opened.view}/${opened.ch})`);
  ok(opened.url.indexOf('#') < 0 && opened.url === before, 'without leaving the page');

  // Signing out here has to clear the answers too.
  await page.evaluate(() => { state.answers[0] = 4; });
  await page.click('.acctbtn');
  await page.click('[data-do="out"]');
  await new Promise((r) => setTimeout(r, 400));
  s = await shot(page);
  ok(s.tag === 'A' && s.name === 'Kirish', 'the pill goes back to Kirish');
  ok(await page.evaluate(() => state.answers.every((v) => !v)),
     'and the answers go with the session, not to the next student on this computer');
  ok(await page.evaluate(() => document.querySelectorAll('.chlist li').length) === 6,
     'six challenges still on screen after signing out');

  console.log('\n-- what the pages asked for');
  ok(stray.length === 0,
     `every request but the blocked Supabase ones went through (${stray.join(', ') || 'none failed'})`);
  console.log(`  (${blocked.length} Supabase calls blocked by this harness)`);
  console.log(errors.length ? '\n  PAGE ERRORS:\n   ' + errors.join('\n   ') : '\n  no page errors');
  if (errors.length) fail++;
  console.log('  ' + pass + ' passed' + (fail ? ', ' + fail + ' FAILED' : ''));
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
