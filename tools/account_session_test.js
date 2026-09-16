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

  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
  };
  const fetchStub = () => Promise.resolve(new Response('{"message":"JWT invalid"}', { status }));
  const location = { hash: '', pathname: '/test.html', search: '' };

  const account = new Function(
    'localStorage', 'fetch', 'location', 'history', 'document', 'navigator',
    SRC + '; return NMAccount;'
  )(localStorage, fetchStub, location, { replaceState() {} }, { title: '' }, { onLine: true });

  return { account, signed: () => store[SESSION_KEY] !== undefined };
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

  console.log('account session: stale token signs out, server error does not');
})();
