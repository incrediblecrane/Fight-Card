// The undo offer: what one Undo puts back, where it is kept, what it applies
// to, how it is announced, and that the toast never sits over the page. Run
// on a phone-sized touch context against a db stub, so a save does not reload.
var http=require('http'),assert=require('assert');
var env=require('./test-env.js');
var doc=env.readDoc();
var store={}, calls={set:0,del:0};
var SHIM=`<script>(function(){
  function deepFreeze(v){ if(v===null||typeof v!=='object') return v;
    Object.keys(v).forEach(function(k){ deepFreeze(v[k]); }); return Object.freeze(v); }
  window.__db={inflight:0};
  function post(op,body){
    if(op==='set'||op==='del') window.__db.inflight++;
    return fetch('/db/'+op,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){ if(op==='set'||op==='del') window.__db.inflight--; return r.json(); })
      .then(function(j){ if(j && j.err) throw {code:j.err, message:'stub refused '+op}; return j; });
  }
  function docRef(path){ var segs=path.split('/');
    return { id:segs[segs.length-1], path:path,
      get:function(){ return post('get',{path:path}).then(function(r){ var body=deepFreeze(r.data);
        return {id:segs[segs.length-1], exists:r.exists, data:function(){ return body; }, metadata:{fromCache:false,hasPendingWrites:false}}; }); },
      set:function(data){ return post('set',{path:path,data:data}).then(function(){}); },
      update:function(data){ return post('update',{path:path,data:data}).then(function(){}); },
      delete:function(){ return post('del',{path:path}).then(function(){}); } }; }
  function collRef(path){ return { path:path, doc:function(id){ return docRef(path+'/'+id); },
      get:function(){ return post('coll',{path:path}).then(function(r){
        return {size:r.docs.length, empty:!r.docs.length,
          docs:r.docs.map(function(d){ var body=deepFreeze(d.data);
            return {id:d.id, exists:true, data:function(){return body;}, metadata:{fromCache:false,hasPendingWrites:false}}; }),
          docChanges:function(){return [];}, metadata:{fromCache:false,hasPendingWrites:false}}; }); } }; }
  var DB={doc:docRef, collection:collRef};
  var ART={publish:function(h){ return fetch('/publish',{method:'POST',body:h})
      .then(function(){ setTimeout(function(){location.reload();},0); }); }};
  window.claude={use:function(n){ return Promise.resolve(n==='db'?DB:(n==='artifact'?ART:null)); }};
})();<\/script>`;
function srvJson(r,body){ var b=JSON.stringify(body); r.setHeader('content-type','application/json'); r.end(b); }
function alpha(v){ if(v===null||typeof v!=='object') return v; if(Array.isArray(v)) return v.map(alpha);
  var o={}; Object.keys(v).sort().forEach(function(k){ o[k]=alpha(v[k]); }); return o; }
