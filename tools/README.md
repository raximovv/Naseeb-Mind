# Naseeb Mind: build & test tooling

Dev-only. None of this is served to visitors; the live site is just the static
files in the repo root. These scripts let site-wide edits stay reproducible and
let the app be verified before shipping.

## What generates what

The **hand-written source** files are: `test.html` (the whole test app, inline
styles + logic), `assets/site.css`, `assets/site.js`, `assets/characters.js`
(archetype data + SVG artwork), and `assets/fonts/`.

`og.png`, the card Telegram and WhatsApp show, **is generated**, by
`build_og.py` + `make_og.js`. It used to be hand-drawn with no source, and went
stale twice over without anyone noticing: it was still showing replaced character
art and the site's old teal palette months after the site went bronze, and was
only caught in a chat preview. Nothing on the site links to it, so nothing breaks
when it rots. **Re-run it whenever the characters or the palette change.**

## Where things live

Everything the browser loads but never visits as a URL is under `assets/`; the
repo root is the site's own URL space and nothing goes there that is not a page.

```
/                    the 20 pages GitHub Pages serves as URLs, + CNAME,
                     robots.txt, sitemap.xml, og.png (all root by protocol)
/assets/             site.css, site.js, characters.js, strings.js, life.js,
                     fonts/
/ru/  /en/           the same 16 pages, translated
/guides/             the ten take-away PDFs
/tools/              this folder: generators and tests, never served
```

Two things to know before moving anything else:

- **A page's filename is its public URL.** Moving `obraz-*.html` into a folder
  changes ten live addresses, so it is a decision, not a tidy-up.
- **`assets/site.css` reaches the fonts as `url('fonts/…')`**, relative to
  itself. That is why `fonts/` sits inside `assets/`, with the CSS in
  `assets/` and the fonts at the root, those URLs resolve to
  `assets/fonts/` and 404, and the page silently falls back to Segoe UI while
  still looking almost right.

The **static content pages are generated**: do not hand-edit them, edit the
generator and re-run:

- `build_pages.py` → the homepage, character/FAQ, legal and school pages
- `build_life_js.py` → `life.js`, the browser copy of `life_content.py`.
  test.html is a standalone client-side app and cannot read a Python module, so
  the Oilada / Maktabda / Munosabatlarda detail and the ranked directions are
  compiled to JS for the result screen. Percentages are baked in already
  computed, so the result screen and the archetype page can never show a
  different number. `build_archetypes.py` runs it, so it cannot go stale.
- `build_archetypes.py` → the ten `obraz-*.html` pages (reads `characters.js`
  and `strings.js` via Node, so Node must be on PATH). It imports
  `build_pages.py` from this folder for the shared head/nav/footer, and writes
  the sitemap last, from the slugs it just used.

```
python build_pages.py
python build_archetypes.py
```

They write to the repo root, found from `tools/`'s own location, so they run
from any checkout on any OS. `NM_SITE` overrides the destination.

## Three languages

Each generator writes **every page three times**: Uzbek to the repo root,
Russian to `ru/`, English to `en/`: 48 pages in all. Uzbek keeps the root so
that every link already shared in the wild keeps working, and page filenames are
identical in all three languages so the switcher can always offer the same page.

Where the words live:

- `i18n.py`: every string on the six static pages, in all three languages.
  The page *structure* exists once, as a template; the languages fill named
  slots. `python i18n.py` checks that no language is missing a key, and the
  build refuses to run if one is.
- `strings.js`: the Russian and English overlay for everything rendered at
  runtime (the ten characters, family names, `Kuchli tomoni:`-style labels).
  Uzbek is not in it: `characters.js` is the base, and a key missing from ru/en
  falls back to Uzbek rather than to a blank. Shipped to the browser *and* read
  by `build_archetypes.py`, so a page and the live site cannot disagree.

**`test.html` is translated into Uzbek, Russian and English**, including all six
challenge banks. The Russian and English instruments have not been separately
validated, so the site says that results across languages are not strictly
comparable.

To add a language: add it to `LANGS`/`DIR`/`UP` in `i18n.py`, add its block to
`S`, add a block to `STRINGS` in `strings.js`, and re-run both generators.

## The PDF guide

The take-away guide students receive (by email or through the Telegram bot) is
an A4 PDF built the same way, generated, never hand-made:

- `guide_content.py`: the **hand-written** long form, one entry per archetype
  key. This is the actual product; everything else is plumbing. Only `ES|A`
  (Ishonchli Doʻst) is written so far.
