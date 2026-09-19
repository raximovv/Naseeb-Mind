// Renders build/og.html to ../og.png at exactly 1200x630, the size every chat
// app and crawler expects.
//
//   python build_og.py && node make_og.js
//
// Shot at 2x and downscaled, because the card is mostly type: rendering straight
// at 1200 wide leaves the headline's serifs visibly chewed, and a preview card is
// seen at thumbnail size where soft type reads as a broken image.
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const { CHROME } = require('./paths');
const PORT = 9441, W = 1200, H = 630;
const SRC = 'file:///' + path.resolve(__dirname, 'build', 'og.html').replace(/\\/g, '/');
const DEST = path.resolve(__dirname, '..', 'og.png');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 1; const W8 = new Map(), E = new Map();
const send = (m, p = {}, sid) => new Promise((res, rej) => {
  const i = id++; W8.set(i, { res, rej });
  ws.send(JSON.stringify(sid ? { id: i, method: m, params: p, sessionId: sid } : { id: i, method: m, params: p }));
});
(async () => {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--no-sandbox', '--blink-settings=preferredColorScheme=1',
    '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--user-data-dir=' + prof, 'about:blank'], { stdio: 'ignore' });
  let info = null;
  for (let i = 0; i < 60 && !info; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) info = await r.json(); }
    catch { await sleep(250); }
  }
  ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', e => { const m = JSON.parse(e.data);
    if (m.id && W8.has(m.id)) { const w = W8.get(m.id); W8.delete(m.id); m.error ? w.rej(new Error(m.error.message)) : w.res(m.result); }
    else if (m.method && E.has(m.method)) { const r = E.get(m.method); E.delete(m.method); r(m.params); } });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (m, p) => send(m, p, sessionId);
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });
  const loaded = new Promise(r => E.set('Page.loadEventFired', r));
  await call('Page.navigate', { url: SRC });
  await Promise.race([loaded, sleep(15000)]);
  // The fonts are inlined, but font-display:block still needs a tick to swap in;
  // without this the card renders in Segoe UI often enough to matter.
  await call('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  await sleep(400);
  // deviceScaleFactor is already 2, so scale:1 here gives 2400x1260 -- asking for
  // scale:2 as well would quietly render at 4x and waste the time.
  const shot = await call('Page.captureScreenshot', {
    format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  const tmp = DEST + '.2x.png';
  fs.writeFileSync(tmp, Buffer.from(shot.data, 'base64'));
  ch.kill(); try { fs.rmSync(prof, { recursive: true, force: true }); } catch {}

  // Downscale here rather than leaving a stray 2x file for someone to finish by
  // hand -- that is exactly how og.png went stale the first time.
  const py = spawn('python', ['-c', [
    'from PIL import Image; import os, sys',
    'src, dst, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])',
    'Image.open(src).resize((w, h), Image.LANCZOS).convert("RGB").save(dst, "PNG", optimize=True)',
    'os.remove(src)',
    'print("og.png  %dx%d  %.0f KB" % (Image.open(dst).size + (os.path.getsize(dst) / 1024.0,)))'
  ].join('\n'), tmp, DEST, String(W), String(H)], { stdio: 'inherit' });
  py.on('exit', c => process.exit(c || 0));
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
})();
