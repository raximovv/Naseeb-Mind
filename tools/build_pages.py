# -*- coding: utf-8 -*-
u"""Generates the static Naseeb Mind pages, in every language, so the nav and footer
can never drift, between pages or between languages.

Uzbek is written to the repo root, Russian to ru/ and English to en/, so every
link already shared in the wild keeps working. Page filenames are identical in
all three languages; only the prose differs (see i18n.py).

test.html and everything in assets/ are shared, single-copy files at the root.
Pages in ru/ and en/ reach them with ../, see localize().
"""
import hashlib, io, json, os, re, subprocess

import i18n
from i18n import S, LANGS, DIR, UP, HTML_LANG, OG_LOCALE, LANG_SHORT, LANG_FULL

OUT = 'C:/Users/Asus/TestMind-site/'


_SCENE_RASTERS = []


def scene_rasters():
    u"""Which raster characters does the JS-built hero scene actually draw?

    Asked of site.js rather than listed here. The cast lives in buildScene() and
    only some of the ten are illustrated, so any list kept on this side would be
    a second copy free to drift, and a preload for a file the page never
    requests is a wasted download plus a console warning, while a missing one
    puts the hole back in the scene.
    """
    js = u'''
      const fs = require('fs'), vm = require('vm');
      // site.js calls mountPage() as it loads, so the stub has to absorb that
      // pass without mounting anything: every lookup misses, so each builder is
      // skipped and we invoke the one we want ourselves.
      const s = { document: {
        documentElement: { getAttribute: () => 'uz' },
        getElementById: () => null, querySelector: () => null,
        querySelectorAll: () => [], addEventListener: () => {} } };
      s.window = s; s.addEventListener = () => {};
      s.localStorage = { getItem: () => null, setItem: () => {} };
      vm.createContext(s);
      for (const f of ['assets/characters.js', 'assets/strings.js', 'assets/site.js'])
        vm.runInContext(fs.readFileSync(%s + f, 'utf8'), s);
      const out = [];
      const svg = s.buildScene();
      const re = /href="([^"]+)"/g;
      let m; while ((m = re.exec(svg))) out.push(m[1]);
      console.log(JSON.stringify(out));
    ''' % json.dumps(OUT)
    if _SCENE_RASTERS:                    # same for all 18 page/language builds
        return _SCENE_RASTERS
    found = json.loads(subprocess.check_output(['node', '-e', js]).decode('utf-8'))
    # Preserve first-seen order so the emitted <head> is stable between builds.
    for p in found:
        if p not in _SCENE_RASTERS:
            _SCENE_RASTERS.append(p)
    return _SCENE_RASTERS

# All three come out of tools/build_logo.py, which cuts them from the delivered
# artwork. The tab icon is the mark in paper on a navy tile rather than the bare
# mark: a thin navy bird on transparency is a smudge at 16px, which is the size
# a browser tab actually uses. favicon.ico sits in the repo root as well, for
# the request browsers make on their own before they have read this <head>.
FAVICON = 'assets/ui/icon.png'
TOUCH_ICON = 'assets/ui/apple-touch-icon.png'

SITE = 'https://personality.naseebedu.com'   # the CNAME file in the repo root must agree

# The parent platform. Naseeb Mind is a subdomain of it, not a separate product.
NASEEB = 'https://www.naseebedu.com/'
BACK_ARROW = (u'<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">'
              u'<path d="M10 3 L5 8 l5 5" fill="none" stroke="currentColor" '
              u'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>')

EMAIL = 'support@naseebedu.com'

# The four counters on the home page. Counts, not decoration: they are read off
# the response Sheet and typed in here, which is why they are one obvious tuple
# rather than four numbers buried in the template. Re-run build_pages.py after
# changing them.
#
# FACTS[0] is "this month" and is the one that rots -- it stops being true on the
# 1st. It rots a month at a time rather than overnight, which is the whole
# reason the tile that used to say "completed today" was relabelled, but it
# still has to be refreshed from the Sheet whenever the site is rebuilt.
FACTS_UPDATED = '2026-08-02'
FACTS = ('100+', '500+', '15+')

# Files that exist once, at the root, and are NOT translated. A page in ru/ or
# en/ has to climb out of its folder to reach them; everything else stays a
# plain relative link, because the translated pages sit beside each other.
# Kept as an explicit list rather than a clever rule so that adding a shared
# asset is a deliberate act.
# ---------- Cache busting ----------
# Cloudflare serves assets with max-age=14400 while GitHub Pages revalidates the
# HTML far more often, so a student who visited before a release gets NEW markup
# against a FOUR-HOUR-OLD stylesheet. That is not a hypothetical: the header logo
# rendered at its full 162x254 and "Kirish" appeared twice, because the pages had
# .brandmark and .navlogin-mobile but the cached CSS did not. Stamping the file's
# own content hash into the URL makes a changed file a different URL, so the
# browser cannot serve the old one. Unchanged files keep their hash and stay cached.
_HASHES = {}

