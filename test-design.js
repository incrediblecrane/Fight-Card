// Design checks that only a rendered page can answer: computed colours and
// contrast, tap target sizes, what touch can reach, and layout at phone width.
// A CSS rule in the source proves nothing until the browser has applied it, so
// every check here reads getComputedStyle or a bounding box.
//
// Runs in local mode (no window.claude), so nothing is saved and no tap
// reloads the page; each world is a seed edited before the load.
//
// Usage: node test-design.js   (expects the published document from build-publish.js)
var http=require('http'), assert=require('assert');
var env=require('./test-env.js');
// The sauna card is a Log sauna button until it is opened (and stays open).
async function openSauna(q){ var b=await q.$('[data-action="toggleex"][data-id="sauna"][aria-expanded="false"]'); if(b){ await b.click(); await q.waitForSelector('#sauna-mins'); } }
var doc=env.readDoc();

// The worlds are dated here, before any page loads, so every page runs in the
// zone this clock reads: a page in another zone has a different today, and the
// meal planned for today lands on its tomorrow.
var ZONE=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
function key(o){ var d=new Date(); d.setDate(d.getDate()-(o||0));
  var q=function(n){return String(n).padStart(2,'0');};
  return d.getFullYear()+'-'+q(d.getMonth()+1)+'-'+q(d.getDate()); }
function withSeed(fn){
  var st=env.seedOf(doc); fn(st);
  return env.withSeed(doc,st);
}
var WORLDS={
  plain: withSeed(function(st){ st.activeSession=null; }),
  // A planned meal today, so the portion stepper and its delete sit side by side.
  meal: withSeed(function(st){ st.activeSession=null;
    st.plan=[{id:'pl-d1', recipeId:st.recipes[0].id, date:key(0), slot:'dinner', portions:2},
             {id:'pl-b1', recipeId:st.recipes[0].id, date:key(0), slot:'breakfast', portions:1}]; }),
  // Push press has a front view, so its slide draws the side and front pair.
  // A logged warm-up and a third slide give the story bar a done, a now and a
  // not-yet segment.
  press: withSeed(function(st){
    st.activeSession={workoutId:'w6', startedAt:key(0), exIds:['warmup','press_push','cooldown'],
      targets:{warmup:{sets:1,reps:'5-10 min'},press_push:{sets:3,reps:'8'},cooldown:{sets:1,reps:'5-10 min'}},
      logs:{warmup:[{v:6,w:null,opt:'Bike',lvl:'',lvlKind:'resistance'}]}}; })
};
// The seed's history moved so its newest day is yesterday: the charts, the
// rows and the weekly count then have something in range to draw.
function recent(st){
  var all=Object.keys(st.days).concat(st.workoutLogs.map(function(l){ return l.date; }),st.saunaSessions.map(function(x){ return x.date; })).sort();
  var n=Math.round((new Date(key(1)+'T12:00:00')-new Date(all[all.length-1]+'T12:00:00'))/86400000);
  var mv=function(k){ var d=new Date(k+'T12:00:00'); d.setDate(d.getDate()+n);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  var days={}; Object.keys(st.days).forEach(function(k){ days[mv(k)]=st.days[k]; }); st.days=days;
  st.workoutLogs.forEach(function(l){ l.date=mv(l.date); }); st.saunaSessions.forEach(function(x){ x.date=mv(x.date); });
}
var NOW=Date.now();
WORLDS.recent=withSeed(function(st){ st.activeSession=null; recent(st); st.weekTarget=3; });
WORLDS.empty=withSeed(function(st){ st.activeSession=null; st.days={}; st.workoutLogs=[]; st.saunaSessions=[]; st.totalXp=0; });
// A bench press with history, one set logged a moment ago: last time, the
// prefill, the rest clock and the set chips all show.
WORLDS.bench=withSeed(function(st){ recent(st);
  st.activeSession={workoutId:'w6', startedAt:key(0), t0:NOW-600000, exIds:['warmup','press_bench','cooldown'],
    targets:{warmup:{sets:1,reps:'5-10 min'},press_bench:{sets:4,reps:'8'},cooldown:{sets:1,reps:'5-10 min'}},
    logs:{press_bench:[{v:8,w:60,t:NOW-20000}]}}; });
// The same with nothing logged yet, so the first set can be logged on it.
WORLDS.bench0=withSeed(function(st){ recent(st);
  st.activeSession={workoutId:'w6', startedAt:key(0), t0:NOW-600000, exIds:['warmup','press_bench','cooldown'],
    targets:{warmup:{sets:1,reps:'5-10 min'},press_bench:{sets:4,reps:'8'},cooldown:{sets:1,reps:'5-10 min'}}, logs:{}}; });
WORLDS.ss=withSeed(function(st){ recent(st);
  st.activeSession={workoutId:'w6', startedAt:key(0), t0:NOW-600000, exIds:['warmup','ss1','cooldown'],
    targets:{warmup:{sets:1,reps:'5-10 min'},ss1:{sets:3,reps:'rounds'},cooldown:{sets:1,reps:'5-10 min'}},
    supersets:{ss1:{ex:['press_bench','row_bent'],rounds:1,roundLog:[['press_bench','row_bent']]}},
    logs:{press_bench:[{v:8,w:60,t:NOW-30000}],row_bent:[{v:10,w:50,t:NOW-20000}]}}; });
// Every set of the last bench session hit the top of the range, so the line
// says to add weight.
WORLDS.benchtop=withSeed(function(st){ recent(st);
  st.workoutLogs.forEach(function(l){ if(l.logs.press_bench) l.logs.press_bench=[{v:8,w:60},{v:8,w:60},{v:8,w:60},{v:8,w:60}]; });
  st.activeSession={workoutId:'w6', startedAt:key(0), t0:NOW-600000, exIds:['warmup','press_bench','cooldown'],
    targets:{warmup:{sets:1,reps:'5-10 min'},press_bench:{sets:4,reps:'8'},cooldown:{sets:1,reps:'5-10 min'}}, logs:{}}; });
// A bicep curl slide, last done at 41kg a dumbbell, short of the top on the last set.
WORLDS.curl=withSeed(function(st){
  st.activeSession={workoutId:'w7', startedAt:key(0), t0:NOW-600000, exIds:['warmup','curl_bicep','cooldown'],
    targets:{warmup:{sets:1,reps:'5-10 min'},curl_bicep:{sets:3,reps:'12'},cooldown:{sets:1,reps:'5-10 min'}}, logs:{}}; });
// 45 sauna visits over the last 90 days: more than the chart used to keep.
WORLDS.sauna=withSeed(function(st){ st.activeSession=null; st.saunaSessions=[];
  for(var i=1;i<=45;i++) st.saunaSessions.push({date:key(i*2-1), mins:15, temp:80, position:'Top', id:'sa-t'+i}); });
var UI={benchtop:'{"tab":"today","viewingSession":true,"slide":1}', sauna:'{"tab":"progress"}', plain:'{"tab":"today"}', meal:'{"tab":"meals"}', recent:'{"tab":"progress"}', empty:'{"tab":"progress"}',
  press:'{"tab":"today","viewingSession":true,"slide":1}', bench:'{"tab":"today","viewingSession":true,"slide":1}',
  bench0:'{"tab":"today","viewingSession":true,"slide":1}', ss:'{"tab":"today","viewingSession":true,"slide":1}'};
UI.curl='{"tab":"today","viewingSession":true,"slide":1}';
// Three hundred bench sessions over three years, the history open.
WORLDS.years=withSeed(function(st){ st.activeSession=null; st.workoutLogs=[];
  for(var i=0;i<300;i++) st.workoutLogs.push({id:'wl-y'+i, workoutId:'w6', title:'Push', tag:'Strength', date:key(1+Math.floor(i*3.6)),
    logs:{press_bench:[{v:8,w:40+(i%50),t:1000+i},{v:6,w:30+(i%50),t:2000+i}]}}); });
UI.years='{"tab":"progress","open":["press_bench"]}';
// A bench press done with no weight on some days and with one on others, and
// air squats going 12, 14, 13: what the exercise charts say about each.
WORLDS.mixed=withSeed(function(st){ st.activeSession=null; st.workoutLogs=[];
  [[{v:15,w:null}],[{v:12,w:5}],[{v:20,w:null}],[{v:10,w:7.5}]].forEach(function(s,i){
    st.workoutLogs.push({id:'wl-m'+i, workoutId:'w6', title:'Push', tag:'Strength', date:key(8-i*2), logs:{press_bench:s}}); });
  [[12],[14],[13]].forEach(function(v,i){
    st.workoutLogs.push({id:'wl-q'+i, workoutId:'w6', title:'Legs', tag:'Strength', date:key(7-i*2), logs:{sq_air:[{v:v[0],w:null}]}}); }); });
UI.mixed='{"tab":"progress","open":["press_bench","sq_air"]}';
// Hammer curls on two days, 10kg then 12kg a dumbbell.
WORLDS.dbchart=withSeed(function(st){ st.activeSession=null; st.workoutLogs=[];
  [10,12].forEach(function(w,i){
    st.workoutLogs.push({id:'wl-h'+i, workoutId:'w7', title:'Pull', tag:'Strength', date:key(6-i*2), logs:{curl_hammer:[{v:10,w:w}]}}); }); });
UI.dbchart='{"tab":"progress","open":["curl_hammer"]}';
// The same bench press with just one weighted session among the bodyweight ones.
WORLDS.mixed1=withSeed(function(st){ st.activeSession=null; st.workoutLogs=[];
  [[{v:15,w:null}],[{v:12,w:5}],[{v:20,w:null}]].forEach(function(s,i){
    st.workoutLogs.push({id:'wl-m'+i, workoutId:'w6', title:'Push', tag:'Strength', date:key(6-i*2), logs:{press_bench:s}}); }); });
UI.mixed1='{"tab":"progress","open":["press_bench"]}';
// Double progression on the bench: 60kg for three sessions, the reps going
// 6, 8, 10, a warm-up at 40kg x 10 first.
WORLDS.reps=withSeed(function(st){ st.activeSession=null; st.workoutLogs=[];
  [[{v:10,w:40,wu:true},{v:6,w:60},{v:6,w:60}],[{v:8,w:60}],[{v:10,w:60},{v:9,w:60}]].forEach(function(s,i){
    st.workoutLogs.push({id:'wl-r'+i, workoutId:'w6', title:'Push', tag:'Strength', date:key(7-i*3), logs:{press_bench:s}}); }); });
UI.reps='{"tab":"progress","open":["press_bench"]}';
// Legs yesterday, Pull three days ago, Push five, the full body ten.
WORLDS.lately=withSeed(function(st){ st.activeSession=null; st.workoutLogs=[];
  [['w1',10],['w6',5],['w7',3],['w8',1]].forEach(function(x,i){
    st.workoutLogs.push({id:'wl-l'+i, workoutId:x[0], title:x[0], tag:'Strength', date:key(x[1]), logs:{}}); }); });
UI.lately='{"tab":"training"}';
// Five hundred clean days in a row, up to today.
function cleanDay(w){ return {water:w||0,workout:{done:false,type:null},rest:false,alcohol:0,smoking:0,weed:0,touched:true}; }
WORLDS.long=withSeed(function(st){ st.activeSession=null; st.days={}; for(var i=0;i<500;i++) st.days[key(i)]=cleanDay(); });
UI.long='{"tab":"today"}';
// A year of 2L days, and one day logged in 2015.
WORLDS.old=withSeed(function(st){ st.activeSession=null; st.days={'2015-06-01':cleanDay(8)}; for(var i=1;i<=365;i++) st.days[key(i)]=cleanDay(8); });
UI.old='{"tab":"progress"}';
// Two days before yesterday a rest day, three days before nothing logged,
// and today's water at the target and higher than any other day.
WORLDS.rest=withSeed(function(st){ recent(st);
  st.workoutLogs=st.workoutLogs.filter(function(l){ return l.date!==key(2) && l.date!==key(3); });
  delete st.days[key(3)]; st.days[key(2)]=cleanDay(); st.days[key(2)].rest=true;
  st.waterTarget=10; Object.keys(st.days).forEach(function(k){ st.days[k].water=Math.min(st.days[k].water||0,9); });
  st.days[key(0)]=cleanDay(10); });
UI.rest='{"tab":"progress"}';
// A note titled with a bare 77-character link, a recipe with a 66-letter
// name, both planned today, so no break opportunity anywhere in either title.
WORLDS.longword=withSeed(function(st){ st.activeSession=null;
  var url='https://example.com/'+new Array(58).join('a');
  st.library.push({id:'lib-long', tag:'Note', title:url, notes:url+' '+url});
  st.recipes[0].title='Supercalifragilisticexpialidociouschickenandricebowlwithextrasauce';
  st.plan=[{id:'pl-d1', recipeId:st.recipes[0].id, date:key(0), slot:'dinner', portions:2},
           {id:'pl-b1', recipeId:st.recipes[1].id, date:key(0), slot:'breakfast', portions:1}]; });
// This week: one session logged three days ago and yesterday ticked as
// trained from Today with no log behind it, against a target of three; and
// the same with two sessions two days ago, which is over it.
function wkWorld(more){ return withSeed(function(st){ st.activeSession=null; st.weekTarget=3; st.totalXp=4321;
  st.days={}; st.days[key(1)]=cleanDay(); st.days[key(1)].workout={done:true,type:'Strength'}; st.days[key(5)]=cleanDay();
  st.workoutLogs=[{id:'wl-w1', workoutId:'w6', title:'Push', tag:'Strength', date:key(3), logs:{press_bench:[{v:8,w:60}]}}];
  if(more) [1,2].forEach(function(i){ st.workoutLogs.push({id:'wl-w2'+i, workoutId:'w6', title:'Push', tag:'Strength', date:key(2), logs:{press_bench:[{v:8,w:60}]}}); }); }); }
WORLDS.wk=wkWorld(false); WORLDS.wkhit=wkWorld(true); UI.wk=UI.wkhit='{"tab":"today"}';
// A bench press, the last slide, with a warm-up and three of its four working
// sets logged; and a superset two rounds into three.
WORLDS.bench3=withSeed(function(st){ recent(st);
  st.activeSession={workoutId:'w6', startedAt:key(0), t0:NOW-600000, exIds:['warmup','cooldown','press_bench'],
    targets:{warmup:{sets:1,reps:'5-10 min'},cooldown:{sets:1,reps:'5-10 min'},press_bench:{sets:4,reps:'8'}},
    logs:{press_bench:[{v:10,w:40,wu:true,t:NOW-90000},{v:8,w:60,t:NOW-80000},{v:8,w:60,t:NOW-60000},{v:8,w:60,t:NOW-40000}]}}; });
WORLDS.ss2=withSeed(function(st){ recent(st);
  st.activeSession={workoutId:'w6', startedAt:key(0), t0:NOW-600000, exIds:['warmup','ss1','cooldown'],
    targets:{warmup:{sets:1,reps:'5-10 min'},ss1:{sets:3,reps:'rounds'},cooldown:{sets:1,reps:'5-10 min'}},
    supersets:{ss1:{ex:['press_bench','row_bent'],rounds:2,roundLog:[['press_bench','row_bent'],['press_bench','row_bent']]}},
    logs:{press_bench:[{v:8,w:60,t:NOW-90000},{v:8,w:60,t:NOW-30000}],row_bent:[{v:10,w:50,t:NOW-80000},{v:10,w:50,t:NOW-20000}]}}; });
UI.bench3='{"tab":"today","viewingSession":true,"slide":2}'; UI.ss2='{"tab":"today","viewingSession":true,"slide":1}';
// A runtime whose store answers null: the page cannot load and says so.
var NO_STORE='<script>window.claude={use:function(n){ return Promise.resolve(null); }};<\/script>';

var srv=http.createServer(function(q,r){
  var w=(q.url.match(/^\/(\w+)/)||[])[1]; var d=WORLDS[w]||WORLDS.plain;
  var out=d.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'');
  if(/[?&]nostore/.test(q.url)) out=out.replace('<head>','<head>'+NO_STORE);
  r.setHeader('content-type','text/html; charset=utf-8'); r.end(out);
});

