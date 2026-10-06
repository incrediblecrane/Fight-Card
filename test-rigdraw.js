// How the app draws a figure, headless: what lies in front of what, that the
// whole figure stays inside its panel through the rep, the panels' sizes, and
// the floor and props standing out from the panel in both themes. The
// renderer is pulled out of the shipped index.html (or the file named on the
// command line), so this tests what ships. Usage: node test-rigdraw.js [index.html]
var fs=require('fs'), assert=require('assert');
var h=fs.readFileSync(process.argv[2]||(__dirname+'/index.html'),'utf8');
function cut(a,b){ var i=h.indexOf(a), j=h.indexOf(b,i); if(i<0||j<0) throw new Error('could not find '+a+' .. '+b+' in index.html'); return h.slice(i,j); }
var app=new Function('hasOwn',cut('var RL=','function figureSVG(')+
  ';return {RL:RL,RGROUND:RGROUND,RIGFRAMES:RIGFRAMES,RIGMAP:RIGMAP,rigFor:rigFor,rSolve:rSolve,rPoseAt:rPoseAt,rSolveFront:rSolveFront,rFrontAt:rFrontAt,rigSVG:rigSVG,rigFrontSVG:rigFrontSVG,rigBox:rigBox,figPairStyle:figPairStyle,rFootPts:rFootPts,rStillU:typeof rStillU==="function"?rStillU:null};')
  (function(o,k){ return Object.prototype.hasOwnProperty.call(o,k); });
var EXOF={}; Object.keys(app.RIGMAP).forEach(function(k){ if(!EXOF[app.RIGMAP[k]]) EXOF[app.RIGMAP[k]]=k; });
var RIGS=Object.keys(app.RIGFRAMES).filter(function(id){ return EXOF[id]; });

var fails=0;
function t(name,fn){ try{ fn(); console.log('  PASS  '+name); }
  catch(e){ fails++; console.log('  FAIL  '+name+'\n        '+e.message); } }

// The drawing as a list of shapes, in paint order.
function shapes(svg){
  return (svg.match(/<[a-z][^>]*>/g)||[]).map(function(tag){
    var a={}; tag.replace(/([\w:-]+)="([^"]*)"/g,function(m,k,v){ a[k]=v; return m; });
    return {n:tag.match(/^<([\w:-]+)/)[1], a:a};
  });
}
function num(v){ return +v; }
// The points a path passes through, its curves and arcs sampled: the
// figure's parts are capsules (two arcs) and smooth closed curves.
function pathPts(d){
  var tk=d.match(/[MLCQAZ]|-?[\d.]+/g)||[], i=0, c=null, pts=[], p=[0,0], o=[0,0];
  function n(){ return +tk[i++]; }
  while(i<tk.length){ if(/[MLCQAZ]/.test(tk[i])) c=tk[i++];
    if(c==='Z'){ p=o; continue; }
    if(c==='M'||c==='L'){ p=[n(),n()]; if(c==='M') o=p; pts.push(p); }
    else if(c==='Q'||c==='C'){ var q=[p]; for(var k=0;k<(c==='Q'?2:3);k++) q.push([n(),n()]);
      for(var j=1;j<=12;j++){ var s=j/12, r=q.slice(); while(r.length>1){ var z=[]; for(var m=0;m+1<r.length;m++) z.push([r[m][0]+(r[m+1][0]-r[m][0])*s,r[m][1]+(r[m+1][1]-r[m][1])*s]); r=z; } pts.push(r[0]); }
      p=q[q.length-1]; }
    else if(c==='A'){ var rad=n(); n(); n(); var big=n(), sw=n(), e=[n(),n()];
      // A circular arc: its centre from the two ends, the radius and the flags.
      var mx=(p[0]-e[0])/2, my=(p[1]-e[1])/2, h2=Math.max(0,rad*rad/(mx*mx+my*my||1)-1), f=Math.sqrt(h2)*(big===sw?-1:1);
      var cx=(p[0]+e[0])/2+f*my, cy=(p[1]+e[1])/2-f*mx, a0=Math.atan2(p[1]-cy,p[0]-cx), a1=Math.atan2(e[1]-cy,e[0]-cx), da=a1-a0;
      if(sw&&da<0) da+=2*Math.PI; if(!sw&&da>0) da-=2*Math.PI;
      var rr=Math.hypot(p[0]-cx,p[1]-cy);
      for(var j2=1;j2<=16;j2++) pts.push([cx+rr*Math.cos(a0+da*j2/16),cy+rr*Math.sin(a0+da*j2/16)]);
      p=e; }
    else i++; }
  return pts;
}
// Every point a shape covers the edge of, stroke included.
function extent(s){
  var a=s.a, sw=(+a['stroke-width']||0)/2, pts=[], r=0;
  if(s.n==='polygon') pts=a.points.split(' ').map(function(p){ return p.split(',').map(num); });
  else if(s.n==='circle'){ r=+a.r; pts=[[+a.cx,+a.cy]]; }
  else if(s.n==='ellipse'){ pts=[[+a.cx-(+a.rx),+a.cy-(+a.ry)],[+a.cx+(+a.rx),+a.cy+(+a.ry)]]; }
  else if(s.n==='line') pts=[[+a.x1,+a.y1],[+a.x2,+a.y2]];
  else if(s.n==='path') pts=pathPts(a.d);
  else if(s.n==='rect'){ var x=+a.x, y=+a.y, w=+a.width, hh=+a.height, m=(a.transform||'').match(/rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)/);
    pts=[[x,y],[x+w,y],[x+w,y+hh],[x,y+hh]];
    if(m){ var g=m[1]*Math.PI/180, cx=+m[2], cy=+m[3]; pts=pts.map(function(p){ var dx=p[0]-cx, dy=p[1]-cy; return [cx+dx*Math.cos(g)-dy*Math.sin(g), cy+dx*Math.sin(g)+dy*Math.cos(g)]; }); } }
  else return null;
  var e={x0:1e9,x1:-1e9,y0:1e9,y1:-1e9}, k=r+sw;
  pts.forEach(function(p){ e.x0=Math.min(e.x0,p[0]-k); e.x1=Math.max(e.x1,p[0]+k); e.y0=Math.min(e.y0,p[1]-k); e.y1=Math.max(e.y1,p[1]+k); });
  return e;
}
function vbOf(svg){ var v=svg.match(/viewBox="([^"]*)"/)[1].split(' ').map(num); return {x:v[0],y:v[1],w:v[2],h:v[3]}; }
function near(p,q){ return Math.abs(+p.a.cx-q.x)<0.06 && Math.abs(+p.a.cy-q.y)<0.06; }
function idx(list,fn){ for(var i=0;i<list.length;i++) if(fn(list[i])) return i; return -1; }
// A part of the figure, by the name it is drawn with (data-p): torso, head,
// handN (the near hand), thighF (the far thigh), upperL (a front left upper arm).
function part(n){ return function(p){ return p.a['data-p']===n; }; }
function rex(id){ return app.rigFor(EXOF[id]); }

