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
    st.plan=[{id:'pl-d1', recipeId:st.recipes[0].id, date:key(0), slot:'dinner', portions:2}]; }),
  // Push press has a front view, so its slide draws the side and front pair.
  // A logged warm-up and a third slide give the story bar a done, a now and a
  // not-yet segment.
  press: withSeed(function(st){
    st.activeSession={workoutId:'w6', startedAt:key(0), exIds:['warmup','press_push','cooldown'],
      targets:{warmup:{sets:1,reps:'5-10 min'},press_push:{sets:3,reps:'8'},cooldown:{sets:1,reps:'5-10 min'}},
      logs:{warmup:[{v:6,w:null,opt:'Bike',lvl:'',lvlKind:'resistance'}]}}; })
};
var UI={plain:'{"tab":"today"}', meal:'{"tab":"meals"}',
  press:'{"tab":"today","viewingSession":true,"slide":1}'};

var srv=http.createServer(function(q,r){
  var w=(q.url.match(/^\/(\w+)/)||[])[1]; var d=WORLDS[w]||WORLDS.plain;
  var out=d.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/,'');
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
    await p.goto(base+world); await p.waitForTimeout(300);
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
  await t('tapping a chart bar shows its detail in the chart head', async function(){
    var p=await open('plain',{touch:true,ui:'{"tab":"progress"}'});
    var before=await p.evaluate(function(){ return document.querySelector('.chart .chart-head .sub').textContent; });
    var box=await p.evaluate(function(){ var m=document.querySelector('.chart [data-tip]');
      if(!m) return null; var r=m.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,tip:m.getAttribute('data-tip')}; });
    assert.ok(box,'no chart mark carries a tip');
    await p.touchscreen.tap(box.x,box.y); await p.waitForTimeout(150);
    var after=await p.evaluate(function(){ return document.querySelector('.chart .chart-head .sub').textContent; });
    await close(p);
    assert.strictEqual(after,box.tip,'the head still reads "'+after+'" (was "'+before+'")');
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
