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
// foot backwards through most of every squat.
function footPts(ank,rot){
  if(rot){
    // Pivot about the ball of the foot: the toe stays put and the heel lifts.
    var r=rot*Math.PI/180, ball={x:ank.x+L.FOOT*0.72, y:ank.y};
    function rp(x,y){ var dx=x-ball.x, dy=y-ball.y;
      return (ball.x+dx*Math.cos(r)-dy*Math.sin(r)).toFixed(1)+','+(ball.y+dx*Math.sin(r)+dy*Math.cos(r)).toFixed(1); }
    return [rp(ank.x+L.FOOT*0.72,ank.y+1), rp(ank.x+L.FOOT*0.72,ank.y+6),
            rp(ank.x-L.FOOT*0.28,ank.y+6), rp(ank.x-L.FOOT*0.28,ank.y+1)].join(' ');
  }
  var toe=ank.x+L.FOOT*0.72, heel=ank.x-L.FOOT*0.28;
  return heel.toFixed(1)+','+(ank.y-3.5)+' '+heel.toFixed(1)+','+(ank.y+4)+' '+
         toe.toFixed(1)+','+(ank.y+4)+' '+toe.toFixed(1)+','+(ank.y+0.5);
}
// Precompute the bar path over a full rep so it can be shown as a trace.
function barPath(ex){
  if(!ex.equip||ex.equip==='fixedbar') return null;
  var pts=[];
  for(var i=0;i<=90;i++){ var s=solve(poseAt(ex,i/90)); pts.push(s.handN.x.toFixed(1)+','+s.handN.y.toFixed(1)); }
  return pts.join(' ');
}
function buildFigure(ex,host){
  var svg=el('svg',{viewBox:'-20 18 175 168',role:'img','aria-label':ex.name+' animation'});
  var ink='var(--text)', far='var(--text-faint)', hi='var(--accent)', soft='var(--text-soft)';
  var legCol = ex.active==='legs'?hi:ink;
  var armCol = (ex.active==='arms'||ex.active==='armN')?hi:ink;
  svg.appendChild(el('line',{x1:-15,y1:GROUND,x2:150,y2:GROUND,stroke:'var(--line)','stroke-width':3}));
  // Props are part of the movement, not decoration: a split squat without the
  // bench behind it is a lunge, and a wall sit without the wall is a squat.
  (ex.props||[]).forEach(function(p){
    var a={x:p[0],y:p[1],width:p[2],height:p[3],rx:p[4]===undefined?2:p[4],fill:'var(--line)'};
    if(p[5]) a.transform='rotate('+p[5]+' '+(p[0]+p[2]/2)+' '+(p[1]+p[3]/2)+')';
    svg.appendChild(el('rect',a));
  });
  var bp=barPath(ex), trace=null;
  if(bp){ trace=el('polyline',{points:bp,fill:'none',stroke:'var(--accent)','stroke-width':1.2,'stroke-dasharray':'3 3',opacity:0}); svg.appendChild(trace); }
  var R={};
  function pair(name,col,w,isLeg){
    R[name+'1']=el('polygon',{fill:col}); R[name+'j']=el('circle',{r:w[1]/2,fill:col});
    R[name+'2']=el('polygon',{fill:col});
    R[name+'e']= isLeg ? el('polygon',{fill:col}) : el('circle',{r:w[2]/2+0.8,fill:col});
    [R[name+'1'],R[name+'j'],R[name+'2'],R[name+'e']].forEach(function(n){svg.appendChild(n);});
  }
  // equipment sits behind the near-side limbs
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
    R.plate=el('circle',{r:15,fill:'var(--surface)',stroke:soft,'stroke-width':3});
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
    R.cable=el('line',{stroke:soft,'stroke-width':1.8}); R.grip=el('rect',{width:5,height:13,rx:2.5,fill:soft});
    eq.appendChild(R.cable); eq.appendChild(R.grip);
  } else if(ex.equip==='dumbbell'){
    // Hanging in a neutral grip the handle runs front to back, so from the side
    // you see the whole dumbbell in profile, lying horizontal.
    R.db=el('rect',{width:22,height:7,rx:3,fill:soft}); R.d1=el('rect',{width:7,height:17,rx:2,fill:soft}); R.d2=el('rect',{width:7,height:17,rx:2,fill:soft});
    eq.appendChild(R.db); eq.appendChild(R.d1); eq.appendChild(R.d2);
  } else if(ex.equip==='kettlebell'){
    R.kb=el('circle',{r:10,fill:soft}); R.kh=el('path',{fill:'none',stroke:soft,'stroke-width':3.5});
    eq.appendChild(R.kb); eq.appendChild(R.kh);
  }
  pair('fleg',far,[10,7,5],true); pair('farm',far,[7,5,4],false);
  svg.appendChild(eq);
  R.torso=el('polygon',{fill:ink}); R.hip=el('circle',{r:6.5,fill:ink}); R.sh=el('circle',{r:8.5,fill:ink});
  svg.appendChild(R.torso); svg.appendChild(R.hip); svg.appendChild(R.sh);
  pair('nleg',legCol,[11,8,5.5],true); pair('narm',armCol,[8,6,4.5],false);
  R.head=el('circle',{r:L.HEAD_R,fill:ink}); svg.appendChild(R.head);
  host.appendChild(svg);
  return {R:R,trace:trace};
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
  setLimb('fleg',s.hipF,s.kneeF,s.ankF,[10,7,5],true,s.footRot);
  setLimb('farm',s.shF,s.elbF,s.handF,[7,5,4],false);
  setLimb('nleg',s.hip,s.kneeN,s.ankN,[11,8,5.5],true,s.footRot);
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
  if(R.hub){ R.hub.setAttribute('cx',p.x.toFixed(1)); R.hub.setAttribute('cy',p.y.toFixed(1)); }
  if(R.bell){ R.bell.setAttribute('cx',p.x.toFixed(1)); R.bell.setAttribute('cy',p.y.toFixed(1)); }
  if(R.cable && ex.anchorAt){
    R.cable.setAttribute('x1',ex.anchorAt[0]); R.cable.setAttribute('y1',ex.anchorAt[1]);
    R.cable.setAttribute('x2',p.x.toFixed(1)); R.cable.setAttribute('y2',p.y.toFixed(1));
    R.grip.setAttribute('x',(p.x-2.5).toFixed(1)); R.grip.setAttribute('y',(p.y-6.5).toFixed(1));
  }
  if(R.db && axis2==='vertical'){
    R.db.setAttribute('x',(p.x-4).toFixed(1)); R.db.setAttribute('y',(p.y-11).toFixed(1));
    R.d1.setAttribute('x',(p.x-8).toFixed(1)); R.d1.setAttribute('y',(p.y-14).toFixed(1));
    R.d2.setAttribute('x',(p.x-8).toFixed(1)); R.d2.setAttribute('y',(p.y+7).toFixed(1));
  } else if(R.db){
    R.db.setAttribute('x',(p.x-11).toFixed(1)); R.db.setAttribute('y',(p.y-3.5).toFixed(1));
    R.d1.setAttribute('x',(p.x-14).toFixed(1)); R.d1.setAttribute('y',(p.y-8.5).toFixed(1));
    R.d2.setAttribute('x',(p.x+7).toFixed(1));  R.d2.setAttribute('y',(p.y-8.5).toFixed(1));
  }
  if(R.kb){ R.kb.setAttribute('cx',p.x.toFixed(1)); R.kb.setAttribute('cy',(p.y+12).toFixed(1));
            R.kh.setAttribute('d','M'+(p.x-6).toFixed(1)+' '+(p.y+4).toFixed(1)+' Q'+p.x.toFixed(1)+' '+(p.y-8).toFixed(1)+' '+(p.x+6).toFixed(1)+' '+(p.y+4).toFixed(1)); }
}

