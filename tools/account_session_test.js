// A token the server refuses must end the session, not retry forever.
//
// After the Supabase project moved, every signed-in student carried an
// unexpired token from the OLD project: fresh() saw a valid expiry and never
// refreshed, PostgREST answered 401, and the page showed "Saqlab boʻlmadi" on
// every attempt with nothing telling them to sign in again.
//
//   node tools/account_session_test.js

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'account.js'), 'utf8');
const SESSION_KEY = 'naseebmind_session_v1';

function load(status) {
  const store = {};
  store[SESSION_KEY] = JSON.stringify({
    access: 'stale-token-from-the-old-project',
    refresh: 'r',
    expires: Math.floor(Date.now() / 1000) + 3600,   // still valid: no refresh
    user: { id: 'u1', email: 'a@b.c' },
  });
  const fetchStub = () => Promise.resolve(new Response('{"message":"JWT invalid"}', { status }));
  return { account: make(store, fetchStub), signed: () => store[SESSION_KEY] !== undefined };
}

function make(store, fetchStub) {
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  const location = { hash: '', pathname: '/test.html', search: '' };
  return new Function(
    'localStorage', 'fetch', 'location', 'history', 'document', 'navigator',
    SRC + '; return NMAccount;'
  )(localStorage, fetchStub, location, { replaceState() {} }, { title: '' }, { onLine: true });
}

(async () => {
  // 401: the stored session is dropped, so the page can ask for a new sign-in.
  const gone = load(401);
  assert.ok(gone.signed(), 'starts signed in');
  await gone.account.setProfile({ grade: '11' }).then(
    () => assert.fail('a 401 must reject'),
    (e) => assert.equal(e.code, 'signed-out')
  );
  assert.ok(!gone.signed(), '401 must clear the stored session');

  // 500: the server is having a bad day. The student stays signed in.
  const kept = load(500);
  await kept.account.setProfile({ grade: '11' }).then(
    () => assert.fail('a 500 must reject'),
    (e) => assert.equal(e.status, 500)
  );
  assert.ok(kept.signed(), 'a 500 must NOT sign the student out');


  // Expired token, attempts + profile at once: ONE refresh, and the session
  // survives. Two refreshes spent the rotated token and the 400 signed out.
  {
    const store = {};
    const expired = { access: 'old', refresh: 'r1', expires: 0, user: { id: 'u1', email: '' } };
    store[SESSION_KEY] = JSON.stringify(expired);
    let refreshes = 0;
    const fetchStub = (url) => {
      if (url.includes('grant_type=refresh_token')) {
        refreshes++;
        return Promise.resolve(refreshes === 1
          ? new Response(JSON.stringify({ access_token: 'new', refresh_token: 'r2', expires_in: 3600, user: { id: 'u1' } }), { status: 200 })
          : new Response('{"msg":"Invalid Refresh Token: Already Used"}', { status: 400 }));
      }
      return Promise.resolve(new Response('[]', { status: 200 }));
    };
    const account = make(store, fetchStub);
    await Promise.all([account.attempts(), account.profile()]);
    assert.equal(refreshes, 1, 'parallel calls must share one refresh');
    assert.equal(JSON.parse(store[SESSION_KEY]).refresh, 'r2', 'renewed session is kept');

    // Another tab already rotated r1 -> r2 while this tab still holds r1 in
    // memory: this tab must use r2, not spend r1 and sign out.
    const tab = make(Object.assign(store, { [SESSION_KEY]: JSON.stringify(expired) }), fetchStub);
    store[SESSION_KEY] = JSON.stringify({ access: 'new', refresh: 'r2', expires: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u1' } });
    await tab.attempts();
    assert.equal(refreshes, 1, 'stored fresh session is used, no refresh');
    assert.ok(store[SESSION_KEY], 'still signed in');
  }

  console.log('account session: stale token signs out, server error does not, refresh is shared');
})();