def _hash(rel):
    if rel not in _HASHES:
        path = os.path.join(OUT, rel.replace('/', os.sep))
        with open(path, 'rb') as fh:
            _HASHES[rel] = hashlib.md5(fh.read()).hexdigest()[:8]
    return _HASHES[rel]


def stamp(rel):
    u"""assets/site.css -> assets/site.css?v=<8 hex of its contents>."""
    return '%s?v=%s' % (rel, _hash(rel))


# test.html is hand-written rather than generated, but its scripts go stale the
# same way the stylesheet did, so the build restamps them in place. Idempotent:
# any existing ?v= is stripped before the current hash is written back.
def stamp_test_html():
    path = os.path.join(OUT, 'test.html')
    with io.open(path, encoding='utf-8') as fh:
        html = fh.read()
    before = html

    def one(m):
        return '<script src="%s"></script>' % stamp(m.group(1))
    html = re.sub(r'<script src="(assets/[^"?]+)(?:\?v=[0-9a-f]+)?"></script>', one, html)

    # The two deferred bundles are named in a JS array, not a tag.
    def arr(m):
        return "'%s'" % stamp(m.group(1))
    html = re.sub(r"'(assets/(?:careers-data|recommend|matrix-art)\.js)(?:\?v=[0-9a-f]+)?'", arr, html)

    # life-<lang>.js is built from a variable, so the hash cannot be per-file;
    # all three are rebuilt together, so uz's hash stands for the set.
    html = re.sub(r"'assets/life-'(\s*\+\s*TLANG\s*\+\s*)'\.js(?:\?v=[0-9a-f]+)?'",
                  lambda m: "'assets/life-'%s'.js?v=%s'" % (m.group(1), _hash('assets/life-uz.js')),
                  html)

    if html != before:
        with io.open(path, 'w', encoding='utf-8', newline='') as fh:
            fh.write(html)
    print('%-8s test.html script tags' % ('stamped' if html != before else 'ok'))


ROOT_ONLY = ['test.html', 'assets/', 'guides/']
_ROOT_RE = re.compile(r'(href|src)="(%s)' % '|'.join(
    re.escape(f) for f in ROOT_ONLY))


# Languages the test itself has been translated into. A language listed here
# gets ?lang= appended to the shared test link, so a student who has been
# reading in one language does not land on the test in another.
TEST_LANG_PARAM = {'ru': 'ru', 'en': 'en'}


def localize(html, lang):
    u"""Point the shared root files at ../ for the non-root languages.

    test.html is one shared file serving every language, so the Russian pages
    also have to say WHICH language they want: without ?lang=ru a student who
    has been reading Russian all the way through lands on an Uzbek test.
    """
    up = UP[lang]
    if not up:
        return html
    out = _ROOT_RE.sub(lambda m: '%s="%s%s' % (m.group(1), up, m.group(2)), html)
    if lang in TEST_LANG_PARAM:
        out = out.replace('="%stest.html"' % up,
                          '="%stest.html?lang=%s"' % (up, TEST_LANG_PARAM[lang]))
    return out


def url_for(lang, fname):
    u"""Absolute URL of one page in one language."""
    return u'%s/%s%s' % (SITE, DIR[lang], '' if fname == 'index.html' else fname)


def head(lang, title, desc, fname, extra=u''):
    u"""`fname` produces the canonical URL and the hreflang set, which is what
    stops the three languages from competing with each other in search results:
    each says "I am the <lang> version of this page, here are my siblings"."""
    alts = u''.join(
        u'\n<link rel="alternate" hreflang="%s" href="%s">' % (HTML_LANG[l], url_for(l, fname))
        for l in LANGS)
    alts += u'\n<link rel="alternate" hreflang="x-default" href="%s">' % url_for('uz', fname)
    return u"""<!doctype html>
<html lang="%s">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="%s">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Naseeb Mind">
<meta property="og:locale" content="%s">
<meta property="og:image" content="%s/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="%s">
<link rel="apple-touch-icon" href="%s">
<link rel="canonical" href="%s">%s
<script>
// Before anything is painted. An explicit choice is stamped here; no choice
// means no stamp, which is what leaves prefers-color-scheme in charge.
(function(){try{var v=localStorage.getItem('naseebmind_theme_v1');
if(v==='dark'||v==='light')document.documentElement.setAttribute('data-theme',v);}catch(e){}})();
</script>
<link rel="preload" href="assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="%s">%s
</head>
<body>
""" % (HTML_LANG[lang], title, desc, title, desc, OG_LOCALE[lang], SITE, FAVICON, TOUCH_ICON,
       url_for(lang, fname), alts, stamp('assets/site.css'), extra)


