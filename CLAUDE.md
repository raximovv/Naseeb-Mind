# Naseeb Mind — how to work in this repo

A static site (no build step, no framework) published by GitHub Pages from `main`
to https://personality.naseebedu.com. Pushing `main` deploys within about a minute.

## Working agreement

- **Answer in short bullet points.** The owner reads quickly; skip preamble.
- **Small changes go straight to `main`:** edit, commit, push, no branch, no PR,
  no asking first. Anything big or risky — database or schema changes, deleting
  pages or content, anything that spends money (the Groq key), wide rewrites —
  ask first.
- **Show the work before pushing anything visible.** Start the static preview and
  give a `http://localhost:8090/...` link, then push once the owner approves.
- **Never credit Claude.** No `Co-Authored-By`, no "Generated with" footers, in
  commits or PRs. Branch names carry no AI reference either.
- **Someone else edits this tree at the same time** (the owner also runs Codex).
  Commit only your own changes; never `git add .` blindly and never revert work
  you did not make.
- **Do not commit** the owner's untracked `assets/challenges/PHOTO` or `.claude/`.
- **Never type the owner's passwords or API keys.** Hand them the step to do.

## Fixed wording

- The locked note under the profile form must stay exactly:
  `Bu maʼlumotlar faqat statistika uchun, natijalarga umuman taʼsir qilmaydi.`
- "Natijalar" in the top nav, and "Natijalarim" in the account menu, stay hidden
  until a signed-in student has finished all six challenges
  (`assets/header.js` `markResults`, set from `renderHub()` in `test.html`).

## The site

- `test.html` is standalone: its own inline CSS and its own copy of the shared
  header styles. It does **not** load `assets/site.css` or `assets/site.js`.
- Uzbek strings live in `test.html`; Russian and English in `assets/test-ru.js`
  and `assets/test-en.js`. All three must carry the same keys — `tools/i18n_test.js`
  checks that.
- Every page loads `assets/header.js` (nav, account control, language control,
  theme switch) and `assets/account.js` (Supabase auth and profile over REST,
  no SDK).
- Files use **CRLF** line endings. Edit with Python (`newline=''`) rather than
  `sed -i`, which strips them.

## Cache busting — do not skip this

Every `<script>` and `<link>` carries `?v=<first 8 of the md5 of the file with LF
line endings>`. GitHub Pages caches assets for four hours, so **a changed asset
that keeps its old `?v=` never reaches anyone.** After editing
`assets/site.css`, `assets/site.js`, `assets/header.js` or `assets/account.js`,
rebump it across all 52 HTML pages; `assets/test-ru.js` and `assets/test-en.js`
are referenced from `test.html` only.

```bash
python - <<'EOF'
import hashlib, re, glob
for name in ['header.js', 'account.js', 'site.js']:           # add site.css the same way
    h = hashlib.md5(open('assets/' + name, 'rb').read().replace(b'\r\n', b'\n')).hexdigest()[:8]
    for f in glob.glob('**/*.html', recursive=True):
        if 'node_modules' in f: continue
        s = open(f, encoding='utf-8', newline='').read()
        t = re.sub(re.escape(name) + r'\?v=[0-9a-f]{8}', name + '?v=' + h, s)
        if t != s: open(f, 'w', encoding='utf-8', newline='').write(t)
EOF
```

## Checking your work

Preview: `python -m http.server 8090` from the repo root.

Tests that need nothing but node:

```bash
node tools/i18n_test.js            # 47 checks: the three languages carry the same keys
node tools/account_session_test.js # sessions: a refused token signs out, a server error does not
node tools/recommend_test.js       # 77 checks on the major/career matching
```

The browser suites in `tools/` need `puppeteer-core` (`cd tools && npm install`,
dev only, git-ignored) and a server on **port 8765**. Several of them describe
the site as it was before the six-challenge rebuild and fail for that reason —
read the failure before assuming you broke something.

**Judge a UI fix by what is painted, not by an attribute.** Two bugs reached the
live site because a test asked whether an element was *marked* hidden while CSS
`display:flex` was still drawing it. Assert on `getComputedStyle(el).display`,
positions and sizes.

## Accounts and email

Supabase project `npiwsddwpadlsuswzfjx`, REST only. Sign-up requires an emailed
six-digit code; the mail goes out through Resend SMTP on `naseebedu.com`.
Schema changes, RLS policies, SMTP settings and the Google OAuth branding are the
owner's to make in the dashboards — explain the steps instead of attempting them.
