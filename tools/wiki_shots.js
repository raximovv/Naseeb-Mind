// A contact sheet of the Wikipedia button, so it can be looked at rather than
// only measured: the figure section of an archetype page in all three
// languages, at desktop and phone width, light and dark, plus the same button
// on the result screen.
//
//   node tools/wiki_shots.js   ->  tools/build/wiki/
const fs = require('fs');
const path = require('path');
const puppeteer = require('./node_modules/puppeteer-core');

const { CHROME } = require('./paths');
const BASE = process.env.BASE || 'http://localhost:8765/';
const OUT = path.join(__dirname, 'build', 'wiki');
fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The figure section and a little of what sits above it, so the button is seen
// where it lives -- under a description, not floating on a white field.
async function shotFigures(page, file) {
  // Puppeteer's clip is in PAGE coordinates (it captures beyond the viewport),
  // not viewport coordinates, so the rects are offset by the scroll position
  // and nothing needs scrolling into view first.
  const clip = await page.evaluate(() => {
    const figs = [...document.querySelectorAll('.afig')];
    if (!figs.length) return null;
    const head = figs[0].previousElementSibling || figs[0];
    const a = head.getBoundingClientRect();
    const b = figs[figs.length - 1].getBoundingClientRect();
    const pad = 20;
    return {
      x: Math.max(0, a.x + window.scrollX - pad),
      y: Math.max(0, a.y + window.scrollY - pad),
      width: a.width + pad * 2,
      height: b.bottom - a.top + pad * 2,
    };
  });
  if (!clip) return false;
  await page.screenshot({ path: path.join(OUT, file), clip });
  return true;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'],
  });
  const made = [];

  for (const [dir, lang] of [['', 'uz'], ['ru/', 'ru'], ['en/', 'en']]) {
    for (const [w, h, tag] of [[1100, 900, 'desktop'], [390, 780, 'phone']]) {
      for (const theme of ['light', 'dark']) {
        const page = await browser.newPage();
        await page.setViewport({ width: w, height: h, isMobile: w < 500, deviceScaleFactor: 2 });
        await page.goto(BASE + dir + 'obraz-jamoaning-yuragi.html', { waitUntil: 'networkidle0' });
        await page.evaluate((t) => localStorage.setItem('naseebmind_theme_v1', t), theme);
        await page.reload({ waitUntil: 'networkidle0' });
        await wait(200);
        const name = `arch-${lang}-${tag}-${theme}.png`;
        if (await shotFigures(page, name)) made.push(name);
        await page.close();
      }
    }
  }

  // The same button on the result screen, which is drawn by test.html.
  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 2 });
    await page.setRequestInterception(true);
    page.on('request', (r) => (r.url().indexOf('supabase.co') >= 0 ? r.abort() : r.continue()));
    await page.goto(BASE + 'test.html', { waitUntil: 'networkidle0' });
    await page.evaluate((t) => localStorage.setItem('naseebmind_theme_v1', t), theme);
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(250);
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
      await wait(180);
    }
    await page.evaluate(() => { state.view = 'result'; render(); });
    await wait(700);
    if (await page.$('.fcwrap')) {
      await page.click('.fcopt input[value="male"]');
      await page.type('#fcage', '15');
      await page.click('#fcgo');
      await wait(900);
    }
    const el = await page.$('.rfig');
    if (el) {
      await page.evaluate(() => document.querySelector('.rfig')
        .scrollIntoView({ block: 'center', behavior: 'instant' }));
      await wait(200);
      const name = `result-uz-${theme}.png`;
      await el.screenshot({ path: path.join(OUT, name) });
      made.push(name);
    }
    await page.close();
  }

  made.forEach((m) => console.log('  ' + path.join(OUT, m)));
  console.log('\n  ' + made.length + ' shots');
  await browser.close();
})();