console.log('\nWHAT LIES IN FRONT OF WHAT');
t('side view: the near arm is drawn over the head, in every rig', function(){
  var bad=[];
  RIGS.forEach(function(id){ var ex=rex(id), u=0.3, s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigSVG(EXOF[id],u));
    var head=idx(sh,part('head'));
    var hand=idx(sh,part('handN'));
    if(head<0||hand<0||head>hand) bad.push(id+' (head '+head+', near hand '+hand+')'); });
  assert.ok(!bad.length,'the head covers the near arm in '+bad.length+': '+bad.slice(0,8).join(', '));
});
// A cut line is a rim of panel colour painted under each near part's own
// fill (paint-order stroke), so an arm crossing the body or passing the head
// stays visible, in both views. It used to be a second copy of the arm.
function cutLine(p){ return p.a.stroke==='var(--surface-raised)'&&+p.a['stroke-width']>=2&&p.a['paint-order']==='stroke'; }
t('the near arm has a cut line of panel colour round it, so it shows against the body, in both views', function(){
  var bad=[];
  RIGS.forEach(function(id){ var u=0.3, sh=shapes(app.rigSVG(EXOF[id],u)), torso=idx(sh,part('torso'));
    ['upperN','foreN','handN'].forEach(function(k){ var j=idx(sh,part(k)); if(j<=torso||!cutLine(sh[j])) bad.push(id+' '+k); });
    if(!rex(id).front) return; var fs2=shapes(app.rigFrontSVG(EXOF[id],u));
    ['upperL','foreL','handL','upperR','foreR','handR'].forEach(function(k){ var j=idx(fs2,part(k)); if(j<0||!cutLine(fs2[j])) bad.push(id+' front '+k); }); });
  assert.ok(!bad.length,'no cut line on '+bad.length+' parts: '+bad.slice(0,8).join(', '));
});
// An implement in the near hand hid behind the body (a lateral raise's
// dumbbell) when it was drawn before it. It goes in front of the body and the
// near leg, but behind the head it hangs past at the top of a press and under
// the arm whose hand holds it.
t('side view: the implement in the near hand is drawn over the body, under the head and the near arm', function(){
  ['goblet','raise_lateral','suitcasecarry','triceps_ext'].forEach(function(id){ var ex=rex(id), s=app.rSolve(app.rPoseAt(ex,0.4)), sh=shapes(app.rigSVG(EXOF[id],0.4));
    var arm=idx(sh,part('handN'));
    var head=idx(sh,part('head'));
    var torso=idx(sh,part('torso'));
    var leg=idx(sh,part('shinN'));
    var bell=idx(sh,function(p){ return p.a.fill==='var(--text-soft)'||p.a.stroke==='var(--text-soft)'; });
    assert.ok(bell>torso&&bell>leg,id+': the implement (shape '+bell+') is under the body ('+torso+') or the near leg ('+leg+')');
    assert.ok(bell<head&&bell<arm,id+': the implement (shape '+bell+') is over the head ('+head+') or the near arm ('+arm+')'); });
  ['pullup','bench'].forEach(function(id){ var ex=rex(id), s=app.rSolve(app.rPoseAt(ex,0.4)), sh=shapes(app.rigSVG(EXOF[id],0.4));
    var arm=idx(sh,part('handN'));
    var bar=idx(sh,function(p){ return p.a.fill==='var(--text-soft)'||p.a.stroke==='var(--text-soft)'; });
    assert.ok(bar>arm,id+': the bar (shape '+bar+') is under the hands ('+arm+')'); });
});
// A kettlebell lies where the bell rule puts it on the fist (rBellAt): over
// the body a racked bell left a grey disc on the belly, away from the hand, so
// while its hand is above the hip it sits behind the body; hanging in a swing
// or the bottom of a clean it stays in front of the body and the near leg.
// A pinched plate hung behind the near arm and leg, so the side view was a
// figure standing empty handed, and both views hung it from its hub as if
// held by a handle. It hangs from the fist by its rim, over the arm.
t('a pinched plate hangs from the fist by its rim, drawn over the near arm', function(){
  var ex=rex('platepinch'), s=app.rSolve(app.rPoseAt(ex,0.3)), sh=shapes(app.rigSVG(EXOF.platepinch,0.3));
  var hand=idx(sh,part('handN'));
  var plate=idx(sh,function(p){ return p.a.fill==='var(--text-soft)'||p.a.stroke==='var(--text-soft)'; });
  assert.ok(plate>hand,'the plate (shape '+plate+') is under the near arm ('+hand+')');
  var e=extent(sh[plate]), top=e.y0+1.5, bot=e.y1-1.5;
  assert.ok(top<s.handN.y && s.handN.y-top<=5 && bot>s.handN.y+18,'plate runs '+top+' to '+bot+', fist at y '+s.handN.y.toFixed(1));
  var f=app.rSolveFront(app.rFrontAt(ex,0.3)), fs=shapes(app.rigFrontSVG(EXOF.platepinch,0.3));
  var disc=fs.filter(function(p){ return p.n==='circle'&&p.a.stroke==='var(--text-soft)'; });
  assert.equal(disc.length,2,'one plate per hand');
  disc.forEach(function(d,i){ var h=i?f.handR:f.handL;
    assert.ok(Math.abs(+d.a.cx-h.x)<0.06 && +d.a.cy-h.y>=5,'plate centre '+d.a.cy+' against the fist at '+h.y.toFixed(1)); });
});
t('side view: a kettlebell held above the hip is drawn behind the body, one hanging below it in front', function(){
  var seen={};
  ['kbswing','kb_clean','kb_snatch','kb_press','kb_bottomsup','kb_tgu'].forEach(function(id){ for(var i=0;i<24;i++){ var u=i/24, ex=rex(id), s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigSVG(EXOF[id],u));
    var torso=idx(sh,part('torso'));
    var leg=idx(sh,part('shinN'));
    var arm=idx(sh,part('handN'));
    var bell=idx(sh,function(p){ return p.a.fill==='var(--text-soft)'; });
    var up=s.handN.y<s.hip.y; seen[up]=1;
    if(up) assert.ok(bell<torso,id+' u='+u.toFixed(2)+': the hand is above the hip but the bell (shape '+bell+') is over the body ('+torso+')');
    else assert.ok(bell>torso&&bell>leg&&bell<arm,id+' u='+u.toFixed(2)+': the bell hangs below the hip but is shape '+bell+' (body '+torso+', near leg '+leg+', arm '+arm+')'); } });
  assert.ok(seen['true']&&seen['false'],'no kettlebell rig is seen both above and below the hip');
});
// A one-handed lift (load) carries its one implement in that hand in the
// second panel. The kettlebell used to be drawn half way between the two
// hands, on the belly while the working hand was overhead, and a suitcase
// carry showed a dumbbell in each hand, which is a farmer's carry.
t('second panel: a one-handed lift carries its one implement in the loaded hand', function(){
  var seen=0;
  RIGS.forEach(function(id){ var ex=rex(id); if(!ex.load||!ex.front) return; seen++;
    for(var i=0;i<24;i++){ var u=i/24, f=app.rSolveFront(app.rFrontAt(ex,u)), h=ex.load==='L'?f.handL:f.handR;
      shapes(app.rigFrontSVG(EXOF[id],u)).forEach(function(p){
        if(p.a.fill!=='var(--text-soft)'&&p.a.stroke!=='var(--text-soft)') return;
        var e=extent(p), c={x:(e.x0+e.x1)/2, y:(e.y0+e.y1)/2}, dd=Math.hypot(c.x-h.x,c.y-h.y);
        assert.ok(dd<=14,id+' u='+u.toFixed(2)+': a '+p.n+' of the implement is '+dd.toFixed(1)+' from the loaded hand ('+ex.load+')'); }); } });
  assert.ok(seen>=7,'only '+seen+' rigs name a loaded hand');
});
t('front view: the arms are drawn over the head, unless the rig holds them behind it', function(){
  function order(id,u){ var ex=rex(id), f=app.rSolveFront(app.rFrontAt(ex,u)), sh=shapes(app.rigFrontSVG(EXOF[id],u));
    var head=idx(sh,part('head'));
    var elb=idx(sh,part('foreL'));
    return head-elb; }
  assert.ok(order('jabcross',0.25)<0,'the jab is drawn behind the head');
  assert.ok(order('ohp',0.5)<0,'the press is drawn behind the head');
  assert.ok(rex('triceps_ext').behindHead,'the triceps extension lost behindHead');
  assert.ok(order('triceps_ext',0.5)>0,'the triceps extension\'s forearms are drawn over the head they go behind');
});
t('front view: a knee raised above its hip is drawn over the body, a standing leg behind it', function(){
  [['press_incline',0.3,true],['backsquat',0,false]].forEach(function(c){ var ex=rex(c[0]), f=app.rSolveFront(app.rFrontAt(ex,c[1])), sh=shapes(app.rigFrontSVG(EXOF[c[0]],c[1]));
    var torso=idx(sh,part('torso'));
    var knee=idx(sh,part('shinL'));
    assert.ok(c[2]===f.kneeL.y<f.hipL.y-1,c[0]+': the knee is not where this case needs it');
    assert.strictEqual(knee>torso,c[2],c[0]+': knee shape '+knee+', body '+torso); });
});
t('front view: the stick goes behind the body once the dislocate takes it behind the back', function(){
  var ex=rex('shoulderdisloc'), seen={};
  for(var i=0;i<24;i++){ var u=i/24, s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigFrontSVG(EXOF.shoulderdisloc,u));
    var bar=idx(sh,function(p){ return p.n==='rect'&&p.a.height==='5'; });
    var f=app.rSolveFront(app.rFrontAt(ex,u)), torso=idx(sh,part('torso'));
    var back=s.handN.x<s.hip.x; seen[back]=1;
    assert.strictEqual(bar<torso,back,'at u='+u.toFixed(2)+' the hands are '+(back?'behind':'in front of')+' the hip but the stick is drawn '+(bar<torso?'behind':'over')+' the body'); }
  assert.ok(seen['true']&&seen['false'],'the dislocate never takes the stick both in front and behind');
});