def langsw(lang, fname):
    u"""UZ · RU · EN, each pointing at the same page in the other language.

    Deliberately plain links, and deliberately no automatic redirect based on
    the browser's Accept-Language: auto-switching breaks shared links and traps
    people in a language they did not choose."""
    out = u''
    for l in LANGS:
        if l == lang:
            out += u'<span aria-current="true">%s</span>' % LANG_SHORT[l]
        else:
            out += u'<a href="%s%s%s" hreflang="%s" lang="%s" title="%s">%s</a>' % (
                UP[lang], DIR[l], fname, HTML_LANG[l], HTML_LANG[l],
                LANG_FULL[l], LANG_SHORT[l])
    return u'<div class="langsw" role="group" aria-label="%s">%s</div>' % (
        S[lang]['nav.langlabel'], out)


# Drawn into the page rather than injected by script, so the pill is complete
# on first paint and stays complete with JavaScript switched off. Must match
# PERSON in assets/acct-nav.js, which repaints this same slot.
PERSON_ICON = (u'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
               u'<circle cx="12" cy="8.2" r="3.5"/>'
               u'<path d="M5 19.7c.5-3.9 3.4-5.9 7-5.9s6.5 2 7 5.9z"/></svg>')

def amp(url):
    u"""A bare & in an href only works because none of ours spells an entity.
    Escaping it means nobody has to know that."""
    return url.replace(u'&', u'&amp;')


def nav(lang, fname, active=None):
    t = S[lang]
    test_href = UP[lang] + 'test.html' + ('' if lang == 'uz' else '?lang=%s' % lang)
    results_href = amp(test_href + ('?' if lang == 'uz' else '&') + 'view=results')
    items = [(results_href, t['nav.results']), ('index.html', t['nav.home']), ('obrazlar.html', t['nav.types']),
             ('test.html', t['nav.test']), ('savollar.html', t['nav.faq'])]
    active = active or fname
    links = ''
    for href, label in items:
        cur = ' aria-current="page"' if href == active else ''
        links += u'\n    <a href="%s"%s>%s</a>' % (href, cur, label)
    # The nav button IS the account control now, so the separate "Kirish"
    # link that used to sit beside it has gone: it was the same word twice.
    test_href = UP[lang] + 'test.html' + ('' if lang == 'uz' else '?lang=%s' % lang)
    login_href = amp(test_href + ('?' if lang == 'uz' else '&') + 'auth=signin')
    # The two menu items that lead somewhere else. assets/acct-nav.js reads them
    # off the wrapper, so the language belongs here with the rest of the routing
    # rather than being worked out again in JavaScript.
    def view_href(view):
        return amp(test_href + ('?' if lang == 'uz' else '&') + 'view=' + view)
    # The way back to the parent platform sits left of the brand, inside the
    # nav, where a back control is looked for. The nav row is full at 360px, so
    # below 820px the label is dropped and only the chevron stays -- the
    # accessible name is on the hidden span either way, so the icon-only version
    # is not a nameless button.
    return u"""<nav class="nav"><div class="wrap navin">
  <a class="navback" href="%(naseeb)s">%(arrow)s<span class="backtx">Naseeb Edu</span>
    <b class="vh">%(back)s</b></a>
  <a class="brand" href="index.html">
    <img class="brandmark" src="assets/ui/logo.png" alt="">
    <span>Naseeb <b>Mind</b></span>
  </a>
  <div class="navlinks">%(links)s
  </div>
  %(langsw)s
  <button class="themesw" type="button" data-theme-toggle data-lang="%(lang)s" aria-pressed="false" aria-label="Tungi rejimga oʻtish"></button>
  <div class="navacct" data-acct data-lang="%(lang)s"
       data-login-href="%(login_href)s"
       data-results-href="%(results_href)s"
       data-resume-href="%(resume_href)s">
    <a class="acctbtn" href="%(login_href)s"><span class="acctav" aria-hidden="true">%(person)s</span><span class="acctnm">%(login)s</span></a>
  </div>
</div></nav>
""" % {'naseeb': NASEEB, 'arrow': BACK_ARROW, 'back': t['nav.back'],
       'links': links, 'langsw': langsw(lang, fname), 'login_href': login_href,
       'lang': lang, 'person': PERSON_ICON,
       'login': t['nav.login'],
       'results_href': view_href('results'), 'resume_href': view_href('resume')}


