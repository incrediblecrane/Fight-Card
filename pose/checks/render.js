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
  // And it has to be still running, not merely to have run once.
  var beat=w.document.querySelector('.figwrap svg polygon');
  var before=beat&&beat.getAttribute('points');
  w.setTimeout(function(){ finish(before, beat); }, 260);
}, 700);

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
