// Adding a recipe to the week, on a phone, against the db stub on a fake clock.
// A new meal is the portions you can see, it lands in the slot its tag says,
// a big batch is not cut down by a tap, the count on a card is the week's,
// and the button stays under the finger while the week above it grows.
var assert=require('assert');
var env=require('./test-env.js');
var doc=env.readDoc();

var STUB='<script>(function(){'+
 'var m=JSON.parse(sessionStorage.getItem("__store")||"{}");'+
 'function save(){ sessionStorage.setItem("__store",JSON.stringify(m)); }'+
 'function fr(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }'+
 'var db={doc:function(p){ return {get:function(){ return Promise.resolve({exists:m[p]!==undefined,data:function(){return fr(m[p]);}}); },'+
 ' set:function(d){ m[p]=fr(d); save(); return Promise.resolve(); },'+
 ' update:function(d){ if(m[p]===undefined) return Promise.reject({code:"invalid_argument"}); Object.assign(m[p],fr(d)); save(); return Promise.resolve(); },'+
 ' delete:function(){ delete m[p]; save(); return Promise.resolve(); } }; },'+
 ' collection:function(c){ return {get:function(){ return Promise.resolve({docs:Object.keys(m).filter(function(k){ return k.indexOf(c+"/")===0 && k.split("/").length===2; })'+
 '.map(function(k){ return {id:k.split("/")[1],exists:true,data:function(){ return fr(m[k]); }}; })}); }}; }};'+
 'window.__m=function(){ return m; };'+
 'window.claude={use:function(n){ return Promise.resolve(n==="db"?db:null); }};'+
 '})();<\/script>';

function docWith(plan,recipes){
  var st=env.seedOf(doc); st.activeSession=null; st.uiTab='meals'; st.uiViewingSession=false;
  st.plan=plan||[]; st.workoutLogs=[]; st.saunaSessions=[];
  (recipes||[]).forEach(function(r){ st.recipes.push(r); });
  return env.withSeed(doc,st).replace(/<link rel="stylesheet"[^>]*>/,'').replace('<head>','<head>'+STUB);
}

var fails=0;
function ok(m){ console.log('  PASS  '+m); }
function bad(m,e){ fails++; console.log('  FAIL  '+m+'\n        '+e.message); }

