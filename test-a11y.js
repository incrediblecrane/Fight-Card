// What a screen reader and a keyboard meet: names, headings, the tab order and
// the live status, read from the browser's accessibility tree (Playwright's
// ariaSnapshot) at phone width, not from the markup.
//
// Runs in local mode (no window.claude), so nothing is saved; each world is a
// seed edited before the load.
//
// Usage: node test-a11y.js   (expects the published document from build-publish.js)
var http=require('http'), assert=require('assert');
var env=require('./test-env.js');
var doc=env.readDoc();

function key(o){ var d=new Date(); d.setDate(d.getDate()-(o||0));
  var q=function(n){return String(n).padStart(2,'0');};
  return d.getFullYear()+'-'+q(d.getMonth()+1)+'-'+q(d.getDate()); }
function withSeed(fn){ var st=env.seedOf(doc); fn(st); return env.withSeed(doc,st); }
var NOW=Date.now();
var WORLDS={
  plain: withSeed(function(st){ st.activeSession=null; }),
  meal: withSeed(function(st){ st.activeSession=null;
    st.plan=[{id:'pl-d1', recipeId:st.recipes[0].id, date:key(0), slot:'dinner', portions:2}]; }),
  // Bench press and bent-over row in one superset, a round logged.
  ss: withSeed(function(st){
    st.activeSession={workoutId:'w6', startedAt:key(0), t0:NOW-600000, exIds:['warmup','ss1','cooldown'],
      targets:{warmup:{sets:1,reps:'5-10 min'},ss1:{sets:3,reps:'rounds'},cooldown:{sets:1,reps:'5-10 min'}},
      supersets:{ss1:{ex:['press_bench','row_bent'],rounds:1,roundLog:[['press_bench','row_bent']]}},
      logs:{press_bench:[{v:8,w:60,t:NOW-30000}],row_bent:[{v:10,w:50,t:NOW-20000}]}}; })
};
var UI={plain:'{"tab":"today"}', meal:'{"tab":"meals"}', ss:'{"tab":"today","viewingSession":true,"slide":1}'};

var srv=http.createServer(function(q,r){
  var w=(q.url.match(/^\/(\w+)/)||[])[1]; var d=WORLDS[w]||WORLDS.plain;
  r.setHeader('content-type','text/html; charset=utf-8');
  r.end(d.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,''));
});

