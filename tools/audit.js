// Full-site bug audit in real Chrome: every page, three widths.
// One tab per width, navigated through the pages, so 17 pages stay quick.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const { CHROME, SITE_DIR } = require('./paths');
const BASE = 'http://localhost:8765/';
const DIR = SITE_DIR;
const WIDTHS = [360, 768, 1280];

// Root plus each translated folder. Russian and English are longer than Uzbek:
// German-problem territory, so a nav that fits in Uzbek is not evidence that it
// fits at all, and these pages have to be measured, not assumed.
const LANGDIRS = ['', 'ru/', 'en/'];
const PAGES = LANGDIRS.flatMap(d => fs.existsSync(DIR + d)
  ? fs.readdirSync(DIR + d).filter(f => f.endsWith('.html')).sort().map(f => d + f)
  : []);
const problems = [];
let current = '?', curW = 0;
const bug = (kind, detail, page, w) =>
  problems.push({ page: page || current, w: w || curW, kind, detail: String(detail).slice(0, 170) });

const SCAN = () => {
  const vw = document.documentElement.clientWidth;
  const out = { over: [], spill: [], dupIds: [], emptyLinks: [], tinyTap: [], links: [], hSkips: [],
                h1: document.querySelectorAll('h1').length, title: document.title,
                lang: document.documentElement.lang,
                bodyW: document.documentElement.scrollWidth };
  const cls = el => typeof el.className === 'string' ? el.className : (el.className.baseVal || '');
  // An element wider than the viewport is only a bug if nothing above it scrolls.
  // Wide tables and code blocks are meant to scroll inside their own container.
  const inScroller = el => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement){
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
    }
    return false;
  };
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > vw + 1 || r.left < -1) && !inScroller(el))
      out.over.push(el.tagName.toLowerCase() + '.' + cls(el).split(' ')[0] + ' w=' + Math.round(r.width));
  });
  // and the page itself must never scroll sideways
  if (out.bodyW > vw + 1) out.over.push('DOCUMENT scrollWidth=' + out.bodyW + ' vw=' + vw);

  // VERTICAL spill: an element painting outside its own box and over what follows.
  // preserveAspectRatio="slice" does exactly this unless the container clips, which
  // is how the hero scene came to cover the section below it.
  document.querySelectorAll('svg, img, video, canvas').forEach(el => {
    const par = el.parentElement; if (!par) return;
    const e = el.getBoundingClientRect(), p = par.getBoundingClientRect();
    const over = Math.round(e.bottom - p.bottom);
    if (over > 2 && getComputedStyle(par).overflow === 'visible')
      out.spill.push(el.tagName.toLowerCase() + ' spills ' + over + 'px below ' +
                     par.tagName.toLowerCase() + '.' + cls(par).split(' ')[0]);
  });
  const seen = {};
  document.querySelectorAll('[id]').forEach(el => {
    if (seen[el.id]) out.dupIds.push(el.id); else seen[el.id] = 1;
  });
  document.querySelectorAll('a[href]').forEach(a => {
    out.links.push(a.getAttribute('href'));
    if (!a.textContent.trim() && !a.querySelector('img,svg')) out.emptyLinks.push(a.getAttribute('href'));
    const r = a.getBoundingClientRect();
    if (r.width && r.height && r.height < 22 && a.closest('nav,footer'))
      out.tinyTap.push(a.getAttribute('href') + ' h=' + Math.round(r.height));
  });
  let prev = 0;
  document.querySelectorAll('h1,h2,h3,h4').forEach(h => {
    const lvl = +h.tagName[1];
    if (prev && lvl > prev + 1) out.hSkips.push(prev + '->' + lvl + ' "' + h.textContent.trim().slice(0, 28) + '"');
    prev = lvl;
  });
  return out;
};

