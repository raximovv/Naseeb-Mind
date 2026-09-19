# -*- coding: utf-8 -*-
# Where the generators write.
#
# This was a hardcoded 'C:/Users/Asus/TestMind-site/' in all nine build_*.py
# files, so the site could only be rebuilt on one laptop, in one directory.
# The rule in README.md -- never hand-edit a generated page, edit the
# generator and re-run -- is only enforceable if everyone can run the
# generators, and while they could not, assets/strings.js and
# assets/characters.js were edited without a rebuild and every page kept
# pointing at their old ?v= hash.
#
# So the path is derived instead: tools/ sits inside the repo, and the repo
# root is the site. No argument, no config file, nothing to keep in sync.
#
# Set NM_SITE to write somewhere else. That is how to check a build for drift
# without touching the working tree:
#
#     NM_SITE=/tmp/check python build_pages.py
#     diff -r --exclude=tools . /tmp/check

import os

_HERE = os.path.dirname(os.path.abspath(__file__))

#: Repo root, always with a trailing slash so `SITE_DIR + 'assets/x.js'` works.
SITE_DIR = (os.environ.get('NM_SITE') or os.path.dirname(_HERE)
            ).replace(os.sep, '/').rstrip('/') + '/'
