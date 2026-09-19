// Local interaction check for the optional post-registration profile step.
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');
const { CHROME } = require('./paths');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true, args: ['--no-sandbox']
  });
  let profile = {
    id: '00000000-0000-0000-0000-000000000000',
    profile_completed: false, profile_skipped: false
  };
  let patchBody = null;
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
      if (url.includes('/rest/v1/profiles') && req.method() === 'GET')
        return req.respond({status: 200, headers: {'Access-Control-Allow-Origin': 'http://localhost:8765'}, contentType: 'application/json', body: JSON.stringify([profile])});
      if (url.includes('/rest/v1/profiles') && req.method() === 'PATCH') {
        patchBody = JSON.parse(req.postData() || '{}');
        profile = Object.assign({}, profile, patchBody);
        return req.respond({status: 204, headers: {'Access-Control-Allow-Origin': 'http://localhost:8765'}, body: ''});
      }
      return req.respond({status: 200, headers: {'Access-Control-Allow-Origin': 'http://localhost:8765'}, contentType: 'application/json', body: '[]'});
    });
    await page.evaluateOnNewDocument(() => {
      localStorage.clear();
      localStorage.setItem('naseebmind_session_v1', JSON.stringify({
        access: 'stub', refresh: 'stub',
        expires: Math.floor(Date.now() / 1000) + 3600,
        user: {id: '00000000-0000-0000-0000-000000000000', email: 'student@example.com'}
      }));
    });
    await page.goto('http://localhost:8765/test.html', {waitUntil: 'networkidle0'});
    await page.waitForSelector('#profileDialog');
    assert.equal(await page.$$eval('#profileDialog input', els => els.length), 7);
    await page.click('#profileLater');
    await page.waitForFunction(() => !document.querySelector('#profileDialog'));
    await page.click('.chgo');
    await page.waitForSelector('#profileDialog');
    await page.type('#profileFirst', 'Rahim');
    await page.type('#profileLast', 'Raximov');
    await page.type('#profileCountry', 'O‘zbekiston');
    await page.type('#profileRegion', 'Toshkent');
    await page.type('#profileDistrict', 'Chilonzor');
    await page.type('#profileSchool', '12-maktab');
    await page.type('#profileGrade', '9-sinf');
    await page.click('#profileSave');
    await page.waitForFunction(() => !document.querySelector('#profileDialog'));
    assert.equal(patchBody.first_name, 'Rahim');
    assert.equal(patchBody.last_name, 'Raximov');
    assert.equal(patchBody.school, '12-maktab');
    assert.equal(patchBody.grade, '9-sinf');
    assert.equal(patchBody.profile_completed, true);
    assert.equal(patchBody.profile_skipped, false);
    assert.equal(await page.$('#profileDialog'), null);
    assert.equal(await page.$eval('[data-acct] .acctnm', el => el.textContent), 'Rahim Raximov');
    console.log('PASS profile onboarding: postpone blocks tests, required fields save, closes');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
