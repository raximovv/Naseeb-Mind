// Local interaction check for the email confirmation-code flow.
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const { CHROME } = require('./paths');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true, args: ['--no-sandbox']
  });
  let verifyBody = null;
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => {
      const url = req.url();
      if (url.startsWith('http://localhost:8765/')) return req.continue();
      if (req.method() === 'OPTIONS')
        return req.respond({status: 204, headers: {
          'Access-Control-Allow-Origin': 'http://localhost:8765',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'apikey,authorization,content-type,prefer'
        }, body: ''});
      if (url.includes('/auth/v1/signup'))
        return req.respond({status: 200, headers: {'Access-Control-Allow-Origin': 'http://localhost:8765'},
          contentType: 'application/json', body: JSON.stringify({user:{id:'00000000-0000-0000-0000-000000000000'}})});
      if (url.includes('/auth/v1/verify')) {
        verifyBody = JSON.parse(req.postData() || '{}');
        return req.respond({status: 200, headers: {'Access-Control-Allow-Origin': 'http://localhost:8765'},
          contentType: 'application/json', body: JSON.stringify({
            access_token:'stub-access', refresh_token:'stub-refresh', expires_in:3600,
            user:{id:'00000000-0000-0000-0000-000000000000',email:'student@example.com'}
          })});
      }
      if (url.includes('/rest/v1/profiles') && req.method() === 'GET')
        return req.respond({status: 200, headers: {'Access-Control-Allow-Origin': 'http://localhost:8765'},
          contentType: 'application/json', body: JSON.stringify([{id:'00000000-0000-0000-0000-000000000000',profile_completed:false,profile_skipped:false}])});
      return req.respond({status: 200, headers: {'Access-Control-Allow-Origin': 'http://localhost:8765'},
        contentType: 'application/json', body: '[]'});
    });
    await page.evaluateOnNewDocument(() => localStorage.clear());
    await page.goto('http://localhost:8765/test.html?auth=signup', {waitUntil: 'networkidle0'});
    await page.waitForSelector('#authForm');
    await page.type('#authEmail', 'student@example.com');
    await page.type('#authPass', 'strong-pass');
    await page.click('#authGo');
    await page.waitForSelector('#authCodeInput');
    await page.type('#authCodeInput', '123456');
    await page.click('#authCodeGo');
    await page.waitForSelector('#profileDialog');
    assert.deepEqual(verifyBody, {email:'student@example.com', token:'123456', type:'email'});
    console.log('PASS email OTP: signup opens code form and verification creates session');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