SOCIAL = u'<div class="socrow"><a class="soc" href="https://t.me/naseeb_edu" target="_blank" rel="noopener noreferrer" title="Telegram" aria-label="Naseeb Edu — Telegram"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path fill="#fff" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg></a><a class="soc" href="https://www.instagram.com/naseeb_edu/" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Naseeb Edu — Instagram"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4.6" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="#fff" stroke-width="1.9"/><circle cx="16.6" cy="7.4" r="1.15" fill="#fff"/></svg></a><a class="soc" href="https://www.youtube.com/@naseeb_edu" target="_blank" rel="noopener noreferrer" title="YouTube" aria-label="Naseeb Edu — YouTube"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path fill="#fff" d="M21.58 8.2a2.47 2.47 0 0 0-1.74-1.75C18.3 6.03 12 6.03 12 6.03s-6.3 0-7.84.42A2.47 2.47 0 0 0 2.42 8.2 25.9 25.9 0 0 0 2 12a25.9 25.9 0 0 0 .42 3.8 2.47 2.47 0 0 0 1.74 1.75c1.54.42 7.84.42 7.84.42s6.3 0 7.84-.42a2.47 2.47 0 0 0 1.74-1.75A25.9 25.9 0 0 0 22 12a25.9 25.9 0 0 0-.42-3.8z"/><path fill="var(--lazur)" d="M10.05 14.85l5.2-2.85-5.2-2.85z"/></svg></a><a class="soc" href="https://linkedin.com/company/naseeb-edu" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="Naseeb Edu — LinkedIn"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><circle cx="5" cy="5" r="2" fill="#fff"/><path fill="#fff" d="M3.2 8.5h3.6V21H3.2zM9 8.5h3.5v1.7c.8-1.3 2-2 3.7-2 3.4 0 4.8 2.1 4.8 5.7V21h-3.6v-6.3c0-1.9-.4-3.2-2.2-3.2-1.9 0-2.6 1.3-2.6 3.2V21H9z"/></svg></a></div>'


def footer(lang):
    t = S[lang]
    # In ru/en the test link leads somewhere Uzbek-only; say so next to the link
    # rather than letting the reader discover it after the click.
    # The footer used to carry "(the test is in Uzbek only)" next to the test
    # link on the ru/ and en/ pages. The test exists in all three languages
    # now, so there is nothing left to warn about.
    note = u''
    return u"""<footer class="foot"><div class="wrap">
  <div class="footgrid">
    <div class="footcol"><h2>Naseeb Mind</h2><ul>
      <li><a href="index.html">%(home)s</a></li>
      <li><a href="obrazlar.html">%(types10)s</a></li>
    </ul></div>
    <div class="footcol"><h2>%(test)s</h2><ul>
      <li><a href="test.html" data-cta>%(cta)s</a>%(note)s</li>
      <li><a href="savollar.html">%(faqlong)s</a></li>
    </ul></div>
    <div class="footcol"><h2>%(about)s</h2><ul>
      <li><a href="privacy.html">%(privacy)s</a></li>
      <li><a href="maktablar.html">%(schools)s</a></li>
    </ul></div>
    <div class="footcol"><h2>%(contact)s</h2><ul>
      <li><a href="mailto:%(email)s">%(email)s</a></li>
    </ul>
      %(social)s</div>
  </div>
  <div class="footbar">
    <span>© 2026 Naseeb Mind</span>
  </div>
  <nav class="legalnav" aria-label="%(legal_label)s">
    <a href="terms.html">%(terms)s</a>
    <a href="privacy.html">%(privacy)s</a>
  </nav>
</div></footer>
""" % {'home': t['nav.home'], 'types10': t['foot.types10'],
       'test': t['foot.test'], 'cta': t['nav.cta'], 'note': note,
       'faqlong': t['foot.faqlong'], 'about': t['foot.about'],
       'privacy': t['foot.privacy'], 'terms': t['foot.terms'],
       'accessibility': t['foot.accessibility'], 'legal_label': t['foot.legal_label'],
       'schools': t['foot.schools'], 'contact': t['foot.contact'], 'naseeb': NASEEB,
       'email': EMAIL, 'social': SOCIAL}


def scripts():
    # account.js before header.js before site.js: the control needs the session
    # to know which of its two faces to paint, and site.js mounts it.
    return SCRIPTS % (stamp('assets/characters.js'), stamp('assets/strings.js'),
                      stamp('assets/account.js'), stamp('assets/header.js'),
                      stamp('assets/site.js'))


SCRIPTS = u"""<script src="%s"></script>
<script src="%s"></script>
<script src="%s"></script>
<script src="%s"></script>
<script src="%s"></script>
</body>
</html>
"""


