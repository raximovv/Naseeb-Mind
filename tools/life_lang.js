// Does the result screen show the life analysis in the student's own language?
//
// The section used to be Uzbek-only and gated behind `TLANG === 'uz'`; it now
// loads a per-language pack asynchronously, which introduces two ways to fail
// that a static check cannot see: the pack never arrives, or it arrives after
// the report is already painted and nothing fills the slot. So this drives a
// real browser to the report in all three languages and reads what is on screen.
const puppeteer = require('puppeteer-core');
const path = require('path');
const { settleFigureChoice, finishToReport } = require('./figure_choice');

const BASE = 'http://localhost:8765/test.html';
const { CHROME } = require('./paths');

// One bullet taken from each language's pack. Present on screen => that
// language's file was the one fetched and rendered.
const MARKER = {
  uz: 'Kuchli taraflaringiz',
  ru: 'Ваши сильные стороны',
  en: 'Your strengths',
};
const HEADING = { uz: 'Shaxsiyatingiz haqida qisqacha', ru: 'Кратко о вашей личности',
                  en: 'Your personality in brief' };

let pass = 0, fail = 0;
function check(name, ok, extra){
  if (ok) { console.log('  PASS ' + name); pass++; }
  else { console.log('  FAIL ' + name + (extra ? '  -> ' + extra : '')); fail++; }
}

