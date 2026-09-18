// The site header's two JavaScript-driven controls: the account pill with its
// menu, and the light/dark switch. One file because they share a home, a set of
// three-language labels, and a pair of hosts -- and because on a school
// connection a second request costs more than the few lines it would save.
//
// ---------------------------------------------------------------------------
// THE ACCOUNT CONTROL
//
// Signed out it is a link that says "Kirish" and opens the existing sign-in
// dialog. Signed in it is a button carrying the student's name and a menu:
// their results, the test they are part way through, and the way out.
//
// ONE FILE FOR TWO VERY DIFFERENT HOSTS
// -------------------------------------
// The generated pages (index, obrazlar, savollar...) are plain documents, so
// their menu items are links to test.html. test.html is an application, so its
// items change the view in place with no page load at all. Everything that is
// the same either way -- the markup, opening, closing, focus, Escape, the click
// outside, staying in step with the session -- lives here once, and each host
// passes in what its three actions actually do.
//
// No framework, ES5, no build step: the same constraints as the rest of the
// site, which has to run on a six-year-old Android phone over school Wi-Fi.
var NMNav = (function () {
  'use strict';

  // Inline SVG, not <img>: these take their colour from the pill they sit in,
  // and they are on screen before any network request could have delivered them.
  var PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<circle cx="12" cy="8.2" r="3.5"/>'
    + '<path d="M5 19.7c.5-3.9 3.4-5.9 7-5.9s6.5 2 7 5.9z"/></svg>';
  var CARET = '<svg class="acctcar" viewBox="0 0 16 16" aria-hidden="true" focusable="false">'
    + '<path d="M4 6.5 8 10.6 12 6.5" fill="none" stroke="currentColor" stroke-width="1.9"'
    + ' stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON = {
    results: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">'
      + '<rect x="3" y="11.2" width="3.3" height="5.8" rx="1"/>'
      + '<rect x="8.35" y="5.6" width="3.3" height="11.4" rx="1"/>'
      + '<rect x="13.7" y="8.6" width="3.3" height="8.4" rx="1"/></svg>',
    resume: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">'
      + '<path d="M6.6 4.1 15.5 10l-8.9 5.9z"/></svg>',
    out: '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" class="strokeico">'
      + '<path d="M11.4 3.2H5.6A1.4 1.4 0 0 0 4.2 4.6v10.8a1.4 1.4 0 0 0 1.4 1.4h5.8"/>'
      + '<path d="m13.6 7.1 3 2.9-3 2.9M16.4 10H8.9"/></svg>'
  };

  // The menu's wording, in the three languages the site ships. It is here and
  // not in i18n.py or CHROME because both hosts need the same four strings and
  // a third copy is a third place for them to drift.
  //
  // "Hisobim" is the fallback name, NOT a guess at one: the schema stores no
  // name for anybody (see tools/supabase_schema.sql), and carving a first name
  // out of an email address would put a wrong one on screen.
  var TEXT = {
    uz: { login: 'Kirish', account: 'Hisobim', results: 'Natijalarim',
          resume: 'Testni davom ettirish', out: 'Chiqish', menu: 'Hisob menyusi' },
    ru: { login: 'Войти', account: 'Мой аккаунт', results: 'Мои результаты',
          resume: 'Продолжить тест', out: 'Выйти', menu: 'Меню аккаунта' },
    en: { login: 'Log in', account: 'My account', results: 'My results',
          resume: 'Continue the test', out: 'Log out', menu: 'Account menu' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // The signed-in state without needing account.js to have been loaded. Both
  // hosts do load it, but the header must never be the thing that breaks if a
  // script further down the list fails to arrive.
  function session() {
    if (typeof NMAccount !== 'undefined') {
      return NMAccount.signedIn() ? (NMAccount.user() || {}) : null;
    }
    try {
      var raw = JSON.parse(localStorage.getItem('naseebmind_session_v1'));
      return raw && raw.access ? (raw.user || {}) : null;
    } catch (e) { return null; }
  }

  // «Natijalar» is only for a student with a finished result. test.html knows
  // that and leaves the signed-in student's id here; every page reads it.
  var RESULTS_KEY = 'naseebmind_results_for_v1';

  function hasResults(user) {
    try {
      return !!(user && user.id && localStorage.getItem(RESULTS_KEY) === user.id);
    } catch (e) { return false; }
  }

  function showResultsLinks(on) {
    var links = document.querySelectorAll('a[href*="view=results"]'), i;
    for (i = 0; i < links.length; i++) links[i].style.display = on ? '' : 'none';
  }

  // Called by test.html whenever the hub is counted. True when it changed.
  function markResults(done) {
    var user = session(), before = hasResults(user);
    try {
      if (done && user && user.id) localStorage.setItem(RESULTS_KEY, user.id);
      else localStorage.removeItem(RESULTS_KEY);
    } catch (e) {}
    return hasResults(user) !== before;
  }

  // The language control. The three pills stay in the markup as the no-JS
  // fallback; with JavaScript they become one dropdown, the same control
  // Naseeb Edu uses. Choosing an option clicks the matching pill, so whatever
  // the host wired to those links (test.html remembers the reading spot) runs.
  function langSelect() {
    var sw = document.querySelector('.langsw');
    if (!sw || document.querySelector('.langpick')) return;
    var links = sw.querySelectorAll('a, span'), i, items = '', here = '';
    for (i = 0; i < links.length; i++) {
      var code = (links[i].textContent || '').trim();
      var on = links[i].tagName !== 'A';
      if (on) here = code;
      // Real links: middle-click and "open in new tab" keep working, and a click
      // goes through the pill, so whatever the host wired to it still runs.
      items += on
        ? '<span class="langitem is-on" aria-current="true">' + esc(code) + '</span>'
        : '<a class="langitem" role="menuitem" href="' + esc(links[i].getAttribute('href')) + '"'
          + ' hreflang="' + esc(links[i].getAttribute('hreflang') || '') + '">' + esc(code) + '</a>';
    }
    if (!here) return;
    var label = sw.getAttribute('aria-label') || 'Language';
    var box = document.createElement('div');
    box.className = 'langpick';
    box.innerHTML = '<button class="langbtn" type="button" aria-haspopup="true" aria-expanded="false"'
      + ' aria-label="' + esc(label) + '">'
      + '<svg class="langico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
      + '<path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/>'
      + '<path d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"/>'
      + '<path d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/>'
      + '<circle cx="12" cy="12" r="10"/></svg>'
      + '<span class="langnow">' + esc(here) + '</span>'
      + '<svg class="langcar" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5"/></svg>'
      + '</button>'
      + '<div class="langmenu" role="menu" aria-label="' + esc(label) + '" hidden>' + items + '</div>';

    var btn = box.querySelector('.langbtn'), menu = box.querySelector('.langmenu');
    var choices = menu.querySelectorAll('a');
    var open = function (on) {
      menu.hidden = !on;
      btn.setAttribute('aria-expanded', String(on));
      if (on && choices.length) choices[0].focus();
    };
    btn.onclick = function (e) { e.preventDefault(); open(menu.hidden); };
    btn.onkeydown = function (e) {
      if (e.key === 'ArrowDown' || e.key === 'Down') { e.preventDefault(); open(true); }
    };
    for (i = 0; i < choices.length; i++) {
      choices[i].onclick = function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;   // new tab still works
        e.preventDefault();
        var want = this.textContent.trim(), j;
        for (j = 0; j < links.length; j++)
          if ((links[j].textContent || '').trim() === want && links[j].tagName === 'A') { links[j].click(); return; }
      };
      choices[i].onkeydown = function (e) {
        var n = -1, k;
        for (k = 0; k < choices.length; k++) if (choices[k] === this) n = k;
        if (e.key === 'ArrowDown' || e.key === 'Down') { e.preventDefault(); choices[(n + 1) % choices.length].focus(); }
        else if (e.key === 'ArrowUp' || e.key === 'Up') { e.preventDefault(); choices[(n - 1 + choices.length) % choices.length].focus(); }
        else if (e.key === 'Escape' || e.key === 'Esc') { open(false); btn.focus(); }
        else if (e.key === 'Tab') open(false);
      };
    }
    document.addEventListener('click', function (e) { if (!menu.hidden && !box.contains(e.target)) open(false); });
    document.addEventListener('keydown', function (e) {
      if (!menu.hidden && (e.key === 'Escape' || e.key === 'Esc')) { open(false); btn.focus(); }
    });

    sw.parentNode.insertBefore(box, sw);
    sw.hidden = true;
    sw.style.display = 'none';   // .langsw sets display:flex, which beats [hidden]
  }

  function mount(opts) {
    opts = opts || {};
    var box = document.querySelector('[data-acct]');
    if (!box) return null;

    var lang = box.getAttribute('data-lang') || 'uz';
    var t = TEXT[lang] || TEXT.uz;
    var loginHref = box.getAttribute('data-login-href') || 'test.html?auth=signin';
    // Where the two navigating items point. The wrapper carries them because the
    // language is already resolved there; a host that handles the action itself
    // passes a callback instead and the href is never followed.
    var resultsHref = opts.resultsHref || box.getAttribute('data-results-href');
    var resumeHref = opts.resumeHref || box.getAttribute('data-resume-href');
    var open = false, btn = null, menu = null, items = [];

    // ---------------------------------------------------------- rendering --
    function paint() {
      var user = session();
      open = false;
      showResultsLinks(hasResults(user));
      if (!user) {
        // A link, not a button, and a real href: with JavaScript switched off
        // this is still the way in.
        box.innerHTML = '<a class="acctbtn" href="' + esc(loginHref) + '">'
          + '<span class="acctav" aria-hidden="true">' + PERSON + '</span>'
          + '<span class="acctnm">' + esc(t.login) + '</span></a>';
        // test.html (the host with onResults) opens its own dialog in place.
        if (!opts.onResults) box.firstChild.onclick = openLogin;
        btn = menu = null; items = [];
        return;
      }
      var name = String(user.name || '').trim();
      // No name means no initial either. A letter taken from the email would be
      // the same guess the label refuses to make, only harder to notice.
      var avatar = name ? esc(name.charAt(0).toUpperCase()) : PERSON;
      box.innerHTML =
        '<button class="acctbtn" type="button" aria-haspopup="true" aria-expanded="false"'
        + ' aria-controls="acctMenu">'
        + '<span class="acctav" aria-hidden="true">' + avatar + '</span>'
        + '<span class="acctnm">' + esc(name || t.account) + '</span>' + CARET
        + '</button>'
        + '<div class="acctmenu" id="acctMenu" role="menu" aria-label="' + esc(t.menu) + '" hidden>'
        + (hasResults(user) ? item('results', t.results, resultsHref) : '')
        + item('resume', t.resume, resumeHref)
        + '<hr class="acctsep">'
        + item('out', t.out, null, 'acctout')
        + '</div>';
      btn = box.querySelector('.acctbtn');
      menu = box.querySelector('.acctmenu');
      items = menu.querySelectorAll('[role="menuitem"]');
      wire();
    }

    // An href makes it a link, so middle-click and "open in new tab" work on the
    // pages where the action really is a different page. Signing out is never a
    // link: it changes state, and a link that changes state is prefetchable.
    function item(key, label, href, extra) {
      var cls = 'acctitem' + (extra ? ' ' + extra : '');
      var inner = ICON[key] + '<span>' + esc(label) + '</span>';
      if (href) {
        return '<a class="' + cls + '" role="menuitem" data-do="' + key + '" href="'
          + esc(href) + '">' + inner + '</a>';
      }
      return '<button class="' + cls + '" role="menuitem" type="button" data-do="' + key
        + '">' + inner + '</button>';
    }

    // Kirish opens test.html's sign-in dialog framed over this page, so the
    // visitor stays where they are. A modified click still opens the page.
    function openLogin(e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault();
      if (document.getElementById('nmLoginFrame')) return;
      var f = document.createElement('iframe');
      f.id = 'nmLoginFrame';
      f.title = t.login;
      f.src = loginHref + '&embed=1';
      f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:transparent';
      f.onload = function () {
        try { f.contentWindow.focus(); f.contentDocument.getElementById('authEmail').focus(); } catch (err) {}
      };
      document.body.appendChild(f);
      document.documentElement.style.overflow = 'hidden';
    }
    window.addEventListener('message', function (e) {
      var f = document.getElementById('nmLoginFrame');
      if (!f || e.origin !== location.origin || e.data !== 'nm-login-done') return;
      f.remove();
      document.documentElement.style.overflow = '';
      paint();
      if (box.firstChild) box.firstChild.focus();
    });

    // ----------------------------------------------------- opening/closing --
    function setOpen(next, focusFirst) {
      if (!btn || !menu) return;
      open = next;
      menu.hidden = !next;
      btn.setAttribute('aria-expanded', String(next));
      if (next && focusFirst === true && items.length) items[0].focus();
      if (!next && focusFirst === false) btn.focus();
    }

    function wire() {
      btn.onclick = function (e) { e.preventDefault(); setOpen(!open); };
      btn.onkeydown = function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Down') { e.preventDefault(); setOpen(true, true); }
      };
      var i;
      for (i = 0; i < items.length; i++) {
        items[i].onclick = function (e) { run(this.getAttribute('data-do'), e); };
        items[i].onkeydown = step;
      }
    }

    // Up and down wrap around the three items; Home and End jump to the ends.
    // Tab is deliberately left alone -- it closes the menu and carries on into
    // the page, which is what a keyboard user expects of a menu button.
    function step(e) {
      var n = -1, i;
      for (i = 0; i < items.length; i++) if (items[i] === this) n = i;
      if (e.key === 'ArrowDown' || e.key === 'Down') { e.preventDefault(); items[(n + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp' || e.key === 'Up') { e.preventDefault(); items[(n - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Tab') setOpen(false);
    }

    function run(what, e) {
      if (what === 'out') {
        e.preventDefault();
        setOpen(false);
        var done = function () { paint(); if (opts.onSignOut) opts.onSignOut(); };
        if (typeof NMAccount !== 'undefined') NMAccount.signOut().then(done, done);
        else { try { localStorage.removeItem('naseebmind_session_v1'); } catch (err) {} done(); }
        return;
      }
      // A host that handles the action itself (test.html) stops the navigation;
      // one that does not (every other page) lets the link do its job.
      var handler = what === 'results' ? opts.onResults : opts.onResume;
      if (handler) { e.preventDefault(); setOpen(false); handler(); }
    }

    // A click anywhere else, and Escape from anywhere, close the menu. Bound on
    // the document once per mount rather than per open: a listener added on open
    // sees the very click that opened it on the way back up.
    document.addEventListener('click', function (e) {
      if (open && !box.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (open && (e.key === 'Escape' || e.key === 'Esc')) setOpen(false, false);
    });
    // Signing in or out in another tab is the same event as signing out here.
    window.addEventListener('storage', function (e) {
      if (!e.key || e.key === 'naseebmind_session_v1' || e.key === RESULTS_KEY) paint();
    });

    paint();
    langSelect();
    return { refresh: paint, text: t };
  }

  return { mount: mount, text: TEXT, markResults: markResults, langSelect: langSelect,
           signedIn: function () { return !!session(); } };
})();

// The light/dark switch, copied from Naseeb Edu's: a saved choice wins, and
// with no saved choice the phone's own setting decides. Nothing is stamped on
// <html> in that second case, which is what lets prefers-color-scheme work.
//
// The stamp itself is written by a tiny inline script in every <head>, BEFORE
// the stylesheet paints. Doing it here instead would show the wrong theme for a
// frame on every page load, which reads as a broken site rather than a setting.
var NMTheme = (function () {
  'use strict';

  var KEY = 'naseebmind_theme_v1';
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="ico">'
    + '<circle cx="12" cy="12" r="4.1"/>'
    + '<path d="M12 2.6v2.5M12 18.9v2.5M2.6 12h2.5M18.9 12h2.5'
    + 'M5.4 5.4 7.2 7.2M16.8 16.8l1.8 1.8M18.6 5.4 16.8 7.2M7.2 16.8 5.4 18.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="ico">'
    + '<path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8z"/></svg>';

  var TEXT = {
    uz: { toDark: 'Tungi rejimga oʻtish', toLight: 'Kunduzgi rejimga oʻtish' },
    ru: { toDark: 'Тёмная тема', toLight: 'Светлая тема' },
    en: { toDark: 'Switch to dark mode', toLight: 'Switch to light mode' }
  };

  function saved() {
    try {
      var v = localStorage.getItem(KEY);
      return (v === 'dark' || v === 'light') ? v : null;
    } catch (e) { return null; }
  }

  // What is actually on screen, which is the saved choice if there is one and
  // the phone's setting if there is not.
  function current() {
    var v = saved();
    if (v) return v;
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  }

  function apply(v) {
    document.documentElement.setAttribute('data-theme', v);
    try { localStorage.setItem(KEY, v); } catch (e) {}
    favicon();
  }

  // The tab icon is a dark navy mark, invisible on a dark tab strip, so dark mode
  // gets the cream one. The light file named in the page stays the source of
  // truth; only "-dark" is added to it.
  function favicon() {
    var link = document.querySelector('link[rel~="icon"]'), href;
    if (!link) return;
    href = link.getAttribute('data-light') || link.getAttribute('href');
    link.setAttribute('data-light', href);
    link.setAttribute('href', current() === 'dark' ? href.replace(/(\.[a-z0-9]+)$/i, '-dark$1') : href);
  }

  function mount(lang) {
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return null;
    var t = TEXT[lang] || TEXT[(btn.getAttribute('data-lang') || 'uz')] || TEXT.uz;

    function paint() {
      var dark = current() === 'dark';
      btn.innerHTML = dark ? SUN : MOON;
      btn.setAttribute('aria-pressed', String(dark));
      // The label says what the button DOES, not what the page currently is.
      btn.setAttribute('aria-label', dark ? t.toLight : t.toDark);
      btn.setAttribute('title', dark ? t.toLight : t.toDark);
      favicon();
    }

    btn.onclick = function () { apply(current() === 'dark' ? 'light' : 'dark'); paint(); };
    // A phone switched to dark while the page is open, and nothing overriding it.
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var follow = function () { if (!saved()) paint(); };
      if (mq.addEventListener) mq.addEventListener('change', follow);
      else if (mq.addListener) mq.addListener(follow);
    } catch (e) {}
    window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY) paint(); });

    paint();
    return { refresh: paint, current: current };
  }

  favicon();
  try {
    var themeMq = window.matchMedia('(prefers-color-scheme: dark)');
    var followIcon = function () { if (!saved()) favicon(); };
    if (themeMq.addEventListener) themeMq.addEventListener('change', followIcon);
    else if (themeMq.addListener) themeMq.addListener(followIcon);
  } catch (e) {}

  return { mount: mount, current: current, text: TEXT };
})();
