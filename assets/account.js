// Naseeb Mind accounts: sign up, sign in, and the saved answers behind them.
//
// WHY THERE IS NO SUPABASE SDK HERE
// ---------------------------------
// The site makes no third-party SCRIPT request anywhere: the fonts are self
// hosted for exactly that reason, so pulling supabase-js off a CDN would be the
// first. Supabase is a plain HTTP API, and the six calls this site needs are
// below in about the space the SDK's <script> tag would have taken. It also
// means a CDN outage cannot take the login with it.
//
// The site does now make third-party REQUESTS, which it did not before. That is
// unavoidable the moment results are saved to an account, and it is stated on
// the privacy page rather than glossed over.
//
// WHY THE KEY IS SITTING IN PLAIN SIGHT
// -------------------------------------
// It is the publishable key. It is designed to ship in page source and it grants
// nothing on its own: every table has row level security on and every policy
// compares auth.uid() to the row's owner, so this key can read exactly what the
// signed-in student could read anyway, and nothing when nobody is signed in.
// See tools/supabase_schema.sql, which ends with a query that checks precisely
// that. The SECRET key is a different string, lives only in the dashboard, and
// must never appear in this file or any other.

var NM_URL = 'https://ombhzunpiznavnwsbblk.supabase.co';
var NM_KEY = 'sb_publishable__BM_K6gWklvSmn0bwbnV8Q_Cc9IDDRj';

