// Touch gestures on a phone: the slide swipe, swipe-to-remove, and what a
// scroll, a pinch, a caret drag or a cancelled touch must not do. Driven with
// real touch input through CDP on a mobile context, not synthetic events.
var http=require('http'),assert=require('assert');
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
  var b=await env.launch(), base='http://127.0.0.1:'+srv.address().port+'/';
  var fails=0, ok=function(m){console.log('  PASS  '+m);}, bad=function(m,e){fails++;console.log('  FAIL  '+m+'\n        '+e.message);};
  var errs=[];
  async function fresh(){
    var ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    var p=await ctx.newPage(); p.setDefaultTimeout(8000); p.on('pageerror',e=>errs.push(e.message));
    await p.goto(base); await p.waitForTimeout(500);
    var cdp=await ctx.newCDPSession(p);
    var T=function(type,pts){ return cdp.send('Input.dispatchTouchEvent',{type:type,touchPoints:pts||[]}); };
    var drag=async function(x1,y1,x2,y2){
      await T('touchStart',[{x:x1,y:y1}]);
      for(var i=1;i<=6;i++){ await T('touchMove',[{x:x1+(x2-x1)*i/6,y:y1+(y2-y1)*i/6}]); await p.waitForTimeout(20); }
      await T('touchEnd'); await p.waitForTimeout(250);
    };
    var tap=async function(sel){ await p.evaluate(function(s){ document.querySelector(s).click(); },sel); await p.waitForTimeout(150); };
    // This copy saves by republishing itself, which reloads the page and drops
    // anything typed. Wait out any reload before typing.
    var navs=0; p.on('framenavigated',function(){ navs++; });
    var settle=async function(){ for(var k=0,n=-1;k<20 && n!==navs;k++){ n=navs; await p.waitForTimeout(700); } await p.waitForSelector('#app *'); };
    return {ctx:ctx,p:p,T:T,drag:drag,tap:tap,settle:settle};
  }
  // A workout under way, on its first slide with a kg box and a live figure.
  async function onLoadSlide(S){
    var p=S.p;
    if(await p.$('[data-action="cancelsession"]')) await S.tap('[data-action="cancelsession"]');
    await S.tap('[data-action="tab"][data-tab="training"]');
    await S.tap('[data-action="startworkout"]');
    for(var k=0;k<20;k++){
      if(await p.evaluate(function(){ return !!document.querySelector('.slide [id^="log-w-"]') && !!document.getElementById('fig-live'); })) break;
      await S.tap('[data-action="nextslide"]');
    }
    await S.settle();
    await p.evaluate(function(){ window.scrollTo(0,0); });
    return p.evaluate(function(){ return document.querySelector('.story-title').textContent; });
  }
  var title=function(p){ return p.evaluate(function(){ return document.querySelector('.story-title').textContent; }); };
  var box=function(p,sel){ return p.evaluate(function(s){ var r=document.querySelector(s).getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; },sel); };

  {
    var S=await fresh(), p=S.p; var t0=await onLoadSlide(S);
    var w=await p.$eval('.slide [id^="log-w-"]',function(e){ return e.id; }), v=w.replace('log-w-','log-v-');
    // Each check starts back on the same slide with the same values typed.
    var reset=async function(){
      for(var k=0;k<20 && await title(p)!==t0;k++) await S.tap('[data-action="prevslide"]');
      await S.settle();
      await p.fill('#'+w,'42.5'); await p.fill('#'+v,'8'); await p.evaluate(function(){ document.activeElement.blur(); window.scrollTo(0,0); });
    };
    try{
      await reset();
      // A thumb scrolling up the page drifts sideways too.
      await S.drag(200,700,140,400);
      assert.strictEqual(await title(p),t0,'a vertical scroll changed the slide');
      assert.strictEqual(await p.inputValue('#'+w),'42.5','the kg typed was lost');
      assert.strictEqual(await p.inputValue('#'+v),'8','the reps typed were lost');
      ok('a mostly vertical drag scrolls and leaves the slide and the typed kg and reps alone');
    }catch(e){ bad('vertical scroll over a slide',e); }
    try{
      await reset();
      var wb=await box(p,'#'+w);
      await S.drag(wb.x+wb.w-6,wb.y+wb.h/2,wb.x+wb.w-6-120,wb.y+wb.h/2);
      assert.strictEqual(await title(p),t0,'a caret drag in the kg box changed the slide');
      assert.strictEqual(await p.inputValue('#'+w),'42.5','the kg typed was lost');
      ok('a sideways drag inside the kg box moves the caret, not the slide');
    }catch(e){ bad('caret drag in a field',e); }
    try{
      await reset();
      var sb=await box(p,'.slide');
      await S.drag(330,sb.y+16,150,sb.y+22);
      assert.notStrictEqual(await title(p),t0,'a plain horizontal swipe no longer changes slide');
      ok('a plain horizontal swipe still changes slide');
    }catch(e){ bad('horizontal swipe',e); }
    try{
      var ta=await p.evaluate(function(){ return getComputedStyle(document.querySelector('.slide')).touchAction; });
      assert.ok(/pinch-zoom/.test(ta),'touch-action on .slide is '+ta);
      ok('the slide lets the page be pinch-zoomed ('+ta+')');
    }catch(e){ bad('pinch-zoom allowed',e); }
    await S.ctx.close();
    // A pinch zooms the page, which moves every later touch, so it goes on its own.
    S=await fresh(); p=S.p; t0=await onLoadSlide(S);
    try{
      var sb=await box(p,'.slide'), y=sb.y+16;
      await S.T('touchStart',[{x:200,y:y,id:0}]);
      await S.T('touchStart',[{x:200,y:y,id:0},{x:260,y:y,id:1}]);
      for(var i=1;i<=6;i++){ await S.T('touchMove',[{x:200-20*i,y:y,id:0},{x:260+5*i,y:y,id:1}]); await p.waitForTimeout(20); }
      await S.T('touchMove',[{x:200-120,y:y,id:0}]); await S.T('touchEnd'); await p.waitForTimeout(250);
      assert.strictEqual(await title(p),t0,'a two-finger pinch changed the slide');
      ok('a two-finger pinch over the slide does not change slide');
    }catch(e){ bad('pinch over a slide',e); }
    await S.ctx.close();
  }

  try{
    var S=await fresh(), p=S.p; var t0=await onLoadSlide(S);
    var sb=await box(p,'.slide');
    await S.T('touchStart',[{x:330,y:sb.y+16}]); await S.T('touchCancel'); await p.waitForTimeout(100);
    await S.T('touchStart',[{x:30,y:20}]); await S.T('touchEnd'); await p.waitForTimeout(250);
    assert.strictEqual(await title(p),t0,'a cancelled touch on the slide turned the next tap into a swipe');
    ok('a cancelled touch on a slide leaves nothing behind for the next tap');
    await S.tap('[data-action="cancelsession"]');
    await S.tap('[data-action="tab"][data-tab="progress"]');
    var rb=await p.evaluate(function(){ var r=document.querySelector('[data-swipe]'); r.scrollIntoView({block:'center'}); r=r.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
    await S.T('touchStart',[{x:rb.x+rb.w-20,y:rb.y+rb.h/2}]); await S.T('touchCancel'); await p.waitForTimeout(100);
    await S.T('touchStart',[{x:30,y:20}]); await S.T('touchEnd'); await p.waitForTimeout(250);
    assert.strictEqual(await p.locator('.swipe.open').count(),0,'a cancelled touch on a row opened it on the next tap');
    ok('a cancelled touch on a row leaves nothing behind for the next tap');
    await S.ctx.close();
  }catch(e){ bad('touchcancel',e); }

  try{
    var S=await fresh(), p=S.p; var t0=await onLoadSlide(S);
    var fb=await box(p,'#fig-live');
    await S.drag(fb.x+fb.w*0.85,fb.y+fb.h/2,fb.x+fb.w*0.85-140,fb.y+fb.h/2+5);
    var t1=await title(p);
    assert.notStrictEqual(t1,t0,'a swipe across the moving figure was dropped');
    ok('a swipe across the moving figure changes slide');
    await S.tap('[data-action="prevslide"]');
    assert.strictEqual(await title(p),t0);
    fb=await box(p,'#fig-live');
    await S.T('touchStart',[{x:fb.x+fb.w*0.85,y:fb.y+fb.h/2}]); await p.waitForTimeout(300); await S.T('touchEnd'); await p.waitForTimeout(150);
    var bb=await box(p,'[data-action="cancelsession"]');
    await S.T('touchStart',[{x:bb.x+bb.w/2,y:bb.y+bb.h/2}]); await S.T('touchEnd'); await p.waitForTimeout(300);
    if(await p.$('[data-action="cancelsession"]')) await S.tap('[data-action="cancelsession"]');
    await S.tap('[data-action="resumesession"]');
    assert.strictEqual(await title(p),t0,'resume opened on another slide after holding the figure');
    ok('holding the figure then tapping Back, keep progress resumes on the same slide');
    await S.ctx.close();
  }catch(e){ bad('swipes on the animated figure',e); }

  try{
    var S=await fresh(), p=S.p;
    if(await p.$('[data-action="cancelsession"]')) await S.tap('[data-action="cancelsession"]');
    await S.tap('[data-action="tab"][data-tab="progress"]');
    var rb=await p.evaluate(function(){ var rs=document.querySelectorAll('[data-swipe]'), r=rs[rs.length-1]; r.scrollIntoView({block:'end'}); r=r.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
    var ry=rb.y+rb.h/2;
    await S.drag(300,ry,245,ry-350);
    assert.strictEqual(await p.locator('.swipe.open').count(),0,'a vertical scroll opened a row');
    ok('scrolling up past a row does not open it for removal');
    rb=await p.evaluate(function(){ var r=document.querySelector('[data-swipe]'); r.scrollIntoView({block:'center'}); r=r.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
    await S.drag(rb.x+rb.w-20,rb.y+rb.h/2,rb.x+rb.w-140,rb.y+rb.h/2+4);
    assert.strictEqual(await p.locator('.swipe.open').count(),1,'a left swipe no longer opens a row');
    ok('a left swipe on a row still opens it');
    await S.ctx.close();
  }catch(e){ bad('swipe-to-remove against scrolls',e); }

  if(errs.length){ fails++; console.log('  FAIL  page errors: '+errs.join(' | ')); }
  await b.close(); srv.close();
  console.log(fails?fails+' touch check(s) failed':'touch checks passed');
  process.exit(fails?1:0);
});