def close(lang):
    t = S[lang]
    return u"""<section class="close">
  <h2>%s</h2>
  <p>%s</p>
  <a class="btn big" href="test.html" data-cta>%s</a>
</section>
""" % (t['close.h2'], t['close.p'], t['nav.cta'])


# ---------------------------------------------------------------- home
HOME = u"""<header class="hero" id="top">
  <!-- class="center", not an inline text-align. The class also carries
       `.center .lead{margin-left:auto;margin-right:auto}`, and without it the
       lead's own max-width:640px sat flush left inside this 760px box: the text
       centred within a block that was itself 60px left of centre, so it read as
       misaligned against the h1 and the button above and below it. -->
  <div class="center" style="padding:52px 20px 72px;max-width:760px;margin:0 auto">
    <h1>%(home.h1)s</h1>
    <p class="lead" style="font-size:clamp(16px,2.4vw,19px);margin-bottom:26px">
      %(home.lead)s</p>
    <a class="btn big" href="test.html" data-cta>%(nav.cta)s</a>
  </div>
  <div class="scene" id="scene" aria-hidden="true"></div>
</header>

<section class="alt">
  <div class="wrap">
    <div class="center"><h2>%(home.num.h2)s</h2>
      <p class="lead">%(home.num.lead)s</p></div>
    <div class="facts">
      <div class="fact"><div class="factn">%(factn1)s</div><div class="factl">%(home.fact1)s</div></div>
      <div class="fact"><div class="factn">%(factn2)s</div><div class="factl">%(home.fact2)s</div></div>
      <div class="fact"><div class="factn">%(factn3)s</div><div class="factl">%(home.fact3)s</div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="panel">
      <div class="ptext">
        <span class="ptag">%(home.p1.tag)s</span>
        <h2>%(home.p1.h2)s</h2>
        <p>%(home.p1.p)s</p>
        <a class="btn" href="test.html" data-cta>%(nav.cta)s</a>
      </div>
      <div class="part" id="vg-result"></div>
    </div>

    <div class="panel flip">
      <div class="ptext">
        <span class="ptag">%(home.p2.tag)s</span>
        <h2>%(home.p2.h2)s</h2>
        <p>%(home.p2.p)s</p>
        <a class="btn ghost" href="obrazlar.html">%(home.p2.btn)s</a>
      </div>
      <div class="part" id="vg-others"></div>
    </div>

    <div class="panel">
      <div class="ptext">
        <span class="ptag">%(home.p3.tag)s</span>
        <h2>%(home.p3.h2)s</h2>
        <p>%(home.p3.p)s</p>
        <a class="btn ghost" href="test.html" data-cta>%(home.p3.btn)s</a>
      </div>
      <div class="part" id="vg-future"></div>
    </div>
  </div>
</section>

"""

# ---------------------------------------------------------------- obrazlar
OBRAZLAR = u"""<header class="phead"><div class="wrap">
  <h1>%(types.h1)s</h1>
  <p class="lead">%(types.lead)s</p>
</div></header>

<div id="bands"></div>
"""

# ---------------------------------------------------------------- how it works
QANDAY = u"""<header class="phead"><div class="wrap">
  <h1>%(how.h1)s</h1>
  <p class="lead">%(how.lead)s</p>
</div></header>

<section><div class="wrap">
  <h2>%(how.steps.h2)s</h2>
  <p class="lead">%(how.steps.lead)s</p>
  <div class="steps">
    <div class="step"><div class="stepn">1</div>
      <h3>%(how.s1.h3)s</h3>
      <p>%(how.s1.p)s</p></div>
    <div class="step"><div class="stepn">2</div>
      <h3>%(how.s2.h3)s</h3>
      <p>%(how.s2.p)s</p></div>
    <div class="step"><div class="stepn">3</div>
      <h3>%(how.s3.h3)s</h3>
      <p>%(how.s3.p)s</p></div>
  </div>
</div></section>

<section class="alt" id="model"><div class="wrap">
  <h2>%(how.model.h2)s</h2>
  <p class="lead">%(how.model.lead)s</p>
  <div class="why">
    <div class="wcard"><h3>%(how.m1.h3)s</h3><p>%(how.m1.p)s</p></div>
    <div class="wcard"><h3>%(how.m2.h3)s</h3><p>%(how.m2.p)s</p></div>
    <div class="wcard"><h3>%(how.m3.h3)s</h3><p>%(how.m3.p)s</p></div>
    <div class="wcard"><h3>%(how.m4.h3)s</h3><p>%(how.m4.p)s</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <h2>%(how.data.h2)s</h2>
  <p class="lead">%(how.data.lead)s</p>
  <div class="why">
    <div class="wcard"><h3>%(how.d1.h3)s</h3><p>%(how.d1.p)s</p></div>
    <div class="wcard"><h3>%(how.d2.h3)s</h3><p>%(how.d2.p)s</p></div>
    <div class="wcard"><h3>%(how.d3.h3)s</h3><p>%(how.d3.p)s</p></div>
    <div class="wcard"><h3>%(how.d4.h3)s</h3>
      <p><a href="privacy.html">%(how.d4.link)s</a>%(how.d4.after)s</p></div>
  </div>
</div></section>
"""

