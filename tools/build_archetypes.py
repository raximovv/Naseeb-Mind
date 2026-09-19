# -*- coding: utf-8 -*-
u"""Generates one page per archetype per language, ten pages x three languages.

Driven by characters.js (the Uzbek original) and strings.js (the Russian and
English overlay), which are the same two files the browser loads. Nothing is
retyped here, so a page and the live site cannot disagree about what an
archetype is called.
"""
import io
import json, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_pages as bp
import life_content as lc
import build_life_js
from i18n import S, LANGS, DIR

from paths import SITE_DIR

OUT = SITE_DIR

# Pull the data straight out of the shipped files, resolving each language the
# same way strings.js does at runtime: translated field, else the Uzbek base.
dump = subprocess.check_output(['node', '-e', ('''
const fs=require('fs'),vm=require('vm');
const s={document:{documentElement:{getAttribute(){return 'uz';}}}};
vm.createContext(s);
vm.runInContext(fs.readFileSync(%r,'utf8'),s);   // characters.js
vm.runInContext(fs.readFileSync(%r,'utf8'),s);   // strings.js
const LANGS=%s;
const pick=(t,base,k)=>(t&&t[k])||base[k];
const arch={},fams={};
for (const k in s.ARCHETYPES){
  const a=s.ARCHETYPES[k], by={};
  for (const L of LANGS){
    const S=s.STRINGS[L]||{}, t=(S.arch||{})[k]||{}, f=t.figure||{};
    const name=pick(t,a,'name');
    by[L]={name, lines:pick(t,a,'lines'),
           strength:pick(t,a,'strength'), watch:pick(t,a,'watch'),
           figure:{who:f.who||a.figure.who, years:a.figure.years,
                   why:f.why||a.figure.why},
           // Both sides where the archetype has a pair, so the page can name the
           // woman as well as the man. Read from the same helper the result
           // screen uses, so a page can never advertise a figure the test does
           // not actually offer. null when only one figure exists.
           figvar:(function(){
             if(!s.tmHasFigureVariants(k)) return null;
             const was=s.document.documentElement.getAttribute;
             s.document.documentElement.getAttribute=()=>L;
             const m=s.getFigureVariant(k,'male'), fm=s.getFigureVariant(k,'female');
             s.document.documentElement.getAttribute=was;
             // art comes through getFigureVariant, so it is already prefixed
             // ../ for the pages written into ru/ and en/ -- the stubbed lang
             // above is what tmAssetPath reads when there is no location.
             return {male:{who:m.who,years:m.years,why:m.why,art:m.art},
                     female:{who:fm.who,years:fm.years,why:fm.why,art:fm.art}};
           })(),
           traits:k.split('|').map(x=>(S.traits||{})[x]||s.TRAIT_NAMES[x]),
           svg:s.charSvg(k,name)};
  }
  arch[k]={slug:a.slug, fam:a.fam, byLang:by};
}
for (const f in s.FAMILIES){
  const F=s.FAMILIES[f], name={}, note={};
  for (const L of LANGS){
    const S=s.STRINGS[L]||{};
    name[L]=(S.fam||{})[f]||F.name;
    note[L]=(S.famnote||{})[f]||s.FAM_NOTES[f];
  }
  fams[f]={c:F.c, soft:F.soft, dark:F.dark, lit:F.lit, name, note};
}
process.stdout.write(JSON.stringify({arch,fams}));
''' % (OUT + 'assets/characters.js', OUT + 'assets/strings.js', json.dumps(LANGS)))])
data = json.loads(dump.decode('utf-8'))
ARCH, FAMS = data['arch'], data['fams']

BODY = u"""<article class="apage" style="--fam:%(famc)s;--famsoft:%(famsoft)s;--famdark:%(famdark)s;--famlit:%(famlit)s">
  <header class="ahero">
    <div class="wrap ahin">
      <div class="aart">%(svg)s</div>
      <div class="ameta">
        <a class="afam" href="obrazlar.html">%(famname)s</a>
        <h1>%(name)s</h1>
        <p class="alead">%(line0)s</p>
        <p class="alead">%(line1)s</p>
      </div>
    </div>
  </header>

  <section><div class="wrap" style="max-width:820px">
    <div class="abox strong"><h2>%(l_strength)s</h2><p>%(strengthcap)s</p></div>
    <div class="abox warn"><h2>%(l_watch)s</h2><p>%(watch)s</p></div>

    <h2 class="asec">%(l_how)s</h2>
    <p>%(how)s</p>
    <p class="amuted">%(hownote)s</p>

    <h2 class="asec">%(l_fig)s</h2>
%(figblock)s
    <p class="amuted figaccuracy">%(l_fignote)s</p>

    <h2 class="asec">%(l_guide)s</h2>
    <div class="aguide">
      <div>
        <b>%(guideb)s</b>
        <p class="amuted">%(guidep)s%(guidelang)s</p>
      </div>
      <a class="btn" href="guides/%(slug)s.pdf" download>%(guidebtn)s</a>
    </div>

    %(life)s
  </div></section>
</article>
"""

