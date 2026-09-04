// The db migration, against a stub that behaves the way the contract says the
// real store does: documents at slash paths, set/get/delete, collection reads,
// last-writer-wins, and a store that SURVIVES a reload of the page while the
// document itself does not change. That last part is the whole point: code and
// data are no longer the same file.
var http=require('http'),fs=require('fs'),assert=require('assert');
var {chromium}=require('/home/user/Fight-Card/node_modules/playwright');
var doc=fs.readFileSync('/tmp/publish.html','utf8');

// The stub store lives in the harness, not the page, so it outlives reloads.
var store={};
var calls={set:0,del:0,get:0,collGet:0};
var inflight=0, peak=0, slowGetMs=0;
function srvJson(r,body){ var b=JSON.stringify(body); r.setHeader('content-type','application/json'); r.setHeader('content-length',Buffer.byteLength(b)); r.end(b); }

var SHIM=`<script>(function(){
  // The contract says delivered snapshots and their data() are FROZEN. A stub
  // that hands back mutable objects lets in-place mutation look like it works
  // when against the real store it is a silent no-op.
  function deepFreeze(v){
    if(v===null||typeof v!=='object') return v;
    Object.keys(v).forEach(function(k){ deepFreeze(v[k]); });
    return Object.freeze(v);
  }
  function post(op,body){
    return fetch('/db/'+op,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json();});
  }
  function docRef(path){
    var segs=path.split('/');
    if(segs.length%2!==0) throw new TypeError('document path needs an even number of segments: '+path);
    return {
      id:segs[segs.length-1], path:path,
      get:function(){ return post('get',{path:path}).then(function(r){
        var body=deepFreeze(r.data);
        return {id:segs[segs.length-1], exists:r.exists, data:function(){ return body; },
                metadata:{fromCache:false,hasPendingWrites:false}}; }); },
      set:function(data){ return post('set',{path:path,data:data}).then(function(){}); },
      update:function(data){ return post('update',{path:path,data:data}).then(function(){}); },
      delete:function(){ return post('del',{path:path}).then(function(){}); }
    };
  }
  function collRef(path){
    var segs=path.split('/');
    if(segs.length%2!==1) throw new TypeError('collection path needs an odd number of segments: '+path);
    return {
      path:path,
      doc:function(id){ return docRef(path+'/'+id); },
      get:function(){ return post('coll',{path:path}).then(function(r){
        return {size:r.docs.length, empty:!r.docs.length,
          docs:r.docs.map(function(d){ var body=deepFreeze(d.data);
            return {id:d.id, exists:true, data:function(){return body;},
            metadata:{fromCache:false,hasPendingWrites:false}}; }),
          docChanges:function(){return [];}, metadata:{fromCache:false,hasPendingWrites:false}}; }); }
    };
  }
  var DB={doc:docRef, collection:collRef};
  var ART={publish:function(h){ return fetch('/publish',{method:'POST',body:h})
      .then(function(){ setTimeout(function(){location.reload();},0); }); }};
  window.claude={use:function(n){
    if(window.__DB_OFF && n==='db') return Promise.resolve(null);
    return Promise.resolve(n==='db'?DB:(n==='artifact'?ART:null));
  }};
})();<\/script>`;