# ---------------------------------------------------------------- faq
SAVOLLAR = u"""<header class="phead"><div class="wrap">
  <h1>%(faq.h1)s</h1>
  <p class="lead">%(faq.lead)s</p>
</div></header>

<section><div class="wrap"><div class="faq">
  <details><summary>%(faq.q1)s</summary><p>%(faq.a1)s</p></details>
  <details><summary>%(faq.q2)s</summary><p>%(faq.a2)s</p></details>
  <details><summary>%(faq.q3)s</summary><p>%(faq.a3)s</p></details>
  <details><summary>%(faq.q4)s</summary><p>%(faq.a4)s</p></details>
  <details><summary>%(faq.q5)s</summary><p>%(faq.a5)s</p></details>
  <details><summary>%(faq.q6)s</summary><p>%(faq.a6)s</p></details>
  <details><summary>%(faq.q7)s</summary><p>%(faq.a7)s</p></details>
  <details><summary>%(faq.q8)s</summary><p>%(faq.a8)s</p></details>
  <details><summary>%(faq.q9)s</summary><p>%(faq.a9)s</p></details>
</div></div></section>
"""

# ---------------------------------------------------------------- privacy
PRIVACY = u"""<header class="phead"><div class="wrap">
  <h1>%(priv.h1)s</h1>
  <p class="lead">%(priv.lead)s</p>
</div></header>

<section><div class="wrap" style="max-width:780px">
  <p class="legaldate">%(priv.updated)s</p>
  <h2>%(priv.h.stored)s</h2>
  <p>%(priv.p.stored)s</p>

  <h2>%(priv.h.demographic)s</h2>
  <p>%(priv.p.demographic)s</p>

  <h2>%(priv.h.agefig)s</h2>
  <p>%(priv.p.agefig)s</p>

  <h2>%(priv.h.never)s</h2>
  <p>%(priv.p.never)s</p>

  <h2>%(priv.h.answers)s</h2>
  <p>%(priv.p.answers1)s</p>
  <p>%(priv.p.answers2)s</p>
  <p>%(priv.p.answers3)s</p>

  <h2>%(priv.h.email)s</h2>
  <p>%(priv.p.email1)s</p>
  <p>%(priv.p.email2)s</p>
  <p>%(priv.p.email3)s</p>

  <h2>%(priv.h.device)s</h2>
  <p>%(priv.p.device)s</p>

  <h2>%(priv.h.third)s</h2>
  <p>%(priv.p.third)s</p>

  <h2>%(priv.h.cookies)s</h2>
  <p>%(priv.p.cookies)s</p>

  <h2>%(priv.h.providers)s</h2>
  <p>%(priv.p.providers)s</p>

  <h2>%(priv.h.retention)s</h2>
  <p>%(priv.p.retention)s</p>

  <h2>%(priv.h.rights)s</h2>
  <p>%(priv.p.rights)s</p>

  <h2>%(priv.h.changes)s</h2>
  <p>%(priv.p.changes)s</p>

  <h2>%(priv.h.result)s</h2>
  <p>%(priv.p.result)s</p>

  <h2>%(priv.h.age)s</h2>
  <p>%(priv.p.age)s</p>

  <h2>%(priv.h.contact)s</h2>
  <p>%(priv.p.contact)s
     <a href="mailto:%(email)s">%(email)s</a>.</p>
</div></section>
"""

# ---------------------------------------------------------------- terms
TERMS = u"""<header class="phead"><div class="wrap">
  <h1>%(terms.h1)s</h1>
  <p class="lead">%(terms.lead)s</p>
</div></header>

<section><div class="wrap" style="max-width:780px">
  <p class="legaldate">%(terms.updated)s</p>
  <h2>%(terms.h.about)s</h2><p>%(terms.p.about)s</p>
  <h2>%(terms.h.eligibility)s</h2><p>%(terms.p.eligibility)s</p>
  <h2>%(terms.h.account)s</h2><p>%(terms.p.account)s</p>
  <h2>%(terms.h.results)s</h2><p>%(terms.p.results)s</p>
  <h2>%(terms.h.use)s</h2><p>%(terms.p.use)s</p>
  <h2>%(terms.h.content)s</h2><p>%(terms.p.content)s</p>
  <h2>%(terms.h.availability)s</h2><p>%(terms.p.availability)s</p>
  <h2>%(terms.h.contact)s</h2><p>%(terms.p.contact)s <a href="mailto:%(email)s">%(email)s</a>.</p>
</div></section>
"""

