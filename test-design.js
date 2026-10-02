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
var doc=env.readDoc();

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
var UI={plain:'{"tab":"today"}', meal:'{"tab":"meals"}', recent:'{"tab":"progress"}', empty:'{"tab":"progress"}',
  press:'{"tab":"today","viewingSession":true,"slide":1}', bench:'{"tab":"today","viewingSession":true,"slide":1}',
  bench0:'{"tab":"today","viewingSession":true,"slide":1}', ss:'{"tab":"today","viewingSession":true,"slide":1}'};
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
  window.__borderContrast=function(el){ return ratio(rgb(getComputedStyle(el).borderTopColor), bgOf(el.parentElement)); };
};

srv.listen(0,async function(){
  var base='http://127.0.0.1:'+srv.address().port+'/';
  var b=await env.launch();
  var fails=0, n=0;
  var t=async function(name,fn){ n++; try{ await fn(); console.log('  PASS  '+name); }
    catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } };
  var open=async function(world,o){
    o=o||{};
    var ctx=await b.newContext({viewport:o.viewport||{width:390,height:844}, colorScheme:o.scheme||'light',
      hasTouch:!!o.touch, isMobile:!!o.touch});
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
  await t('the side and front figures fit inside the slide on a 320px phone', async function(){
    var p=await open('press',{viewport:{width:320,height:700}});
    var r=await p.evaluate(function(){ var s=document.querySelector('.slide').getBoundingClientRect();
      var f=document.querySelectorAll('.fig-pair .fig-wrap');
      return {sw:document.documentElement.scrollWidth, n:f.length, right:f.length?f[f.length-1].getBoundingClientRect().right:0, slide:s.right}; });
    await close(p);
    assert.strictEqual(r.n,2,'Push press did not draw the figure pair');
    assert.ok(r.sw<=320,'the page is '+r.sw+'px wide');
    assert.ok(r.right<=r.slide+0.5,'the front figure ends at '+r.right+', the slide at '+r.slide);
  });
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
    if(m) assert.deepStrictEqual([r.wv,r.vv],[m[2],m[1]],'the boxes say '+r.wv+' x '+r.vv+' under "'+r.aim+'"');
    assert.ok(r.nw>0,'the last-time sets are not kept whole on a line');
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
  await t('the shrunk undo offer is one button inside the column, and Dismiss reads clearly', async function(){
    var p=await open('recent',{viewport:{width:820,height:1180}});
    await p.evaluate(function(){ document.querySelector('.swipe-del[data-action="delsauna"]').click(); }); await p.waitForTimeout(200);
    var full=await p.evaluate(function(){ var g=document.querySelector('.undo-bar .ghost'); return {c:__contrast(g), b:__borderContrast(g)}; });
    await p.click('[data-action="tab"][data-tab="today"]'); await p.waitForTimeout(200);
    var r=await p.evaluate(function(){ var b=document.querySelector('.undo-bar'), w=document.querySelector('.wrap').getBoundingClientRect();
      var vis=[].slice.call(b.querySelectorAll('button')).filter(function(x){ return x.getBoundingClientRect().width>0; });
      return {mini:b.classList.contains('mini'), n:vis.length, right:b.getBoundingClientRect().right, col:w.right-16}; });
    await close(p);
    assert.ok(full.c>=4.5,'Dismiss text is '+full.c.toFixed(2)+':1');
    assert.ok(r.mini,'changing tab left the full offer over the next screen');
    assert.strictEqual(r.n,1,'the shrunk offer shows '+r.n+' buttons');
    assert.ok(r.right<=r.col+1,'it ends at '+r.right+', the column at '+r.col);
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
          return {h:Math.round(b.height), scale:Math.min(b.width/vb.width,b.height/vb.height), floor:g?Math.round(g.getBoundingClientRect().top):null}; }); });
      await close(p);
      assert.strictEqual(r.length,2,w+' did not draw the pair');
      assert.strictEqual(r[0].h,r[1].h,w+': panels '+r[0].h+' and '+r[1].h+'px tall');
      if(w==='press'){
        assert.ok(Math.abs(r[0].scale-r[1].scale)<0.02,w+': side drawn at '+r[0].scale.toFixed(2)+'x, front at '+r[1].scale.toFixed(2)+'x');
        assert.ok(Math.abs(r[0].floor-r[1].floor)<=2,w+': floors at '+r[0].floor+' and '+r[1].floor);
      }
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
    await need(p,'.dot.pickable',36,36); await need(p,'.linklike',0,44); await need(p,'#sauna-mins',0,44); await need(p,'#sauna-temp',0,44);
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
  await t('Progress: water tiles share a row, history is grouped by session, sauna follows the range', async function(){
    var p=await open('recent',{viewport:{width:390,height:844}});
    var r=await p.evaluate(function(){
      var tiles=[].slice.call(document.querySelectorAll('.stat-row')).filter(function(x){ return /all time/i.test(x.textContent); })[0];
      var tt=[].map.call(tiles.querySelectorAll('.stat-tile'),function(e){ return Math.round(e.getBoundingClientRect().top); });
      var sauna=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Minutes per session/.test(x.textContent); })[0];
      return {tt:tt, sauna:sauna?sauna.querySelectorAll('.mark').length:0, title:(document.querySelector('.chart-head h4')||{}).textContent}; });
    await p.click('[data-action="prange"][data-n="90"]'); await p.waitForTimeout(150);
    var sauna90=await p.evaluate(function(){ var c=[].slice.call(document.querySelectorAll('.chart')).filter(function(x){ return /Minutes per session/.test(x.textContent); })[0];
      return c?c.querySelectorAll('.mark').length:0; });
    var top=await p.$('.exrow .top'); await top.click(); await p.waitForTimeout(150);
    var h=await p.evaluate(function(){ var tb=document.querySelector('.exdetail table'), dates=[].map.call(tb.querySelectorAll('td.dt'),function(e){ return e.textContent; }).filter(function(x){ return x; });
      return {dates:dates, uniq:dates.filter(function(v,i,a){ return a.indexOf(v)===i; }).length, iso:/\d{4}-\d{2}-\d{2}/.test(tb.textContent),
        title:document.querySelector('.exdetail .chart-head h4')?document.querySelector('.exdetail .chart-head h4').textContent:'Heaviest'}; });
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
