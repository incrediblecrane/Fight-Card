var http=require('http'),fs=require('fs'),assert=require('assert');
var {chromium}=require('/home/user/Fight-Card/node_modules/playwright');
var doc=fs.readFileSync('/tmp/publish.html','utf8');
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});
srv.listen(0,async function(){
  var b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  var p=await b.newPage({viewport:{width:420,height:900}});
  p.setDefaultTimeout(9000);
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  var published=()=>doc;   // whatever the app last saved
  var fails=0, ok=m=>console.log('  PASS  '+m), bad=(m,e)=>{fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  await p.goto('http://127.0.0.1:'+srv.address().port+'/'); await p.waitForTimeout(500);
  var back=await p.$('[data-action="cancelsession"]'); if(back){await back.click(); await p.waitForTimeout(400);}
  await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(500);

  var card=id=>p.evaluate(function(i){
    var b=document.querySelector('[data-action="portions"][data-id="'+i+'"]');
    if(!b) return null; var c=b.closest('.libitem');
    return {portions:c.querySelector('.portions .n').textContent,
            ings:Array.prototype.slice.call(c.querySelectorAll('li')).map(function(x){return x.textContent;}),
            macros:(c.querySelector('.macros')||{textContent:''}).textContent.replace(/\s+/g,' ').trim()};
  }, id);
  var bump=async(id,d,n)=>{ for(var i=0;i<(n||1);i++){
    await p.click('[data-action="portions"][data-id="'+id+'"][data-d="'+d+'"]'); await p.waitForTimeout(250);} };

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
    await p.click('input[data-action="inplan"][data-id="p2"]'); await p.waitForTimeout(2600);
    var shop=await p.evaluate(function(){ return Array.prototype.slice.call(document.querySelectorAll('.shop')).map(function(x){return x.textContent.trim();}); });
    assert.ok(shop.some(x=>/Beef mince, 5% fat \(1.5kg\)/.test(x)),'shopping list not scaled: '+shop.join(' | '));
    ok('the shopping list uses the chosen portion count, not the recipe default');
  }catch(e){ bad('shopping list scales',e); }

  try{
    await p.click('input[data-action="inplan"][data-id="p3"]'); await p.waitForTimeout(2600);
    var shop2=await p.evaluate(function(){ return Array.prototype.slice.call(document.querySelectorAll('.shop')).map(function(x){return x.textContent.trim();}); });
    var toms=shop2.filter(x=>/Chopped tomatoes/.test(x));
    assert.strictEqual(toms.length,1,'tomatoes should aggregate to one line, got: '+toms.join(' / '));
    assert.ok(/6 tins/.test(toms[0]),'chilli x2 (4 tins) + bolognese (2 tins) = 6, got: '+toms[0]);
    ok('the same ingredient across two recipes adds up ('+toms[0]+')');
  }catch(e){ bad('shopping list aggregates',e); }

  try{
    var key=await p.evaluate(function(){ var el=document.querySelector('.shop'); el.click(); return el.getAttribute('data-item'); });
    await p.waitForTimeout(2600);
    var stillTicked=await p.evaluate(function(k){ var e=document.querySelector('.shop[data-item="'+k+'"]'); return e&&/checked/.test(e.className); },key);
    assert.ok(stillTicked,'tick did not stick');
    await bump('p2',-1,2); await p.waitForTimeout(2600);
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
    // which detaches every other element collected up front.
    for(var i=0;i<60;i++){
      var more=await p.evaluate(function(){
        var b=document.querySelector('[data-action="inplan"]:not(:checked)');
        if(!b) return false; b.click(); return true;
      });
      if(!more) break;
      await p.waitForTimeout(60);
    }
    await p.waitForTimeout(1200);
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
    assert.ok(published().indexOf('"_ings"')<0,'the parse cache is being written into saved state');
  });

  console.log(errs.length?('  FAIL  page errors: '+errs.join(' | ')):'  PASS  no page errors');
  await b.close(); srv.close();
  console.log(fails||errs.length?'\nFAILING\n':'\nAll meal checks pass.\n');
  process.exit(fails||errs.length?1:0);
});
