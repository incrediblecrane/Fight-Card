var NS='http://www.w3.org/2000/svg';
function el(tag,attrs){ var n=document.createElementNS(NS,tag); for(var k in attrs) n.setAttribute(k,attrs[k]); return n; }
function segPts(A,B,w1,w2){
  var dx=B.x-A.x, dy=B.y-A.y, len=Math.sqrt(dx*dx+dy*dy)||1;
  var px=-dy/len, py=dx/len;
  return [[A.x+px*w1/2,A.y+py*w1/2],[A.x-px*w1/2,A.y-py*w1/2],
          [B.x-px*w2/2,B.y-py*w2/2],[B.x+px*w2/2,B.y+py*w2/2]]
    .map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ');
}
function footPts(ank,knee){
  var back = ank.x>knee.x ? -1 : 1;
  var toe=ank.x-back*L.FOOT*0.72, heel=ank.x+back*L.FOOT*0.28;
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
  if(ex.bench){
    svg.appendChild(el('rect',{x:8,y:139,width:78,height:9,rx:2,fill:'var(--line)'}));
    svg.appendChild(el('rect',{x:20,y:148,width:7,height:22,fill:'var(--line)'}));
    svg.appendChild(el('rect',{x:68,y:148,width:7,height:22,fill:'var(--line)'}));
  }
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
  if(ex.equip==='barbell'||ex.equip==='fixedbar'){
    R.bar=el('rect',{width:68,height:5,rx:2.5,fill:soft});
    eq.appendChild(R.bar);
    if(ex.equip==='barbell'){ R.p1=el('rect',{width:7,height:20,rx:2,fill:soft}); R.p2=el('rect',{width:7,height:20,rx:2,fill:soft}); eq.appendChild(R.p1); eq.appendChild(R.p2); }
  } else if(ex.equip==='dumbbell'){
    R.db=el('rect',{width:8,height:22,rx:3,fill:soft}); R.d1=el('rect',{width:16,height:7,rx:2,fill:soft}); R.d2=el('rect',{width:16,height:7,rx:2,fill:soft});
    eq.appendChild(R.db); eq.appendChild(R.d1); eq.appendChild(R.d2);
  } else if(ex.equip==='kettlebell'){
    R.kb=el('circle',{r:10,fill:soft}); R.kh=el('path',{fill:'none',stroke:soft,'stroke-width':3.5});
    eq.appendChild(R.kb); eq.appendChild(R.kh);
  }
  pair('fleg',far,[13,9,6],true); pair('farm',far,[9,6.5,5],false);
  svg.appendChild(eq);
  R.torso=el('polygon',{fill:ink}); R.hip=el('circle',{r:8.5,fill:ink}); R.sh=el('circle',{r:10.5,fill:ink});
  svg.appendChild(R.torso); svg.appendChild(R.hip); svg.appendChild(R.sh);
  pair('nleg',legCol,[15,10,6.5],true); pair('narm',armCol,[10,7,5.5],false);
  R.head=el('circle',{r:L.HEAD_R,fill:ink}); svg.appendChild(R.head);
  host.appendChild(svg);
  return {R:R,trace:trace};
}
function update(ex,ref,u){
  var s=solve(poseAt(ex,u)), R=ref.R;
  function setLimb(n,a,b,c,w,isLeg){
    R[n+'1'].setAttribute('points',segPts(a,b,w[0],w[1]));
    R[n+'j'].setAttribute('cx',b.x.toFixed(1)); R[n+'j'].setAttribute('cy',b.y.toFixed(1));
    R[n+'2'].setAttribute('points',segPts(b,c,w[1],w[2]));
    if(isLeg) R[n+'e'].setAttribute('points',footPts(c,b));
    else { R[n+'e'].setAttribute('cx',c.x.toFixed(1)); R[n+'e'].setAttribute('cy',c.y.toFixed(1)); }
  }
  setLimb('fleg',s.hipF,s.kneeF,s.ankF,[13,9,6],true);
  setLimb('farm',s.shF,s.elbF,s.handF,[9,6.5,5],false);
  setLimb('nleg',s.hip,s.kneeN,s.ankN,[15,10,6.5],true);
  setLimb('narm',s.sh,s.elbN,s.handN,[10,7,5.5],false);
  R.torso.setAttribute('points',segPts(s.hip,s.sh,17,21));
  R.hip.setAttribute('cx',s.hip.x.toFixed(1)); R.hip.setAttribute('cy',s.hip.y.toFixed(1));
  R.sh.setAttribute('cx',s.sh.x.toFixed(1));  R.sh.setAttribute('cy',s.sh.y.toFixed(1));
  R.head.setAttribute('cx',s.head.x.toFixed(1)); R.head.setAttribute('cy',s.head.y.toFixed(1));
  var p = ex.equip==='fixedbar' ? {x:ex.barAt[0],y:ex.barAt[1]} : s.handN;
  if(R.bar){ R.bar.setAttribute('x',(p.x-34).toFixed(1)); R.bar.setAttribute('y',(p.y-2.5).toFixed(1)); }
  if(R.p1){ R.p1.setAttribute('x',(p.x-40).toFixed(1)); R.p1.setAttribute('y',(p.y-10).toFixed(1));
            R.p2.setAttribute('x',(p.x+33).toFixed(1)); R.p2.setAttribute('y',(p.y-10).toFixed(1)); }
  if(R.db){ R.db.setAttribute('x',(p.x-4).toFixed(1)); R.db.setAttribute('y',(p.y-11).toFixed(1));
            R.d1.setAttribute('x',(p.x-8).toFixed(1)); R.d1.setAttribute('y',(p.y-14).toFixed(1));
            R.d2.setAttribute('x',(p.x-8).toFixed(1)); R.d2.setAttribute('y',(p.y+7).toFixed(1)); }
  if(R.kb){ R.kb.setAttribute('cx',p.x.toFixed(1)); R.kb.setAttribute('cy',(p.y+12).toFixed(1));
            R.kh.setAttribute('d','M'+(p.x-6).toFixed(1)+' '+(p.y+4).toFixed(1)+' Q'+p.x.toFixed(1)+' '+(p.y-8).toFixed(1)+' '+(p.x+6).toFixed(1)+' '+(p.y+4).toFixed(1)); }
}