// A woodchopper and a Pallof press are one cable to one handle in both
// hands (anchorFront [x,y]). The front view drew two cables from opposite
// sides, a cable crossover, and a Pallof press's two cables cancelled the
// rotation the exercise is about. From the side the Pallof cable runs toward
// the camera, so only its handle shows.
t('a single cable is one line from its anchor to one handle between the hands', function(){
  ['woodchopper','palloffpress'].forEach(function(id){ var ex=rex(id);
    assert.strictEqual(ex.anchorFront.length,2,id+' has '+ex.anchorFront.length/2+' anchors');
    for(var i=0;i<12;i++){ var u=i/12, f=app.rSolveFront(app.rFrontAt(ex,u)), sh=shapes(app.rigFrontSVG(EXOF[id],u));
      var lines=sh.filter(function(p){ return p.n==='line'&&p.a.stroke==='var(--text-soft)'; }), m={x:(f.handL.x+f.handR.x)/2,y:(f.handL.y+f.handR.y)/2};
      assert.strictEqual(lines.length,1,id+' u='+u.toFixed(2)+': '+lines.length+' cables');
      assert.ok(+lines[0].a.x1===ex.anchorFront[0]&&+lines[0].a.y1===ex.anchorFront[1],id+': the cable does not start at its anchor');
      assert.ok(Math.hypot(lines[0].a.x2-m.x,lines[0].a.y2-m.y)<0.1,id+' u='+u.toFixed(2)+': the cable ends '+lines[0].a.x2+','+lines[0].a.y2+', not between the hands'); } });
  assert.ok(!rex('palloffpress').anchorAt,'the Pallof press cable runs back to an anchor behind the lifter');
  var ps=shapes(app.rigSVG(EXOF.palloffpress,0.4)), s=app.rSolve(app.rPoseAt(rex('palloffpress'),0.4));
  assert.ok(!ps.some(function(p){ return p.n==='line'&&p.a.stroke==='var(--text-soft)'; }),'the Pallof press side view draws a cable');
  assert.ok(ps.some(function(p){ return p.n==='rect'&&Math.abs(+p.a.x+2.5-s.handN.x)<0.06&&Math.abs(+p.a.y+6.5-s.handN.y)<0.06; }),'the Pallof press side view has no handle in the hand');
});
// A slam drives the ball into the floor: it leaves the hands at the bottom
// (ballAt), where it used to stay in them.
t('a ball let go of is drawn where the rig puts it, not in the hands', function(){
  var ex=rex('medballslam'), k=ex.frames.map(function(f){ return !!f.ballAt; }).indexOf(true), tot=ex.tempo.reduce(function(a,b){ return a+b; },0), u=0;
  assert.ok(k>=0,'the slam never lets go of the ball'); for(var i=0;i<k;i++) u+=ex.tempo[i]/tot;
  var fb=ex.front[k].ballFront;
  assert.ok(fb,'the slam\'s second panel keeps the ball in the hands');
  [[app.rigSVG,ex.frames[k].ballAt],[app.rigFrontSVG,fb]].forEach(function(v,j){ var b=v[1], sh=shapes(v[0](EXOF.medballslam,u));
    assert.ok(sh.some(function(p){ return p.n==='circle'&&+p.a.r===11&&Math.abs(+p.a.cx-b[0])<0.06&&Math.abs(+p.a.cy-b[1])<0.06; }),(j?'front':'side')+': no ball at '+b); });
});
// Skipping turns a rope: two strands from the hands from the side, an arch
// between the hands from the front, over the head as the feet land.
t('skipping draws its rope from the hands, overhead as it lands', function(){
  var ex=rex('skipping'); assert.strictEqual(ex.equip,'rope','skipping has no rope');
  for(var i=0;i<16;i++){ var u=i/16, s=app.rSolve(app.rPoseAt(ex,u)), f=app.rSolveFront(app.rFrontAt(ex,u));
    var side=shapes(app.rigSVG(EXOF.skipping,u)).filter(function(p){ return p.n==='path'&&!p.a['data-p']&&!p.a['data-g']; }), front=shapes(app.rigFrontSVG(EXOF.skipping,u)).filter(function(p){ return p.n==='path'&&!p.a['data-p']&&!p.a['data-g']; });
    assert.strictEqual(side.length,2,'u='+u+': '+side.length+' strands');
    [s.handF,s.handN].forEach(function(h,j){ assert.ok(side[j].a.d.indexOf('M'+h.x.toFixed(1)+' '+h.y.toFixed(1))===0,'u='+u+': a strand does not start at a hand'); });
    assert.strictEqual(front.length,2,'u='+u+': the front rope changes its shapes');
    var arch=front.filter(function(p){ return / Q/.test(p.a.d); });
    assert.strictEqual(arch.length,1,'u='+u+': '+arch.length+' arches');
    var ys=(arch[0].a.d.match(/-?[\d.]+ -?[\d.]+/g)||[]).map(function(x){ return +x.split(' ')[1]; });
    assert.ok(arch[0].a.d.indexOf('M'+f.handL.x.toFixed(1)+' '+f.handL.y.toFixed(1))===0&&/ -?[\d.]+ -?[\d.]+$/.test(arch[0].a.d)&&Math.abs(ys[ys.length-1]-f.handR.y)<0.06,'u='+u+': the arch does not run between the hands'); }
  var s0=app.rSolveFront(app.rFrontAt(ex,0)), a0=shapes(app.rigFrontSVG(EXOF.skipping,0)).filter(function(p){ return p.n==='path'&&!p.a['data-p']&&!p.a['data-g']&&/ Q/.test(p.a.d); })[0];
  var top=Math.min.apply(null,(a0.a.d.match(/-?[\d.]+ -?[\d.]+/g)||[]).map(function(x){ return +x.split(' ')[1]; }));
  assert.ok(top<s0.head.y,'as the feet land the rope is at y '+top+', not over the head at '+s0.head.y.toFixed(1));
});