// ---- front-plane rendering ----
function buildFront(ex,host){
  var svg=el('svg',{viewBox:'20 18 100 168',role:'img','aria-label':ex.name+' front view'});
  var ink='var(--text)', hi='var(--accent)', soft='var(--text-soft)';
  var legCol=ex.active==='legs'?hi:ink, armCol=(ex.active==='arms'||ex.active==='armN')?hi:ink;
  if(!ex.frontPlan) svg.appendChild(el('line',{x1:20,y1:GROUND,x2:120,y2:GROUND,stroke:'var(--line)','stroke-width':3}));
  (ex.planProps||[]).forEach(function(p){
    svg.appendChild(el('rect',{x:p[0],y:p[1],width:p[2],height:p[3],rx:p[4]===undefined?2:p[4],fill:'var(--line)'}));
  });
  var R={};
  // An arm foreshortened toward the camera lies on top of the torso in the same
  // ink, so it disappears into the silhouette. A surface-coloured outline is
  // what separates it; legs sit outside the body and do not need one.
  function limb(n,col,w,outline){
    var o = outline?{stroke:'var(--surface-raised)','stroke-width':1.6,'stroke-linejoin':'round'}:{};
    function mk(t,a){ for(var k in o) a[k]=o[k]; return el(t,a); }
    R[n+'1']=mk('polygon',{fill:col}); R[n+'j']=mk('circle',{r:w[1]/2,fill:col});
    R[n+'2']=mk('polygon',{fill:col});
    [R[n+'1'],R[n+'j'],R[n+'2']].forEach(function(x){svg.appendChild(x);});
  }
  limb('flegL',legCol,[11,8,5.5]); limb('flegR',legCol,[11,8,5.5]);
  R.ffootL=el('ellipse',{rx:7,ry:4,fill:legCol}); R.ffootR=el('ellipse',{rx:7,ry:4,fill:legCol});
  svg.appendChild(R.ffootL); svg.appendChild(R.ffootR);
  R.fneck=el('rect',{width:7,height:12,rx:3,fill:ink}); svg.appendChild(R.fneck);
  R.ftorso=el('polygon',{fill:ink}); svg.appendChild(R.ftorso);
  R.fhipL=el('circle',{r:5.5,fill:ink}); R.fhipR=el('circle',{r:5.5,fill:ink});
  svg.appendChild(R.fhipL); svg.appendChild(R.fhipR);
  limb('farmL',armCol,[8,6,4.5],true); limb('farmR',armCol,[8,6,4.5],true);
  R.fshL=el('circle',{r:6.5,fill:ink}); R.fshR=el('circle',{r:6.5,fill:ink});
  svg.appendChild(R.fshL); svg.appendChild(R.fshR);
  R.fhead=el('circle',{r:L.HEAD_R,fill:ink}); svg.appendChild(R.fhead);
  R.fhandL=el('circle',{fill:armCol,stroke:'var(--surface-raised)','stroke-width':2});
  R.fhandR=el('circle',{fill:armCol,stroke:'var(--surface-raised)','stroke-width':2});
  // A bar is gripped, so the hands go on top of it; a bell hangs from the
  // hands, so it goes on top of them.
  if(ex.equip==='barbell'||ex.equip==='fixedbar'){
    R.fbar=el('rect',{height:5,rx:2.5,fill:soft});
    R.fpL=el('ellipse',{rx:5,ry:13,fill:'var(--surface)',stroke:soft,'stroke-width':3});
    R.fpR=el('ellipse',{rx:5,ry:13,fill:'var(--surface)',stroke:soft,'stroke-width':3});
    svg.appendChild(R.fbar);
    if(ex.equip==='barbell'){ svg.appendChild(R.fpL); svg.appendChild(R.fpR); }
  }
  svg.appendChild(R.fhandL); svg.appendChild(R.fhandR);
  if(ex.equip==='kettlebell'){
    // Both hands share one handle, so the bell hangs as a single mass below
    // them rather than one weight per hand.
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
  } else if(ex.equip==='cable'){
    R.fcabL=el('line',{stroke:soft,'stroke-width':1.8}); R.fcabR=el('line',{stroke:soft,'stroke-width':1.8});
    R.fgripL=el('rect',{width:5,height:13,rx:2.5,fill:soft}); R.fgripR=el('rect',{width:5,height:13,rx:2.5,fill:soft});
    svg.appendChild(R.fcabL); svg.appendChild(R.fcabR); svg.appendChild(R.fgripL); svg.appendChild(R.fgripR);
  }
  host.appendChild(svg);
  return R;
}
function updateFront(ex,R,u){
  var f=frontAt(ex,u); if(!f) return;
  var s=solveFront(f);
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
    var kx=(s.handL.x+s.handR.x)/2, ky=(s.handL.y+s.handR.y)/2;
    R.fkbH.setAttribute('d','M'+(kx-6).toFixed(1)+','+ky.toFixed(1)+
      ' Q'+kx.toFixed(1)+','+(ky-7).toFixed(1)+' '+(kx+6).toFixed(1)+','+ky.toFixed(1));
    R.fkb.setAttribute('cx',kx.toFixed(1)); R.fkb.setAttribute('cy',(ky+9).toFixed(1));
  }
  if(R.fhL){
    [['L',s.handL],['R',s.handR]].forEach(function(pr){
      var h=pr[1];
      R['fh'+pr[0]].setAttribute('x',(h.x-10).toFixed(1)); R['fh'+pr[0]].setAttribute('y',(h.y-3).toFixed(1));
      R['fc'+pr[0]+'1'].setAttribute('x',(h.x-13).toFixed(1)); R['fc'+pr[0]+'1'].setAttribute('y',(h.y-8).toFixed(1));
      R['fc'+pr[0]+'2'].setAttribute('x',(h.x+7).toFixed(1));  R['fc'+pr[0]+'2'].setAttribute('y',(h.y-8).toFixed(1));
    });
  }
  if(R.fcabL && ex.anchorFront){
    [['L',s.handL],['R',s.handR]].forEach(function(pr){
      var h=pr[1], ax=ex.anchorFront[pr[0]==='L'?0:2], ay=ex.anchorFront[pr[0]==='L'?1:3];
      R['fcab'+pr[0]].setAttribute('x1',ax); R['fcab'+pr[0]].setAttribute('y1',ay);
      R['fcab'+pr[0]].setAttribute('x2',h.x.toFixed(1)); R['fcab'+pr[0]].setAttribute('y2',h.y.toFixed(1));
      R['fgrip'+pr[0]].setAttribute('x',(h.x-2.5).toFixed(1)); R['fgrip'+pr[0]].setAttribute('y',(h.y-6.5).toFixed(1));
    });
  }
  if(R.fbellL){
    R.fbellL.setAttribute('cx',s.handL.x.toFixed(1)); R.fbellL.setAttribute('cy',s.handL.y.toFixed(1));
    R.fbellR.setAttribute('cx',s.handR.x.toFixed(1)); R.fbellR.setAttribute('cy',s.handR.y.toFixed(1));
  }
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
  var wraps=c.querySelectorAll('.figwrap');
  var ref=buildFigure(ex,wraps[0]);
  ref.front = ex.front ? buildFront(ex,wraps[1]) : null;
  refs.push(ref);
});
// Each rig plays at its own rep length (cycleMs in rig.js), as in the app. The
// scrubber sets every figure to the same point of its own rep.
var playing=true, speed=1, t0=performance.now(), elapsed=0, showPath=false, manual=null;
function frame(now){
  if(playing) elapsed=(now-t0)*speed;
  EXERCISES.forEach(function(ex,i){ var u=manual===null?(elapsed/cycleMs(ex))%1:manual;
    update(ex,refs[i],u); if(refs[i].front) updateFront(ex,refs[i].front,u); });
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