// ---- front-plane rendering ----
function buildFront(ex,host){
  var svg=el('svg',{viewBox:'20 18 100 168',role:'img','aria-label':ex.name+' front view'});
  var ink='var(--text)', hi='var(--accent)', soft='var(--text-soft)';
  var legCol=ex.active==='legs'?hi:ink, armCol=(ex.active==='arms'||ex.active==='armN')?hi:ink;
  svg.appendChild(el('line',{x1:20,y1:GROUND,x2:120,y2:GROUND,stroke:'var(--line)','stroke-width':3}));
  var R={};
  function limb(n,col,w){
    R[n+'1']=el('polygon',{fill:col}); R[n+'j']=el('circle',{r:w[1]/2,fill:col});
    R[n+'2']=el('polygon',{fill:col});
    [R[n+'1'],R[n+'j'],R[n+'2']].forEach(function(x){svg.appendChild(x);});
  }
  limb('flegL',legCol,[15,10,6.5]); limb('flegR',legCol,[15,10,6.5]);
  R.ffootL=el('ellipse',{rx:7,ry:4,fill:legCol}); R.ffootR=el('ellipse',{rx:7,ry:4,fill:legCol});
  svg.appendChild(R.ffootL); svg.appendChild(R.ffootR);
  R.fneck=el('rect',{width:9,height:12,rx:3,fill:ink}); svg.appendChild(R.fneck);
  R.ftorso=el('polygon',{fill:ink}); svg.appendChild(R.ftorso);
  R.fhipL=el('circle',{r:7,fill:ink}); R.fhipR=el('circle',{r:7,fill:ink});
  svg.appendChild(R.fhipL); svg.appendChild(R.fhipR);
  limb('farmL',armCol,[10,7,5.5]); limb('farmR',armCol,[10,7,5.5]);
  R.fshL=el('circle',{r:8,fill:ink}); R.fshR=el('circle',{r:8,fill:ink});
  svg.appendChild(R.fshL); svg.appendChild(R.fshR);
  R.fhead=el('circle',{r:L.HEAD_R,fill:ink}); svg.appendChild(R.fhead);
  R.fhandL=el('circle',{fill:armCol}); R.fhandR=el('circle',{fill:armCol});
  svg.appendChild(R.fhandL); svg.appendChild(R.fhandR);
  if(ex.equip==='barbell'||ex.equip==='fixedbar'){
    R.fbar=el('rect',{height:5,rx:2.5,fill:soft});
    R.fpL=el('ellipse',{rx:5,ry:13,fill:'var(--surface)',stroke:soft,'stroke-width':3});
    R.fpR=el('ellipse',{rx:5,ry:13,fill:'var(--surface)',stroke:soft,'stroke-width':3});
    svg.appendChild(R.fbar);
    if(ex.equip==='barbell'){ svg.appendChild(R.fpL); svg.appendChild(R.fpR); }
  }
  if(ex.equip==='dumbbell'){
    R.fdb=el('rect',{width:9,height:20,rx:3,fill:soft});
    R.fdb1=el('rect',{width:19,height:7,rx:2.5,fill:soft});
    R.fdb2=el('rect',{width:19,height:7,rx:2.5,fill:soft});
    svg.appendChild(R.fdb); svg.appendChild(R.fdb1); svg.appendChild(R.fdb2);
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
  setL('flegL',s.hipL,s.kneeL,s.footL,[15,10,6.5]); setL('flegR',s.hipR,s.kneeR,s.footR,[15,10,6.5]);
  setL('farmL',s.shL,s.elbL,s.handL,[10,7,5.5]);    setL('farmR',s.shR,s.elbR,s.handR,[10,7,5.5]);
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
      (ex.front?'<div class="figwrap"><div class="vlbl">Front</div></div>':'')+'</div>'+
    '<div class="lbl">The real movement</div><p class="body-copy">'+ex.real+'</p>'+
    '<div class="lbl">What changed</div><p class="changed">'+ex.changed+'</p>';
  grid.appendChild(c);
  var wraps=c.querySelectorAll('.figwrap');
  var ref=buildFigure(ex,wraps[0]);
  ref.front = ex.front ? buildFront(ex,wraps[1]) : null;
  refs.push(ref);
});
var playing=true, speed=1, t0=performance.now(), CYCLE=2400, showPath=false, manual=0;
function frame(now){
  if(playing){ manual=((now-t0)/CYCLE*speed)%1; }
  EXERCISES.forEach(function(ex,i){ update(ex,refs[i],manual); if(refs[i].front) updateFront(ex,refs[i].front,manual); });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
var playBtn=document.getElementById('playBtn'), scrub=document.getElementById('scrub');
playBtn.addEventListener('click',function(){
  playing=!playing; this.textContent=playing?'Pause':'Play'; this.classList.toggle('on',playing);
  if(playing) t0=performance.now()-manual*CYCLE/speed;
  scrub.disabled=playing;
});
scrub.addEventListener('input',function(){ if(!playing) manual=+this.value/100; });
document.getElementById('slowBtn').addEventListener('click',function(){
  speed = speed===1?0.35:1; this.textContent = speed===1?'Slow motion':'Normal speed';
  this.classList.toggle('on',speed!==1); t0=performance.now()-manual*CYCLE/speed;
});
document.getElementById('pathBtn').addEventListener('click',function(){
  showPath=!showPath; this.classList.toggle('on',showPath);
  refs.forEach(function(r){ if(r.trace) r.trace.setAttribute('opacity', showPath?0.85:0); });
});