# ---------------------------------------------------------------- accessibility
ACCESSIBILITY = u"""<header class="phead"><div class="wrap">
  <h1>%(access.h1)s</h1>
  <p class="lead">%(access.lead)s</p>
</div></header>

<section><div class="wrap" style="max-width:780px">
  <p class="legaldate">%(access.updated)s</p>
  <h2>%(access.h.commitment)s</h2><p>%(access.p.commitment)s</p>
  <h2>%(access.h.current)s</h2><p>%(access.p.current)s</p>
  <h2>%(access.h.keyboard)s</h2><p>%(access.p.keyboard)s</p>
  <h2>%(access.h.limits)s</h2><p>%(access.p.limits)s</p>
  <h2>%(access.h.feedback)s</h2><p>%(access.p.feedback)s <a href="mailto:%(email)s">%(email)s</a>.</p>
</div></section>
"""

# ---------------------------------------------------------------- schools / parents
MAKTABLAR = u"""<header class="phead"><div class="wrap">
  <h1>%(sch.h1)s</h1>
  <p class="lead">%(sch.lead)s</p>
</div></header>

<section><div class="wrap" style="max-width:820px">
  <h2>%(sch.h.what)s</h2>
  <p>%(sch.p.what)s</p>

  <h2>%(sch.h.notwhat)s</h2>
  <p>%(sch.p.notwhat)s</p>

  <h2>%(sch.h.limits)s</h2>
  <div class="why" style="margin-top:14px">
    <div class="wcard"><h3>%(sch.l1.h3)s</h3><p>%(sch.l1.p)s</p></div>
    <div class="wcard"><h3>%(sch.l2.h3)s</h3><p>%(sch.l2.p)s</p></div>
    <div class="wcard"><h3>%(sch.l3.h3)s</h3><p>%(sch.l3.p)s</p></div>
    <div class="wcard"><h3>%(sch.l4.h3)s</h3><p>%(sch.l4.p)s</p></div>
  </div>

  <h2>%(sch.h.howto)s</h2>
  <div class="steps" style="margin-top:14px">
    <div class="step"><div class="stepn">1</div>
      <h3>%(sch.t1.h3)s</h3><p>%(sch.t1.p)s</p></div>
    <div class="step"><div class="stepn">2</div>
      <h3>%(sch.t2.h3)s</h3><p>%(sch.t2.p)s</p></div>
    <div class="step"><div class="stepn">3</div>
      <h3>%(sch.t3.h3)s</h3><p>%(sch.t3.p)s</p></div>
  </div>

  <h2>%(sch.h.dont)s</h2>
  <div class="why" style="margin-top:14px">
    <div class="wcard"><h3>%(sch.d1.h3)s</h3><p>%(sch.d1.p)s</p></div>
    <div class="wcard"><h3>%(sch.d2.h3)s</h3><p>%(sch.d2.p)s</p></div>
    <div class="wcard"><h3>%(sch.d3.h3)s</h3><p>%(sch.d3.p)s</p></div>
    <div class="wcard"><h3>%(sch.d4.h3)s</h3><p>%(sch.d4.p)s</p></div>
  </div>

  <h2>%(sch.h.data)s</h2>
  <p>%(sch.p.data1)s</p>
  <p>%(sch.p.data2)s</p>
  <p>%(sch.p.data3)s</p>
  <p>%(sch.p.data4)s</p>

  <h2>%(sch.h.contact)s</h2>
  <p>%(sch.p.contact)s
     <a href="mailto:%(email)s">%(email)s</a>.
     %(sch.p.contact2)s</p>
</div></section>
"""

# fname -> (template, title key, desc key, appends the closing CTA)
PAGES = [
    ('index.html',           HOME,      'home.title',  'home.desc',  True),
    ('obrazlar.html',        OBRAZLAR,  'types.title', 'types.desc', True),
    ('savollar.html',        SAVOLLAR,  'faq.title',   'faq.desc',   True),
    ('privacy.html',         PRIVACY,   'priv.title',  'priv.desc',  False),
    ('terms.html',           TERMS,     'terms.title', 'terms.desc', False),
    ('accessibility.html',   ACCESSIBILITY, 'access.title', 'access.desc', False),
    ('maktablar.html',       MAKTABLAR, 'sch.title',   'sch.desc',   False),
]


def jsonld(obj):
    return u'\n<script type="application/ld+json">%s</script>' % json.dumps(
        obj, ensure_ascii=False, separators=(',', ':'))


