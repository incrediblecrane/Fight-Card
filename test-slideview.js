// The session slide view as you move through it: each new slide opens at its
// top, the moving figure costs little while it plays, and under reduced
// motion it holds still. Driven on a mobile context against the published
// document with the republishing stub.
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
  async function fresh(opts){
    var o={viewport:{width:390,height:844},isMobile:true,hasTouch:true};
    Object.keys(opts||{}).forEach(function(k){ o[k]=opts[k]; });
    var ctx=await b.newContext(o);
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
    var navs=0; p.on('framenavigated',function(){ navs++; });
    // A save republishes and reloads. Wait for that reload, then for quiet.
    var reloaded=async function(n0){ for(var k=0;k<40 && navs===n0;k++) await p.waitForTimeout(100); await settle(); };
    var settle=async function(){ for(var k=0,n=-1;k<20 && n!==navs;k++){ n=navs; await p.waitForTimeout(700); } await p.waitForSelector('#app *'); };
    return {ctx:ctx,p:p,cdp:cdp,T:T,drag:drag,tap:tap,settle:settle,reloaded:reloaded,navs:function(){ return navs; }};
  }
  // A workout under way, on its first slide with a live rigged figure.
  async function onFigSlide(S){
    var p=S.p;
    if(await p.$('[data-action="cancelsession"]')) await S.tap('[data-action="cancelsession"]');
    await S.tap('[data-action="tab"][data-tab="training"]');
    var n0=S.navs();
    await S.tap('[data-action="startworkout"]');
    await S.reloaded(n0);
    for(var k=0;k<20;k++){
      if(await p.evaluate(function(){ return !!document.getElementById('fig-live-front') && !!document.querySelector('.slide [id^="log-v-"]'); })) break;
      await S.tap('[data-action="nextslide"]');
    }
    await p.evaluate(function(){ window.scrollTo(0,0); });
    return p.evaluate(function(){ return document.querySelector('.story-title').textContent; });
  }
  var title=function(p){ return p.evaluate(function(){ return document.querySelector('.story-title').textContent; }); };
  var h4Top=function(p){ return p.evaluate(function(){ return document.querySelector('.slide h4').getBoundingClientRect().top; }); };
  var toBottom=function(p){ return p.evaluate(function(){ window.scrollTo(0,document.documentElement.scrollHeight); return window.scrollY; }); };

  console.log('\nTHE MOVING FIGURE');
  {
    var S=await fresh(), p=S.p;
    try{
      await onFigSlide(S);
      await S.cdp.send('Performance.enable');
      await S.cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      // A rep in, so the measure is of the motion, not of drawing the first rep.
      await p.waitForTimeout(2600);
      var task=async function(){ var m=(await S.cdp.send('Performance.getMetrics')).metrics; for(var i=0;i<m.length;i++) if(m[i].name==='TaskDuration') return m[i].value; };
      assert.ok(!await p.$('#restline'),'a rest clock is running before any set is logged');
      var u0=await p.getAttribute('#fig-live','data-u');
      var a=await task(), w0=Date.now();
      await new Promise(function(r){ setTimeout(r,3000); });
      var busy=(await task()-a)/((Date.now()-w0)/1000)*100;
      var u1=await p.getAttribute('#fig-live','data-u');
      await S.cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
      console.log('        main thread busy '+busy.toFixed(1)+'% at 4x throttle');
      assert.ok(u0!==null && u1!==null && u0!==u1,'the figure did not move (data-u '+u0+' then '+u1+')');
      ok('the figure still animates through the rep');
    }catch(e){ bad('the figure animates',e); }
    try{
      assert.ok(busy<30,'the figure keeps the main thread '+busy.toFixed(1)+'% busy');
      ok('the figure keeps the main thread mostly idle ('+busy.toFixed(1)+'% at 4x throttle)');
    }catch(e){ bad('figure animation cost',e); }
    try{
      var same=await p.evaluate(function(){
        var s1=document.querySelector('#fig-live svg'), f1=document.querySelector('#fig-live-front svg');
        return new Promise(function(r){ setTimeout(function(){ r(s1===document.querySelector('#fig-live svg') && f1===document.querySelector('#fig-live-front svg') && !!s1); },300); });
      });
      assert.ok(same,'the figure is rebuilt each frame rather than moved');
      ok('the figure moves its existing drawing rather than rebuilding it');
    }catch(e){ bad('figure drawn in place',e); }
    try{
      // Drawn in place, a frame matches the same frame drawn whole: emptied, the
      // figure is drawn whole once, and a rep later it is back at that phase.
      var match=await p.evaluate(function(){
        var el=document.getElementById('fig-live'); el.innerHTML='<svg></svg>';
        var fresh=null, t0=performance.now();
        return new Promise(function(r){ var iv=setInterval(function(){
          var u=el.getAttribute('data-u'), h=el.innerHTML, gone=performance.now()-t0;
          if(gone>8000){ clearInterval(iv); r('the figure never came back to phase '+(fresh&&fresh.u)); return; }
          if(!fresh){ if(el.firstElementChild && el.firstElementChild.children.length) fresh={u:u,h:h}; return; }
          if(gone>1000 && u===fresh.u){ clearInterval(iv); r(h===fresh.h?'':'in place: '+h.slice(0,300)+'\n whole: '+fresh.h.slice(0,300)); }
        },3); });
      });
      assert.strictEqual(match,'','the figure in place differs from a fresh drawing');
      ok('the figure drawn in place matches a fresh drawing at the same phase');
    }catch(e){ bad('figure in place matches',e); }
    try{
      // With the rest clock running after a set, it moves at a third of the rate.
      var count=function(){ return p.evaluate(function(){ var el=document.getElementById('fig-live'), seen={}, n=0;
        return new Promise(function(r){ var iv=setInterval(function(){ var u=el.getAttribute('data-u'); if(!seen[u]){ seen[u]=1; n++; } },3);
          setTimeout(function(){ clearInterval(iv); r(n); },1200); }); }); };
      var moving=await count();
      var lw=await p.$eval('.slide [id^="log-v-"]',function(e){ return e.id; }), n1=S.navs();
      await p.fill('#'+lw,'8');
      if(await p.$('#'+lw.replace('log-v-','log-w-'))) await p.fill('#'+lw.replace('log-v-','log-w-'),'20');
      await p.evaluate(function(){ document.querySelector('.slide [data-action="logset"]').click(); });
      await S.reloaded(n1);
      assert.ok(await p.evaluate(function(){ var r=document.getElementById('restline'); return !!r && !/over/.test(r.className); }),'no rest clock running after a set');
      var resting=await count();
      assert.ok(resting>2 && resting*2<moving,'frames in 1.2s: '+moving+' moving, '+resting+' resting');
      ok('while the rest clock runs the figure keeps moving at a lower rate ('+moving+' frames, then '+resting+')');
    }catch(e){ bad('figure during rest',e); }
    await S.ctx.close();
  }

  console.log('\nA NEW SLIDE OPENS AT ITS TOP');
  {
    var S=await fresh({viewport:{width:844,height:390}}), p=S.p;
    try{
      await onFigSlide(S);
      // Logging a set is a tap inside the slide, not a new one: the page stays.
      var lw=await p.$eval('.slide [id^="log-v-"]',function(e){ return e.id; });
      await p.fill('#'+lw,'8');
      if(await p.$('#'+lw.replace('log-v-','log-w-'))) await p.fill('#'+lw.replace('log-v-','log-w-'),'20');
      var yl=await toBottom(p), n1=S.navs();
      await p.evaluate(function(){ document.activeElement.blur(); document.querySelector('.slide [data-action="logset"]').click(); });
      await p.waitForTimeout(60);
      var yl2=await p.evaluate(function(){ return window.scrollY; });
      assert.ok(yl>150 && yl2>yl-80,'logging a set moved the page from '+yl+' to '+yl2);
      ok('logging a set leaves the page where it was');
      await S.reloaded(n1);
      var y=await toBottom(p);
      assert.ok(y>150,'the slide is not taller than a landscape phone screen (scrollY '+y+')');
      var t0=await title(p);
      await p.click('[data-action="nextslide"]'); await p.waitForTimeout(250);
      assert.notStrictEqual(await title(p),t0,'Next did not move on');
      var top=await h4Top(p);
      assert.ok(top>=0,'after Next the exercise name is scrolled off the top (h4 top '+top+')');
      ok('Next on a landscape phone opens the next exercise with its name in view');
      await toBottom(p);
      await p.click('[data-action="prevslide"]'); await p.waitForTimeout(250);
      top=await h4Top(p);
      assert.ok(top>=0,'after Prev the h4 top is '+top);
      ok('Prev opens the slide with its name in view');
      await toBottom(p);
      await p.click('[data-action="skipex"]'); await p.waitForTimeout(250);
      top=await h4Top(p);
      assert.ok(top>=0,'after Skip the h4 top is '+top);
      ok('Skip opens the next slide with its name in view');
      await p.evaluate(function(){ window.scrollTo(0,document.documentElement.scrollHeight); });
      var sb=await p.evaluate(function(){ var r=document.querySelector('.slide').getBoundingClientRect(); return {y:Math.max(10,r.y)+20}; });
      var t1=await title(p);
      await S.drag(700,sb.y,450,sb.y+6);
      assert.notStrictEqual(await title(p),t1,'the swipe did not change slide');
      top=await h4Top(p);
      assert.ok(top>=0,'after a swipe the h4 top is '+top);
      ok('a swipe to the next slide opens it with its name in view');
      // Leaving and coming back opens the slide at its top too.
      await toBottom(p);
      await p.click('[data-action="cancelsession"]'); await p.waitForTimeout(250);
      await p.click('[data-action="resumesession"]'); await p.waitForTimeout(250);
      top=await h4Top(p);
      assert.ok(top>=0,'after Resume the h4 top is '+top);
      ok('resuming a session opens the slide with its name in view');
    }catch(e){ bad('slide changes scroll to the top of the slide',e); }
    await S.ctx.close();
  }

  console.log('\nREDUCED MOTION');
  {
    var S=await fresh({reducedMotion:'reduce'}), p=S.p;
    try{
      await onFigSlide(S);
      await p.waitForTimeout(300);
      var u0=await p.getAttribute('#fig-live','data-u');
      var h0=await p.$eval('#fig-live',function(e){ return e.innerHTML; });
      await p.waitForTimeout(500);
      var u1=await p.getAttribute('#fig-live','data-u');
      var h1=await p.$eval('#fig-live',function(e){ return e.innerHTML; });
      assert.ok(u0!==null,'the still carries no phase');
      assert.strictEqual(u1,u0,'the figure moved under reduced motion');
      assert.strictEqual(h1,h0,'the figure was redrawn under reduced motion');
      assert.ok(/<svg/.test(h0),'no figure drawn');
      ok('under reduced motion the figure is drawn once and holds still');
      // Tapping the figure plays one rep and stops again.
      await p.click('#fig-live'); await p.waitForTimeout(400);
      var u2=await p.getAttribute('#fig-live','data-u');
      assert.notStrictEqual(u2,u0,'a tap on the still figure did not play it');
      await p.waitForTimeout(3000);
      var u3=await p.getAttribute('#fig-live','data-u');
      await p.waitForTimeout(400);
      assert.strictEqual(await p.getAttribute('#fig-live','data-u'),u3,'the figure kept playing after one rep');
      ok('a tap on the still figure plays one rep, then it stops');
    }catch(e){ bad('reduced motion',e); }
    await S.ctx.close();
  }

  if(errs.length){ fails++; console.log('  FAIL  page errors: '+errs.join(' | ')); }
  await b.close(); srv.close();
  console.log(fails?fails+' slide view check(s) failed':'slide view checks passed');
  process.exit(fails?1:0);
});