- `build_guide.py` → `tools/build/guide-<slug>.html`, a single self-contained
  file (fonts base64-inlined, artwork inlined SVG, no network at all). The name,
  the two lines, the strength/watch and the historical figure are pulled from
  `characters.js`, so the PDF cannot contradict the website.
- `make_pdf.js` → `guides/<slug>.pdf` via headless Chrome.

```
python build_guide.py "ES|A"
node   make_pdf.js  ishonchli-dost
```

Each A4 page is a **fixed box**, not flowing text: the layout is designed per
page. `make_pdf.js` measures every page first and refuses to write the PDF if
anything overflows its box, so a longer sentence can never silently get clipped.
If it reports an overflow, either shorten the text or loosen that page's
spacing; do not raise the page height.

It also skips writing a PDF whose content did not change. Chrome stamps a
timestamp into every PDF it makes, so without that check a rebuild would push
~7.5 MB of identical-but-different files through git each time.

**When writing new guide text, read the rule at the top of `guide_content.py`.**
Short version: if a sentence would be true of any student, cut it.

Tip: to check for drift without touching the repo, build into a temp dir with
`NM_SITE` and diff:

```
NM_SITE=/tmp/check python build_pages.py && NM_SITE=/tmp/check python build_archetypes.py
diff -r --exclude=tools . /tmp/check
```

## Running the tests

Real Chrome is driven headlessly via `puppeteer-core`. It expects Chrome at
`C:/Program Files/Google/Chrome/Application/chrome.exe` (edit the `CHROME`
constant in each file if yours differs).

**Two suites need no `npm install` and no dependencies at all**, useful because
`npm` is currently broken on the dev machine (the Node install at
`C:/Informatika/` has no `node_modules/npm`, so npm cannot find itself):

```
node i18n_test.js       # 27: language resolution and the ru/en overlay, in a bare VM
node navcheck.js        # 48 pages x 3 widths, nav layout, switcher, overflow,
                        #      and that the character bands render per language
```

`navcheck.js` drives Chrome over the DevTools protocol using Node 24's built-in
`WebSocket`, so it works while `puppeteer-core` cannot be installed. It asserts
that brand + switcher + CTA stay on **one** row at 360px: they do not fit by
default, and letting the CTA wrap made the sticky header 153px tall, a quarter
of a small phone screen.

The rest need puppeteer:

```
npm install
# most suites hit a local server, start it from the REPO ROOT in another shell:
#   python -m http.server 8765
npm run test:e2e        # 45 checks: full flow, scoring, archetypes, restart
npm run test:keyboard   # 27: arrow keys, the removed 1-5 shortcut, step bar, copy-share
npm run test:capture    # 19: email capture: sent once, no name/age/answers, honest failures
npm run test:autosave   # 9:  answers saved anonymously with a separate id
npm run test:anchor     # 13: the next question lands under the pointer (0px drift)
npm run test:hub        # six-challenge UI, translations, retake and account-resume rules
npm run audit           # 18 pages × 3 widths, horizontal + vertical overflow
node retest.js          # 14: «Oʻshanda va hozir» compares against the OLD result
node lowend.js          # 10: cheap Android: 4x slower CPU, slow 4G, 360px
```

`lowend.js` is the one to run before a school pilot: 89% of Uzbek internet users
are on a phone, and desktop Chrome at a 390px viewport is not the same test:
it has no CPU limit, no latency and no data cost.

`anchor.js` opens the page over `file://` and needs no server; the rest use
`http://localhost:8765/`.

## Changing the domain

The site is served from `personality.naseebedu.com`, a subdomain pointed at
GitHub Pages by a CNAME record. The `CNAME` file in the repo root is what tells
Pages to answer on that name, **do not delete it**, or the domain stops
resolving to the site.

Four places, and the last two are easy to miss because `test.html` is
hand-written rather than generated:

1. `SITE` in `build_pages.py`: canonical, hreflang, og:url, sitemap, robots
2. `SITE_HOST` in `test.html`: the share card footer and the share text
3. the `og:image` and `canonical` tags in `test.html`'s own `<head>`
4. the `CNAME` file in the repo root

Then re-run both generators, or 60-odd pages keep advertising the old host to
search engines. To confirm nothing was left behind:

```
grep -rn "github\.io" --include=*.html --include=*.xml --include=*.txt . \
  | grep -v '^\./tools/'
```

All internal links are relative, so the move from the `/TestMind` project path
to a domain root needed no other change.