def esc(s):
    return s.replace(u'&', u'&amp;').replace(u'<', u'&lt;').replace(u'>', u'&gt;')


def life_html(key, lang):
    u"""Oilada / Maktabda / Munosabatlarda plus the suggested directions.

    This is long-form written copy, so it lands one archetype and one language
    at a time rather than all at once -- a machine-shaped rendering of it would
    read worse than not offering it at all. Returns '' for any archetype not
    written in this language, and that page simply has no life section, which is
    what lets the rest of the site keep building meanwhile.
    """
    src = lc.LIFE_BY_LANG.get(lang) or {}
    if key not in src:
        return u''
    lc.check_translation(key, lang)     # refuse a half-written one, loudly
    labels = lc.LABELS[lang]
    d = src[key]
    out = u''
    for area in ('family', 'school', 'friends'):
        if area not in d:
            continue
        title, sub = labels['areas'][area]
        cols = u''
        for kind, label, cls in (('strong', labels['strong'], 'good'),
                                 ('weak', labels['weak'], 'watch')):
            items = u''.join(
                u'<li><b>%s</b> %s</li>' % (esc(t), esc(p)) for t, p in d[area][kind])
            cols += u'<div class="lifecol %s"><h4>%s</h4><ul>%s</ul></div>' % (cls, label, items)
        out += (u'<h3 class="lifehead">%s <span>%s</span></h3>'
                u'<div class="lifegrid">%s</div>') % (esc(title), esc(sub), cols)

    if d.get('careers'):
        # One main direction and three unusual extras, no score next to either.
        # See ON THE DIRECTIONS in life_content.py.
        row = (u'<li class="career"><div class="carhead"><span class="carname">%s</span>'
               u'<span class="carband %s"><i class="dot %s"></i>%s</span></div>'
               u'<p class="carwhy">%s</p></li>')
        name, why = lc.main_direction(key, lang)
        main = row % (esc(name), 'strong', 'strong', esc(labels['main']), esc(why))
        minors = u''.join(row % (esc(n), 'explore', 'explore', esc(labels['minor']), esc(w))
                          for n, w in lc.minors_for(key, lang))
        out += (u'<h3 class="lifehead">%s</h3><ul class="careers">%s</ul>'
                u'<h3 class="lifehead">%s</h3><ul class="careers">%s</ul>') % (
            esc(labels['career']), main, esc(labels['minor_title']), minors)
    return out


# The Wikipedia links, shared with test.html's result panel. Generated by
# tools/build_figure_wiki.py out of Naseeb Edu, so both projects point at the
# same people; it is JSON behind a `var`, which is why this can read it.
def _figure_wiki():
    with io.open(OUT + 'assets/figure-wiki.js', encoding='utf-8') as fh:
        raw = fh.read()
    return json.loads(raw[raw.index('{'):raw.rindex('}') + 1])


FIGURE_WIKI = _figure_wiki()

# The same wording the result panel uses (rfigWiki / rfigWikiName), so the two
# do not drift. WIKI_LABEL is the accessible name: it says WHOSE article this
# is, which the two visible words cannot. WIKI_NAME is what is printed on the
# button -- the name of the place the link goes, and nothing more.
WIKI_LABEL = {
    'uz': u'Vikipediyada o\u02bbqish',
    'ru': u'\u0427\u0438\u0442\u0430\u0442\u044c \u0432 \u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u0438',
    'en': u'Read about them on Wikipedia',
}
WIKI_NAME = {
    'uz': u'Vikipediya',
    'ru': u'\u0412\u0438\u043a\u0438\u043f\u0435\u0434\u0438\u044f',
    'en': u'Wikipedia',
}


def wiki_for(key, side, lang):
    u"""The article in this language, falling back to the Uzbek one.

    A missing link is not an error: better no link than one to an article that
    does not exist, so the caller simply omits it.
    """
    try:
        row = FIGURE_WIKI[key][side]
    except KeyError:
        return u''
    return row.get(lang) or row.get('uz') or u''