console.log('\nTHE FIGURE STAYS IN ITS PANEL');
// Each panel's box, at 96 moments of every rep. The floor is drawn wider on
// purpose (it runs the width of the panel) and is left out.
function outside(svg){
  var vb=vbOf(svg), worst=null;
  shapes(svg).slice(1).forEach(function(p){ if(p.n==='line'&&+p.a.y1===app.RGROUND&&+p.a.y2===app.RGROUND) return;
    var e=extent(p); if(!e) return;
    var o=Math.max(vb.y-e.y0, e.y1-(vb.y+vb.h), vb.x-e.x0, e.x1-(vb.x+vb.w));
    if(o>0.05&&(!worst||o>worst.o)) worst={o:o,n:p.n,e:e}; });
  return {vb:vb,worst:worst};
}
t('every rig\'s side view stays inside its box all through the rep (the top of a pull-up, a jump\'s hands)', function(){
  var bad=[];
  RIGS.forEach(function(id){ for(var i=0;i<96;i++){ var r=outside(app.rigSVG(EXOF[id],i/96));
    if(r.worst){ bad.push(id+' u='+(i/96).toFixed(2)+' '+r.worst.n+' '+r.worst.o.toFixed(1)+' out'); break; } } });
  assert.ok(!bad.length,bad.length+' rigs leave the box: '+bad.slice(0,10).join('; '));
});
t('every rig\'s second panel stays inside its box top and bottom all through the rep', function(){
  var bad=[];
  RIGS.forEach(function(id){ if(!rex(id).front) return; for(var i=0;i<96;i++){ var svg=app.rigFrontSVG(EXOF[id],i/96), vb=vbOf(svg), w=null;
    shapes(svg).slice(1).forEach(function(p){ if(p.n==='line'&&+p.a.y1===app.RGROUND&&+p.a.y2===app.RGROUND) return; var e=extent(p); if(!e) return;
      var o=Math.max(vb.y-e.y0, e.y1-(vb.y+vb.h)); if(o>0.05&&(!w||o>w.o)) w={o:o,n:p.n}; });
    if(w){ bad.push(id+' u='+(i/96).toFixed(2)+' '+w.n+' '+w.o.toFixed(1)+' out'); break; } } });
  assert.ok(!bad.length,bad.length+' rigs leave the box: '+bad.slice(0,10).join('; '));
});
// A jumping jack's arms reach out sideways at shoulder height, past a 100
// wide panel: a rig gives its second panel a width (frontW), centred on the
// body, and the pair keeps one scale. The hands used to be cut off.
// The lateral raise's hand grazes the edge by under a unit at the top; it
// gets its width with the other arm sweeps.
var WIDE={raise_lateral:1};
t('a second panel is wide enough for arms out to the sides', function(){
  var bad=[], wideWarn=[];
  RIGS.forEach(function(id){ if(!rex(id).front) return; for(var i=0;i<96;i++){ var svg=app.rigFrontSVG(EXOF[id],i/96), vb=vbOf(svg), w=null;
    // Cables run off to anchors beyond the panel, and props and the floor
    // span it, on purpose.
    shapes(svg).slice(1).forEach(function(p){ if(p.n==='line'||p.n==='rect') return; var e=extent(p); if(!e) return;
      var o=Math.max(vb.x-e.x0, e.x1-(vb.x+vb.w)); if(o>0.5&&(!w||o>w.o)) w={o:o,n:p.n}; });
    if(w){ (WIDE[id]?wideWarn:bad).push(id+' u='+(i/96).toFixed(2)+' '+w.n+' '+w.o.toFixed(1)+' out'); break; } } });
  if(wideWarn.length) console.log('        WARN (listed, the arm sweeps still to re-author): '+wideWarn.join('; '));
  assert.ok(!bad.length,bad.length+' second panels cut off a limb at the side: '+bad.slice(0,10).join('; '));
  var jj=app.rigBox(EXOF.jumpingjack), st=app.figPairStyle(EXOF.jumpingjack);
  assert.ok(jj.fw>100&&st.indexOf('minmax(0,'+jj.fw+'fr)')>-1&&st.indexOf('--fig-arf:'+jj.fw+'/'+jj.h)>-1,'the jack\'s wide second panel is not sized to its width: '+st);
});
t('both panels share one top and one height, so they are drawn at one scale', function(){
  RIGS.forEach(function(id){ if(!rex(id).front) return; var a=vbOf(app.rigSVG(EXOF[id],0)), b=vbOf(app.rigFrontSVG(EXOF[id],0));
    assert.ok(a.y===b.y&&a.h===b.h,id+': side '+JSON.stringify(a)+', front '+JSON.stringify(b)); });
  var st=app.figPairStyle(EXOF.pullup), bx=app.rigBox(EXOF.pullup);
  assert.ok(bx.y<18,'the pull-up still starts its box at '+bx.y);
  assert.ok(st.indexOf('--fig-ar:'+bx.w+'/'+bx.h)>-1&&st.indexOf('--fig-arf:100/'+bx.h)>-1,'the panels\' shapes do not follow the box: '+st);
  var sq=app.rigBox(EXOF.backsquat);
  assert.ok(sq.y===18&&sq.h===168,'a squat, which fits, moved its box to '+JSON.stringify(sq));
});

