// Local-only visual and interaction checks; account/network calls are stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const { CHROME } = require('./paths');

(async () => {
  const browser = await puppeteer.launch({executablePath:CHROME,headless:true,args:['--no-sandbox']});
  const out = path.join(__dirname,'build','challenge-design');
  fs.mkdirSync(out,{recursive:true});
  try {
    for (const lang of ['uz','ru','en']) for (const width of [1280,390]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror',e=>errors.push(e.message));
      await page.setViewport({width,height:960});
      await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);
      await page.setRequestInterception(true);
      page.on('request',r=> {
        if (r.url().startsWith('http://localhost:8765/')) return r.continue();
        if (r.method() === 'OPTIONS')
          return r.respond({status:204,headers:{'Access-Control-Allow-Origin':'http://localhost:8765',
            'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS',
            'Access-Control-Allow-Headers':'apikey,authorization,content-type,prefer'},body:''});
        if (r.url().includes('/rest/v1/profiles') && r.method() === 'GET')
          return r.respond({status:200,headers:{'Access-Control-Allow-Origin':'http://localhost:8765'},contentType:'application/json',
            body:JSON.stringify([{id:'00000000-0000-0000-0000-000000000000',profile_completed:true,profile_skipped:false}])});
        return r.respond({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'[]'});
      });
      await page.evaluateOnNewDocument(()=> {
        localStorage.clear();
        localStorage.setItem('naseebmind_session_v1',JSON.stringify({access:'stub',refresh:'stub',expires:Math.floor(Date.now()/1000)+3600,user:{id:'00000000-0000-0000-0000-000000000000',email:'student@example.com'}}));
      });
      await page.goto('http://localhost:8765/test.html?lang='+lang,{waitUntil:'networkidle0'});
      await page.waitForSelector('.chcard');
      await page.evaluate(async()=>{
        for(const img of document.querySelectorAll('.chart')){
          img.scrollIntoView();
          await img.decode();
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        }
        window.scrollTo(0,0);
      });
      const layout = await page.evaluate(()=>({
        cards:document.querySelectorAll('.chcard').length,
        images:Array.from(document.querySelectorAll('.chart')).every(i=>i.complete&&i.naturalWidth>0),
        overflow:document.documentElement.scrollWidth>innerWidth,
        untranslated:document.querySelector('.chlist').textContent.includes('hubBrief_'),
        columns:getComputedStyle(document.querySelector('.chlist')).gridTemplateColumns.split(' ').length,
        count:document.querySelector('.hubcount').textContent.trim(),
        clipped:Array.from(document.querySelectorAll('.chbody')).some(e=>e.scrollWidth>e.clientWidth+1)
      }));
      assert.equal(layout.cards,6); assert.ok(layout.images); assert.ok(!layout.overflow);
      assert.ok(!layout.untranslated); assert.ok(!layout.clipped);
      assert.equal(layout.columns,width>700?2:1); assert.ok(layout.count.startsWith('0 / 6'));
      await page.screenshot({path:path.join(out,lang+'-'+width+'.png'),fullPage:width<700});
      // Clicking the image must activate the same native button as clicking Start.
      const image = await page.$('.chart');
      const box = await image.boundingBox();
      await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
      await page.waitForSelector('.item');
      assert.equal(await page.evaluate(()=>state.challenge),'personality');
      await page.evaluate(()=>{
        state.answers[0]=3;
        const c=challengeBy('workimportance');
        c.plan().forEach(i=>{state.answers[i]=3;});
        backToHub();
      });
      assert.equal(await page.$$eval('.chprogress',es=>es.length),1);
      assert.equal(await page.$$eval('.hubdots .is-done',es=>es.length),1);
      assert.ok(await page.$eval('.hubcount',e=>e.textContent.trim().startsWith('1 / 6')));
      assert.equal(await page.$$eval('.chcard.is-done',es=>es.length),1);
      assert.ok(await page.$('.rsum'), 'results appear after a challenge is completed');
      if(lang==='uz'&&width===1280){
        await page.screenshot({path:path.join(out,'progress.png'),fullPage:true});
        await page.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));
        await page.screenshot({path:path.join(out,'dark.png'),fullPage:true});
      }
      assert.deepEqual(errors,[]);
      console.log('PASS '+lang+' '+width+': layout, images, image click, partial progress, completion');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
