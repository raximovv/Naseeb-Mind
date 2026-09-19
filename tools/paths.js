// Where the browser suites find Chrome, and the site they drive.
//
// These were hardcoded to one Windows machine in 26 files:
//   C:/Program Files/Google/Chrome/Application/chrome.exe
//   C:/Users/Asus/TestMind-site/
// so nobody else could run a single suite, and the mobile checks that matter
// most here (navcheck at 360px, lowend on a throttled phone) never ran anywhere
// but that laptop. The JS half of what tools/paths.py did for the generators.
//
//   CHROME=/path/to/chrome node navcheck.js     # override the browser
//   NM_SITE=/tmp/check      node audit.js       # override the site directory

const fs = require('fs');
const path = require('path');

// Repo root, from tools/'s own location. Trailing slash: callers concatenate.
const SITE_DIR = (process.env.NM_SITE || path.dirname(__dirname))
  .replace(/\\/g, '/').replace(/\/+$/, '') + '/';

// file:// URL for the suites that open a page with no server (anchor.js).
const SITE_URL = 'file:///' + SITE_DIR.replace(/^\/+/, '');

const CANDIDATES = [
  // Windows
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  // Linux
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
];

// CHROME wins; otherwise the first one actually on disk. Returns '' when none
// is found so a suite can say so plainly instead of failing to spawn.
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    try {
      for (const d of fs.readdirSync(root)) {
        for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell',
                           'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
          const p = path.join(root, d, rel);
          if (fs.existsSync(p)) return p;
        }
      }
    } catch (e) {}
  }
  for (const p of CANDIDATES) { try { if (fs.existsSync(p)) return p; } catch (e) {} }
  // Nothing found: hand back the path these files used to hardcode, so the
  // failure a suite reports is the same one it reported before.
  return CANDIDATES[0];
}

const CHROME = findChrome();

module.exports = { CHROME, SITE_DIR, SITE_URL, findChrome };