# Only two pages carry structured data, and only where it is honestly true: the
# site itself, and the FAQ page (which is genuinely a list of questions and
# answers). Marking anything else up would be decoration, not description.
def site_ld(lang):
    return jsonld({
        '@context': 'https://schema.org', '@type': 'WebSite',
        'name': 'Naseeb Mind', 'url': url_for(lang, 'index.html'),
        'inLanguage': HTML_LANG[lang], 'description': S[lang]['home.desc'],
    })


def faq_ld(html):
    u"""Read the FAQ entries back out of the page we just built, so the structured
    data can never describe questions the page does not actually contain."""
    pairs = re.findall(r'<summary>(.*?)</summary>(.*?)</details>', html, re.S)
    strip = lambda s: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', s)).strip()
    return jsonld({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        'mainEntity': [{
            '@type': 'Question', 'name': strip(q),
            'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)},
        } for q, a in pairs],
    })


def fill(tpl, lang):
    u"""%(key)s substitution straight from the language's string table.

    A key that is missing raises KeyError and stops the build, which is the
    point: a half-translated page should never reach the repo.
    """
    d = dict(S[lang])
    d['email'] = EMAIL
    # Numerals are the same in all three languages; only the labels are translated.
    for i, n in enumerate(FACTS, 1):
        d['factn%d' % i] = n
    return tpl % d


def build_page(lang, fname, tpl, tkey, dkey, with_close):
    t = S[lang]
    body = fill(tpl, lang)
    if with_close:
        body += close(lang)
    extra = u''
    if fname == 'index.html':
        # The scene is mounted by JS, so without this the browser cannot learn the
        # artwork exists until site.js has downloaded, parsed and run, the figure
        # then landed about two seconds after its neighbours and visibly popped in.
        extra = u''.join(
            u'\n<link rel="preload" href="%s" as="image" type="image/webp">' % p
            for p in scene_rasters()) + site_ld(lang)
    elif fname == 'savollar.html':
        extra = faq_ld(body)
    html = head(lang, t[tkey], t[dkey], fname, extra) \
         + nav(lang, fname) + body + footer(lang) + scripts()
    return localize(html, lang)


def write(path, text):
    d = os.path.dirname(path)
    if d and not os.path.isdir(d):
        os.makedirs(d)
    io.open(path, 'w', encoding='utf-8', newline='').write(text)


def build_all():
    i18n.check()
    for lang in LANGS:
        for fname, tpl, tkey, dkey, with_close in PAGES:
            html = build_page(lang, fname, tpl, tkey, dkey, with_close)
            path = OUT + DIR[lang] + fname
            write(path, html)
            print('wrote %-34s %6d bytes' % (DIR[lang] + fname, len(html.encode('utf-8'))))


# ---------------------------------------------------------------- sitemap
# Written here rather than by hand so a new page or a new language can never be
# forgotten: the list is what this script and build_archetypes.py actually
# produce. test.html appears once, at the root, because there is only one test.
def write_sitemap(slugs):
    entries = [(SITE + '/test.html', '0.9')]
    for lang in LANGS:
        for fname in i18n.PAGE_FILES:
            pri = '1.0' if (fname == 'index.html' and lang == 'uz') else (
                  '0.8' if fname == 'index.html' else '0.7')
            entries.append((url_for(lang, fname), pri))
        for s in slugs:
            entries.append((url_for(lang, 'obraz-%s.html' % s), '0.6'))
    body = u''.join(u'  <url><loc>%s</loc><priority>%s</priority></url>\n' % e
                    for e in entries)
    xml = (u'<?xml version="1.0" encoding="UTF-8"?>\n'
           u'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + body + u'</urlset>\n')
    write(OUT + 'sitemap.xml', xml)
    write(OUT + 'robots.txt',
          u'User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n' % SITE)
    print('wrote %-34s %6d bytes (%d urls)'
          % ('sitemap.xml', len(xml.encode('utf-8')), len(entries)))
    print('wrote %-34s' % 'robots.txt')


if __name__ == '__main__':
    build_all()
    stamp_test_html()
    # Standalone run: pull the archetype slugs from the shipped characters.js so
    # the sitemap lists the same ten pages build_archetypes.py writes.
    import subprocess
    slugs = json.loads(subprocess.check_output(['node', '-e', '''
const fs=require('fs'),vm=require('vm');const s={};vm.createContext(s);
vm.runInContext(fs.readFileSync(%r,'utf8'),s);
process.stdout.write(JSON.stringify(Object.values(s.ARCHETYPES).map(a=>a.slug)));
''' % (OUT + 'assets/characters.js')]).decode('utf-8'))
    write_sitemap(slugs)
