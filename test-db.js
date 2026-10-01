// The db migration, against a stub that behaves the way the contract says the
// real store does: documents at slash paths, set/get/delete, collection reads,
// last-writer-wins, and a store that SURVIVES a reload of the page while the
// document itself does not change. That last part is the whole point: code and
// data are no longer the same file.
var http=require('http'),fs=require('fs'),assert=require('assert');
var env=require('./test-env.js');
var doc=env.readDoc();

// The stub store lives in the harness, not the page, so it outlives reloads.
var store={};
var calls={set:0,del:0,get:0,collGet:0,publish:0};
var inflight=0, peak=0, slowGetMs=0;
// Scripted trouble. failNext: the next request of that op whose path contains
// `match` is refused with `code`, the way the store refuses one. setDelays: the
// next set whose path contains `match` is held for `ms` and only lands in the
// store when it completes, which is what makes an overlapping save observable.
var failNext=[], setDelays=[];
function take(list,op,path){
  for(var i=0;i<list.length;i++){ var f=list[i];
    if((!f.op||f.op===op) && String(path||'').indexOf(f.match||'')>-1){ list.splice(i,1); return f; } }
  return null;
}
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
  // Concurrency measured HERE, in the page, not at the server. The browser
  // opens at most six connections to one host, so the server can never observe
  // more than six in flight however many the app fires at once: an assertion
  // on the server's count cannot fail.
  window.__db={inflight:0, peak:0};
  function post(op,body){
    if(op==='set'||op==='del'){
      window.__db.inflight++;
      window.__db.peak=Math.max(window.__db.peak, window.__db.inflight);
    }
    return fetch('/db/'+op,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){ if(op==='set'||op==='del') window.__db.inflight--; return r.json(); })
      .then(function(j){ if(j && j.err) throw {code:j.err, message:'stub refused '+op}; return j; });
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
      if(q.url==='/publish'){ calls.publish++; doc=raw; return r.end('ok'); }
      var body=JSON.parse(raw||'{}'), op=q.url.slice(4);
      var f=take(failNext,op,body.path);
      if(f){ if(op==='set'||op==='update') calls.set++; return srvJson(r,{err:f.code}); }
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
        var held=take(setDelays,op,body.path);
        if(held){ return setTimeout(function(){ store[body.path]=body.data; inflight--; srvJson(r,{ok:1}); },held.ms); }
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
  var b=await env.launch();
  // The page runs well east of UTC by default, so for half of every day its
  // date is not the UTC date; a harness that confuses the two fails here.
  var p=await b.newPage({viewport:{width:420,height:900},hasTouch:true,
    timezoneId:process.env.FC_TZ||'Pacific/Kiritimati'});
  // FC_THROTTLE=4 runs the page on a quarter of the CPU, which is how the
  // stale-handle flake showed up on a slower machine.
  if(process.env.FC_THROTTLE){ var cdp=await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:+process.env.FC_THROTTLE}); }
  var errs=[]; p.on('pageerror',function(e){errs.push(e.message);});
  p.setDefaultTimeout(8000);
  var fails=0, ok=function(m){console.log('  PASS  '+m);},
      bad=function(m,e){fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  var t=async function(name,fn){ try{ await fn(); ok(name); }catch(e){ bad(name,e); } };
  var url='http://127.0.0.1:'+srv.address().port+'/';
  // A seed can carry an in-flight session, which opens on the session view
  // rather than the tabs. Get to Today before touching the water card.
  // Locators, not element handles: a handle taken while the migration save is
  // re-rendering points at a node that is gone by the time it is clicked.
  var tap=async function(sel){
    var l=p.locator(sel).first(); if(!(await l.count())) return false;
    await l.click(); return true;
  };
  var toToday=async function(){
    if(await tap('[data-action="cancelsession"]')) await p.waitForTimeout(400);
    if(await tap('[data-action="tab"][data-tab="today"]')) await p.waitForTimeout(400);
  };
  // Loaded means the store has answered and the writes that follow a load
  // (seeding, a migration) have stopped, not that a fixed time has passed.
  var settle=async function(){
    await p.waitForFunction(function(){
      return !/loading your data/.test(document.body.innerText) && !(window.__db && window.__db.inflight);
    });
    for(var n=-1,k=0; k<40 && n!==calls.set+calls.del; k++){ n=calls.set+calls.del; await p.waitForTimeout(250); }
  };
  // Scripted trouble never outlives the check that set it up.
  var go=async function(){ failNext.length=0; setDelays.length=0; await p.goto(url); await settle(); await toToday(); };
  // The day the APP is on: local to the page, which runs in a timezone of its
  // own, so never the harness's UTC date.
  var today=function(){ return p.evaluate(function(){
    var d=new Date(), z=function(n){ return (n<10?'0':'')+n; };
    return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); }); };
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

  await t('seeding writes in batches rather than firing every document at once', async function(){
    var pk=await p.evaluate(function(){ return window.__db.peak; });
    assert.ok(pk>0,'no writes were observed');
    assert.ok(pk<=8,'up to '+pk+' writes were in flight at once, which is the shape the store rate-limits');
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
    var day=await today();
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
    var day=await today();
    calls.set=0;
    await p.click('[data-action="water"][data-d="1"]'); await p.waitForTimeout(1700);
    assert.ok(store['days/'+day] && store['days/'+day].water>0,'a day could not be changed');
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(500);
    if(await p.locator('[data-action="addmeal"]').count()){
      var planBefore=Object.keys(store).filter(function(k){return k.indexOf('plan/')===0;}).length;
      await tap('[data-action="addmeal"]'); await p.waitForTimeout(1700);
      var planAfter=Object.keys(store).filter(function(k){return k.indexOf('plan/')===0;}).length;
      assert.strictEqual(planAfter,planBefore+1,'a meal could not be planned');
    }
    await toToday();   // leave the app where the next check expects it
  });

  await t('a meal added to the week reaches the calendar, the list and the store', async function(){
    // The visible half of the freeze bug: the change did nothing, so no meal
    // on the calendar and an empty shopping list.
    await go();
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(600);
    var id=await p.evaluate(function(){
      var b=document.querySelector('[data-action="addmeal"]');
      return b?b.getAttribute('data-id'):null;
    });
    assert.ok(id,'no recipe offers an Add to plan button');
    // Plan it on the third day, so the chosen day has to survive too rather
    // than being right by accident.
    var wanted=await p.evaluate(function(i){
      var sel=document.querySelector('[data-action="planday"][data-id="'+i+'"]');
      return sel.options[2].value; }, id);
    await p.selectOption('[data-action="planday"][data-id="'+id+'"]', wanted);
    await p.selectOption('[data-action="planslot"][data-id="'+id+'"]', 'lunch');
    await p.click('[data-action="addmeal"][data-id="'+id+'"]');
    await p.waitForTimeout(1800);

    var docs=Object.keys(store).filter(function(k){ return k.indexOf('plan/')===0; })
      .map(function(k){ return store[k]; })
      .filter(function(e){ return e.recipeId===id && e.date===wanted; });
    assert.strictEqual(docs.length,1,'the planned meal did not reach the store as its own document');
    assert.strictEqual(docs[0].slot,'lunch','the chosen slot did not reach the store');

    var cal=await p.evaluate(function(){
      var c=document.querySelector('.cal'); return c?c.innerText:''; });
    // innerText applies the CSS uppercasing, so match without case.
    assert.ok(/lunch/i.test(cal),'the calendar does not show the planned lunch: '+cal.slice(0,120));
    var shop=await p.evaluate(function(){ return document.querySelectorAll('.shop').length; });
    assert.ok(shop>0,'the shopping list is empty after planning a meal');
    await toToday();
  });

  await t('the migration save is batched the same way seeding is', async function(){
    // This is the real burst: a store still holding recipes in the old shape.
    // On load, migratePlan strips all forty-five at once and ONE save carries
    // them. dbSeed batches at eight precisely to avoid that, and a save has no
    // more right to forty-five parallel writes than seeding does.
    Object.keys(store).forEach(function(k){
      if(k.indexOf('recipes/')!==0) return;
      store[k]=JSON.parse(JSON.stringify(store[k]));
      store[k].inPlan=false; store[k].day='Unassigned';
    });
    var stale=Object.keys(store).filter(function(k){
      return k.indexOf('recipes/')===0 && store[k].inPlan!==undefined; }).length;
    assert.ok(stale>20,'only '+stale+' recipes put back into the old shape');
    await go();
    await p.waitForTimeout(4000);
    var left=Object.keys(store).filter(function(k){
      return k.indexOf('recipes/')===0 && store[k].inPlan!==undefined; }).length;
    assert.strictEqual(left,0,left+' recipes are still stored in the old shape');
    var pk=await p.evaluate(function(){ return window.__db.peak; });
    assert.ok(pk>0,'no writes were observed, so this proves nothing');
    assert.ok(pk<=8,'the migration put '+pk+' writes in flight at once');
    await toToday();
  });

  await t('a save landing mid-word does not wipe the shopping item being typed', async function(){
    // Saving re-renders, and an input rebuilt from HTML comes back empty unless
    // the draft is held outside the DOM. Tick a row to put a save in flight,
    // then type through it, a character at a time so the gaps are real.
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(600);
    var ticks0=((store['state/shopping']||{}).checked||[]).length;
    await p.evaluate(function(){ var r=document.querySelector('.shop'); if(r) r.click(); });
    await p.click('#shop-add');
    await p.type('#shop-add','Washing up liquid',{delay:40});
    await p.waitForTimeout(2200);
    var ticks1=((store['state/shopping']||{}).checked||[]).length;
    assert.notStrictEqual(ticks1,ticks0,'no save happened, so this proves nothing');
    assert.strictEqual(await p.inputValue('#shop-add'),'Washing up liquid',
      'the save wiped the half-typed item');
    await p.press('#shop-add','Enter'); await p.waitForTimeout(1800);
    var extras=((store['state/shopping']||{}).extras||[]);
    assert.ok(extras.some(function(x){return x.text==='Washing up liquid';}),
      'the item did not reach the store: '+JSON.stringify(extras));
    await toToday();
  });

  await t('a week planned under the old shape is carried over, not dropped', async function(){
    // The migration is a one-way door over real data. If it strips inPlan
    // without writing the plan documents, the week is gone and nothing says so.
    var planned=[];
    Object.keys(store).forEach(function(k){
      if(k.indexOf('recipes/')!==0) return;
      store[k]=JSON.parse(JSON.stringify(store[k]));
      // Two of them are in the week, the rest are not.
      var inPlan=planned.length<2;
      store[k].inPlan=inPlan; store[k].day='Unassigned';
      if(inPlan) planned.push(store[k].id||k.slice(8));
    });
    assert.strictEqual(planned.length,2,'could not set up two planned recipes');
    Object.keys(store).forEach(function(k){ if(k.indexOf('plan/')===0) delete store[k]; });

    await go();
    await p.waitForTimeout(4000);

    var docs=Object.keys(store).filter(function(k){ return k.indexOf('plan/')===0; })
      .map(function(k){ return store[k]; });
    assert.strictEqual(docs.length,2,
      'two recipes were in the week and '+docs.length+' planned meals reached the store');
    var got=docs.map(function(e){ return e.recipeId; }).sort();
    assert.deepStrictEqual(got, planned.slice().sort(),
      'the wrong recipes came across: '+got.join(', ')+' instead of '+planned.join(', '));
    assert.ok(docs.every(function(e){ return e.date && e.slot && e.portions>0; }),
      'a migrated meal is missing a date, slot or portions: '+JSON.stringify(docs[0]));

    // And it is on screen, not just in the store.
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(600);
    var cal=await p.evaluate(function(){
      var c=document.querySelector('.cal'); return c?c.innerText:''; });
    assert.ok(/dinner/i.test(cal),'the migrated week is not on the calendar: '+cal.slice(0,140));
    await toToday();
  });

  await t('and it does not run again on the next load and double the week', async function(){
    await go();
    await p.waitForTimeout(3500);
    var docs=Object.keys(store).filter(function(k){ return k.indexOf('plan/')===0; });
    assert.strictEqual(docs.length,2,'a second load left '+docs.length+' planned meals');
  });

  await t('a quote in the item survives that re-render too', async function(){
    // esc() only handled & < >, so re-rendering mid-word wrote
    // value="6" shelf..." and the attribute ended at the 6.
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(600);
    await p.click('#shop-add');
    await p.type('#shop-add','6" shelf brackets',{delay:30});
    await p.evaluate(function(){ var r=document.querySelector('.shop'); if(r) r.click(); });
    await p.waitForTimeout(2200);
    assert.strictEqual(await p.inputValue('#shop-add'),'6" shelf brackets',
      'the quote broke out of the value attribute');
    await toToday();
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
    assert.ok(await tap('[data-action="undo"]'),'no undo offer');
    await p.waitForTimeout(1800);
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
    doc=env.readDoc();
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
    if(await tap('[data-action="water"][data-d="1"]')) await p.waitForTimeout(300);
    assert.strictEqual(calls.set,wasSet,'a tap during the load reached the store anyway');
    await p.evaluate(function(){ return fetch('/db/slow',{method:'POST',body:JSON.stringify({ms:0})}); });
    await p.waitForTimeout(2400);
    var after=await text();
    assert.ok(!/loading your data/.test(after),'it never left the loading state');
  });

  var W='[data-action="water"][data-d="1"]';
  var dayWater=function(day){ return (store['days/'+day]||{}).water||0; };

  console.log('\nSAVES GO ONE AT A TIME');
  await t('a slow save cannot land after a newer one and undo it', async function(){
    await go(); var day=await today(), w0=dayWater(day);
    setDelays.push({match:'days/',ms:2500});
    await p.click(W); await p.waitForTimeout(1300);
    assert.strictEqual(setDelays.length,0,'the first save never started, so this proves nothing');
    await p.click(W); await p.waitForTimeout(5000);
    assert.strictEqual(dayWater(day),w0+2,'two taps, but the store reads '+dayWater(day)+' from '+w0+
      ': the older save landed last');
  });

  await t('an entry removed while its first save is in flight leaves no document behind', async function(){
    await go();
    setDelays.push({match:'sauna/',ms:2500});
    await p.fill('#sauna-mins','9'); await p.selectOption('#sauna-pos','Top');
    await p.click('[data-action="logsauna"]'); await p.waitForTimeout(1300);
    assert.strictEqual(setDelays.length,0,'the sauna save never started, so this proves nothing');
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(300);
    var id=await p.evaluate(function(known){
      var bs=[].slice.call(document.querySelectorAll('[data-action="delsauna"]'));
      for(var i=0;i<bs.length;i++){ var x=bs[i].getAttribute('data-id');
        if(known.indexOf('sauna/'+x)<0){ bs[i].click(); return x; } }
      return null; }, Object.keys(store));
    assert.ok(id,'the new sauna row is not on Progress');
    await p.waitForTimeout(5000);
    assert.ok(!store['sauna/'+id],'the entry was removed but its document is in the store');
    await toToday();
  });

  console.log('\nA FAILED SAVE IS RETRIED, AND A HIDDEN PAGE SAVES AT ONCE');
  await t('a save refused as transient is retried without another tap', async function(){
    await go(); var day=await today(), w0=dayWater(day);
    failNext.push({op:'set',match:'days/',code:'resource_exhausted'});
    await p.click(W); await p.waitForTimeout(6500);
    assert.strictEqual(failNext.length,0,'the save was never refused, so this proves nothing');
    assert.strictEqual(dayWater(day),w0+1,'the refused save was never retried');
  });

  await t('a save refused for good is not retried in a loop, and says so', async function(){
    await go(); var day=await today(), w0=dayWater(day);
    failNext.push({op:'set',match:'days/',code:'invalid_argument'});
    await p.click(W); await p.waitForTimeout(6500);
    assert.strictEqual(failNext.length,0,'the save was never refused, so this proves nothing');
    assert.strictEqual(dayWater(day),w0,'a refusal that cannot succeed was retried anyway');
    assert.ok(/could not be saved/i.test(await text()),'nothing on screen says the change was not saved');
    // The next change still gets its chance, and carries the first with it.
    await p.click(W); await p.waitForTimeout(1800);
    assert.strictEqual(dayWater(day),w0+2,'the next tap did not save');
    assert.ok(!/could not be saved/i.test(await text()),'the error stayed up after a good save');
  });

  var hide=function(kind){ return p.evaluate(function(kind){
    if(kind==='pagehide'){ window.dispatchEvent(new Event('pagehide')); return; }
    Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){ return 'hidden'; }});
    document.dispatchEvent(new Event('visibilitychange'));
  }, kind); };
  var unhide=function(){ return p.evaluate(function(){
    delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); }); };
  await t('a tap is saved at once when the page is hidden, not a second later', async function(){
    await go(); var day=await today(), w0=dayWater(day);
    await p.click(W); await p.waitForTimeout(300);
    await hide('visibilitychange'); await p.waitForTimeout(500);
    var got=dayWater(day);
    await unhide(); await p.waitForTimeout(600);
    assert.strictEqual(got,w0+1,'the tap was still waiting on its timer when the page went away');
  });

  await t('and when the page is being closed', async function(){
    await go(); var day=await today(), w0=dayWater(day);
    await p.click(W); await p.waitForTimeout(300);
    await hide('pagehide'); await p.waitForTimeout(500);
    assert.strictEqual(dayWater(day),w0+1,'the tap was still waiting on its timer when the page closed');
    await p.waitForTimeout(800);
  });

  // A closing page may be killed within moments, so the write that flushes a
  // pending tap cannot wait behind a round of reads first.
  await t('a page closed while the store is slow to answer reads still sends its tap at once', async function(){
    await go(); var day=await today(), w0=dayWater(day);
    await p.click(W); await p.waitForTimeout(300);
    slowGetMs=3000;
    try{
      await hide('pagehide'); await p.waitForTimeout(500);
      assert.strictEqual(dayWater(day),w0+1,'the write waited on a read of the store before it was sent');
    }finally{ slowGetMs=0; }
    await p.waitForTimeout(3200);
  });

  await t('one render that throws during a save does not stop every later save', async function(){
    await go(); var day=await today(), w0=dayWater(day);
    await p.click(W); await p.waitForTimeout(200);
    await p.evaluate(function(){ var g=document.getElementById; window.__boom=true;
      document.getElementById=function(id){ if(window.__boom && id==='app') throw new Error('render broke'); return g.apply(document,arguments); }; });
    await p.waitForTimeout(1500);
    await p.evaluate(function(){ window.__boom=false; });
    await p.click(W); await p.waitForTimeout(4500);
    // The throw was this check's own doing, not a page error.
    for(var i=errs.length-1;i>=0;i--) if(/render broke/.test(errs[i])) errs.splice(i,1);
    assert.strictEqual(dayWater(day),w0+2,'saving stopped for good after one render threw: '+dayWater(day));
  });

  console.log('\nA STORE THAT FAILS TO ANSWER IS NOT MISTAKEN FOR NO STORE');
  await t('a failed read at load offers Retry, takes no taps and never republishes', async function(){
    await go(); var day=await today();
    store['days/'+day]=Object.assign({water:0,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0},
      store['days/'+day]||{}, {water:4, touched:true});
    var docBefore=doc, pubs=calls.publish;
    // Twice: the first load and the one automatic retry both fail.
    failNext.push({op:'coll',match:'days',code:'unavailable'},{op:'coll',match:'days',code:'unavailable'});
    await p.goto(url);
    await p.waitForSelector('[data-action="retryload"]');
    for(var k=0;k<50 && failNext.length;k++) await p.waitForTimeout(100);
    assert.strictEqual(failNext.length,0,'the page did not retry once on its own');
    await p.waitForTimeout(400);
    assert.ok(await p.locator('[data-action="retryload"]').count(),'Retry went away while the store is still failing');
    var shown=await waterCount();
    await tap(W); await p.waitForTimeout(2200);
    assert.strictEqual(calls.publish,pubs,'the page republished itself over the store');
    assert.strictEqual(doc,docBefore,'the document was rewritten');
    assert.strictEqual(await waterCount(),shown,'a tap was taken while the data had not loaded');
    assert.strictEqual(dayWater(day),4,'the store changed');
    await p.click('[data-action="retryload"]'); await settle();
    assert.ok(!(await p.locator('[data-action="retryload"]').count()),'Retry is still up after the store answered');
    var loaded=await waterCount();
    await go();
    assert.strictEqual(loaded,await waterCount(),'after Retry the page does not show what the store holds');
    assert.strictEqual(dayWater(day),4,'the store changed');
  });

  var failLoad=async function(){
    failNext.length=0; setDelays.length=0;
    failNext.push({op:'coll',match:'days',code:'unavailable'});
    await p.goto(url);
    await p.waitForSelector('[data-action="retryload"]');
  };
  await t('Retry looks like part of the banner, not a bare browser control', async function(){
    await failLoad();
    var look=await p.evaluate(function(){
      var b=document.querySelector('[data-action="retryload"]'), cs=getComputedStyle(b), bs=getComputedStyle(b.parentNode);
      return {font:cs.fontFamily, color:cs.color, banner:bs.color, bg:cs.backgroundColor}; });
    assert.ok(/Plex Mono/.test(look.font),'Retry is in the browser default font: '+look.font);
    assert.strictEqual(look.color,look.banner,'Retry is not in the banner colour');
    assert.strictEqual(look.bg,'rgba(0, 0, 0, 0)','Retry has the browser default fill');
    await settle();
  });

  await t('while the page retries a failed load on its own it says so, not Retry', async function(){
    await failLoad();
    slowGetMs=2500;
    try{
      var said=await p.waitForFunction(function(){ return /loading your data/.test(document.body.innerText); },null,{timeout:4000})
        .then(function(){ return true; },function(){ return false; });
      assert.ok(said,'the banner still said it could not load while it was retrying');
      assert.ok(!(await p.locator('[data-action="retryload"]').count()),'Retry was offered while a retry was already running');
    }finally{ slowGetMs=0; }
    await settle();
    assert.ok(!(await p.locator('[data-action="retryload"]').count()),'Retry is still up after the retry loaded');
  });

  console.log("\nWHERE YOU ARE IN THE APP BELONGS TO THIS DEVICE, NOT THE RECORD");
  await t('moving between tabs does not write the profile, so it cannot carry stale xp back', async function(){
    await go();
    var xp=store['state/profile'].totalXp;
    // Another view earned xp since this one loaded.
    store['state/profile']=Object.assign({},store['state/profile'],{totalXp:xp+100});
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(400);
    // Recipe cards start closed, so open one to reach its portions.
    assert.ok(await tap('[data-action="toggleex"][data-id^="rec:"]'),'no recipe card to open on Meals');
    await p.waitForTimeout(200);
    assert.ok(await tap('[data-action="portions"][data-d="1"]'),'no portions control on Meals');
    await p.waitForTimeout(1800);
    var ui=await p.evaluate(function(){ try{ return JSON.parse(localStorage.getItem('fc.ui')); }catch(e){ return null; } });
    // Back to Today and a tap there, so whichever tab the store last heard of,
    // one of the two saves happens on a different one.
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(400);
    var day=await today(), a0=(store['days/'+day]||{}).alcohol||0;
    await p.click('[data-action="alcohol"][data-d="1"]'); await p.waitForTimeout(1800);
    assert.strictEqual((store['days/'+day]||{}).alcohol,a0+1,'the tap on Today was not saved, so this proves nothing');
    assert.strictEqual(store['state/profile'].totalXp,xp+100,'moving between tabs wrote stale xp back: '+store['state/profile'].totalXp);
    assert.ok(ui && ui.tab==='meals','the tab is not remembered on this device: '+JSON.stringify(ui));
    await p.click('[data-action="alcohol"][data-d="-1"]'); await p.waitForTimeout(1800);
  });

  await t('a tab picked while the store is loading is not undone when it answers', async function(){
    await go();
    slowGetMs=1500;
    await p.goto(url); await p.waitForTimeout(250);
    await tap('[data-action="tab"][data-tab="progress"]');
    slowGetMs=0; await settle();
    var on=await p.evaluate(function(){ var a=document.querySelector('.tab.active'); return a&&a.getAttribute('data-tab'); });
    assert.strictEqual(on,'progress','the store answering moved the page back to '+on);
    await toToday();
  });

  console.log('\nA RENDER DOES NOT UNDO WHAT IS ON SCREEN');
  // Open a session on a lift that has kg, reps and a rig to animate.
  var toLift=async function(){
    await toToday();
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(300);
    await p.locator('[data-action="startworkout"]').first().click(); await p.waitForTimeout(600);
    for(var k=0;k<12;k++){
      var here=await p.evaluate(function(){
        var f=document.getElementById('fig-live');
        return !!(f && f.getAttribute('data-rig') && document.querySelector('input[id^="log-w-"]'));
      });
      if(here) break;
      await p.click('[data-action="nextslide"]'); await p.waitForTimeout(250);
    }
    return p.evaluate(function(){ var w=document.querySelector('input[id^="log-w-"]'); return w?w.id.slice(6):null; });
  };
  var leave=async function(){
    if(await tap('[data-action="cancelsession"]')) await p.waitForTimeout(300);
    if(await tap('[data-action="discardsession"]')) await p.waitForTimeout(300);
    await settle(); await toToday();
  };

  await t('half-typed fields on Today survive a tap that re-renders the page', async function(){
    await go();
    await p.fill('#sauna-mins','12');
    await p.selectOption('#sauna-pos','Bottom');
    await p.click('[data-action="water"][data-d="1"]'); await p.waitForTimeout(1600);
    var got=await p.evaluate(function(){ return [document.getElementById('sauna-mins').value, document.getElementById('sauna-pos').value]; });
    assert.deepStrictEqual(got,['12','Bottom'],'a render wiped them: '+JSON.stringify(got));
    await p.click('[data-action="water"][data-d="-1"]'); await p.waitForTimeout(1600);
  });

  await t('a field whose change the app already acted on is drawn from state, not put back', async function(){
    await go(); var day=await today();
    // A date past today is refused and the page goes back to today; putting
    // the typed value back would show a day that is not the one being logged.
    await p.evaluate(function(){ var el=document.getElementById('logdate'); el.value='2099-01-01';
      el.dispatchEvent(new Event('change',{bubbles:true})); });
    await p.waitForTimeout(200);
    assert.strictEqual(await p.inputValue('#logdate'),day,'the refused date stayed in the field');
  });

  await t('kg and reps typed for the next set survive the save that follows a logged set', async function(){
    await go(); var ex=await toLift();
    assert.ok(ex,'no lift slide with a kg field');
    await p.fill('#log-w-'+ex,'60'); await p.fill('#log-v-'+ex,'8');
    await p.click('[data-action="logset"][data-ex="'+ex+'"]'); await p.waitForTimeout(200);
    var cleared=await p.evaluate(function(ex){ return [document.getElementById('log-w-'+ex).value, document.getElementById('log-v-'+ex).value]; },ex);
    // Drawn afresh from state: the boxes now start from the set just logged.
    assert.deepStrictEqual(cleared,['60','8'],'the boxes did not start from the set just logged: '+JSON.stringify(cleared));
    await p.fill('#log-w-'+ex,'62.5'); await p.fill('#log-v-'+ex,'6');
    await p.waitForTimeout(2500);
    var st=await p.evaluate(function(ex){ var a=document.activeElement;
      return [document.getElementById('log-w-'+ex).value, document.getElementById('log-v-'+ex).value, a&&a.id]; },ex);
    assert.deepStrictEqual(st,['62.5','6','log-v-'+ex],'the save wiped the next set: '+JSON.stringify(st));
    // A set refused for want of reps keeps the kg that was typed.
    await p.fill('#log-v-'+ex,'');
    await p.click('[data-action="logset"][data-ex="'+ex+'"]'); await p.waitForTimeout(200);
    assert.strictEqual(await p.inputValue('#log-w-'+ex),'62.5','a refused set cleared the kg');
    await leave();
  });

  await t('the saving note is a fixed pill that never moves the page', async function(){
    await go(); var day=await today();
    setDelays.push({op:'set',match:'days/'+day,ms:1500});
    var tops=await p.evaluate(function(){
      var hud=document.querySelector('.hud'), out=[hud.getBoundingClientRect().top];
      document.querySelector('[data-action="water"][data-d="1"]').click();
      return new Promise(function(res){ var n=0, iv=setInterval(function(){
        var h=document.querySelector('.hud'); out.push(h?h.getBoundingClientRect().top:-1);
        var pill=document.querySelector('.savepill.on');
        if(pill) out.pill=getComputedStyle(pill).position;
        if(++n>=60){ clearInterval(iv); res({tops:out, pill:out.pill||null}); } },50); }); });
    assert.ok(tops.tops.every(function(x){ return x===tops.tops[0]; }),'the page moved: '+tops.tops.join(','));
    assert.strictEqual(tops.pill,'fixed','no fixed saving pill was shown during a slow save');
    await settle();
    assert.ok(!(await p.$('.savepill.on')),'the pill stayed up after the save landed');
    await p.click('[data-action="water"][data-d="-1"]'); await settle();
  });

  await t('the rig keeps its place in the rep across a render, at about 30fps', async function(){
    await go(); var ex=await toLift();
    assert.ok(ex,'no rigged lift slide');
    await p.waitForTimeout(1300);
    var r=await p.evaluate(function(ex){
      var u0=parseFloat(document.getElementById('fig-live').getAttribute('data-u'));
      document.querySelector('[data-action="logset"][data-ex="'+ex+'"]').click();   // empty: renders, logs nothing
      return new Promise(function(res){ setTimeout(function(){
        var u1=parseFloat(document.getElementById('fig-live').getAttribute('data-u'));
        var n=0, ob=new MutationObserver(function(){ n++; });
        ob.observe(document.getElementById('fig-live'),{childList:true});
        setTimeout(function(){ ob.disconnect(); res({u0:u0,u1:u1,paints:n}); },1000);
      },80); });
    },ex);
    assert.ok(r.u0>0.3,'the phase never advanced: '+r.u0);
    assert.ok(r.u1>=r.u0 && r.u1-r.u0<0.15,'a render moved the rep from '+r.u0+' to '+r.u1);
    assert.ok(r.paints>=15 && r.paints<=36,r.paints+' redraws in a second');
    await leave();
  });

  console.log('\nTWO VIEWS OPEN AT ONCE');
  await t('water tapped in one view and smoking in another both survive', async function(){
    await go(); var day=await today();
    store['days/'+day]={water:0,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:true};
    var ctx2=await b.newContext({viewport:{width:420,height:900},hasTouch:true,
      timezoneId:process.env.FC_TZ||'Pacific/Kiritimati'});
    var q=await ctx2.newPage(); q.setDefaultTimeout(8000);
    q.on('pageerror',function(e){errs.push('view B: '+e.message);});
    try{
      await q.goto(url); await go();
      await q.waitForFunction(function(){ return !/loading your data/.test(document.body.innerText); });
      if(await q.locator('[data-action="cancelsession"]').count()) await q.click('[data-action="cancelsession"]');
      if(await q.locator('[data-action="tab"][data-tab="today"]').count()) await q.click('[data-action="tab"][data-tab="today"]');
      await q.waitForTimeout(1500);
      var xp0=store['state/profile'].totalXp;
      await water(3);
      assert.strictEqual(dayWater(day),3,'view A did not save its water');
      var xpA=store['state/profile'].totalXp;
      assert.ok(xpA>xp0,'the water earned no xp, so the xp check proves nothing');
      // View B loaded before any of that and has not looked since.
      await q.click('[data-action="smoking"][data-d="1"]'); await q.waitForTimeout(1800);
      var d=store['days/'+day];
      assert.strictEqual(d.smoking,1,'view B did not save its smoking');
      assert.strictEqual(d.water,3,'view B wrote its stale water over view A\'s: water is '+d.water);
      assert.strictEqual(store['state/profile'].totalXp,xpA,'view B wrote its stale xp over view A\'s');
      // And view A picks up view B's change when it is looked at again.
      await p.evaluate(function(){ document.dispatchEvent(new Event('visibilitychange')); });
      await p.waitForTimeout(700);
      var seen=await p.evaluate(function(){
        var b=document.querySelector('[data-action="smoking"]'); return b?b.parentNode.querySelector('.count').textContent.trim():null; });
      assert.strictEqual(seen,'1','view A still shows smoking '+seen+' after being looked at again');
    } finally { await ctx2.close(); }
  });

  console.log('\nEXPORT AND IMPORT');
  var exported=async function(){
    await p.click('[data-action="tab"][data-tab="progress"]');
    await p.click('[data-action="datapane"][data-p="export"]');
    var o=JSON.parse(await p.inputValue('#export-json')); delete o.exportedAt; return o;
  };
  var importing=async function(json){
    await p.click('[data-action="tab"][data-tab="progress"]');
    if(!(await p.locator('#import-json').count())) await p.click('[data-action="datapane"][data-p="import"]');
    await p.fill('#import-json',json); await p.click('[data-action="checkimport"]');
  };
  var kept=null;
  await t('an export imported into an empty store gives back the same data', async function(){
    await go(); await water(1);
    var a=await exported();
    assert.strictEqual(a.schema,1,'no schema on the export');
    assert.ok(a.workoutLogs.length && a.recipes.length,'the export carries no sessions or recipes');
    kept=JSON.parse(JSON.stringify(store));
    Object.keys(store).forEach(function(k){ delete store[k]; });
    store['state/meta']={seeded:true};
    await go();
    await importing(JSON.stringify(a));
    var body=await text();
    assert.ok(body.indexOf(a.workoutLogs.length+' session')>-1,'the summary does not count the sessions: '+body.slice(-600));
    calls.publish=0;
    await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
    assert.strictEqual(calls.publish,0,'the import republished the document');
    var paths=function(m){ return Object.keys(m).filter(function(k){ return k!=='state/meta'; }).sort(); };
    assert.deepStrictEqual(paths(store),paths(kept),'the store does not hold the same documents');
    await go();
    assert.deepStrictEqual(await exported(),a,'an export after the import differs from the one imported');
  });

  await t('a malformed import is refused with a message and writes nothing', async function(){
    var n=calls.set+calls.del;
    await importing('{"schema":1,"days":{"tomorrow":{}}}');
    var msg=await p.locator('[role="alert"]').first().textContent();
    assert.ok(/not a date/.test(msg),'no reason given: '+msg);
    assert.strictEqual(await p.locator('[data-action="doimport"]').count(),0,'it offered to import it anyway');
    await importing('<script>window.__pwned=1<\/script>');
    assert.ok(/not valid JSON/.test(await p.locator('[role="alert"]').first().textContent()));
    assert.ok(!(await p.evaluate(function(){ return window.__pwned; })),'pasted text ran');
    await p.waitForTimeout(1300);
    assert.strictEqual(calls.set+calls.del,n,'a refused import wrote to the store');
  });

  await t('the data an import replaced can be put back', async function(){
    var a=await exported();
    await importing(JSON.stringify({schema:1}));
    await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
    assert.ok(!Object.keys(store).some(function(k){ return k.indexOf('workoutLogs/')===0; }),'an empty import left sessions behind');
    await p.click('[data-action="restorebackup"]'); await settle();
    await go();
    assert.deepStrictEqual(await exported(),a,'putting the backup back did not restore the data');
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