srv.listen(0,async function(){
  var base='http://127.0.0.1:'+srv.address().port+'/';
  var b=await env.launch();
  var fails=0, n=0;
  var t=async function(name,fn){ if(process.env.FC_ONLY && name.indexOf(process.env.FC_ONLY)<0) return; n++; try{ await fn(); console.log('  PASS  '+name); }
    catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } };
  var open=async function(world,o){
    o=o||{};
    var ctx=await b.newContext({viewport:{width:390,height:844}, hasTouch:!!o.touch, isMobile:!!o.touch});
    await ctx.addInitScript(function(u){ try{ localStorage.setItem('fc.ui',u); }catch(e){} }, o.ui||UI[world]||'{}');
    var p=await ctx.newPage(); p.setDefaultTimeout(6000);
    p.__errs=[]; p.on('pageerror',function(e){ p.__errs.push(e.message); });
    await p.goto(base+world); await p.waitForTimeout(300);
    return p;
  };
  var close=async function(p){ var e=p.__errs; await p.context().close(); assert.deepStrictEqual(e,[],'page errors: '+e.join(' | ')); };
  // Controls in the tree with no name at all: "- combobox:" or "- textbox:".
  var unnamed=function(snap){ return snap.split('\n').filter(function(l){ return /^\s*- (combobox|textbox|button|checkbox)(:|$)/.test(l); }); };
  // What Tab would reach: focusable, not taken out with tabindex=-1, and drawn.
  var tabbable=function(p){ return p.evaluate(function(){
    return [].slice.call(document.querySelectorAll('#app button,#app input,#app select,#app textarea,#app [tabindex]')).filter(function(el){
      if(el.disabled || el.tabIndex<0) return false;
      var c=getComputedStyle(el); return c.visibility!=='hidden' && c.display!=='none' && el.getClientRects().length>0;
    }).map(function(el){ return {cls:el.className, label:el.getAttribute('aria-label')||'', text:el.textContent.trim(), hidden:!!el.closest('[aria-hidden="true"]')}; }); }); };

  console.log('\nTHE SAVING PILL');
  await t('idle, the saving pill says nothing: no "saving" status in the tree, and it lives outside #app', async function(){
    var p=await open('plain');
    var snap=await p.locator('body').ariaSnapshot();
    var r=await p.evaluate(function(){ var el=document.getElementById('savepill');
      return {text:el.textContent, inApp:!!el.closest('#app'), role:el.getAttribute('role')}; });
    await close(p);
    assert.ok(!/saving/i.test(snap),'the idle page reads a saving status:\n'+snap.split('\n').filter(function(l){ return /saving/i.test(l); }).join('\n'));
    assert.strictEqual(r.text,'','the idle pill holds "'+r.text+'"');
    assert.strictEqual(r.inApp,false,'the pill is inside #app, so every render rebuilds it');
    assert.strictEqual(r.role,'status');
  });

  console.log('\nNAMES');
  await t('Today has no unnamed field, and the sauna boxes say what they are', async function(){
    var p=await open('plain');
    var snap=await p.locator('#app').ariaSnapshot();
    await close(p);
    assert.deepStrictEqual(unnamed(snap),[],'unnamed controls on Today');
    assert.ok(/combobox "Bench position"/.test(snap),'the bench select reads:\n'+snap.split('\n').filter(function(l){ return /combobox/.test(l); }).join('\n'));
    assert.ok(/textbox "Minutes"/.test(snap) && /textbox "Temperature °C"/.test(snap),'the sauna boxes are not named Minutes and Temperature');
  });
  await t('with a pointer, Progress has no bare "Remove" in the tree or the tab order, and Tab shows the × it lands on', async function(){
    var p=await open('plain',{ui:'{"tab":"progress"}'});
    var snap=await p.locator('#app').ariaSnapshot();
    var tab=await tabbable(p);
    var removes=tab.filter(function(x){ return /swipe/.test(x.cls); });
    // Tab from the field before the first history row lands on its ×.
    await p.evaluate(function(){ var r=document.querySelector('.swipe'); var x=r.querySelector('.swipe-x');
      var all=[].slice.call(document.querySelectorAll('#app button,#app input,#app select,#app [tabindex]')).filter(function(e){ return e.tabIndex>=0; });
      var i=all.indexOf(x); all[i-1].focus(); });
    await p.keyboard.press('Tab'); await p.waitForTimeout(300);
    var x=await p.evaluate(function(){ var a=document.activeElement; return {cls:a.className, op:getComputedStyle(a).opacity, label:a.getAttribute('aria-label')}; });
    await close(p);
    assert.ok(!/button "Remove"(:|$)/m.test(snap),'a bare Remove is read:\n'+snap.split('\n').filter(function(l){ return /Remove/.test(l); }).join('\n'));
    assert.ok(removes.length>=6,'only '+removes.length+' row removes in the tab order');
    removes.forEach(function(r){
      assert.ok(/swipe-x/.test(r.cls),'a closed row\'s hidden Remove is in the tab order: '+r.cls);
      assert.ok(/^Remove .+, .+/.test(r.label),'a remove in the tab order is named "'+r.label+'"'); });
    assert.ok(/swipe-x/.test(x.cls),'Tab landed on '+x.cls);
    assert.strictEqual(x.op,'1','the × Tab landed on is not drawn');
    assert.ok(/^Remove (sauna|.+), /.test(x.label),'it is named "'+x.label+'"');
  });
  await t('on touch, each history row has one Remove a screen reader reaches, named for its row', async function(){
    var p=await open('plain',{ui:'{"tab":"progress"}',touch:true});
    var snap=await p.locator('#app').ariaSnapshot();
    var tab=(await tabbable(p)).filter(function(x){ return /swipe/.test(x.cls); });
    await close(p);
    var rows=snap.split('\n').filter(function(l){ return /button "Remove/.test(l); });
    assert.ok(rows.length>=6 && rows.every(function(l){ return /button "Remove .+, .+"/.test(l); }),'the removes read:\n'+rows.join('\n'));
    assert.ok(tab.length===rows.length && tab.every(function(x){ return /swipe-del/.test(x.cls) && !x.hidden; }),'touch tab order: '+JSON.stringify(tab.slice(0,2)));
  });
  await t('a superset slide names every box and button for its exercise', async function(){
    var p=await open('ss');
    var snap=await p.locator('.slide').ariaSnapshot();
    await close(p);
    assert.deepStrictEqual(unnamed(snap),[],'unnamed controls on the superset slide');
    ['textbox "Bench press weight, kg"','textbox "Bench press reps"','button "Undo last Bench press set"',
     'textbox "Bent-over row weight, kg"','textbox "Bent-over row reps"','button "Undo last Bent-over row set"',
     'combobox "Add an exercise to this superset"'].forEach(function(s){
      assert.ok(snap.indexOf(s)>-1,'no '+s+' in:\n'+snap); });
    assert.ok(!/(textbox "(kg|reps)"|button "(Undo|Add)")/.test(snap),'a context-free name is left:\n'+snap);
  });
  await t('the exercise picker names each Add, and its rows open from the keyboard and say whether they are open', async function(){
    var p=await open('ss');
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(200);
    var snap=await p.locator('#app').ariaSnapshot();
    var row=p.locator('.pickrow-main').first(), id=await row.getAttribute('data-id'), exp0=await row.getAttribute('aria-expanded');
    await row.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
    var after=await p.evaluate(function(id){ var el=document.querySelector('.pickrow-main[data-id="'+id+'"]');
      return {exp:el.getAttribute('aria-expanded'), focused:document.activeElement===el, preview:!!el.closest('.pickrow').querySelector('.pickpreview')}; },id);
    await close(p);
    assert.ok(!/button "Add"(:|$)/m.test(snap),'a bare Add is read');
    assert.ok(/button "Add Bench press"|button "Add [A-Z][^"]+": Add/.test(snap),'the Adds read:\n'+snap.split('\n').filter(function(l){ return /Add/.test(l); }).slice(0,4).join('\n'));
    assert.ok(/- button "[^"]+ preview"/.test(snap) && exp0==='false','a picker row is not a button that says it is closed ('+exp0+'):\n'+snap.split('\n').slice(0,30).join('\n'));
    assert.deepStrictEqual(after,{exp:'true',focused:true,preview:true},'Enter on a picker row');
  });

  console.log('\nHEADINGS');
  await t('Meals has level-2 section headings, recipes under them at level 3, and named plan selects', async function(){
    var p=await open('meal');
    var snap=await p.locator('#app').ariaSnapshot();
    await close(p);
    ['The week','Shopping list','Recipes','Meal prep'].forEach(function(h){
      assert.ok(snap.indexOf('heading "'+h+'" [level=2]')>-1,'no level-2 '+h+' in:\n'+snap.split('\n').filter(function(l){ return /heading/.test(l); }).join('\n')); });
    assert.ok(/heading "[^"]+" \[level=3\]/.test(snap),'no recipe at level 3');
    assert.ok(!/\[level=4\]/.test(snap),'Meals still jumps to level 4');
    assert.ok(/combobox "Day for [^"]+"/.test(snap) && /combobox "Meal slot for [^"]+"/.test(snap),'the plan selects read:\n'+snap.split('\n').filter(function(l){ return /combobox/.test(l); }).join('\n'));
    assert.deepStrictEqual(unnamed(snap),[],'unnamed controls on Meals');
  });
  for(var tb of ['progress','training']) await (function(tb){ return t(tb+' goes h1, h2, h3 with no level skipped', async function(){
    var p=await open('plain',{ui:'{"tab":"'+tb+'","open":["press_bench"]}'});
    var lv=await p.evaluate(function(){ return [].slice.call(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(function(h){ return +h.tagName[1]; }); });
    var snap=await p.locator('#app').ariaSnapshot();
    await close(p);
    var skip=[]; for(var i=1;i<lv.length;i++) if(lv[i]>lv[i-1]+1) skip.push(lv[i-1]+'->'+lv[i]);
    assert.deepStrictEqual(skip,[],'heading levels: '+lv.join(','));
    assert.ok(lv.indexOf(2)>-1 && lv.indexOf(3)>-1,'levels '+lv.join(','));
    assert.deepStrictEqual(unnamed(snap),[],'unnamed controls on '+tb);
  }); })(tb);

  await b.close(); srv.close();
  console.log('\n'+(n-fails)+'/'+n+' passed');
  process.exit(fails?1:0);
});