(async () => {
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--blink-settings=preferredColorScheme=1'] });
  const allLinks = new Set();

  for (const w of WIDTHS) {
    curW = w;
    const p = await browser.newPage();
    await p.setViewport({ width: w, height: 900 });
    p.on('pageerror', e => bug('js-error', e));
    p.on('console', m => { if (m.type() === 'error') bug('console-error', m.text()); });
    p.on('response', r => { if (r.status() >= 400) bug('http-' + r.status(), r.url()); });
    p.on('request', r => {
      const u = r.url();
      if (u.indexOf(BASE) !== 0 && !u.startsWith('data:')) bug('third-party', u);
    });

    for (const page of PAGES) {
      current = page;
      try {
        await p.goto(BASE + page, { waitUntil: 'load', timeout: 30000 });
        await p.evaluate(() => document.fonts && document.fonts.ready);
        await new Promise(r => setTimeout(r, 200));
        const res = await p.evaluate(SCAN);
        res.over.forEach(o => bug('overflow', o));
      res.spill.forEach(o => bug('vertical-spill', o));
        res.dupIds.forEach(o => bug('duplicate-id', o));
        res.emptyLinks.forEach(o => bug('empty-link', o));
        res.tinyTap.forEach(o => bug('small-tap-target', o));
        if (w === WIDTHS[0]) {
          if (res.h1 !== 1) bug('h1-count', res.h1);
          if (!res.title) bug('no-title', '');
          // Expected language comes from the folder the page lives in. This used
          // to demand 'uz' everywhere, so every correctly-tagged ru/ and en/ page
          // was reported as a bug -- 32 of the 94 findings were this one line.
          const wantLang = page.indexOf('ru/') === 0 ? 'ru'
                         : page.indexOf('en/') === 0 ? 'en' : 'uz';
          if (res.lang !== wantLang) bug('lang', res.lang + ' (expected ' + wantLang + ')');
          res.hSkips.forEach(o => bug('heading-skip', o));
          res.links.forEach(l => allLinks.add(page + ' -> ' + l));
        }
      } catch (e) { bug('audit-failed', e.message); }
    }
    await p.close();
  }

  // Resolve every href the way the browser did: against the page it was found
  // on, with the query string dropped. Checking the raw href against the repo
  // root reported every '../' link on a ru/ or en/ page as dead, and every
  // 'test.html?lang=ru' too -- 62 findings, none of them real.
  for (const entry of allLinks) {
    const [from, href] = entry.split(' -> ');
    if (!href || /^(https?:|mailto:|tel:)/.test(href)) continue;
    const [rawFile, hash] = href.split('#');
    const file = rawFile.split('?')[0];
    const rel = file ? path.posix.normalize(path.posix.join(path.posix.dirname(from), file)) : '';
    if (rel && rel.indexOf('..') === 0) { bug('link-escapes-site', href, from, '-'); continue; }
    if (rel && !fs.existsSync(DIR + rel)) { bug('dead-link', href + ' (from ' + from + ')', '(links)', '-'); continue; }
    if (hash && rel) {
      const html = fs.readFileSync(DIR + rel, 'utf8');
      if (html.indexOf('id="' + hash + '"') === -1) bug('dead-anchor', href + ' (from ' + from + ')', '(links)', '-');
    }
  }

  await browser.close();
  console.log('audited ' + PAGES.length + ' pages x ' + WIDTHS.length + ' widths');
  if (!problems.length) { console.log('\nNO PROBLEMS FOUND'); process.exit(0); }

  const byKind = {};
  problems.forEach(x => (byKind[x.kind] = byKind[x.kind] || []).push(x));
  console.log('\n' + problems.length + ' problem(s), ' + Object.keys(byKind).length + ' kind(s):\n');
  Object.keys(byKind).sort().forEach(k => {
    console.log('  ' + k + '  (' + byKind[k].length + ')');
    const shown = {};
    byKind[k].forEach(x => {
      const sig = x.page + '|' + x.detail;
      if (shown[sig]) return; shown[sig] = 1;
      console.log('      ' + String(x.page).padEnd(34) + '@' + String(x.w).padEnd(5) + x.detail);
    });
  });
  process.exit(1);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
