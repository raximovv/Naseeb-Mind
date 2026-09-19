const puppeteer=require('puppeteer-core');
const { settleFigureChoice } = require('./figure_choice');
const { CHROME } = require('./paths');
let pass=0,fail=0;
const ok=(c,m)=>{c?(pass++,console.log('  PASS '+m)):(fail++,console.log('  FAIL '+m));};
(async()=>{
// Headless Chrome here prefers dark; this pins the browser to light so the
// harness tests one known theme. tools/darkmode.js covers the other.
 const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--no-sandbox', '--blink-settings=preferredColorScheme=1']});
 const p=await b.newPage(); await p.setViewport({width:390,height:844});
 const posts=[]; const errs=[];
 await p.setRequestInterception(true);
 p.on('request',r=>{ if(r.url().indexOf('script.google.com')!==-1){posts.push(r.postData());return r.respond({status:200,body:'{"ok":true}'});} r.continue(); });
 p.on('pageerror',e=>errs.push(String(e)));
 await p.goto('http://localhost:8765/test.html',{waitUntil:'networkidle2'});
 await p.evaluate(()=>localStorage.clear()); await p.reload({waitUntil:'networkidle2'});
 await p.evaluate(()=>{state.name='Dilnoza';state.age='15';
   state.answers=ITEMS.map((x,i)=>(i%5)+1); renderReport();});
 await settleFigureChoice(p);   // the report only paints once the figure is chosen
 await new Promise(r=>setTimeout(r,600));
 const research=posts.filter(x=>(x||'').indexOf('"research"')!==-1).map(JSON.parse);
 const completed=posts.filter(x=>(x||'').indexOf('"completed"')!==-1).map(JSON.parse);
 ok(errs.length===0,'no JS errors ('+(errs[0]||'none')+')');
 ok(research.length===1,'answers saved automatically, exactly once');
 ok(completed.length===1,'the anonymous summary row still sent');
 const r=research[0];
 // One character per item in the bank, personality AND career. Read from the
 // page rather than hard-coded, so adding items to either section does not
 // silently start dropping them from the research row -- which is the data the
 // local norms will eventually be built from.
 const nItems=await p.evaluate(()=>ITEMS.length);
 const nCareer=await p.evaluate(()=>CAREER_COUNT);
 ok(typeof r.answers==='string'&&r.answers.length===nItems,
    'every answer present ('+((r.answers||'').length)+' of '+nItems+')');
 ok(nCareer>0&&r.answers.slice(-nCareer).replace(/0/g,'').length>0,
    'the career answers are in the research row too');
 ok(!('name' in r)&&JSON.stringify(r).indexOf('Dilnoza')===-1,'no name in the row');
 ok(!('email' in r),'no email in the row');
 ok(r.id!==completed[0].id&&/^r-/.test(r.id),'separate random id, cannot be joined: '+r.id);
 ok(!(await p.$('#rsch')),'consent card is gone from the page');
 // taking it twice must not double-send from one page view
 await p.evaluate(()=>renderReport());
 await new Promise(r=>setTimeout(r,300));
 ok(posts.filter(x=>(x||'').indexOf('"research"')!==-1).length===1,'re-rendering does not send twice');
 await b.close();
 console.log('\n'+(fail?'FAILED '+fail:'ALL '+pass+' CHECKS PASSED'));
 process.exit(fail?1:0);
})();