console.log('\nSIZE AND CONTRAST');
var css=h.slice(h.indexOf(':root{'),h.indexOf('</style>')).replace(/\\\n/g,'\n');
t('the figure grows with a tablet\'s screen, and the side panel keeps the front\'s scale', function(){
  assert.ok(/\.fig-wrap\{[^}]*--fig-cap:clamp\(155px,\s*min\(34vw,\s*calc\(\(100vh - \d+px\) \* 0\.5\d\)\),\s*260px\)/.test(css),'no cap on .fig-wrap that grows with the width and is bounded by the height (test-slideview measures it)');
  assert.ok(/\.fig-pair \.fig-wrap>div\{[^}]*max-width:var\(--fig-cap\)/.test(css),'the front panel is not capped by --fig-cap');
  assert.ok(/\.fig-pair \.fig-wrap:first-child>div\{max-width:calc\(var\(--fig-cap\) \* var\(--fig-w,1\)\)/.test(css),'the side panel is not capped in proportion');
  assert.ok(/--fig-w:1\.\d{3}/.test(app.figPairStyle(EXOF.bench)),'the bench\'s wide crop has no --fig-w: '+app.figPairStyle(EXOF.bench));
});
t('the floor runs the full width of the panel', function(){
  var sh=shapes(app.rigSVG(EXOF.backsquat,0)), vb=vbOf(app.rigSVG(EXOF.backsquat,0)), g=sh[sh[1].a['data-p']==='shadow'?2:1];
  assert.ok(g.n==='line'&&g.a.stroke==='var(--ground)','the floor is not drawn first, under all but the shadow');
  assert.ok(+g.a.x1<vb.x-100&&+g.a.x2>vb.x+vb.w+100,'the floor stops at '+g.a.x1+'..'+g.a.x2);
  assert.ok(/\.fig-wrap\{[^}]*overflow:hidden/.test(css)&&/\.fig-wrap svg\{[^}]*overflow:visible/.test(css),'the panel does not let the floor out of the svg and clip it');
});
function lum(hex){ return [1,3,5].map(function(i){ var v=parseInt(hex.substr(i,2),16)/255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); })
  .reduce(function(a,c,i){ return a+c*[0.2126,0.7152,0.0722][i]; },0); }