async function run(){
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const lang of ['uz', 'ru', 'en']){
    console.log('\n== ' + lang + ' ==');
    const p = await browser.newPage();
    const requested = [];
    p.on('request', r => { if (/life-\w+\.js/.test(r.url())) requested.push(path.basename(r.url())); });
    await p.goto(BASE + '?lang=' + lang, { waitUntil: 'networkidle0' });

    await finishToReport(p, new Array(60).fill(4));
    await settleFigureChoice(p, 'male', 15).catch(() => {});
    await p.waitForSelector('.lifefull', { timeout: 8000 }).catch(() => {});

    const got = await p.evaluate(() => {
      const slot = document.getElementById('lifeslot');
      return {
        slot: !!slot,
        text: slot ? slot.textContent : '',
        strong: document.querySelectorAll('.lifefull .lifecol.good li').length,
        weak: document.querySelectorAll('.lifefull .lifecol.watch li').length,
        grids: document.querySelectorAll('.lifefull .lifegrid').length,
        // Anything that would be a second list of jobs above «Yoʻnalishlar».
        careers: document.querySelectorAll('.lifefull .career, .lifefull .careers').length,
      };
    });

    check('only the ' + lang + ' pack was fetched',
      requested.length === 1 && requested[0] === 'life-' + lang + '.js', requested.join(',') || 'none');
    check('the slot exists in the report', got.slot);
    check('heading is in ' + lang, got.text.indexOf(HEADING[lang]) >= 0);
    check('bullets are in ' + lang, got.text.indexOf(MARKER[lang]) >= 0);
    check('no other language leaked in',
      Object.keys(MARKER).filter(l => l !== lang).every(l => got.text.indexOf(MARKER[l]) < 0));
    // One merged block, four and four. Three areas of five used to sit here and
    // pushed «Yoʻnalishlar» off the end of what anyone read.
    check('one merged block, not three areas', got.grids === 1, String(got.grids));
    check('four strengths', got.strong === 4, String(got.strong));
    check('four watch-outs', got.weak === 4, String(got.weak));
    // «Yoʻnalishlar» is the only place on the result screen that names careers.
    // This block is built from two personality traits and must not compete.
    check('no second list of careers above «Yoʻnalishlar»', got.careers === 0, String(got.careers));
    await p.close();
  }

  // OVERALL in life_content.py selects bullets by POSITION, not by text, so the
  // same student is supposed to meet the same four strengths and the same four
  // watch-outs whichever language they read. A browser cannot compare Uzbek to
  // Russian, but it can catch the failure that selection style is exposed to: a
  // translated pack that is a different length, which would silently shift every
  // index after the gap and hand one language a different set of bullets.
  const got = {};
  for (const lang of ['uz', 'ru', 'en']){
    const p = await browser.newPage();
    await p.goto(BASE + '?lang=' + lang, { waitUntil: 'networkidle0' });
    await finishToReport(p, new Array(60).fill(4));
    await settleFigureChoice(p, 'male', 15).catch(() => {});
    await p.waitForSelector('.lifefull', { timeout: 8000 }).catch(() => {});
    got[lang] = await p.evaluate(() => ({
      titles: [].map.call(document.querySelectorAll('.lifefull .lifecol li b'), e => e.textContent),
      n: document.querySelectorAll('.lifefull .lifecol li').length,
    }));
    await p.close();
  }
  console.log('\n== the same block in every language ==');
  check('uz count == ru count', got.uz.n === got.ru.n, got.uz.n + ' vs ' + got.ru.n);
  check('uz count == en count', got.uz.n === got.en.n, got.uz.n + ' vs ' + got.en.n);
  for (const lang of ['uz', 'ru', 'en']){
    check(lang + ' has a bold title on every bullet',
      got[lang].titles.length === got[lang].n, got[lang].titles.length + ' of ' + got[lang].n);
    // Two identical titles in one block means two positions in OVERALL resolved
    // to the same sentence -- the reader sees three bullets where four were paid for.
    check(lang + ' repeats no bullet',
      new Set(got[lang].titles).size === got[lang].titles.length, got[lang].titles.join(', '));
  }

  // A pack that arrives AFTER the report is already on screen. This is the whole
  // reason the slot exists, and on a school connection it is the normal case.
  console.log('\n== pack arrives after the report is painted ==');
  {
    const p = await browser.newPage();
    await p.setRequestInterception(true);
    p.on('request', r => {
      if (/life-\w+\.js/.test(r.url())) setTimeout(() => r.continue(), 3000);
      else r.continue();
    });
    await p.goto(BASE + '?lang=ru', { waitUntil: 'domcontentloaded' });
    await finishToReport(p, new Array(60).fill(4));
    await settleFigureChoice(p, 'male', 15).catch(() => {});
    const before = await p.evaluate(() => ({
      report: !!document.querySelector('#shareBox'),
      life: !!document.querySelector('.lifefull'),
      slotEmpty: (document.getElementById('lifeslot') || {}).innerHTML === '',
    }));
    check('report is usable before the pack lands', before.report);
    check('no half-drawn section while waiting', !before.life && before.slotEmpty);
    await p.waitForSelector('.lifefull', { timeout: 10000 }).catch(() => {});
    const after = await p.evaluate(() => ({
      life: !!document.querySelector('.lifefull'),
      ru: (document.getElementById('lifeslot') || {}).textContent.indexOf('Ваши сильные стороны') >= 0,
    }));
    check('section fills itself in on arrival', after.life);
    check('and it is the right language', after.ru);
    await p.close();
  }

  // A pack that never arrives at all: the report must stand on its own, with no
  // heading hanging over an empty box.
  console.log('\n== pack never arrives ==');
  {
    const p = await browser.newPage();
    await p.setRequestInterception(true);
    p.on('request', r => { if (/life-\w+\.js/.test(r.url())) r.abort(); else r.continue(); });
    await p.goto(BASE + '?lang=uz', { waitUntil: 'domcontentloaded' });
    await finishToReport(p, new Array(60).fill(4));
    await settleFigureChoice(p, 'male', 15).catch(() => {});
    const got = await p.evaluate(() => ({
      report: !!document.querySelector('#shareBox'),
      guide: !!document.getElementById('capture'),
      life: !!document.querySelector('.lifefull'),
      heading: !!document.querySelector('.lifetop'),
    }));
    check('the rest of the report still renders', got.report && got.guide);
    check('no life section', !got.life);
    check('and no orphan heading over an empty box', !got.heading);
    await p.close();
  }

  await browser.close();
  console.log('\n' + (fail ? fail + ' FAILED, ' : '') + pass + ' checks passed');
  process.exit(fail ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
