// How the app draws a figure, headless: what lies in front of what, that the
// whole figure stays inside its panel through the rep, the panels' sizes, and
// the floor and props standing out from the panel in both themes. The
// renderer is pulled out of the shipped index.html (or the file named on the
// command line), so this tests what ships. Usage: node test-rigdraw.js [index.html]
var fs=require('fs'), assert=require('assert');
var h=fs.readFileSync(process.argv[2]||(__dirname+'/index.html'),'utf8');
function cut(a,b){ var i=h.indexOf(a), j=h.indexOf(b,i); if(i<0||j<0) throw new Error('could not find '+a+' .. '+b+' in index.html'); return h.slice(i,j); }
var app=new Function('hasOwn',cut('var RL=','function figureSVG(')+
  ';return {RL:RL,RGROUND:RGROUND,RIGFRAMES:RIGFRAMES,RIGMAP:RIGMAP,rigFor:rigFor,rSolve:rSolve,rPoseAt:rPoseAt,rSolveFront:rSolveFront,rFrontAt:rFrontAt,rigSVG:rigSVG,rigFrontSVG:rigFrontSVG,rigBox:rigBox,figPairStyle:figPairStyle};')
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
// Every point a shape covers the edge of, stroke included.
function extent(s){
  var a=s.a, sw=(+a['stroke-width']||0)/2, pts=[], r=0;
  if(s.n==='polygon') pts=a.points.split(' ').map(function(p){ return p.split(',').map(num); });
  else if(s.n==='circle'){ r=+a.r; pts=[[+a.cx,+a.cy]]; }
  else if(s.n==='ellipse'){ pts=[[+a.cx-(+a.rx),+a.cy-(+a.ry)],[+a.cx+(+a.rx),+a.cy+(+a.ry)]]; }
  else if(s.n==='line') pts=[[+a.x1,+a.y1],[+a.x2,+a.y2]];
  else if(s.n==='path') pts=(a.d.match(/-?[\d.]+[ ,]-?[\d.]+/g)||[]).map(function(p){ return p.split(/[ ,]/).map(num); });
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
function torsoPts(f){ return [f.shL,f.shR,f.hipR,f.hipL].map(function(p){ return p.x.toFixed(1)+','+p.y.toFixed(1); }).join(' '); }
// The near hand's own circle: not its cut line, the far hand or an implement.
function isHand(p,q){ return p.n==='circle'&&near(p,q)&&['var(--surface-raised)','var(--text-faint)','var(--text-soft)','none'].indexOf(p.a.fill)<0; }
function rex(id){ return app.rigFor(EXOF[id]); }

console.log('\nWHAT LIES IN FRONT OF WHAT');
t('side view: the near arm is drawn over the head, in every rig', function(){
  var bad=[];
  RIGS.forEach(function(id){ var ex=rex(id), u=0.3, s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigSVG(EXOF[id],u));
    var head=idx(sh,function(p){ return p.n==='circle'&&+p.a.r===app.RL.HEAD_R&&near(p,s.head); });
    var hand=idx(sh,function(p){ return isHand(p,s.handN); });
    if(head<0||hand<0||head>hand) bad.push(id+' (head '+head+', near hand '+hand+')'); });
  assert.ok(!bad.length,'the head covers the near arm in '+bad.length+': '+bad.slice(0,8).join(', '));
});
t('side view: the near arm has a cut line of panel colour under it, so it shows against the body', function(){
  var bad=[];
  RIGS.forEach(function(id){ var ex=rex(id), u=0.3, s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigSVG(EXOF[id],u));
    var cutAt=idx(sh,function(p){ return p.n==='circle'&&near(p,s.handN)&&p.a.fill==='var(--surface-raised)'&&+p.a['stroke-width']>=2; });
    var hand=idx(sh,function(p){ return isHand(p,s.handN); });
    var torso=idx(sh,function(p){ return p.n==='polygon'&&p.a.fill==='var(--text)'; });
    if(!(cutAt>torso&&cutAt<hand)) bad.push(id); });
  assert.ok(!bad.length,'no cut line between the body and the near arm in '+bad.join(', '));
});
// An implement in the near hand hid behind the body (a lateral raise's
// dumbbell) when it was drawn before it. It goes in front of the body and the
// near leg, but behind the head it hangs past at the top of a press and under
// the arm whose hand holds it.
t('side view: the implement in the near hand is drawn over the body, under the head and the near arm', function(){
  ['goblet','raise_lateral','suitcasecarry','triceps_ext'].forEach(function(id){ var ex=rex(id), s=app.rSolve(app.rPoseAt(ex,0.4)), sh=shapes(app.rigSVG(EXOF[id],0.4));
    var arm=idx(sh,function(p){ return isHand(p,s.handN); });
    var head=idx(sh,function(p){ return p.n==='circle'&&+p.a.r===app.RL.HEAD_R&&near(p,s.head); });
    var torso=idx(sh,function(p){ return p.n==='polygon'&&p.a.fill==='var(--text)'; });
    var leg=idx(sh,function(p){ return p.n==='circle'&&near(p,s.kneeN)&&p.a.fill!=='var(--text-faint)'; });
    var bell=idx(sh,function(p){ return p.a.fill==='var(--text-soft)'||p.a.stroke==='var(--text-soft)'; });
    assert.ok(bell>torso&&bell>leg,id+': the implement (shape '+bell+') is under the body ('+torso+') or the near leg ('+leg+')');
    assert.ok(bell<head&&bell<arm,id+': the implement (shape '+bell+') is over the head ('+head+') or the near arm ('+arm+')'); });
  ['pullup','bench'].forEach(function(id){ var ex=rex(id), s=app.rSolve(app.rPoseAt(ex,0.4)), sh=shapes(app.rigSVG(EXOF[id],0.4));
    var arm=idx(sh,function(p){ return isHand(p,s.handN); });
    var bar=idx(sh,function(p){ return p.a.fill==='var(--text-soft)'||p.a.stroke==='var(--text-soft)'; });
    assert.ok(bar>arm,id+': the bar (shape '+bar+') is under the hands ('+arm+')'); });
});
// A kettlebell is still drawn hanging below the fist (its rack and lockout
// placement comes with the bell rule). Over the body that left a grey disc on
// the belly in a rack or press, away from the hand, so while its hand is above
// the hip it sits behind the body; hanging in a swing or the bottom of a clean
// it stays in front of the body and the near leg.
t('side view: a kettlebell held above the hip is drawn behind the body, one hanging below it in front', function(){
  var seen={};
  ['kbswing','kb_clean','kb_snatch','kb_press','kb_bottomsup','kb_tgu'].forEach(function(id){ for(var i=0;i<24;i++){ var u=i/24, ex=rex(id), s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigSVG(EXOF[id],u));
    var torso=idx(sh,function(p){ return p.n==='polygon'&&p.a.fill==='var(--text)'; });
    var leg=idx(sh,function(p){ return p.n==='circle'&&near(p,s.kneeN)&&p.a.fill!=='var(--text-faint)'; });
    var arm=idx(sh,function(p){ return isHand(p,s.handN); });
    var bell=idx(sh,function(p){ return p.a.fill==='var(--text-soft)'; });
    var up=s.handN.y<s.hip.y; seen[up]=1;
    if(up) assert.ok(bell<torso,id+' u='+u.toFixed(2)+': the hand is above the hip but the bell (shape '+bell+') is over the body ('+torso+')');
    else assert.ok(bell>torso&&bell>leg&&bell<arm,id+' u='+u.toFixed(2)+': the bell hangs below the hip but is shape '+bell+' (body '+torso+', near leg '+leg+', arm '+arm+')'); } });
  assert.ok(seen['true']&&seen['false'],'no kettlebell rig is seen both above and below the hip');
});
t('front view: the arms are drawn over the head, unless the rig holds them behind it', function(){
  function order(id,u){ var ex=rex(id), f=app.rSolveFront(app.rFrontAt(ex,u)), sh=shapes(app.rigFrontSVG(EXOF[id],u));
    var head=idx(sh,function(p){ return p.n==='circle'&&+p.a.r===app.RL.HEAD_R&&near(p,f.head); });
    var elb=idx(sh,function(p){ return p.n==='circle'&&near(p,f.elbL); });
    return head-elb; }
  assert.ok(order('jabcross',0.25)<0,'the jab is drawn behind the head');
  assert.ok(order('ohp',0.5)<0,'the press is drawn behind the head');
  assert.ok(rex('triceps_ext').behindHead,'the triceps extension lost behindHead');
  assert.ok(order('triceps_ext',0.5)>0,'the triceps extension\'s forearms are drawn over the head they go behind');
});
t('front view: a knee raised above its hip is drawn over the body, a standing leg behind it', function(){
  [['press_incline',0.3,true],['backsquat',0,false]].forEach(function(c){ var ex=rex(c[0]), f=app.rSolveFront(app.rFrontAt(ex,c[1])), sh=shapes(app.rigFrontSVG(EXOF[c[0]],c[1]));
    var torso=idx(sh,function(p){ return p.n==='polygon'&&p.a.points===torsoPts(f); });
    var knee=idx(sh,function(p){ return p.n==='circle'&&near(p,f.kneeL); });
    assert.ok(c[2]===f.kneeL.y<f.hipL.y-1,c[0]+': the knee is not where this case needs it');
    assert.strictEqual(knee>torso,c[2],c[0]+': knee shape '+knee+', body '+torso); });
});
t('front view: the stick goes behind the body once the dislocate takes it behind the back', function(){
  var ex=rex('shoulderdisloc'), seen={};
  for(var i=0;i<24;i++){ var u=i/24, s=app.rSolve(app.rPoseAt(ex,u)), sh=shapes(app.rigFrontSVG(EXOF.shoulderdisloc,u));
    var bar=idx(sh,function(p){ return p.n==='rect'&&p.a.height==='5'; });
    var f=app.rSolveFront(app.rFrontAt(ex,u)), torso=idx(sh,function(p){ return p.n==='polygon'&&p.a.points===torsoPts(f); });
    var back=s.handN.x<s.hip.x; seen[back]=1;
    assert.strictEqual(bar<torso,back,'at u='+u.toFixed(2)+' the hands are '+(back?'behind':'in front of')+' the hip but the stick is drawn '+(bar<torso?'behind':'over')+' the body'); }
  assert.ok(seen['true']&&seen['false'],'the dislocate never takes the stick both in front and behind');
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
  var sh=shapes(app.rigSVG(EXOF.backsquat,0)), vb=vbOf(app.rigSVG(EXOF.backsquat,0)), g=sh[1];
  assert.ok(g.n==='line'&&g.a.stroke==='var(--ground)','the first shape is not the floor');
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
  var sq=shapes(app.rigSVG(EXOF.backsquat,0))[1], bn=shapes(app.rigSVG(EXOF.bench,0)).filter(function(p){ return p.n==='rect'; })[0];
  assert.strictEqual(sq.a.stroke,'var(--ground)','the floor is drawn in '+sq.a.stroke);
  assert.strictEqual(bn.a.stroke,'var(--prop)','the bench is edged in '+bn.a.stroke);
  var pl=shapes(app.rigFrontSVG(EXOF.bench,0)).filter(function(p){ return p.n==='rect'; })[0];
  assert.strictEqual(pl.a.stroke,'var(--prop)','the bench from above is edged in '+pl.a.stroke);
});

console.log(fails?('\n'+fails+' FAILING'):'\nALL PASS');
process.exit(fails?1:0);
