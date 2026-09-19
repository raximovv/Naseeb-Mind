// Tests the email capture in real Chrome, with every outbound request intercepted
// so nothing actually reaches the Google Sheet.
const puppeteer = require('puppeteer-core');
const { settleFigureChoice } = require('./figure_choice');

const { CHROME } = require('./paths');
const PAGE = 'http://localhost:8765/test.html';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

async function session(fakeNetworkFailure) {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const posts = [];
  await page.setRequestInterception(true);
  page.on('request', r => {
    if (r.url().indexOf('script.google.com') !== -1) {
      posts.push({ method: r.method(), body: r.postData() });
      return fakeNetworkFailure ? r.abort('failed') : r.respond({ status: 200, body: '{"ok":true}' });
    }
    r.continue();
  });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    localStorage.clear();
    state.answers = ITEMS.map((it, i) => (i % 5) + 1);
    renderReport();
  });
  await new Promise(r => setTimeout(r, 300));
  // renderReport() only opens the figure-choice dialog; the report -- and the
  // "completed" row that goes with it -- is not produced until it is answered.
  await settleFigureChoice(page);
  return { browser, page, posts, errors };
}

(async () => {
  console.log('\n== nothing is sent just by looking at the result ==');
  {
    const { browser, page, posts, errors } = await session(false);
    const completed = posts.filter(p => (p.body || '').indexOf('"completed"') !== -1);
    const leads = posts.filter(p => (p.body || '').indexOf('"lead"') !== -1);
    ok(completed.length === 1, 'the anonymous "completed" row is sent once');
    ok(leads.length === 0, 'NO lead row sent before the student types anything');
    ok((completed[0].body || '').indexOf('Dilnoza') === -1, 'the anonymous row carries no name');
    ok((completed[0].body || '').indexOf('email') === -1, 'the anonymous row carries no email');
    ok(errors.length === 0, 'no JS errors (' + (errors[0] || 'none') + ')');

    console.log('\n== a bad address is rejected client-side ==');
    await page.type('#capEmail', 'not-an-email');
    await page.click('#capBtn');
    await new Promise(r => setTimeout(r, 250));
    ok(posts.filter(p => (p.body || '').indexOf('"lead"') !== -1).length === 0, 'invalid address sends nothing');
    const msg = await page.$eval('#capMsg', e => e.textContent);
    ok(msg.length > 0, 'shows an error message: "' + msg + '"');
    ok(await page.$eval('#capBtn', b => !b.disabled), 'button is re-usable after the error');

    console.log('\n== a good address is sent, once, with the right fields ==');
    await page.$eval('#capEmail', e => e.value = '');
    await page.type('#capEmail', 'dilnoza@example.com');
    await page.click('#capBtn');
    await page.waitForSelector('.capdone', { timeout: 8000 });
    const sent = posts.filter(p => (p.body || '').indexOf('"lead"') !== -1);
    ok(sent.length === 1, 'exactly one lead row sent');
    const body = JSON.parse(sent[0].body);
    ok(body.email === 'dilnoza@example.com', 'email present');
    ok(body.status === 'lead', 'status = lead');
    ok(!!body.archetype, 'archetype present so the right guide can be sent: ' + body.archetype);
    ok(!('age' in body), 'age NOT sent - the test never asks for one');
    ok(!('name' in body) && JSON.stringify(body).indexOf('Dilnoza') === -1, 'name NOT sent');
    ok(!body.answers, 'individual answers NOT sent');
    const done = await page.$eval('#capture', e => e.textContent);
    ok(done.indexOf('dilnoza@example.com') !== -1, 'confirmation shows the address back');
    await browser.close();
  }

  // The reading order of the result page has now been set deliberately twice --
  // the guide block was moved out from under the share buttons, then the buttons
  // themselves were moved below the analysis. Both moves exist for the same
  // reason: nothing that offers a way OFF the page should sit above the thing the
  // student came for. Asserted here because it is invisible to every other check
  // -- a reordered template still renders, still scores, and still passes e2e.
  console.log('\n== the result page reads in the intended order ==');
  {
    const { browser, page } = await session(false);
    await page.waitForSelector('.lifefull', { timeout: 8000 }).catch(() => {});
    const y = await page.evaluate(() => {
      const top = s => {
        const e = document.querySelector(s);
        return e ? e.getBoundingClientRect().top + window.scrollY : null;
      };
      const muted = document.querySelectorAll('.muted');
      return {
        card:     top('.rcard') !== null ? top('.rcard') : top('#app > *'),
        life:     top('.lifefull'),
        capture:  top('#capture'),
        actions:  top('.actions'),
        lastNote: muted.length ? muted[muted.length - 1].getBoundingClientRect().top + window.scrollY : null,
      };
    });
    ok(y.life !== null, 'the life analysis is on the page at all');
    ok(y.life > y.card, 'analysis sits below the result card');
    ok(y.capture > y.life, 'the guide/email block is BELOW the analysis, not above it');
    ok(y.actions > y.capture, 'the buttons are last, below the guide block');
    ok(y.lastNote > y.actions, 'the disclaimer stays at the very bottom');
    await browser.close();
  }

  // The screenshot that caught this had an English page with Uzbek buttons on it:
  // three labels in the actions row were written as literals instead of going
  // through T(), so they never switched language. Any new literal reintroduces it.
  console.log('\n== no untranslated button labels ==');
  {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
    const UZ = ['Chop etish', 'Qaytadan', 'Havolani nusxalash', 'Rasm qilib saqlash'];
    for (const lang of ['ru', 'en']) {
      const page = await browser.newPage();
      await page.goto(PAGE + '?lang=' + lang, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 600));
      await page.evaluate(() => {
        localStorage.clear();
        state.answers = ITEMS.map((it, i) => (i % 5) + 1);
        renderReport();
      });
      await new Promise(r => setTimeout(r, 300));
      await settleFigureChoice(page);
      const labels = await page.$$eval('.actions button', bs => bs.map(b => b.textContent));
      ok(labels.length === 4, lang + ': four buttons (' + labels.length + ')');
      ok(!labels.some(t => UZ.indexOf(t) !== -1),
        lang + ': no Uzbek label left in the row -> ' + JSON.stringify(labels));
      // The copy button resets its own text after the "copied" flash; that reset
      // used to be a literal, so the button turned Uzbek after one tap.
      const reset = await page.evaluate(() => {
        const b = document.getElementById('copyBtn');
        b.textContent = 'x';
        setTimeout(function(){ b.textContent = T('shareCopy'); }, 0);
        return new Promise(r => setTimeout(() => r(b.textContent), 60));
      });
      ok(UZ.indexOf(reset) === -1, lang + ': copy button resets in-language -> "' + reset + '"');
      await page.close();
    }
    await browser.close();
  }

  // Broader than the button row: walks every visible text node on the RU and EN
  // result screens looking for Uzbek orthography (the turned-comma letters oʻ gʻ
  // and the modifier ʼ, which appear in no Russian or English word). This is how
  // the family tag was caught -- FAMILIES is read directly for its colours, and
  // .name came along with it. Catches the whole class, not one instance of it.
  console.log('\n== no Uzbek text left on the RU/EN result screen ==');
  {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
    const scan = () => {
      const out = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())){
        const t = (n.nodeValue || '').trim();
        if (t.length < 4 || !/[ʻʼ]/.test(t)) continue;
        const p = n.parentElement;
        if (!p || (!p.offsetParent && p.tagName !== 'BODY')) continue;   // not on screen
        out.push((p.className || p.id || p.tagName) + ': ' + t.slice(0, 60));
      }
      return out;
    };
    for (const lang of ['ru', 'en']) {
      const page = await browser.newPage();
      await page.setViewport({ width: 390, height: 844 });
      await page.goto(PAGE + '?lang=' + lang, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise(r => setTimeout(r, 600));
      const onQuestions = await page.evaluate(scan);
      ok(onQuestions.length === 0, lang + ': question screen is clean -> ' + JSON.stringify(onQuestions));
      await page.evaluate(() => {
        localStorage.clear();
        state.answers = ITEMS.map((it, i) => (i % 5) + 1);
        renderReport();
      });
      await new Promise(r => setTimeout(r, 300));
      await settleFigureChoice(page);
      await page.waitForSelector('.lifefull', { timeout: 8000 }).catch(() => {});
      const onReport = await page.evaluate(scan);
      ok(onReport.length === 0, lang + ': result screen is clean -> ' + JSON.stringify(onReport));
      await page.close();
    }
    await browser.close();
  }

  console.log('\n== network failure is reported honestly, not faked as success ==');
  {
    const { browser, page } = await session(true);
    await page.type('#capEmail', 'dilnoza@example.com');
    await page.click('#capBtn');
    await new Promise(r => setTimeout(r, 1200));
    const done = await page.$('.capdone');
    ok(!done, 'does NOT show a success state when the request failed');
    const msg = await page.$eval('#capMsg', e => e.textContent);
    ok(/urinib|tekshirib/.test(msg), 'shows a retry message: "' + msg + '"');
    ok(await page.$eval('#capBtn', b => !b.disabled), 'button re-enabled so they can retry');
    await browser.close();
  }

  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL ' + pass + ' CHECKS PASSED'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
