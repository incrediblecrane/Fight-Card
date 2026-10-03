// Shopping ticks in the browser: what a tick is for, how long it lasts, and
// that a row can be reached and ticked from the keyboard.
//
// A tick says "bought". One that outlives the shop it was made for, or covers
// more than was bought, sends you home short, which is the one thing a
// shopping list must not do.
var http=require('http'),assert=require('assert');
var env=require('./test-env.js');
var base=env.localOnly(env.readDoc()), doc=base;
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
var loads=0;
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  loads++;
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});
function pad(n){ return (n<10?'0':'')+n; }
function day(i){ var d=new Date(); d.setDate(d.getDate()+i); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
// A store holding only these recipes, planned on these days (0 is today).
function seed(meals,checked,extras){
  var st=env.seedOf(base);
  st.recipes=meals.map(function(m,i){ return {id:'tk'+i,title:'Tick '+i,tag:'Recipe',base:1,portions:1,ingredients:m[0],instructions:''}; });
  st.deletedRecipes=['p1','p2','p3','p4','p5','p6','p7','p8','p9'];
  st.plan=meals.map(function(m,i){ return {id:'pl'+i,recipeId:'tk'+i,date:day(m[1]),slot:'dinner',portions:m[2]||1}; });
  st.shoppingChecked=checked||[]; st.shopExtras=extras||[]; st.activeSession=null;
  doc=env.withSeed(base,st);
}

srv.listen(0,async function(){
  var b=await env.launch();
  var p=await b.newPage({viewport:{width:420,height:900}});
  p.setDefaultTimeout(9000);
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  var fails=0, ok=m=>console.log('  PASS  '+m), bad=(m,e)=>{fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  var t=async(name,fn)=>{ try{ await fn(); ok(name); }catch(e){ bad(name,e); } };
  var settle=async n0=>{ for(var i=0;loads<=n0;i++){ if(i>600) throw new Error('no publish and reload came');
    await new Promise(r=>setTimeout(r,50)); } await p.waitForSelector('#app .wrap:not(.held)'); };
  // Each save publishes and reloads, which draws the whole week again.
  var saving=async fn=>{ var n0=loads; await fn(); await settle(n0); };
  var go=async()=>{ await p.goto('http://127.0.0.1:'+srv.address().port+'/'); await p.waitForSelector('#app .wrap:not(.held)');
    var back=await p.$('[data-action="cancelsession"]'); if(back) await saving(()=>back.click());
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForSelector('.shoprange'); };
  var range=async n=>{ await p.click('[data-action="shoprange"][data-n="'+n+'"]'); await p.waitForSelector('[data-action="shoprange"][data-n="'+n+'"].on'); };
  // Each row as shown: its words, and whether it is ticked.
  var rows=()=>p.evaluate(function(){ return [].map.call(document.querySelectorAll('.shop'),function(e){
    return {label:e.querySelector('.shop-t').textContent, ticked:/\bchecked\b/.test(e.className), aria:e.getAttribute('aria-checked'), key:e.getAttribute('data-item')}; }); });
  var row=async n=>(await rows()).filter(function(r){ return r.label.indexOf(n)===0; })[0];
  var tick=async n=>{ var r=await row(n); assert.ok(r,'no '+n+' row');
    await saving(()=>p.click('.shop[data-item="'+r.key.replace(/"/g,'\\"')+'"]')); };

  console.log('\nA TICK IS FOR WHAT WAS BOUGHT');

  await t('two onions ticked for three days do not tick the week\'s five once a meal goes in on day four', async function(){
    seed([[['Onion (2)'],0],[['Onion (3)'],4]].slice(0,1)); await go();
    await range(3); await tick('Onion');
    await range(3); assert.ok((await row('Onion (2)')).ticked,'the tick did not stick');
    await p.selectOption('[data-action="planday"][data-id="tk0"]',day(4));
    await saving(()=>p.click('[data-action="addmeal"][data-id="tk0"]'));
    await range(7); var w=await row('Onion');
    assert.strictEqual(w.label,'Onion (4)','the week reads '+w.label);
    assert.ok(!w.ticked,'the week\'s 4 onions show as bought, after buying 2');
    await range(3); assert.ok((await row('Onion (2)')).ticked,'the three days lost their tick');
  });

  await t('the week ticked stays ticked in the three days, and fewer portions keep it', async function(){
    seed([[['Onion (2)'],0],[['Onion (3)'],4,2]]); await go();
    await tick('Onion (8)');
    await range(3); assert.ok((await row('Onion (2)')).ticked,'5 bought does not cover the 2 for three days');
    await saving(()=>p.click('[data-action="mealportions"][data-id="pl1"][data-d="-1"]'));
    var r=await row('Onion'); assert.ok(r.ticked,'fewer portions unticked '+r.label);
    await saving(()=>p.click('[data-action="mealportions"][data-id="pl1"][data-d="1"]'));
    await saving(()=>p.click('[data-action="mealportions"][data-id="pl1"][data-d="1"]'));
    r=await row('Onion'); assert.strictEqual(r.label,'Onion (11)'); assert.ok(!r.ticked,'more portions than were bought for still ticked');
  });

  await t('a tick from older code still ticks its row', async function(){
    seed([[['Onion (2)'],0],[['Onion (3)'],4]],['i|onion']); await go();
    assert.ok((await row('Onion (5)')).ticked,'the week lost an older tick');
    await range(3); assert.ok((await row('Onion (2)')).ticked,'the three days lost an older tick');
  });

  console.log('\nWHICH SPELLING COMES FIRST');

  await t('Egg today and Eggs on day four, ticked, stay ticked when today\'s meal goes', async function(){
    seed([[['Egg (1)'],0],[['Eggs (2)'],4]]); await go();
    await tick('Egg');
    await saving(()=>p.click('[data-action="delmeal"][data-id="pl0"]'));
    var r=await row('Egg'); assert.ok(r,'no egg row left'); assert.ok(r.ticked,r.label+' was unticked by removing the meal that spelt it first');
  });

  await t('an older tick under the second spelling counts', async function(){
    seed([[['Egg (1)'],0],[['Eggs (2)'],4]],['i|eggs']); await go();
    assert.ok((await row('Egg')).ticked,'"i|eggs" does not tick the Egg row');
  });

  console.log('\nCLEARING');

  await t('clearing three days keeps the ticks of what the rest of the week still needs', async function(){
    seed([[['Eggs (2)'],1],[['Eggs (2)','Flour (100g)'],5],[['Butter (50g)'],1]],[],[{id:'xb',text:'Bin bags'}]); await go();
    await tick('Eggs'); await tick('Butter'); await tick('Bin bags');
    await range(3); assert.ok((await row('Eggs (2)')).ticked,'the tick did not cover the three days');
    await saving(()=>p.click('[data-action="clearweek"]'));
    var r=await row('Eggs'); assert.ok(r,'the day-five eggs were cleared too');
    assert.ok(r.ticked,'Eggs still needed on day five lost its tick');
    assert.ok((await row('Bin bags')).ticked,'your own item lost its tick');
    assert.ok(!await row('Butter'),'the cleared day\'s butter is still listed');
    await saving(()=>p.click('[data-action="clearweek"]'));
    assert.ok(!(await rows()).some(function(x){ return x.ticked; }),'clearing the week left ticks');
  });

  await t('Clear the ticks unticks the list and keeps the meals, and Undo brings them back', async function(){
    seed([[['Onion (2)'],0],[['Rice (200g)'],2]]); await go();
    assert.ok(!await p.$('[data-action="clearticks"]'),'offered with nothing ticked');
    await tick('Onion'); await tick('Rice');
    await saving(()=>p.click('[data-action="clearticks"]'));
    var rs=await rows(); assert.strictEqual(rs.length,2,'the list changed: '+rs.map(x=>x.label).join(' | '));
    assert.ok(!rs.some(function(x){ return x.ticked; }),'a tick survived');
    assert.strictEqual(await p.locator('.mealrow').count(),2,'the meals went too');
    await saving(()=>p.click('.undo-bar [data-action="undo"]'));
    rs=await rows(); assert.ok(rs.every(function(x){ return x.ticked; }),'Undo did not bring the ticks back');
  });

  console.log('\nFROM THE KEYBOARD');

  await t('Tab reaches a row, Space ticks it, and it says it is ticked', async function(){
    seed([[['Onion (2)'],0]],[],[{id:'xk',text:'Bin bags'}]); await go();
    await p.focus('[data-action="shoprange"][data-n="7"]'); await p.keyboard.press('Tab');
    var f=await p.evaluate(function(){ var a=document.activeElement;
      return {cls:a.className, role:a.getAttribute('role'), aria:a.getAttribute('aria-checked'), key:a.getAttribute('data-item')}; });
    assert.ok(/\bshop\b/.test(f.cls),'Tab went to '+JSON.stringify(f));
    assert.strictEqual(f.role,'checkbox'); assert.strictEqual(f.aria,'false');
    await saving(()=>p.keyboard.press('Space'));
    var r=(await rows()).filter(function(x){ return x.key===f.key; })[0];
    assert.strictEqual(r.aria,'true','aria-checked did not flip'); assert.ok(r.ticked,'Space did not tick it');
    await saving(async()=>{ await p.focus('.shop[data-item="'+f.key+'"]'); await p.keyboard.press('Enter'); });
    r=(await rows()).filter(function(x){ return x.key===f.key; })[0];
    assert.strictEqual(r.aria,'false','Enter did not untick it');
    var inside=await p.evaluate(function(){ return document.querySelectorAll('.shop .shop-x, [role="checkbox"] button').length; });
    assert.strictEqual(inside,0,'a button sits inside a checkbox');
    assert.ok(await p.$('.shoprow > .shop-x[data-action="delextra"]'),'your own item has no x beside it');
  });

  await t('nothing threw', async function(){ assert.deepStrictEqual(errs,[]); });
  await b.close(); srv.close();
  console.log(fails?('\n'+fails+' FAILING\n'):'\nAll tick checks pass.\n');
  process.exit(fails?1:0);
});