// In-page helpers: WCAG contrast of an element's text against the first opaque
// background behind it.
var HELPERS=function(){
  function rgb(s){ var m=(s||'').match(/[\d.]+/g)||[]; return {r:+m[0],g:+m[1],b:+m[2],a:m[3]===undefined?1:+m[3]}; }
  function lum(c){ return [c.r,c.g,c.b].map(function(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); })
    .reduce(function(s,v,i){ return s+v*[0.2126,0.7152,0.0722][i]; },0); }
  function bgOf(el){ for(var e=el;e;e=e.parentElement){ var c=rgb(getComputedStyle(e).backgroundColor); if(c.a>0.5) return c; }
    return rgb(getComputedStyle(document.body).backgroundColor); }
  function ratio(a,b){ var x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  window.__contrast=function(el){ return ratio(rgb(getComputedStyle(el).color), bgOf(el)); };
  // The same, with the text's colour faded by every opacity on the way up, as
  // the eye sees it.
  window.__contrastSeen=function(el){ var a=1; for(var e=el;e;e=e.parentElement) a*=+getComputedStyle(e).opacity;
    var f=rgb(getComputedStyle(el).color), g=bgOf(el); a*=f.a;
    return ratio({r:f.r*a+g.r*(1-a),g:f.g*a+g.g*(1-a),b:f.b*a+g.b*(1-a)},g); };
  window.__borderContrast=function(el){ return ratio(rgb(getComputedStyle(el).borderTopColor), bgOf(el.parentElement)); };
};