def fig_block(v, key, lang):
    u"""The historical figure, or both of them where the archetype has a pair.

    One .afig per figure, identical markup either way and no "male"/"female"
    heading over them: the section already asks who had this trait, and the two
    names answer it without being sorted into labelled boxes. The page therefore
    does not change shape as the remaining nine get their second figure.

    Each carries a link out to Wikipedia, the same one the result panel offers.
    It is written here rather than added by site.js because it is an ordinary
    link to an ordinary page and should not need JavaScript to exist.

    The link sits UNDER the description as one button: the globe, the word
    Wikipedia, and an arrow saying it leaves the site. Beside the name it was
    a bare picture, and a picture of a globe only means Wikipedia to a reader
    who already knows that.
    """
    fv = v.get('figvar')
    figs = [(fv['male'], 'male'), (fv['female'], 'female')] if fv else [(v['figure'], 'male')]
    out = []
    for f, side in figs:
        wiki = wiki_for(key, side, lang)
        # The visible words are only the name of the site, so whose article it
        # is has to reach a screen reader another way: the accessible name.
        wiki_label = u'%s: %s' % (f['who'], WIKI_LABEL[lang])
        # data-art carries the portrait so site.js can open it. The name stays
        # plain text here rather than a <button>: site.js upgrades it on load, so
        # a reader with no JS sees exactly the page they saw before instead of a
        # control that looks pressable and does nothing.
        out.append(
            (u'    <div class="afig"%s><div class="afigwho">%s <span>%s</span></div>\n'
             u'      <p>%s</p>%s</div>')
            % ((u' data-art="%s"' % esc(f['art'])) if f.get('art') else u'',
               esc(f['who']), esc(f['years']), esc(f['why']),
               (u'\n      <a class="afigwiki" href="%s" target="_blank" rel="noopener noreferrer"'
                u' aria-label="%s" title="%s">'
                u'<img src="assets/ui/wikipedia-globe.png" width="32" height="32" alt="" aria-hidden="true">'
                u'<span>%s</span><i aria-hidden="true">\u2197</i></a>'
                % (esc(wiki), esc(wiki_label), esc(wiki_label),
                   esc(WIKI_NAME[lang]))) if wiki else u''))
    return u'\n'.join(out)


count = 0
for lang in LANGS:
    t = S[lang]
    for key, a in ARCH.items():
        v = a['byLang'][lang]
        fam = FAMS[a['fam']]

        # The guide PDFs exist only in Uzbek; say so on the pages where that is
        # news, rather than after the download.
        guidelang = (u' ' + t['arch.guide.lang']) if t['arch.guide.lang'] else u''

        body = BODY % {
            'famc': fam['c'], 'famsoft': fam['soft'],
            'famdark': fam['dark'], 'famlit': fam['lit'],
            'famname': fam['name'][lang],
            'svg': v['svg'], 'name': v['name'], 'slug': a['slug'],
            'line0': v['lines'][0], 'line1': v['lines'][1],
            'figblock': fig_block(v, key, lang),
            'l_strength': t['arch.strength'], 'l_watch': t['arch.watch'],
            'strengthcap': v['strength'][0].upper() + v['strength'][1:],
            'watch': v['watch'],
            'l_how': t['arch.how.h2'],
            'how': t['arch.how.p'] % {'t0': v['traits'][0], 't1': v['traits'][1]},
            'hownote': t['arch.how.note'],
            'l_fig': t['arch.fig.h2'], 'l_fignote': t['arch.fig.note'],

            'l_guide': t['arch.guide.h2'],
            'guideb': t['arch.guide.b'] % {'name': v['name']},
            'guidep': t['arch.guide.p'], 'guidelang': guidelang,
            'guidebtn': t['arch.guide.btn'],
            'life': life_html(key, lang),
        }

        fname = 'obraz-%s.html' % a['slug']
        title = t['arch.title'] % {'name': v['name']}
        desc = u'%s %s' % (v['lines'][0], v['strength'])
        html = bp.head(lang, title, desc, fname) + bp.nav(lang, fname, 'obrazlar.html') \
             + body + bp.close(lang) + bp.footer(lang) + bp.scripts()
        bp.write(OUT + DIR[lang] + fname, bp.localize(html, lang))
        count += 1
    print('wrote %2d archetype pages to %s' % (len(ARCH), DIR[lang] or './'))

print('%d pages total' % count)

# Every figure on every page carries a Wikipedia link, in that page's language.
# Checked here rather than in a browser test because it is a property of the
# data, and a build that cannot satisfy it should stop rather than quietly ship
# ten pages where some people are linked and some are not.
_missing = []
for _lang in LANGS:
    for _key, _a in ARCH.items():
        _v = _a['byLang'][_lang]
        _sides = ['male', 'female'] if _v.get('figvar') else ['male']
        for _side in _sides:
            if not wiki_for(_key, _side, _lang):
                _missing.append('%s/%s/%s' % (_lang, _key, _side))
if _missing:
    raise SystemExit('no Wikipedia link for: ' + ', '.join(_missing)
                     + '\n  regenerate assets/figure-wiki.js with tools/build_figure_wiki.py')
print('%d Wikipedia links, %d per language' % (count * 2, len(ARCH) * 2))

# life.js carries the same content to the result screen in test.html, which is a
# standalone client-side app and cannot read life_content.py. Regenerated here so
# the two can never disagree.
build_life_js.build()

# The sitemap lists every page both generators produce, so it is written last,
# once, from the slugs we just used.
bp.write_sitemap([a['slug'] for a in ARCH.values()])
