// The live figure's loop, headless, on a fake clock: how often it draws and
// wakes, the rest clock's slow motion, the still, the pause off screen, and
// that stopping it leaves nothing behind. The loop and the rig data are pulled
// out of the shipped index.html (or the file named on the command line), so
// this tests what ships. Usage: node test-rigloop.js [index.html]
var fs=require('fs'), assert=require('assert');
var rig=require('./pose/rig.js'), EX=require('./pose/exercises.js');
var h=fs.readFileSync(process.argv[2]||(__dirname+'/index.html'),'utf8');
function cut(a,b){ var i=h.indexOf(a), j=h.indexOf(b,i); if(i<0||j<0) throw new Error('could not find '+a+' .. '+b+' in index.html'); return h.slice(i,j); }
var src=h.split(/\r?\n/).filter(function(l){ return l.indexOf('var RIGFRAMES=')===0; })[0]+';\n'+
  cut('var RIGMAP=','function rP(')+cut('var rigRaf=null','function bodyContent(');

var fails=0;
function t(name,fn){ try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } }

// A page with one figure on it, a clock that only moves when told to, and a
// screen that refreshes every 16.7 ms.
// The figure is keyed by the app's exercise id, which RIGMAP turns into a rig.
var MAP=new Function(cut('var RIGMAP=','function rigFor(')+';return RIGMAP;')(), EXOF={};
Object.keys(MAP).forEach(function(k){ if(!EXOF[MAP[k]]) EXOF[MAP[k]]=k; });
function world(rig0,opt){
  var rigId=EXOF[rig0]; if(!rigId) throw new Error('no exercise draws the '+rig0+' rig');
  opt=opt||{};
  var now=0, timers={}, frames={}, next=1, us=[], wakes=0, io=null;
  var el={id:'fig-live', attrs:{'data-rig':rigId}, innerHTML:'', firstElementChild:null,
    getAttribute:function(k){ return k in this.attrs?this.attrs[k]:null; },
    setAttribute:function(k,v){ this.attrs[k]=String(v); if(k==='data-u') us.push({t:now,u:+v}); },
    closest:function(){ return box; }, parentNode:null};
  var box={el:el};
  var rest=null;
  var doc={getElementById:function(id){ return id==='fig-live'?el:id==='restline'?rest:null; }};
  var env={
    document:doc,
    performance:{now:function(){ return now; }},
    setTimeout:function(f,ms){ var id=next++; timers[id]={f:f,at:now+Math.max(0,ms||0)}; return id; },
    clearTimeout:function(id){ delete timers[id]; },
    requestAnimationFrame:function(f){ var id=next++; frames[id]=f; return id; },
    cancelAnimationFrame:function(id){ delete frames[id]; },
    setInterval:function(){ return 0; }, clearInterval:function(){},
    matchMedia:function(){ return {matches:!!opt.still}; },
    IntersectionObserver:function(cb){ io={cb:cb, seen:[]}; this.observe=function(b){ io.seen.push(b); }; this.disconnect=function(){ io.seen=[]; }; },
    hasOwn:function(o,k){ return Object.prototype.hasOwnProperty.call(o,k); }
  };
  env.window=env;
  var names=Object.keys(env);
  var api=new Function(names.join(','),
    'var poseTimer=null, poseFlip=false;\n'+
    'function rigSVG(id,u){ return "<svg u=\\""+u+"\\"></svg>"; } function rigFrontSVG(){ return ""; } function figureSVG(){ return ""; }\n'+
    src+';\nreturn {start:startPoseLoop, stop:stopPoseLoop, still:rigStillU, rigFor:rigFor, RIGFRAMES:RIGFRAMES};'
  ).apply(null,names.map(function(k){ return env[k]; }));
  // Run the clock forward: timers as they fall due, frames on each refresh.
  function run(ms){
    var end=now+ms;
    while(now<end){
      var due=Object.keys(timers).filter(function(id){ return timers[id].at<=now; });
      due.forEach(function(id){ var x=timers[id]; if(!x) return; delete timers[id]; wakes++; x.f(); });
      var vs=Math.floor(now/(1000/60)+1)*(1000/60);
      if(Object.keys(frames).length && Math.abs(now-vs)<=0.5){ var fs2=frames; frames={}; Object.keys(fs2).forEach(function(id){ wakes++; fs2[id](now); }); }
      now=Math.round((now+0.5)*2)/2;
    }
  }
  return {api:api, run:run, us:us, el:el, box:box, io:function(){ return io; },
    pending:function(){ return Object.keys(timers).length+Object.keys(frames).length; },
    wakes:function(){ return wakes; }, resetWakes:function(){ wakes=0; },
    rest:function(on){ rest=on?{className:'restline'}:null; },
    now:function(){ return now; }};
}
function drawsIn(w,ms){ var n0=w.us.length; w.run(ms); return w.us.slice(n0); }
var ship={}; EX.forEach(function(e){ ship[e.id]=rig.ship(e); });

