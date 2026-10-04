// The save without a store: a copy with no db (localOnly) saves by publishing
// the whole document, and the runtime reloads every open view onto it. Every
// other browser suite runs this path to get its saves; this one checks the
// path itself: one publish at a time, a refusal retried and shown, a publish
// that throws, a tap made while one is out, and what the view was in the middle
// of (the session screen, a half-added sauna visit, the shopping box) carried
// across the reload, with web storage and without it.
//
// Usage: node test-publish.js [document]   (defaults to build-publish.js's output)
var http=require('http'), fs=require('fs'), assert=require('assert');
var env=require('./test-env.js');
// The sauna card is a Log sauna button until it is opened (and stays open).
async function openSauna(q){ var b=await q.$('[data-action="toggleex"][data-id="sauna"][aria-expanded="false"]'); if(b){ await b.click(); await q.waitForSelector('#sauna-mins'); } }
var base=env.localOnly(process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):env.readDoc());

// The faithful stub: a publish saves the document AND reloads the page onto
// it. The harness can hold a publish (holdMs) to make one overlap a tap, and
// counts how many are out at once at the server: the page makes one request
// per publish, well under the browser's six connections to a host.
var FAITHFUL='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(r){ if(!r.ok) throw {code:"unavailable"}; setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
// Stubs that live in the page, for publishes that fail in the page itself.
function inPage(publish,use){ return '<script>window.__pubs=0;window.claude={use:function(n){'+(use||'')+
  'return Promise.resolve(n==="artifact"?{publish:function(d){window.__pubs++;'+publish+'}}:null);}};<\/script>'; }
var cfg={shim:FAITHFUL, holdMs:0}, doc=base, pubs=0, inflight=0, peak=0, loads=0;
function reset(shim,holdMs){ cfg.shim=shim||FAITHFUL; cfg.holdMs=holdMs||0; doc=base; pubs=0; inflight=0; peak=0; loads=0; }
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){ var c=[]; pubs++; inflight++; peak=Math.max(peak,inflight);
    q.on('data',function(x){ c.push(x); });
    q.on('end',function(){ setTimeout(function(){ doc=Buffer.concat(c).toString(); inflight--; r.end('ok'); },cfg.holdMs); });
    return; }
  if(q.url!=='/'){ r.statusCode=404; return r.end(); }
  loads++;
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+cfg.shim);
  r.setHeader('content-type','text/html; charset=utf-8'); r.setHeader('content-length',Buffer.byteLength(out)); r.end(out);
});
var NO_STORAGE=function(){ ['localStorage','sessionStorage'].forEach(function(k){
  Object.defineProperty(window,k,{get:function(){ throw new Error('denied'); }}); }); };
var cases=[];
var wait=function(ms){ return new Promise(function(r){ setTimeout(r,ms); }); };

