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
    var parts=svg.querySelectorAll('[data-p]');
    if(parts.length<8) fails.push(label+': only '+parts.length+' parts of a figure');
    parts.forEach(function(p,j){
      var g=p.getAttribute('d')||p.getAttribute('points')||[p.getAttribute('cx'),p.getAttribute('cy'),p.getAttribute('x'),p.getAttribute('y')].join(',');
      if(!g||g===',,,') fails.push(label+': '+p.getAttribute('data-p')+' has no geometry (drawn as an empty box)');
      else if(/NaN|undefined/.test(g)) fails.push(label+': '+p.getAttribute('data-p')+' has invalid geometry');
    });
  });
  // Side view, back to front: the head sits on the body's midline, so the near
  // arm is drawn over it, with a cut line of panel colour round it. Drawn the
  // other way round, an arm overhead (a triceps extension, a pull-up) vanished
  // behind the head.
  var cards=d.querySelectorAll('.card');
  EX.forEach(function(ex,i){ var svg=cards[i]&&cards[i].querySelector('.figwrap svg'); if(!svg) return;
    var kids=[].slice.call(svg.children), at=function(k){ for(var j=0;j<kids.length;j++) if(kids[j].getAttribute('data-p')===k) return j; return -1; };
    var head=at('head'), hand=at('handN');
    if(head<0||hand<0||head>hand) fails.push(ex.id+': the head is drawn over the near arm (head '+head+', near hand '+hand+')');
    if(hand<0||kids[hand].getAttribute('paint-order')!=='stroke'||kids[hand].getAttribute('stroke')!=='var(--surface-raised)') fails.push(ex.id+': the near arm has no cut line round it');
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
  // The preview draws what the app draws: the same shapes, in the same order,
  // at the same places (to the 0.1 both round to), in both panels. It used to
  // be a second renderer of its own, which drifted from the app's.
  var app2=new Function('hasOwn',cut2('var RL=','function figureSVG(')+';return {RIGMAP:RIGMAP,rigSVG:rigSVG,rigFrontSVG:rigFrontSVG,rSolve:rSolve,rPoseAt:rPoseAt,rigFor:rigFor,rTorsoPts:rTorsoPts};')(function(o,k){ return Object.prototype.hasOwnProperty.call(o,k); });
  function tags(html){ return (html.match(/<[a-z][^>]*>/g)||[]).slice(1); }
  function same(a,b){ var x=a.match(/-?\d+\.?\d*/g)||[], y=b.match(/-?\d+\.?\d*/g)||[];
    if(a.replace(/-?\d+\.?\d*/g,'#')!==b.replace(/-?\d+\.?\d*/g,'#')||x.length!==y.length) return false;
    for(var k=0;k<x.length;k++) if(Math.abs(x[k]-y[k])>0.11) return false; return true; }
  if(typeof w.rigSVG!=='function'||typeof w.rigFrontSVG!=='function') fails.push('the preview does not draw with the app\'s rigSVG and rigFrontSVG');
  else EX.forEach(function(ex){ if(!exOf[ex.id]) return; var mine=w.EXERCISES.filter(function(e){ return e.id===ex.id; })[0], b=w.boxOf(mine);
    for(var k=0;k<6;k++){ var u=k/6;
      [[w.rigSVG(mine,u,b),app2.rigSVG(exOf[ex.id],u),'side'],[ex.front?w.rigFrontSVG(mine,u,b):'',ex.front?app2.rigFrontSVG(exOf[ex.id],u):'','second']].forEach(function(v){
        var p=tags(v[0]), q=tags(v[1]);
        if(p.length!==q.length){ fails.push(ex.id+' u='+u.toFixed(2)+': the preview\'s '+v[2]+' panel has '+p.length+' shapes, the app\'s '+q.length); return; }
        for(var j=0;j<p.length;j++) if(!same(p[j],q[j])){ fails.push(ex.id+' u='+u.toFixed(2)+': the preview\'s '+v[2]+' panel draws '+p[j].slice(0,90)+', the app '+q[j].slice(0,90)); return; } }); } });
  // A spine that bows (bow on a frame: the cat-cow) is drawn bent at
  // mid-spine: the trunk's outline runs through the mid-spine point the rig
  // puts off the straight line by the bow. It used to be one straight
  // segment, so a cat-cow could only pump its hips up and down.
  EX.forEach(function(ex){ if(!ex.frames.some(function(f){ return f.bow; })||!exOf[ex.id]) return;
    var k=ex.frames.reduce(function(a,f,j){ return Math.abs(f.bow||0)>Math.abs(ex.frames[a].bow||0)?j:a; },0), t=rig2(ex,k);
    var a=app2.rSolve(app2.rPoseAt(app2.rigFor(exOf[ex.id]),t)), line={x:(a.hip.x+a.sh.x)/2,y:(a.hip.y+a.sh.y)/2};
    if(Math.abs(Math.hypot(a.mid.x-line.x,a.mid.y-line.y)-Math.abs(ex.frames[k].bow))>0.01) fails.push(ex.id+': the app\'s mid-spine is not off the line by the bow');
    var m=(app2.rigSVG(exOf[ex.id],t).match(/data-p="torso" d="([^"]*)"/)||[])[1];
    if(!m){ fails.push(ex.id+': the app draws no trunk'); return; }
    var drawn=(m.match(/-?[\d.]+,-?[\d.]+/g)||[]).map(function(q){ return q.split(',').map(Number); });
    var want=app2.rTorsoPts(a.hip,a.mid,a.sh), flat=app2.rTorsoPts(a.hip,line,a.sh), off=0;
    want.forEach(function(p,j){ off=Math.max(off,Math.hypot(p.x-flat[j].x,p.y-flat[j].y)); });
    var through=want.every(function(p){ return drawn.some(function(q){ return Math.abs(q[0]-p.x)<0.06&&Math.abs(q[1]-p.y)<0.06; }); });
    if(!through||off<0.8*Math.abs(ex.frames[k].bow)) fails.push(ex.id+': the app draws a bowed spine straight (bent '+off.toFixed(1)+' for a bow of '+ex.frames[k].bow+')');
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