(async function(){
  var b=await env.launch();
  var watchdog=setTimeout(function(){ console.log('\n  FAIL  suite timed out'); process.exit(1); },150000);
  async function open(time,html){
    var ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'UTC',locale:'en-GB',hasTouch:true,isMobile:true});
    var p=await ctx.newPage(), errs=[]; p.setDefaultTimeout(8000);
    p.on('pageerror',function(e){ errs.push(e.message); });
    await p.clock.install({time:new Date(time)});
    await p.route('http://fc.test/',function(r){ r.fulfill({contentType:'text/html; charset=utf-8',body:html}); });
    await p.goto('http://fc.test/');
    await p.waitForFunction(function(){ return document.querySelector('#app *') && !/loading your data/i.test(document.body.innerText); });
    await p.waitForTimeout(300);
    if(!(await p.$('.cal'))){ await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(200); }
    return {ctx:ctx, p:p, errs:errs};
  }
  // A tap and the save after it, which waits a second for more taps.
  var settle=async function(p){ await p.clock.runFor(1500); await p.waitForTimeout(200); };
  var tap=async function(p,sel){ await p.click(sel); await settle(p); };
  var meals=function(p,id){ return p.evaluate(function(id){ var m=window.__m();
    return Object.keys(m).filter(function(k){ return k.indexOf('plan/')===0 && m[k].recipeId===id; }).map(function(k){ return m[k]; }); },id); };
  var shopRow=function(p,re){ return p.evaluate(function(src){ var re=new RegExp(src);
    return [].map.call(document.querySelectorAll('.shop .shop-t'),function(e){ return e.textContent; }).filter(function(t){ return re.test(t); })[0]||null; },re.source); };
  var cardNote=function(p,id){ return p.evaluate(function(id){ var b=document.querySelector('[data-action="addmeal"][data-id="'+id+'"]');
    var s=b&&b.parentNode.querySelector('.planned'); return s?s.textContent:''; },id); };
  var stepper=function(p,id){ return p.evaluate(function(id){ var b=document.querySelector('[data-action="portions"][data-id="'+id+'"]');
    return b?+b.parentNode.querySelector('.n').textContent:null; },id); };
  var big={id:'rbig',title:'Canteen rice',tag:'Dinner',base:30,portions:30,ingredients:['Rice (3kg)']};

  console.log('\nA NEW MEAL IS WHAT YOU CAN SEE');
  try{
    var A=await open('2026-10-02T12:00:00Z',docWith());
    // The seed's oats card was left scaled to six, closed, where nobody sees it.
    for(var i=0;i<3;i++) await tap(A.p,'[data-action="addmeal"][data-id="r1"]');
    var oats=await meals(A.p,'r1');
    assert.strictEqual(oats.length,3,'planned '+oats.length+' times');
    assert.deepStrictEqual(oats.map(function(e){ return e.portions; }),[1,1,1],'each breakfast buys '+oats.map(function(e){ return e.portions; }).join(', ')+' portions');
    var row=await shopRow(A.p,/^Porridge oats/);
    assert.ok(row && /\(240g\)/.test(row),'three breakfasts of 80g oats buy '+row);
    ok('three planned breakfasts of oats are a portion each, and the list buys 240g of oats');
    assert.deepStrictEqual(oats.map(function(e){ return e.slot; }),['breakfast','breakfast','breakfast']);
    ok('a breakfast recipe lands in Breakfast');
    // Open and scaled, the scale is on screen, and the button says what it adds.
    await A.p.click('[data-action="toggleex"][data-id="rec:r3"]'); await A.p.waitForTimeout(100);
    await tap(A.p,'[data-action="portions"][data-id="r3"][data-d="1"]');
    var label=await A.p.$eval('[data-action="addmeal"][data-id="r3"]',function(e){ return e.textContent; });
    assert.strictEqual(label,'Add 5 portions');
    await tap(A.p,'[data-action="addmeal"][data-id="r3"]');
    assert.deepStrictEqual((await meals(A.p,'r3')).map(function(e){ return e.portions; }),[5]);
    ok('an open card scaled to five says "Add 5 portions" and plans five');
    assert.deepStrictEqual(A.errs,[]);
    await A.ctx.close();
  }catch(e){ bad('a new meal is what you can see',e); }

  console.log('\nA BIG BATCH');
  try{
    var B=await open('2026-10-02T12:00:00Z',docWith([],[big]));
    await B.p.click('[data-action="toggleex"][data-id="rec:rbig"]'); await B.p.waitForTimeout(100);
    await tap(B.p,'[data-action="portions"][data-id="rbig"][data-d="1"]');
    assert.strictEqual(await stepper(B.p,'rbig'),30,'+ on a 30-portion recipe went to '+(await stepper(B.p,'rbig')));
    await tap(B.p,'[data-action="portions"][data-id="rbig"][data-d="-1"]');
    assert.strictEqual(await stepper(B.p,'rbig'),29);
    await tap(B.p,'[data-action="portions"][data-id="rbig"][data-d="0"]');
    await tap(B.p,'[data-action="addmeal"][data-id="rbig"]');
    var id=(await meals(B.p,'rbig'))[0].id;
    await tap(B.p,'[data-action="mealportions"][data-id="'+id+'"][data-d="1"]');
    assert.strictEqual((await meals(B.p,'rbig'))[0].portions,30,'+ on a 30-portion meal cut it down');
    ok('+ on a 30-portion recipe or meal leaves it at 30 rather than cutting it to 20, and - still steps down');
    await B.p.fill('#rec-title','Party chilli'); await B.p.fill('#rec-ing','Beef mince (3kg)'); await B.p.fill('#rec-portions','30');
    await tap(B.p,'[data-action="addrecipe"]');
    var made=await B.p.evaluate(function(){ var m=window.__m(); return Object.keys(m).map(function(k){ return m[k]; }).filter(function(r){ return r && r.title==='Party chilli'; })[0]; });
    assert.ok(made,'the recipe was not added');
    assert.strictEqual(made.base,20,'a recipe typed as 30 portions was stored as '+made.base);
    ok('a recipe typed as 30 portions is stored at the form\'s ceiling of 20');
    assert.deepStrictEqual(B.errs,[]);
    await B.ctx.close();
  }catch(e){ bad('a big batch',e); }

  console.log('\nTHE WEEK ON A CARD');
  try{
    var C=await open('2026-10-02T23:59:00Z',docWith([{id:'pl-y',recipeId:'r2',date:'2026-10-02',slot:'breakfast',portions:1}]));
    assert.ok(/1 in the week/.test(await cardNote(C.p,'r2')),'the meal planned today is not counted: '+(await cardNote(C.p,'r2')));
    // Past midnight, before the half-minute check prunes it, any redraw shows
    // a week without it. The card has to agree with the week.
    await C.p.clock.setSystemTime(new Date('2026-10-03T00:00:05Z'));
    await C.p.click('[data-action="toggleex"][data-id="rec:r2"]'); await C.p.waitForTimeout(100);
    assert.strictEqual(await C.p.$$eval('.mealrow',function(r){ return r.length; }),0,'the week still shows yesterday');
    assert.ok(!/in the week/.test(await cardNote(C.p,'r2')),'yesterday\'s meal is counted: '+(await cardNote(C.p,'r2')));
    ok('a meal whose day has gone is not counted in the week on its card');
    assert.deepStrictEqual(C.errs,[]);
    await C.ctx.close();
  }catch(e){ bad('the week on a card',e); }

  console.log('\nTHE BUTTON STAYS UNDER THE FINGER');
  try{
    var D=await open('2026-10-02T12:00:00Z',docWith());
    var sel='[data-action="addmeal"][data-id="r20"]';
    await D.p.$eval(sel,function(e){ e.scrollIntoView({block:'center'}); }); await D.p.waitForTimeout(100);
    var box=await D.p.$eval(sel,function(e){ var r=e.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; });
    await D.p.mouse.click(box.x,box.y); await settle(D.p);
    var after=await D.p.$eval(sel,function(e){ var r=e.getBoundingClientRect(); return r.top+r.height/2; });
    assert.ok(Math.abs(after-box.y)<2,'the button moved from y='+Math.round(box.y)+' to y='+Math.round(after));
    var note=await cardNote(D.p,'r20');
    assert.ok(/^Added for Today · Lunch/.test(note),'the tap does not say where it went: "'+note+'"');
    ok('Add to plan stays where it was on a phone, and says "'+note+'"');
    // A second tap on the same spot plans the same recipe again.
    await D.p.mouse.click(box.x,box.y); await settle(D.p);
    assert.strictEqual((await meals(D.p,'r20')).length,2,'the second tap planned something else');
    var others=await D.p.evaluate(function(){ var m=window.__m(); return Object.keys(m).filter(function(k){ return k.indexOf('plan/')===0 && m[k].recipeId!=='r20'; }).length; });
    assert.strictEqual(others,0,'the second tap planned another recipe');
    ok('a second tap in the same spot plans the same recipe');
    await D.p.click('[data-action="tab"][data-tab="today"]'); await D.p.click('[data-action="tab"][data-tab="meals"]'); await D.p.waitForTimeout(100);
    assert.ok(!/Added/.test(await cardNote(D.p,'r20')),'the confirmation outlived moving on');
    ok('the confirmation goes once something else is tapped');
    assert.deepStrictEqual(D.errs,[]);
    await D.ctx.close();
  }catch(e){ bad('the button stays under the finger',e); }

  clearTimeout(watchdog);
  await b.close();
  console.log(fails?'\nFAILING\n':'\nAll add-to-plan checks pass.\n');
  process.exit(fails?1:0);
})();