var srv=http.createServer(function(q,r){
  if(q.url.indexOf('/db/')===0 || q.url==='/publish'){
    var c=[]; q.on('data',function(x){c.push(x);});
    q.on('end',function(){
      if(q.url==='/publish'){ doc=Buffer.concat(c).toString(); return r.end('ok'); }
      var body=JSON.parse(Buffer.concat(c).toString()||'{}'), op=q.url.slice(4), has=Object.prototype.hasOwnProperty.call(store,body.path);
      if(op==='get') return srvJson(r,{exists:has, data:alpha(store[body.path])});
      if(op==='set'){ calls.set++; store[body.path]=body.data; return setTimeout(function(){ srvJson(r,{ok:1}); },10); }
      if(op==='update'){ calls.set++; if(!has) return srvJson(r,{err:'invalid_argument'});
        store[body.path]=Object.assign({},store[body.path],body.data); return srvJson(r,{ok:1}); }
      if(op==='del'){ calls.del++; delete store[body.path]; return srvJson(r,{ok:1}); }
      if(op==='coll'){ var pre=body.path+'/';
        return srvJson(r,{docs:Object.keys(store).filter(function(k){ return k.indexOf(pre)===0 && k.slice(pre.length).indexOf('/')<0; })
          .sort().map(function(k){ return {id:k.slice(pre.length), data:alpha(store[k])}; })}); }
      return srvJson(r,{});
    });
    return;
  }
  var out=doc.replace(/<link rel="stylesheet"[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8'); r.end(out);
});
srv.listen(0,async function(){
  var b=await env.launch(), url='http://127.0.0.1:'+srv.address().port+'/';
  var fails=0, errs=[];
  var t=async function(name,fn){ if(process.env.ONLY && !new RegExp(process.env.ONLY).test(name)) return; try{ await fn(); console.log('  PASS  '+name); }catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } };
  // A fresh store and a fresh tab for every check, so no undo carries over.
  var page=async function(init){
    Object.keys(store).forEach(function(k){ delete store[k]; });
    var ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    var p=await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror',function(e){ errs.push(e.message); });
    if(init) await p.addInitScript(init);
    // A save waits a second for more taps before it goes.
    p.settle=async function(){
      await p.waitForTimeout(1200);
      await p.waitForFunction(function(){ return !/loading your data/.test(document.body.innerText) && !(window.__db && window.__db.inflight); });
      for(var n=-1,k=0; k<40 && n!==calls.set+calls.del; k++){ n=calls.set+calls.del; await p.waitForTimeout(200); }
    };
    p.tab=async function(n){ await p.evaluate(function(n){ var c=document.querySelector('[data-action="cancelsession"]'); if(c) c.click();
      document.querySelector('[data-action="tab"][data-tab="'+n+'"]').click(); },n); await p.waitForTimeout(200); };
    p.tap=function(sel){ return p.evaluate(function(s){ var e=document.querySelector(s); if(!e) return false; e.click(); return true; },sel); };
    p.count=function(sel){ return p.locator(sel).count(); };
    p.done=function(){ return ctx.close(); };
    await p.goto(url); await p.settle();
    return p;
  };
  // A real finger on the middle of whatever matches, twice on the same spot.
  var spotOf=async function(p,loc){ await loc.scrollIntoViewIfNeeded(); var bx=await loc.boundingBox(); return {x:bx.x+bx.width/2,y:bx.y+bx.height/2}; };
  var twice=async function(p,pt,gap){ await p.touchscreen.tap(pt.x,pt.y); await p.waitForTimeout(gap); await p.touchscreen.tap(pt.x,pt.y); await p.waitForTimeout(300); };

  console.log('\nONE UNDO PUTS BACK EVERYTHING A QUICK RUN OF TAPS TOOK');
  await t('two taps on a recipe\'s x, a moment apart, and one Undo brings both recipes back', async function(){
    var p=await page(); await p.tab('meals');
    var n0=await p.count('[data-action="delrecipe"]');
    await twice(p,await spotOf(p,p.locator('[data-action="delrecipe"]').nth(5)),600);
    assert.strictEqual(await p.count('[data-action="delrecipe"]'),n0-2,'two taps did not take two recipes');
    await p.locator('.undo-bar [data-action="undo"]').tap(); await p.settle();
    assert.strictEqual(await p.count('[data-action="delrecipe"]'),n0,'after Undo there are '+(await p.count('[data-action="delrecipe"]'))+' of '+n0+' recipes');
    assert.strictEqual(await p.count('.undo-bar'),0,'the offer outlived its undo');
    await p.done();
  });
  await t('a second tap on the same spot straight after the first removes nothing more', async function(){
    var p=await page(); await p.tab('meals');
    var n0=await p.count('[data-action="delrecipe"]');
    await twice(p,await spotOf(p,p.locator('[data-action="delrecipe"]').nth(5)),150);
    assert.strictEqual(await p.count('[data-action="delrecipe"]'),n0-1,'a double tap took '+(n0-(await p.count('[data-action="delrecipe"]')))+' recipes');
    await p.done();
  });
  await t('two taps on a planned meal\'s x, and one Undo brings all three meals back', async function(){
    var p=await page(); await p.tab('meals');
    for(var k=0;k<3;k++){ await p.locator('[data-action="addmeal"]').nth(k).tap(); await p.waitForTimeout(250); }
    await p.settle(); await p.evaluate(function(){ scrollTo(0,0); });
    assert.strictEqual(await p.count('[data-action="delmeal"]'),3,'three meals were not planned');
    await twice(p,await spotOf(p,p.locator('[data-action="delmeal"]').first()),600);
    assert.strictEqual(await p.count('[data-action="delmeal"]'),1,'two taps did not take two meals');
    await p.locator('.undo-bar [data-action="undo"]').tap(); await p.settle();
    assert.strictEqual(await p.count('[data-action="delmeal"]'),3,'after Undo there are '+(await p.count('[data-action="delmeal"]'))+' meals');
    await p.done();
  });

  console.log('\nUNDO WITHOUT BROWSER STORAGE');
  await t('with storage blocked, removing a sauna visit still offers Undo, and Undo works', async function(){
    var p=await page('(function(){ var no=function(){ throw new DOMException("blocked","SecurityError"); };'+
      ' Object.defineProperty(window,"sessionStorage",{get:no,configurable:true}); Object.defineProperty(window,"localStorage",{get:no,configurable:true}); })();');
    await p.tab('progress');
    var id=await p.evaluate(function(){ var e=document.querySelector('[data-action="delsauna"]'); return e&&e.getAttribute('data-id'); });
    assert.ok(id,'no sauna row');
    await p.tap('.swipe-del[data-action="delsauna"][data-id="'+id+'"]'); await p.settle();
    assert.strictEqual(await p.count('[data-action="delsauna"][data-id="'+id+'"]'),0,'the visit was not removed');
    assert.strictEqual(await p.count('.undo-bar [data-action="undo"]'),1,'no undo offered');
    await p.tap('.undo-bar [data-action="undo"]'); await p.settle();
    assert.ok(await p.count('[data-action="delsauna"][data-id="'+id+'"]'),'Undo did not put the visit back');
    await p.done();
  });

  console.log('\nA HAND-ADDED SHOPPING ITEM');
  await t('removing your own shopping item, ticked, can be undone, tick and all', async function(){
    var p=await page(); await p.tab('meals');
    var add=async function(txt){ await p.fill('#shop-add',txt); await p.tap('[data-action="addextra"]'); await p.waitForTimeout(150); };
    await add('Milk'); await add('Eggs'); await p.settle();
    if(process.env.DBG) console.log(await p.evaluate(function(){ return document.querySelector('.addshop').parentNode.innerText; }), JSON.stringify(store['state/shopping']));
    var sh0=JSON.parse(JSON.stringify(store['state/shopping']||null));
    var ex=(sh0&&sh0.extras)||[]; assert.strictEqual(ex.length,2,'the items were not saved: '+JSON.stringify(sh0));
    await p.tap('[data-action="shopcheck"][data-item="x|'+ex[0].id+'"]'); await p.settle();
    sh0=JSON.parse(JSON.stringify(store['state/shopping']));
    assert.ok(sh0.checked.indexOf('x|'+ex[0].id)>-1,'the tick did not save');
    await p.tap('[data-action="delextra"][data-id="'+ex[0].id+'"]'); await p.settle();
    assert.strictEqual(store['state/shopping'].extras.length,1,'the item was not removed');
    assert.ok(await p.tap('.undo-bar [data-action="undo"]'),'no undo offered'); await p.settle();
    var sh=store['state/shopping'];
    assert.deepStrictEqual(sh.extras.map(function(x){ return x.id; }),sh0.extras.map(function(x){ return x.id; }),'the items came back in a different order');
    assert.ok(sh.checked.indexOf('x|'+ex[0].id)>-1,'the tick did not come back');
    await p.done();
  });

  console.log('\nAN UNDO BELONGS TO THE SESSION IT CAME FROM');
  await t('an exercise removed from a finished session is not offered back to the next one', async function(){
    var p=await page(); await p.tab('training');
    var wid=await p.evaluate(function(){ var b=document.querySelector('[data-action="startworkout"]'); return b.getAttribute('data-id'); });
    await p.tap('[data-action="startworkout"][data-id="'+wid+'"]'); await p.waitForTimeout(300);
    await p.tap('[data-action="openpicker"]'); await p.waitForTimeout(200);
    var added=await p.evaluate(function(){ var b=document.querySelector('[data-action="addex"]:not([data-id="superset"])'); b.click(); return b.getAttribute('data-id'); });
    await p.waitForTimeout(300);
    assert.ok(await p.tap('[data-action="removeex"][data-id="'+added+'"]'),'no Remove for the added exercise '+added); await p.waitForTimeout(300);
    assert.strictEqual(await p.count('.undo-bar'),1,'removing it offered no undo');
    // A warm-up alone is no session, so the set goes on the slide after it.
    for(var k=0;k<30;k++){ if(!(await p.tap('[data-action="prevslide"]:not([disabled])'))) break; await p.waitForTimeout(60); }
    await p.tap('[data-action="nextslide"]'); await p.waitForTimeout(200);
    await p.fill('input[id^="log-v-"]','5'); await p.locator('[data-action="logset"]').first().click(); await p.waitForTimeout(200);
    for(k=0;k<30;k++){ if(!(await p.tap('[data-action="nextslide"]'))) break; await p.waitForTimeout(60); }
    assert.ok(await p.tap('[data-action="finishworkout"]'),'never reached Finish'); await p.settle();
    await p.tab('training'); await p.tap('[data-action="startworkout"][data-id="'+wid+'"]'); await p.waitForTimeout(300);
    var bar=await p.evaluate(function(){ var e=document.querySelector('.undo-bar'); return e?e.textContent:''; });
    assert.strictEqual(bar,'','the new session offers back what was taken out of the last one: '+bar);
    await p.done();
  });

  console.log('\nTHE OFFER, TO A SCREEN READER');
  await t('the toast is not a live region, and the removal is announced once, outside the app', async function(){
    var p=await page(); await p.tab('progress');
    await p.evaluate(function(){
      var n=document.querySelector('[aria-live]:not(#savepill)'); window.__said=[];
      if(!n) return; window.__live=n;
      new MutationObserver(function(){ if(n.textContent) window.__said.push(n.textContent); }).observe(n,{childList:true,characterData:true,subtree:true});
    });
    assert.ok(await p.evaluate(function(){ var n=window.__live; return !!n && !document.getElementById('app').contains(n) && !n.textContent; }),
      'no empty live region outside #app');
    await p.tap('.swipe-del[data-action="delsauna"]'); await p.settle();
    await p.tab('today'); await p.tab('progress'); await p.waitForTimeout(200);
    var role=await p.evaluate(function(){ var e=document.querySelector('.undo-bar'); return e?[e.getAttribute('role'),e.getAttribute('aria-live')].join('|'):'none'; });
    assert.strictEqual(role,'|','the toast carries a live role: '+role);
    var said=await p.evaluate(function(){ return window.__said; });
    assert.strictEqual(said.length,1,'announced '+said.length+' times: '+said.join(' / '));
    assert.ok(/^Removed .+\. Undo available\.$/.test(said[0]),'announced "'+said[0]+'"');
    await p.tap('.undo-bar [data-action="dismissundo"]'); await p.waitForTimeout(100);
    assert.strictEqual(await p.evaluate(function(){ return window.__live.textContent; }),'','the announcement outlived the offer');
    await p.done();
  });

  console.log('\nTHE TOAST NEVER COVERS THE PAGE');
  var overlap=function(p){ return p.evaluate(function(){
    scrollTo(0,document.documentElement.scrollHeight);
    var bar=document.querySelector('.undo-bar'); if(!bar) return 'no toast';
    var u=bar.getBoundingClientRect();
    return [].slice.call(document.querySelectorAll('[data-action="datapane"]')).map(function(e){
      var r=e.getBoundingClientRect(); return (r.bottom>u.top && r.top<u.bottom && r.right>u.left && r.left<u.right)?e.textContent:''; }).join(' ').trim(); }); };
  await t('after a removal on Progress, Export and Import at the bottom are clear of the toast', async function(){
    var p=await page(); await p.tab('progress');
    await p.tap('.swipe-del[data-action="delsauna"]'); await p.settle(); await p.waitForTimeout(300);
    var o=await overlap(p);
    assert.strictEqual(o,'','the toast covers: '+o);
    var h=await p.evaluate(function(){ var r=document.querySelector('.undo-bar').getBoundingClientRect(); return r.height; });
    assert.ok(h<70,'the toast is '+h+'px tall; its buttons do not sit on its line');
    await p.done();
  });
  await t('the toast shrinks to its buttons after a few seconds and Undo still works', async function(){
    var p=await page(); await p.tab('progress');
    var id=await p.evaluate(function(){ return document.querySelector('[data-action="delsauna"]').getAttribute('data-id'); });
    await p.tap('.swipe-del[data-action="delsauna"][data-id="'+id+'"]'); await p.settle();
    var w0=await p.evaluate(function(){ return document.querySelector('.undo-bar').getBoundingClientRect().width; });
    await p.waitForTimeout(10500);
    var w1=await p.evaluate(function(){ var e=document.querySelector('.undo-bar'); return e?e.getBoundingClientRect().width:0; });
    assert.ok(w1>0 && w1<w0/2,'the toast went from '+w0+'px to '+w1+'px wide');
    assert.strictEqual(await overlap(p),'','the small toast covers Export or Import');
    await p.tap('.undo-bar [data-action="undo"]'); await p.settle();
    assert.ok(await p.count('[data-action="delsauna"][data-id="'+id+'"]'),'Undo did not put the visit back');
    await p.done();
  });

  console.log(errs.length?('  FAIL  page errors: '+errs.join(' | ')):'  PASS  no page errors');
  await b.close(); srv.close();
  console.log(fails||errs.length?'\nFAILING\n':'\nAll undo checks pass.\n');
  process.exit(fails||errs.length?1:0);
});
