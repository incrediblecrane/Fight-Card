// The log date and the day turning over, against the db stub, on a fake clock.
// Picking a date with the real picker, typing one, a backfill left over from
// yesterday, a view left open across midnight, and looking at a past day
// without leaving a blank record of it behind.
var assert=require('assert');
var env=require('./test-env.js');
var doc=env.readDoc();

// The store lives in the tab's sessionStorage, so it survives a reload as the
// real one does. Every path written is logged, so a write that was later
// deleted still shows.
var STUB='<script>(function(){'+
 'var m=JSON.parse(sessionStorage.getItem("__store")||"{}"), w=JSON.parse(sessionStorage.getItem("__writes")||"[]");'+
 'function save(){ sessionStorage.setItem("__store",JSON.stringify(m)); sessionStorage.setItem("__writes",JSON.stringify(w)); }'+
 'function fr(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }'+
 'var db={doc:function(p){ return {get:function(){ return Promise.resolve({exists:m[p]!==undefined,data:function(){return fr(m[p]);}}); },'+
 ' set:function(d){ m[p]=fr(d); w.push(p); save(); return Promise.resolve(); },'+
 ' update:function(d){ if(m[p]===undefined) return Promise.reject({code:"invalid_argument"}); Object.assign(m[p],fr(d)); w.push(p); save(); return Promise.resolve(); },'+
 ' delete:function(){ delete m[p]; w.push("-"+p); save(); return Promise.resolve(); } }; },'+
 ' collection:function(c){ return {get:function(){ return Promise.resolve({docs:Object.keys(m).filter(function(k){ return k.indexOf(c+"/")===0 && k.split("/").length===2; })'+
 '.map(function(k){ return {id:k.split("/")[1],exists:true,data:function(){ return fr(m[k]); }}; })}); }}; }};'+
 'window.__m=function(){ return m; }; window.__w=function(){ return w; }; window.__put=function(p,v){ m[p]=v; save(); };'+
 'window.claude={use:function(n){ return Promise.resolve(n==="db"?db:null); }};'+
 '})();<\/script>';

function blank(){ return {water:0,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:false}; }
function day(water){ var d=blank(); d.water=water; d.touched=true; return d; }
// A world of its own: no session in flight, and only the days given.
function docWith(days,plan){
  var st=env.seedOf(doc); st.activeSession=null; st.days=days||{}; st.uiTab='today'; st.uiViewingSession=false;
  st.plan=plan||[]; st.workoutLogs=[]; st.saunaSessions=[];
  return env.withSeed(doc,st).replace(/<link rel="stylesheet"[^>]*>/,'').replace('<head>','<head>'+STUB);
}

var fails=0;
function ok(m){ console.log('  PASS  '+m); }
function bad(m,e){ fails++; console.log('  FAIL  '+m+'\n        '+e.message); }

