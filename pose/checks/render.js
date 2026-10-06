// Renders the real preview in a DOM and asserts every figure actually has
// geometry. Catches "element created but never populated", which is exactly
// how the front views shipped as empty boxes.
var fs=require('fs'), path=require('path');
var file=path.join(__dirname,'..','preview.html');
var JSDOM;
try { JSDOM=require('jsdom').JSDOM; } catch(e){ console.log('=== RENDER CHECK ===\nSKIPPED: jsdom not installed'); process.exit(0); }
var EX=require('../exercises.js');
var dom=new JSDOM(fs.readFileSync(file,'utf8'),{runScripts:'dangerously',pretendToBeVisual:true});
var w=dom.window, fails=[];
/* The whole page animates from ONE requestAnimationFrame loop, and that loop
   re-arms itself at the end of its own body. So a single throw anywhere in it,
   for any one exercise, stops every figure on the page for good: the figures
   still have geometry, they just never move again. A hole left in the
   EXERCISES array by a stray comma did exactly that, and the page looked
   fine in a still. Anything thrown is a failure. */
w.addEventListener('error', function(e){
  fails.push('the page threw, which kills the animation loop for every figure: '+
    ((e.error&&e.error.message)||e.message));
});
setTimeout(function(){
  var d=w.document;
  var expectSide=EX.length, expectFront=EX.filter(function(e){return e.front;}).length;
  var svgs=d.querySelectorAll('.figwrap svg');
  if(svgs.length!==expectSide+expectFront)
    fails.push('expected '+(expectSide+expectFront)+' figures, found '+svgs.length);
  svgs.forEach(function(svg,i){
    var label=svg.getAttribute('aria-label')||('figure '+i);
    var polys=svg.querySelectorAll('polygon'), circles=svg.querySelectorAll('circle');
    if(!polys.length) fails.push(label+': no limb polygons at all');
    polys.forEach(function(p,j){
      var pts=p.getAttribute('points');
      if(!pts) fails.push(label+': polygon '+j+' has no points (drawn as an empty box)');
      else if(/NaN|undefined/.test(pts)) fails.push(label+': polygon '+j+' has invalid points');
    });
    circles.forEach(function(c,j){
      if(c.getAttribute('cx')===null) fails.push(label+': circle '+j+' never positioned');
    });
  });
  // Side view, back to front: the head sits on the body's midline, so the near
  // arm is drawn over it. Drawn the other way round, an arm overhead (a
  // triceps extension, a pull-up) vanished behind the head.
  var cards=d.querySelectorAll('.card');
  EX.forEach(function(ex,i){ var svg=cards[i]&&cards[i].querySelector('.figwrap svg'); if(!svg) return;
    var kids=[].slice.call(svg.children), head=-1, hand=-1, cut=-1;
    kids.forEach(function(k,j){ if(k.tagName!=='circle') return; var r=+k.getAttribute('r'), f=k.getAttribute('fill');
      if(r===8&&head<0) head=j;
      if(Math.abs(r-3.05)<0.01&&f==='var(--surface-raised)') cut=j;
      if(Math.abs(r-3.05)<0.01&&f!=='var(--surface-raised)'&&f!=='var(--text-faint)'&&hand<0) hand=j; });
    if(head<0||hand<0||head>hand) fails.push(ex.id+': the head is drawn over the near arm (head '+head+', near hand '+hand+')');
    if(!(cut>=0&&cut<hand)) fails.push(ex.id+': the near arm has no cut line under it');
  });
  // The preview is cropped as the app crops it (rigBox), so a figure judged in
  // the preview is the size it is in the app: both panels' boxes match.
  var h=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
  function cut2(a,b){ var i=h.indexOf(a), j=h.indexOf(b,i); return h.slice(i,j); }
  var app=new Function('hasOwn',cut2('var RL=','function figureSVG(')+';return {RIGMAP:RIGMAP,rigBox:rigBox};')(function(o,k){ return Object.prototype.hasOwnProperty.call(o,k); });
  var exOf={}; Object.keys(app.RIGMAP).forEach(function(k){ if(!exOf[app.RIGMAP[k]]) exOf[app.RIGMAP[k]]=k; });
  EX.forEach(function(ex,i){ if(!exOf[ex.id]||!cards[i]) return; var b=app.rigBox(exOf[ex.id]), v=cards[i].querySelectorAll('.figwrap svg');
    var want=[b.x+' '+b.y+' '+b.w+' '+b.h,b.fx+' '+b.y+' '+b.fw+' '+b.h];
    [].forEach.call(v,function(svg,k){ var got=svg.getAttribute('viewBox');
      if(got!==want[k]) fails.push(ex.id+': the preview\'s '+(k?'second':'side')+' panel is '+got+', the app draws '+want[k]); });
    var fw=cards[i].querySelector('.figwrap').style.flexGrow;
    if(ex.front&&+fw!==b.w) fails.push(ex.id+': the preview\'s side panel takes '+fw+' of the row, the app '+b.w);
  });
  // A spine that bows (bow on a frame: the cat-cow) is drawn bent at
  // mid-spine, one six-point shape, in the preview and the app alike. The
  // trunk used to be one straight segment, so a cat-cow could only pump its
  // hips up and down.
  var app2=new Function('hasOwn',cut2('var RL=','function figureSVG(')+';return {RIGMAP:RIGMAP,rigSVG:rigSVG,rSolve:rSolve,rPoseAt:rPoseAt,rigFor:rigFor};')(function(o,k){ return Object.prototype.hasOwnProperty.call(o,k); });
  EX.forEach(function(ex,i){ if(!ex.frames.some(function(f){ return f.bow; })||!cards[i]) return;
    var k=ex.frames.reduce(function(a,f,j){ return Math.abs(f.bow||0)>Math.abs(ex.frames[a].bow||0)?j:a; },0), t=rig2(ex,k);
    function bent(svg){ return [].some.call(svg.querySelectorAll('polygon'),function(p){ var q=p.getAttribute('points').trim().split(/\s+/); return q.length===6; }); }
    var div=d.createElement('div'); div.innerHTML=app2.rigSVG(exOf[ex.id],t);
    var a=app2.rSolve(app2.rPoseAt(app2.rigFor(exOf[ex.id]),t));
    if(!bent(div.querySelector('svg'))) fails.push(ex.id+': the app draws a bowed spine straight');
    if(Math.abs(Math.hypot(a.mid.x-(a.hip.x+a.sh.x)/2,a.mid.y-(a.hip.y+a.sh.y)/2)-Math.abs(ex.frames[k].bow))>0.01) fails.push(ex.id+': the app\'s mid-spine is not off the line by the bow');
    if(!bent(cards[i].querySelector('.figwrap svg'))) fails.push(ex.id+': the preview draws a bowed spine straight');
  });
  // And it has to be still running, not merely to have run once.
  var beat=w.document.querySelector('.figwrap svg polygon');
  var before=beat&&beat.getAttribute('points');
  w.setTimeout(function(){ finish(before, beat); }, 260);
}, 700);

// Where in the rep (0 to 1) keyframe k falls.
function rig2(ex,k){ var t=ex.tempo||ex.frames.map(function(){ return 1; }), a=0, tot=t.reduce(function(x,y){ return x+y; },0);
  for(var i=0;i<k;i++) a+=t[i]; return a/tot; }
function finish(before, beat){
  var svgs=w.document.querySelectorAll('.figwrap svg');
  var expectSide=EX.length, expectFront=EX.filter(function(e){return e.front;}).length;
  if(beat && beat.getAttribute('points')===before && !fails.length)
    fails.push('no figure moved between two ticks: the animation loop is not running');
  console.log('=== RENDER CHECK ===');
  if(!fails.length) console.log('PASS: all '+svgs.length+' figures ('+expectSide+' side, '+expectFront+' front) have real geometry.');
  else { console.log('FAILURES ('+fails.length+'):'); var seen={};
    fails.forEach(function(f){ var k=f.replace(/\d+/g,'#'); if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
  process.exit(fails.length?1:0);
}
