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
// next write of that op (set, or update) whose path contains `match` is held
// for `ms` and only lands in the store when it completes, which is what makes
// an overlapping save observable.
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
      // A key named __proto__ is data to the store, as it is to JSON, so it
      // has to come back as one rather than as this object's prototype.
      function alphabetise(v){
        if(v===null||typeof v!=='object') return v;
        if(Array.isArray(v)) return v.map(alphabetise);
        var out=Object.create(null); Object.keys(v).sort().forEach(function(k){ out[k]=alphabetise(v[k]); });
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
      // As the real store does: update merges into a document that exists and
      // is refused for one that does not.
      if(op==='update'){ calls.set++;
        if(!Object.prototype.hasOwnProperty.call(store,body.path)) return srvJson(r,{err:'invalid_argument'});
        var hold=take(setDelays,op,body.path), apply=function(){ store[body.path]=Object.assign({},store[body.path],body.data); };
        if(hold){ return setTimeout(function(){ apply(); srvJson(r,{ok:1}); },hold.ms); }
        apply(); return srvJson(r,{ok:1}); }
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
  // FC_ONLY=pattern runs only the checks whose names match it, for a quick loop.
  var t=async function(name,fn){ if(process.env.FC_ONLY && !new RegExp(process.env.FC_ONLY).test(name)) return;
    try{ await fn(); ok(name); }catch(e){ bad(name,e); } };
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

  console.log('\nA SAVE NEVER WRITES OVER WHAT IT HAS NOT READ');
  // A second view, on Today, loaded from the store as it is now.
  var openView=async function(){
    var ctx=await b.newContext({viewport:{width:420,height:900},hasTouch:true,
      timezoneId:process.env.FC_TZ||'Pacific/Kiritimati'});
    var q=await ctx.newPage(); q.setDefaultTimeout(8000);
    q.on('pageerror',function(e){errs.push('second view: '+e.message);});
    await q.goto(url);
    await q.waitForFunction(function(){ return !/loading your data/.test(document.body.innerText); });
    if(await q.locator('[data-action="cancelsession"]').count()) await q.click('[data-action="cancelsession"]');
    if(await q.locator('[data-action="tab"][data-tab="today"]').count()) await q.click('[data-action="tab"][data-tab="today"]');
    await q.waitForTimeout(600);
    return q;
  };
  var hideIn=function(pg){ return pg.evaluate(function(){
    Object.defineProperty(document,'visibilityState',{configurable:true,get:function(){ return 'hidden'; }});
    document.dispatchEvent(new Event('visibilitychange')); }); };
  var showIn=function(pg){ return pg.evaluate(function(){
    delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); }); };
  var dk=function(off){ return p.evaluate(function(off){
    var d=new Date(); d.setDate(d.getDate()+off); var z=function(n){ return (n<10?'0':'')+n; };
    return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); },off); };
  var blank=function(){ return {water:0,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:true}; };

  await t('a view hidden straight after a tap writes only that tap, not its stale copy of the day', async function(){
    await go(); var day=await today();
    store['days/'+day]=blank();
    var q=await openView();
    try{
      await go();
      await water(2);
      await p.click('[data-action="smoking"][data-d="1"]'); await p.waitForTimeout(2000);
      assert.strictEqual(store['days/'+day].water,2,'the first view did not save its water');
      // The second view loaded before any of that and is still on screen.
      await q.click('[data-action="alcohol"][data-d="1"]'); await q.waitForTimeout(200);
      await hideIn(q); await q.waitForTimeout(1500);
      var d=store['days/'+day];
      assert.strictEqual(d.alcohol,1,'the hidden view did not save its tap');
      assert.strictEqual(d.water,2,'the hidden view wrote its stale water: '+JSON.stringify(d));
      assert.strictEqual(d.smoking,1,'the hidden view wrote its stale smoking: '+JSON.stringify(d));
      assert.strictEqual(d.wx,2,'the cups that earned xp were lost: '+JSON.stringify(d));
      // And it stays that way once both views have looked again.
      await showIn(q); await q.waitForTimeout(1500);
      await p.evaluate(function(){ document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(1500);
      d=store['days/'+day];
      assert.ok(d.water===2 && d.smoking===1 && d.alcohol===1,'a later save undid the merge: '+JSON.stringify(d));
    } finally { await q.context().close(); }
  });

  // The view hidden has never read today's day: it was opened before the
  // other view created it, or before midnight.
  await t('a view hidden straight after a tap on a day it never read keeps what another view wrote there', async function(){
    var day=await today(); delete store['days/'+day];
    await go();
    var q=await openView();
    try{
      await go();
      await water(2);
      await p.click('[data-action="smoking"][data-d="1"]'); await p.waitForTimeout(2000);
      assert.strictEqual(store['days/'+day].water,2,'the first view did not save its water');
      await q.click('[data-action="alcohol"][data-d="1"]'); await q.waitForTimeout(200);
      await hideIn(q); await q.waitForTimeout(1500);
      var d=store['days/'+day];
      assert.strictEqual(d.alcohol,1,'the hidden view did not save its tap');
      assert.ok(d.water===2 && d.smoking===1 && d.wx===2,'the hidden view wrote its blank copy of the day: '+JSON.stringify(d));
      await showIn(q); await q.waitForTimeout(1500);
      await p.evaluate(function(){ document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(1500);
      d=store['days/'+day];
      assert.ok(d.water===2 && d.smoking===1 && d.alcohol===1,'a later save undid the merge: '+JSON.stringify(d));
    } finally { await q.context().close(); }
  });

  await t('a view hidden straight after a tap on a day nobody has written yet still saves it', async function(){
    var day=await today(); delete store['days/'+day];
    await go();
    var q=await openView();
    try{
      await q.click('[data-action="alcohol"][data-d="1"]'); await q.waitForTimeout(200);
      await hideIn(q); await q.waitForTimeout(1500);
      var d=store['days/'+day];
      assert.ok(d && d.alcohol===1,'the tap was not saved: '+JSON.stringify(d));
      assert.strictEqual(d.water,0,'the day went in incomplete: '+JSON.stringify(d));
    } finally { await q.context().close(); }
  });

  await t('starting a session is stored even when another write in the same save is refused', async function(){
    await go();
    failNext.push({op:'set',match:'days/',code:'quota_exceeded'});
    await p.click(W);
    await p.click('[data-action="tab"][data-tab="training"]');
    await p.locator('[data-action="startworkout"]').first().click(); await p.waitForTimeout(2500);
    assert.strictEqual(failNext.length,0,'the day was never refused, so this proves nothing');
    var s=store['state/session'];
    assert.ok(s && s.active,'the started session was never stored: '+JSON.stringify(s));
    await leave();
  });

  // A page going away sends the session beside the stored one (pend_ and
  // its view), which any view reading the store takes up.
  var sentSession=function(){ var d=store['state/session']||{}, a=d.active||null;
    Object.keys(d).forEach(function(k){ if(!a && k.indexOf('pend_')===0 && d[k] && d[k].m) a=d[k].m.active||null; });
    return a; };
  await t('a page going away sends a started session alongside a slow write, not after it', async function(){
    await go();
    setDelays.push({op:'update',match:'days/',ms:3000});
    await p.click(W);
    await p.click('[data-action="tab"][data-tab="training"]');
    await p.locator('[data-action="startworkout"]').first().click();
    await hideIn(p); await p.waitForTimeout(800);
    assert.strictEqual(setDelays.length,0,'the day was never held, so this proves nothing');
    assert.ok(sentSession(),'the session waited for the day: '+JSON.stringify(store['state/session']));
    await p.waitForTimeout(3000); await showIn(p); await p.waitForTimeout(1500);
    var s=store['state/session'];
    assert.ok(s.active && !Object.keys(s).some(function(k){ return k.indexOf('pend_')===0; }),'looked at again, the session is not stored as itself: '+JSON.stringify(s).slice(0,160));
    await leave();
  });

  await t('removing a session from an older day keeps what another view logged on that day', async function(){
    var D=await dk(-2);
    store['days/'+D]={water:0,workout:{done:true,type:'Strength'},rest:false,alcohol:0,smoking:0,weed:0,touched:true};
    store['workoutLogs/wlT1']={id:'wlT1',workoutId:'w1',title:'Full body',tag:'Strength',date:D,logs:{press_push:[{v:8,w:20}]}};
    await go(); await hideIn(p);
    var q=await openView();
    try{
      await q.evaluate(function(k){ document.querySelector('[data-action="pickday"][data-k="'+k+'"]').click(); },D);
      await q.waitForTimeout(300);
      await q.click('[data-action="water"][data-d="1"]'); await q.click('[data-action="water"][data-d="1"]');
      await q.click('[data-action="smoking"][data-d="1"]'); await q.waitForTimeout(2000);
      assert.strictEqual(store['days/'+D].water,2,'the backfilling view did not save');
    } finally { await q.context().close(); }
    await showIn(p); await p.waitForTimeout(1200);
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(300);
    var did=await p.evaluate(function(){ var e=document.querySelector('[data-action="dellog"][data-id="wlT1"]');
      if(!e) return false; e.click(); return true; });
    assert.ok(did,'no session to remove on Progress');
    await p.waitForTimeout(2200);
    var d=store['days/'+D];
    assert.ok(!store['workoutLogs/wlT1'],'the session is still in the store');
    assert.strictEqual(d.workout.done,false,'the day is still marked trained');
    assert.strictEqual(d.water,2,'the removal wrote a stale copy of the day: '+JSON.stringify(d));
    assert.strictEqual(d.smoking,1,'the removal wrote a stale copy of the day: '+JSON.stringify(d));
    if(await tap('[data-action="dismissundo"]')) await p.waitForTimeout(300);
  });

  await t('a save with one write refused waits for the others before the next save starts', async function(){
    await go(); var day=await today();
    var w0=dayWater(day), x0=store['state/profile'].totalXp;
    setDelays.push({op:'set',match:'days/'+day,ms:3500});
    failNext.push({op:'set',match:'state/profile',code:'unavailable'});
    await p.click(W); await p.waitForTimeout(1500);
    await p.click(W); await p.waitForTimeout(7000);
    assert.strictEqual(failNext.length+setDelays.length,0,'the scripted trouble never happened, so this proves nothing');
    assert.strictEqual(dayWater(day),w0+2,'two taps, but the store reads '+dayWater(day)+' from '+w0);
    assert.strictEqual(store['state/profile'].totalXp,x0+4,'two cups paid '+(store['state/profile'].totalXp-x0)+' xp');
    var shown=await waterCount();
    await go();
    assert.strictEqual(await waterCount(),shown,'after a reload water reads '+(await waterCount())+', not '+shown);
  });

  await t('finishing a session whose log cannot be written keeps its sets', async function(){
    var day=await today();
    store['state/session']={active:{workoutId:'w1',startedAt:day,t0:Date.now()-600000,exIds:['press_push'],
      targets:{press_push:{sets:3,reps:'8'}},logs:{press_push:[{v:8,w:20},{v:8,w:21},{v:8,w:22}]}}};
    var logs0=Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0; });
    await go();
    var q=await openView();
    try{
      await q.click('[data-action="tab"][data-tab="training"]'); await q.waitForTimeout(300);
      await q.click('[data-action="resumesession"]'); await q.waitForTimeout(300);
      for(var i=0;i<6 && !(await q.locator('[data-action="finishworkout"]').count());i++){
        await q.click('[data-action="nextslide"]'); await q.waitForTimeout(200); }
      for(i=0;i<6;i++) failNext.push({op:'set',match:'workoutLogs/',code:'unavailable'});
      await q.click('[data-action="finishworkout"]'); await q.waitForTimeout(2500);
      assert.ok(failNext.length<6,'the log was never refused, so this proves nothing');
    } finally { await q.context().close(); failNext.length=0; }
    await go();
    var sess=(store['state/session']||{}).active;
    var log=Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0 && logs0.indexOf(k)<0; })
      .map(function(k){ return store[k]; })[0];
    var sets=(log&&log.logs.press_push)||(sess&&sess.logs.press_push)||[];
    assert.strictEqual(sets.length,3,'the sets are gone: no new log and the session is '+JSON.stringify(sess));
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(300);
    if(await tap('[data-action="discardsession"]')) await p.waitForTimeout(1600);
    if(await tap('[data-action="dismissundo"]')) await p.waitForTimeout(300);
  });

  await t('putting back a session that has no tag does not break every later save', async function(){
    var day=await today();
    store['days/'+day]={water:0,workout:{done:true,type:'Strength'},rest:false,alcohol:0,smoking:0,weed:0,touched:true};
    store['workoutLogs/wlNoTag']={id:'wlNoTag',workoutId:'w1',title:'Imported session',date:day,logs:{pullup:[{v:8,w:null}]}};
    await go();
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(300);
    assert.ok(await p.evaluate(function(){ var e=document.querySelector('[data-action="dellog"][data-id="wlNoTag"]');
      if(!e) return false; e.click(); return true; }),'no session to remove on Progress');
    await p.waitForTimeout(1600);
    assert.ok(await tap('[data-action="undo"]'),'no undo offer'); await p.waitForTimeout(1600);
    await toToday();
    for(var i=0;i<3;i++){ await p.click(W); await p.waitForTimeout(1600); }
    await p.waitForTimeout(1000);
    assert.strictEqual(dayWater(day),3,'water reads '+dayWater(day)+' in the store after three taps');
    var banner=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('.banner'),function(e){ return e.textContent; }).join(' | '); });
    assert.ok(!/saved|Trouble/i.test(banner),'an error is up: '+banner);
    assert.ok(store['workoutLogs/wlNoTag'],'undo did not put the session back');
  });

  console.log('\nONE SESSION, HOWEVER MANY VIEWS HOLD IT');
  // Push opens on the warm-up; the bench is the first lift.
  var BENCH='press_bench';
  var toEx=async function(pg,ex){
    for(var i=0;i<12 && !(await pg.locator('#log-v-'+ex).count());i++){ await pg.click('[data-action="nextslide"]'); await pg.waitForTimeout(80); } };
  var logIn=async function(pg,ex,w,v){
    await pg.fill('#log-w-'+ex,String(w)); await pg.fill('#log-v-'+ex,String(v));
    await pg.click('[data-action="logset"][data-ex="'+ex+'"]'); };
  var finishIn=async function(pg){
    for(var i=0;i<12 && !(await pg.locator('[data-action="finishworkout"]').count());i++){ await pg.click('[data-action="nextslide"]'); await pg.waitForTimeout(80); }
    await pg.click('[data-action="finishworkout"]'); };
  var resumeIn=async function(pg){
    await pg.click('[data-action="tab"][data-tab="training"]'); await pg.waitForTimeout(200);
    await pg.click('[data-action="resumesession"]'); await pg.waitForTimeout(200); };
  // The stored sessions holding the set logged at t1.
  var logsOf=function(t1){ return Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0 &&
      Object.keys(store[k].logs||{}).some(function(ex){ return (store[k].logs[ex]||[]).some(function(s){ return s.t===t1; }); }); })
    .map(function(k){ return store[k]; }); };
  // Every set across every stored session, by when it was logged.
  var dupSets=function(){ var seen={}, dup=[];
    Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0; }).forEach(function(k){
      var l=store[k].logs||{}; Object.keys(l).forEach(function(ex){ (l[ex]||[]).forEach(function(s){
        if(s.t===undefined) return; if(seen[s.t]) dup.push(ex+'@'+s.t+' in '+seen[s.t]+' and '+k); else seen[s.t]=k; }); }); });
    return dup; };
  // A starts Push and logs a set, B opens it, A finishes.
  var startShared=async function(){
    var day=await today();
    store['state/session']={active:null}; store['days/'+day]=blank();
    await go();
    await p.click('[data-action="tab"][data-tab="training"]');
    await p.click('[data-action="startworkout"][data-id="w6"]'); await toEx(p,BENCH);
    await logIn(p,BENCH,60,8); await p.waitForTimeout(1800);
    var s=(store['state/session']||{}).active;
    assert.ok(s && s.logs[BENCH] && s.logs[BENCH].length===1,'A did not save its set: '+JSON.stringify(s));
    var q=await openView(); await resumeIn(q); await toEx(q,BENCH);
    return {q:q, t1:s.logs[BENCH][0].t, day:day};
  };

  await t('a session finished in one view stays finished when another view logs a set on it', async function(){
    var o=await startShared(), q=o.q;
    try{
      await finishIn(p); await p.waitForTimeout(1800);
      assert.strictEqual(store['state/session'].active,null,'A finished, but the session is still stored');
      var xp=store['state/profile'].totalXp;
      await logIn(q,BENCH,60,7); await q.waitForTimeout(2200);
      assert.strictEqual(store['state/session'].active,null,'the set logged in B brought the finished session back: '+
        JSON.stringify(store['state/session']).slice(0,160));
      var logs=logsOf(o.t1);
      assert.strictEqual(logs.length,1,logs.length+' logs for one session');
      assert.deepStrictEqual(logs[0].logs[BENCH].map(function(s){ return s.v; }),[8,7],'the set B logged is not on the session\'s log: '+
        JSON.stringify(logs[0].logs[BENCH]));
      assert.deepStrictEqual(dupSets(),[],'a set is stored twice');
      assert.strictEqual(store['state/profile'].totalXp,xp,'the extra set paid xp');
      // Nothing that view does next puts it back.
      if(await q.locator('[data-action="finishworkout"]').count()) await finishIn(q);
      await q.waitForTimeout(1800);
      assert.strictEqual(store['state/session'].active,null,'B brought the session back');
      assert.strictEqual(logsOf(o.t1).length,1,'B logged the session a second time');
      assert.deepStrictEqual(dupSets(),[],'a set is stored twice');
    } finally { await q.context().close(); }
    await go(); await p.click('[data-action="tab"][data-tab="training"]');
    assert.strictEqual(await p.locator('[data-action="resumesession"]').count(),0,'the finished session is offered to resume');
    await toToday();
  });

  // Hidden straight after the set, the view has no time to read and sends what
  // it changed, so the session goes back in whole.
  await t('a view hidden straight after a set on a session finished elsewhere does not bring it back', async function(){
    var o=await startShared(), q=o.q;
    try{
      await finishIn(p); await p.waitForTimeout(1800);
      await logIn(q,BENCH,60,7); await hideIn(q); await q.waitForTimeout(1200);
      var sd=store['state/session'];
      assert.ok(!(sd.active && (sd.ended||[]).indexOf(sd.active.id)<0),'the hidden view made the finished session live again: '+JSON.stringify(sd).slice(0,160));
      await showIn(q); await q.waitForTimeout(2000);
      var logs=logsOf(o.t1);
      assert.strictEqual(logs.length,1,logs.length+' logs for one session');
      assert.deepStrictEqual(logs[0].logs[BENCH].map(function(s){ return s.v; }),[8,7],'the set logged before hiding is not on the log: '+
        JSON.stringify(logs[0].logs[BENCH]));
      assert.deepStrictEqual(dupSets(),[],'a set is stored twice');
      assert.strictEqual(store['state/session'].active,null,'the session written back is still stored');
    } finally { await q.context().close(); }
    await go(); await p.click('[data-action="tab"][data-tab="training"]');
    assert.strictEqual(await p.locator('[data-action="resumesession"]').count(),0,'the finished session is offered to resume');
    await toToday();
  });

  await t('a session finished in two views is logged once, with every set, and pays once', async function(){
    var o=await startShared(), q=o.q;
    try{
      var xp0=store['state/profile'].totalXp;
      await finishIn(p); await p.waitForTimeout(1800);
      var xp=store['state/profile'].totalXp;
      assert.ok(xp>xp0,'finishing paid no xp, so this proves nothing');
      // B has not looked since: it logs one more and finishes straight away.
      await q.evaluate(function(ex){
        document.getElementById('log-w-'+ex).value='60'; document.getElementById('log-v-'+ex).value='7';
        document.querySelector('[data-action="logset"][data-ex="'+ex+'"]').click();
        for(var i=0;i<12 && !document.querySelector('[data-action="finishworkout"]');i++) document.querySelector('[data-action="nextslide"]').click();
        document.querySelector('[data-action="finishworkout"]').click();
      },BENCH);
      await q.waitForTimeout(2500);
      var logs=logsOf(o.t1);
      assert.strictEqual(logs.length,1,logs.length+' logs for one session: '+logs.map(function(l){ return l.id; }).join(', '));
      assert.deepStrictEqual(logs[0].logs[BENCH].map(function(s){ return s.v; }),[8,7],'the sets are not all on the log: '+
        JSON.stringify(logs[0].logs[BENCH]));
      assert.deepStrictEqual(dupSets(),[],'a set is stored twice');
      assert.strictEqual(store['state/session'].active,null,'the session is still stored');
      assert.strictEqual(store['state/profile'].totalXp,xp,'one session paid twice: xp '+xp+' became '+store['state/profile'].totalXp);
    } finally { await q.context().close(); }
  });

  // Hidden straight after its Finish, the second view writes its log with no
  // read first, onto a log the first view already wrote for the same session.
  await t('a session finished in two views, the second hidden at once, keeps every set and pays once', async function(){
    var o=await startShared(), q=o.q;
    try{
      var xp0=store['state/profile'].totalXp;
      await logIn(p,BENCH,62.5,8); await p.waitForTimeout(300);
      await finishIn(p); await p.waitForTimeout(1800);
      var xp=store['state/profile'].totalXp;
      assert.ok(xp>xp0,'finishing paid no xp, so this proves nothing');
      await q.evaluate(function(ex){
        document.getElementById('log-w-'+ex).value='60'; document.getElementById('log-v-'+ex).value='7';
        document.querySelector('[data-action="logset"][data-ex="'+ex+'"]').click();
        for(var i=0;i<12 && !document.querySelector('[data-action="finishworkout"]');i++) document.querySelector('[data-action="nextslide"]').click();
        document.querySelector('[data-action="finishworkout"]').click();
      },BENCH);
      await hideIn(q); await q.waitForTimeout(1200); await showIn(q); await q.waitForTimeout(2000);
      await hideIn(p); await showIn(p); await p.waitForTimeout(1800);
      var logs=logsOf(o.t1);
      assert.strictEqual(logs.length,1,logs.length+' logs for one session: '+logs.map(function(l){ return l.id; }).join(', '));
      assert.deepStrictEqual(logs[0].logs[BENCH].map(function(s){ return s.w+'x'+s.v; }),['60x8','62.5x8','60x7'],'the sets are not all on the log: '+
        JSON.stringify(logs[0].logs[BENCH]));
      assert.deepStrictEqual(dupSets(),[],'a set is stored twice');
      assert.strictEqual(store['state/session'].active,null,'the session is still stored');
      assert.strictEqual(store['state/profile'].totalXp,xp,'one session paid twice: xp '+xp+' became '+store['state/profile'].totalXp);
    } finally { await q.context().close(); }
  });

  await t('a session discarded in one view is not brought back by a set in another, and can be put back there', async function(){
    var o=await startShared(), q=o.q, logs0=Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0; }).length;
    try{
      await tap('[data-action="cancelsession"]'); await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(200);
      await p.click('[data-action="discardsession"]'); await p.waitForTimeout(1800);
      assert.strictEqual(store['state/session'].active,null,'the discard was not saved');
      await logIn(q,BENCH,60,7); await q.waitForTimeout(2200);
      assert.strictEqual(store['state/session'].active,null,'a set logged in B brought the discarded session back');
      var bar=await q.evaluate(function(){ var e=document.querySelector('.undo-bar'); return e?e.textContent:''; });
      assert.ok(/ended on another device/.test(bar),'B is not told, nor offered it back: '+bar);
      await q.click('[data-action="undo"]'); await q.waitForTimeout(1800);
      var s=store['state/session'].active;
      assert.ok(s && s.logs[BENCH].length===2,'Undo did not put the session back with both sets: '+JSON.stringify(s));
      assert.strictEqual(Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0; }).length,logs0,'a log was written');
    } finally { await q.context().close(); }
    store['state/session']={active:null};
    await go();
  });

  console.log('\nTWO VIEWS ADDING TO THE SAME LISTS');
  await t('extras added in two views are both kept', async function(){
    store['state/shopping']={checked:[],extras:[]};
    await go();
    var q=await openView();
    try{
      await p.click('[data-action="tab"][data-tab="meals"]'); await q.click('[data-action="tab"][data-tab="meals"]');
      await p.fill('#shop-add','coffee'); await p.click('[data-action="addextra"]'); await p.waitForTimeout(1800);
      await q.fill('#shop-add','bin bags'); await q.click('[data-action="addextra"]'); await q.waitForTimeout(1800);
      var got=store['state/shopping'].extras.map(function(x){ return x.text; }).sort();
      assert.deepStrictEqual(got,['bin bags','coffee'],'the store holds '+JSON.stringify(got));
    } finally { await q.context().close(); }
  });

  await t('ticks made in two views are both kept, and so is an untick', async function(){
    store['state/shopping']={checked:['x|xC'],extras:[{id:'xA',text:'Apples'},{id:'xB',text:'Bread'},{id:'xC',text:'Cheese'}]};
    await go();
    var q=await openView();
    try{
      await p.click('[data-action="tab"][data-tab="meals"]'); await q.click('[data-action="tab"][data-tab="meals"]');
      await p.click('[data-action="shopcheck"][data-item="x|xA"]'); await p.waitForTimeout(1800);
      await q.click('[data-action="shopcheck"][data-item="x|xB"]'); await q.click('[data-action="shopcheck"][data-item="x|xC"]');
      await q.waitForTimeout(1800);
      assert.deepStrictEqual(store['state/shopping'].checked.slice().sort(),['x|xA','x|xB'],'ticks: '+JSON.stringify(store['state/shopping'].checked));
    } finally { await q.context().close(); }
    store['state/shopping']={checked:[],extras:[]};
  });

  await t('sets logged on one session from two views are all kept', async function(){
    var o=await startShared(), q=o.q;
    try{
      await logIn(p,BENCH,62.5,8); await p.waitForTimeout(1800);
      await logIn(q,BENCH,65,6); await q.waitForTimeout(1800);
      var s=store['state/session'].active;
      assert.deepStrictEqual(s.logs[BENCH].map(function(x){ return x.w; }),[60,62.5,65],'the sets: '+JSON.stringify(s.logs[BENCH]));
      // And each view now shows all three.
      await p.evaluate(function(){ document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(1200);
      var chips=await p.locator('.setchip').count();
      assert.ok(chips>=3,'A shows '+chips+' sets');
    } finally { await q.context().close(); }
    store['state/session']={active:null};
    await go();
  });

  // A view hidden straight after a change has no time to read first. What it
  // changed in a list both views add to, or in XP, must not be written over
  // what another view saved meanwhile, and must not be counted twice.
  console.log('\nA VIEW HIDDEN STRAIGHT AFTER A CHANGE BOTH VIEWS ADD TO');
  // Documents still carrying what a hidden view sent beside them.
  var pending=function(){ return Object.keys(store).filter(function(k){
    return store[k] && typeof store[k]==='object' && Object.keys(store[k]).some(function(f){ return f.indexOf('pend_')===0; }); }); };
  await t('a tick in a view hidden at once keeps the tick another view saved, if that view is never seen again', async function(){
    store['state/shopping']={checked:[],extras:[{id:'xA',text:'Apples'},{id:'xB',text:'Bread'}]};
    await go();
    var q=await openView();
    try{
      await p.click('[data-action="tab"][data-tab="meals"]'); await q.click('[data-action="tab"][data-tab="meals"]');
      await p.click('[data-action="shopcheck"][data-item="x|xA"]'); await p.waitForTimeout(1800);
      assert.deepStrictEqual(store['state/shopping'].checked,['x|xA'],'A did not save its tick');
      await q.click('[data-action="shopcheck"][data-item="x|xB"]'); await hideIn(q); await q.waitForTimeout(800);
    } finally { await q.context().close(); }
    await hideIn(p); await showIn(p); await p.waitForTimeout(1800);
    assert.deepStrictEqual(store['state/shopping'].checked.slice().sort(),['x|xA','x|xB'],'ticks: '+JSON.stringify(store['state/shopping'].checked));
    assert.ok(await p.locator('.shop.checked[data-item="x|xB"]').count(),'A does not show the tick made in the hidden view');
    assert.deepStrictEqual(pending(),[],'what the hidden view sent is still beside the list');
    store['state/shopping']={checked:[],extras:[]};
    await toToday();
  });

  await t('an extra added in a view hidden at once keeps the one another view saved', async function(){
    store['state/shopping']={checked:[],extras:[]};
    await go();
    var q=await openView();
    try{
      await p.click('[data-action="tab"][data-tab="meals"]'); await q.click('[data-action="tab"][data-tab="meals"]');
      await p.fill('#shop-add','coffee'); await p.click('[data-action="addextra"]'); await p.waitForTimeout(1800);
      await q.fill('#shop-add','bin bags'); await q.click('[data-action="addextra"]'); await hideIn(q); await q.waitForTimeout(800);
      await showIn(q); await q.waitForTimeout(1800);
      var got=store['state/shopping'].extras.map(function(x){ return x.text; }).sort();
      assert.deepStrictEqual(got,['bin bags','coffee'],'the store holds '+JSON.stringify(got));
      await hideIn(p); await showIn(p); await p.waitForTimeout(1500);
      got=store['state/shopping'].extras.map(function(x){ return x.text; }).sort();
      assert.deepStrictEqual(got,['bin bags','coffee'],'after both looked again the store holds '+JSON.stringify(got));
      assert.deepStrictEqual(pending(),[],'what the hidden view sent is still beside the list');
    } finally { await q.context().close(); }
    store['state/shopping']={checked:[],extras:[]};
    await toToday();
  });

  await t('a set logged in a view hidden at once keeps the set another view saved', async function(){
    var o=await startShared(), q=o.q;
    try{
      await logIn(p,BENCH,62.5,8); await p.waitForTimeout(1800);
      await logIn(q,BENCH,65,6); await hideIn(q); await q.waitForTimeout(800);
      await showIn(q); await q.waitForTimeout(1800);
      await hideIn(p); await showIn(p); await p.waitForTimeout(1800);
      var s=store['state/session'].active;
      assert.deepStrictEqual(s.logs[BENCH].map(function(x){ return x.w; }),[60,62.5,65],'the sets: '+JSON.stringify(s.logs[BENCH]));
      var chips=await p.locator('.setchip').count();
      assert.ok(chips>=3,'A shows '+chips+' sets');
      assert.deepStrictEqual(pending(),[],'what the hidden view sent is still beside the session');
    } finally { await q.context().close(); }
    store['state/session']={active:null};
    await go();
  });

  await t('xp earned in a view hidden at once is counted once, and keeps what another view earned', async function(){
    var day=await today(); store['days/'+day]=blank();
    await go();
    var x0=store['state/profile'].totalXp, cup=+doc.match(/var XP_PER_WATER=(\d+)/)[1];
    await p.click(W); await p.waitForTimeout(200);
    await hideIn(p); await p.waitForTimeout(800); await showIn(p); await p.waitForTimeout(1800);
    var x1=store['state/profile'].totalXp;
    assert.strictEqual(x1,x0+cup,'one cup earned '+(x1-x0)+' xp, not '+cup);
    // A second view that has not looked since, closed straight after its tap.
    var q=await openView();
    try{
      await p.click(W); await p.waitForTimeout(1800);
      assert.strictEqual(store['state/profile'].totalXp,x1+cup,'A did not save its xp');
      await q.click('[data-action="water"][data-d="1"]'); await hideIn(q); await q.waitForTimeout(800);
    } finally { await q.context().close(); }
    await hideIn(p); await showIn(p); await p.waitForTimeout(1800);
    assert.strictEqual(store['state/profile'].totalXp,x0+3*cup,'three cups, each paid once, but xp went '+x0+' to '+store['state/profile'].totalXp);
    assert.deepStrictEqual(pending(),[],'what the hidden view sent is still beside the xp');
  });

  // Hidden straight after Finish, the log goes without a read first. A write
  // that lands but answers with an error is this view's own log, not one
  // another view wrote first, so the finish keeps its xp.
  await t('a finish whose log landed but answered with an error, hidden at once, keeps its xp', async function(){
    var day=await today();
    store['state/session']={active:null}; store['days/'+day]=blank();
    await go();
    await p.click('[data-action="tab"][data-tab="training"]');
    await p.click('[data-action="startworkout"][data-id="w6"]'); await toEx(p,BENCH);
    await logIn(p,BENCH,60,8); await p.waitForTimeout(1800);
    var x0=store['state/profile'].totalXp, hit=0;
    await p.route('**/db/set',async function(route){
      var body=JSON.parse(route.request().postData()||'{}');
      if(!hit && String(body.path).indexOf('workoutLogs/')===0){ hit++; var r=await route.fetch(); await r.text();
        return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({err:'unavailable'})}); }
      return route.continue();
    });
    try{
      await finishIn(p); await hideIn(p); await p.waitForTimeout(5000); await showIn(p); await p.waitForTimeout(2500);
    } finally { await p.unroute('**/db/set'); }
    assert.strictEqual(hit,1,'the log write was never answered with an error, so this proves nothing');
    assert.ok(store['state/profile'].totalXp>x0,'the finish paid nothing: xp '+x0+' then '+store['state/profile'].totalXp);
    assert.strictEqual(store['state/session'].active,null,'the finish was not saved');
    await toToday();
  });

  // A tick sent by a view that then closed is not lost to a view that loads later.
  await t('a change sent by a view closed at once reaches the next view to load', async function(){
    store['state/shopping']={checked:[],extras:[{id:'xA',text:'Apples'},{id:'xB',text:'Bread'}]};
    await go();
    var q=await openView();
    try{
      await p.click('[data-action="tab"][data-tab="meals"]'); await q.click('[data-action="tab"][data-tab="meals"]');
      await p.click('[data-action="shopcheck"][data-item="x|xA"]'); await p.waitForTimeout(1800);
      await q.click('[data-action="shopcheck"][data-item="x|xB"]'); await hideIn(q); await q.waitForTimeout(800);
    } finally { await q.context().close(); }
    await go(); await p.click('[data-action="tab"][data-tab="meals"]');
    assert.ok(await p.locator('.shop.checked[data-item="x|xA"]').count() && await p.locator('.shop.checked[data-item="x|xB"]').count(),'the view loaded after does not show both ticks');
    await p.waitForTimeout(1800);
    assert.deepStrictEqual(store['state/shopping'].checked.slice().sort(),['x|xA','x|xB'],'ticks: '+JSON.stringify(store['state/shopping'].checked));
    assert.deepStrictEqual(pending(),[],'what the closed view sent was never folded in');
    store['state/shopping']={checked:[],extras:[]};
    await toToday();
  });

  console.log('\nAN EXERCISE TAKEN OUT OF A SESSION');
  var startPush=async function(){
    var day=await today();
    store['state/session']={active:null}; store['days/'+day]=blank();
    await go();
    await p.click('[data-action="tab"][data-tab="training"]');
    await p.click('[data-action="startworkout"][data-id="w6"]'); await p.waitForTimeout(300);
  };
  // Logs holding an exercise with no sets. Each check clears them on the way
  // out, so one that fails cannot stop the next from loading.
  var emptyLogs=function(){ return Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0 &&
      Object.keys(store[k].logs||{}).some(function(ex){ return !(store[k].logs[ex]||[]).length; }); }); };
  var clearEmpty=function(){ emptyLogs().forEach(function(k){ delete store[k]; }); };
  var progressShows=async function(){
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(400);
    assert.ok(/sets logged/i.test(await text()),'Progress did not draw');
  };
  await t('an exercise taken out after its set was saved comes back with that set on Undo', async function(){
    await startPush(); await toEx(p,BENCH);
    await logIn(p,BENCH,60,8); await p.waitForTimeout(1800);
    assert.strictEqual(store['state/session'].active.logs[BENCH].length,1,'the set was not saved');
    await p.click('[data-action="removeex"][data-id="'+BENCH+'"]'); await p.waitForTimeout(1800);
    var s=store['state/session'].active;
    assert.ok(s.exIds.indexOf(BENCH)<0,'the removal was not saved');
    assert.ok(!(BENCH in s.logs),'an emptied list was stored for the exercise taken out: '+JSON.stringify(s.logs));
    await p.click('[data-action="undo"]'); await p.waitForTimeout(1800);
    s=store['state/session'].active;
    assert.ok(s.exIds.indexOf(BENCH)>-1,'Undo did not put the exercise back');
    assert.ok(s.logs[BENCH] && s.logs[BENCH].length===1,'Undo put it back without its set: '+JSON.stringify(s.logs[BENCH]));
    store['state/session']={active:null};
    await go();
  });

  await t('a session finished after its warm-up was taken out logs no empty warm-up, and Progress draws', async function(){
    try{
      await startPush();
      await p.fill('#log-v-warmup','5'); await p.click('[data-action="logset"][data-ex="warmup"]'); await p.waitForTimeout(1800);
      await p.click('[data-action="removeex"][data-id="warmup"]'); await p.waitForTimeout(1800);
      await toEx(p,BENCH); await logIn(p,BENCH,60,8); await p.waitForTimeout(300);
      var n=errs.length;
      await finishIn(p); await p.waitForTimeout(1800);
      assert.deepStrictEqual(errs.slice(n),[],'finishing threw: '+errs.slice(n).join(' | '));
      assert.strictEqual(store['state/session'].active,null,'the finish was not saved');
      assert.deepStrictEqual(emptyLogs(),[],'a log holds an exercise with no sets');
      await progressShows();
      assert.deepStrictEqual(errs.slice(n),[],'Progress threw: '+errs.slice(n).join(' | '));
    } finally { clearEmpty(); store['state/session']={active:null}; await go(); await toToday(); }
  });

  await t('a session finished after its only warm-up set was undone logs no empty warm-up, and Progress draws', async function(){
    try{
      await startPush();
      await p.fill('#log-v-warmup','5'); await p.click('[data-action="logset"][data-ex="warmup"]'); await p.waitForTimeout(300);
      await p.click('[data-action="undoset"][data-ex="warmup"]'); await p.waitForTimeout(1800);
      await toEx(p,BENCH); await logIn(p,BENCH,60,8); await p.waitForTimeout(300);
      var n=errs.length;
      await finishIn(p); await p.waitForTimeout(1800);
      assert.deepStrictEqual(emptyLogs(),[],'a log holds an exercise with no sets');
      await progressShows();
      assert.deepStrictEqual(errs.slice(n),[],'Progress threw: '+errs.slice(n).join(' | '));
    } finally { clearEmpty(); store['state/session']={active:null}; await go(); await toToday(); }
  });

  // Saved by an earlier version, which could log an exercise with no sets.
  await t('a stored log holding an exercise with no sets does not stop Progress drawing', async function(){
    store['workoutLogs/wlEmpty']={id:'wlEmpty',workoutId:'w6',title:'Push',tag:'Strength',date:'2026-09-28',
      logs:{warmup:[],press_bench:[{v:8,w:60,t:5}]}};
    try{
      await go(); var n=errs.length;
      await progressShows();
      assert.deepStrictEqual(errs.slice(n),[],'Progress threw: '+errs.slice(n).join(' | '));
    } finally { clearEmpty(); await go(); await toToday(); }
  });

  console.log('\nWHAT OTHER VIEWS ADD OR DELETE REACHES THIS ONE');
  await t('a sauna visit logged in another view shows here once the page is looked at again', async function(){
    await go();
    var q=await openView();
    try{
      await q.fill('#sauna-mins','17'); await q.fill('#sauna-temp','77'); await q.selectOption('#sauna-pos','Top');
      await q.click('[data-action="logsauna"]'); await q.waitForTimeout(1800);
      var id=Object.keys(store).filter(function(k){ return k.indexOf('sauna/')===0 && store[k].mins===17 && store[k].temp===77; })[0];
      assert.ok(id,'B did not save its visit');
      await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(300);
      await hideIn(p); await showIn(p); await p.waitForTimeout(1500);
      assert.ok(await p.locator('[data-action="delsauna"][data-id="'+store[id].id+'"]').count(),'A does not show the visit B logged');
      // And one B deletes goes from here too.
      await q.click('[data-action="tab"][data-tab="progress"]'); await q.waitForTimeout(300);
      await q.evaluate(function(x){ document.querySelector('[data-action="delsauna"][data-id="'+x+'"]').click(); },store[id].id);
      await q.waitForTimeout(1800);
      assert.ok(!store[id],'B did not delete it');
      await hideIn(p); await showIn(p); await p.waitForTimeout(1500);
      assert.strictEqual(await p.locator('[data-action="delsauna"][data-id="'+id.slice(6)+'"]').count(),0,'A still shows the visit B deleted');
      assert.ok(!store[id],'A wrote the deleted visit back');
    } finally { await q.context().close(); }
    await toToday();
  });

  await t('a recipe deleted in another view is not written back by a change here', async function(){
    await go();
    var rid=Object.keys(store).filter(function(k){ return k.indexOf('recipes/')===0; }).sort().slice(-1)[0].slice(8);
    var q=await openView();
    try{
      await p.click('[data-action="tab"][data-tab="meals"]'); await q.click('[data-action="tab"][data-tab="meals"]');
      await q.click('[data-action="delrecipe"][data-id="'+rid+'"]'); await q.waitForTimeout(1800);
      assert.ok(!store['recipes/'+rid],'B did not delete the recipe');
      await p.click('[data-action="toggleex"][data-id="rec:'+rid+'"]');
      await p.click('[data-action="portions"][data-id="'+rid+'"][data-d="1"]'); await p.waitForTimeout(1800);
      assert.ok(!store['recipes/'+rid],'A wrote the deleted recipe back: '+JSON.stringify(store['recipes/'+rid]));
      await hideIn(p); await showIn(p); await p.waitForTimeout(1500);
      assert.ok(!store['recipes/'+rid],'A wrote the deleted recipe back when looked at again');
      assert.strictEqual(await p.locator('[data-action="delrecipe"][data-id="'+rid+'"]').count(),0,'A still shows the deleted recipe');
    } finally { await q.context().close(); }
    await toToday();
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
    await p.click('[data-action="restorebackup"]'); await p.click('[data-action="restoreconfirm"]'); await settle();
    await go();
    assert.deepStrictEqual(await exported(),a,'putting the backup back did not restore the data');
  });

  // Another device saves after this view loaded, so this view never heard of
  // what it saved; replacing everything still has to take it away.
  await t('replacing everything also removes what another view saved after this one loaded', async function(){
    await go(); var day=await today();
    store['sauna/sa999']={id:'sa999',date:'2026-09-30',mins:12,temp:80,position:'Top',stints:[{mins:12,position:'Top'}]};
    store['workoutLogs/wl999']={id:'wl999',workoutId:'w6',title:'Push',tag:'Strength',date:'2026-09-30',logs:{press_bench:[{v:5,w:100,t:1}]}};
    await importing(JSON.stringify({schema:1,days:{'2026-09-29':blank()}}));
    await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
    // Today is made again by the first tap after it, as on any day.
    var left=function(){ return Object.keys(store).filter(function(k){ return k.indexOf('state/')!==0 && k!=='days/2026-09-29' && k!=='days/'+day; }); };
    assert.deepStrictEqual(left(),[],'documents the import does not have are still stored');
    await go();
    assert.deepStrictEqual(left(),[],'they came back on a reload');
    // Putting the data back goes the same way.
    store['sauna/sa998']={id:'sa998',date:'2026-09-30',mins:9,temp:80,position:'Top',stints:[{mins:9,position:'Top'}]};
    await p.click('[data-action="tab"][data-tab="progress"]');
    if(!(await p.locator('[data-action="restorebackup"]').count())) await p.click('[data-action="datapane"][data-p="import"]');
    await p.click('[data-action="restorebackup"]'); await p.click('[data-action="restoreconfirm"]'); await settle();
    assert.ok(!store['sauna/sa998'],'putting the data back kept a visit it never had');
    assert.ok(store['sauna/sa999'] && store['workoutLogs/wl999'],'putting the data back did not restore what the import replaced');
  });

  // Another view started a session after this one last read the store.
  await t('replacing everything ends a session another view started, and its next hidden set does not bring it back', async function(){
    var day=await today();
    store['state/session']={active:null}; store['days/'+day]=blank();
    await go();
    var q=await openView();
    try{
      await q.click('[data-action="tab"][data-tab="training"]');
      await q.click('[data-action="startworkout"][data-id="w6"]'); await toEx(q,BENCH);
      await logIn(q,BENCH,60,8); await q.waitForTimeout(1800);
      var y=(store['state/session'].active||{}).id;
      assert.ok(y,'the other view did not save its session');
      await importing(JSON.stringify({schema:1,days:{'2026-09-29':blank()}}));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      var sd=store['state/session'];
      assert.ok((sd.ended||[]).indexOf(y)>-1,'the replaced session is not recorded as ended: '+JSON.stringify(sd).slice(0,160));
      await logIn(q,BENCH,60,7); await hideIn(q); await q.waitForTimeout(1000);
      sd=store['state/session'];
      assert.ok(!(sd.active && (sd.ended||[]).indexOf(sd.active.id)<0),'the replaced session is live again: '+JSON.stringify(sd).slice(0,160));
    } finally { await q.context().close(); }
    await go(); await p.click('[data-action="tab"][data-tab="training"]');
    assert.strictEqual(await p.locator('[data-action="resumesession"]').count(),0,'the replaced session is offered to resume');
    await toToday();
  });

  // A file in the seed's shape, recipes carrying inPlan/day, goes through the
  // same conversion a store in that shape gets on load, not on the next load.
  await t('an import in the old recipe shape is converted as it goes in', async function(){
    await go();
    await importing(JSON.stringify({schema:1, recipes:[{id:'oldr',title:'Old one',ingredients:['Eggs (2)'],inPlan:true,day:'Mon'}]}));
    await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
    var r=store['recipes/oldr'];
    assert.ok(r && !('inPlan' in r) && !('day' in r),'the recipe went in unconverted: '+JSON.stringify(r));
    assert.ok(Object.keys(store).some(function(k){ return k.indexOf('plan/')===0 && store[k].recipeId==='oldr'; }),'its place in the plan was dropped');
  });

  console.log('\nIMPORTED TEXT STAYS TEXT');
  // An import is somebody else's file: whatever it holds is drawn as text,
  // and an id that could break out of an attribute is not taken at all.
  var XSS='<img src=x onerror="window.__x=1">';
  var unpwned=async function(){
    await p.waitForTimeout(400);
    assert.strictEqual(await p.evaluate(function(){ return window.__x; }),undefined,'markup from the import ran');
    assert.strictEqual(await p.evaluate(function(){ return window.__pwn; }),undefined,'markup from the import ran');
    assert.strictEqual(await p.locator('#pwn, #app img').count(),0,'markup from the import became an element');
  };
  await t('markup in an imported set reads as text in the history and on the session slide', async function(){
    await go(); var day=await today();
    var wu=[{v:5,w:null,opt:XSS,lvl:'',lvlKind:'effort',t:1}], iv=[{v:10,w:null,machine:XSS,work:XSS,rest:XSS,t:2}];
    await importing(JSON.stringify({schema:1, days:{}, workoutLogs:[{id:'wlx1',workoutId:'w4',title:'Conditioning circuit',
      tag:'Conditioning',date:day,logs:{warmup:wu,cardio_gym_intervals:iv}}],
      activeSession:{id:'sx1',workoutId:'w4',startedAt:day,t0:1,exIds:['warmup','cardio_gym_intervals'],targets:{},
        logs:{warmup:wu,cardio_gym_intervals:iv}}}));
    await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
    await p.click('[data-action="tab"][data-tab="progress"]');
    await p.click('[data-action="toggleex"][data-id="warmup"]');
    await p.click('[data-action="toggleex"][data-id="cardio_gym_intervals"]');
    var body=await text();
    assert.ok(body.split(XSS).length>4,'the history does not show the markup as text: '+body.slice(0,400));
    await unpwned();
    await resumeIn(p);
    // The session opens on whichever slide this device was last on, and gets
    // a cool-down on the end, so start from the warm-up.
    for(var k=0;k<6 && !(await p.locator('[data-action="prevslide"][disabled]').count());k++){
      await p.click('[data-action="prevslide"]'); await p.waitForTimeout(80); }
    for(var i=0;i<2;i++){
      var chips=await p.locator('.setchip').allTextContents();
      assert.ok(chips.some(function(c){ return c.indexOf(XSS)>-1; }),
        'slide '+(i+1)+'\'s set does not show the markup as text: '+chips.join(' | ')+' on '+(await text()).slice(0,300));
      await unpwned();
      if(!i){ await p.click('[data-action="nextslide"]'); await p.waitForTimeout(200); }
    }
    await toToday(); await p.click('[data-action="tab"][data-tab="training"]');
    // Its save is on a timer, and has to land before the next check counts writes.
    await p.click('[data-action="discardsession"]'); await p.waitForTimeout(1600); await settle();
    await toToday();
  });

  await t('an imported exercise id holding markup or named __proto__ is refused, and Progress still draws', async function(){
    await go(); var day=await today(), n=calls.set+calls.del;
    var log=function(key){ return '{"schema":1,"workoutLogs":[{"id":"wlx2","date":"'+day+'","logs":{'+JSON.stringify(key)+':[{"v":5,"w":null,"t":3}]}}]}'; };
    var keys=['x"><img id=pwn src=x onerror="window.__x=2">','__proto__'];
    for(var i=0;i<keys.length;i++){
      await importing(log(keys[i]));
      var offered=await p.locator('[data-action="doimport"]').count();
      if(offered){ await p.click('[data-action="doimport"][data-mode="replace"]'); await settle(); await p.click('[data-action="tab"][data-tab="progress"]'); }
      await unpwned();
      assert.ok(!offered,'it offered to import the id '+JSON.stringify(keys[i]));
      assert.ok(await p.locator('[role="alert"]').count(),'no reason given for '+JSON.stringify(keys[i]));
    }
    assert.ok(await p.locator('.stat-row').count(),'Progress did not draw');
    await p.waitForTimeout(1300);
    assert.strictEqual(calls.set+calls.del,n,'a refused import wrote to the store');
  });

  await t('an imported workout type holding markup is refused', async function(){
    await go(); var day=await today(), d=blank(); d.workout={done:true,type:'<img src=x onerror="window.__pwn=1">'};
    var o={schema:1, days:{}}; o.days[day]=d;
    await importing(JSON.stringify(o));
    var offered=await p.locator('[data-action="doimport"]').count();
    if(offered){ await p.click('[data-action="doimport"][data-mode="replace"]'); await settle(); await toToday(); }
    await unpwned();
    assert.ok(!offered,'it offered to import the workout type');
  });

  // Saved before any of this was checked, so it is in the store already and
  // comes back on every load: drawn as text, and no render stopped by it.
  await t('markup and built-in names already stored draw as text and stop no render', async function(){
    await go(); var day=await today(), d=blank(), e0=errs.length;
    d.workout={done:true,type:'<img src=x onerror="window.__pwn=1">'};
    store['days/'+day]=d;
    store['workoutLogs/wlproto']=JSON.parse('{"id":"wlproto","workoutId":"w1","title":"Old","tag":"Strength","date":"'+day+'",'+
      '"logs":{"__proto__":[{"v":5,"w":null,"t":11}],"constructor":[{"v":6,"w":null,"t":12}],"x\\"><img id=pwn src=x>":[{"v":7,"w":null,"t":13}]}}');
    store['plan/plproto']={id:'plproto',recipeId:'p2',date:day,slot:'constructor',portions:1};
    try{
      await go();
      await p.click('[data-action="tab"][data-tab="today"]');
      assert.ok((await text()).indexOf('Logged: <img src=x onerror="window.__pwn=1">')>-1,'the stored workout type is not shown as text');
      await unpwned();
      await p.click('[data-action="tab"][data-tab="progress"]');
      assert.ok(await p.locator('.stat-row').count(),'Progress did not draw');
      var tops=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('[data-action="toggleex"]'),function(e){ return e.getAttribute('data-id'); }); });
      assert.ok(tops.indexOf('__proto__')>-1 && tops.indexOf('constructor')>-1,'the stored exercises are not listed: '+tops.join(', '));
      assert.ok(tops.indexOf('x"><img id=pwn src=x>')>-1,'the id holding markup did not stay one attribute');
      await p.click('[data-action="toggleex"][data-id="__proto__"]');
      assert.strictEqual(await p.locator('[data-action="toggleex"][data-id="__proto__"]').getAttribute('aria-expanded'),'true','its history does not open');
      await unpwned();
      await p.click('[data-action="tab"][data-tab="meals"]');
      assert.ok(await p.locator('.weekbox.cal').count(),'Meals did not draw');
      assert.deepStrictEqual(errs.slice(e0),[],'a render stopped');
    } finally {
      delete store['workoutLogs/wlproto']; delete store['plan/plproto']; store['days/'+day]=blank();
      await go();
    }
  });

  console.log('\nNO IMPORT CAN BREAK RENDER');
  // Each tab draws what it always shows, and nothing threw on the way.
  var everyTab=async function(why){
    await toToday();
    var marks={today:'[data-action="water"]',training:'[data-action="startworkout"]',meals:'.weekbox.cal',progress:'.stat-row'};
    for(var k in marks){
      await p.click('[data-action="tab"][data-tab="'+k+'"]'); await p.waitForTimeout(150);
      assert.ok(await p.locator(marks[k]).count(),k+' did not draw '+why);
    }
    await p.click('[data-action="tab"][data-tab="today"]');
  };
  // What the store held before, put back whatever the check did to it.
  var putBack=async function(was){
    Object.keys(store).forEach(function(k){ delete store[k]; });
    Object.keys(was).forEach(function(k){ store[k]=was[k]; });
    await go();
  };
  // Refused with a reason, and nothing broken. Before the fix each of these
  // was offered, so it is put in to show what it did.
  var refused=async function(o,re){
    var e0=errs.length;
    await importing(JSON.stringify(o));
    var offered=await p.locator('[data-action="doimport"]').count();
    if(offered){ await p.click('[data-action="doimport"][data-mode="replace"]'); await settle(); }
    var msg=offered?'':await p.locator('[role="alert"]').first().textContent();
    await everyTab('after the import');
    assert.ok(!offered,'it offered to import '+JSON.stringify(o).slice(0,160));
    assert.ok(re.test(msg),'the reason "'+msg+'" does not name '+re);
    assert.deepStrictEqual(errs.slice(e0),[],'a render threw: '+errs.slice(e0).join(' | '));
  };
  var cleanSession=function(){ store['state/session']={active:null}; };

  await t('a day count of a billion cups, or a fraction or less than none, is refused, and one already stored still draws', async function(){
    await go(); var day=await today(), was=JSON.parse(JSON.stringify(store));
    try{
      var o=function(f,v){ var d=blank(); d[f]=v; var x={schema:1,days:{}}; x.days[day]=d; return x; };
      await refused(o('water',1e9),/water/);
      await refused(o('alcohol',2.5),/alcohol/);
      await refused(o('smoking',-1),/smoking/);
      // Stored before imports were checked: Today still draws, the count says
      // how much, and the row of cups stops at what fits.
      var e0=errs.length, d=blank(); d.water=1e9; store['days/'+day]=d;
      await go(); await everyTab('with a billion cups stored');
      assert.ok(await p.locator('.dots .cup').count()<=40,'it drew '+(await p.locator('.dots .cup').count())+' cups');
      assert.ok(/250000000/.test(await waterCount()),'the count does not say how much: '+(await waterCount()));
      assert.deepStrictEqual(errs.slice(e0),[],'a render threw: '+errs.slice(e0).join(' | '));
    } finally { await putBack(was); }
  });

  // A tap past the most an import takes would make an export that does not
  // go back in.
  await t('the water and drink counts stop where an import does, so an export always goes back in', async function(){
    await go(); var day=await today(), was=JSON.parse(JSON.stringify(store));
    try{
      var d=blank(); d.water=100; d.alcohol=200; store['days/'+day]=d;
      await go();
      await p.click('[data-action="water"][data-d="1"]'); await p.click('[data-action="alcohol"][data-d="1"]');
      await p.waitForTimeout(1600); await settle();
      assert.strictEqual(store['days/'+day].water,100,'water went past 100 taps');
      assert.strictEqual(store['days/'+day].alcohol,200,'drinks went past 200');
      var a=await exported();
      await importing(JSON.stringify(a));
      assert.ok(await p.locator('[data-action="doimport"]').count(),'its own export was refused: '+(await text()).slice(-300));
    } finally { await putBack(was); }
  });

  await t('a day missing fields is imported whole, draws on every tab and survives a reload', async function(){
    await go(); var day=await today(), was=JSON.parse(JSON.stringify(store)), e0=errs.length;
    try{
      var o={schema:1,days:{}}; o.days[day]={water:2};
      await importing(JSON.stringify(o));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      await everyTab('after importing a day of {water:2}');
      assert.strictEqual(await waterCount(),'0.5L','the imported water is not shown');
      var sd=store['days/'+day];
      assert.ok(sd && sd.workout && sd.workout.done===false && sd.alcohol===0,'the day was stored with fields missing: '+JSON.stringify(sd));
      await go(); await everyTab('after a reload');
      assert.strictEqual(await waterCount(),'0.5L','the imported water did not survive a reload');
      // Stored with the fields missing, by an import before this was checked.
      store['days/'+day]={water:3};
      await go(); await everyTab('with {water:3} stored');
      assert.strictEqual(await waterCount(),'0.75L');
      await p.click('[data-action="workout"][data-type="Strength"]'); await p.waitForTimeout(1600); await settle();
      assert.ok(store['days/'+day].workout && store['days/'+day].workout.done,'a workout could not be logged on it');
      assert.deepStrictEqual(errs.slice(e0),[],'a render threw: '+errs.slice(e0).join(' | '));
    } finally { await putBack(was); }
  });

  // 2026/10/01 wrote days/2026/10/01, a document inside another collection
  // that no read finds; __proto__ and constructor found a value Object
  // already has, and Finish threw on every tap.
  await t('a session whose start is not a date is refused, and one already stored finishes on today', async function(){
    await go(); var day=await today(), was=JSON.parse(JSON.stringify(store));
    try{
      var sess=function(at){ return {schema:1,activeSession:{id:'sbad',workoutId:'w6',startedAt:at,t0:Date.now()-60000,prep:1,
        exIds:[BENCH],targets:{},logs:{press_bench:[{v:8,w:60,t:Date.now()-30000}]}}}; };
      await refused(sess('2026/10/01'),/activeSession/);
      await refused(sess('__proto__'),/activeSession/);
      await refused(sess('constructor'),/activeSession/);
      var e0=errs.length;
      store['state/session']={active:sess('constructor').activeSession};
      await go(); await resumeIn(p); await finishIn(p); await p.waitForTimeout(1600); await settle();
      assert.deepStrictEqual(errs.slice(e0),[],'Finish threw: '+errs.slice(e0).join(' | '));
      var logs=Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0 && store[k].sessionId==='sbad'; });
      assert.strictEqual(logs.length,1,'the session was not logged');
      assert.strictEqual(store[logs[0]].date,day,'it was dated '+store[logs[0]].date);
      assert.ok(store['days/'+day].workout.done,'today is not marked trained');
      assert.ok(!Object.keys(store).some(function(k){ return k.split('/').length!==2; }),'a document went somewhere no read finds');
      await everyTab('after finishing it');
    } finally { cleanSession(); await putBack(was); }
  });

  await t('a superset of the wrong shape is refused, and a real one imports, resumes, undoes a round and survives a reload', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store)), now=Date.now();
    try{
      var day=await today(), sess=function(box){ return {schema:1,activeSession:{id:'sss',workoutId:'w6',startedAt:day,t0:now-60000,prep:1,
        exIds:['ss1'],targets:{ss1:{sets:3,reps:'rounds'}},logs:{press_bench:[{v:8,w:60,t:now-30000}],sq_goblet:[{v:10,w:20,t:now-29000}]},supersets:{ss1:box}}}; };
      await refused(sess({ex:'press_bench',rounds:1}),/activeSession/);
      await refused(sess({ex:[BENCH],rounds:3e8}),/activeSession/);
      await refused({schema:1,workoutLogs:[{id:'wlss',workoutId:'w6',title:'Push',tag:'Strength',date:day,
        logs:{press_bench:[{v:8,w:60,t:1}]},supersets:[{rounds:2}]}]},/supersets/);
      var e0=errs.length;
      await importing(JSON.stringify(sess({ex:[BENCH,'sq_goblet'],rounds:1,roundLog:[[BENCH,'sq_goblet']]})));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      await everyTab('after importing a superset');
      await go(); await resumeIn(p);
      assert.ok(await p.locator('[data-action="undoround"]').count(),'the superset slide does not offer its round back: '+(await text()).slice(0,300));
      await p.click('[data-action="undoround"]'); await p.waitForTimeout(1600); await settle();
      var b=store['state/session'].active.supersets.ss1;
      assert.strictEqual(b.rounds,0,'the round was not taken back: '+JSON.stringify(b));
      assert.ok(!(store['state/session'].active.logs||{}).press_bench,'the round\'s sets stayed');
      await go(); await everyTab('after a reload');
      assert.deepStrictEqual(errs.slice(e0),[],'a render threw: '+errs.slice(e0).join(' | '));
    } finally { cleanSession(); await putBack(was); }
  });

  await t('an exercise this version does not have leaves an imported session, which resumes, skips and reloads', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store)), e0=errs.length;
    try{
      var day=await today();
      await importing(JSON.stringify({schema:1,activeSession:{id:'sv2',workoutId:'w6',startedAt:day,t0:Date.now()-60000,
        exIds:['press_bench_v2'],targets:{press_bench_v2:{sets:3,reps:'8'}},logs:{}}}));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      await resumeIn(p);
      for(var k=0;k<6 && !(await p.locator('[data-action="prevslide"][disabled]').count());k++){ await p.click('[data-action="prevslide"]'); await p.waitForTimeout(80); }
      await p.click('[data-action="skipex"]'); await p.waitForTimeout(200);
      assert.ok(await p.locator('#slide-card').count(),'the next slide did not draw: '+(await text()).slice(0,300));
      await p.waitForTimeout(1300); await settle();
      assert.ok(store['state/session'].active.exIds.indexOf('press_bench_v2')<0,'the unknown exercise was kept');
      await go();
      assert.ok(!/loading your data/.test(await text()),'the reload stuck on loading');
      await everyTab('after a reload');
      assert.deepStrictEqual(errs.slice(e0),[],'a render threw: '+errs.slice(e0).join(' | '));
    } finally { cleanSession(); await putBack(was); }
  });

  // Saved by another version, or by an import before this was checked.
  await t('a stored session holding an exercise this version does not have shows it as gone, with Remove', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store)), e0=errs.length;
    try{
      var day=await today();
      store['state/session']={active:{id:'sv3',workoutId:'w6',startedAt:day,t0:Date.now()-60000,prep:1,
        exIds:['press_bench_v2',BENCH],targets:{press_bench_v2:{sets:3,reps:'8'}},logs:{press_bench_v2:[{v:8,w:60,t:Date.now()-30000}]}}};
      await go(); await resumeIn(p);
      for(var k=0;k<6 && !(await p.locator('[data-action="prevslide"][disabled]').count());k++){ await p.click('[data-action="prevslide"]'); await p.waitForTimeout(80); }
      var body=await text();
      assert.ok(/no longer available/i.test(body),'the slide does not say the exercise has gone: '+body.slice(0,300));
      await p.click('[data-action="removeex"][data-id="press_bench_v2"]'); await p.waitForTimeout(1600); await settle();
      assert.deepStrictEqual(store['state/session'].active.exIds,[BENCH],'it was not taken out');
      assert.ok(await p.locator('#log-v-'+BENCH).count(),'the next exercise did not draw');
      await go(); await everyTab('after a reload');
      assert.deepStrictEqual(errs.slice(e0),[],'a render threw: '+errs.slice(e0).join(' | '));
    } finally { cleanSession(); await putBack(was); }
  });

  await t('recipe macros that are not four numbers are refused, and stored ones never read undefined', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await refused({schema:1,recipes:[{id:'rm1',title:'Short',ingredients:['Eggs (2)'],macros:[500]}]},/macros/);
      var e0=errs.length;
      store['recipes/rm2']={id:'rm2',title:'Short macros',tag:'Recipe',ingredients:['Eggs (2)'],macros:[500,30]};
      await go(); await everyTab('with short macros stored');
      await p.click('[data-action="tab"][data-tab="meals"]');
      assert.ok(/Short macros/.test(await text()),'the recipe is not listed');
      assert.ok(!/undefined/.test(await text()),'Meals reads undefined');
      assert.deepStrictEqual(errs.slice(e0),[],'a render threw: '+errs.slice(e0).join(' | '));
    } finally { await putBack(was); }
  });

  // The change is in state before the render, so a render that throws must
  // not take its save with it.
  await t('a tap is saved even when the render after it throws', async function(){
    await go(); var day=await today(), was=JSON.parse(JSON.stringify(store));
    try{
      store['days/'+day]=blank(); await go(); var e0=errs.length;
      await p.evaluate(function(){
        var g=document.getElementById;
        document.getElementById=function(id){ if(id==='app' && window.__boom){ window.__boom=0; throw new Error('render boom'); } return g.apply(document,arguments); };
        window.__boom=1;
      });
      await p.click('[data-action="water"][data-d="1"]'); await p.waitForTimeout(1600); await settle();
      assert.strictEqual(store['days/'+day].water,1,'the tap was not saved');
      assert.ok(errs.slice(e0).some(function(e){ return /render boom/.test(e); }),'the render did not throw');
      errs.splice(e0);
    } finally { await putBack(was); }
  });

  console.log('\nAN IMPORT IS SAFE TO START, AND TO CUT OFF');
  var ls=function(k){ return p.evaluate(function(k){ return localStorage.getItem(k); },k); };
  var tapAt=async function(sel){ var b=await p.locator(sel).first().boundingBox(); await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2); return b; };
  var dellog=function(id){ return p.evaluate(function(id){ var e=document.querySelector('[data-action="dellog"][data-id="'+id+'"]');
    if(!e) return false; e.click(); return true; },id); };
  // Forty days and forty sauna visits: ten batches of writes, so a write held
  // in the first one leaves the rest, and the deletes, still to go.
  var yearish=function(){
    var o={schema:1,days:{},saunaSessions:[]};
    for(var i=0;i<40;i++){ var k=new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10), d=blank(); d.water=1; d.wx=1; o.days[k]=d;
      o.saunaSessions.push({id:'sy'+i,date:k,mins:10,temp:80,position:'Top',stints:[{mins:10,position:'Top'}]}); }
    return o;
  };
  var imported=function(o){ return Object.keys(o.days).map(function(k){ return 'days/'+k; })
    .concat(o.saunaSessions.map(function(x){ return 'sauna/'+x.id; })).sort(); };
  var held=function(){ return Object.keys(store).filter(function(k){ return k.indexOf('state/')!==0; }).sort(); };
  var cutOff=async function(o){
    await importing(JSON.stringify(o));
    setDelays.push({op:'set',match:'days/',ms:2500});
    await p.click('[data-action="doimport"][data-mode="replace"]'); await p.waitForTimeout(700);
  };
  await t('an import cut off partway is finished when the app is opened again, and says it is not done until it is', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      assert.ok(Object.keys(store).some(function(k){ return k.indexOf('workoutLogs/')===0; }),'no sessions to replace');
      var o=yearish(); await cutOff(o);
      var body=await text();
      assert.ok(/Importing \d+\/\d+, keep this open/.test(body),'it does not say the import is still going: '+body.slice(0,300));
      assert.ok(!/Imported\./.test(body),'it says Imported while writes are still out');
      var back=await ls('fc.backup');
      assert.ok(back && JSON.parse(back).workoutLogs.length,'no copy of the data from before was kept');
      assert.ok(store['state/meta'].importing,'the store is not marked as part way through an import');
      await go(); await p.waitForTimeout(2500); await settle();
      var day=await today();
      assert.deepStrictEqual(held().filter(function(k){ return k!=='days/'+day; }),imported(o),'the store is a mix of old and imported data');
      assert.ok(!store['state/meta'].importing,'the store is still marked as importing');
      assert.strictEqual(await ls('fc.importing'),null,'the unfinished import is still kept');
      assert.strictEqual(await ls('fc.backup'),back,'finishing the import wrote over the copy of the data from before');
    } finally { await putBack(was); }
  });

  await t('an import that did not finish elsewhere is said so, and a second import keeps the copy from before the first', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await cutOff(yearish());
      var back=await ls('fc.backup');
      // Cut off on another device, or here with nowhere to keep the import.
      await p.evaluate(function(){ localStorage.removeItem('fc.importing'); });
      await go(); await p.waitForTimeout(2500); await settle();
      var body=await text();
      assert.ok(/An import did not finish/.test(body),'nothing says the data may be half imported: '+body.slice(0,300));
      await importing(JSON.stringify({schema:1,days:{'2025-06-01':blank()}}));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      assert.strictEqual(await ls('fc.backup'),back,'the second import wrote the half-imported mix over the copy from before');
      assert.ok(!store['state/meta'].importing,'the store is still marked as importing');
      assert.ok(!/An import did not finish/.test(await text()),'it still says the import did not finish');
    } finally { await putBack(was); }
  });

  await t('an undo offered before an import is gone after it, and puts nothing into the new record', async function(){
    await go(); var day=await today(), was=JSON.parse(JSON.stringify(store));
    try{
      store['workoutLogs/wlU1']={id:'wlU1',workoutId:'w6',title:'Push',tag:'Strength',date:day,logs:{press_bench:[{v:5,w:100,t:1}]}};
      await go(); await p.click('[data-action="tab"][data-tab="progress"]');
      assert.ok(await dellog('wlU1'),'no session to remove'); await p.waitForTimeout(1600); await settle();
      assert.ok(await p.locator('.undo-bar').count(),'no undo was offered');
      await importing(JSON.stringify({schema:1}));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      assert.strictEqual(await p.locator('.undo-bar').count(),0,'the undo from before the import is still offered');
      if(await p.locator('[data-action="undo"]').count()){ await p.click('[data-action="undo"]'); await p.waitForTimeout(1600); await settle(); }
      assert.ok(!store['workoutLogs/wlU1'],'undo put a session from before the import into the new record');
    } finally { await putBack(was); }
  });

  await t('Replace imports what is in the box now, not what was last checked', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await importing(JSON.stringify({schema:1,days:{'2025-02-01':blank()}}));
      await p.fill('#import-json',JSON.stringify({schema:1,days:{'2025-03-01':blank(),'2025-03-02':blank()}}));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      assert.ok(!store['days/2025-02-01'],'it imported the text checked before, not the text in the box');
      if(!store['days/2025-03-01']){
        assert.ok(/2 days/.test(await text()),'the text in the box was not checked again');
        await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      }
      assert.ok(store['days/2025-03-01'] && store['days/2025-03-02'],'the text in the box was not imported');
    } finally { await putBack(was); }
  });

  await t('two quick taps on Put back leave the data from before the import put back, after saying what it puts back', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      var a=await exported(), n=a.workoutLogs.length, b=JSON.parse(JSON.stringify(a)); b.workoutLogs=[]; b.totalXp=1;
      assert.ok(n,'no sessions to take out');
      var logs=function(){ return Object.keys(store).filter(function(k){ return k.indexOf('workoutLogs/')===0; }).length; };
      await importing(JSON.stringify(b));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      assert.strictEqual(logs(),0,'the import left sessions behind');
      var at=await tapAt('[data-action="restorebackup"]'); await p.waitForTimeout(120);
      await p.touchscreen.tap(at.x+at.width/2,at.y+at.height/2); await settle();
      assert.strictEqual(logs(),0,'two taps on Put back put back something without asking');
      if(!(await p.locator('[data-action="restoreconfirm"]').count())) await tapAt('[data-action="restorebackup"]');
      var body=await text(), when=new Date(JSON.parse(await ls('fc.backup')).exportedAt);
      assert.ok(/Put back the data as it was on/.test(body) && body.indexOf(when.getDate()+'')>-1,'it does not say when the data it puts back is from: '+body.slice(-400));
      assert.ok(/replaced/.test(body),'it does not say what is replaced');
      at=await tapAt('[data-action="restoreconfirm"]'); await p.waitForTimeout(120);
      await p.touchscreen.tap(at.x+at.width/2,at.y+at.height/2); await settle();
      assert.strictEqual(logs(),n,'two taps put the data back and took it away again');
      assert.strictEqual(store['state/profile'].totalXp,a.totalXp,'the XP from before was not put back');
    } finally { await putBack(was); }
  });

  await t('with nowhere on this device to keep a copy, the import says so and offers an export first', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await p.evaluate(function(){ Storage.prototype.setItem=function(){ throw new Error('blocked'); }; });
      await importing(JSON.stringify({schema:1,days:{'2025-04-01':blank()}}));
      var body=await text();
      assert.ok(/Could not keep a copy on this device\. Download an export first/.test(body),'nothing warns that no copy can be kept: '+body.slice(-400));
      assert.ok(await p.locator('#app .datacard [data-action="downloadexport"]').count(),'no export is offered before importing');
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      body=await text();
      assert.ok(!/kept on this device until the next import/.test(body),'it says the data from before is kept when it is not');
      assert.ok(/Could not keep a copy/.test(body),'it does not say the copy could not be kept: '+body.slice(-300));
    } finally { await putBack(was); }
  });

  await t('a merge pays the XP of what it brings in, so taking it out again takes back no more than it gave', async function(){
    await go(); var day=await today(), was=JSON.parse(JSON.stringify(store));
    try{
      Object.keys(store).forEach(function(k){ if(k.indexOf('workoutLogs/')===0 && store[k].date===day) delete store[k]; });
      var mine=blank(); mine.water=4; mine.wx=4; store['days/'+day]=mine;
      store['state/profile']=Object.assign({},store['state/profile'],{totalXp:500});
      await go();
      var inc=blank(); inc.water=8; inc.wx=8; inc.workout={done:true,type:'Strength'};
      var o={schema:1,days:{},workoutLogs:[{id:'wlM1',workoutId:'w6',title:'Push',tag:'Strength',date:day,logs:{press_bench:[{v:8,w:60,t:5}]}}],
        saunaSessions:[{id:'saM1',date:day,mins:10,temp:80,position:'Top',stints:[{mins:10,position:'Top'}]}]};
      o.days[day]=inc;
      await importing(JSON.stringify(o));
      await p.click('[data-action="doimport"][data-mode="merge"]'); await settle();
      // 8 cups, a trained day and a sauna visit in; the 4 cups they replace out.
      assert.strictEqual(store['state/profile'].totalXp,500+16+15+5-8,'the merge did not pay for what it brought in');
      await p.click('[data-action="tab"][data-tab="progress"]');
      assert.ok(await dellog('wlM1'),'the merged session is not listed'); await p.waitForTimeout(300);
      await p.evaluate(function(){ var e=document.querySelector('[data-action="delsauna"][data-id="saM1"]'); if(e) e.click(); });
      await p.waitForTimeout(300); await toToday();
      for(var i=0;i<8;i++){ await p.click('[data-action="water"][data-d="-1"]'); await p.waitForTimeout(80); }
      await p.waitForTimeout(1600); await settle();
      assert.ok(!store['sauna/saM1'],'the merged visit was not removed');
      assert.strictEqual(store['state/profile'].totalXp,500-8,'taking out what the merge brought in took more XP than it paid');
    } finally { await putBack(was); }
  });

  console.log('\nAN IMPORT THAT CANNOT FINISH HAS A WAY OUT');
  // The app closed: a page on the same origin, so its localStorage is there.
  var away=async function(){
    await p.route('**/away',function(r){ r.fulfill({contentType:'text/html',body:'<p>away</p>'}); });
    await p.goto(url+'away'); await p.unroute('**/away'); await p.waitForTimeout(2500);
  };
  await t('an import refused for good offers Put back and Leave it, and Leave it stops it coming back on every open', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await importing(JSON.stringify(yearish()));
      failNext.push({op:'set',match:'days/',code:'quota_exceeded'});
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      var body=await text();
      assert.ok(/An import did not finish/.test(body),'nothing says the import did not finish: '+body.slice(0,300));
      assert.ok(await p.locator('[data-action="importleave"]').count(),'Leave it is not offered');
      assert.ok(await p.locator('#app .datacard [data-action="restorebackup"]').count(),'Put back is gone after the import was refused');
      await p.click('[data-action="importleave"]'); await settle();
      assert.strictEqual(await ls('fc.importing'),null,'the refused import is still kept to be replayed');
      assert.ok(!store['state/meta'].importing,'the store is still marked as importing');
      var mid=JSON.stringify(held());
      await go(); await p.waitForTimeout(800); await settle();
      assert.strictEqual(JSON.stringify(held()),mid,'opening the app again replayed the import that was left');
      assert.ok(!/An import did not finish/.test(await text()),'it still says the import did not finish');
    } finally { await putBack(was); }
  });

  await t('an import finished on opening the app that is refused for good offers Put back and Leave it', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await cutOff(yearish());
      failNext.length=0; failNext.push({op:'set',match:'days/',code:'quota_exceeded'});
      await p.goto(url); await p.waitForTimeout(2500); await settle();
      var body=await text();
      assert.ok(/An import did not finish/.test(body) && await p.locator('[data-action="importleave"]').count(),'no way out once the import is refused: '+body.slice(0,300));
      await p.click('[data-action="tab"][data-tab="progress"]');
      if(!(await p.locator('#app .datacard [data-action="restorebackup"]').count())) await p.click('[data-action="datapane"][data-p="import"]');
      assert.ok(await p.locator('#app .datacard [data-action="restorebackup"]').count(),'Put back is gone after the import was refused');
    } finally { await putBack(was); }
  });

  await t('a copy of a cut-off import is not replayed once the store is no longer marked by it', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await cutOff(yearish());
      assert.ok(await ls('fc.importing'),'no copy of the import was kept');
      await away();
      // Another device left it as it is, then logged a day.
      var m=Object.assign({},store['state/meta']); delete m.importing; store['state/meta']=m;
      store['days/2025-09-09']=blank();
      await go(); await p.waitForTimeout(800); await settle();
      assert.ok(store['days/2025-09-09'],'an old copy of an import wiped a day logged since on another device');
      assert.strictEqual(await ls('fc.importing'),null,'the old copy is still kept');
      assert.ok(!/An import did not finish/.test(await text()),'it says an import did not finish');
    } finally { await putBack(was); }
  });

  await t('a copy of a cut-off import from a while ago is finished only when asked', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      var o=yearish(); await cutOff(o);
      var pend=JSON.parse(await ls('fc.importing')), mark=store['state/meta'].importing;
      await away();
      assert.ok(pend && mark,'the import was not kept and marked');
      // Two hours ago, and marked the same way.
      var old=pend.at-2*3600*1000; pend.at=old;
      await p.evaluate(function(v){ localStorage.setItem('fc.importing',v); },JSON.stringify(pend));
      store['state/meta']=Object.assign({},store['state/meta'],{importing:mark===true?true:old});
      store['days/2025-09-09']=blank();
      await go(); await p.waitForTimeout(800); await settle();
      assert.ok(store['days/2025-09-09'],'an import from two hours ago was replayed without asking');
      var body=await text();
      assert.ok(/An import did not finish/.test(body),'nothing says the import did not finish: '+body.slice(0,300));
      assert.ok(await p.locator('[data-action="importfinish"]').count(),'finishing it is not offered');
      await p.click('[data-action="importfinish"]'); await p.waitForTimeout(800); await settle();
      var day=await today();
      assert.deepStrictEqual(held().filter(function(k){ return k!=='days/'+day; }),imported(o),'finishing it did not finish the import');
      assert.ok(!store['state/meta'].importing,'the store is still marked as importing');
      assert.strictEqual(await ls('fc.importing'),null,'the copy is still kept');
    } finally { await putBack(was); }
  });

  await t('a copy of an import left behind on a store that starts afresh is dropped, and the next import keeps a backup', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await p.evaluate(function(){ localStorage.setItem('fc.importing',JSON.stringify({mode:'replace',at:Date.now(),docs:{}})); });
      Object.keys(store).forEach(function(k){ delete store[k]; });
      await go(); await water(1);
      assert.strictEqual(await ls('fc.importing'),null,'the copy left behind is still kept');
      var a=await exported();
      await importing(JSON.stringify({schema:1,days:{'2025-06-01':blank()}}));
      await p.click('[data-action="doimport"][data-mode="replace"]'); await settle();
      assert.ok(!/still the data from before the import that did not finish/.test(await text()),'it speaks of an import that did not finish');
      var back=JSON.parse(await ls('fc.backup')||'{}');
      assert.deepStrictEqual([Object.keys(back.days||{}).sort(),(back.workoutLogs||[]).length],[Object.keys(a.days).sort(),a.workoutLogs.length],
        'no backup of the data the import replaced was kept');
    } finally { await putBack(was); }
  });

  await t('a backup from an older import is offered by its date, not as the data from before the one that did not finish', async function(){
    await go(); var was=JSON.parse(JSON.stringify(store));
    try{
      await p.evaluate(function(){ localStorage.removeItem('fc.importing');
        localStorage.setItem('fc.backup',JSON.stringify({schema:1,exportedAt:'2025-03-04T10:20:00.000Z'})); });
      store['state/meta']=Object.assign({},store['state/meta'],{importing:true});
      await go();
      var body=await text();
      assert.ok(/An import did not finish/.test(body),'nothing says the import did not finish');
      assert.ok(!/Put back the data from before/.test(body),'an older backup is offered as the data from before this import');
      assert.ok(/Put back your copy from [^.]*[345] Mar/.test(body),'the backup offered is not named by its date: '+body.slice(0,300));
    } finally { await p.evaluate(function(){ localStorage.removeItem('fc.backup'); }); await putBack(was); }
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
