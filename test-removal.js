var http=require('http'),fs=require('fs'),assert=require('assert');
var env=require('./test-env.js');
var doc=env.localOnly(env.readDoc());
var SHIM='<script>(function(){var ns={publish:function(h){return fetch("/publish",{method:"POST",body:h})'
 +'.then(function(){setTimeout(function(){location.reload();},0);});}};'
 +'window.claude={use:function(n){return Promise.resolve(n==="artifact"?ns:null);}};})();<\/script>';
var srv=http.createServer(function(q,r){
  if(q.url==='/publish'){var c=[];q.on('data',x=>c.push(x));q.on('end',function(){doc=Buffer.concat(c).toString();r.end('ok');});return;}
  var out=doc.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'').replace('<body>','<body>'+SHIM);
  r.setHeader('content-type','text/html; charset=utf-8');r.setHeader('content-length',Buffer.byteLength(out));r.end(out);
});
srv.listen(0,async function(){
  var b=await env.launch();
  var p=await b.newPage({viewport:{width:420,height:900},hasTouch:true});
  var errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.setDefaultTimeout(8000);
  var fails=0, ok=function(m){console.log('  PASS  '+m);}, bad=function(m,e){fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  await p.goto('http://127.0.0.1:'+srv.address().port+'/'); await p.waitForTimeout(500);
  var back=await p.$('[data-action="cancelsession"]'); if(back){await back.click(); await p.waitForTimeout(500);}
  await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(500);

  // The list renders only the first six, so counting rows proves nothing once
  // there are more than six sessions: deleting one just promotes the seventh.
  // Follow the id of the row that was actually removed instead.
  var ids=function(){ return p.evaluate(function(){
    return [].slice.call(document.querySelectorAll('[data-action="delsauna"]'))
      .map(function(e){ return e.getAttribute('data-id'); })
      .filter(function(v,i,a){ return a.indexOf(v)===i; }); }); };
  var before=await ids();
  console.log('sauna rows before:', before.length);

  // On a phone the hover-only x is never drawn, yet it used to take taps: one
  // touch on a blank spot at the right of a row deleted it outright.
  try{
    var mctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    var mp=await mctx.newPage(); mp.setDefaultTimeout(8000);
    await mp.goto('http://127.0.0.1:'+srv.address().port+'/'); await mp.waitForTimeout(500);
    var mb=await mp.$('[data-action="cancelsession"]'); if(mb){ await mb.click(); await mp.waitForTimeout(400); }
    await mp.click('[data-action="tab"][data-tab="progress"]'); await mp.waitForTimeout(400);
    assert.strictEqual(await mp.evaluate(function(){ return matchMedia('(hover:hover)').matches; }),false,'this context still hovers, so it proves nothing');
    var count=function(){ return mp.evaluate(function(){ return document.querySelectorAll('.swipe').length; }); };
    var n0=await count();
    var xb=await mp.evaluate(function(){ var x=document.querySelector('.swipe-x'); x.scrollIntoView({block:'center'});
      var r=x.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
    await mp.touchscreen.tap(xb.x,xb.y); await mp.waitForTimeout(2600);
    assert.strictEqual(await count(),n0,'a tap on the unseen x removed a row');
    assert.strictEqual(await mp.$('.undo-bar'),null,'a tap on the unseen x offered an undo, so it deleted something');
    await mctx.close();
    ok('on a touch screen a tap where the hidden x sits deletes nothing');
  }catch(e){ bad('hidden x on touch',e); }

  try{
    // swipe left on the first sauna row
    var rows=await p.$$('[data-swipe]');
    var target=null;
    for(var i=0;i<rows.length;i++){ var t=await rows[i].$('[data-action="delsauna"]'); if(t){ target=rows[i]; break; } }
    assert.ok(target,'no sauna row found');
    var box=await target.boundingBox();
    await p.touchscreen.tap(box.x+box.width-30, box.y+box.height/2).catch(function(){});
    await target.dispatchEvent('touchstart',{touches:[{clientX:box.x+box.width-20,clientY:box.y+box.height/2}]}).catch(function(){});
    await p.evaluate(function(){
      var r=document.querySelector('[data-swipe]');
      var mk=function(t,x){ return new TouchEvent(t,{bubbles:true,cancelable:true,
        touches:t==='touchend'?[]:[new Touch({identifier:1,target:r,clientX:x,clientY:10})],
        changedTouches:[new Touch({identifier:1,target:r,clientX:x,clientY:10})]}); };
      r.dispatchEvent(mk('touchstart',300)); r.dispatchEvent(mk('touchend',180));
    });
    await p.waitForTimeout(400);
    var opened=await p.evaluate(function(){ return !!document.querySelector('.swipe.open'); });
    assert.ok(opened,'swipe left did not reveal Remove');
    ok('swiping a row left reveals Remove');
  }catch(e){ bad('swipe reveals Remove',e); }

  try{
    var goneId=await p.evaluate(function(){
      var b=document.querySelector('.swipe.open [data-action="delsauna"]');
      return b?b.getAttribute('data-id'):null; });
    assert.ok(goneId,'no id on the row about to be removed');
    await p.click('.swipe.open .swipe-del'); await p.waitForTimeout(2600);
    var after=await ids();
    assert.ok(after.indexOf(goneId)<0,'the removed entry is still listed: '+goneId);
    ok('tapping Remove deletes the entry and it survives the save');
  }catch(e){ bad('remove deletes',e); }

  try{
    var bar=await p.$('.undo-bar');
    assert.ok(bar,'undo bar missing after the save-reload');
    ok('the undo offer survives the republish-and-reload');
  }catch(e){ bad('undo survives reload',e); }

  try{
    await p.click('[data-action="undo"]'); await p.waitForTimeout(2600);
    var restored=await ids();
    assert.ok(restored.indexOf(goneId)>-1,'undo did not put '+goneId+' back: '+restored.join(', '));
    assert.deepStrictEqual(restored, before, 'undo changed the list rather than restoring it');
    assert.strictEqual(await p.$('.undo-bar'), null, 'undo bar should clear');
    ok('Undo puts the entry back and clears the offer');
  }catch(e){ bad('undo restores',e); }


  // The rest of this suite reads what was saved straight out of the published
  // document, and can edit the seed before a load, because XP and the undo slot
  // are bookkeeping that a list of rows on screen cannot show.
  var url='http://127.0.0.1:'+srv.address().port+'/';
  var seedOf=function(){ return env.seedOf(doc); };
  var setSeed=function(fn){ var st=env.seedOf(doc); fn(st); doc=env.withSeed(doc,st); };
  var settle=function(){ return p.waitForTimeout(1800); };
  var go=async function(){ await p.goto(url); await p.waitForTimeout(600);
    var bk=await p.$('[data-action="cancelsession"]'); if(bk){ await bk.click(); await p.waitForTimeout(300); } };
  var tabTo=async function(n){ await p.click('[data-action="tab"][data-tab="'+n+'"]'); await p.waitForTimeout(400); };
  var hudXp=function(){ return p.evaluate(function(){
    var n=document.querySelectorAll('.streaks .streak .n'); return n.length?+n[n.length-1].textContent:NaN; }); };
  var tap=function(sel){ return p.evaluate(function(s){ var e=document.querySelector(s); if(!e) return false; e.click(); return true; },sel); };
  var t=async function(name,fn){ try{ await fn(); ok(name); }catch(e){ bad(name,e); } };
  var dayKey=function(){ return p.evaluate(function(){ var a=document.querySelector('.week .dot.active'); return a?a.getAttribute('data-k'):''; }); };
  // A session with one set in it, finished. The warm-up is the first slide.
  // A warm-up alone is no session, so the set goes on the slide after it.
  var finishOne=async function(title){
    await tabTo('training');
    if(title) assert.ok(await p.evaluate(function(want){
      var c=[].slice.call(document.querySelectorAll('.wcard')).filter(function(x){ return x.querySelector('h4').textContent.trim()===want; })[0];
      var b=c&&c.querySelector('[data-action="startworkout"]'); if(b) b.click(); return !!b; },title),'no card for '+title);
    else await p.locator('[data-action="startworkout"]').first().click();
    await p.waitForTimeout(500);
    await tap('[data-action="nextslide"]'); await p.waitForTimeout(200);
    await p.fill('input[id^="log-v-"]','5');
    await p.locator('[data-action="logset"]').first().click(); await p.waitForTimeout(300);
    for(var k=0;k<30;k++){ if(!(await tap('[data-action="nextslide"]'))) break; await p.waitForTimeout(60); }
    assert.ok(await tap('[data-action="finishworkout"]'),'never reached Finish');
    await settle();
  };
  var toFirst=async function(){ for(var k=0;k<30;k++){ if(!(await tap('[data-action="prevslide"]:not([disabled])'))) break; await p.waitForTimeout(60); } };
  var logIdsOn=function(k){ return seedOf().workoutLogs.filter(function(l){ return l.date===k; }).map(function(l){ return l.id; }); };
  var delLog=async function(id){
    assert.ok(await tap('.swipe-del[data-action="dellog"][data-id="'+id+'"]'),'no Remove for log '+id); await settle(); };

  console.log('\nXP COMES BACK OFF WHEN WHAT EARNED IT IS UNDONE');
  var todayK='';
  await t('switching between Rest and a workout pill is not a way to farm XP', async function(){
    await go(); await tabTo('today'); todayK=await dayKey();
    assert.ok(todayK,'could not tell which day is being logged');
    await tap('[data-action="rest"]'); await p.waitForTimeout(150);
    await tap('[data-action="workout"][data-type="Strength"]'); await settle();
    var x1=await hudXp();
    await tap('[data-action="rest"]'); await p.waitForTimeout(150);
    await tap('[data-action="workout"][data-type="Strength"]'); await settle();
    var x2=await hudXp();
    assert.strictEqual(x2,x1,'one Rest and back cycle moved XP from '+x1+' to '+x2);
    // Leave the day unlogged for what follows.
    await tap('[data-action="workout"][data-type="Strength"]'); await settle();
  });

  await t('two sessions on one day, both removed, put XP back where it started', async function(){
    await go(); var x0=await hudXp();
    await finishOne(); await finishOne();
    var ids=logIdsOn(todayK);
    assert.strictEqual(ids.length,2,'expected two logs on '+todayK+', found '+ids.length);
    await go(); await tabTo('progress');
    await delLog(ids[0]); await delLog(ids[1]);
    var x=await hudXp();
    assert.strictEqual(x,x0,'XP went from '+x0+' to '+x+' across two sessions and their removal');
  });

  await t('while a session is logged for the day, its pill cannot be turned off', async function(){
    await go(); await finishOne(); await go(); await tabTo('today');
    var x0=await hudXp();
    await tap('[data-action="workout"][data-type="Strength"].on,[data-action="workout"].on'); await settle();
    var on=await p.evaluate(function(){ return !!document.querySelector('[data-action="workout"].on'); });
    assert.ok(on,'the day reads untrained while a session is logged for it');
    await tap('[data-action="rest"]'); await settle();
    on=await p.evaluate(function(){ return !!document.querySelector('[data-action="workout"].on'); });
    assert.ok(on,'Rest day wiped a logged session off the day');
    assert.strictEqual(await hudXp(),x0,'XP moved');
    var ids=logIdsOn(todayK); await tabTo('progress');
    for(var i=0;i<ids.length;i++) await delLog(ids[i]);
    await tap('[data-action="dismissundo"]'); await p.waitForTimeout(300);
  });

  await t('removing a log near zero XP and undoing it returns exactly what was there', async function(){
    // The clamp at zero took less than the full 15, and the undo gave back 15.
    setSeed(function(st){ st.totalXp=5; });
    await go(); await tabTo('progress');
    assert.strictEqual(await hudXp(),5,'the seed edit did not take');
    var only=seedOf().workoutLogs.filter(function(l){ return l.date==='2026-09-01'; })[0];
    assert.ok(only,'no log on 2026-09-01 in the seed');
    await delLog(only.id);
    assert.ok(await tap('[data-action="undo"]'),'no undo offer'); await settle();
    assert.strictEqual(await hudXp(),5,'XP after remove and undo');
  });

  console.log('\nTAKING A SESSION OFF A DAY LEAVES THE DAY AS THE REST OF IT SAYS');
  var clearToday=function(){ setSeed(function(st){
    st.workoutLogs=st.workoutLogs.filter(function(l){ return l.date!==todayK; }); st.activeSession=null;
    if(st.days[todayK]){ st.days[todayK].workout={done:false,type:null}; st.days[todayK].rest=false; } }); };
  var workoutLine=function(){ return p.evaluate(function(){
    var c=[].slice.call(document.querySelectorAll('.card')).filter(function(x){ var h=x.querySelector('h3'); return h&&h.textContent==='Workout'; })[0];
    var s=c&&c.querySelector('.sub'); return s?s.textContent:''; }); };

  await t('a session removed from a day quick-logged before it leaves the day trained and its XP', async function(){
    clearToday(); await go(); await tabTo('today');
    await tap('[data-action="workout"][data-type="Conditioning"]'); await settle();
    var x1=await hudXp();
    await finishOne('Push');
    assert.strictEqual(await hudXp(),x1,'the session paid again for a day already trained');
    var ids=logIdsOn(todayK); assert.strictEqual(ids.length,1,'expected one log, found '+ids.length);
    await go(); await tabTo('progress'); await delLog(ids[0]);
    var d=seedOf().days[todayK];
    assert.ok(d.workout.done,'the quick-logged day was cleared');
    assert.strictEqual(d.workout.type,'Conditioning','the day reads '+d.workout.type);
    assert.strictEqual(await hudXp(),x1,'XP went from '+x1+' to '+(await hudXp()));
    assert.ok(await tap('[data-action="undo"]'),'no undo offer'); await settle();
    assert.strictEqual(await hudXp(),x1,'XP after undo');
    await tabTo('today');
    assert.strictEqual(await workoutLine(),'Logged: Strength','after undo the day reads '+(await workoutLine()));
  });

  await t('the quick log stays with the day whichever of its sessions goes first', async function(){
    clearToday(); await go(); await tabTo('today');
    await tap('[data-action="workout"][data-type="Conditioning"]'); await settle();
    var x1=await hudXp();
    await finishOne('Push'); await finishOne('Boxing/MMA technical');
    var ids=logIdsOn(todayK); assert.strictEqual(ids.length,2,'expected two logs, found '+ids.length);
    await go(); await tabTo('progress'); await delLog(ids[0]); await delLog(ids[1]);
    var d=seedOf().days[todayK];
    assert.ok(d.workout.done,'the quick-logged day was cleared');
    assert.strictEqual(d.workout.type,'Conditioning','the day reads '+d.workout.type);
    assert.strictEqual(await hudXp(),x1,'XP went from '+x1+' to '+(await hudXp()));
    await tap('[data-action="dismissundo"]'); await p.waitForTimeout(300);
  });

  await t('removing one of two sessions on a day names the day after the one left', async function(){
    clearToday(); await go(); var x0=await hudXp();
    await finishOne('Strength — functional full body'); await finishOne('Boxing/MMA technical');
    await go(); await tabTo('today');
    assert.strictEqual(await workoutLine(),'Logged: Boxing/MMA');
    var box=seedOf().workoutLogs.filter(function(l){ return l.date===todayK && l.tag==='Boxing/MMA'; })[0];
    assert.ok(box,'no Boxing log');
    await tabTo('progress'); await delLog(box.id); await tabTo('today');
    assert.strictEqual(await workoutLine(),'Logged: Strength','the day reads "'+(await workoutLine())+'"');
    assert.ok(await tap('[data-action="undo"]'),'no undo offer'); await settle();
    assert.strictEqual(await workoutLine(),'Logged: Boxing/MMA','after undo the day reads "'+(await workoutLine())+'"');
    var ids=logIdsOn(todayK); await tabTo('progress');
    for(var i=0;i<ids.length;i++) await delLog(ids[i]);
    assert.strictEqual(await hudXp(),x0,'XP did not come back to where it started');
    await tap('[data-action="dismissundo"]'); await p.waitForTimeout(300);
  });

  console.log('\nAN UNDO THAT WOULD PUT BACK SOMETHING ALREADY THERE');
  await t('an undo whose item is already back is not offered, and cannot duplicate it', async function(){
    await go(); await tabTo('progress');
    var id=seedOf().workoutLogs[0].id, x0=await hudXp();
    await delLog(id);
    var parked=await p.evaluate(function(){ return sessionStorage.getItem('fc.undo'); });
    assert.ok(parked,'nothing was parked');
    assert.ok(await tap('[data-action="undo"]'),'no undo offer'); await settle();
    // The same slot again, as a reload that restored the item leaves it.
    await p.evaluate(function(v){ sessionStorage.setItem('fc.undo',v); },parked);
    await go(); await tabTo('progress');
    var shown=!!(await p.$('.undo-bar'));
    if(await tap('[data-action="undo"]')) await settle();
    var n=seedOf().workoutLogs.filter(function(l){ return l.id===id; }).length;
    assert.strictEqual(n,1,'the log is there '+n+' times');
    assert.strictEqual(await hudXp(),x0,'XP was paid twice');
    assert.ok(!shown,'the undo bar offered to put back something already there');
  });


  console.log('\nEVERY ONE-TAP REMOVAL CAN BE UNDONE');
  var undoBack=async function(){
    assert.ok(await p.$('.undo-bar'),'no undo offer after the removal');
    assert.ok(await tap('[data-action="undo"]'),'no Undo button'); await settle();
    assert.strictEqual(await p.$('.undo-bar'),null,'the offer outlived its undo');
  };
  await t('the undo offer is a fixed toast, shown on the tab where the removal happened', async function(){
    await go(); await tabTo('training');
    var before=seedOf().library;
    assert.ok(before.length,'the seed has no library note to remove');
    await tap('[data-action="dellib"][data-id="'+before[0].id+'"]'); await settle();
    var pos=await p.evaluate(function(){ var b=document.querySelector('.undo-bar'); return b?getComputedStyle(b).position:''; });
    assert.strictEqual(pos,'fixed','the undo offer is '+(pos||'missing')+' on the Training tab');
    assert.strictEqual(seedOf().library.length,before.length-1,'the note was not removed');
    await undoBack();
    assert.deepStrictEqual(seedOf().library,before,'the library came back different');
  });

  var planSeed=function(){ setSeed(function(st){
    var r0=st.recipes[0].id, r1=st.recipes[1].id;
    st.plan=[{id:'pl1',recipeId:r0,date:todayK,slot:'lunch',portions:2},
             {id:'pl2',recipeId:r1,date:todayK,slot:'dinner',portions:1},
             {id:'pl3',recipeId:r0,date:todayK,slot:'dinner',portions:3}];
    st.shoppingChecked=[];
  }); };
  await t('deleting a recipe, and the meals planned from it, can be undone', async function(){
    planSeed(); await go(); await tabTo('meals');
    var st0=seedOf(), rid=st0.recipes[0].id;
    await tap('[data-action="delrecipe"][data-id="'+rid+'"]'); await settle();
    var st1=seedOf();
    assert.ok(!st1.recipes.some(function(r){return r.id===rid;}),'the recipe was not deleted');
    assert.strictEqual(st1.plan.length,1,'its planned meals were not taken with it');
    await undoBack();
    var st2=seedOf();
    assert.deepStrictEqual(st2.recipes,st0.recipes,'the recipes came back different');
    assert.deepStrictEqual(st2.plan,st0.plan,'the planned meals came back different');
  });
  await t('removing one planned meal can be undone', async function(){
    planSeed(); await go(); await tabTo('meals');
    var st0=seedOf();
    await tap('[data-action="delmeal"][data-id="pl2"]'); await settle();
    assert.strictEqual(seedOf().plan.length,2,'the meal was not removed');
    await undoBack();
    assert.deepStrictEqual(seedOf().plan,st0.plan,'the plan came back different');
  });
  await t('clearing the week, ticks and all, can be undone', async function(){
    planSeed(); await go(); await tabTo('meals');
    var box=await p.evaluate(function(){ var b=document.querySelector('[data-action="shopcheck"]'); return b?b.getAttribute('data-item'):null; });
    assert.ok(box,'no shopping row to tick');
    await tap('[data-action="shopcheck"][data-item="'+box.replace(/"/g,'\\"')+'"]'); await settle();
    var st0=seedOf();
    assert.ok(st0.shoppingChecked.length,'the tick did not save');
    await tap('[data-action="clearweek"]'); await settle();
    var st1=seedOf();
    assert.strictEqual(st1.plan.length,0,'the week was not cleared');
    assert.strictEqual(st1.shoppingChecked.length,0,'the ticks were not cleared');
    await undoBack();
    var st2=seedOf();
    assert.deepStrictEqual(st2.plan,st0.plan,'the plan came back different');
    assert.deepStrictEqual(st2.shoppingChecked,st0.shoppingChecked,'the ticks came back different');
  });

  var startLogged=async function(){
    await go(); await tabTo('training');
    await p.locator('[data-action="startworkout"]').first().click(); await p.waitForTimeout(500);
    await p.fill('input[id^="log-v-"]','5');
    await p.locator('[data-action="logset"]').first().click(); await settle();
  };
  await t('discarding a session in progress can be undone', async function(){
    await startLogged();
    var s0=seedOf().activeSession;
    assert.ok(s0,'no session in progress');
    await tap('[data-action="cancelsession"]'); await p.waitForTimeout(300);
    await tabTo('training');
    await tap('[data-action="discardsession"]'); await settle();
    assert.strictEqual(seedOf().activeSession,null,'the session was not discarded');
    await undoBack();
    assert.deepStrictEqual(seedOf().activeSession,s0,'the session came back different');
  });
  await t('removing an exercise, and its sets, from a session can be undone', async function(){
    var s0=seedOf().activeSession, first=s0.exIds[0];
    assert.ok((s0.logs[first]||[]).length,'the first slide has no set to lose');
    await go(); await tabTo('training'); await tap('[data-action="resumesession"]'); await p.waitForTimeout(400);
    await toFirst();
    await tap('[data-action="removeex"][data-id="'+first+'"]'); await settle();
    var s1=seedOf().activeSession;
    assert.ok(s1.exIds.indexOf(first)<0,'the exercise was not removed');
    await undoBack();
    assert.deepStrictEqual(seedOf().activeSession,s0,'the session came back different');
    await tap('[data-action="cancelsession"]'); await p.waitForTimeout(300);
    await tabTo('training'); await tap('[data-action="discardsession"]'); await settle();
    await tap('[data-action="dismissundo"]'); await p.waitForTimeout(300);
  });
  await t('removing a slide keeps the sets its exercise logged inside a superset', async function(){
    setSeed(function(st){
      st.activeSession={workoutId:'w_custom',startedAt:todayK,prep:1,
        exIds:['warmup','press_bench','ss1','cooldown'],
        supersets:{ss1:{ex:['press_bench'],rounds:2}},
        targets:{warmup:{sets:1,reps:'5-10 min'},press_bench:{sets:3,reps:'8'},ss1:{sets:3,reps:'rounds'},cooldown:{sets:1,reps:'5-10 min'}},
        logs:{press_bench:[{v:10,w:60},{v:9,w:60}]}};
    });
    await go(); await tabTo('training');
    await tap('[data-action="resumesession"]'); await p.waitForTimeout(400);
    await toFirst(); await tap('[data-action="nextslide"]'); await p.waitForTimeout(200);
    await tap('[data-action="removeex"][data-id="press_bench"]'); await settle();
    var s=seedOf().activeSession;
    assert.ok(s.exIds.indexOf('press_bench')<0,'the slide was not removed');
    assert.strictEqual((s.logs.press_bench||[]).length,2,'the superset rounds lost their bench sets');
    await tap('[data-action="cancelsession"]'); await p.waitForTimeout(300);
    await tabTo('training'); await tap('[data-action="discardsession"]'); await settle();
    await tap('[data-action="dismissundo"]'); await p.waitForTimeout(300);
  });

  console.log('\nA SUPERSET TAKES BACK ONLY WHAT ITS ROUNDS LOGGED');
  var T0=Date.now()-600000;
  var ssSeed=function(exIds,box,logs,targets){ setSeed(function(st){
    var tg={warmup:{sets:1,reps:'5-10 min'},cooldown:{sets:1,reps:'5-10 min'},ss1:{sets:3,reps:'rounds'}};
    Object.keys(targets||{}).forEach(function(k){ tg[k]=targets[k]; });
    st.activeSession={workoutId:'w_custom',startedAt:todayK,t0:T0,prep:1,exIds:exIds,
      supersets:box?{ss1:box}:{},targets:tg,logs:logs||{}};
  }); };
  var toSlideN=async function(n){ await toFirst(); for(var k=0;k<n;k++){ await tap('[data-action="nextslide"]'); await p.waitForTimeout(150); } };
  var resume=async function(n){ await go(); await tabTo('training');
    await tap('[data-action="resumesession"]'); await p.waitForTimeout(400); await toSlideN(n); };
  var endIt=async function(){ await tap('[data-action="cancelsession"]'); await p.waitForTimeout(300);
    await tabTo('training'); await tap('[data-action="discardsession"]'); await settle();
    await tap('[data-action="dismissundo"]'); await p.waitForTimeout(300); };
  var sets=function(m){ return ((seedOf().activeSession.logs||{})[m]||[]).map(function(x){ return x.w+'x'+x.v; }); };
  var box1=function(){ return seedOf().activeSession.supersets.ss1; };
  var SQ={sq_back:{sets:3,reps:'5'}};
  var roundThenOwn=async function(){
    ssSeed(['warmup','ss1','sq_back','cooldown'],{ex:['sq_back'],rounds:0},{},SQ);
    await resume(1);
    await p.fill('#log-w-sq_back','100'); await p.fill('#log-v-sq_back','5');
    await tap('[data-action="loground"]'); await settle();
    await toSlideN(2);
    await p.fill('#log-w-sq_back','120'); await p.fill('#log-v-sq_back','3');
    await tap('[data-action="logset"]'); await settle();
    assert.deepStrictEqual(sets('sq_back'),['100x5','120x3'],'the two sets did not log');
    await toSlideN(1);
  };
  await t('a superset row Undo takes back the round set, not one logged on the exercise own slide', async function(){
    await roundThenOwn();
    assert.ok(await tap('[data-action="undoset"][data-ss="ss1"][data-ex="sq_back"]'),'no Undo on the superset row'); await settle();
    assert.deepStrictEqual(sets('sq_back'),['120x3'],'the own-slide set was taken');
    assert.strictEqual(box1().rounds,0,'the round still counts');
    assert.deepStrictEqual(box1().roundLog,[],'the round is still logged');
    await endIt();
  });
  await t('Undo round takes back that round set, not one logged on the exercise own slide', async function(){
    await roundThenOwn();
    assert.ok(await tap('[data-action="undoround"]'),'no Undo round'); await settle();
    assert.deepStrictEqual(sets('sq_back'),['120x3'],'the own-slide set was taken');
    assert.strictEqual(box1().rounds,0,'the round still counts');
    await endIt();
  });
  await t('Log round with a typo in one box logs nothing and points at the typo', async function(){
    ssSeed(['warmup','ss1','cooldown'],{ex:['sq_back','dl_rdl'],rounds:0},{},{sq_back:{sets:3,reps:'5'},dl_rdl:{sets:3,reps:'8'}});
    await resume(1);
    await p.fill('#log-w-sq_back','100'); await p.fill('#log-v-sq_back','5');
    await p.fill('#log-w-dl_rdl','60'); await p.fill('#log-v-dl_rdl','8o');
    await tap('[data-action="loground"]'); await p.waitForTimeout(150);
    var f=await p.evaluate(function(){ var a=document.activeElement; return a?a.id+'|'+a.getAttribute('aria-invalid'):''; });
    await settle();
    assert.strictEqual(f,'log-v-dl_rdl|true','focus is on '+f);
    var s=seedOf().activeSession;
    assert.deepStrictEqual(s.logs,{},'sets were logged: '+JSON.stringify(s.logs));
    assert.strictEqual(s.supersets.ss1.rounds||0,0,'the round counted');
    await endIt();
  });
  await t('removing a superset takes its sets with it, and Undo puts them back', async function(){
    var lg={press_bench:[{v:8,w:60,t:T0+1000,ss:'ss1'}],row_bent:[{v:10,w:50,t:T0+1001,ss:'ss1'}]};
    ssSeed(['warmup','ss1','cooldown'],{ex:['press_bench','row_bent'],rounds:1,roundLog:[['press_bench','row_bent']]},lg);
    var s0=seedOf().activeSession;
    await resume(1);
    await tap('[data-action="removeex"][data-id="ss1"]'); await settle();
    var s=seedOf().activeSession;
    assert.deepStrictEqual(s.logs,{},'hidden sets would be saved on Finish: '+JSON.stringify(s.logs));
    await undoBack();
    assert.deepStrictEqual(seedOf().activeSession,s0,'the session came back different');
    await endIt();
  });
  await t('taking an exercise out of a superset gives its round sets a slide of their own', async function(){
    var lg={press_bench:[{v:8,w:60,t:T0+1000,ss:'ss1'}],row_bent:[{v:10,w:50,t:T0+1001,ss:'ss1'}]};
    ssSeed(['warmup','ss1','cooldown'],{ex:['press_bench','row_bent'],rounds:1,roundLog:[['press_bench','row_bent']]},lg);
    await resume(1);
    await tap('[data-action="ssdel"][data-ex="row_bent"]'); await settle();
    var s=seedOf().activeSession;
    assert.ok(s.exIds.indexOf('row_bent')>-1,'its sets are out of sight: '+s.exIds.join(','));
    assert.deepStrictEqual(sets('row_bent'),['50x10'],'its set was lost');
    assert.deepStrictEqual(s.supersets.ss1.roundLog,[['press_bench']],'it is still in the round');
    assert.strictEqual(await p.evaluate(function(){ var h=document.querySelector('.slide h4'); return h&&h.textContent.trim(); }),'Superset','it left the superset slide');
    await endIt();
  });
  await t('Undo on an exercise own slide takes it out of the round that logged the set', async function(){
    var lg={press_bench:[{v:8,w:60,t:T0+1000,ss:'ss1'},{v:8,w:60,t:T0+3000,ss:'ss1'}],dip:[{v:10,w:null,t:T0+1001,ss:'ss1'}]};
    ssSeed(['warmup','press_bench','ss1','cooldown'],{ex:['press_bench','dip'],rounds:2,roundLog:[['press_bench','dip'],['press_bench']]},lg,
      {press_bench:{sets:3,reps:'8'}});
    await resume(1);
    for(var k=0;k<2;k++){ assert.ok(await tap('[data-action="undoset"][data-ex="press_bench"]'),'no Undo on the bench slide'); await settle(); }
    assert.deepStrictEqual(sets('press_bench'),[],'bench sets are left');
    assert.deepStrictEqual(box1().roundLog,[['dip']],'the rounds still hold bench');
    assert.strictEqual(box1().rounds,1,'the round of bench alone still counts');
    await toSlideN(2);
    assert.ok(/1 done/.test(await p.evaluate(function(){ return document.querySelector('.slide .target').textContent; })),'the superset count is wrong');
    await endIt();
  });
  await t('a round logged before round sets were tagged still undoes the way it did', async function(){
    ssSeed(['warmup','ss1','cooldown'],{ex:['press_bench'],rounds:1,roundLog:[['press_bench']]},{press_bench:[{v:8,w:60,t:T0+1000}]});
    await resume(1);
    assert.ok(await tap('[data-action="undoround"]'),'no Undo round'); await settle();
    assert.deepStrictEqual(sets('press_bench'),[],'the old round left its set');
    assert.strictEqual(box1().rounds,0,'the round still counts');
    await endIt();
  });
  await t('a superset added after one was removed gets a new id, and the removal can still be undone', async function(){
    ssSeed(['warmup','ss1','cooldown'],{ex:['press_bench'],rounds:0});
    await resume(1);
    await tap('[data-action="removeex"][data-id="ss1"]'); await settle();
    await tap('[data-action="openpicker"]'); await p.waitForTimeout(300);
    await p.fill('#ex-search','superset'); await p.waitForTimeout(400);
    assert.ok(await tap('[data-action="addex"][data-id="superset"]'),'no Superset in the picker'); await settle();
    var s=seedOf().activeSession;
    assert.ok(s.exIds.indexOf('ss2')>-1 && s.exIds.indexOf('ss1')<0,'the new superset is '+s.exIds.join(','));
    await undoBack();
    s=seedOf().activeSession;
    assert.ok(s.exIds.indexOf('ss1')>-1 && s.supersets.ss1 && s.supersets.ss1.ex[0]==='press_bench','the removed superset did not come back');
    await endIt();
  });

  console.log(errs.length?('  FAIL  page errors: '+errs.join(' | ')):'  PASS  no page errors');
  await b.close(); srv.close();
  console.log(fails||errs.length?'\nFAILING\n':'\nAll removal checks pass.\n');
  process.exit(fails||errs.length?1:0);
});