srv.listen(0,async function(){
  var base='http://127.0.0.1:'+srv.address().port+'/';
  var b=await env.launch();
  var fails=0, n=0;
  var t=async function(name,fn){ if(process.env.FC_ONLY && name.indexOf(process.env.FC_ONLY)<0) return; n++; try{ await fn(); console.log('  PASS  '+name); }
    catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } };
  var open=async function(world,o){
    o=o||{};
    var ctx=await b.newContext({viewport:o.viewport||{width:390,height:844}, colorScheme:o.scheme||'light',
      hasTouch:!!o.touch, isMobile:!!o.touch, timezoneId:ZONE});
    var ui=o.ui||UI[world]||'{}';
    await ctx.addInitScript(function(u){ try{ localStorage.setItem('fc.ui',u); }catch(e){} }, ui);
    await ctx.addInitScript(HELPERS);
    var p=await ctx.newPage(); p.setDefaultTimeout(6000);
    p.__errs=[]; p.on('pageerror',function(e){ p.__errs.push(e.message); });
    await p.goto(base+world+(o.q||'')); await p.waitForTimeout(300);
    return p;
  };
  var close=async function(p){ var e=p.__errs; await p.context().close(); assert.deepStrictEqual(e,[],'page errors: '+e.join(' | ')); };

  console.log('\nTHEME: COLOR-SCHEME AND CONTRAST');
  await t('native controls follow the theme (color-scheme light, dark, and a forced light under a dark device)', async function(){
    var p=await open('plain',{scheme:'dark'});
    assert.strictEqual(await p.evaluate(function(){ return getComputedStyle(document.documentElement).colorScheme; }),'dark');
    await p.evaluate(function(){ document.documentElement.setAttribute('data-theme','light'); });
    assert.strictEqual(await p.evaluate(function(){ return getComputedStyle(document.documentElement).colorScheme; }),'light');
    await close(p);
    p=await open('plain',{scheme:'light'});
    assert.strictEqual(await p.evaluate(function(){ return getComputedStyle(document.documentElement).colorScheme; }),'light');
    await close(p);
  });
  for(var sch of ['light','dark']) await (function(sch){ return t('text on filled colour reads at 4.5:1 or better in '+sch+' (backfill bar, Log set, Remove, faint text)', async function(){
    var p=await open('plain',{scheme:sch});
    // Yesterday's dot puts the page into backfill mode, which shows the bar.
    await p.click('[data-action="pickday"][data-k="'+key(1)+'"]'); await p.waitForTimeout(150);
    var r={};
    r.backfill=await p.evaluate(function(){ return __contrast(document.querySelector('.backfill-bar span')); });
    r.backfillBtn=await p.evaluate(function(){ return __contrast(document.querySelector('.backfill-bar button')); });
    r.faint=await p.evaluate(function(){ return __contrast(document.querySelector('.card .sub')); });
    r.faintHud=await p.evaluate(function(){ return __contrast(document.querySelector('.streak .l')); });
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(150);
    r.remove=await p.evaluate(function(){ return __contrast(document.querySelector('.swipe-del')); });
    await close(p);
    p=await open('press',{scheme:sch});
    r.logset=await p.evaluate(function(){ return __contrast(document.querySelector('[data-action="logset"]')); });
    r.target=await p.evaluate(function(){ return __contrast(document.querySelector('.slide .target')); });
    await close(p);
    Object.keys(r).forEach(function(k){ assert.ok(r[k]>=4.5, k+' is '+r[k].toFixed(2)+':1 in '+sch); });
  }); })(sch);
  for(var sch2 of ['light','dark']) await (function(sch){ return t('input borders stand out at 3:1 from what they sit on in '+sch, async function(){
    var p=await open('meal',{scheme:sch});
    var r=await p.evaluate(function(){ return ['#shop-add','#rec-title','.recipe-controls select'].map(function(s){
      return [s,__borderContrast(document.querySelector(s))]; }); });
    await close(p);
    r.forEach(function(x){ assert.ok(x[1]>=3, x[0]+' border is '+x[1].toFixed(2)+':1 in '+sch); });
  }); })(sch2);

  console.log('\nTOUCH TARGETS');
  await t('frequent and destructive controls are big enough to hit on a 360px phone', async function(){
    var p=await open('meal',{viewport:{width:360,height:800},touch:true,ui:'{"tab":"today"}'});
    var sz=async function(sel){ return p.evaluate(function(s){ return [].slice.call(document.querySelectorAll(s)).map(function(e){
      var r=e.getBoundingClientRect(); return {s:s,w:Math.round(r.width),h:Math.round(r.height)}; }); }, sel); };
    var all=[];
    var need=function(list,w,h){ list.forEach(function(x){ x.need=[w,h]; all.push(x); }); };
    need(await sz('.stepper button'),44,44);
    need(await sz('.tab'),0,44);
    need(await sz('.pill'),0,44);
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(150);
    need(await sz('.mealrow .mp button'),44,44);
    need(await sz('.mealrow .mx'),44,44);
    need(await sz('.libitem .x'),44,44);
    need(await sz('.addplan'),0,44);
    need(await sz('.shoprange button'),0,44);
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(150);
    need(await sz('.rangebar button'),0,44);
    assert.ok(all.length>20,'only '+all.length+' controls measured, so this proves little');
    var small=all.filter(function(x){ return x.w<x.need[0] || x.h<x.need[1]; });
    assert.deepStrictEqual(small.map(function(x){ return x.s+' '+x.w+'x'+x.h; }).slice(0,8),[]);
    await close(p);
  });
  await t('a planned meal\'s delete sits at least 8px clear of its + button', async function(){
    var p=await open('meal',{viewport:{width:360,height:800}});
    var gap=await p.evaluate(function(){ var row=document.querySelector('.mealrow');
      return row.querySelector('.mx').getBoundingClientRect().left-row.querySelector('.mp').getBoundingClientRect().right; });
    await close(p);
    assert.ok(gap>=8,'gap is '+gap+'px');
  });
  for(var lw of [['training','a note'],['meals','a recipe and a planned meal']]) await (function(lw){ return t('a long unbroken word in '+lw[1]+' title wraps inside its card on a 360px phone', async function(){
    var p=await open('longword',{viewport:{width:360,height:740},touch:true,ui:'{"tab":"'+lw[0]+'"}'});
    var r=await p.evaluate(function(){ var W=document.documentElement.clientWidth;
      return {sw:document.documentElement.scrollWidth, W:W, off:[].map.call(document.querySelectorAll('.libitem .x,.mealrow .mx'),function(e){ return Math.round(e.getBoundingClientRect().right); }).filter(function(x){ return x>W; })}; });
    await close(p);
    assert.ok(r.sw<=r.W,'the page is '+r.sw+'px wide at '+r.W);
    assert.deepStrictEqual(r.off,[],'a delete sits off the right edge');
  }); })(lw);
  await t('planned meal titles keep their own line clear of the portion buttons on a 320px phone', async function(){
    var p=await open('longword',{viewport:{width:320,height:700},touch:true,ui:'{"tab":"meals"}'});
    var r=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('.mealrow'),function(row){
      var mt=row.querySelector('.mt'), m=mt.getBoundingClientRect(), b=row.querySelector('.mp button').getBoundingClientRect();
      return {sw:mt.scrollWidth, cw:mt.clientWidth, w:Math.round(m.width), clear:m.right<=b.left+0.5||m.bottom<=b.top+0.5}; }); });
    await close(p);
    assert.ok(r.length>=2,'only '+r.length+' planned meals drawn');
    r.forEach(function(x,i){ assert.ok(x.sw<=x.cw,'meal '+i+' title needs '+x.sw+'px of '+x.cw);
      assert.ok(x.w>=100,'meal '+i+' title is squeezed to '+x.w+'px');
      assert.ok(x.clear,'meal '+i+' title runs under the - button'); });
  });
  await t('each sauna stint\'s remove is a 44px target that never reaches into the next chip', async function(){
    var p=await open('plain',{viewport:{width:360,height:740},touch:true,ui:'{"tab":"today"}'});
    await openSauna(p); for(var i=0;i<5;i++){ await p.fill('#sauna-mins',String(10+i)); await p.click('[data-action="addstint"]'); await p.waitForTimeout(60); }
    var r=await p.evaluate(function(){ var chips=[].slice.call(document.querySelectorAll('.setchip')), xs=[].slice.call(document.querySelectorAll('.chipx')), bad=[], small=[];
      // Every point of each chip lands on that chip or its own x, never on another chip's x.
      chips.forEach(function(c,i){ var r=c.getBoundingClientRect();
        for(var x=r.left+1;x<r.right-1;x+=2) for(var y=r.top+1;y<r.bottom-1;y+=2){ var e=document.elementFromPoint(x,y);
          var j=xs.indexOf(e&&e.closest?e.closest('.chipx'):null); if(j>-1&&j!==i) bad.push(i+'>'+j); } });
      xs.forEach(function(x,i){ var hr=x.getBoundingClientRect(), a=getComputedStyle(x,'::after'), h=hr.height;
        if(a.content!=='none'&&a.position==='absolute') h=Math.max(h,hr.height-parseFloat(a.top)-parseFloat(a.bottom));
        if(h<44) small.push(i+': '+Math.round(h)); });
      return {n:chips.length, bad:bad.filter(function(v,i,a){ return a.indexOf(v)===i; }), small:small}; });
    await close(p);
    assert.strictEqual(r.n,5,'stints drawn: '+r.n);
    assert.deepStrictEqual(r.bad,[],'a tap on one chip lands on another chip\'s x');
    assert.deepStrictEqual(r.small,[],'stint x hit heights');
  });
  await t('every daily counter is on the first screen of a 390x844 phone, with sauna one button until it is wanted', async function(){
    var p=await open('plain',{viewport:{width:390,height:844},touch:true,ui:'{"tab":"today"}'});
    var r=await p.evaluate(function(){
      var bot=0; ['water','alcohol','smoking','weed'].forEach(function(a){ [].forEach.call(document.querySelectorAll('[data-action="'+a+'"]'),function(b){
        bot=Math.max(bot,b.getBoundingClientRect().bottom+window.scrollY); }); });
      var cards=[].map.call(document.querySelectorAll('.grid > .card h3'),function(h){ return h.textContent; });
      return {bot:Math.round(bot), h:window.innerHeight, steppers:document.querySelectorAll('.habits .stepper [data-action]').length, cards:cards,
        form:!!document.getElementById('sauna-mins'), open:!!document.querySelector('[data-action="toggleex"][data-id="sauna"][aria-expanded="false"]')}; });
    assert.ok(r.bot<=r.h,'the last counter button ends at y='+r.bot+', below the '+r.h+'px screen');
    assert.strictEqual(r.steppers,6,'the Habits card has '+r.steppers+' buttons');
    assert.deepStrictEqual(r.cards.slice(0,2),['Water','Habits'],'cards in order: '+r.cards.join(', '));
    assert.ok(!r.form && r.open,'the sauna form is drawn before it is asked for');
    await p.click('[data-action="toggleex"][data-id="sauna"]'); await p.waitForSelector('#sauna-mins');
    var ui=await p.evaluate(function(){ try{ return JSON.parse(localStorage.getItem('fc.ui')).open; }catch(e){ return null; } });
    assert.ok(ui && ui.indexOf('sauna')>-1,'opening the sauna form is not remembered: '+JSON.stringify(ui));
    await close(p);
    p=await open('plain',{viewport:{width:390,height:844},touch:true,ui:'{"tab":"today","open":["sauna"]}'});
    assert.ok(await p.$('#sauna-mins'),'the sauna form remembered open came back closed');
    await close(p);
  });
  await t('Start, the Workout link, Log sauna, the plan boxes and the day dots are 44px to a thumb at 390px', async function(){
    var all=[];
    var hit=async function(p,sel){ (await p.evaluate(function(s){ return [].map.call(document.querySelectorAll(s),function(e){
      var r=e.getBoundingClientRect(), w=r.width, h=r.height;
      ['::before','::after'].forEach(function(ps){ var a=getComputedStyle(e,ps); if(a.content!=='none'&&a.position==='absolute'){
        w=Math.max(w,r.width-parseFloat(a.left)-parseFloat(a.right)); h=Math.max(h,r.height-parseFloat(a.top)-parseFloat(a.bottom)); } });
      return {s:s,w:Math.round(w),h:Math.round(h)}; }); },sel)).forEach(function(x){ all.push(x); }); };
    var p=await open('plain',{viewport:{width:390,height:844},touch:true,ui:'{"tab":"today"}'});
    await hit(p,'.linklike'); await hit(p,'.logbtn'); await hit(p,'.datepick input'); await hit(p,'.dot.pickable');
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(150);
    await hit(p,'.wcard .start');
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(150);
    await hit(p,'.exrow .top');
    await close(p);
    p=await open('meal',{viewport:{width:390,height:844},touch:true}); await hit(p,'.recipe-controls select'); await close(p);
    ['.linklike','.logbtn','.datepick input','.dot.pickable','.wcard .start','.exrow .top','.recipe-controls select'].forEach(function(s){
      assert.ok(all.some(function(x){ return x.s===s; }),'nothing matched '+s); });
    var small=all.filter(function(x){ return x.h<44 || (x.s==='.dot.pickable'&&x.w<44); });
    assert.deepStrictEqual(small.map(function(x){ return x.s+' '+x.w+'x'+x.h; }).slice(0,8),[]);
  });
  await t('Log set is the biggest button on the slide and Next drops back', async function(){
    var p=await open('press');
    var r=await p.evaluate(function(){ var f=function(s){ var e=document.querySelector(s), b=e.getBoundingClientRect();
      return {h:b.height,a:b.width*b.height,bg:getComputedStyle(e).backgroundColor}; };
      return {log:f('[data-action="logset"]'), next:f('.storynav .next'), prev:f('.storynav [data-action="prevslide"]'),
        accent:getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()}; });
    await close(p);
    assert.ok(r.log.h>=48,'Log set is '+r.log.h+'px tall');
    assert.ok(r.log.a>r.next.a && r.log.h>r.next.h,'Log set '+JSON.stringify(r.log)+' vs Next '+JSON.stringify(r.next));
    assert.notStrictEqual(r.next.bg,'rgb(232, 80, 15)','Next is still filled with the accent');
  });

  console.log('\nLAYOUT AND STATE');
  for(var fw of ['press','bench']) await (function(fw){ return t('the side and front figures fit inside the slide on a 320px phone ('+fw+')', async function(){
    var p=await open(fw,{viewport:{width:320,height:700}});
    var r=await p.evaluate(function(){ var s=document.querySelector('.slide').getBoundingClientRect();
      var f=document.querySelectorAll('.fig-pair .fig-wrap');
      return {sw:document.documentElement.scrollWidth, n:f.length, right:f.length?f[f.length-1].getBoundingClientRect().right:0, slide:s.right}; });
    await close(p);
    assert.strictEqual(r.n,2,fw+' did not draw the figure pair');
    assert.ok(r.sw<=320,'the page is '+r.sw+'px wide');
    assert.ok(r.right<=r.slide+0.5,'the front figure ends at '+r.right+', the slide at '+r.slide);
  }); })(fw);
  await t('the story bar tells the current slide from a done one', async function(){
    var p=await open('press');
    var r=await p.evaluate(function(){ var f=function(s){ var e=document.querySelector(s), b=e.querySelector('b'),
        c=getComputedStyle(e), cb=getComputedStyle(b);
      return [c.outlineStyle+' '+c.outlineColor, c.height, cb.backgroundColor, cb.width].join(' | '); };
      return {done:f('.story-bar i.done'), now:f('.story-bar i.now')}; });
    await close(p);
    assert.notStrictEqual(r.now,r.done,'now and done render the same: '+r.now);
  });
  await t('a session slims the HUD down, and leaving it brings the HUD back', async function(){
    var p=await open('press');
    var inS=await p.evaluate(function(){ var h=document.querySelector('.hud');
      return {h:h?h.getBoundingClientRect().height:0, week:!!document.querySelector('.hud .week'), streaks:!!document.querySelector('.hud .streaks')}; });
    await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(150);
    var out=await p.evaluate(function(){ return {week:!!document.querySelector('.hud .week'), streaks:!!document.querySelector('.hud .streaks')}; });
    await close(p);
    assert.ok(inS.h>0 && inS.h<80,'the HUD is '+inS.h+'px tall during a session');
    assert.ok(!inS.week && !inS.streaks,'week strip or streaks still shown during a session');
    assert.ok(out.week && out.streaks,'the full HUD did not come back after leaving the session');
  });
  await t('tapping a chart bar shows its detail under the chart, and the head never reflows', async function(){
    var p=await open('recent',{touch:true,viewport:{width:360,height:740}});
    var before=await p.evaluate(function(){ var c=document.querySelector('.chart'); return {sub:c.querySelector('.chart-head .sub').textContent, h:c.querySelector('.chart-head').getBoundingClientRect().height}; });
    var box=await p.evaluate(function(){ var m=document.querySelector('.chart [data-tip]');
      if(!m) return null; var r=m.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,tip:m.getAttribute('data-tip')}; });
    assert.ok(box,'no chart mark carries a tip');
    await p.touchscreen.tap(box.x,box.y); await p.waitForTimeout(150);
    var after=await p.evaluate(function(){ var c=document.querySelector('.chart'); return {sub:c.querySelector('.chart-head .sub').textContent,
      h:c.querySelector('.chart-head').getBoundingClientRect().height, tip:(c.querySelector('.c-tip')||{}).textContent}; });
    await close(p);
    assert.strictEqual(after.tip,box.tip,'the line under the chart reads "'+after.tip+'"');
    assert.strictEqual(after.sub,before.sub,'the head changed to "'+after.sub+'"');
    assert.strictEqual(after.h,before.h,'the head went from '+before.h+'px to '+after.h+'px tall');
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(box.tip),'the tip still gives an ISO date: '+box.tip);
  });
  await t('the week strip says on screen that a day can be tapped', async function(){
    var p=await open('plain');
    var vis=await p.evaluate(function(){ return document.querySelector('.wrap').innerText; });
    await close(p);
    assert.ok(/tap a day/i.test(vis),'no visible "tap a day" hint');
  });
  await t('recipe cards start collapsed to title, macros and Add to plan, and open on a tap', async function(){
    var p=await open('meal');
    var r=await p.evaluate(function(){ var c=document.querySelector('[data-action="addmeal"]').closest('.libitem');
      return {li:c.querySelectorAll('li').length, portions:!!c.querySelector('.portions'), macros:!!c.querySelector('.macros'),
        id:c.querySelector('[data-action="addmeal"]').getAttribute('data-id'),
        h:Math.max.apply(null,[].slice.call(document.querySelectorAll('[data-action="addmeal"]')).map(function(a){ return a.closest('.libitem').getBoundingClientRect().height; }))}; });
    assert.ok(!r.li && !r.portions,'a recipe card opens with its ingredients or portions showing');
    assert.ok(r.macros,'the collapsed card lost its macros');
    var tog=await p.$('[data-action="toggleex"][data-id="rec:'+r.id+'"]');
    assert.ok(tog,'no toggle on the recipe card');
    assert.strictEqual(await tog.getAttribute('aria-expanded'),'false');
    await tog.click(); await p.waitForTimeout(150);
    var o=await p.evaluate(function(id){ var c=document.querySelector('[data-action="addmeal"][data-id="'+id+'"]').closest('.libitem');
      return {li:c.querySelectorAll('li').length, portions:!!c.querySelector('.portions'),
        exp:c.querySelector('[data-action="toggleex"]').getAttribute('aria-expanded')}; }, r.id);
    await close(p);
    assert.ok(o.li>0 && o.portions,'tapping did not open the card');
    assert.strictEqual(o.exp,'true');
    assert.ok(r.h<=230,'the tallest closed recipe card is '+r.h+'px on a 390px phone');
  });

  console.log('\nACCESSIBLE NAMES AND STATE');
  await t('glyph-only buttons are named, and toggles say whether they are on', async function(){
    var bad=[];
    var p=await open('meal',{ui:'{"tab":"today"}'});
    var scan=function(){ return p.evaluate(function(){ var out=[];
      [].slice.call(document.querySelectorAll('button')).forEach(function(e){
        var txt=e.textContent.replace(/\s+/g,'');
        if(/^[×+\-−]?$/.test(txt) && !e.getAttribute('aria-label')) out.push('unnamed '+e.className+' '+e.getAttribute('data-action'));
      });
      [].slice.call(document.querySelectorAll('.tab,.pill,.rangebar button')).forEach(function(e){
        var on=e.classList.contains('on')||e.classList.contains('active');
        if(e.getAttribute('aria-pressed')!==String(on)) out.push('aria-pressed '+e.className+' '+e.textContent+' is '+e.getAttribute('aria-pressed'));
      }); return out; }); };
    bad=bad.concat(await scan());
    for(var tb of ['meals','progress','training']){ await p.click('[data-action="tab"][data-tab="'+tb+'"]'); await p.waitForTimeout(120); bad=bad.concat(await scan()); }
    await close(p);
    p=await open('press'); bad=bad.concat(await scan()); await close(p);
    assert.deepStrictEqual(bad.slice(0,10),[]);
  });

  console.log('\nPHONE LAYOUT');
  var rects=function(p,sel){ return p.evaluate(function(s){ return [].slice.call(document.querySelectorAll(s)).map(function(e){
    var r=e.getBoundingClientRect(); return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),b:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height)}; }); }, sel); };
  await t('the four tabs share one row on a 360px phone', async function(){
    var p=await open('plain',{viewport:{width:360,height:740},touch:true});
    var r=await rects(p,'.tab'), sw=await p.evaluate(function(){ return document.documentElement.scrollWidth; });
    await close(p);
    assert.strictEqual(r.length,4);
    assert.ok(r.every(function(x){ return x.t===r[0].t; }),'the tabs sit at '+r.map(function(x){ return x.t; }).join(', '));
    assert.ok(sw<=360,'the page is '+sw+'px wide');
  });
  await t('the tab labels fit whole on a 320px phone', async function(){
    var p=await open('plain',{viewport:{width:320,height:640},touch:true});
    var r=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('.tab'),function(e){ return e.textContent+' '+e.scrollWidth+'/'+e.clientWidth; })
      .filter(function(x,i,a){ var n=x.split(' ')[1].split('/'); return +n[0]>+n[1]; }); });
    await close(p);
    assert.deepStrictEqual(r,[],'cut off (content/box width)');
  });
  await t('the sauna chart draws every visit in the range and its count says so', async function(){
    var p=await open('sauna');
    await p.click('[data-action="prange"][data-n="90"]'); await p.waitForTimeout(150);
    var r=await p.evaluate(function(){ var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Minutes per session/.test(x.textContent); })[0];
      return c?{n:c.querySelectorAll('.mark').length, sub:c.querySelector('.chart-head .sub').textContent}:null; });
    await close(p);
    assert.ok(r,'no sauna chart');
    assert.strictEqual(r.n,45,'the 90 day chart draws '+r.n+' of 45 visits');
    assert.ok(/^45 in 90 days/.test(r.sub),'the head says "'+r.sub+'"');
    assert.ok(/675 min/.test(r.sub),'the head lost the minutes: "'+r.sub+'"');
  });
  await t('a long chart tip wraps whole inside the room kept for it', async function(){
    var p=await open('recent',{touch:true,viewport:{width:360,height:740}});
    var box=await p.evaluate(function(){ var ms=[].slice.call(document.querySelectorAll('.chart [data-tip]'));
      if(!ms.length) return null;
      var m=ms.sort(function(a,b){ return b.getAttribute('data-tip').length-a.getAttribute('data-tip').length; })[0];
      m.scrollIntoView({block:'center'}); var ch=m.closest('.chart'); ch.setAttribute('data-probe','1');
      var r=m.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,tip:m.getAttribute('data-tip'),h0:ch.querySelector('.c-tip').getBoundingClientRect().height}; });
    assert.ok(box && box.tip.length>40,'no long tip to try: '+(box&&box.tip));
    await p.touchscreen.tap(box.x,box.y); await p.waitForTimeout(150);
    var r=await p.evaluate(function(){ var e=document.querySelector('[data-probe] .c-tip');
      return {txt:e.textContent, sw:e.scrollWidth, cw:e.clientWidth, h:e.getBoundingClientRect().height, lh:parseFloat(getComputedStyle(e).lineHeight)}; });
    await close(p);
    assert.strictEqual(r.txt,box.tip);
    assert.ok(r.sw<=r.cw,'the tip is cut: '+r.sw+'px of text in '+r.cw+'px');
    assert.ok(r.h<=r.lh*2+1 ? r.h===box.h0 : true,'the tip went from '+box.h0+' to '+r.h+'px tall');
    assert.ok(box.h0>=r.lh*2-1,'only '+box.h0+'px kept for the tip');
  });
  await t('the water + stays under the thumb as the amount grows', async function(){
    var p=await open('plain',{viewport:{width:360,height:740}});
    var at=[], plus='[data-action="water"][data-d="1"]';
    for(var i=0;i<6;i++){ at.push((await rects(p,plus))[0].l); await p.click(plus); await p.waitForTimeout(60); }
    await close(p);
    assert.ok(at.every(function(x){ return x===at[0]; }),'+ moved: '+at.join(', '));
  });
  await t('chart labels are drawn at their CSS size, and the water target label has the right edge to itself', async function(){
    for(var vw of [360,820]){
      var p=await open('recent',{viewport:{width:vw,height:800}});
      var r=await p.evaluate(function(){
        var l=[].slice.call(document.querySelectorAll('.chart .c-lbl,.chart .c-val')).map(function(e){ return e.getBoundingClientRect().height; });
        var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Water per day/.test(x.textContent); })[0];
        var tl=[].slice.call(c.querySelectorAll('text')).filter(function(x){ return /L$/.test(x.textContent) && x.getAttribute('text-anchor')==='end' && !/\//.test(x.textContent); })[0];
        var lb=tl.getBoundingClientRect(), hit=[].slice.call(c.querySelectorAll('rect')).filter(function(b){
          var q=b.getBoundingClientRect(); return b.getAttribute('fill')!=='transparent' && q.right>lb.left && q.left<lb.right && q.bottom>lb.top && q.top<lb.bottom; }).length;
        return {min:Math.min.apply(null,l), n:l.length, hit:hit}; });
      await close(p);
      assert.ok(r.n>6,'only '+r.n+' chart labels');
      assert.ok(r.min>=10,'a chart label is '+r.min+'px tall at '+vw+'px');
      assert.strictEqual(r.hit,0,'bars cover the target label at '+vw+'px');
    }
  });
  for(var sch3 of ['light','dark']) await (function(sch){ return t('accent text and accent buttons read at 4.5:1 in '+sch, async function(){
    var r={};
    var p=await open('meal',{scheme:sch,ui:'{"tab":"today"}'});
    var c=function(sel){ return p.evaluate(function(s){ var e=document.querySelector(s); return e?__contrast(e):-1; },sel); };
    r.linklike=await c('.linklike'); r.logsauna=await c('.logbtn'); r.lvl=await c('.lvl-badge'); r.plus=await c('.stepper button.big');
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(120);
    r.todayCal=await c('.calday.today .cd-n'); r.tag=await c('.libitem .tag'); r.addplan=await c('.addplan');
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(120);
    r.range=await c('.rangebar button.on');
    await close(p);
    p=await open('press',{scheme:sch}); r.cat=await c('.slide .cat'); await close(p);
    Object.keys(r).forEach(function(k){ assert.ok(r[k]>=4.5, k+' is '+r[k].toFixed(2)+':1 in '+sch); });
  }); })(sch3);
  for(var sch5 of ['light','dark']) await (function(sch){ return t('every accent word and accent button on every tab reads at 4.5:1 in '+sch+', and so does the over N days line', async function(){
    var bad=[], subs=[];
    var scan=function(p,where){ return p.evaluate(function(w){
      var probe=document.createElement('i'); probe.style.color='var(--accent)'; document.body.appendChild(probe);
      var acc=getComputedStyle(probe).color; probe.remove(); var out=[];
      [].forEach.call(document.querySelectorAll('body *'),function(e){
        var cs=getComputedStyle(e), r=e.getBoundingClientRect();
        if(!r.width||!r.height||cs.visibility==='hidden'||+cs.opacity===0) return;
        if(cs.color!==acc && cs.backgroundColor!==acc) return;
        if(![].some.call(e.childNodes,function(n){ return n.nodeType===3 && n.textContent.trim(); })) return;
        out.n=(out.n||0)+1; var c=__contrastSeen(e); if(c<4.5) out.push(w+' '+e.tagName.toLowerCase()+'.'+String(e.className).replace(/ /g,'.')+' "'+e.textContent.trim().slice(0,24)+'" '+c.toFixed(2));
      });
      return {list:out, n:out.n||0}; },where).then(function(o){ seen+=o.n; return o.list; }); };
    var seen=0;
    var p=await open('meal',{scheme:sch,ui:'{"tab":"today"}'});
    for(var tb of ['today','training','meals','progress']){
      await p.click('[data-action="tab"][data-tab="'+tb+'"]'); await p.waitForTimeout(120);
      bad=bad.concat(await scan(p,tb));
      if(tb==='progress') subs=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('.stat-tile .sub-l'),function(e){ return __contrastSeen(e); }); });
    }
    await close(p);
    p=await open('press',{scheme:sch}); bad=bad.concat(await scan(p,'session')); await close(p);
    assert.ok(seen>=10,'only '+seen+' accent words and buttons found');
    assert.deepStrictEqual(bad,[],'below 4.5:1 in '+sch);
    assert.ok(subs.length>0,'no over N days line');
    subs.forEach(function(c){ assert.ok(c>=4.5,'the over N days line is '+c.toFixed(2)+':1 in '+sch); });
  }); })(sch5);
  for(var vw5 of [360,390]) await (function(vw){ return t('every text box and dropdown is at least 16px at '+vw+'px, so iOS does not zoom in on a tap, and the rows still fit', async function(){
    var small=[], over=[];
    var scan=function(p,where){ return p.evaluate(function(w){
      var out={small:[],over:[]}, W=document.documentElement.clientWidth;
      [].forEach.call(document.querySelectorAll('input,select,textarea'),function(e){
        if(/^(checkbox|radio|range|hidden|button|submit)$/.test(e.type)) return;
        var f=parseFloat(getComputedStyle(e).fontSize); if(f<16) out.small.push(w+' #'+(e.id||e.className||e.tagName)+' '+f+'px');
        var r=e.getBoundingClientRect(); if(r.width && (r.right>W+0.5 || r.left<-0.5)) out.over.push(w+' #'+(e.id||e.className||e.tagName));
      });
      if(document.documentElement.scrollWidth>W) out.over.push(w+' page scrolls sideways');
      return out; },where); };
    var add=function(r){ small=small.concat(r.small); over=over.concat(r.over); };
    var p=await open('meal',{viewport:{width:vw,height:844},ui:'{"tab":"today"}'});
    await p.evaluate(function(){ var d=document.createElement('div'); d.id='probe-cardio';
      d.innerHTML='<select class="cardio-select"><option>Treadmill</option></select><input class="cardio-select" type="text">';
      document.body.appendChild(d); });
    add(await scan(p,'cardio'));
    await p.evaluate(function(){ document.getElementById('probe-cardio').remove(); });
    for(var tb of ['today','training','meals','progress']){
      await p.click('[data-action="tab"][data-tab="'+tb+'"]'); await p.waitForTimeout(120);
      await p.evaluate(function(){ [].forEach.call(document.querySelectorAll('details'),function(d){ d.open=true; }); });
      add(await scan(p,tb));
    }
    await close(p);
    p=await open('ss',{viewport:{width:vw,height:844}}); add(await scan(p,'superset'));
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(150); add(await scan(p,'picker')); await close(p);
    p=await open('press',{viewport:{width:vw,height:844}}); add(await scan(p,'session')); await close(p);
    assert.deepStrictEqual(small,[],'fields under 16px at '+vw+'px');
    assert.deepStrictEqual(over,[],'fields past the edge at '+vw+'px');
  }); })(vw5);
  await t('history rows put their date on the right, and the Remove behind them does not show at the corners', async function(){
    var p=await open('recent',{viewport:{width:390,height:844},touch:true});
    var r=await p.evaluate(function(){
      var rows=[].slice.call(document.querySelectorAll('.swipe .recent-log'));
      return {n:rows.length, gap:rows.map(function(x){ var d=x.querySelector('.d'); return Math.round(x.getBoundingClientRect().right-d.getBoundingClientRect().right); }),
        del:getComputedStyle(document.querySelector('.swipe-del')).opacity,
        iso:rows.filter(function(x){ return /\d{4}-\d{2}-\d{2}/.test(x.querySelector('.d').textContent); }).length}; });
    await close(p);
    assert.ok(r.n>=6,'only '+r.n+' rows');
    assert.ok(r.gap.every(function(g){ return g===r.gap[0] && g<=16; }),'dates end this far from the row edge: '+r.gap.join(', '));
    assert.strictEqual(r.del,'0','a closed row lets its Remove show through, opacity '+r.del);
    assert.strictEqual(r.iso,0,'rows still give ISO dates');
  });
  await t('a planned meal gets a wide title column that lines up whatever the slot, with room between meals', async function(){
    var p=await open('meal',{viewport:{width:360,height:740}});
    await p.evaluate(function(){ document.querySelector('[data-action="addmeal"]').scrollIntoView(); });
    var r=await p.evaluate(function(){ return [].slice.call(document.querySelectorAll('.mealrow')).map(function(m){
      var t=m.querySelector('.mt').getBoundingClientRect(); return {l:Math.round(t.left), w:Math.round(t.width), slot:m.querySelector('.slot').textContent}; }); });
    await close(p);
    assert.ok(r.length>=2,'only '+r.length+' planned meals');
    assert.ok(r.every(function(x){ return x.l===r[0].l; }),'titles start at '+r.map(function(x){ return x.slot+' '+x.l; }).join(', '));
    assert.ok(r.every(function(x){ return x.w>=180; }),'a title gets '+r.map(function(x){ return x.w; }).join(', ')+'px');
  });
  await t('with a session going, the workout cards stay quiet and the banner counts sets properly', async function(){
    var p=await open('bench',{viewport:{width:360,height:740},ui:'{"tab":"training"}'});
    var r=await p.evaluate(function(){ var s=[].slice.call(document.querySelectorAll('.wcard .start:disabled'));
      return {n:s.length, txt:s.map(function(x){ return x.textContent; }).filter(function(v,i,a){ return a.indexOf(v)===i; }),
        w:Math.max.apply(null,s.map(function(x){ return x.getBoundingClientRect().width; })), banner:document.querySelector('.resume-banner').textContent}; });
    await close(p);
    assert.ok(r.n>5,'only '+r.n+' disabled cards');
    assert.deepStrictEqual(r.txt,['Start']);
    assert.ok(r.w<100,'a disabled start is '+r.w+'px wide');
    assert.ok(/\(1 set logged\)/.test(r.banner),'banner: '+r.banner);
  });
  await t('Training: workouts come before the notes, the three done lately first, and the Today link lands on them', async function(){
    var p=await open('lately',{viewport:{width:390,height:844}});
    var r=await p.evaluate(function(){
      var hs=[].map.call(document.querySelectorAll('.sectiontitle'),function(e){ return e.textContent; });
      var seq=[].map.call(document.querySelectorAll('.wgroup, .wcard h3'),function(e){ return (e.classList.contains('wgroup')?'#':'')+e.textContent.trim(); });
      return {hs:hs, seq:seq}; });
    await close(p);
    assert.ok(r.hs.indexOf('Workouts')>-1 && r.hs.indexOf('Workouts')<r.hs.indexOf('Overview'),'sections: '+r.hs.join(', '));
    assert.deepStrictEqual(r.seq.slice(0,5),['#Recent','Legs','Pull','Push','#All workouts'],'cards: '+r.seq.slice(0,8).join(', '));
    assert.ok(/^Strength/.test(r.seq[5]),'the rest start with '+r.seq[5]);
    assert.strictEqual(r.seq.filter(function(x){ return x==='Legs'; }).length,1,'Legs is listed twice');
    p=await open('lately',{viewport:{width:390,height:844},ui:'{"tab":"today"}'});
    await p.evaluate(function(){ document.querySelector('[data-to="workouts"]').scrollIntoView({block:'center'}); });
    await p.click('[data-action="tab"][data-to="workouts"]'); await p.waitForTimeout(200);
    var at=await p.evaluate(function(){ var h=document.getElementById('workouts'), app=document.getElementById('app');
      return {tab:!!h, top:h?h.getBoundingClientRect().top:null, bar:parseFloat(app.style.getPropertyValue('--status-h'))||0, y:window.scrollY}; });
    await close(p);
    assert.ok(at.tab,'the link did not open Training');
    assert.ok(at.y>0 && Math.abs(at.top-at.bar-8)<2,'the Workouts heading is at '+at.top+' under a bar of '+at.bar+' (scrolled '+at.y+')');
  });
  await t('kg and reps keep a visible label once prefilled, and the prefill is the weight the aim line names', async function(){
    var p=await open('bench0');
    var r=await p.evaluate(function(){
      var lab=function(id){ var e=document.getElementById(id), l=e&&e.closest('label'), s=l&&l.querySelector('span');
        return s && s.getBoundingClientRect().height>0 ? s.textContent : ''; };
      var aim=(document.querySelector('.slide .lasttime')||{}).textContent||'';
      return {w:lab('log-w-press_bench'), v:lab('log-v-press_bench'), wv:document.getElementById('log-w-press_bench').value,
        vv:document.getElementById('log-v-press_bench').value, aim:aim, nw:document.querySelectorAll('.slide .lasttime .nw').length}; });
    await close(p);
    assert.strictEqual(r.w,'kg'); assert.strictEqual(r.v,'reps');
    var m=r.aim.match(/Aim for (\d+) on every set at ([\d.]+)kg/);
    assert.ok(m,'no aim line to check the prefill against: "'+r.aim+'"');
    assert.deepStrictEqual([r.wv,r.vv],[m[2],m[1]],'the boxes say '+r.wv+' x '+r.vv+' under "'+r.aim+'"');
    assert.ok(r.nw>0,'the last-time sets are not kept whole on a line');
    p=await open('benchtop');
    var top=await p.evaluate(function(){ return {aim:(document.querySelector('.slide .lasttime')||{}).textContent||'',
      wv:document.getElementById('log-w-press_bench').value, vv:document.getElementById('log-v-press_bench').value}; });
    await close(p);
    assert.ok(/try \+2\.5kg/.test(top.aim),'the line after a top-of-range session: "'+top.aim+'"');
    assert.deepStrictEqual([top.wv,top.vv],['62.5','8'],'the boxes say '+top.wv+' x '+top.vv+' under "'+top.aim+'"');
    p=await open('meal',{ui:'{"tab":"meals"}'});
    var pl=await p.evaluate(function(){ var l=document.querySelector('label[for="rec-portions"]'); return l?l.getBoundingClientRect().height>0&&l.textContent:''; });
    await close(p);
    assert.ok(/portions/i.test(pl||''),'the recipe portions box has no visible label');
  });
  await t('a load error is a filled bar over the page, says why in words, and dims what cannot be used', async function(){
    var p=await open('plain',{q:'?nostore'}); await p.waitForTimeout(400);
    var r=await p.evaluate(function(){ var b=[].slice.call(document.querySelectorAll('.banner')).filter(function(x){ return /Could not load/.test(x.textContent); })[0];
      if(!b) return null; var cs=getComputedStyle(b), bt=b.querySelector('button'), sb=b.closest('.statusbar');
      return {bg:cs.backgroundColor, txt:b.textContent, pos:sb?getComputedStyle(sb).position:'static', btn:bt.getBoundingClientRect().height,
        c:__contrast(b), dim:getComputedStyle(document.querySelector('[data-action="water"][data-d="1"]')).opacity}; });
    await close(p);
    assert.ok(r,'no load error banner');
    assert.notStrictEqual(r.bg,'rgba(0, 0, 0, 0)','the banner has no fill');
    assert.strictEqual(r.pos,'fixed','the banner is in the flow of the page');
    assert.ok(r.btn>=44,'Retry is '+r.btn+'px tall');
    assert.ok(r.c>=4.5,'banner text is '+r.c.toFixed(2)+':1');
    assert.ok(!/\(\w+\)/.test(r.txt) && !/unavailable|quota_exceeded/.test(r.txt),'a raw code is shown: '+r.txt);
    assert.ok(+r.dim<1,'water + looks usable while nothing can be changed');
  });
  await t('the store status bar covers no control, nor the brand or the session header', async function(){
    for(var w of ['press','plain']){
      var p=await open(w,{q:'?nostore',viewport:{width:360,height:740},touch:true}); await p.waitForTimeout(400);
      var r=await p.evaluate(function(){ var sb=document.querySelector('.statusbar'); if(!sb) return null; var s=sb.getBoundingClientRect();
        var hit=[].slice.call(document.querySelectorAll('button,input,select,textarea,[data-action],.hud,.story-bar')).filter(function(e){
          if(sb.contains(e)) return false; var q=e.getBoundingClientRect();
          return q.width>0 && q.height>0 && q.bottom>s.top && q.top<s.bottom && q.right>s.left && q.left<s.right; });
        return {h:s.height, hit:hit.map(function(e){ return (e.getAttribute('data-action')||e.className)+'@'+Math.round(e.getBoundingClientRect().top); })}; });
      await close(p);
      assert.ok(r && r.h>20,w+': no status bar');
      assert.deepStrictEqual(r.hit.slice(0,6),[],w+': these sit under the '+Math.round(r.h)+'px status bar');
    }
  });
  await t('the shrunk undo offer is one button inside the column, and Dismiss reads clearly', async function(){
    var p=await open('recent',{viewport:{width:820,height:1180}});
    await p.evaluate(function(){ document.querySelector('.swipe-del[data-action="delsauna"]').click(); }); await p.waitForTimeout(200);
    var full=await p.evaluate(function(){ var g=document.querySelector('.undo-bar .ghost'); return {c:__contrast(g), b:__borderContrast(g)}; });
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(200);
    var r=await p.evaluate(function(){ var b=document.querySelector('.undo-bar'), w=document.querySelector('.wrap').getBoundingClientRect();
      var vis=[].slice.call(b.querySelectorAll('button')).filter(function(x){ return x.getBoundingClientRect().width>0; });
      return {mini:b.classList.contains('mini'), n:vis.length, right:b.getBoundingClientRect().right, col:w.right-16,
        txt:b.innerText.replace(/\s+/g,' ').trim(), name:vis[0]&&vis[0].getAttribute('aria-label')}; });
    await close(p);
    assert.ok(full.c>=4.5,'Dismiss text is '+full.c.toFixed(2)+':1');
    assert.ok(r.mini,'changing tab left the full offer over the next screen');
    assert.strictEqual(r.n,1,'the shrunk offer shows '+r.n+' buttons');
    assert.ok(r.right<=r.col+1,'it ends at '+r.right+', the column at '+r.col);
    assert.strictEqual(r.txt,'Undo remove','the shrunk offer reads "'+r.txt+'"');
    assert.ok(/sauna/.test(r.name||''),'the shrunk Undo is named "'+r.name+'"');
  });
  await t('Export and Import show which is open, and Replace looks unlike the safe choices', async function(){
    var p=await open('plain',{ui:'{"tab":"progress"}'});
    await p.click('[data-action="datapane"][data-p="export"]'); await p.waitForTimeout(150);
    var txt=await p.inputValue('#export-json');
    var pane=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('[data-action="datapane"]'),function(b){ return getComputedStyle(b).backgroundColor; }); });
    await p.click('[data-action="datapane"][data-p="import"]'); await p.waitForTimeout(150);
    await p.evaluate(function(v){ var e=document.getElementById('import-json'); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); },txt);
    await p.click('[data-action="checkimport"]'); await p.waitForTimeout(150);
    var bg=await p.evaluate(function(){ var f=function(s){ var e=document.querySelector(s); return e?getComputedStyle(e).backgroundColor+'|'+getComputedStyle(e).color:''; };
      return {merge:f('[data-mode="merge"]'), replace:f('[data-mode="replace"]'), check:f('[data-action="checkimport"]')}; });
    await close(p);
    assert.notStrictEqual(pane[0],pane[1],'Export and Import look the same with Export open');
    assert.ok(bg.replace && bg.merge,'no Replace or Merge after a good check');
    assert.notStrictEqual(bg.replace,bg.merge,'Replace looks like Merge');
    assert.notStrictEqual(bg.check,bg.merge,'Check looks like Merge');
  });
  await t('the side and front figures are drawn at one scale on one floor', async function(){
    for(var w of ['press','bench']){
      var p=await open(w);
      var r=await p.evaluate(function(){ var f=[].slice.call(document.querySelectorAll('.fig-pair svg'));
        return f.map(function(s){ var b=s.getBoundingClientRect(), vb=s.viewBox.baseVal, g=s.querySelector('line');
          return {h:Math.round(b.height), vbw:vb.width, scale:Math.min(b.width/vb.width,b.height/vb.height), floor:g?Math.round(g.getBoundingClientRect().top):null}; }); });
      await close(p);
      assert.strictEqual(r.length,2,w+' did not draw the pair');
      assert.strictEqual(r[0].h,r[1].h,w+': panels '+r[0].h+' and '+r[1].h+'px tall');
      assert.ok(Math.abs(r[0].scale-r[1].scale)<0.02,w+': side drawn at '+r[0].scale.toFixed(2)+'x, front at '+r[1].scale.toFixed(2)+'x');
      if(r[1].floor!==null) assert.ok(Math.abs(r[0].floor-r[1].floor)<=2,w+': floors at '+r[0].floor+' and '+r[1].floor);
      assert.ok(w!=='bench' || r[0].vbw>100,'the bench side crop is '+r[0].vbw+' wide, so this does not test a wide crop');
    }
    p=await open('bench');
    var bench=await p.evaluate(function(){ return document.querySelectorAll('#fig-live-front svg rect').length; });
    await close(p);
    assert.ok(bench>0,'the bench press from above has no bench under it');
  });
  await t('recipe controls line up at 44px, the slot starts from the recipe, and per portion stays on the macro line', async function(){
    var p=await open('meal',{viewport:{width:360,height:740}});
    var r=await p.evaluate(function(){
      var cards=[].slice.call(document.querySelectorAll('.libitem')).filter(function(c){ return c.querySelector('[data-action="addmeal"]'); });
      var bf=cards.filter(function(c){ return /breakfast/i.test(c.querySelector('.tag').textContent); })[0];
      var m=cards[0].querySelector('.macros'), per=m.querySelector('.per'), first=m.querySelector('span:not(.per)');
      return {sel:Math.min.apply(null,[].map.call(document.querySelectorAll('.recipe-controls select'),function(s){ return s.getBoundingClientRect().height; })),
        bf:bf?bf.querySelector('[data-action="planslot"]').value:'none',
        perLine:Math.abs(per.getBoundingClientRect().top-first.getBoundingClientRect().top)<4,
        clear:(document.querySelector('.clearbtn')||{getBoundingClientRect:function(){ return {height:99}; }}).getBoundingClientRect().height}; });
    await close(p);
    assert.ok(r.sel>=44,'a plan select is '+r.sel+'px tall');
    assert.strictEqual(r.bf,'breakfast','a breakfast recipe offers '+r.bf);
    assert.ok(r.perLine,'"per portion" sits on a line of its own');
    assert.ok(r.clear>=44,'Clear the week is '+r.clear+'px tall');
  });
  await t('small controls are big enough to hit: day dots, links, session and picker buttons, sauna boxes, rows', async function(){
    var all=[];
    var need=async function(p,sel,w,h){ (await rects(p,sel)).forEach(function(x){ if(x.w||x.h) all.push({s:sel,w:x.w,h:x.h,need:[w,h]}); }); };
    var p=await open('plain',{viewport:{width:360,height:740},touch:true});
    await need(p,'.dot.pickable',36,36); await openSauna(p); await need(p,'.linklike',0,44); await need(p,'#sauna-mins',0,44); await need(p,'#sauna-temp',0,44);
    await p.click('[data-action="pickday"][data-k="'+key(1)+'"]'); await p.waitForTimeout(150);
    await need(p,'.backfill-bar button',0,44);
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(150);
    await need(p,'.exrow .top',0,44);
    await close(p);
    p=await open('meal',{viewport:{width:360,height:740},touch:true}); await need(p,'.shop',0,44); await close(p);
    p=await open('bench',{viewport:{width:360,height:740},touch:true});
    await need(p,'.story-head button',0,44); await need(p,'.discard-btn',0,44); await need(p,'.chipundo',0,44);
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(150);
    await need(p,'.pickrow-head button',0,44);
    var tt=await p.evaluate(function(){ return getComputedStyle(document.querySelector('.pickrow-head button')).textTransform; });
    await close(p);
    var small=all.filter(function(x){ return x.w<x.need[0] || x.h<x.need[1]; });
    assert.ok(all.length>20,'only '+all.length+' measured');
    assert.deepStrictEqual(small.map(function(x){ return x.s+' '+x.w+'x'+x.h; }).slice(0,8),[]);
    assert.strictEqual(tt,'uppercase','the picker Add is '+tt);
  });
  await t('the picker opens at its top with a search hint that fits the box', async function(){
    var p=await open('bench',{viewport:{width:360,height:740}});
    await p.evaluate(function(){ scrollTo(0,document.documentElement.scrollHeight); });
    await p.click('[data-action="openpicker"]'); await p.waitForTimeout(200);
    var r=await p.evaluate(function(){ var i=document.getElementById('ex-search'), cs=getComputedStyle(i), c=document.createElement('canvas').getContext('2d');
      c.font=cs.fontSize+' '+cs.fontFamily;
      return {y:scrollY, need:c.measureText(i.placeholder).width, room:i.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)}; });
    await close(p);
    assert.strictEqual(r.y,0,'the picker opened scrolled to '+r.y);
    assert.ok(r.need<=r.room,'the placeholder needs '+Math.round(r.need)+'px of '+Math.round(r.room));
  });
  await t('form headings fall back to a sans face, and links in notes use the palette', async function(){
    var p=await open('meal',{ui:'{"tab":"meals"}'});
    var r=await p.evaluate(function(){ return {h:[].map.call(document.querySelectorAll('.addform strong'),function(e){ return getComputedStyle(e).fontFamily; }),
      a:getComputedStyle(document.querySelector('.note a')).color}; });
    await close(p);
    assert.ok(r.h.length && r.h.every(function(f){ return /sans-serif\s*$/.test(f); }),'heading fonts: '+r.h.join(' | '));
    assert.ok(r.a!=='rgb(0, 0, 238)' && r.a!=='rgb(85, 26, 139)','the link is the browser default '+r.a);
  });
  await t('Undo sits with the set chips, so the log row keeps its shape, and a superset round times its rest too', async function(){
    var p=await open('bench0',{viewport:{width:360,height:740}});
    var before=await rects(p,'.logrow');
    await p.click('[data-action="logset"]'); await p.waitForTimeout(150);
    var after=await rects(p,'.logrow');
    var undo=await p.evaluate(function(){ var u=document.querySelector('[data-action="undoset"]'); return u?!!u.closest('.setchips'):null; });
    await close(p);
    assert.strictEqual(after[0].h,before[0].h,'the log row went from '+before[0].h+' to '+after[0].h+'px');
    assert.strictEqual(undo,true,'Undo is not with the set chips');
    p=await open('ss');
    var r=await p.evaluate(function(){ return {rest:!!document.getElementById('restline'), pre:document.getElementById('log-w-press_bench').value,
      fw:[getComputedStyle(document.querySelector('.loground')).fontWeight,getComputedStyle(document.querySelector('.logrow button,.loground')).fontWeight]}; });
    await close(p);
    assert.ok(r.rest,'no rest clock after a round');
    assert.strictEqual(r.pre,'60','the superset boxes are not prefilled');
    assert.ok(+r.fw[0]>=600,'Log round is weight '+r.fw[0]);
  });
  await t('an empty Log round marks the empty boxes instead of doing nothing', async function(){
    var p=await open('ss');
    await p.fill('#log-w-press_bench',''); await p.fill('#log-v-press_bench',''); await p.fill('#log-w-row_bent',''); await p.fill('#log-v-row_bent','');
    await p.click('[data-action="loground"]'); await p.waitForTimeout(150);
    var r=await p.evaluate(function(){ return {bad:[].map.call(document.querySelectorAll('[aria-invalid="true"]'),function(e){ return e.id; }),
      focus:document.activeElement&&document.activeElement.id}; });
    await close(p);
    assert.ok(r.bad.indexOf('log-v-press_bench')>-1 && r.bad.indexOf('log-v-row_bent')>-1,'marked: '+r.bad.join(', '));
    assert.ok(/^log-[vw]-/.test(r.focus||''),'focus is on '+r.focus);
  });
  await t('years of one lift chart at most 60 points, with one place to tap that finds the nearest', async function(){
    var p=await open('years',{viewport:{width:390,height:844}});
    var r=await p.evaluate(function(){
      var ex=document.querySelector('.exdetail'); if(!ex) return null;
      var svg=ex.querySelector('svg'), hit=svg.querySelector('[data-xs]');
      return {nodes:svg.getElementsByTagName('*').length, titles:svg.querySelectorAll('title').length,
        pts:hit?hit.getAttribute('data-xs').split(' ').length:svg.querySelectorAll('.mark').length,
        sub:ex.querySelector('.chart-head .sub').textContent, pb:[].map.call(ex.querySelectorAll('.pbrow b'),function(e){ return e.textContent; }).slice(0,2).join(' '), hint:ex.querySelector('.c-tip').textContent}; });
    assert.ok(r,'the bench press history is not open');
    assert.ok(r.pts<=60 && r.pts>=50,'it draws '+r.pts+' points for 300 sessions');
    assert.ok(r.nodes<20 && r.titles===0,'the chart is '+r.nodes+' nodes with '+r.titles+' titles');
    assert.ok(/^300 sessions/.test(r.sub),'the head says '+r.sub);
    assert.strictEqual(r.pb,'112.7kg 89kg','the best of every session is not the PB: '+r.pb);
    assert.ok(/best of about 5 sessions/.test(r.hint),'the hint says '+r.hint);
    var at=await p.evaluate(function(){ var svg=document.querySelector('.exdetail svg'), hit=svg.querySelector('[data-xs]');
      svg.scrollIntoView({block:'center'});
      var xs=hit.getAttribute('data-xs').split(' ').map(Number), ys=hit.getAttribute('data-ys').split(' ').map(Number), tips=JSON.parse(hit.getAttribute('data-tips'));
      var b=svg.getBoundingClientRect(), k=b.width/svg.viewBox.baseVal.width;
      return [20,21].map(function(i){ return {x:b.left+xs[i]*k, y:b.top+ys[i]*k, tip:tips[i]}; }); });
    // Two points side by side, each tapped below itself, where the tap area
    // of the other used to lie over it.
    for(var i=0;i<2;i++){
      var q=at[i];
      await p.mouse.click(q.x,q.y+14);
      var got=await p.evaluate(function(){ var c=document.querySelector('.exdetail .c-sel');
        return {tip:document.querySelector('.exdetail .c-tip').textContent, ring:c&&c.getAttribute('visibility')}; });
      assert.strictEqual(got.tip,q.tip,'a tap by point '+(20+i)+' read another');
      assert.strictEqual(got.ring,'visible','the point tapped is not marked');
    }
    await close(p);
  });
  await t('charts: a load chart leaves out the sessions with no weight, rather than drawing them at 0kg', async function(){
    var p=await open('mixed',{viewport:{width:360,height:740}});
    var r=await p.evaluate(function(){
      var ex=[].slice.call(document.querySelectorAll('.exrow')).filter(function(x){ return /Bench/.test(x.querySelector('h3').textContent); })[0].querySelector('.exdetail');
      var hit=ex.querySelector('[data-xs]');
      return {tips:hit?JSON.parse(hit.getAttribute('data-tips')):[], vals:[].map.call(ex.querySelectorAll('.c-val'),function(e){ return e.textContent; }),
        pb:[].map.call(ex.querySelectorAll('.pbrow span'),function(e){ return e.textContent; }), sub:ex.querySelector('.chart-head .sub').textContent}; });
    await close(p);
    assert.strictEqual(r.tips.length,2,'the chart has '+r.tips.length+' points: '+r.tips.join(' | '));
    assert.ok(r.vals.every(function(v){ return !/^0kg/.test(v); }),'a point reads '+r.vals.join(', '));
    assert.ok(r.pb.indexOf('Best est. 1RM 10kg')>-1 && r.pb.indexOf('Heaviest 7.5kg')>-1,'the PB row says '+r.pb.join(' / '));
    assert.ok(r.pb.some(function(x){ return /^Change \+3kg since /.test(x); }),'the change says '+r.pb.join(' / '));
    assert.ok(/2 without a weight/.test(r.sub),'the head says '+r.sub);
    p=await open('mixed1',{viewport:{width:360,height:740}});
    r=await p.evaluate(function(){ var ex=document.querySelector('.exdetail');
      return {pts:ex.querySelectorAll('[data-xs]').length, empty:(ex.querySelector('.empty-chart')||{}).textContent, pb:ex.querySelector('.pbrow').textContent}; });
    await close(p);
    assert.strictEqual(r.pts,0,'one weighted session drew a line');
    assert.ok(/one session with a weight/i.test(r.empty||''),'the chart says '+r.empty);
    assert.ok(/Heaviest 5kg/.test(r.pb) && !/ 0kg/.test(r.pb),'the PB row says '+r.pb);
  });
  await t('charts: a lift charts its estimated 1RM, so more reps at the same weight read as a gain', async function(){
    var p=await open('reps',{viewport:{width:360,height:740}});
    var r=await p.evaluate(function(){ var ex=document.querySelector('.exdetail'), hit=ex.querySelector('[data-xs]');
      return {tips:hit?JSON.parse(hit.getAttribute('data-tips')):[], title:ex.querySelector('.chart-head h3').textContent,
        vals:[].map.call(ex.querySelectorAll('.c-val'),function(e){ return e.textContent; }),
        pb:[].map.call(ex.querySelectorAll('.pbrow span'),function(e){ return e.textContent; })}; });
    await close(p);
    assert.strictEqual(r.title,'Estimated 1RM by session');
    assert.deepStrictEqual(r.vals,['72kg','80kg']);
    assert.strictEqual(r.tips.length,3,'tips: '+r.tips.join(' | '));
    assert.ok(/: best set 60kg × 6 of 2 sets, est\. 1RM 72kg$/.test(r.tips[0]),'the first tip says '+r.tips[0]);
    assert.ok(/: best set 60kg × 10 of 2 sets, est\. 1RM 80kg$/.test(r.tips[2]),'the last tip says '+r.tips[2]);
    ['Best est. 1RM 80kg','Heaviest 60kg','Rep PB at 60kg 10 reps'].forEach(function(x){
      assert.ok(r.pb.indexOf(x)>-1,'the PB row has no "'+x+'": '+r.pb.join(' / ')); });
    assert.ok(r.pb.some(function(x){ return /^Change \+8kg since /.test(x); }),'the change says '+r.pb.join(' / '));
  });
  await t('per-dumbbell weights say "ea" on the aim line, the personal best, the points and the change', async function(){
    var p=await open('curl');
    var aim=await p.evaluate(function(){ return (document.querySelector('.slide .lasttime')||{}).textContent||''; });
    await close(p);
    assert.ok(/Aim for 12 on every set at 41kg ea\./.test(aim),'the curl slide says "'+aim+'"');
    p=await open('plain',{ui:'{"tab":"progress","open":["curl_hammer","row_bent"]}'});
    var r=await p.evaluate(function(){
      var row=function(n){ return [].slice.call(document.querySelectorAll('.exrow')).filter(function(x){ return x.querySelector('h3').textContent.trim()===n; })[0].querySelector('.exdetail'); };
      var ham=row('Hammer curl'), bar=row('Bent-over row');
      return {pb:ham.querySelector('.pbrow').textContent, row:bar.querySelector('.pbrow').textContent}; });
    await close(p);
    assert.ok(/Heaviest 12 kg ea/.test(r.pb) && /Rep PB at 12 kg ea /.test(r.pb),'the hammer curl PB row says '+r.pb);
    assert.ok(/Heaviest 50kg/.test(r.row) && !/ ea\b/.test(r.row),'a barbell PB row says '+r.row);
  });
  await t('charts: a per-dumbbell chart labels its points and its change in kg ea', async function(){
    var p=await open('dbchart',{viewport:{width:360,height:740}});
    var r=await p.evaluate(function(){ var ex=document.querySelector('.exdetail');
      return {pb:[].map.call(ex.querySelectorAll('.pbrow span'),function(e){ return e.textContent; }), vals:[].map.call(ex.querySelectorAll('.c-val'),function(e){ return e.textContent; })}; });
    await close(p);
    assert.deepStrictEqual(r.vals,['13.3 kg ea','16 kg ea']);
    assert.ok(r.pb.indexOf('Best est. 1RM 16 kg ea')>-1 && r.pb.indexOf('Heaviest 12 kg ea')>-1,'the PB row says '+r.pb.join(' / '));
    assert.ok(r.pb.some(function(x){ return /^Change \+2\.7 kg ea since /.test(x); }),'the change says '+r.pb.join(' / '));
  });
  await t('charts: reps and minutes read with a space ("14 reps"), and so does the change', async function(){
    var p=await open('mixed',{viewport:{width:360,height:740}});
    var r=await p.evaluate(function(){
      var ex=[].slice.call(document.querySelectorAll('.exrow')).filter(function(x){ return /Air squat/.test(x.querySelector('h3').textContent); })[0].querySelector('.exdetail');
      return {pb:[].map.call(ex.querySelectorAll('.pbrow span'),function(e){ return e.textContent; }), vals:[].map.call(ex.querySelectorAll('.c-val'),function(e){ return e.textContent; })}; });
    await close(p);
    assert.ok(r.pb.indexOf('Personal best 14 reps')>-1,'the PB row says '+r.pb.join(' / '));
    assert.ok(r.pb.some(function(x){ return /^Change \+1 reps since /.test(x); }),'the change says '+r.pb.join(' / '));
    assert.deepStrictEqual(r.vals,['12 reps','13 reps']);
  });
  await t('charts: a trend over more than a year gives its dates with the year', async function(){
    var p=await open('years',{viewport:{width:390,height:844}});
    var r=await p.evaluate(function(){ var ex=document.querySelector('.exdetail');
      return {lbl:[].map.call(ex.querySelectorAll('.c-lbl'),function(e){ return e.textContent; }),
        change:[].map.call(ex.querySelectorAll('.pbrow span'),function(e){ return e.textContent; }).filter(function(x){ return /^Change/.test(x); })[0]}; });
    await close(p);
    assert.ok(r.lbl.length===2 && r.lbl.every(function(x){ return /^\d\d\/\d\d\/\d\d$/.test(x); }),'the axis reads '+r.lbl.join(', '));
    assert.ok(/since \d\d\/\d\d\/\d\d$/.test(r.change),'the change says '+r.change);
  });
  await t('charts: a finger sliding along 90 days of bars reads each day it passes', async function(){
    var p=await open('recent',{viewport:{width:360,height:740},touch:true});
    await p.click('[data-action="prange"][data-n="90"]'); await p.waitForTimeout(200);
    var box=await p.evaluate(function(){ var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Sets per day/.test(x.textContent); })[0];
      var s=c.querySelector('svg'); s.scrollIntoView({block:'center'}); var b=s.getBoundingClientRect(); return {l:b.left,r:b.right,y:b.top+b.height/2}; });
    var cdp=await p.context().newCDPSession(p), seen=[];
    var at=function(x){ return [{x:x,y:box.y,id:1}]; };
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:at(box.l+4)});
    for(var i=1;i<=10;i++){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:at(box.l+4+(box.r-box.l-8)*i/10)});
      await p.waitForTimeout(30);
      seen.push(await p.evaluate(function(){ var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Sets per day/.test(x.textContent); })[0];
        return c.querySelector('.c-tip').textContent; }));
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await close(p);
    var uniq=seen.filter(function(v,i,a){ return a.indexOf(v)===i; });
    assert.ok(uniq.length>=8,'the head line read '+uniq.length+' days: '+uniq.join(' | '));
    assert.ok(/:/.test(seen[seen.length-1]),'the last read is '+seen[seen.length-1]);
  });
  await t('Progress: water tiles share a row, history is grouped by session, sauna follows the range', async function(){
    var p=await open('recent',{viewport:{width:390,height:844}});
    var r=await p.evaluate(function(){
      var tiles=[].slice.call(document.querySelectorAll('.stat-row')).filter(function(x){ return /all time/i.test(x.textContent); })[0];
      var tt=[].map.call(tiles.querySelectorAll('.stat-tile'),function(e){ return Math.round(e.getBoundingClientRect().top); });
      var sauna=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Minutes per session/.test(x.textContent); })[0];
      return {tt:tt, sauna:sauna?sauna.querySelectorAll('.mark').length:0, title:(document.querySelector('.chart-head h3')||{}).textContent}; });
    await p.click('[data-action="prange"][data-n="90"]'); await p.waitForTimeout(150);
    var sauna90=await p.evaluate(function(){ var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Minutes per session/.test(x.textContent); })[0];
      return c?c.querySelectorAll('.mark').length:0; });
    var top=await p.$('.exrow .top'); await top.click(); await p.waitForTimeout(150);
    var h=await p.evaluate(function(){ var tb=document.querySelector('.exdetail table'), dates=[].map.call(tb.querySelectorAll('td.dt'),function(e){ return e.textContent; }).filter(function(x){ return x; });
      return {dates:dates, uniq:dates.filter(function(v,i,a){ return a.indexOf(v)===i; }).length, iso:/\d{4}-\d{2}-\d{2}/.test(tb.textContent),
        title:document.querySelector('.exdetail .chart-head h3')?document.querySelector('.exdetail .chart-head h3').textContent:'Heaviest'}; });
    await close(p);
    assert.ok(r.tt.length===3 && r.tt.every(function(x){ return x===r.tt[0]; }),'water tiles at '+r.tt.join(', '));
    assert.ok(r.sauna>0 && sauna90>=r.sauna,'sauna marks: 14 days '+r.sauna+', 90 days '+sauna90);
    assert.strictEqual(h.uniq,h.dates.length,'a session date repeats: '+h.dates.join(', '));
    assert.ok(!h.iso,'the history table gives ISO dates');
    assert.ok(/^[A-Z]/.test(h.title),'chart title "'+h.title+'"');
  });
  await t('Progress with nothing logged says so in words, not empty frames', async function(){
    var p=await open('empty');
    var r=await p.evaluate(function(){ return {svg:document.querySelectorAll('.chart svg').length, empty:document.querySelectorAll('.empty-chart').length,
      hint:/Tap any exercise/.test(document.body.innerText), over1:/over 1 day/.test(document.body.innerText), t:/\b0t\b/.test(document.body.innerText)}; });
    await close(p);
    assert.strictEqual(r.svg,0,r.svg+' empty charts drawn');
    assert.ok(r.empty>=3,'only '+r.empty+' empty messages');
    assert.ok(!r.hint,'"Tap any exercise" with nothing to tap');
    assert.ok(!r.over1,'water tiles say "over 1 day" with nothing logged');
    assert.ok(!r.t,'total lifted reads 0t');
  });
  await t('going over the weekly target reads as the target hit', async function(){
    var p=await open('recent',{ui:'{"tab":"today"}'});
    var a=await p.evaluate(function(){ return document.querySelector('.card .sub:not(.tgt)').parentNode.innerText; });
    var cards=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('.card'),function(c){ return c.innerText; }).filter(function(x){ return /WORKOUT/i.test(x); })[0]; });
    await p.click('[data-action="tab"][data-tab="training"]'); await p.waitForTimeout(120);
    var b=await p.evaluate(function(){ return document.querySelector('.weekgoal').textContent; });
    await close(p);
    var m=b.match(/(\d+) of (\d+)/);
    assert.ok(!m || +m[1]<+m[2],'over the target it reads "'+b+'"');
    assert.ok(/target 3 hit/.test(b),'weekly line: '+b);
    assert.ok(/target 3 hit/.test(cards),'workout card: '+cards);
  });
  for(var sch4 of ['light','dark']) await (function(sch){ return t('empty boxes and squares stand out at 3:1 in '+sch+', and the saving pill reads clearly', async function(){
    var p=await open('meal',{scheme:sch,ui:'{"tab":"today"}'});
    var r=await p.evaluate(function(){ var pill=document.getElementById('savepill'), cs=getComputedStyle(pill), bg=cs.backgroundColor;
      var tmp=document.createElement('div'); tmp.style.cssText='background:'+bg+';color:'+cs.color; document.body.appendChild(tmp);
      var out={cup:__borderContrast(document.querySelector('.dots .cup')), dot:__borderContrast(document.querySelector('.dot:not(.touched)')), pill:__contrast(tmp)};
      tmp.remove(); return out; });
    await p.click('[data-action="tab"][data-tab="meals"]'); await p.waitForTimeout(120);
    r.box=await p.evaluate(function(){ return __borderContrast(document.querySelector('.shop .box')); });
    await close(p);
    Object.keys(r).forEach(function(k){ assert.ok(r[k]>=(k==='pill'?4.5:3), k+' is '+r[k].toFixed(2)+':1 in '+sch); });
  }); })(sch4);
  await t('Finish stays on one line on a 360px phone, and the rest clock is big', async function(){
    var p=await open('press',{viewport:{width:360,height:740},ui:'{"tab":"today","viewingSession":true,"slide":2}'});
    var r=await p.evaluate(function(){ var f=document.querySelector('.storynav .finish'), pv=document.querySelector('.storynav [data-action="prevslide"]');
      return {f:f.getBoundingClientRect().height, p:pv.getBoundingClientRect().height}; });
    await close(p);
    assert.strictEqual(r.f,r.p,'Finish is '+r.f+'px tall beside Prev at '+r.p);
    p=await open('bench');
    var fs=await p.evaluate(function(){ var e=document.getElementById('restline'); return e?parseFloat(getComputedStyle(e).fontSize):0; });
    await close(p);
    assert.ok(fs>=24,'the rest clock is '+fs+'px');
  });
  await t('on a tablet the session is as wide as its header, and a wide screen uses the room', async function(){
    var p=await open('bench',{viewport:{width:820,height:1180}});
    var r=await p.evaluate(function(){ return {story:document.querySelector('.story').getBoundingClientRect().width, hud:document.querySelector('.hud').getBoundingClientRect().width}; });
    await close(p);
    assert.ok(Math.abs(r.story-r.hud)<=1,'the session is '+r.story+'px under a '+r.hud+'px header');
    p=await open('plain',{viewport:{width:1180,height:820}});
    var w=await p.evaluate(function(){ return {wrap:document.querySelector('.wrap').getBoundingClientRect().width,
      cols:getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length}; });
    await close(p);
    assert.ok(w.wrap>900,'the page is '+w.wrap+'px wide on a 1180px screen');
    assert.strictEqual(w.cols,3,'Today has '+w.cols+' columns');
    p=await open('bench',{viewport:{width:1180,height:820}});
    var nav=await p.evaluate(function(){ return document.querySelector('[data-action="logset"]').getBoundingClientRect().bottom; });
    await close(p);
    assert.ok(nav<820,'Log set ends at '+nav+' in an 820px landscape screen');
  });
  await t('backfilling keeps its bar in view and every card names the day', async function(){
    var p=await open('plain');
    await p.click('[data-action="pickday"][data-k="'+key(1)+'"]'); await p.waitForTimeout(150);
    var r=await p.evaluate(function(){ var cards=[].slice.call(document.querySelectorAll('.card')).filter(function(c){ return /sauna/i.test(c.querySelector('h3').textContent); });
      return {pos:getComputedStyle(document.querySelector('.backfill-bar')).position, sauna:cards[0].querySelector('.sub').textContent,
        returns:document.querySelectorAll('[data-action="today"]').length}; });
    await close(p);
    assert.strictEqual(r.pos,'sticky');
    assert.ok(/ on /.test(r.sauna),'the sauna card says "'+r.sauna+'"');
    assert.strictEqual(r.returns,1,'there are '+r.returns+' ways back to today');
  });
  await t('the training template reads as a list with its advice apart, under one Overview', async function(){
    var p=await open('plain',{ui:'{"tab":"training"}'});
    var r=await p.evaluate(function(){ var it=document.querySelector('.libitem'); return {li:it.querySelectorAll('li').length, tag:it.querySelector('.tag')?it.querySelector('.tag').textContent:''}; });
    await close(p);
    assert.ok(r.li>=7,'the template has '+r.li+' list lines');
    assert.ok(!/overview/i.test(r.tag),'the card repeats the Overview heading');
  });

  console.log('\nSTREAKS, AVERAGES AND CHART DETAILS');
  await t('streaks: 500 clean days in a row read 500 on Today and on Progress', async function(){
    var p=await open('long');
    var today=await p.evaluate(function(){ return [].map.call(document.querySelectorAll('.streaks .streak .n'),function(e){ return e.textContent; }).slice(0,2); });
    await p.click('[data-action="tab"][data-tab="progress"]'); await p.waitForTimeout(150);
    var prog=await p.evaluate(function(){ return document.querySelector('.daystrip').parentNode.querySelector('.pbrow').textContent; });
    await close(p);
    assert.deepStrictEqual(today,['500','500'],'Today reads '+today.join(', '));
    assert.ok(/Current streak 500 days/.test(prog) && /Day streak 500/.test(prog),'Progress reads '+prog);
  });
  await t('all-time water: one day in 2015 averages over every day since, recent days included', async function(){
    var p=await open('old');
    var all=await p.evaluate(function(){ var t=[].slice.call(document.querySelectorAll('.stat-tile')).filter(function(x){ return /all time/.test(x.textContent); })[0];
      return {n:t.querySelector('.n').textContent, sub:t.querySelector('.sub-l').textContent}; });
    await close(p);
    var span=Math.round((new Date(key(0)+'T12:00:00')-new Date('2015-06-01T12:00:00'))/864e5)+1;
    assert.strictEqual(all.sub,'over '+span+' days','the tile says '+all.sub);
    var want=Math.round(366*8/span*100)/100*0.25;
    assert.ok(Math.abs(parseFloat(all.n)-want)<0.011 && parseFloat(all.n)>0,'the all-time average reads '+all.n+', not about '+want.toFixed(2)+'L');
  });
  await t('Sets per day: a rest day is drawn apart from a day with nothing logged', async function(){
    var p=await open('rest');
    var r=await p.evaluate(function(ks){ var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Sets per day/.test(x.textContent); })[0];
      var g=c.querySelectorAll('.mark'), n=g.length;
      var mk=function(i){ var e=g[n-1-i].querySelectorAll('rect')[1]; var cs=getComputedStyle(e);
        return {h:e.getAttribute('height'), fill:cs.fill, tip:g[n-1-i].getAttribute('data-tip')}; };
      return {rest:mk(2), none:mk(3), legend:!!c.querySelector('.legend i.rest')}; });
    await close(p);
    assert.ok(/rest day/.test(r.rest.tip) && /nothing logged/.test(r.none.tip),'the days are '+r.rest.tip+' / '+r.none.tip);
    assert.ok(r.rest.h!==r.none.h || r.rest.fill!==r.none.fill,'a rest day and an empty day draw the same mark: '+JSON.stringify(r));
    assert.ok(r.legend,'nothing says what the rest-day mark means');
  });
  for(var nd of [14,30,90]) await (function(nd){ return t('Water per day over '+nd+' days: a peak at the target is not labelled twice, and no label overlaps the target\'s', async function(){
    var p=await open('rest',{viewport:{width:360,height:740}});
    await p.click('[data-action="prange"][data-n="'+nd+'"]'); await p.waitForTimeout(150);
    var r=await p.evaluate(function(){ var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Water per day/.test(x.textContent); })[0];
      var bb=function(e){ var b=e.getBoundingClientRect(); return {l:b.left,t:b.top,r:b.right,b:b.bottom,s:e.textContent}; };
      var lbls=[].map.call(c.querySelectorAll('.c-lbl'),bb);
      return {vals:[].map.call(c.querySelectorAll('.c-val'),bb), tgt:lbls.filter(function(l){ return l.s==='2.5L'; })[0]}; });
    await close(p);
    assert.ok(r.tgt,'no target label');
    r.vals.forEach(function(v){ assert.ok(v.r<=r.tgt.l || v.l>=r.tgt.r || v.b<=r.tgt.t || v.t>=r.tgt.b,'"'+v.s+'" overlaps the target label'); });
    assert.ok(!r.vals.some(function(v){ return v.s==='2.5L'; }),'2.5L is labelled twice');
  }); })(nd);
  await t('a screen reader reads each day of the charts, the clean-day squares and the week dots', async function(){
    var p=await open('rest');
    var sets=await p.locator('.chart',{hasText:'Sets per day'}).ariaSnapshot();
    var strip=await p.locator('.daystrip').ariaSnapshot();
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(150);
    var week=await p.locator('.week').ariaSnapshot();
    await close(p);
    assert.ok(/listitem: .*\d+ sets? over \d+ session/.test(sets) && /listitem: .*rest day/.test(sets) && /listitem: .*nothing logged/.test(sets),'Sets per day reads:\n'+sets);
    assert.strictEqual((sets.match(/listitem/g)||[]).length,14,'Sets per day reads:\n'+sets);
    assert.ok(/^- list "Clean days/.test(strip) && (strip.match(/listitem/g)||[]).length===14 && /listitem ".*: clean"/.test(strip) && /listitem ".*: not logged"/.test(strip),'the clean days read:\n'+strip);
    assert.ok(/, clean"/.test(week) && /, not logged"/.test(week),'the week reads:\n'+week);
  });

  console.log('\nTHIS WEEK AND THE NEXT STEP');
  for(var wk of [['wk','1'],['wkhit','3']]) await (function(w){ return t('the HUD counts this week\'s sessions against the target, and the week dots mark the days trained ('+w[0]+')', async function(){
    var p=await open(w[0],{viewport:{width:360,height:740}});
    var r=await p.evaluate(function(){ var s=[].slice.call(document.querySelectorAll('.streaks .streak')).pop();
      return {row:[].reduce.call(document.querySelectorAll('.streaks .streak'),function(a,e){ a[Math.round(e.getBoundingClientRect().top)]=1; return a; },{}), n:s.querySelector('.n').textContent, l:s.querySelector('.l').textContent, hit:s.classList.contains('hit'), hud:document.querySelector('.hud').textContent,
        dots:[].map.call(document.querySelectorAll('.week .dot'),function(d){ return {k:d.getAttribute('data-k'), tr:d.classList.contains('trained'), al:d.getAttribute('aria-label'),
          mark:getComputedStyle(d,'::after').content}; })}; });
    var week=await p.locator('.week').ariaSnapshot();
    await close(p);
    r.row=Object.keys(r.row).length;
    var hit=w[0]==='wkhit', want=hit?'4 / 3':'2 / 3';
    assert.strictEqual(r.n,want,'the tile reads '+r.n);
    assert.strictEqual(r.l,hit?'week hit':'this week','the tile is labelled '+r.l);
    assert.strictEqual(r.row,1,'the streak tiles take '+r.row+' lines on a 360px phone');
    assert.strictEqual(r.hit,hit,'hit is '+r.hit);
    assert.ok(!/total xp/i.test(r.hud) && r.hud.indexOf('4321')<0,'the HUD still shows the total XP: '+r.hud);
    var trained=[key(1),key(3)].concat(hit?[key(2)]:[]);
    r.dots.forEach(function(d){ var on=trained.indexOf(d.k)>-1;
      assert.strictEqual(d.tr,on,d.k+' trained is '+d.tr);
      assert.strictEqual(/, trained$/.test(d.al),on,d.k+' reads '+d.al);
      assert.strictEqual(d.mark!=='none' && d.mark!=='normal',on,d.k+' mark is '+d.mark); });
    assert.ok(/clean, trained"/.test(week) && /not logged, trained"/.test(week),'the week reads:\n'+week);
  }); })(wk);
  for(var sch5 of ['light','dark']) await (function(sch){ return t('once the target sets are logged, Finish takes the fill and Log set steps back, still one tap away ('+sch+')', async function(){
    var p=await open('bench3',{scheme:sch});
    var st=function(){ return p.evaluate(function(){ var l=document.querySelector('[data-action="logset"]'), f=document.querySelector('.storynav .finish');
      return {lalt:l.classList.contains('alt'), fgo:f.classList.contains('go'), lbg:getComputedStyle(l).backgroundColor, fbg:getComputedStyle(f).backgroundColor,
        fc:__contrast(f), lc:__contrast(l), chips:document.querySelectorAll('.setchip').length}; }); };
    var a=await st();
    assert.ok(!a.lalt && !a.fgo,'three of four sets: '+JSON.stringify(a));
    await p.click('[data-action="logset"]'); await p.waitForTimeout(150);
    var b2=await st();
    assert.strictEqual(b2.chips,5,'the set did not log');
    assert.ok(b2.lalt && b2.fgo,'four of four sets: '+JSON.stringify(b2));
    assert.notStrictEqual(b2.fbg,b2.lbg,'Finish and Log set look the same');
    assert.ok(b2.fc>=4.5 && b2.lc>=4.5,'contrast Finish '+b2.fc.toFixed(2)+', Log set '+b2.lc.toFixed(2));
    // Past the double-tap guard: a deliberate extra set.
    await p.waitForTimeout(700); await p.click('[data-action="logset"]'); await p.waitForTimeout(150);
    var c=await st();
    await close(p);
    assert.strictEqual(c.chips,6,'an extra set could not be logged');
    assert.ok(c.lalt && c.fgo,'after an extra set: '+JSON.stringify(c));
  }); })(sch5);
  await t('a superset\'s last round puts the fill on Next, not Log round', async function(){
    var p=await open('ss2');
    var st=function(){ return p.evaluate(function(){ var l=document.querySelector('[data-action="loground"]'), nx=document.querySelector('.storynav .next');
      return {lalt:l.classList.contains('alt'), go:nx.classList.contains('go'), lbg:getComputedStyle(l).backgroundColor, nbg:getComputedStyle(nx).backgroundColor, slide:document.querySelector('.story-title').textContent}; }); };
    var a=await st();
    assert.ok(!a.lalt && !a.go,'two of three rounds: '+JSON.stringify(a));
    await p.click('[data-action="loground"]'); await p.waitForTimeout(150);
    var b2=await st();
    await close(p);
    assert.ok(b2.lalt && b2.go && b2.lbg!==b2.nbg,'three of three rounds: '+JSON.stringify(b2));
    assert.ok(/2\/3/.test(b2.slide),'it moved on by itself: '+b2.slide);
  });

  // Not assertions: pictures for a person to look at.
  if(process.env.FC_SHOTS){
    var fs=require('fs'); fs.mkdirSync(process.env.FC_SHOTS,{recursive:true});
    var views=[['today','plain','{"tab":"today"}'],['meals','meal','{"tab":"meals"}'],['progress','plain','{"tab":"progress"}'],
      ['training','plain','{"tab":"training"}'],['session','press',UI.press]];
    for(var vp of [[390,844],[820,1180]]) for(var sc of ['light','dark']) for(var v of views){
      var sp=await open(v[1],{viewport:{width:vp[0],height:vp[1]},scheme:sc,ui:v[2],touch:vp[0]<500});
      await sp.screenshot({path:process.env.FC_SHOTS+'/'+v[0]+'-'+vp[0]+'-'+sc+'.png'});
      await sp.context().close();
    }
  }

  await b.close(); srv.close();
  console.log('\n'+(n-fails)+'/'+n+' passed');
  process.exit(fails?1:0);
});