console.log('\nHOW OFTEN IT DRAWS');
t('a sprint plays at its own pace, not 2.4 s a stride', function(){
  var w=world('sprint'); w.api.start(); w.run(1000);
  var d=drawsIn(w,1000), want=ship.sprint.steps*1000/ship.sprint.cycleMs;
  assert.ok(Math.abs(d.length-want)<=2,d.length+' frames in a second, want '+want);
  var adv=d[d.length-1].u-d[0].u; if(adv<0) adv+=1;
  assert.ok(Math.abs(adv-(d[d.length-1].t-d[0].t)/ship.sprint.cycleMs)<0.05,'the rep moved on '+adv.toFixed(3)+' in '+(d[d.length-1].t-d[0].t)+' ms');
});
t('a hold plays slowly, at its own length', function(){
  var w=world('plank'); w.api.start(); w.run(500);
  var d=drawsIn(w,2000), adv=d[d.length-1].u-d[0].u; if(adv<0) adv+=1;
  assert.ok(Math.abs(adv-(d[d.length-1].t-d[0].t)/ship.plank.cycleMs)<0.03,'moved '+adv.toFixed(3)+' of a rep in '+(d[d.length-1].t-d[0].t)+' ms of a '+ship.plank.cycleMs+' ms rep');
});
t('between frames the page sleeps instead of waking for every screen refresh', function(){
  var w=world('backsquat'); w.api.start(); w.run(500); w.resetWakes();
  var d=drawsIn(w,2000);
  assert.ok(w.wakes()<=2*d.length+4,w.wakes()+' wakes for '+d.length+' frames');
});
t('every frame of the rep is drawn, in order', function(){
  var w=world('kbswing'), n=ship.kbswing.steps; w.api.start(); w.run(300);
  var d=drawsIn(w,1500);
  d.slice(1).forEach(function(x,i){ var step=Math.round(((x.u-d[i].u+1)%1)*n);
    assert.strictEqual(step,1,'a frame was skipped or repeated between u='+d[i].u+' and u='+x.u); });
});

console.log('\nTHE REST CLOCK');
t('while resting the figure moves in true slow motion: a third of the speed, every frame drawn', function(){
  var w=world('backsquat'), n=ship.backsquat.steps, cyc=ship.backsquat.cycleMs; w.api.start(); w.run(400);
  w.rest(true);
  var d=drawsIn(w,3000), adv=0;
  d.slice(1).forEach(function(x,i){ var step=Math.round(((x.u-d[i].u+1)%1)*n); adv+=step;
    assert.strictEqual(step,1,'resting skipped from u='+d[i].u+' to u='+x.u); });
  var want=3000/3/cyc*n;
  assert.ok(Math.abs(adv-want)<=2,'moved '+adv+' frames in 3 s of rest, want about '+want.toFixed(1));
});
t('the rep carries on where it was when the rest starts and when it ends', function(){
  var w=world('backsquat'), n=ship.backsquat.steps; w.api.start(); w.run(700);
  var a=drawsIn(w,300); w.rest(true); var b=drawsIn(w,600); w.rest(false); var c=drawsIn(w,300);
  var all=a.concat(b,c);
  all.slice(1).forEach(function(x,i){ var step=Math.round(((x.u-all[i].u+1)%1)*n);
    assert.ok(step===1,'the phase jumped '+step+' frames at t='+x.t); });
});

