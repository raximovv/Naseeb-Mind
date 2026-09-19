// Renders a built guide (tools/build/guide-<slug>.html) to ../guides/<slug>.pdf
// with real Chrome, and refuses to write a PDF whose content overflows a page.
//
//   python build_guide.py ES|A
//   node   make_pdf.js  ishonchli-dost      (no argument = every built guide)
//
// Chrome is driven over the DevTools protocol using Node's built-in WebSocket
// rather than puppeteer-core, so this needs no npm install, which matters
// because npm cannot run on the dev machine (its Node install has no
// node_modules/npm). Same guarantees as before: overflow is refused, and a PDF
// whose content did not change is not rewritten.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { CHROME } = require('./paths');
const PORT = 9335;
const HERE = __dirname.replace(/\\/g, '/');
const OUTDIR = path.posix.join(path.posix.dirname(HERE), 'guides');
const BUILD = path.posix.join(HERE, 'build');

const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws, nextId = 1;
const waiters = new Map(), events = new Map();
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = nextId++;
  waiters.set(id, { resolve, reject });
  ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId }
                                   : { id, method, params }));
});

async function render(call, slug) {
  const src = path.posix.join(BUILD, 'guide-' + slug + '.html');
  if (!fs.existsSync(src)) {
    console.error('missing ' + src + ', run build_guide.py first');
    return false;
  }

  const loaded = new Promise(r => events.set('Page.loadEventFired', r));
  await call('Page.navigate', { url: 'file:///' + src });
  await Promise.race([loaded, sleep(20000)]);
  // No text may be measured on a fallback font.
  await call('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });

  // Every page is a fixed box; content that spills would be silently clipped.
  const probe = await call('Runtime.evaluate', {
    expression: `JSON.stringify([...document.querySelectorAll('.page')].map((el, i) =>
      ({ i: i + 1, over: el.scrollHeight - el.clientHeight })))`,
    returnByValue: true });
  const boxes = JSON.parse(probe.result.value);
  const spill = boxes.filter(b => b.over > 1);
  if (spill.length) {
    spill.forEach(b => console.log('  ' + slug + ' page ' + b.i + ': OVERFLOW +' + b.over + 'px'));
    return false;
  }

  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });
  const out = path.posix.join(OUTDIR, slug + '.pdf');
  const res = await call('Page.printToPDF', {
    printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false,
  });
  const buf = Buffer.from(res.data, 'base64');

  // Chrome stamps /CreationDate and /ModDate into every PDF, so a rebuild with no
  // content change still produces a different file, which would churn ~750 KB per
  // guide through git for nothing. Compare with those two fields blanked out and
  // only write when the guide itself actually changed.
  if (fs.existsSync(out) && strip(fs.readFileSync(out)) === strip(buf)) {
    console.log('  --  ' + slug + '.pdf unchanged');
    return true;
  }

  fs.writeFileSync(out, buf);
  console.log('  ok  ' + slug + '.pdf  (' + boxes.length + ' pages, ' +
              (buf.length / 1024).toFixed(0) + ' KB)');
  return true;
}

/** A PDF's bytes with the two timestamp fields neutralised. */
function strip(buf) {
  return Buffer.from(buf).toString('latin1')
    .replace(/\/CreationDate \(D:[^)]*\)/g, '/CreationDate ()')
    .replace(/\/ModDate \(D:[^)]*\)/g, '/ModDate ()');
}

(async () => {
  // No argument = every guide that has been built.
  const slugs = process.argv.length > 2 ? process.argv.slice(2)
    : fs.readdirSync(BUILD).filter(f => /^guide-.*\.html$/.test(f))
        .map(f => f.replace(/^guide-|\.html$/g, ''));
  if (!slugs.length) { console.error('nothing built, run build_guide.py first'); process.exit(1); }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-pdf-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + PORT, '--no-sandbox', '--blink-settings=preferredColorScheme=1',
    '--disable-gpu', '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: 'ignore' });

  let info = null;
  for (let i = 0; i < 60 && !info; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) info = await r.json();
    } catch { await sleep(250); }
  }
  if (!info) { console.error('Chrome did not start a debug port'); process.exit(1); }

  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && waiters.has(m.id)) {
      const w = waiters.get(m.id); waiters.delete(m.id);
      m.error ? w.reject(new Error(m.error.message)) : w.resolve(m.result);
    } else if (m.method && events.has(m.method)) {
      const r = events.get(m.method); events.delete(m.method); r(m.params);
    }
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  await call('Page.enable');
  await call('Runtime.enable');

  let bad = 0;
  for (const s of slugs) if (!await render(call, s)) bad++;

  chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}

  console.log('\n' + (slugs.length - bad) + '/' + slugs.length + ' written to ' + OUTDIR);
  if (bad) { console.error('fix the overflow above, those PDFs were NOT written'); process.exit(1); }
  process.exit(0);
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
})();