var NMAccount = (function () {
  'use strict';

  var SESSION_KEY = 'naseebmind_session_v1';
  var TIMEOUT_MS = 15000;
  // Refresh this far before the token actually dies, so a slow connection does
  // not turn a valid session into a spurious "please sign in again".
  var REFRESH_MARGIN_S = 60;

  var session = null;

  // ------------------------------------------------------------- storage --
  // Every localStorage call is wrapped: private mode and a school computer with
  // site data blocked both throw on access rather than returning null, and a
  // student in that state should still be able to take the test.
  function readSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeSession(value) {
    session = value;
    try {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function adopt(payload) {
    if (!payload || !payload.access_token) return null;
    writeSession({
      access: payload.access_token,
      refresh: payload.refresh_token,
      // expires_in is seconds from now; store the absolute moment instead so a
      // tab left open overnight does not think it has an hour left.
      expires: Math.floor(Date.now() / 1000) + (payload.expires_in || 3600),
      user: payload.user ? {
        id: payload.user.id,
        email: payload.user.email,
        name: displayName(payload.user),
      } : null,
    });
    return session;
  }

  // Whatever the account was given as a display name, if anything at all. The
  // optional statistical profile below is separate from this header fallback.
  function displayName(user) {
    var meta = user && user.user_metadata;
    var name = meta && (meta.full_name || meta.name || meta.display_name);
    return String(name || '').trim();
  }

  session = readSession();

  // Supabase's browser OAuth flow returns the short-lived session in the URL
  // fragment. Consume it before the page paints so a Google redirect lands in
  // the normal signed-in state without exposing tokens in the address bar.
  function consumeOAuthRedirect() {
    if (typeof location === 'undefined' || !location.hash) return;
    var parts = location.hash.slice(1).split('&'), values = {}, i, pair;
    for (i = 0; i < parts.length; i++) {
      pair = parts[i].split('=');
      if (pair[0]) values[decodeURIComponent(pair[0])] = decodeURIComponent(pair.slice(1).join('=') || '');
    }
    var access = values.access_token;
    if (!access) return;
    writeSession({
      access: access,
      refresh: values.refresh_token || '',
      expires: Math.floor(Date.now() / 1000) + Number(values.expires_in || 3600),
      user: null,
    });
    try { history.replaceState(null, document.title, location.pathname + location.search); } catch (e) {}
  }
  consumeOAuthRedirect();

  // ------------------------------------------------------------ requests --
  function request(path, options) {
    options = options || {};
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    var headers = { apikey: NM_KEY };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    headers.Authorization = 'Bearer ' + (options.token || NM_KEY);
    if (options.prefer) headers.Prefer = options.prefer;

    return fetch(NM_URL + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    }).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;
        if (text) { try { payload = JSON.parse(text); } catch (e) { payload = text; } }
        if (!response.ok) throw apiError(response.status, payload);
        return payload;
      });
    }).catch(function (error) {
      if (error && error.nm) throw error;
      // A DNS failure, an aborted timeout and a dead wifi all land here, and the
      // student needs to be told the difference between "we are down" and "you
      // are offline" because only one of them is worth retrying now.
      var offline = (typeof navigator !== 'undefined' && navigator.onLine === false);
      throw apiError(0, null, offline ? 'offline' : 'unreachable');
    }).then(function (value) {
      clearTimeout(timer);
      return value;
    }, function (error) {
      clearTimeout(timer);
      throw error;
    });
  }

  // Error codes, not sentences. The page owns the wording, in three languages;
  // this file would otherwise be a fourth place translations have to be kept.
  function apiError(status, payload, forced) {
    var code = forced || 'failed';
    var message = payload && (payload.msg || payload.message || payload.error_description
                              || payload.error || payload.hint);
    if (!forced) {
      var text = String(message || '').toLowerCase();
      if (status === 400 && text.indexOf('invalid login') >= 0) code = 'bad-credentials';
      else if (status === 400 && text.indexOf('already registered') >= 0) code = 'email-taken';
      else if (status === 422 && text.indexOf('password') >= 0) code = 'weak-password';
      else if (status === 422) code = 'bad-email';
      else if (status === 429) code = 'too-many';
      else if (status === 401 || status === 403) code = 'signed-out';
    }
    var error = new Error(code);
    error.nm = true;
    error.code = code;
    error.status = status;
    error.detail = message || null;
    return error;
  }

  // -------------------------------------------------------------- tokens --
  function fresh() {
    if (!session) return Promise.reject(apiError(401, null, 'signed-out'));
    var now = Math.floor(Date.now() / 1000);
    if (session.expires - now > REFRESH_MARGIN_S) return Promise.resolve(session.access);
    if (!session.refresh) { writeSession(null); return Promise.reject(apiError(401, null, 'signed-out')); }
    return request('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: { refresh_token: session.refresh },
    }).then(function (payload) {
      adopt(payload);
      return session.access;
    }).catch(function (error) {
      // A refresh token is only refused when it is genuinely gone. Anything
      // else (a timeout, no connection) must NOT sign the student out mid test.
      if (error.status >= 400 && error.status < 500) writeSession(null);
      throw error;
    });
  }

  function authed(path, options) {
    return fresh().then(function (token) {
      options = options || {};
      options.token = token;
      return request(path, options);
    });
  }

  // ---------------------------------------------------------------- data --
  var rest = '/rest/v1';

  return {
    signedIn: function () { return Boolean(session && session.access); },
    user: function () { return session ? session.user : null; },

    signUp: function (email, password) {
      return request('/auth/v1/signup', {
        method: 'POST',
        body: { email: email, password: password },
      }).then(function (payload) {
        // With email confirmation switched on Supabase returns the user and no
        // session. That is not an error, but the student is NOT signed in and
        // the page has to say so rather than dropping them into challenge one.
        if (!payload || !payload.access_token) return { confirm: true };
        adopt(payload);
        return { confirm: false, user: session.user };
      });
    },

    verifyEmailOtp: function (email, token) {
      return request('/auth/v1/verify', {
        method: 'POST',
        body: { email: email, token: String(token || '').trim(), type: 'email' },
      }).then(function (payload) {
        if (!payload || !payload.access_token) throw apiError(400, null, 'bad-code');
        adopt(payload);
        return session.user;
      }).catch(function (error) {
        if (error && error.nm && (error.status === 400 || error.code === 'failed'))
          throw apiError(error.status || 400, null, 'bad-code');
        throw error;
      });
    },

    signIn: function (email, password) {
      return request('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: { email: email, password: password },
      }).then(function (payload) {
        adopt(payload);
        return session.user;
      });
    },

    // Google only. Sign in with Apple needs a paid Apple Developer membership
    // before the credential can even be created, so it is not offered; the
    // whitelist is here so a stray call cannot send a student to an authorize
    // URL for a provider that was never configured.
    signInWithProvider: function (provider, redirectTo) {
      provider = String(provider || '').toLowerCase();
      if (provider !== 'google') {
        return Promise.reject(apiError(400, null, 'failed'));
      }
      var target = redirectTo || (location.origin + location.pathname + '?auth=signin');
      location.href = NM_URL + '/auth/v1/authorize?provider=' + encodeURIComponent(provider)
        + '&redirect_to=' + encodeURIComponent(target);
      return Promise.resolve();
    },

    signOut: function () {
      var token = session && session.access;
      writeSession(null);
      if (!token) return Promise.resolve();
      // Best effort. The session is already gone locally, so a failure here is
      // not something to show a student.
      return request('/auth/v1/logout', { method: 'POST', token: token })
        .catch(function () {});
    },

    resetPassword: function (email) {
      return request('/auth/v1/recover', { method: 'POST', body: { email: email } });
    },

    profile: function () {
      return authed(rest + '/profiles?select=id,figure,language,first_name,last_name,country,region,district,school,grade,profile_completed,profile_skipped&limit=1')
        .then(function (rows) {
          var row = (rows && rows[0]) || null;
          // OAuth redirects only carry tokens, not the user object. The owner id
          // returned by the RLS-protected profile row is enough to PATCH it.
          if (row && row.id && (!session.user || !session.user.id))
            session.user = { id: row.id, email: session.user && session.user.email || '', name: '' };
          return row;
        });
    },

    setProfile: function (patch) {
      var profileId = session && session.user && session.user.id;
      if (!profileId) return Promise.reject(apiError(401, null, 'signed-out'));
      return authed(rest + '/profiles?id=eq.' + encodeURIComponent(profileId), {
        method: 'PATCH',
        body: patch,
        prefer: 'return=minimal',
      }).then(function (value) {
        // Keep the account pill in sync immediately after the optional profile
        // step, without exposing the school fields through the header API.
        if (session && session.user && patch) {
          var first = String(patch.first_name || '').trim();
          var last = String(patch.last_name || '').trim();
          session.user.name = (first + ' ' + last).trim();
          writeSession(session);
        }
        return value;
      });
    },

    // Every finished challenge this student has, newest first. The result page
    // reads the newest of each; the rest are the multi year record.
    attempts: function () {
      return authed(rest + '/attempts?select=challenge,instrument_version,answers,scores,completed_at'
                    + '&order=completed_at.desc');
    },

    // A finished challenge. Append only by policy, so this can never overwrite
    // an earlier sitting even by mistake.
    saveAttempt: function (challenge, version, answers, scores) {
      return authed(rest + '/attempts', {
        method: 'POST',
        body: {
          challenge: challenge,
          instrument_version: String(version || '1'),
          answers: answers || {},
          scores: scores || {},
        },
        prefer: 'return=minimal',
      }).then(function () {
        // The draft has served its purpose. Failing to clear it is harmless,
        // so it must not fail the save.
        return NMAccount.clearProgress(challenge).catch(function () {});
      });
    },

    progress: function () {
      return authed(rest + '/progress?select=challenge,answers,updated_at');
    },

    // Called as a student answers, so it has to be an upsert: there is one row
    // per student per challenge and it is replaced, not added to.
    saveProgress: function (challenge, answers) {
      return authed(rest + '/progress', {
        method: 'POST',
        body: {
          challenge: challenge,
          answers: answers || {},
          updated_at: new Date().toISOString(),
        },
        prefer: 'resolution=merge-duplicates,return=minimal',
      });
    },

    clearProgress: function (challenge) {
      return authed(rest + '/progress?challenge=eq.' + encodeURIComponent(challenge), {
        method: 'DELETE',
        prefer: 'return=minimal',
      });
    },

    // Groq, behind supabase/functions/recommend. Scores and candidate majors
    // only: no name, email or school ever goes into the request.
    recommendMajors: function (body) {
      return authed('/functions/v1/recommend', { method: 'POST', body: body });
    },
  };
})();