(async function(){
  var b=await env.launch();
  var watchdog=setTimeout(function(){ console.log('\n  FAIL  suite timed out'); process.exit(1); },150000);
  // One tab per check, at a time of day of its own, with its own document.
  async function open(time,html,opts){
    var ctx=await b.newContext(Object.assign({viewport:{width:420,height:900},timezoneId:'UTC',locale:'en-GB'},opts||{}));
    var p=await ctx.newPage(), errs=[]; p.setDefaultTimeout(8000);
    p.on('pageerror',function(e){ errs.push(e.message); });
    await p.clock.install({time:new Date(time)});
    await p.route('http://fc.test/',function(r){ r.fulfill({contentType:'text/html; charset=utf-8',body:html}); });
    var go=async function(){ await p.goto('http://fc.test/');
      await p.waitForFunction(function(){ return document.querySelector('#app *') && !/loading your data/i.test(document.body.innerText); });
      await p.waitForTimeout(300); };
    await go();
    return {ctx:ctx, p:p, errs:errs, go:go};
  }
  var barText=function(p){ return p.evaluate(function(){ var e=document.querySelector('.backfill-bar'); return e?e.textContent:null; }); };
  // A tap and the save after it, which waits a second for more taps.
  var tapSave=async function(p,sel){ await p.click(sel); await p.clock.runFor(1500); await p.waitForTimeout(200); };
  var html=docWith({'2026-09-29':day(4)});

  console.log('\nPICKING A DATE');
  try{
    var A=await open('2026-10-02T12:00:00Z',html);
    var el=await A.p.$('#logdate');
    // A real tap, the one that opens the native picker. The picker's change
    // lands on the element it opened on, so that element must still be there.
    await el.click(); await A.p.waitForTimeout(200); await A.p.keyboard.press('Escape');
    assert.ok(await el.evaluate(function(e){ return e.isConnected; }),'tapping the date box redrew the page and threw the box away');
    await el.evaluate(function(e){ e.value='2026-09-22'; e.dispatchEvent(new Event('change',{bubbles:true})); });
    await A.p.waitForTimeout(200);
    var bt=await barText(A.p);
    assert.ok(bt && /22 Sep/.test(bt),'no backfill for the picked day: '+bt);
    assert.deepStrictEqual(A.errs,[]);
    ok('a date picked after tapping the box is the day logged to, 10 days back included');
    await A.ctx.close();
  }catch(e){ bad('picking a date with a real tap',e); }

  try{
    var B=await open('2026-10-02T12:00:00Z',html,{locale:'en-US'});
    // Every digit is a change, and a blur during the redraw used to fire a
    // nested one. The window is all one year, so the year is not typed into.
    await B.p.focus('#logdate');
    await B.p.keyboard.type('0925'); await B.p.waitForTimeout(200);
    await B.p.keyboard.press('Enter'); await B.p.waitForTimeout(300);
    var bt2=await barText(B.p);
    assert.deepStrictEqual(B.errs,[],'typing a date threw');
    assert.ok(bt2 && /25 Sep/.test(bt2),'typing 09/25/2026 did not log for that day: '+bt2);
    assert.strictEqual(await B.p.$eval('#logdate',function(e){ return e.value; }),'2026-09-25');
    // Arrowing the day down, then tapping off the box, also lands.
    await B.p.focus('#logdate'); await B.p.keyboard.press('ArrowRight'); await B.p.keyboard.press('ArrowDown');
    await B.p.waitForTimeout(100); await B.p.click('.date'); await B.p.waitForTimeout(300);
    var bt3=await barText(B.p);
    assert.deepStrictEqual(B.errs,[],'arrowing a date threw');
    assert.ok(bt3 && /24 Sep/.test(bt3),'arrowing the day down and leaving the box did not log for 24 Sep: '+bt3);
    // The whole date typed, year and all, reaches a backfill without throwing.
    await B.p.click('.backfill-bar button'); await B.p.waitForTimeout(200);
    await B.p.focus('#logdate'); await B.p.keyboard.type('09252026'); await B.p.waitForTimeout(200);
    await B.p.keyboard.press('Enter'); await B.p.waitForTimeout(300);
    assert.deepStrictEqual(B.errs,[],'typing 09252026 threw');
    assert.ok(await barText(B.p),'typing 09252026 never reached a backfill');
    ok('a date can be typed or arrowed with a keyboard, and nothing throws');
    await B.ctx.close();
  }catch(e){ bad('typing a date',e); }

  console.log('\nA NEW DAY');
  try{
    var C=await open('2026-10-02T12:00:00Z',html);
    await C.p.$eval('#logdate',function(e){ e.value='2026-09-29'; e.dispatchEvent(new Event('change',{bubbles:true})); });
    await C.p.waitForTimeout(200);
    assert.ok(await barText(C.p),'the backfill did not start');
    await C.p.clock.fastForward('24:00:00');
    await C.go();
    assert.strictEqual(await barText(C.p),null,'yesterday\'s backfill is still on');
    await tapSave(C.p,'[data-action="water"][data-d="1"]');
    var m=await C.p.evaluate(function(){ return window.__m(); });
    assert.strictEqual((m['days/2026-10-03']||{}).water,1,'the tap did not land on the new today');
    assert.strictEqual((m['days/2026-09-29']||{}).water,4,'the tap went to the old backfill day');
    assert.deepStrictEqual(C.errs,[]);
    ok('a backfill date from yesterday is dropped, and a tap lands on today');
    await C.ctx.close();
  }catch(e){ bad('a backfill left over from yesterday',e); }

  try{
    var recipe=env.seedOf(doc).recipes[0].id;
    var D=await open('2026-10-02T23:58:00Z',docWith({'2026-09-29':day(4)},
      [{id:'pl-old',recipeId:recipe,date:'2026-10-02',slot:'dinner',portions:1}]));
    var hd=function(){ return D.p.$eval('.date',function(e){ return e.textContent; }); };
    assert.ok(/2 October/.test(await hd()),'header read '+(await hd()));
    assert.ok((await D.p.evaluate(function(){ return window.__m(); }))['plan/pl-old'],'the meal was not planned');
    await D.p.clock.runFor(5*60*1000); await D.p.waitForTimeout(200);
    assert.ok(/3 October/.test(await hd()),'five minutes past midnight the header still reads '+(await hd()));
    assert.strictEqual(await D.p.$eval('#logdate',function(e){ return e.value; }),'2026-10-03');
    var m2=await D.p.evaluate(function(){ return window.__m(); });
    assert.ok(!m2['plan/pl-old'],'yesterday\'s planned meal was not pruned at midnight');
    assert.deepStrictEqual(D.errs,[]);
    ok('a view left open across midnight moves to the new day without a tap');
    await D.ctx.close();
  }catch(e){ bad('left open across midnight',e); }

  console.log('\nLOOKING AT A PAST DAY');
  try{
    var E=await open('2026-10-02T12:00:00Z',html);
    await E.p.$eval('#logdate',function(e){ e.value='2026-09-26'; e.dispatchEvent(new Event('change',{bubbles:true})); });
    await E.p.waitForTimeout(200);
    assert.ok(/26 Sep/.test(await barText(E.p)||''),'not looking at 26 Sep');
    // Moving around, and a minus on a day with nothing to take away, are not logging.
    await E.p.click('[data-action="tab"][data-tab="training"]'); await E.p.waitForTimeout(100);
    await E.p.click('[data-action="tab"][data-tab="today"]'); await E.p.waitForTimeout(100);
    await tapSave(E.p,'[data-action="water"][data-d="-1"]');
    await E.p.click('.backfill-bar button'); await E.p.clock.runFor(1500); await E.p.waitForTimeout(200);
    await E.p.click('[data-action="tab"][data-tab="progress"]'); await E.p.waitForTimeout(300);
    var all=await E.p.evaluate(function(){
      var t=[].slice.call(document.querySelectorAll('.stat-tile')).filter(function(x){ return /all time/.test(x.textContent); })[0];
      return t?t.textContent:null; });
    assert.ok(all && /over 4 days/.test(all),'the all-time water average is over '+all);
    var w=await E.p.evaluate(function(){ return window.__w(); });
    assert.ok(w.indexOf('days/2026-09-26')<0,'a blank day was written for the day looked at');
    assert.deepStrictEqual(E.errs,[]);
    ok('looking at a past day leaves no record of it, and the averages are as they were');
    await E.ctx.close();
  }catch(e){ bad('looking at a past day',e); }

  try{
    var E=await open('2026-10-02T12:00:00Z',html);
    // A blank day the store already holds, filled in by another view, is not
    // deleted by this one for being blank.
    await E.p.evaluate(function(){ window.__put('days/2026-09-30',{water:0,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:false}); });
    await E.go(); await E.p.click('[data-action="tab"][data-tab="today"]');
    await E.p.evaluate(function(){ window.__put('days/2026-09-30',{water:3,wx:3,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:true}); });
    await tapSave(E.p,'[data-action="water"][data-d="1"]');
    var m3=await E.p.evaluate(function(){ return window.__m(); });
    assert.strictEqual((m3['days/2026-09-30']||{}).water,3,'another view\'s water on a day stored blank was deleted');
    assert.deepStrictEqual(E.errs,[]);
    ok('a day stored blank and filled in elsewhere is kept');
    await E.ctx.close();
  }catch(e){ bad('a day stored blank, filled in elsewhere',e); }

  clearTimeout(watchdog); await b.close();
  console.log(fails?('\n'+fails+' FAILING\n'):'\nAll date checks pass.\n');
  process.exit(fails?1:0);
})();
