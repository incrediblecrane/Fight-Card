var NS='http://www.w3.org/2000/svg';
function el(tag,attrs){ var n=document.createElementNS(NS,tag); for(var k in attrs) n.setAttribute(k,attrs[k]); return n; }
function segPts(A,B,w1,w2){
  var dx=B.x-A.x, dy=B.y-A.y, len=Math.sqrt(dx*dx+dy*dy)||1;
  var px=-dy/len, py=dx/len;
  return [[A.x+px*w1/2,A.y+py*w1/2],[A.x-px*w1/2,A.y-py*w1/2],
          [B.x-px*w2/2,B.y-py*w2/2],[B.x+px*w2/2,B.y+py*w2/2]]
    .map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
}
// The figure always faces +x, so the toe always points +x. This used to be
// derived from whether the knee was forward of the ankle, which flipped the
// foot backwards through most of every squat. The foot is the app's: a block
// hinged at the ankle, pitched by footN/footF (rig.js footAt).
function footPts(ank,rot){ return footAt(ank,rot).map(function(p){ return p.x.toFixed(1)+','+p.y.toFixed(1); }).join(' '); }
// A rope strand from a hand to the far end of its loop (rig.js ropeAt), bowed
// back against the way it turns, as the app draws it.
function ropePath(h,q,a){
  var r=a*Math.PI/180, vx=28*Math.cos(r), vy=60*Math.sin(r), vl=Math.hypot(vx,vy)||1;
  var cx=(h.x+q.x)/2-vx/vl*8, cy=(h.y+q.y)/2-vy/vl*8;
  return 'M'+h.x.toFixed(1)+' '+h.y.toFixed(1)+' Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+q.x.toFixed(1)+' '+q.y.toFixed(1);
}
// Precompute the bar path over a full rep so it can be shown as a trace.
function barPath(ex){
  if(!ex.equip||ex.equip==='fixedbar') return null;
  var pts=[];
  for(var i=0;i<=90;i++){ var s=solve(poseAt(ex,i/90)); pts.push(s.handN.x.toFixed(1)+','+s.handN.y.toFixed(1)); }
  return pts.join(' ');
}
// The app's rigBox, so the preview is cropped and scaled as the app draws it:
// both panels share a top (18, or higher for a rig that reaches above it) and
// the side view is cropped to the ground the figure covers, at the front
// view's scale.
function axisOf(ex){ return ex.axis || (ex.equip==='dumbbell' ? 'sagittal' : 'lateral'); }
function boxOf(ex){
  var x0=1e9, x1=-1e9, top=1e9, N=48;
  var see=function(x,r){ if(x-r<x0) x0=x-r; if(x+r>x1) x1=x+r; };
  var up=function(y,r){ if(y-r<top) top=y-r; };
  var eq=ex.equip==='barbell'?15:ex.equip==='dumbbell'?14:ex.equip?11:5;
  var ax=axisOf(ex), q=ex.equip;
  var eqS=q==='barbell'?17:q==='dumbbell'?(ax==='vertical'?14:ax==='lateral'?7:9):q==='ball'?13:q==='plate'?13:q==='cable'?7:q==='kettlebell'?8:4;
  var eqF=q==='barbell'?15:q==='dumbbell'?(ax==='vertical'?14:ax==='lateral'?8:6):q==='ball'?13:q==='plate'?12:q==='cable'?7:q==='kettlebell'?6:8;
  for(var i=0;i<=N;i++){
    var s=solve(poseAt(ex,i/N));
    [s.hip,s.sh,s.hipF,s.shF,s.kneeN,s.kneeF,s.elbN,s.elbF].forEach(function(p){ see(p.x,9); up(p.y,9); });
    see(s.head.x,L.HEAD_R+1); up(s.head.y,L.HEAD_R+1);
    [s.ankN,s.ankF].forEach(function(p){ see(p.x+L.FOOT*0.72,1); see(p.x-L.FOOT*0.28,1); up(p.y,6); });
    [s.handN,s.handF].forEach(function(p){ see(p.x,eq); up(p.y,eqS); });
    if(q==='kettlebell'){ var kb=bellAt(ex,s); see(kb.x,10); up(kb.y,10); }
    if(s.ball){ see(s.ball.x,12); up(s.ball.y,12); }
    if(q==='rope'){ see(s.hip.x-25,1); see(s.hip.x+31,1); up(s.head.y-L.HEAD_R-8,2); }
    if(ex.front){ var f=solveFront(frontAt(ex,i/N));
      if(q==='kettlebell') up(bellFront(ex,f).y,9);
      if(f.ball) up(f.ball.y,12);
      if(q==='rope') up(f.head.y-L.HEAD_R-8,2);
      up(f.head.y,L.HEAD_R+1); up(f.shC.y,13);
      [f.shL,f.shR].forEach(function(p){ up(p.y,8); });
      [f.elbL,f.elbR,f.kneeL,f.kneeR].forEach(function(p){ up(p.y,6); });
      [f.handL,f.handR].forEach(function(p){ up(p.y,eqF); }); }
  }
  (ex.props||[]).forEach(function(p){ var a=(p[5]||0)*Math.PI/180, cx=p[0]+p[2]/2, cy=p[1]+p[3]/2;
    [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(k){ var dx=k[0]*p[2]/2, dy=k[1]*p[3]/2;
      see(cx+dx*Math.cos(a)-dy*Math.sin(a),1); up(cy+dx*Math.sin(a)+dy*Math.cos(a),1); }); });
  (ex.planProps||[]).forEach(function(p){ up(p[1],1); });
  if(ex.barAt){ see(ex.barAt[0],4); up(ex.barAt[1],4); }
  if(ex.anchorAt){ see(ex.anchorAt[0],2); up(ex.anchorAt[1],2); }
  if(ex.anchorFront) for(var a=1;a<ex.anchorFront.length;a+=2) up(ex.anchorFront[a],2);
  var w=Math.max(100,x1-x0+12), vx=(x0+x1)/2-w/2, y=Math.min(18,Math.floor(top-2));
  return {x:Math.round(vx*10)/10, w:Math.round(w*10)/10, y:y, h:186-y};
}
// A prop has an edge of its own (--prop, 3:1 against the panel).
function propEl(p){
  var a={x:p[0],y:p[1],width:p[2],height:p[3],rx:p[4]===undefined?2:p[4],fill:'var(--prop-fill)',stroke:'var(--prop)','stroke-width':1.5};
  if(p[5]) a.transform='rotate('+p[5]+' '+(p[0]+p[2]/2)+' '+(p[1]+p[3]/2)+')';
  return el('rect',a);
}
// The floor runs the whole width of the panel; the panel clips it.
function groundEl(x0,x1){ return el('line',{x1:x0-200,y1:GROUND,x2:x1+200,y2:GROUND,stroke:'var(--ground)','stroke-width':2}); }
function buildFigure(ex,host,bx){
  bx=bx||boxOf(ex);
  var svg=el('svg',{viewBox:bx.x+' '+bx.y+' '+bx.w+' '+bx.h,preserveAspectRatio:'xMidYMax meet',role:'img','aria-label':ex.name+' animation'});
  var ink='var(--text)', far='var(--text-faint)', hi='var(--accent)', soft='var(--text-soft)';
  var legCol = ex.active==='legs'?hi:ink;
  var armCol = (ex.active==='arms'||ex.active==='armN')?hi:ink;
  svg.appendChild(groundEl(bx.x,bx.x+bx.w));
  // Props are part of the movement, not decoration: a split squat without the
  // bench behind it is a lunge, and a wall sit without the wall is a squat.
  (ex.props||[]).forEach(function(p){ svg.appendChild(propEl(p)); });
  var bp=barPath(ex), trace=null;
  if(bp){ trace=el('polyline',{points:bp,fill:'none',stroke:'var(--accent)','stroke-width':1.2,'stroke-dasharray':'3 3',opacity:0}); svg.appendChild(trace); }
  var R={};
  // edge: drawn in panel colour with a stroke, under the near arm, as the cut
  // line that keeps it visible where it crosses the body or passes the head.
  function pair(name,col,w,isLeg,edge){
    var st=edge?{stroke:col,'stroke-width':2.6,'stroke-linejoin':'round'}:{};
    function mk(t,a){ for(var k in st) a[k]=st[k]; return el(t,a); }
    R[name+'1']=mk('polygon',{fill:col}); R[name+'j']=mk('circle',{r:w[1]/2,fill:col});
    R[name+'2']=mk('polygon',{fill:col});
    R[name+'e']= isLeg ? el('polygon',{fill:col}) : mk('circle',{r:w[2]/2+0.8,fill:col});
    [R[name+'1'],R[name+'j'],R[name+'2'],R[name+'e']].forEach(function(n){svg.appendChild(n);});
  }
  // The implement is in the near hand: in front of the body, under the arm.
  var eq=el('g',{});
  // An implement is drawn as it PROJECTS in this view, not as a generic icon.
  // A barbell runs across the body, so from the side its axis points at the
  // viewer: you see the plate face-on as a disc with the bar end as a hub. It
  // used to be drawn as a 68-wide horizontal bar here, which is what a barbell
  // looks like from the FRONT. Scale is honest: a 45cm plate is r=15 against a
  // 120-unit figure. axis: 'lateral' runs across the body, 'sagittal' front to
  // back (a dumbbell hanging in a neutral grip), 'vertical' upright (a goblet).
  var axis = ex.axis || (ex.equip==='dumbbell' ? 'sagittal' : 'lateral');
  if(ex.equip==='barbell'){
    R.plate=el('circle',{r:15,fill:'none',stroke:soft,'stroke-width':3.5});
    R.hub=el('circle',{r:3.5,fill:soft});
    eq.appendChild(R.plate); eq.appendChild(R.hub);
  } else if(ex.equip==='fixedbar'){
    R.hub=el('circle',{r:3.2,fill:soft});
    eq.appendChild(R.hub);
  } else if(ex.equip==='dumbbell' && axis==='vertical'){
    R.db=el('rect',{width:8,height:22,rx:3,fill:soft}); R.d1=el('rect',{width:16,height:7,rx:2,fill:soft}); R.d2=el('rect',{width:16,height:7,rx:2,fill:soft});
    eq.appendChild(R.db); eq.appendChild(R.d1); eq.appendChild(R.d2);
  } else if(ex.equip==='dumbbell' && axis==='lateral'){
    // A pressed or supinated-curl dumbbell has its handle across the body, so
    // from the side you look down the handle and see one bell face.
    R.bell=el('circle',{r:6.5,fill:soft}); eq.appendChild(R.bell);
  } else if(ex.equip==='cable'){
    // With no anchorAt the cable runs toward the camera: only the handle shows.
    if(ex.anchorAt){ R.cable=el('line',{stroke:soft,'stroke-width':1.8}); eq.appendChild(R.cable); }
    R.grip=el('rect',{width:5,height:13,rx:2.5,fill:soft}); eq.appendChild(R.grip);
  } else if(ex.equip==='ball'){
    R.ball=el('circle',{r:11,fill:'none',stroke:soft,'stroke-width':3}); R.bhub=el('circle',{r:3,fill:soft});
    eq.appendChild(R.ball); eq.appendChild(R.bhub);
  } else if(ex.equip==='dumbbell'){
    // Hanging in a neutral grip the handle runs front to back, so from the side
    // you see the whole dumbbell in profile, lying horizontal.
    R.db=el('rect',{width:22,height:7,rx:3,fill:soft}); R.d1=el('rect',{width:7,height:17,rx:2,fill:soft}); R.d2=el('rect',{width:7,height:17,rx:2,fill:soft});
    eq.appendChild(R.db); eq.appendChild(R.d1); eq.appendChild(R.d2);
  } else if(ex.equip==='plate'){
    // A plate seen edge on, pinched by its rim: it hangs below the fist.
    R.pp=el('ellipse',{rx:4.5,ry:13,fill:'var(--surface)',stroke:soft,'stroke-width':3}); eq.appendChild(R.pp);
  } else if(ex.equip==='kettlebell'){
    R.kb=el('circle',{r:10,fill:soft}); R.kh=el('path',{fill:'none',stroke:soft,'stroke-width':3.5});
    eq.appendChild(R.kb); eq.appendChild(R.kh);
  }
  // Back to front, as the app: a rope's far strand, far leg and arm, the body,
  // the near leg, the implement, the head, the near arm, then a bar or a
  // pinched plate, and a rope's near strand.
  var rope={fill:'none',stroke:soft,'stroke-width':1.6};
  if(ex.equip==='rope'){ R.ropeF=el('path',rope); svg.appendChild(R.ropeF); }
  pair('fleg',far,[10,7,5],true); pair('farm',far,[7,5,4],false);
  R.torso=el('polygon',{fill:ink}); R.hip=el('circle',{r:6.5,fill:ink}); R.sh=el('circle',{r:8.5,fill:ink});
  svg.appendChild(R.torso); svg.appendChild(R.hip); svg.appendChild(R.sh);
  var top=ex.equip==='barbell'||ex.equip==='fixedbar'||ex.equip==='plate';
  pair('nleg',legCol,[11,8,5.5],true);
  if(!top) svg.appendChild(eq);
  R.head=el('circle',{r:L.HEAD_R,fill:ink}); svg.appendChild(R.head);
  pair('ncut','var(--surface-raised)',[8,6,4.5],false,true); pair('narm',armCol,[8,6,4.5],false);
  if(top) svg.appendChild(eq);
  if(ex.equip==='rope'){ R.ropeN=el('path',rope); svg.appendChild(R.ropeN); }
  host.appendChild(svg);
  return {R:R,trace:trace,svg:svg};
}
function update(ex,ref,u){
  var s=solve(poseAt(ex,u)), R=ref.R;
  function setLimb(n,a,b,c,w,isLeg,rot){
    R[n+'1'].setAttribute('points',segPts(a,b,w[0],w[1]));
    R[n+'j'].setAttribute('cx',b.x.toFixed(1)); R[n+'j'].setAttribute('cy',b.y.toFixed(1));
    R[n+'2'].setAttribute('points',segPts(b,c,w[1],w[2]));
    if(isLeg) R[n+'e'].setAttribute('points',footPts(c,rot));
    else { R[n+'e'].setAttribute('cx',c.x.toFixed(1)); R[n+'e'].setAttribute('cy',c.y.toFixed(1)); }
  }
  setLimb('fleg',s.hipF,s.kneeF,s.ankF,[10,7,5],true,s.footF);
  setLimb('farm',s.shF,s.elbF,s.handF,[7,5,4],false);
  setLimb('nleg',s.hip,s.kneeN,s.ankN,[11,8,5.5],true,s.footN);
  setLimb('ncut',s.sh,s.elbN,s.handN,[8,6,4.5],false);
  setLimb('narm',s.sh,s.elbN,s.handN,[8,6,4.5],false);
  R.torso.setAttribute('points',segPts(s.hip,s.sh,13,17));
  R.hip.setAttribute('cx',s.hip.x.toFixed(1)); R.hip.setAttribute('cy',s.hip.y.toFixed(1));
  R.sh.setAttribute('cx',s.sh.x.toFixed(1));  R.sh.setAttribute('cy',s.sh.y.toFixed(1));
  R.head.setAttribute('cx',s.head.x.toFixed(1)); R.head.setAttribute('cy',s.head.y.toFixed(1));
  // Only a bar with barAt is bolted in place; a broomstick or a rower handle
  // uses the same mark but travels with the hands.
  var p = (ex.equip==='fixedbar'&&ex.barAt) ? {x:ex.barAt[0],y:ex.barAt[1]} : s.handN;
  var axis2 = ex.axis || (ex.equip==='dumbbell' ? 'sagittal' : 'lateral');
  if(R.plate){ R.plate.setAttribute('cx',p.x.toFixed(1)); R.plate.setAttribute('cy',p.y.toFixed(1)); }
  if(R.pp){ R.pp.setAttribute('cx',p.x.toFixed(1)); R.pp.setAttribute('cy',(p.y+9).toFixed(1)); }
  if(R.hub){ R.hub.setAttribute('cx',p.x.toFixed(1)); R.hub.setAttribute('cy',p.y.toFixed(1)); }
  if(R.bell){ R.bell.setAttribute('cx',p.x.toFixed(1)); R.bell.setAttribute('cy',p.y.toFixed(1)); }
  if(R.cable){
    R.cable.setAttribute('x1',ex.anchorAt[0]); R.cable.setAttribute('y1',ex.anchorAt[1]);
    R.cable.setAttribute('x2',p.x.toFixed(1)); R.cable.setAttribute('y2',p.y.toFixed(1));
  }
  if(R.grip){ R.grip.setAttribute('x',(p.x-2.5).toFixed(1)); R.grip.setAttribute('y',(p.y-6.5).toFixed(1)); }
  // A ball let go of (ballAt) is where the rig puts it, else in the near hand.
  if(R.ball){ var b=s.ball||s.handN; [R.ball,R.bhub].forEach(function(n){ n.setAttribute('cx',b.x.toFixed(1)); n.setAttribute('cy',b.y.toFixed(1)); }); }
  if(R.ropeN){ var q=ropeAt(s);
    R.ropeF.setAttribute('d',ropePath(s.handF,{x:q.x-5,y:q.y},s.rope)); R.ropeN.setAttribute('d',ropePath(s.handN,q,s.rope)); }
  if(R.db && axis2==='vertical'){
    R.db.setAttribute('x',(p.x-4).toFixed(1)); R.db.setAttribute('y',(p.y-11).toFixed(1));
    R.d1.setAttribute('x',(p.x-8).toFixed(1)); R.d1.setAttribute('y',(p.y-14).toFixed(1));
    R.d2.setAttribute('x',(p.x-8).toFixed(1)); R.d2.setAttribute('y',(p.y+7).toFixed(1));
  } else if(R.db){
    R.db.setAttribute('x',(p.x-11).toFixed(1)); R.db.setAttribute('y',(p.y-3.5).toFixed(1));
    R.d1.setAttribute('x',(p.x-14).toFixed(1)); R.d1.setAttribute('y',(p.y-8.5).toFixed(1));
    R.d2.setAttribute('x',(p.x+7).toFixed(1));  R.d2.setAttribute('y',(p.y-8.5).toFixed(1));
  }
  // A kettlebell lies where rig.js bellAt puts it; the handle loops round the
  // fist on the side away from the bell.
  if(R.kb){ var kb=bellAt(ex,s), kd=kb.d; R.kb.setAttribute('cx',kb.x.toFixed(1)); R.kb.setAttribute('cy',kb.y.toFixed(1));
            R.kh.setAttribute('d','M'+(p.x+4*kd.x+6*kd.y).toFixed(1)+' '+(p.y+4*kd.y-6*kd.x).toFixed(1)+' Q'+(p.x-8*kd.x).toFixed(1)+' '+(p.y-8*kd.y).toFixed(1)+' '+(p.x+4*kd.x-6*kd.y).toFixed(1)+' '+(p.y+4*kd.y+6*kd.x).toFixed(1)); }
}