srv.listen(0,async function(){
  var url='http://127.0.0.1:'+srv.address().port+'/';
  var b=await env.launch(), fails=0;
  var t=async function(name,fn){ try{ await fn(); console.log('  PASS  '+name); }catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+(e&&e.message)); } };
  async function open(o){
    o=o||{}; reset(o.shim,o.holdMs);
    var ctx=await b.newContext({viewport:{width:420,height:900}}), p=await ctx.newPage();
    p.setDefaultTimeout(15000);
    if(o.noStorage) await p.addInitScript(NO_STORAGE);
    p.errs=[]; p.on('pageerror',function(e){ p.errs.push(e.message); });
    await p.goto(url); await p.waitForSelector('#app .wrap'); await p.waitForTimeout(400);
    var back=await p.$('[data-action="cancelsession"]'); if(back){ await back.click(); await p.waitForTimeout(200); }
    return p;
  }
  // Until the page has been reloaded onto a publish, and is ready again.
  async function reloaded(p,n0){
    for(var i=0;loads<=n0;i++){ if(i>400) throw new Error('no publish and reload came'); await wait(50); }
    await p.waitForSelector('#app .wrap:not(.held)');
  }
  var water=function(p){ return p.evaluate(function(){
    var c=[].filter.call(document.querySelectorAll('.card'),function(x){ return /Water/.test((x.querySelector('h3')||{}).textContent); })[0];
    return c.querySelector('.count').textContent.trim(); }); };
  var savedWater=function(){ var st=env.seedOf(doc), k=Object.keys(st.days||{}).sort().pop(); return k?st.days[k].water||0:0; };
  var tapWater=function(p){ return p.click('[data-action="tab"][data-tab="today"]').then(function(){ return p.click('[data-action="water"][data-d="1"]'); }); };

  console.log('\nONE PUBLISH AT A TIME');

  await t('three taps 1.3s apart against a 3s publish never have two publishes out at once', async function(){
    var p=await open({holdMs:3000});
    await tapWater(p); await p.waitForTimeout(1300);
    await p.click('[data-action="water"][data-d="1"]').catch(function(){}); await p.waitForTimeout(1300);
    await p.click('[data-action="water"][data-d="1"]').catch(function(){}); await p.waitForTimeout(4000);
    assert.strictEqual(peak,1,peak+' publishes were out at once, so the older copy can land last');
    assert.deepStrictEqual(p.errs,[]);
    await p.context().close();
  });

  await t('a publish refused as unavailable is tried again, and a banner says so', async function(){
    var p=await open({shim:inPage('return Promise.reject({code:"unavailable"});')});
    await tapWater(p); await p.waitForTimeout(6000);
    var n=await p.evaluate('__pubs');
    assert.ok(n>=2,'published '+n+' time(s): a refusal was never tried again');
    var banners=await p.$$eval('.banner',function(x){ return x.map(function(e){ return e.textContent; }); });
    assert.ok(banners.some(function(x){ return /Trying again/.test(x); }),'no banner: '+banners.join(' | '));
    assert.strictEqual(await p.textContent('#savepill'),'Not saved, retrying');
    assert.deepStrictEqual(p.errs,[]);
    await p.context().close();
  });

  await t('a conflict stops publishing over the newer copy and offers Reload', async function(){
    var p=await open({shim:inPage('return Promise.reject({code:"conflict"});')});
    await tapWater(p); await p.waitForTimeout(2000);
    var banners=await p.$$eval('.banner',function(x){ return x.map(function(e){ return e.textContent; }); });
    assert.ok(banners.some(function(x){ return /newer copy/.test(x) && /Reload/.test(x); }),'no conflict banner: '+banners.join(' | '));
    await p.click('[data-action="water"][data-d="1"]'); await p.waitForTimeout(2500);
    assert.strictEqual(await p.evaluate('__pubs'),1,'it published over the newer copy anyway');
    await p.context().close();
  });

  await t('a publish that throws leaves no saving pill on and nothing uncaught', async function(){
    var p=await open({shim:inPage('throw new Error("boom");')});
    await tapWater(p); await p.waitForTimeout(2500);
    var pill=await p.textContent('#savepill');
    assert.notStrictEqual(pill,'saving…','the saving pill stayed on for good');
    assert.deepStrictEqual(p.errs,[],'uncaught: '+p.errs.join(' | '));
    await p.context().close();
  });

  await t('an artifact capability that will not load leaves nothing uncaught either', async function(){
    var p=await open({shim:inPage('',"if(n==='artifact') return Promise.reject(new Error('no artifact'));")});
    await tapWater(p); await p.waitForTimeout(2500);
    assert.notStrictEqual(await p.textContent('#savepill'),'saving…','the saving pill stayed on for good');
    assert.deepStrictEqual(p.errs,[],'uncaught: '+p.errs.join(' | '));
    await p.context().close();
  });

  console.log('\nA TAP WHILE A PUBLISH IS OUT');

  await t('a tap made while a publish is out is not drawn and then thrown away by the reload', async function(){
    var p=await open({holdMs:1500});
    var n0=loads;
    await tapWater(p); await p.waitForTimeout(1200);
    var heldThen=await p.evaluate(function(){ return !!document.querySelector('#app .wrap.held'); });
    await p.click('[data-action="water"][data-d="1"]'); await p.waitForTimeout(100);
    var drawn=await water(p);
    await reloaded(p,n0); await p.waitForTimeout(1500);
    var shown=await water(p), saved=savedWater();
    // Either both taps count, or the second was visibly refused: the controls
    // were held, and the page never drew a count it was about to lose.
    assert.ok(saved===2 || (heldThen && saved===1 && drawn===shown),
      'drawn '+drawn+' after the second tap, '+shown+' after the reload, '+saved+' cup(s) saved, held: '+heldThen);
    assert.strictEqual(shown,saved===2?'0.5L':'0.25L','the page shows '+shown+' with '+saved+' cup(s) saved');
    assert.deepStrictEqual(p.errs,[]);
    await p.context().close();
  });

  console.log('\nWHAT THE VIEW WAS DOING SURVIVES THE RELOAD');

  async function logSet(p){
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(200);
    await p.click('[data-action="startworkout"]'); await p.waitForTimeout(300);
    for(var i=0;i<6 && !(await p.$('[data-action="logset"]'));i++){ await p.click('[data-action="nextslide"]'); await p.waitForTimeout(150); }
    var v=await p.$('[id^="log-v-"]'); if(v) await v.fill('8');
    var w=await p.$('[id^="log-w-"]'); if(w) await w.fill('20');
    var title=await p.textContent('.story-title'), n0=loads;
    await p.click('[data-action="logset"]');
    await reloaded(p,n0); await p.waitForTimeout(300);
    return title;
  }
  [false,true].forEach(function(blocked){ cases.push(async function(){
    await t('logging a set keeps the page in the session, on the same slide'+(blocked?', with web storage blocked':''), async function(){
      var p=await open({noStorage:blocked});
      var title=await logSet(p);
      var now=await p.$('.story-title'); now=now&&await now.textContent();
      assert.strictEqual(now,title,'after the reload the page is on '+(now||'no session screen'));
      if(!blocked) assert.ok(!('_view' in env.seedOf(doc)),'a view with storage wrote its place into the document');
      assert.deepStrictEqual(p.errs,[]);
      await p.context().close();
    });
  }); });
  [false,true].forEach(function(blocked){ cases.push(async function(){
    await t('a stint already added, its temperature and the shopping box stay'+(blocked?', with web storage blocked':''), async function(){
      var p=await open({noStorage:blocked});
      await p.click('[data-action="tab"][data-tab="meals"]'); await p.fill('#shop-add','Bin ba');
      await p.click('[data-action="tab"][data-tab="today"]');
      await openSauna(p); await p.fill('#sauna-mins','15'); await p.fill('#sauna-temp','90'); await p.click('[data-action="addstint"]'); await p.waitForTimeout(200);
      assert.strictEqual(await p.$$eval('.setchip',function(x){ return x.length; }),1);
      var n0=loads;
      await p.click('[data-action="water"][data-d="1"]');
      await reloaded(p,n0); await p.waitForTimeout(300);
      assert.strictEqual(await p.$$eval('.setchip',function(x){ return x.length; }),1,'the stint added was wiped');
      assert.strictEqual(await p.inputValue('#sauna-temp'),'90','the temperature was wiped');
      await p.click('[data-action="tab"][data-tab="meals"]');
      assert.strictEqual(await p.inputValue('#shop-add'),'Bin ba','what was typed in the shopping box was wiped');
      await p.click('[data-action="tab"][data-tab="today"]');
      await p.click('[data-action="logsauna"]'); await p.waitForTimeout(200);
      assert.strictEqual(await p.$$eval('.setchip',function(x){ return x.length; }),0,'logging did not take the stints');
      assert.deepStrictEqual(p.errs,[]);
      await p.context().close();
    });
  }); });
  for(var i=0;i<cases.length;i++) await cases[i]();

  await b.close(); srv.close();
  console.log(fails?'\nFAILING\n':'\nAll publish checks pass.\n');
  process.exit(fails?1:0);
});
