// Naseeb Mind accounts: authentication, student profile,
// school catalogue, assessment history, and local draft progress.

var NM_URL = 'https://npiwsddwpadlsuswzfjx.supabase.co';
var NM_KEY = 'sb_publishable_Afl5H9Qa3YPPvqt68-xFwA_lMkMANyG';

var NMAccount = (function () {
  'use strict';

  var SESSION_KEY = 'naseebmind_session_v1';
  var DRAFT_PREFIX = 'naseebmind_progress_v1:';
  var TIMEOUT_MS = 15000;
  var REFRESH_MARGIN_S = 60;

  var session = null;

  // ------------------------------------------------------------- storage --

  function readSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeSession(value) {
    session = value;

    try {
      if (value) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {}
  }

  function readDrafts(userId) {
    try {
      var raw = localStorage.getItem(DRAFT_PREFIX + userId);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeDrafts(userId, value) {
    try {
      localStorage.setItem(
        DRAFT_PREFIX + userId,
        JSON.stringify(value || {})
      );
    } catch (e) {}
  }

  // --------------------------------------------------------------- user --

  function displayName(user) {
    var meta = user && user.user_metadata;
    var name = meta && (
      meta.full_name ||
      meta.name ||
      meta.display_name
    );

    // The header shows the first name only ("rahim", not "rahim raximov").
    return String(name || '').trim().split(/\s+/)[0];
  }

  // The profile's first name, once the student has given one, is the name.
  function useFirstName(first) {
    first = String(first || '').trim();
    if (first && session && session.user && session.user.name !== first) {
      session.user.name = first;
      writeSession(session);
    }
  }

  function adopt(payload) {
    if (!payload || !payload.access_token) {
      return null;
    }

    writeSession({
      access: payload.access_token,
      refresh: payload.refresh_token || '',
      expires:
        Math.floor(Date.now() / 1000) +
        Number(payload.expires_in || 3600),

      user: payload.user
        ? {
            id: payload.user.id,
            email: payload.user.email || '',
            name: displayName(payload.user)
          }
        : null
    });

    return session;
  }

  session = readSession();

  // -------------------------------------------------------- OAuth return --

  function consumeOAuthRedirect() {
    if (
      typeof location === 'undefined' ||
      !location.hash
    ) {
      return;
    }

    var parts = location.hash.slice(1).split('&');
    var values = {};
    var i;
    var pair;

    for (i = 0; i < parts.length; i++) {
      pair = parts[i].split('=');

      if (pair[0]) {
        values[decodeURIComponent(pair[0])] =
          decodeURIComponent(
            pair.slice(1).join('=') || ''
          );
      }
    }

    if (!values.access_token) {
      return;
    }

    writeSession({
      access: values.access_token,
      refresh: values.refresh_token || '',
      expires:
        Math.floor(Date.now() / 1000) +
        Number(values.expires_in || 3600),

      // Google OAuth hash does not contain the full user object.
      // ensureUser() retrieves it when needed.
      user: null
    });

    try {
      history.replaceState(
        null,
        document.title,
        location.pathname + location.search
      );
    } catch (e) {}
  }

  consumeOAuthRedirect();

  // ------------------------------------------------------------ requests --

  function request(path, options) {
    options = options || {};

    var controller = new AbortController();

    var timer = setTimeout(function () {
      controller.abort();
    }, TIMEOUT_MS);

    var headers = {
      apikey: NM_KEY
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    headers.Authorization =
      'Bearer ' + (options.token || NM_KEY);

    if (options.prefer) {
      headers.Prefer = options.prefer;
    }

    return fetch(NM_URL + path, {
      method: options.method || 'GET',
      headers: headers,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      signal: controller.signal
    })
      .then(function (response) {
        return response.text().then(function (text) {
          var payload = null;

          if (text) {
            try {
              payload = JSON.parse(text);
            } catch (e) {
              payload = text;
            }
          }

          if (!response.ok) {
            throw apiError(
              response.status,
              payload
            );
          }

          return payload;
        });
      })
      .catch(function (error) {
        if (error && error.nm) {
          throw error;
        }

        var offline =
          typeof navigator !== 'undefined' &&
          navigator.onLine === false;

        throw apiError(
          0,
          null,
          offline ? 'offline' : 'unreachable'
        );
      })
      .then(
        function (value) {
          clearTimeout(timer);
          return value;
        },
        function (error) {
          clearTimeout(timer);
          throw error;
        }
      );
  }

  // --------------------------------------------------------------- errors --

  function apiError(status, payload, forced) {
    var code = forced || 'failed';

    var message =
      payload &&
      (
        payload.msg ||
        payload.message ||
        payload.error_description ||
        payload.error ||
        payload.hint
      );

    if (!forced) {
      var text =
        String(message || '').toLowerCase();

      if (
        status === 400 &&
        text.indexOf('invalid login') >= 0
      ) {
        code = 'bad-credentials';
      } else if (
        status === 400 &&
        text.indexOf('already registered') >= 0
      ) {
        code = 'email-taken';
      } else if (
        status === 422 &&
        text.indexOf('password') >= 0
      ) {
        code = 'weak-password';
      } else if (status === 422) {
        code = 'bad-email';
      } else if (status === 429) {
        code = 'too-many';
      } else if (
        status === 401 ||
        status === 403
      ) {
        code = 'signed-out';
      }
    }

    var error = new Error(code);

    error.nm = true;
    error.code = code;
    error.status = status;
    error.detail = message || null;

    return error;
  }

  // --------------------------------------------------------------- token --

  // Supabase rotates the refresh token on every use, so a refresh token must be
  // spent once. Two things used to spend it twice and, on the 400 that follows,
  // wipe a session that had just been renewed (the student looked signed out
  // after a reload and the hub showed 0/6):
  //   - pullSaved() asks for attempts and profile at once, and each refreshed;
  //   - a second tab kept its load-time copy after the first tab rotated it.
  // So share one refresh, read the stored session first, and only clear a
  // session that still holds the token that was refused.
  var refreshing = null;

  function stillStored(field, value) {
    var stored = readSession();
    return !stored || stored[field] === value;
  }

  function fresh() {
    session = readSession() || session;

    if (!session) {
      return Promise.reject(
        apiError(401, null, 'signed-out')
      );
    }

    var now =
      Math.floor(Date.now() / 1000);

    if (
      session.access &&
      session.expires - now > REFRESH_MARGIN_S
    ) {
      return Promise.resolve(session.access);
    }

    if (!session.refresh) {
      writeSession(null);

      return Promise.reject(
        apiError(401, null, 'signed-out')
      );
    }

    if (refreshing) {
      return refreshing;
    }

    var used = session.refresh;

    refreshing = request(
      '/auth/v1/token?grant_type=refresh_token',
      {
        method: 'POST',
        body: {
          refresh_token: used
        }
      }
    )
      .then(function (payload) {
        // adopt() drops the user when the payload has none; keep ours.
        var user = session && session.user;
        adopt(payload);
        if (session && !session.user && user) {
          session.user = user;
          writeSession(session);
        }
        return session.access;
      })
      .catch(function (error) {
        if (
          error.status >= 400 &&
          error.status < 500 &&
          stillStored('refresh', used)
        ) {
          writeSession(null);
        }

        throw error;
      })
      .then(
        function (token) {
          refreshing = null;
          return token;
        },
        function (error) {
          refreshing = null;
          throw error;
        }
      );

    return refreshing;
  }

  function authed(path, options) {
    return fresh().then(function (token) {
      options = options || {};
      options.token = token;

      return request(path, options).catch(function (error) {
        // An unexpired token the server still refuses is a token for a
        // DIFFERENT project: after the Supabase move every student carried one
        // of those for up to an hour, saw the dropdowns fill (public data
        // needs no token) and every save fail, with nothing saying to sign in
        // again. Drop it so the page asks, instead of retrying forever.
        if (
          error &&
          error.status === 401 &&
          stillStored('access', token)
        ) {
          writeSession(null);   // apiError already codes 401 as 'signed-out'
        }

        throw error;
      });
    });
  }

  // After Google OAuth we have an access token but may not yet
  // have the user's id/email in local session storage.
  function ensureUser() {
    if (
      session &&
      session.user &&
      session.user.id
    ) {
      return Promise.resolve(session.user);
    }

    return fresh()
      .then(function (token) {
        return request('/auth/v1/user', {
          token: token
        });
      })
      .then(function (user) {
        if (!user || !user.id) {
          throw apiError(
            401,
            null,
            'signed-out'
          );
        }

        if (!session) {
          throw apiError(
            401,
            null,
            'signed-out'
          );
        }

        session.user = {
          id: user.id,
          email: user.email || '',
          name: displayName(user)
        };

        writeSession(session);

        return session.user;
      });
  }

  // --------------------------------------------------------------- REST --

  var rest = '/rest/v1';

  return {

    // ------------------------------------------------------------ session --

    signedIn: function () {
      return Boolean(
        session &&
        session.access
      );
    },

    user: function () {
      return session
        ? session.user
        : null;
    },

    // --------------------------------------------------------------- auth --

    signUp: function (email, password) {
      return request('/auth/v1/signup', {
        method: 'POST',
        body: {
          email: email,
          password: password
        }
      }).then(function (payload) {

        // Email confirmation enabled.
        if (
          !payload ||
          !payload.access_token
        ) {
          return {
            confirm: true
          };
        }

        adopt(payload);

        return {
          confirm: false,
          user: session.user
        };
      });
    },

    verifyEmailOtp: function (
      email,
      token
    ) {
      return request(
        '/auth/v1/verify',
        {
          method: 'POST',
          body: {
            email: email,
            token:
              String(token || '').trim(),
            type: 'email'
          }
        }
      )
        .then(function (payload) {
          if (
            !payload ||
            !payload.access_token
          ) {
            throw apiError(
              400,
              null,
              'bad-code'
            );
          }

          adopt(payload);

          return session.user;
        })
        .catch(function (error) {
          if (
            error &&
            error.nm &&
            (
              error.status === 400 ||
              error.code === 'failed'
            )
          ) {
            throw apiError(
              error.status || 400,
              null,
              'bad-code'
            );
          }

          throw error;
        });
    },

    signIn: function (email, password) {
      return request(
        '/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          body: {
            email: email,
            password: password
          }
        }
      ).then(function (payload) {
        adopt(payload);

        return session.user;
      });
    },

    signInWithProvider: function (
      provider,
      redirectTo
    ) {
      provider =
        String(provider || '')
          .toLowerCase();

      if (provider !== 'google') {
        return Promise.reject(
          apiError(
            400,
            null,
            'failed'
          )
        );
      }

      var target =
        redirectTo ||
        (
          location.origin +
          location.pathname +
          '?auth=signin'
        );

      location.href =
        NM_URL +
        '/auth/v1/authorize' +
        '?provider=' +
        encodeURIComponent(provider) +
        '&redirect_to=' +
        encodeURIComponent(target);

      return Promise.resolve();
    },

    signOut: function () {
      var token =
        session &&
        session.access;

      writeSession(null);

      if (!token) {
        return Promise.resolve();
      }

      return request(
        '/auth/v1/logout',
        {
          method: 'POST',
          token: token
        }
      ).catch(function () {
        // Local session is already removed.
      });
    },

    resetPassword: function (email) {
      return request(
        '/auth/v1/recover',
        {
          method: 'POST',
          body: {
            email: email
          }
        }
      );
    },

    // ------------------------------------------------------------ profile --

    profile: function () {
      return ensureUser()
        .then(function (user) {
          return authed(
            rest +
            '/profiles' +
            '?select=' +
            'user_id,' +
            'first_name,' +
            'last_name,' +
            'country_code,' +
            'region_id,' +
            'district_id,' +
            'school_id,' +
            'custom_school_name,' +
            'grade,' +
            'created_at' +
            '&user_id=eq.' +
            encodeURIComponent(user.id) +
            '&limit=1'
          );
        })
        .then(function (rows) {
          var row = (
            rows &&
            rows[0]
          ) || null;

          if (row) {
            useFirstName(row.first_name);
          }

          return row;
        });
    },

    setProfile: function (patch) {
      return ensureUser()
        .then(function (user) {

          var body = {
            user_id: user.id
          };

          Object.keys(
            patch || {}
          ).forEach(function (key) {
            body[key] = patch[key];
          });

          return authed(
            rest +
            '/profiles?on_conflict=user_id',
            {
              method: 'POST',
              body: body,
              prefer:
                'resolution=merge-duplicates,return=minimal'
            }
          );
        })
        .then(function (value) {

          if (patch) {
            useFirstName(patch.first_name);
          }

          return value;
        });
    },

    // --------------------------------------------------- school catalogue --

    regions: function () {
      return request(
        rest +
        '/regions' +
        '?select=id,name' +
        '&order=name.asc'
      );
    },

    districts: function (regionId) {
      if (!regionId) {
        return Promise.resolve([]);
      }

      return request(
        rest +
        '/districts' +
        '?select=id,name' +
        '&region_id=eq.' +
        encodeURIComponent(regionId) +
        '&order=name.asc'
      );
    },

    schools: function (districtId) {
      if (!districtId) {
        return Promise.resolve([]);
      }

      return request(
        rest +
        '/schools' +
        '?select=' +
        'id,' +
        'name,' +
        'institution_type,' +
        'ownership' +
        '&district_id=eq.' +
        encodeURIComponent(districtId) +
        '&order=name.asc'
      );
    },

    // ------------------------------------------------------ assessments --

    // Returns finished assessments newest first.
    //
    // It also exposes "challenge" and "instrument_version" so the
    // existing frontend can continue using the old object shape
    // while the database uses assessment_attempts.
    attempts: function () {
      return ensureUser()
        .then(function (user) {
          return authed(
            rest +
            '/assessment_attempts' +
            '?select=' +
            'id,' +
            'assessment_version,' +
            'answers,' +
            'scores,' +
            'result,' +
            'started_at,' +
            'completed_at' +
            '&user_id=eq.' +
            encodeURIComponent(user.id) +
            '&order=completed_at.desc'
          );
        })
        .then(function (rows) {
          return (rows || []).map(
            function (row) {
              var result =
                row.result || {};

              return {
                id: row.id,

                challenge:
                  result.challenge || '',

                instrument_version:
                  row.assessment_version,

                assessment_version:
                  row.assessment_version,

                answers:
                  row.answers || {},

                scores:
                  row.scores || {},

                result:
                  result,

                started_at:
                  row.started_at,

                completed_at:
                  row.completed_at
              };
            }
          );
        });
    },

    // Compatible with the existing frontend signature:
    //
    // saveAttempt(
    //   challenge,
    //   version,
    //   answers,
    //   scores
    // )
    //
    // "challenge" is saved inside the result JSON because the new
    // assessment_attempts table does not have a challenge column.
    saveAttempt: function (
      challenge,
      version,
      answers,
      scores
    ) {
      return ensureUser()
        .then(function (user) {

          var now =
            new Date().toISOString();

          return authed(
            rest +
            '/assessment_attempts',
            {
              method: 'POST',

              body: {
                user_id: user.id,

                assessment_version:
                  String(
                    version || '1'
                  ),

                answers:
                  answers || {},

                scores:
                  scores || {},

                result: {
                  challenge:
                    String(
                      challenge || ''
                    )
                },

                started_at: now,
                completed_at: now
              },

              prefer:
                'return=minimal'
            }
          );
        })
        .then(function () {
          // Draft is no longer needed
          // after successful submission.
          return NMAccount
            .clearProgress(challenge)
            .catch(function () {});
        });
    },

    // -------------------------------------------------- local progress --

    // The Stockholm schema intentionally has no "progress" table.
    // Draft answers therefore stay in this browser until the
    // assessment is submitted.
    progress: function () {
      return ensureUser()
        .then(function (user) {
          var drafts =
            readDrafts(user.id);

          return Object.keys(
            drafts
          ).map(function (challenge) {
            return {
              challenge: challenge,

              answers:
                drafts[challenge]
                  .answers || {},

              updated_at:
                drafts[challenge]
                  .updated_at || null
            };
          });
        });
    },

    saveProgress: function (
      challenge,
      answers
    ) {
      if (!challenge) {
        return Promise.resolve();
      }

      return ensureUser()
        .then(function (user) {
          var drafts =
            readDrafts(user.id);

          drafts[
            String(challenge)
          ] = {
            answers:
              answers || {},

            updated_at:
              new Date()
                .toISOString()
          };

          writeDrafts(
            user.id,
            drafts
          );

          return null;
        });
    },

    clearProgress: function (
      challenge
    ) {
      if (!challenge) {
        return Promise.resolve();
      }

      return ensureUser()
        .then(function (user) {
          var drafts =
            readDrafts(user.id);

          delete drafts[
            String(challenge)
          ];

          writeDrafts(
            user.id,
            drafts
          );

          return null;
        });
    },

    // --------------------------------------------------------- feedback --

    saveFeedback: function (
      attemptId,
      accuracyRating,
      comment
    ) {
      if (!attemptId) {
        return Promise.reject(
          apiError(
            400,
            null,
            'failed'
          )
        );
      }

      return authed(
        rest + '/feedback',
        {
          method: 'POST',

          body: {
            attempt_id:
              attemptId,

            accuracy_rating:
              accuracyRating,

            comment:
              String(
                comment || ''
              )
          },

          prefer:
            'return=minimal'
        }
      );
    },

    // ----------------------------------------------------- AI recommendation --

    recommendMajors: function (body) {
      return authed(
        '/functions/v1/recommend',
        {
          method: 'POST',
          body: body
        }
      );
    }

  };
})();