// ---- front-plane rendering ----
// Layered as the app draws it: legs behind the body unless a knee comes up
// above its hip, the head behind the arms unless the rig holds them behind it
// (behindHead), and a stick behind the back (its side-view hands behind the
// hip) behind the body.
function buildFront(ex,host,bx){
  bx=bx||boxOf(ex);
  var svg=el('svg',{viewBox:'20 '+bx.y+' 100 '+bx.h,role:'img','aria-label':ex.name+' front view'});
  var ink='var(--text)', hi='var(--accent)', soft='var(--text-soft)';
  var legCol=ex.active==='legs'?hi:ink, armCol=(ex.active==='arms'||ex.active==='armN')?hi:ink;
  if(!ex.frontPlan) svg.appendChild(groundEl(20,120));
  (ex.planProps||[]).forEach(function(p){ svg.appendChild(propEl(p)); });
  var R={svg:svg};
  // A rope's arch behind the body (on its way over), and in front (on its way
  // down and under), as the app.
  var rope={fill:'none',stroke:soft,'stroke-width':1.6};
  if(ex.equip==='rope'){ R.ropeB=el('path',rope); svg.appendChild(R.ropeB); }
  // An arm foreshortened toward the camera lies on top of the torso in the same
  // ink, so it disappears into the silhouette. A surface-coloured outline is
  // what separates it; legs sit outside the body and do not need one.
  function limb(n,col,w,outline){
    var o = outline?{stroke:'var(--surface-raised)','stroke-width':1.6,'stroke-linejoin':'round'}:{};
    function mk(t,a){ for(var k in o) a[k]=o[k]; return el(t,a); }
    R[n+'1']=mk('polygon',{fill:col}); R[n+'j']=mk('circle',{r:w[1]/2,fill:col});
    R[n+'2']=mk('polygon',{fill:col});
    var g=el('g',{}); [R[n+'1'],R[n+'j'],R[n+'2']].forEach(function(x){g.appendChild(x);}); svg.appendChild(g); return g;
  }
  // The stick's place behind the body, and each leg's two places.
  R.backAt=el('g',{}); svg.appendChild(R.backAt);
  R.gLegL=limb('flegL',legCol,[11,8,5.5]); R.gLegR=limb('flegR',legCol,[11,8,5.5]);
  R.ffootL=el('ellipse',{rx:7,ry:4,fill:legCol}); R.ffootR=el('ellipse',{rx:7,ry:4,fill:legCol});
  R.gLegL.appendChild(R.ffootL); R.gLegR.appendChild(R.ffootR);
  R.legsBack=el('g',{}); svg.appendChild(R.legsBack);
  R.fneck=el('rect',{width:7,height:12,rx:3,fill:ink}); svg.appendChild(R.fneck);
  R.ftorso=el('polygon',{fill:ink}); svg.appendChild(R.ftorso);
  R.fhipL=el('circle',{r:5.5,fill:ink}); R.fhipR=el('circle',{r:5.5,fill:ink});
  svg.appendChild(R.fhipL); svg.appendChild(R.fhipR);
  R.legsUp=el('g',{}); svg.appendChild(R.legsUp);
  R.fhead=el('circle',{r:L.HEAD_R,fill:ink});
  if(!ex.behindHead) svg.appendChild(R.fhead);
  limb('farmL',armCol,[8,6,4.5],true); limb('farmR',armCol,[8,6,4.5],true);
  R.fshL=el('circle',{r:6.5,fill:ink}); R.fshR=el('circle',{r:6.5,fill:ink});
  svg.appendChild(R.fshL); svg.appendChild(R.fshR);
  if(ex.behindHead) svg.appendChild(R.fhead);
  R.fhandL=el('circle',{fill:armCol,stroke:'var(--surface-raised)','stroke-width':2});
  R.fhandR=el('circle',{fill:armCol,stroke:'var(--surface-raised)','stroke-width':2});
  // A bar is gripped, so the hands go on top of it; a bell hangs from the
  // hands, so it goes on top of them.
  if(ex.equip==='barbell'||ex.equip==='fixedbar'){
    R.fbar=el('rect',{height:5,rx:2.5,fill:soft});
    R.fpL=el('ellipse',{rx:5,ry:13,fill:'var(--surface)',stroke:soft,'stroke-width':3});
    R.fpR=el('ellipse',{rx:5,ry:13,fill:'var(--surface)',stroke:soft,'stroke-width':3});
    svg.appendChild(R.fbar); R.barAt=R.fbar.previousSibling;
    if(ex.equip==='barbell'){ svg.appendChild(R.fpL); svg.appendChild(R.fpR); }
  }
  svg.appendChild(R.fhandL); svg.appendChild(R.fhandR);
  if(ex.equip==='kettlebell'){
    // One bell: in the loaded hand of a one-handed lift (load), else both
    // hands share its handle and it hangs as a single mass below them.
    R.fkbH=el('path',{fill:'none',stroke:soft,'stroke-width':3.4,'stroke-linecap':'round'});
    R.fkb=el('circle',{r:9,fill:soft});
    svg.appendChild(R.fkbH); svg.appendChild(R.fkb);
  }
  var faxis = ex.axis || (ex.equip==='dumbbell' ? 'sagittal' : 'lateral');
  if(ex.equip==='dumbbell' && faxis==='vertical'){
    R.fdb=el('rect',{width:9,height:20,rx:3,fill:soft});
    R.fdb1=el('rect',{width:19,height:7,rx:2.5,fill:soft});
    R.fdb2=el('rect',{width:19,height:7,rx:2.5,fill:soft});
    svg.appendChild(R.fdb); svg.appendChild(R.fdb1); svg.appendChild(R.fdb2);
  } else if(ex.equip==='dumbbell' && faxis==='lateral'){
    // Handle across the body: from the front you see the whole dumbbell in
    // profile at each hand. This is what separates a hammer curl from a
    // supinated curl at a glance, in both views.
    R.fdbL=el('g',{}); R.fdbR=el('g',{});
    [['L',R.fdbL],['R',R.fdbR]].forEach(function(pr){
      R['fh'+pr[0]]=el('rect',{width:20,height:6,rx:3,fill:soft});
      R['fc'+pr[0]+'1']=el('rect',{width:6,height:16,rx:2,fill:soft});
      R['fc'+pr[0]+'2']=el('rect',{width:6,height:16,rx:2,fill:soft});
      pr[1].appendChild(R['fh'+pr[0]]); pr[1].appendChild(R['fc'+pr[0]+'1']); pr[1].appendChild(R['fc'+pr[0]+'2']);
      svg.appendChild(pr[1]);
    });
  } else if(ex.equip==='dumbbell'){
    // Handle running front to back means you look straight down its axis: one
    // bell face per hand, not a dumbbell lying sideways across the body.
    R.fbellL=el('circle',{r:6,fill:soft}); R.fbellR=el('circle',{r:6,fill:soft});
    svg.appendChild(R.fbellL); svg.appendChild(R.fbellR);
  } else if(ex.equip==='plate'){
    // Face on from the front, one per hand, hanging from the pinch at the rim.
    R.fppL=el('circle',{r:10,fill:'none',stroke:soft,'stroke-width':3}); R.fppR=el('circle',{r:10,fill:'none',stroke:soft,'stroke-width':3});
    svg.appendChild(R.fppL); svg.appendChild(R.fppR);
  } else if(ex.equip==='cable'){
    // One anchor ([x,y]) is one cable to one handle; two are one per hand.
    R.fcabL=el('line',{stroke:soft,'stroke-width':1.8}); R.fgripL=el('rect',{width:5,height:13,rx:2.5,fill:soft});
    svg.appendChild(R.fcabL); svg.appendChild(R.fgripL);
    if(!ex.anchorFront||ex.anchorFront.length>=4){ R.fcabR=el('line',{stroke:soft,'stroke-width':1.8}); R.fgripR=el('rect',{width:5,height:13,rx:2.5,fill:soft});
      svg.appendChild(R.fcabR); svg.appendChild(R.fgripR); }
  } else if(ex.equip==='ball'){
    R.fball=el('circle',{r:11,fill:'none',stroke:soft,'stroke-width':3}); R.fbhub=el('circle',{r:3,fill:soft});
    svg.appendChild(R.fball); svg.appendChild(R.fbhub);
  }
  if(ex.equip==='rope'){ R.ropeF=el('path',rope); svg.appendChild(R.ropeF); }
  host.appendChild(svg);
  return R;
}
function updateFront(ex,R,u){
  var f=frontAt(ex,u); if(!f) return;
  var s=solveFront(f);
  // Which layer each leg and the stick are in at this moment.
  [['gLegL',s.kneeL,s.hipL],['gLegR',s.kneeR,s.hipR]].forEach(function(k){
    var up=!ex.frontPlan&&k[1].y<k[2].y-1;
    if(R[k[0]+'up']!==up){ R[k[0]+'up']=up; R.svg.insertBefore(R[k[0]],up?R.legsUp:R.legsBack); } });
  if(R.fbar&&ex.equip==='fixedbar'&&!ex.barAt&&ex.frames){ var sd=solve(poseAt(ex,u)), back=sd.handN.x<sd.hip.x;
    if(R.back!==back){ R.back=back; R.svg.insertBefore(R.fbar,back?R.backAt:R.barAt.nextSibling); } }
  function setL(n,a,b,c,w){
    R[n+'1'].setAttribute('points',segPts(a,b,w[0],w[1]));
    R[n+'j'].setAttribute('cx',b.x.toFixed(1)); R[n+'j'].setAttribute('cy',b.y.toFixed(1));
    R[n+'2'].setAttribute('points',segPts(b,c,w[1],w[2]));
  }
  setL('flegL',s.hipL,s.kneeL,s.footL,[11,8,5.5]); setL('flegR',s.hipR,s.kneeR,s.footR,[11,8,5.5]);
  setL('farmL',s.shL,s.elbL,s.handL,[8,6,4.5]);    setL('farmR',s.shR,s.elbR,s.handR,[8,6,4.5]);
  [['ffootL',s.footL],['ffootR',s.footR]].forEach(function(p){
    R[p[0]].setAttribute('cx',p[1].x.toFixed(1)); R[p[0]].setAttribute('cy',(p[1].y+3).toFixed(1)); });
  R.ftorso.setAttribute('points',[s.shL,s.shR,s.hipR,s.hipL].map(function(p){return p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' '));
  R.fneck.setAttribute('x',(s.shC.x-4.5).toFixed(1)); R.fneck.setAttribute('y',(s.shC.y-12).toFixed(1));
  [['fshL',s.shL],['fshR',s.shR],['fhipL',s.hipL],['fhipR',s.hipR]].forEach(function(p){
    R[p[0]].setAttribute('cx',p[1].x.toFixed(1)); R[p[0]].setAttribute('cy',p[1].y.toFixed(1)); });
  R.fhead.setAttribute('cx',s.head.x.toFixed(1)); R.fhead.setAttribute('cy',s.head.y.toFixed(1));
  R.fhandL.setAttribute('cx',s.handL.x.toFixed(1)); R.fhandL.setAttribute('cy',s.handL.y.toFixed(1));
  R.fhandL.setAttribute('r',(5.5*s.fistL).toFixed(1));
  R.fhandR.setAttribute('cx',s.handR.x.toFixed(1)); R.fhandR.setAttribute('cy',s.handR.y.toFixed(1));
  R.fhandR.setAttribute('r',(5.5*s.fistR).toFixed(1));
  if(R.fbar){
    var y=(s.handL.y+s.handR.y)/2, x1=Math.min(s.handL.x,s.handR.x), x2=Math.max(s.handL.x,s.handR.x);
    R.fbar.setAttribute('x',(x1-16).toFixed(1)); R.fbar.setAttribute('y',(y-2.5).toFixed(1));
    R.fbar.setAttribute('width',(x2-x1+32).toFixed(1));
    if(R.fpL){ R.fpL.setAttribute('cx',(x1-13).toFixed(1)); R.fpL.setAttribute('cy',y.toFixed(1));
               R.fpR.setAttribute('cx',(x2+13).toFixed(1)); R.fpR.setAttribute('cy',y.toFixed(1)); }
  }
  if(R.fkb){
    var kb=bellFront(ex,s), kx=kb.h.x, ky=kb.h.y;
    R.fkbH.setAttribute('d','M'+(kx-6).toFixed(1)+','+ky.toFixed(1)+
      ' Q'+kx.toFixed(1)+','+(ky-7*kb.u).toFixed(1)+' '+(kx+6).toFixed(1)+','+ky.toFixed(1));
    R.fkb.setAttribute('cx',kb.x.toFixed(1)); R.fkb.setAttribute('cy',kb.y.toFixed(1));
  }
  // A one-handed lift (load) has its one implement in that hand; the other
  // hand's is drawn over it.
  var hL=ex.load==='R'?s.handR:s.handL, hR=ex.load==='L'?s.handL:s.handR;
  if(R.fhL){
    [['L',hL],['R',hR]].forEach(function(pr){
      var h=pr[1];
      R['fh'+pr[0]].setAttribute('x',(h.x-10).toFixed(1)); R['fh'+pr[0]].setAttribute('y',(h.y-3).toFixed(1));
      R['fc'+pr[0]+'1'].setAttribute('x',(h.x-13).toFixed(1)); R['fc'+pr[0]+'1'].setAttribute('y',(h.y-8).toFixed(1));
      R['fc'+pr[0]+'2'].setAttribute('x',(h.x+7).toFixed(1));  R['fc'+pr[0]+'2'].setAttribute('y',(h.y-8).toFixed(1));
    });
  }
  if(R.fppL){ R.fppL.setAttribute('cx',hL.x.toFixed(1)); R.fppL.setAttribute('cy',(hL.y+7).toFixed(1));
    R.fppR.setAttribute('cx',hR.x.toFixed(1)); R.fppR.setAttribute('cy',(hR.y+7).toFixed(1)); }
  if(R.fcabL && ex.anchorFront){ var one=ex.anchorFront.length<4;
    (one?[['L',ex.load?(ex.load==='L'?s.handL:s.handR):P((s.handL.x+s.handR.x)/2,(s.handL.y+s.handR.y)/2)]]:[['L',s.handL],['R',s.handR]]).forEach(function(pr){
      var h=pr[1], ax=ex.anchorFront[pr[0]==='L'?0:2], ay=ex.anchorFront[pr[0]==='L'?1:3];
      R['fcab'+pr[0]].setAttribute('x1',ax); R['fcab'+pr[0]].setAttribute('y1',ay);
      R['fcab'+pr[0]].setAttribute('x2',h.x.toFixed(1)); R['fcab'+pr[0]].setAttribute('y2',h.y.toFixed(1));
      R['fgrip'+pr[0]].setAttribute('x',(h.x-2.5).toFixed(1)); R['fgrip'+pr[0]].setAttribute('y',(h.y-6.5).toFixed(1));
    });
  }
  if(R.fbellL){
    R.fbellL.setAttribute('cx',hL.x.toFixed(1)); R.fbellL.setAttribute('cy',hL.y.toFixed(1));
    R.fbellR.setAttribute('cx',hR.x.toFixed(1)); R.fbellR.setAttribute('cy',hR.y.toFixed(1));
  }
  if(R.fball){ var fb=s.ball||P((s.handL.x+s.handR.x)/2,(s.handL.y+s.handR.y)/2);
    [R.fball,R.fbhub].forEach(function(n){ n.setAttribute('cx',fb.x.toFixed(1)); n.setAttribute('cy',fb.y.toFixed(1)); }); }
  if(R.ropeF){ var rq=ropeAt(s,70), qy=rq.y.toFixed(1), mx=((s.handL.x+s.handR.x)/2).toFixed(1);
    var arch='M'+s.handL.x.toFixed(1)+' '+s.handL.y.toFixed(1)+' Q'+s.handL.x.toFixed(1)+' '+qy+' '+mx+' '+qy+' Q'+s.handR.x.toFixed(1)+' '+qy+' '+s.handR.x.toFixed(1)+' '+s.handR.y.toFixed(1), none='M'+s.handL.x.toFixed(1)+' '+s.handL.y.toFixed(1);
    R.ropeB.setAttribute('d',rq.front?none:arch); R.ropeF.setAttribute('d',rq.front?arch:none); }
  if(R.fdb){
    var mx=(s.handL.x+s.handR.x)/2, my=(s.handL.y+s.handR.y)/2;
    R.fdb.setAttribute('x',(mx-4.5).toFixed(1));  R.fdb.setAttribute('y',(my-10).toFixed(1));
    R.fdb1.setAttribute('x',(mx-9.5).toFixed(1)); R.fdb1.setAttribute('y',(my-14).toFixed(1));
    R.fdb2.setAttribute('x',(mx-9.5).toFixed(1)); R.fdb2.setAttribute('y',(my+7).toFixed(1));
  }
}

var grid=document.getElementById('grid'), refs=[];
EXERCISES.forEach(function(ex,i){
  var c=document.createElement('div');
  c.className='card'+(ex.flag?' flagged':'');
  c.innerHTML='<h3>'+ex.name+(ex.flag?'<span class="flag">you flagged</span>':'')+'</h3>'+
    '<div class="views"><div class="figwrap"><div class="vlbl">Side</div></div>'+
      (ex.front?('<div class="figwrap"><div class="vlbl">'+(ex.frontPlan?'Above':'Front')+'</div></div>'):'')+'</div>'+
    '<div class="lbl">The real movement</div><p class="body-copy">'+ex.real+'</p>'+
    '<div class="lbl">What changed</div><p class="changed">'+ex.changed+'</p>';
  grid.appendChild(c);
  // Sized as the app's figPairStyle does: the side panel's share of the row
  // and its cap in proportion to its crop, the front 100 wide.
  var wraps=c.querySelectorAll('.figwrap'), bx=boxOf(ex);
  wraps[0].style.flexGrow=bx.w; wraps[0].style.flexBasis='0px'; wraps[0].style.setProperty('--fig-w',(bx.w/100).toFixed(3));
  if(wraps[1]){ wraps[1].style.flexGrow=100; wraps[1].style.flexBasis='0px'; }
  var ref=buildFigure(ex,wraps[0],bx);
  ref.front = ex.front ? buildFront(ex,wraps[1],bx) : null;
  refs.push(ref);
});
// Each rig plays at its own rep length (cycleMs in rig.js), as in the app. The
// scrubber sets every figure to the same point of its own rep.
var playing=true, speed=1, t0=performance.now(), elapsed=0, showPath=false, manual=null;
function frame(now){
  if(playing) elapsed=(now-t0)*speed;
  EXERCISES.forEach(function(ex,i){ var u=manual===null?(elapsed/cycleMs(ex))%1:manual;
    update(ex,refs[i],u); if(refs[i].front) updateFront(ex,refs[i].front,u);
    // A cut (loop:'cut') fades the figure out and in round its swap.
    var a=String(alphaAt(ex,u)); [refs[i].svg,refs[i].front&&refs[i].front.svg].forEach(function(g){ if(g&&g.getAttribute('opacity')!==a) g.setAttribute('opacity',a); }); });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
var playBtn=document.getElementById('playBtn'), scrub=document.getElementById('scrub');
playBtn.addEventListener('click',function(){
  playing=!playing; this.textContent=playing?'Pause':'Play'; this.classList.toggle('on',playing);
  if(playing){ manual=null; t0=performance.now()-elapsed/speed; }
  scrub.disabled=playing;
});
scrub.addEventListener('input',function(){ if(!playing) manual=+this.value/100; });
document.getElementById('slowBtn').addEventListener('click',function(){
  speed = speed===1?0.35:1; this.textContent = speed===1?'Slow motion':'Normal speed';
  this.classList.toggle('on',speed!==1); t0=performance.now()-elapsed/speed;
});
document.getElementById('pathBtn').addEventListener('click',function(){
  showPath=!showPath; this.classList.toggle('on',showPath);
  refs.forEach(function(r){ if(r.trace) r.trace.setAttribute('opacity', showPath?0.85:0); });
});