function ratio(a,b){ var x=lum(a), y=lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
function tokens(block){ var o={}; block.replace(/--([\w-]+):(#[0-9A-Fa-f]{6})/g,function(m,k,v){ o[k]=v; return m; }); return o; }
t('the floor and the props stand out from the panel at 3:1 or more, light and dark', function(){
  var light=tokens(css.slice(0,css.indexOf('}'))), i=css.indexOf(':root[data-theme=dark]{'), dark=tokens(css.slice(i,css.indexOf('}',i)));
  var j=css.indexOf(':root:not([data-theme=light]){'), auto=tokens(css.slice(j,css.indexOf('}',j)));
  [['light',light],['dark',dark],['dark (system)',auto]].forEach(function(th){ ['ground','prop'].forEach(function(k){
    assert.ok(th[1][k],'no --'+k+' in the '+th[0]+' theme');
    var c=ratio(th[1][k],th[1]['surface-raised']);
    assert.ok(c>=3,'--'+k+' is '+c.toFixed(2)+':1 against the panel in the '+th[0]+' theme'); }); });
  var sq=shapes(app.rigSVG(EXOF.backsquat,0)).filter(function(p){ return p.n==='line'; })[0], bn=shapes(app.rigSVG(EXOF.bench,0)).filter(function(p){ return p.n==='rect'; })[0];
  assert.strictEqual(sq.a.stroke,'var(--ground)','the floor is drawn in '+sq.a.stroke);
  assert.strictEqual(bn.a.stroke,'var(--prop)','the bench is edged in '+bn.a.stroke);
  var pl=shapes(app.rigFrontSVG(EXOF.bench,0)).filter(function(p){ return p.n==='rect'; })[0];
  assert.strictEqual(pl.a.stroke,'var(--prop)','the bench from above is edged in '+pl.a.stroke);
});

console.log('\nTHE FIGURE\'S SHAPES');
// The figure used to be a mannequin: straight-sided limbs, a round head with
// no face, no neck, a trunk the same width all the way down. Which way it
// faced, where the chest was and where an arm crossed the body were guesses.
function pts(sh,k){ var j=idx(sh,part(k)); assert.ok(j>=0,'no '+k+' drawn'); return pathPts(sh[j].a.d); }
function facing(s){ var dx=s.sh.x-s.hip.x, dy=s.sh.y-s.hip.y, l=Math.hypot(dx,dy); return {x:-dy/l, y:dx/l}; }
t('side view: the head has a face, turned the way the figure faces (ahead standing, down in a push-up, up on a bench)', function(){
  [['backsquat',0,'x',1],['pushup',0.5,'y',1],['bench',0,'y',-1]].forEach(function(c){
    var s=app.rSolve(app.rPoseAt(rex(c[0]),c[1])), f=facing(s), P=pts(shapes(app.rigSVG(EXOF[c[0]],c[1])),'head');
    assert.ok(f[c[2]]*c[3]>0.5,c[0]+': the trunk does not face the way this case needs');
    var fwd=-1e9, bk=-1e9; P.forEach(function(p){ var q=(p[0]-s.head.x)*f.x+(p[1]-s.head.y)*f.y; fwd=Math.max(fwd,q); bk=Math.max(bk,-q); });
    assert.ok(fwd-bk>=0.5,c[0]+': the head reaches '+fwd.toFixed(1)+' ahead and '+bk.toFixed(1)+' behind, so it has no face'); });
});
t('a neck joins the head to the shoulders, in both views', function(){
  RIGS.forEach(function(id){ var ex=rex(id), s=app.rSolve(app.rPoseAt(ex,0.3)), P=pts(shapes(app.rigSVG(EXOF[id],0.3)),'neck');
    function reach(q){ return Math.min.apply(null,P.map(function(p){ return Math.hypot(p[0]-q.x,p[1]-q.y); })); }
    assert.ok(reach(s.sh)<4&&reach(s.head)<app.RL.HEAD_R,id+': the neck does not run from the shoulders to the head');
    if(ex.front) pts(shapes(app.rigFrontSVG(EXOF[id],0.3)),'neck'); });
});
// A capsule's arcs: the first round its end, the second round its root.
function radii(sh,k){ var j=idx(sh,part(k)); assert.ok(j>=0,'no '+k+' drawn'); return (sh[j].a.d.match(/A[\d.]+/g)||[]).map(function(a){ return +a.slice(1); }); }
// An outline may stray 0.6 past its radius: the end of an arc near half a
// circle, rounded to 0.1, moves its centre a few tenths, in the browser too.
t('limbs taper from the root to the end and follow their joints, in both views', function(){
  RIGS.forEach(function(id){ var ex=rex(id), u=0.3, s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigSVG(EXOF[id],u));
    [['thighN',s.hip,s.kneeN],['shinN',s.kneeN,s.ankN],['upperN',s.sh,s.elbN],['foreN',s.elbN,s.handN],['thighF',s.hipF,s.kneeF],['upperF',s.shF,s.elbF]].forEach(function(c){
      var r=radii(sh,c[0]); assert.ok(r.length===2&&r[1]>r[0],id+' '+c[0]+': not a tapered capsule ('+r+')');
      var A=c[1], B=c[2], dx=B.x-A.x, dy=B.y-A.y, L2=dx*dx+dy*dy||1;
      pts(sh,c[0]).forEach(function(p){ var k=Math.max(0,Math.min(1,((p[0]-A.x)*dx+(p[1]-A.y)*dy)/L2)), d=Math.hypot(p[0]-A.x-dx*k,p[1]-A.y-dy*k);
        assert.ok(d<=r[1]+0.6,id+' '+c[0]+': the outline strays '+d.toFixed(1)+' off its bone'); }); });
    if(!ex.front) return; var fs2=shapes(app.rigFrontSVG(EXOF[id],u));
    ['thighL','shinR','upperL','foreR'].forEach(function(k){ var r=radii(fs2,k); assert.ok(r.length===2&&r[1]>r[0],id+' front '+k+': not a tapered capsule ('+r+')'); }); });
});
// The anchor points of a closed smooth outline, in order.
function anchors(sh,k){ var j=idx(sh,part(k)); assert.ok(j>=0,'no '+k+' drawn'); var d=sh[j].a.d, a=[d.match(/^M(-?[\d.]+),(-?[\d.]+)/).slice(1).map(num)];
  (d.match(/ (-?[\d.]+),(-?[\d.]+)(?= C|Z)/g)||[]).forEach(function(m){ a.push(m.trim().split(',').map(num)); }); a.pop(); return a; }
t('the trunk is shaped: chest and pelvis wider than the waist, in both views', function(){
  RIGS.forEach(function(id){ var ex=rex(id), a=anchors(shapes(app.rigSVG(EXOF[id],0)),'torso');
    function w(i){ return Math.hypot(a[i][0]-a[a.length-1-i][0],a[i][1]-a[a.length-1-i][1]); }
    assert.ok(a.length===16&&w(4)>w(3)+1.5&&w(1)>w(3)+1.5,id+': the trunk is '+a.length+' points, pelvis '+(a.length===16?w(1).toFixed(1)+', waist '+w(3).toFixed(1)+', chest '+w(4).toFixed(1):''));
    if(!ex.front) return; var b=anchors(shapes(app.rigFrontSVG(EXOF[id],0)),'torso');
    function wf(i){ return Math.abs(b[i][0]-b[14-i][0]); }
    assert.ok(b.length===16&&wf(1)>wf(3)+3,id+': the front trunk has no chest over its waist'); });
});
t('the far limbs are a lighter shade, and the far limb of the working pair is accented too', function(){
  [['backsquat','thighF','upperF'],['ohp','upperF','thighF']].forEach(function(c){ var sh=shapes(app.rigSVG(EXOF[c[0]],0));
    assert.strictEqual(sh[idx(sh,part(c[1]))].a.fill,'var(--fig-far-hi)',c[0]+': the far '+c[1]+' of the working pair is not accented');
    assert.strictEqual(sh[idx(sh,part(c[2]))].a.fill,'var(--fig-far)',c[0]+': the far '+c[2]+' is not the far shade'); });
  var css=h.slice(h.indexOf(':root{'),h.indexOf('</style>')).replace(/\\\n/g,'\n');
  var light=tokens(css.slice(0,css.indexOf('}'))), i=css.indexOf(':root[data-theme=dark]{'), dark=tokens(css.slice(i,css.indexOf('}',i)));
  [['light',light],['dark',dark]].forEach(function(th){ var T=th[1];
    assert.ok(T['fig-far']&&T['fig-far-hi'],'no far-limb tokens in the '+th[0]+' theme');
    assert.ok(ratio(T['fig-far'],T['surface-raised'])>=3,th[0]+': the far limbs are '+ratio(T['fig-far'],T['surface-raised']).toFixed(2)+':1 against the panel');
    assert.ok(ratio(T['fig-far'],T.text)>=3,th[0]+': the far limbs are too close to the near ones ('+ratio(T['fig-far'],T.text).toFixed(2)+':1)');
    assert.ok(ratio(T['fig-far-hi'],T.accent)>=1.8,th[0]+': the far working limb is too close to the near one'); });
});
t('the feet are shoes in profile, toe ahead, the sole where the foot stands', function(){
  RIGS.forEach(function(id){ var ex=rex(id), s=app.rSolve(app.rPoseAt(ex,0)), sh=shapes(app.rigSVG(EXOF[id],0));
    [['footN',s.ankN,s.footN],['footF',s.ankF,s.footF]].forEach(function(c){ var P=pts(sh,c[0]), B=app.rFootPts(c[1],c[2]);
      var lo=Math.max.apply(null,P.map(function(p){ return p[1]; })), blo=Math.max.apply(null,B.map(function(p){ return p.y; }));
      if(Math.abs(blo-app.RGROUND)<=1.5) assert.ok(Math.abs(lo-blo)<=1,id+' '+c[0]+': the shoe\'s sole is at '+lo.toFixed(1)+', the foot\'s at '+blo.toFixed(1));
      if(!c[2]) assert.ok(Math.max.apply(null,P.map(function(p){ return p[0]; }))>c[1].x+9,id+' '+c[0]+': the toe does not point ahead'); }); });
});
t('a shadow under the feet narrows as a jump leaves the floor; from above the figure lies on a mat', function(){
  var ex=rex('sq_jump'), u=0, top=1e9;
  for(var i=0;i<48;i++){ var s=app.rSolve(app.rPoseAt(ex,i/48)), y=Math.max(s.ankN.y,s.ankF.y); if(y<top){ top=y; u=i/48; } }
  assert.ok(top<app.RGROUND-16,'the jump never leaves the floor');
  function rx(v){ var sh=shapes(app.rigSVG(EXOF.sq_jump,v)), j=idx(sh,part('shadow')); assert.ok(j>=0,'no shadow under the feet'); return +sh[j].a.rx; }
  assert.ok(rx(u)<rx(0)*0.8,'the shadow is '+rx(u)+' wide in the air and '+rx(0)+' on the floor');
  function fx(v){ var sh=shapes(app.rigFrontSVG(EXOF.sq_jump,v)), j=idx(sh,part('shadow')); assert.ok(j>=0,'no shadow under the feet in the second panel'); return +sh[j].a.rx; }
  var f0=app.rSolveFront(app.rFrontAt(ex,0));
  assert.ok(fx(0)>=Math.abs(f0.footR.x-f0.footL.x)/2+4,'standing, the second panel\'s shadow ('+fx(0)+') is narrower than the stance');
  assert.ok(fx(u)<fx(0)*0.8,'the second panel\'s shadow is '+fx(u)+' wide in the air and '+fx(0)+' on the floor');
  assert.ok(idx(shapes(app.rigFrontSVG(EXOF.pushup,0)),part('mat'))>=0,'the push-up from above has no mat');
  assert.ok(idx(shapes(app.rigFrontSVG(EXOF.bench,0)),part('mat'))<0,'the bench press from above lies on a mat instead of its bench');
});

console.log('\nMOTION GUIDES');
// A coach's marks on the figure (style C): a faint ghost of the other end of
// the rep, the path of the bar (or the hip, or the shoulders) over the whole
// rep, and a small arrow on it pointing the way it goes next. They are one
// shape each in every frame of both panels, so the figure still moves in
// place, and the page shows them only while the figure stands still.
function guide(sh,k){ return sh.filter(function(p){ return p.a['data-g']===k; }); }
// The path is runs of new ground (M x,y L x,y ...), each a list of [x,y].
function runsOf(d){ return d?d.split(/\s*M/).filter(Boolean).map(function(r){ return r.split(/\s*L/).map(function(q){ return q.split(',').map(Number); }); }):[]; }
function arrowOf(sh){ var a=guide(sh,'arrow')[0]; return (a.a.d.match(/-?[\d.]+,-?[\d.]+/g)||[]).map(function(q){ return q.split(',').map(Number); }); }
t('every rig has a ghost, a path and an arrow, one shape each, in both panels and every frame: the ghost under the figure, the path and arrow over it', function(){
  var bad=[];
  RIGS.forEach(function(id){ [app.rigSVG,app.rigFrontSVG].forEach(function(f,v){ if(!f(EXOF[id],0)) return;
    for(var i=0;i<12;i++){ var sh=shapes(f(EXOF[id],i/12)), g=guide(sh,'ghost'), pa=guide(sh,'path'), ar=guide(sh,'arrow');
      if(g.length!==1||pa.length!==1||ar.length!==1){ bad.push(id+(v?' front':' side')+' u='+(i/12).toFixed(2)+': '+g.length+' ghosts, '+pa.length+' paths, '+ar.length+' arrows'); break; }
      var gi=sh.indexOf(g[0]), first=idx(sh,function(p){ return !!p.a['data-p']&&!/shadow|mat/.test(p.a['data-p']); });
      if(g[0].n!=='path'||!/^M/.test(g[0].a.d)||gi>first){ bad.push(id+(v?' front':' side')+': the ghost is not a shape drawn under the figure'); break; }
      if(sh.indexOf(pa[0])!==sh.length-2||sh.indexOf(ar[0])!==sh.length-1){ bad.push(id+(v?' front':' side')+': the path and the arrow are not drawn last'); break; } } }); });
  assert.ok(!bad.length,bad.length+' panels: '+bad.slice(0,6).join('; '));
});
t('the ghost shows the other end of the rep: the standing start at the bottom of a squat, the bottom while standing, in both panels', function(){
  ['backsquat','goblet','ohp','pullup'].forEach(function(id){ var su=app.rStillU(rex(id));
    [[app.rigSVG],[app.rigFrontSVG]].forEach(function(v,k){
      function head(sh){ var j=idx(sh,part('head')), a=sh[j].a; return a.d?Math.min.apply(null,pathPts(a.d).map(function(q){ return q[1]; })):+a.cy-(+a.ry); }
      [0,su].forEach(function(u,e){ var sh=shapes(v[0](EXOF[id],u)), other=shapes(v[0](EXOF[id],e?0:su));
        var gp=pathPts(guide(sh,'ghost')[0].a.d), ys=gp.map(function(q){ return q[1]; });
        // The ghost spans what the figure at the other end spans.
        var fig=[].concat.apply([],other.filter(function(p){ return p.a['data-p']&&p.n==='path'&&!/shadow|mat|foot/.test(p.a['data-p']); }).map(function(p){ return pathPts(p.a.d); }));
        var fy=fig.map(function(q){ return q[1]; }).concat([head(other)]);
        assert.ok(Math.abs(Math.min.apply(null,ys)-Math.min.apply(null,fy))<1.5,id+(k?' front':' side')+' u='+u.toFixed(2)+': the ghost\'s top is '+Math.min.apply(null,ys).toFixed(1)+', the other end\'s '+Math.min.apply(null,fy).toFixed(1));
        var now=[].concat.apply([],sh.filter(function(p){ return p.a['data-p']&&p.n==='path'&&!/shadow|mat|foot/.test(p.a['data-p']); }).map(function(p){ return pathPts(p.a.d); })).map(function(q){ return q[1]; }).concat([head(sh)]);
        assert.ok(Math.abs(Math.min.apply(null,now)-Math.min.apply(null,fy))>6,id+(k?' front':' side')+' u='+u.toFixed(2)+': the ghost is where the figure is'); }); }); });
});
t('a squat\'s bar path runs straight up and down, and the arrow points the way the bar goes next: down from the top, up from the bottom', function(){
  var sh=shapes(app.rigSVG(EXOF.backsquat,0)), pts=[].concat.apply([],runsOf(guide(sh,'path')[0].a.d));
  var xs=pts.map(function(q){ return q[0]; }), ys=pts.map(function(q){ return q[1]; });
  assert.ok(Math.max.apply(null,xs)-Math.min.apply(null,xs)<6&&Math.max.apply(null,ys)-Math.min.apply(null,ys)>25,'the bar path is '+(Math.max.apply(null,xs)-Math.min.apply(null,xs)).toFixed(1)+' wide and '+(Math.max.apply(null,ys)-Math.min.apply(null,ys)).toFixed(1)+' tall');
  var s=app.rSolve(app.rPoseAt(rex('backsquat'),0.02));
  assert.ok(pts.some(function(q){ return Math.hypot(q[0]-s.handN.x,q[1]-s.handN.y)<2; }),'the path does not pass through the bar');
  [[0.02,1],[app.rStillU(rex('backsquat')),-1]].forEach(function(c){
    var a=arrowOf(shapes(app.rigSVG(EXOF.backsquat,c[0]))), tip=a[0], base=(a[1][1]+a[2][1])/2;
    assert.ok((tip[1]-base)*c[1]>4,'u='+c[0].toFixed(2)+': the arrow points '+(tip[1]>base?'down':'up')+' ('+tip[1]+' against '+base+')'); });
  var f=arrowOf(shapes(app.rigFrontSVG(EXOF.backsquat,0.02)));
  assert.ok(f[0][1]-(f[1][1]+f[2][1])/2>4,'the front view\'s arrow does not point down as the squat starts');
});
t('a path that hardly moves is left out, and the arrow shrinks to a point while the body holds still', function(){
  var sh=shapes(app.rigSVG(EXOF.sprint,0));
  assert.strictEqual(guide(sh,'path')[0].a.d,'','a sprint\'s hip path is drawn: '+guide(sh,'path')[0].a.d.slice(0,60));
  var held=RIGS.filter(function(id){ return arrowOf(shapes(app.rigSVG(EXOF[id],0))).every(function(q,i,a){ return q[0]===a[0][0]&&q[1]===a[0][1]; }); });
  assert.ok(held.indexOf('plank')>=0,'a plank\'s arrow points somewhere: '+JSON.stringify(arrowOf(shapes(app.rigSVG(EXOF.plank,0)))));
  assert.ok(held.indexOf('backsquat')<0,'a squat\'s arrow is a point');
});
// The still is where the guides show, and a still keyframe is often followed
// by a hold or a slow start: the arrow looks on to where the point first
// moves, so it points the way the rep goes on every panel that has a path,
// and is a point on one that has none (it would float with no path under it).
function isPoint(a){ return a.every(function(q){ return q[0]===a[0][0]&&q[1]===a[0][1]; }); }
t('at every rig\'s still the arrow points the way the rep goes on, on every panel with a path, and is a point with no path', function(){
  var held=[], loose=[];
  RIGS.forEach(function(id){ var u=app.rStillU(rex(id));
    [app.rigSVG,app.rigFrontSVG].forEach(function(f,v){ var svg=f(EXOF[id],u); if(!svg) return;
      var sh=shapes(svg), p=guide(sh,'path')[0].a.d, pt=isPoint(arrowOf(sh));
      if(p&&pt) held.push(id+(v?' front':' side')); if(!p&&!pt) loose.push(id+(v?' front':' side')); }); });
  assert.ok(!held.length,held.length+' panels show a path and no direction at the still: '+held.join(', '));
  assert.ok(!loose.length,loose.length+' panels draw an arrow with no path under it: '+loose.join(', '));
});
// The ghost is one path of many overlapping parts filled nonzero: a part
// wound the other way cancels where it overlaps and leaves a hole (a bite out
// of the head at the neck, a criss-cross in the arms over the chest).
function areaOf(P){ var a=0; for(var i=0;i<P.length;i++){ var p=P[i], q=P[(i+1)%P.length]; a+=p[0]*q[1]-q[0]*p[1]; } return a/2; }
t('every part of the ghost winds the same way, so where parts overlap it stays solid, in every rig and both panels', function(){
  var bad=[];
  RIGS.forEach(function(id){ [0,app.rStillU(rex(id))].forEach(function(u){ [app.rigSVG,app.rigFrontSVG].forEach(function(f,v){ var svg=f(EXOF[id],u); if(!svg) return;
    var subs=guide(shapes(svg),'ghost')[0].a.d.split(/(?=M)/), sg=subs.map(function(sp){ return areaOf(pathPts(sp))>0?1:-1; });
    var odd=sg.map(function(x,k){ return x!==sg[0]?k:-1; }).filter(function(k){ return k>=0; });
    if(odd.length&&bad.indexOf(id+(v?' front':' side'))<0) bad.push(id+(v?' front':' side')+' (parts '+odd.join(',')+' of '+subs.length+')'); }); }); });
  assert.ok(!bad.length,bad.length+' ghosts have parts wound the other way: '+bad.slice(0,8).join(', '));
});
// A path that goes down and comes back up the same way is drawn once: two
// dashed passes a hair apart fill each other's gaps and read as a solid line.
t('a path the rep goes back along is drawn one way only, so its dashes show', function(){
  var bad=[];
  RIGS.forEach(function(id){ [app.rigSVG,app.rigFrontSVG].forEach(function(f,v){ var svg=f(EXOF[id],0); if(!svg) return;
    var R=runsOf(guide(shapes(svg),'path')[0].a.d); if(!R.length) return;
    function sd(q,a,b){ var dx=b[0]-a[0], dy=b[1]-a[1], l=dx*dx+dy*dy||1e-9, s=Math.max(0,Math.min(1,((q[0]-a[0])*dx+(q[1]-a[1])*dy)/l)); return Math.hypot(q[0]-a[0]-s*dx,q[1]-a[1]-s*dy); }
    // Each drawn point (a run's first point is where it leaves the line, so
    // on it) against every segment drawn before it, but its own last three.
    var segs=[], back=0, n=0;
    R.forEach(function(P){ P.forEach(function(q,i){ n++;
      if(i&&Math.hypot(q[0]-P[i-1][0],q[1]-P[i-1][1])>0.3&&segs.slice(0,Math.max(0,segs.length-3)).some(function(s){ return sd(q,s[0],s[1])<1; })) back++;
      if(i) segs.push([P[i-1],q]); }); });
    if(back>n*0.3) bad.push(id+(v?' front':' side')+' ('+back+' of '+n+' points)'); }); });
  assert.ok(!bad.length,bad.length+' paths are drawn twice over: '+bad.join(', '));
});
// While the figure moves the guides are hidden, so a playing frame is drawn
// without them: no ghost to build, no path, the arrow a point, the same
// shapes as a still frame so the figure still moves in place.
t('a frame drawn bare (while the figure moves) has the same shapes with the guides left empty', function(){
  ['backsquat','goblet','kb_snatch'].forEach(function(id){ [app.rigSVG,app.rigFrontSVG].forEach(function(f,v){
    var full=shapes(f(EXOF[id],0.3)), bare=shapes(f(EXOF[id],0.3,1));
    assert.deepStrictEqual(bare.map(function(p){ return p.n+(p.a['data-g']||''); }),full.map(function(p){ return p.n+(p.a['data-g']||''); }),id+(v?' front':' side')+': a bare frame has other shapes');
    assert.strictEqual(guide(bare,'ghost')[0].a.d,'',id+(v?' front':' side')+': a bare frame builds the ghost');
    assert.strictEqual(guide(bare,'path')[0].a.d,'',id+(v?' front':' side')+': a bare frame draws the path');
    assert.ok(isPoint(arrowOf(bare)),id+(v?' front':' side')+': a bare frame draws the arrow'); }); });
});
t('the guides are hidden unless the figure is marked to show them, in a shade of their own in both themes', function(){
  assert.ok(/#fig-live \[data-g\],#fig-live-front \[data-g\]\{visibility:hidden;\}/.test(css),'the guides are not hidden by default');
  assert.ok(/#fig-live\[data-guides=on\] \[data-g\],#fig-live-front\[data-guides=on\] \[data-g\]\{visibility:visible;\}/.test(css),'nothing shows the guides');
  var n=(h.match(/--fig-ghost:#[0-9A-Fa-f]{6}/g)||[]).length;
  assert.strictEqual(n,3,'--fig-ghost is set in '+n+' of the 3 theme blocks');
});

console.log('\nDRAWN IN PLACE');
// The live loop updates the figure's shapes in place rather than rebuilding
// the panel. A leg pointing at the camera moves in front of or behind the body
// as it swings, so a shape of one kind takes the place of another of the same
// count: that shape is swapped on its own, not the whole panel redrawn (a
// high knee did that four times a rep, the get-up and pistol too).
t('a rep redraws the figure in place, swapping only a shape whose kind changes, in every rig', function(){
  var JSDOM; try{ JSDOM=require('jsdom').JSDOM; }catch(e){ console.log('        (skipped: jsdom not installed)'); return; }
  var win=new JSDOM('<div id="a"></div>').window, doc=win.document;
  var lib=new Function('document',cut('function svgShapes(','var rigDrawn=')+';return {shapes:svgShapes,draw:drawInPlace};')(doc);
  var el=doc.getElementById('a'), ref=doc.createElement('div'), set=Object.getOwnPropertyDescriptor(win.Element.prototype,'innerHTML').set, rebuilt=0, bad=[];
  Object.defineProperty(el,'innerHTML',{set:function(v){ rebuilt++; set.call(this,v); }, get:function(){ return win.Element.prototype.__lookupGetter__('innerHTML').call(this); }});
  RIGS.forEach(function(id){ [app.rigSVG,app.rigFrontSVG].forEach(function(f,v){
    var n0=null, ok=true; if(!f(EXOF[id],0)) return; for(var i=0;i<=120;i++){ var html=f(EXOF[id],i/120), d=lib.shapes(html);
      if(n0!==null && d.s.length!==n0){ bad.push(id+(v?' front':' side')+' changes its number of shapes at u='+(i/120).toFixed(3)); break; } n0=d.s.length;
      rebuilt=0; lib.draw(el,d);
      if(i && ok && rebuilt) { bad.push(id+(v?' front':' side')+' at u='+(i/120).toFixed(3)); break; }
      ref.innerHTML=html; if(el.innerHTML!==ref.innerHTML){ bad.push(id+(v?' front':' side')+' draws something else at u='+(i/120).toFixed(3)); break; } } }); });
  assert.ok(!bad.length,bad.length+' panels rebuilt or drew wrong: '+bad.slice(0,6).join(', '));
});

console.log(fails?('\n'+fails+' FAILING'):'\nALL PASS');
process.exit(fails?1:0);