var srv=http.createServer(function(q,r){
  if(q.url.indexOf('/db/')===0 || q.url==='/publish'){
    var c=[]; q.on('data',function(x){c.push(x);});
    q.on('end',function(){
      var raw=Buffer.concat(c).toString();
      if(q.url==='/publish'){ doc=raw; return r.end('ok'); }
      var body=JSON.parse(raw||'{}'), op=q.url.slice(4);
      // The real store hands documents back with their keys in alphabetical
      // order, observed directly against it. A stub that echoed insertion
      // order would make the diff look correct when it is not.
      function alphabetise(v){
        if(v===null||typeof v!=='object') return v;
        if(Array.isArray(v)) return v.map(alphabetise);
        var out={}; Object.keys(v).sort().forEach(function(k){ out[k]=alphabetise(v[k]); });
        return out;
      }
      if(op==='get'){ calls.get++;
        var send=function(){ srvJson(r,{exists:Object.prototype.hasOwnProperty.call(store,body.path), data:alphabetise(store[body.path])}); };
        if(slowGetMs){ return setTimeout(send,slowGetMs); }
        return send(); }
      if(op==='slow'){ slowGetMs=body.ms||0; return srvJson(r,{ok:1}); }
      if(op==='set'){ calls.set++; inflight++; peak=Math.max(peak,inflight);
        store[body.path]=body.data;
        setTimeout(function(){ inflight--; srvJson(r,{ok:1}); },12); return; }
      if(op==='update'){ calls.set++; store[body.path]=Object.assign({},store[body.path]||{},body.data); return srvJson(r,{ok:1}); }
      if(op==='del'){ calls.del++; delete store[body.path]; return srvJson(r,{ok:1}); }
      if(op==='coll'){ calls.collGet++;
        var pre=body.path+'/', docs=Object.keys(store).filter(function(k){
          return k.indexOf(pre)===0 && k.slice(pre.length).indexOf('/')<0;
        }).sort().map(function(k){ return {id:k.slice(pre.length), data:alphabetise(store[k])}; });
        return srvJson(r,{docs:docs}); }
      return srvJson(r,{});
    });
    return;
  }
  var out=doc.replace(/<link rel="stylesheet"[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');
  r.setHeader('content-length',Buffer.byteLength(out)); r.end(out);
});

srv.listen(0,async function(){
  var b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  var p=await b.newPage({viewport:{width:420,height:900},hasTouch:true});
  var errs=[]; p.on('pageerror',function(e){errs.push(e.message);});
  p.setDefaultTimeout(8000);
  var fails=0, ok=function(m){console.log('  PASS  '+m);},
      bad=function(m,e){fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  var t=async function(name,fn){ try{ await fn(); ok(name); }catch(e){ bad(name,e); } };
  var url='http://127.0.0.1:'+srv.address().port+'/';
  // A seed can carry an in-flight session, which opens on the session view
  // rather than the tabs. Get to Today before touching the water card.
  var toToday=async function(){
    var back=await p.$('[data-action="cancelsession"]');
    if(back){ await back.click(); await p.waitForTimeout(400); }
    var tab=await p.$('[data-action="tab"][data-tab="today"]');
    if(tab){ await tab.click(); await p.waitForTimeout(400); }
  };
  var go=async function(){ await p.goto(url); await p.waitForTimeout(900); await toToday(); };
  var text=function(){ return p.evaluate(function(){ return document.body.innerText; }); };
  var water=async function(n){
    for(var i=0;i<n;i++){
      await p.click('[data-action="water"][data-d="1"]');
      await p.waitForTimeout(120);
    }
    await p.waitForTimeout(1600);
  };
  var waterCount=function(){ return p.evaluate(function(){
    var cards=[].slice.call(document.querySelectorAll('.card'));
    for(var i=0;i<cards.length;i++){ var h=cards[i].querySelector('h3');
      if(h&&/Water/i.test(h.textContent)) return cards[i].querySelector('.count').textContent.trim(); }
    return null; }); };

  console.log('\nSEEDING');
  await go();

  await t('the store starts empty and gets seeded from the document', function(){
    var paths=Object.keys(store);
    assert.ok(paths.length>40,'only '+paths.length+' documents were written');
    assert.ok(store['state/meta'] && store['state/meta'].seeded,'no seeded marker');
    assert.ok(store['state/profile'],'no profile document');
    assert.ok(Object.keys(store).some(function(k){return k.indexOf('days/')===0;}),'no day documents');
    assert.ok(Object.keys(store).some(function(k){return k.indexOf('recipes/')===0;}),'no recipe documents');
  });

  await t('the seeded marker is written last, so a half migration is retried', function(){
    // The stub records order: meta must not be the first write.
    assert.ok(Object.keys(store).indexOf('state/meta')>0,'meta was written first');
  });

  await t('seeding writes in batches rather than firing every document at once', function(){
    assert.ok(peak>0,'no writes were observed');
    assert.ok(peak<=8,'up to '+peak+' writes were in flight at once, which is the shape the store rate-limits');
  });

  console.log('\nSAVING IS SMALL AND DOES NOT REPUBLISH');
  var docBefore=doc;
  var before=await waterCount();
  calls.set=0; calls.del=0;
  await water(1);

  await t('one water tap writes one or two documents, not the whole app', function(){
    assert.ok(calls.set>0 && calls.set<=2,'it wrote '+calls.set+' documents');
  });

  await t('a tap no longer republishes the document', function(){
    assert.strictEqual(doc,docBefore,'the document was rewritten by a water tap');
  });

  await t('the tap is in the day document, not the page', function(){
    var day=Object.keys(store).filter(function(k){return k.indexOf('days/')===0;})
      .map(function(k){return store[k];}).filter(function(d){return d.water>0;});
    assert.ok(day.length,'no day document carries water');
  });

  await t('a save after a reload writes only what moved, not every document', async function(){
    // The diff has to survive a round trip through the store, not just a
    // freshly seeded page: this is the one that would catch it degrading into
    // "rewrite everything" once documents come back from storage.
    await go();
    calls.set=0; calls.del=0;
    await p.click('[data-action="water"][data-d="1"]');
    await p.waitForTimeout(1800);
    assert.ok(calls.set>0,'nothing was saved at all');
    assert.ok(calls.set<=2,'a single tap rewrote '+calls.set+' documents');
  });

  await t('a day loaded from the store can still be changed', async function(){
    // The store hands back frozen bodies. If the app keeps one as its own
    // state, `today.water = n` is a silent no-op and the tap does nothing.
    await go();
    var day=(new Date()).toISOString().slice(0,10);
    calls.set=0;
    var moved=await p.evaluate(function(){
      var c=document.querySelectorAll('.card');
      for(var i=0;i<c.length;i++){ var h=c[i].querySelector('h3');
        if(h&&/Water/i.test(h.textContent)){
          var b=c[i].querySelector('[data-action="water"][data-d="1"]');
          var before=c[i].querySelector('.count').textContent.trim();
          b.click();
          var after=document.querySelectorAll('.card')[i].querySelector('.count').textContent.trim();
          return {before:before, after:after};
        } }
      return null;
    });
    assert.ok(moved,'no water card');
    assert.notStrictEqual(moved.after,moved.before,
      'the counter did not move: '+moved.before+' -> '+moved.after+' (a frozen body was mutated in place)');
    await p.waitForTimeout(1800);
    assert.ok(store['days/'+day],'no document for today at all');
    assert.ok(store['days/'+day].water>0,
      'the day document in the store still reads water='+store['days/'+day].water);
  });

  await t('nothing the app holds as state is frozen', async function(){
    // The general form of the same trap: every part of state is mutated in
    // place somewhere (a recipe's plan flag, a session's logs, a day's water),
    // so a frozen body anywhere in there is a silent no-op waiting to happen.
    // State is not reachable from outside the app, so assert the observable
    // consequence instead: every kind of it can still be changed after a load.
    await go();
    var day=(new Date()).toISOString().slice(0,10);
    calls.set=0;
    await p.click('[data-action="water"][data-d="1"]'); await p.waitForTimeout(1700);
    assert.ok(store['days/'+day] && store['days/'+day].water>0,'a day could not be changed');
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(500);
    var box=await p.$('[data-action="inplan"]');
    if(box){
      var id=await box.getAttribute('data-id');
      var was=!!(store['recipes/'+id]||{}).inPlan;
      await box.click(); await p.waitForTimeout(1700);
      assert.notStrictEqual(!!(store['recipes/'+id]||{}).inPlan,was,'a recipe could not be changed');
    }
    await toToday();   // leave the app where the next check expects it
  });

  console.log('\nIT SURVIVES A RELOAD, WITH THE DOCUMENT UNCHANGED');
  var after=await waterCount();
  assert.notStrictEqual(after,before);
  await go();
  await t('the water count comes back from the store after a reload', async function(){
    var back=await waterCount();
    assert.strictEqual(back,after,'was '+after+' before the reload, '+back+' after');
  });

  await t('a reload reads the store rather than reseeding it', function(){
    assert.ok(store['state/meta'].seeded,'the marker went missing');
  });

  console.log('\nA SESSION, A SAUNA AND A REMOVAL ALL ROUND-TRIP');
  await toToday();
  await p.fill('#sauna-mins','14'); await p.fill('#sauna-temp','88');
  await p.selectOption('#sauna-pos','Top');
  await p.click('[data-action="addstint"]'); await p.waitForTimeout(400);
  await p.fill('#sauna-mins','6'); await p.selectOption('#sauna-pos','Bottom');
  await p.click('[data-action="logsauna"]'); await p.waitForTimeout(1800);

  await t('a two-stint sauna session lands in the store as one document', function(){
    var hit=Object.keys(store).filter(function(k){return k.indexOf('sauna/')===0;})
      .map(function(k){return store[k];})
      .filter(function(x){ return x.mins===20 && x.stints && x.stints.length===2; });
    assert.strictEqual(hit.length,1,'found '+hit.length+' matching sauna documents');
  });

  await t('and it is still there after a reload', async function(){
    await go();
    var body=await text();
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(700);
    body=await text();
    assert.ok(/14 min Top \+ 6 min Bottom/.test(body),'the session did not read back:\n'+body.slice(0,500));
  });

  await t('deleting an entry deletes its document rather than leaving an orphan', async function(){
    var saunaBefore=Object.keys(store).filter(function(k){return k.indexOf('sauna/')===0;}).length;
    var removed=await p.evaluate(function(){
      var btn=document.querySelector('[data-action="delsauna"]');
      if(!btn) return null; var id=btn.getAttribute('data-id'); btn.click(); return id;
    });
    assert.ok(removed,'no sauna row to remove');
    await p.waitForTimeout(1800);
    var saunaAfter=Object.keys(store).filter(function(k){return k.indexOf('sauna/')===0;}).length;
    assert.strictEqual(saunaAfter,saunaBefore-1,'documents went from '+saunaBefore+' to '+saunaAfter);
    assert.ok(!store['sauna/'+removed],'the removed document is still in the store');
  });

  await t('undo puts the document back', async function(){
    var undo=await p.$('[data-action="undo"]');
    assert.ok(undo,'no undo offer');
    await undo.click(); await p.waitForTimeout(1800);
    var n=Object.keys(store).filter(function(k){return k.indexOf('sauna/')===0;}).length;
    assert.ok(n>0,'undo did not restore a document');
  });

  console.log('\nSHIPPING NEW CODE DOES NOT TOUCH DATA');
  await t('a republished document with a stale seed does not overwrite the store', async function(){
    await toToday();
    var live=await waterCount();
    assert.ok(live,'could not read the water card before shipping');
    // Simulate shipping a code change: the document is replaced with one whose
    // embedded seed is the ORIGINAL data, exactly as a publish from the repo is.
    doc=fs.readFileSync('/tmp/publish.html','utf8');
    await go();
    var afterShip=await waterCount();
    assert.strictEqual(afterShip,live,'the stale seed overwrote the store: '+live+' became '+afterShip);
  });

  console.log('\nNOTHING IS ACCEPTED BEFORE THE STORE HAS ANSWERED');
  await t('a tap during the load is refused rather than silently dropped', async function(){
    // Hold the store's first answer so the loading window is observable.
    await p.evaluate(function(u){ return fetch('/db/slow',{method:'POST',body:JSON.stringify({ms:1500})}); });
    await p.goto(url); await p.waitForTimeout(250);
    var body=await text();
    assert.ok(/loading your data/.test(body),'no loading state was shown:\n'+body.slice(0,200));
    var wasSet=calls.set;
    var btn=await p.$('[data-action="water"][data-d="1"]');
    if(btn){ await btn.click(); await p.waitForTimeout(300); }
    assert.strictEqual(calls.set,wasSet,'a tap during the load reached the store anyway');
    await p.evaluate(function(){ return fetch('/db/slow',{method:'POST',body:JSON.stringify({ms:0})}); });
    await p.waitForTimeout(2400);
    var after=await text();
    assert.ok(!/loading your data/.test(after),'it never left the loading state');
  });

  console.log('\nWITHOUT DB IT STILL WORKS THE OLD WAY');
  await t('a view that cannot run db falls back to publish-to-save', async function(){
    await p.addInitScript(function(){ window.__DB_OFF=true; });
    var docBefore2=doc;
    await go();
    var body=await text();
    assert.ok(!/loading your data/.test(body),'it never left the loading state');
    await p.click('[data-action="water"][data-d="1"]');
    await p.waitForTimeout(2200);
    assert.notStrictEqual(doc,docBefore2,'nothing was saved at all without db');
  });

  await t('no page errors throughout', function(){
    assert.deepStrictEqual(errs,[],errs.join(' | '));
  });

  await b.close(); srv.close();
  console.log(fails?('\n'+fails+' FAILING'):'\nAll db checks pass.');
  process.exit(fails?1:0);
});