console.log('\nSTOPPING');
t('a render restarts the loop without leaving a second one running', function(){
  var w=world('backsquat'); w.api.start(); w.run(300);
  for(var i=0;i<5;i++){ w.api.start(); w.run(37); }
  assert.ok(w.pending()<=1,w.pending()+' wakes pending after five renders');
  var d=drawsIn(w,1000), want=ship.backsquat.steps*1000/ship.backsquat.cycleMs;
  assert.ok(d.length<=want+2,d.length+' frames in a second, want at most '+(want+2));
});
t('stopping the loop leaves no timer or frame pending', function(){
  // Stopped at moments between frames and between a wake and its frame.
  var w=world('sprint');
  [333,7,13,21,29,40].forEach(function(ms){
    w.api.start(); w.run(ms); w.api.stop();
    assert.strictEqual(w.pending(),0,w.pending()+' wakes still pending after stopping '+ms+' ms in');
    var n0=w.us.length; w.run(500);
    assert.strictEqual(w.us.length,n0,'it drew '+(w.us.length-n0)+' frames after it was stopped');
  });
});
t('scrolled out of sight it stops, and comes back where it left off', function(){
  var w=world('backsquat'), io; w.api.start(); w.run(500);
  io=w.io(); assert.ok(io && io.seen.indexOf(w.box)>=0,'the figure is not watched for leaving the screen');
  var u0=w.us[w.us.length-1].u;
  io.cb([{isIntersecting:false,target:w.box}]);
  assert.strictEqual(w.pending(),0,'off screen, '+w.pending()+' wakes still pending');
  var n0=w.us.length; w.run(3000); assert.strictEqual(w.us.length,n0,'it drew off screen');
  io.cb([{isIntersecting:true,target:w.box}]);
  var u1=w.us[w.us.length-1].u, n=ship.backsquat.steps;
  assert.ok(Math.round(((u1-u0+1)%1)*n)<=1,'it came back at u='+u1+', having left at u='+u0);
  var d=drawsIn(w,500); assert.ok(d.length>5,'it did not start again: '+d.length+' frames');
});

console.log('\nTHE STILL');
t('the still is a keyframe the rep rests at, for every rig', function(){
  var w=world('backsquat'), bad=[];
  EX.forEach(function(e){
    var tempo=rig.tempoOf(e), tot=tempo.reduce(function(a,b){ return a+b; },0);
    var u=w.api.still(EXOF[e.id]), acc=0, k=-1;
    for(var i=0;i<tempo.length;i++){ if(Math.abs(acc/tot-u)<1e-9){ k=i; break; } acc+=tempo[i]; }
    var stops=rig.stopsOf(e);
    if(k<0 || (stops.length && stops.indexOf(k)<0)) bad.push(e.id+' (u='+u.toFixed(3)+', keyframe '+k+', stops '+JSON.stringify(stops)+')');
  });
  assert.ok(!bad.length,bad.length+' rigs still mid-movement: '+bad.slice(0,6).join('; '));
});
t('under reduced motion a tap plays one rep at the rig\'s own length, rest clock or not, then holds the still', function(){
  var w=world('plank',{still:true}); w.api.start(); w.rest(true);
  var u0=w.us[w.us.length-1].u; assert.strictEqual(u0,+w.api.still(EXOF.plank).toFixed(3),'the still is not the still');
  w.api.start(true); w.run(ship.plank.cycleMs*0.9);
  assert.ok(w.us.length>20,'the tap did not play it');
  w.run(ship.plank.cycleMs*0.2+200);
  assert.strictEqual(w.us[w.us.length-1].u,u0,'it did not come to rest on the still');
  assert.strictEqual(w.pending(),0,'it kept running after one rep');
});

console.log(fails?('\n'+fails+' rig loop check(s) failed'):'\nrig loop checks passed');
process.exit(fails?1:0);
