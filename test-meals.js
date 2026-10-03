var http=require('http'),fs=require('fs'),assert=require('assert');
var env=require('./test-env.js');
var doc=env.localOnly(env.readDoc());
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
// Each load of the page is counted, so a check waits for the publish and the
// reload a save brings, not for a guess at how long they take.
var loads=0;
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  loads++;
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});
srv.listen(0,async function(){
  var b=await env.launch();
  var p=await b.newPage({viewport:{width:420,height:900}});
  p.setDefaultTimeout(9000);
  // FC_THROTTLE=4 runs the page on a quarter of the CPU, where fixed sleeps
  // between a tap and the reload it brings ran out.
  if(process.env.FC_THROTTLE){ var cdp=await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:+process.env.FC_THROTTLE}); }
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  var published=()=>doc;   // whatever the app last saved
  // Until the page has reloaded onto the publish a tap made, and is ready for
  // the next one: a tap while a publish is out is refused.
  var settle=async n0=>{ for(var i=0;loads<=n0;i++){ if(i>600) throw new Error('no publish and reload came');
    await new Promise(r=>setTimeout(r,50)); } await p.waitForSelector('#app .wrap:not(.held)'); };
  var saving=async fn=>{ var n0=loads; await fn(); await settle(n0); };
  var fails=0, ok=m=>console.log('  PASS  '+m), bad=(m,e)=>{fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  await p.goto('http://127.0.0.1:'+srv.address().port+'/'); await p.waitForSelector('#app .wrap:not(.held)');
  var back=await p.$('[data-action="cancelsession"]'); if(back) await back.click();
  await p.click('[data-action="tab"][data-tab="meals"]');

  // Recipe cards start closed; portions and ingredients show once opened, and
  // stay open across the save-and-reload because the view remembers it.
  var openCard=async id=>{ var tg=await p.$('[data-action="toggleex"][data-id="rec:'+id+'"][aria-expanded="false"]');
    if(tg){ await tg.click(); await p.waitForSelector('[data-action="toggleex"][data-id="rec:'+id+'"][aria-expanded="true"]'); } };
  var card=async id=>{ await openCard(id); return p.evaluate(function(i){
    var b=document.querySelector('[data-action="portions"][data-id="'+i+'"]');
    if(!b) return null; var c=b.closest('.libitem');
    return {portions:c.querySelector('.portions .n').textContent,
            ings:Array.prototype.slice.call(c.querySelectorAll('li')).map(function(x){return x.textContent;}),
            macros:(c.querySelector('.macros')||{textContent:''}).textContent.replace(/\s+/g,' ').trim()};
  }, id); };
  var bump=async(id,d,n)=>{ for(var i=0;i<(n||1);i++){ await openCard(id);
    await saving(()=>p.click('[data-action="portions"][data-id="'+id+'"][data-d="'+d+'"]')); } };

  try{
    var c=await card('p2'); assert.ok(c,'meal prep recipe p2 missing');
    assert.ok(/540 kcal/.test(c.macros) && /38g protein/.test(c.macros), 'macros: '+c.macros);
    ok('meal-prep recipes exist with per-portion macros ('+c.macros.slice(0,42)+'...)');
  }catch(e){ bad('meal prep + macros',e); }

  try{
    var before=await card('p2');
    assert.strictEqual(before.portions,'5');
    assert.ok(before.ings.some(x=>/Beef mince, 5% fat \(750g\)/.test(x)), before.ings[0]);
    await bump('p2',1,5);   // 5 -> 10
    var after=await card('p2');
    assert.strictEqual(after.portions,'10');
    assert.ok(after.ings.some(x=>/Beef mince, 5% fat \(1.5kg\)/.test(x)),'mince did not double: '+after.ings[0]);
    assert.ok(after.ings.some(x=>/Kidney beans \(4 tins\)/.test(x)),'tins did not double: '+after.ings.join(' | '));
    ok('doubling portions doubles the ingredients (750g -> 1.5kg, 2 tins -> 4)');
  }catch(e){ bad('ingredients scale',e); }

  try{
    var m=await card('p2');
    assert.ok(/540 kcal/.test(m.macros),'macros are per portion and must not scale: '+m.macros);
    ok('macros stay per-portion when the batch size changes');
  }catch(e){ bad('macros per portion',e); }

  try{
    await saving(()=>p.click('[data-action="addmeal"][data-id="p2"]'));
    var shop=await p.evaluate(function(){ return Array.prototype.slice.call(document.querySelectorAll('.shop')).map(function(x){return x.textContent.trim();}); });
    assert.ok(shop.some(x=>/Beef mince, 5% fat \(1.5kg\)/.test(x)),'shopping list not scaled: '+shop.join(' | '));
    ok('the shopping list uses the chosen portion count, not the recipe default');
  }catch(e){ bad('shopping list scales',e); }

  try{
    await saving(()=>p.click('[data-action="addmeal"][data-id="p3"]'));
    var shop2=await p.evaluate(function(){ return Array.prototype.slice.call(document.querySelectorAll('.shop')).map(function(x){return x.textContent.trim();}); });
    var toms=shop2.filter(x=>/Chopped tomatoes/.test(x));
    assert.strictEqual(toms.length,1,'tomatoes should aggregate to one line, got: '+toms.join(' / '));
    assert.ok(/6 tins/.test(toms[0]),'chilli x2 (4 tins) + bolognese (2 tins) = 6, got: '+toms[0]);
    ok('the same ingredient across two recipes adds up ('+toms[0]+')');
  }catch(e){ bad('shopping list aggregates',e); }

  try{
    var n0=loads, key=await p.evaluate(function(){ var el=document.querySelector('.shop'); el.click(); return el.getAttribute('data-item'); });
    await settle(n0); n0=loads;
    var stillTicked=await p.evaluate(function(k){ var e=document.querySelector('.shop[data-item="'+k+'"]'); return e&&/checked/.test(e.className); },key);
    assert.ok(stillTicked,'tick did not stick');
    // Portions live on the planned meal now, so changing THAT is the move that
    // must not disturb the ticks.
    var bumped=await p.evaluate(function(){
      var b=document.querySelector('[data-action="mealportions"][data-d="-1"]');
      if(!b) return false; b.click(); return true; });
    assert.ok(bumped,'no planned meal to change the portions of, so this proves nothing');
    await settle(n0);
    var afterBump=await p.evaluate(function(k){ var e=document.querySelector('.shop[data-item="'+k+'"]'); return e&&/checked/.test(e.className); },key);
    assert.ok(afterBump,'changing portions unticked the shopping list');
    ok('ticked items stay ticked when the portions change');
  }catch(e){ bad('tick survives rescale',e); }

  try{
    var r3=await card('r3'); assert.ok(/520 kcal/.test(r3.macros),'r3 macros: '+r3.macros);
    assert.strictEqual(r3.portions,'4');
    ok('the original recipes got macros and editable portions too');
  }catch(e){ bad('existing recipes',e); }

  console.log('\nNOTHING SPLITS ACROSS TWO SHOPPING ROWS');

  var t=async(name,fn)=>{ try{ await fn(); ok(name); }catch(e){ bad(name,e); } };
  await t('an ingredient never appears on two rows, whatever the recipes', async function(){
    // Two rows for one thing is how something gets bought twice or missed.
    // One at a time, re-querying each round: ticking one re-renders the page,
    // which detaches every other element collected up front. All in one go, so
    // the save they bring cannot start (and hold the page) half way through.
    await saving(()=>p.evaluate(function(){
      for(var i=0;i<60;i++){
        var all=[].slice.call(document.querySelectorAll('[data-action="addmeal"]'));
        if(i>=all.length) return; all[i].click();
      }
    }));
    var labels=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop')).map(function(e){return e.innerText.trim();});
    });
    assert.ok(labels.length>40,'only '+labels.length+' shopping rows with everything planned');
    var seen={}, dup=[];
    labels.forEach(function(l){
      var name=l.replace(/\s*\(.*$/,'').trim().toLowerCase();
      if(seen[name]) dup.push(name); else seen[name]=1;
    });
    assert.deepStrictEqual(dup,[],'these appear on more than one row: '+dup.join(', '));
  });

  await t('tins written singular and plural add up', async function(){
    var toms=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop'))
        .map(function(e){return e.innerText.trim();})
        .filter(function(l){return /^Chopped tomatoes/i.test(l);});
    });
    assert.strictEqual(toms.length,1,'chopped tomatoes are on '+toms.length+' rows: '+toms.join(' | '));
    var n=parseFloat((toms[0].match(/\(([\d.]+)/)||[])[1]);
    assert.ok(n>=10,'they only added up to '+n+' tins, so the singular ones were dropped');
  });

  await t('a measured ingredient absorbs the unmeasured mentions of itself', async function(){
    var garlic=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop'))
        .map(function(e){return e.innerText.trim();})
        .filter(function(l){return /^Garlic/i.test(l);});
    });
    assert.strictEqual(garlic.length,1,'garlic is on '+garlic.length+' rows: '+garlic.join(' | '));
    assert.ok(/clove/i.test(garlic[0]),'garlic lost its count: '+garlic[0]);
  });

  await t('units that genuinely do not add stay on one row, side by side', async function(){
    var spinach=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop'))
        .map(function(e){return e.innerText.trim();})
        .filter(function(l){return /^Spinach \(/i.test(l);});
    });
    assert.strictEqual(spinach.length,1,'spinach is on '+spinach.length+' rows');
    assert.ok(/\+/.test(spinach[0]),
      'grams and handfuls were silently added together instead of listed: '+spinach[0]);
  });

  await t('the ingredient parse is not frozen into saved data', async function(){
    // A cached parse used to be stored with the recipe, so a fix to how
    // ingredients are read could never reach a recipe already saved.
    assert.ok(JSON.stringify(env.seedOf(published())).indexOf('"_ings"')<0,'the parse cache is being written into saved state');
  });

  console.log('\nYOUR OWN SHOPPING ITEMS');

  await t('you can add something no recipe knows about', async function(){
    await p.fill('#shop-add','Bin bags'); await saving(()=>p.click('[data-action="addextra"]'));
    var labels=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop')).map(function(e){return e.innerText.trim();});
    });
    assert.ok(labels.some(function(l){return /Bin bags/.test(l);}),'it is not on the list: '+labels.slice(0,4).join(' | '));
    var box=await p.inputValue('#shop-add');
    assert.strictEqual(box,'','the box did not clear, so the next item appends to this one');
  });

  await t('it sits in the one list, sorted with everything else', async function(){
    var labels=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop')).map(function(e){return e.innerText.trim().toLowerCase();});
    });
    var sorted=labels.slice().sort(function(a,b){return a.localeCompare(b);});
    assert.deepStrictEqual(labels,sorted,'the list is not in one alphabetical order');
  });

  await t('ticking it works like any other row', async function(){
    await saving(()=>p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.shop'));
      for(var i=0;i<rows.length;i++){ if(/Bin bags/.test(rows[i].innerText)){ rows[i].click(); return; } }
    }));
    var checked=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.shop'));
      for(var i=0;i<rows.length;i++){ if(/Bin bags/.test(rows[i].innerText)) return rows[i].className; }
      return '';
    });
    assert.ok(/checked/.test(checked),'ticking it did nothing');
  });

  await t('clearing the week keeps your own items but drops the recipe ones', async function(){
    var before=await p.evaluate(function(){ return document.querySelectorAll('.shop').length; });
    var btn=await p.$('[data-action="clearweek"]');
    assert.ok(btn,'no clear button'); await saving(()=>btn.click());
    var after=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop')).map(function(e){return e.innerText.trim();});
    });
    assert.ok(after.length<before,'clearing removed nothing');
    assert.ok(after.some(function(l){return /Bin bags/.test(l);}),
      'clearing the week threw away an item you added by hand');
    assert.ok(after.every(function(l){return !/checked/.test(l);}),'ticks survived the clear');
  });

  await t('and you can remove one you no longer want', async function(){
    await saving(()=>p.evaluate(function(){
      var b=document.querySelector('[data-action="delextra"]'); if(b) b.click();
    }));
    var after=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop')).map(function(e){return e.innerText.trim();});
    });
    assert.ok(!after.some(function(l){return /Bin bags/.test(l);}),'it is still there: '+after.join(' | '));
  });

  await t('pressing Enter adds it, without reaching for the button', async function(){
    // A character at a time on purpose: fill() sets the value in one shot and
    // sails straight past anything that goes wrong between keystrokes.
    await p.click('#shop-add');
    await p.type('#shop-add','Washing up liquid',{delay:30});
    await saving(()=>p.press('#shop-add','Enter'));
    var labels=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop')).map(function(e){return e.innerText.trim();});
    });
    assert.ok(labels.some(function(l){return /Washing up liquid/.test(l);}),
      'Enter did nothing: '+labels.join(' | '));
    assert.strictEqual(await p.inputValue('#shop-add'),'','the box did not clear after Enter');
  });

  await t('and it is still there after a reload', async function(){
    await p.reload({waitUntil:'networkidle'}); await p.waitForSelector('#app .wrap:not(.held)');
    await p.click('[data-action="tab"][data-tab="meals"]').catch(function(){});
    var labels=await p.evaluate(function(){
      return [].slice.call(document.querySelectorAll('.shop')).map(function(e){return e.innerText.trim();});
    });
    assert.ok(labels.some(function(l){return /Washing up liquid/.test(l);}),
      'it did not survive a reload: '+labels.join(' | '));
  });

  await t('a deleted meal-prep recipe stays deleted after the save reloads the page', async function(){
    // The built-in batch recipes are topped up at load for anything missing,
    // which is also what a deleted one looks like.
    await p.click('[data-action="tab"][data-tab="meals"]').catch(function(){});
    assert.ok(await p.$('[data-action="delrecipe"][data-id="p3"]'),'p3 is not there to delete');
    await saving(()=>p.click('[data-action="delrecipe"][data-id="p3"]'));
    await p.click('[data-action="tab"][data-tab="meals"]').catch(function(){});
    assert.ok(!(await p.$('[data-action="delrecipe"][data-id="p3"]')),'p3 came back');
    var seed=env.seedOf(published());
    assert.ok(!seed.recipes.some(function(r){ return r.id==='p3'; }),'p3 is in the saved recipes');
  });

  console.log('\nANY WORD CAN BE AN INGREDIENT');
  // The shopping list groups rows by name in a lookup, and a name a plain
  // object already has (constructor, __proto__) found a row that was not
  // there. It threw on every render after, and the recipe is saved.
  await t('ingredients called Constructor or __proto__ go on the list like any other', async function(){
    var e0=errs.length;
    await p.click('[data-action="tab"][data-tab="meals"]').catch(function(){});
    await p.fill('#rec-title','Built-in names');
    await p.fill('#rec-ing','Constructor (1)\n__proto__ (2)\nToString (3)\nhasOwnProperty');
    await saving(()=>p.click('[data-action="addrecipe"]'));
    await p.click('[data-action="tab"][data-tab="meals"]').catch(function(){});
    var rid=await p.evaluate(function(){ var b=[].filter.call(document.querySelectorAll('[data-action="delrecipe"]'),function(x){
      return /Built-in names/.test(x.getAttribute('aria-label')); })[0]; return b&&b.getAttribute('data-id'); });
    assert.ok(rid,'the recipe was not added');
    await saving(()=>p.click('[data-action="addmeal"][data-id="'+rid+'"]'));
    await p.click('[data-action="tab"][data-tab="meals"]').catch(function(){});
    var shop=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('.shop'),function(x){ return x.textContent.trim(); }); });
    ['Constructor (1)','__proto__ (2)','ToString (3)','hasOwnProperty'].forEach(function(n){
      assert.ok(shop.some(function(x){ return x.indexOf(n)>-1; }),n+' is not on the shopping list: '+shop.join(' | '));
    });
    assert.deepStrictEqual(errs.slice(e0),[],'a render stopped');
    await saving(()=>p.click('[data-action="delrecipe"][data-id="'+rid+'"]'));
  });

  console.log(errs.length?('  FAIL  page errors: '+errs.join(' | ')):'  PASS  no page errors');
  await b.close(); srv.close();
  console.log(fails||errs.length?'\nFAILING\n':'\nAll meal checks pass.\n');
  process.exit(fails||errs.length?1:0);
});
