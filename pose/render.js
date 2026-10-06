// The preview: every rig drawn as the app draws it. The drawing is the app's
// own (rigSVG and rigFrontSVG in index.html, copied here onto rig.js's solver),
// and pose/checks/render.js fails unless the two draw the same shapes.
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
  var w=Math.max(100,x1-x0+12), vx=(x0+x1)/2-w/2, y=Math.min(18,Math.floor(top-2)), fw=ex.frontW||100;
  return {x:Math.round(vx*10)/10, w:Math.round(w*10)/10, y:y, h:186-y, fx:70-fw/2, fw:fw};
}
// ---- the app's drawing ----
function rP(x,y){ return {x:x,y:y}; }
// A rope strand from a hand to the far end of the loop, bowed back against
// the way the rope is turning.
function rRopePath(h,q,a){
  var r=a*Math.PI/180, vx=28*Math.cos(r), vy=60*Math.sin(r), vl=Math.hypot(vx,vy)||1;
  var cx=(h.x+q.x)/2-vx/vl*8, cy=(h.y+q.y)/2-vy/vl*8;
  return 'M'+h.x.toFixed(1)+' '+h.y.toFixed(1)+' Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+q.x.toFixed(1)+' '+q.y.toFixed(1);
}

// ---- the figure's shapes ----
// Each part of the figure is one shape with the same commands every frame,
// so a rep moves it in place (drawInPlace) rather than drawing it again.
function rF(n){ return n.toFixed(1); }
function rXY(p){ return rF(p.x)+','+rF(p.y); }
// A limb segment: a tapered capsule, rounded at both joints, its radius rA at
// A and rB at B (the outer tangents of the two circles and an arc round each).
function rCap(A,rA,B,rB){
  var dx=B.x-A.x, dy=B.y-A.y, l=Math.sqrt(dx*dx+dy*dy);
  if(l<0.05){ dx=0; dy=-0.05; l=0.05; }
  // A bone seen end on (an arm toward the camera) is short: its root narrows
  // to fit, so the outline stays round both joints.
  if(Math.abs(rA-rB)>0.9*l) rA=rB+(rA>rB?0.9:-0.9)*l;
  var ux=dx/l, uy=dy/l, s=(rA-rB)/l, c=Math.sqrt(1-s*s);
  var w1=rP(ux*s-uy*c,uy*s+ux*c), w2=rP(ux*s+uy*c,uy*s-ux*c);
  function at(P,w,r){ return rXY(rP(P.x+w.x*r,P.y+w.y*r)); }
  return 'M'+at(A,w1,rA)+' L'+at(B,w1,rB)+' A'+rF(rB)+','+rF(rB)+' 0 '+(s<0?1:0)+',0 '+at(B,w2,rB)+
    ' L'+at(A,w2,rA)+' A'+rF(rA)+','+rF(rA)+' 0 '+(s>0?1:0)+',0 '+at(A,w1,rA)+'Z';
}
// A closed curve through the points (Catmull-Rom as cubic Beziers).
function rSmooth(P){
  var n=P.length, d='M'+rXY(P[0]);
  for(var i=0;i<n;i++){ var a=P[(i+n-1)%n], b=P[i], c=P[(i+1)%n], e=P[(i+2)%n];
    d+=' C'+rXY(rP(b.x+(c.x-a.x)/6,b.y+(c.y-a.y)/6))+' '+rXY(rP(c.x-(e.x-b.x)/6,c.y-(e.y-b.y)/6))+' '+rXY(c); }
  return d+'Z';
}
// The trunk from the side: pelvis, waist and chest along the spine, from the
// hip through mid-spine (bowed when the rig bows it) to the shoulder. Each
// station is [how far up the spine, front, back]; the front is the side the
// figure faces.
var RTORSO=[[-0.16,2.5,4.5],[-0.04,6,8],[0.18,5.6,7.2],[0.42,5,5.6],[0.66,7.6,6],[0.86,7.2,6.6],[1,5.2,6.6],[1.1,1.8,4.2]];
function rTorsoPts(hip,mid,sh){
  var fr=[], bk=[];
  RTORSO.forEach(function(st){ var lo=st[0]<0.5, A=lo?hip:mid, B=lo?mid:sh, t=(st[0]-(lo?0:0.5))*2;
    var dx=B.x-A.x, dy=B.y-A.y, l=Math.sqrt(dx*dx+dy*dy)||1, fx=-dy/l, fy=dx/l, cx=A.x+dx*t, cy=A.y+dy*t;
    fr.push(rP(cx+fx*st[1],cy+fy*st[1])); bk.unshift(rP(cx-fx*st[2],cy-fy*st[2])); });
  return fr.concat(bk);
}
// The head from the side, in profile, turned the way the neck points: the
// skull, the brow, nose and chin toward the front, so it shows which way the
// figure faces (down in a push-up, up on a bench). [forward, up] from the
// head's centre.
var RHEAD=[[-7,0.5],[-5.4,5.6],[0.2,8],[5.2,5.8],[7.2,1.4],[7.9,-1.4],[6.8,-4.4],[4.8,-6.8],[0.4,-6.4],[-5.2,-4.4]];
function rHeadPts(sh,head){
  var dx=head.x-sh.x, dy=head.y-sh.y, l=Math.sqrt(dx*dx+dy*dy)||1, ux=dx/l, uy=dy/l, fx=-uy, fy=ux;
  return RHEAD.map(function(p){ return rP(head.x+fx*p[0]+ux*p[1], head.y+fy*p[0]+uy*p[1]); });
}
function rNeck(sh,head){
  var dx=head.x-sh.x, dy=head.y-sh.y, l=Math.sqrt(dx*dx+dy*dy)||1, ux=dx/l, uy=dy/l;
  return rCap(rP(sh.x+ux,sh.y+uy),3.6,rP(head.x-ux*4+uy*0.6,head.y-uy*4-ux*0.6),3);
}
// A shoe in profile, toe to +x, hinged at the ankle and pitched as the foot
// block is (rFootPts), its sole where the block's is.
var RSHOE=[[-3.4,-1.4],[-4.5,2.8],[-3.6,6],[9.8,6],[10.8,4.6],[8,2.4],[2.8,-1.2]];
function rShoePts(ank,rot){
  var r=(rot||0)*Math.PI/180, c=Math.cos(r), sn=Math.sin(r);
  return RSHOE.map(function(p){ return rP(ank.x+p[0]*c-p[1]*sn, ank.y+p[0]*sn+p[1]*c); });
}
// The trunk from the front: shoulders, chest, waist and pelvis between the
// shoulder line and the hips. [how far down, half width].
function rTorsoFrontPts(s){
  var a=rP((s.shL.x+s.shR.x)/2,(s.shL.y+s.shR.y)/2), b=rP((s.hipL.x+s.hipR.x)/2,(s.hipL.y+s.hipR.y)/2);
  var w=Math.abs(s.shR.x-s.shL.x)/2, hw=Math.abs(s.hipR.x-s.hipL.x)/2;
  var st=[[-0.02,w*0.55],[0.06,w+1.5],[0.3,w*0.92],[0.62,w*0.74],[0.86,hw+2],[1.04,hw+3],[1.18,hw-3]];
  function at(t,x){ return rP(a.x+(b.x-a.x)*t+x, a.y+(b.y-a.y)*t); }
  var P=st.map(function(q){ return at(q[0],q[1]); });
  P.push(at(1.22,0));
  return P.concat(st.slice().reverse().map(function(q){ return at(q[0],-q[1]); }),[at(-0.06,0)]);
}
// Part radii: [root, joint, end, hand].
var RW={leg:[6.2,4.3,2.9], legF:[5.6,3.9,2.6], arm:[4.1,3,2.3,3.2], armF:[3.6,2.7,2.1,2.9], fleg:[6.2,4.4,2.9], farm:[4.4,3.1,2.4,3.4]};
// A cut line: a rim of panel colour under the part's own fill, so a near limb
// shows where it crosses the body, the head or the other limb.
var RCUT=' stroke="var(--surface-raised)" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"';
function rPart(p,d,col,cut){ return '<path data-p="'+p+'" d="'+d+'" fill="'+col+'"'+(cut?RCUT:'')+'/>'; }
function rDot(p,c,r,col,cut){ return '<circle data-p="'+p+'" cx="'+rF(c.x)+'" cy="'+rF(c.y)+'" r="'+r+'" fill="'+col+'"'+(cut?RCUT:'')+'/>'; }

// An implement is drawn as it PROJECTS in this view, never as a generic icon.
// A barbell runs across the body, so from the SIDE its axis points at you and
// you see the plate as a disc; from the FRONT you see the bar with the plates
// edge-on. axis: lateral = across the body, sagittal = front to back (a neutral
// grip), vertical = upright (a goblet). This is why a hammer curl and a bicep
// curl look different in both views despite identical joint angles.
function rAxis(ex){ return ex.axis || (ex.equip==='dumbbell' ? 'sagittal' : 'lateral'); }
function rEquip(ex,s){
  var soft='var(--text-soft)', ax=rAxis(ex);
  var p = ex.equip==='fixedbar'&&ex.barAt ? {x:ex.barAt[0],y:ex.barAt[1]} : ex.equip==='ball'&&s.ball ? s.ball : s.handN;
  var x=p.x.toFixed(1), y=p.y.toFixed(1);
  if(ex.equip==='barbell') return '<circle cx="'+x+'" cy="'+y+'" r="15" fill="none" stroke="'+soft+'" stroke-width="3.5"/>'+
    '<circle cx="'+x+'" cy="'+y+'" r="3.5" fill="'+soft+'"/>';
  if(ex.equip==='fixedbar') return '<circle cx="'+x+'" cy="'+y+'" r="3.2" fill="'+soft+'"/>';
  // A cable with no anchorAt runs toward or away from the camera (a Pallof
  // press stands side on to it): only its handle shows.
  if(ex.equip==='cable') return (ex.anchorAt?'<line x1="'+ex.anchorAt[0]+'" y1="'+ex.anchorAt[1]+'" x2="'+x+'" y2="'+y+'" stroke="'+soft+'" stroke-width="1.8"/>':'')+
    '<rect x="'+(p.x-2.5).toFixed(1)+'" y="'+(p.y-6.5).toFixed(1)+'" width="5" height="13" rx="2.5" fill="'+soft+'"/>';
  if(ex.equip==='dumbbell'&&ax==='lateral') return '<circle cx="'+x+'" cy="'+y+'" r="6.5" fill="'+soft+'"/>';
  if(ex.equip==='dumbbell'&&ax==='vertical') return '<rect x="'+(p.x-4).toFixed(1)+'" y="'+(p.y-11).toFixed(1)+'" width="8" height="22" rx="3" fill="'+soft+'"/>'+
    '<rect x="'+(p.x-8).toFixed(1)+'" y="'+(p.y-14).toFixed(1)+'" width="16" height="7" rx="2" fill="'+soft+'"/>'+
    '<rect x="'+(p.x-8).toFixed(1)+'" y="'+(p.y+7).toFixed(1)+'" width="16" height="7" rx="2" fill="'+soft+'"/>';
  if(ex.equip==='dumbbell') return '<rect x="'+(p.x-11).toFixed(1)+'" y="'+(p.y-3.5).toFixed(1)+'" width="22" height="7" rx="3" fill="'+soft+'"/>'+
    '<rect x="'+(p.x-14).toFixed(1)+'" y="'+(p.y-8.5).toFixed(1)+'" width="7" height="17" rx="2" fill="'+soft+'"/>'+
    '<rect x="'+(p.x+7).toFixed(1)+'" y="'+(p.y-8.5).toFixed(1)+'" width="7" height="17" rx="2" fill="'+soft+'"/>';
  // A med ball is a plain sphere and a pinch plate is a disc seen edge-on: both
  // read wrong as any of the bar shapes, so they get their own marks.
  if(ex.equip==='ball') return '<circle cx="'+x+'" cy="'+y+'" r="11" fill="none" stroke="'+soft+'" stroke-width="3"/>'+
    '<circle cx="'+x+'" cy="'+y+'" r="3" fill="'+soft+'"/>';
  // A pinch grip holds the plate by its rim, so it hangs below the fist,
  // nearly edge on: a ring, as the second panel draws a barbell's plates.
  if(ex.equip==='plate') return '<ellipse cx="'+x+'" cy="'+(p.y+9).toFixed(1)+'" rx="4.5" ry="13" fill="var(--surface)" stroke="'+soft+'" stroke-width="3"/>';
  // The handle loops round the fist on the side away from the bell.
  if(ex.equip==='kettlebell'){ var kb=bellAt(ex,s), d=kb.d;
    return '<circle cx="'+kb.x.toFixed(1)+'" cy="'+kb.y.toFixed(1)+'" r="10" fill="'+soft+'"/>'+
      '<path d="M'+(p.x+4*d.x+6*d.y).toFixed(1)+' '+(p.y+4*d.y-6*d.x).toFixed(1)+' Q'+(p.x-8*d.x).toFixed(1)+' '+(p.y-8*d.y).toFixed(1)+' '+(p.x+4*d.x-6*d.y).toFixed(1)+' '+(p.y+4*d.y+6*d.x).toFixed(1)+'" fill="none" stroke="'+soft+'" stroke-width="3.5"/>'; }
  return '';
}

function rEquipFront(ex,s){
  var soft='var(--text-soft)', ax=rAxis(ex), L=s.handL, R=s.handR;
  var y=((L.y+R.y)/2), x1=Math.min(L.x,R.x), x2=Math.max(L.x,R.x);
  // A one-handed lift (load:'L'|'R') carries its one implement in that hand:
  // a suitcase carry with a dumbbell in each hand is a farmer's carry.
  var hands=ex.load?[ex.load==='L'?L:R]:[L,R];
  if(ex.equip==='barbell'||ex.equip==='fixedbar'){
    var o='<rect x="'+(x1-16).toFixed(1)+'" y="'+(y-2.5).toFixed(1)+'" width="'+(x2-x1+32).toFixed(1)+'" height="5" rx="2.5" fill="'+soft+'"/>';
    if(ex.equip==='barbell') o+='<ellipse cx="'+(x1-13).toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="5" ry="13" fill="var(--surface)" stroke="'+soft+'" stroke-width="3"/>'+
      '<ellipse cx="'+(x2+13).toFixed(1)+'" cy="'+y.toFixed(1)+'" rx="5" ry="13" fill="var(--surface)" stroke="'+soft+'" stroke-width="3"/>';
    return o;
  }
  if(ex.equip==='ball'){
    var bx=s.ball?s.ball.x:(L.x+R.x)/2, by=s.ball?s.ball.y:y;
    return '<circle cx="'+bx.toFixed(1)+'" cy="'+by.toFixed(1)+'" r="11" fill="none" stroke="'+soft+'" stroke-width="3"/>'+
      '<circle cx="'+bx.toFixed(1)+'" cy="'+by.toFixed(1)+'" r="3" fill="'+soft+'"/>';
  }
  // Edge-on from the side, disc face from the front: one plate per hand.
  if(ex.equip==='plate'){
    return hands.map(function(q){
      return '<circle cx="'+q.x.toFixed(1)+'" cy="'+(q.y+7).toFixed(1)+'" r="10" fill="none" stroke="'+soft+'" stroke-width="3"/>';
    }).join('');
  }
  // One anchor ([x,y]) is one cable to one handle, held in both hands (a
  // woodchopper, a Pallof press) or the loaded one; two are a cable per hand.
  // Two cables from opposite sides drew a woodchopper as a cable crossover.
  if(ex.equip==='cable'&&ex.anchorFront){ var af=ex.anchorFront;
    return (af.length<4?[[ex.load?hands[0]:rP((L.x+R.x)/2,(L.y+R.y)/2),af[0],af[1]]]:[[L,af[0],af[1]],[R,af[2],af[3]]]).map(function(q){
      return '<line x1="'+q[1]+'" y1="'+q[2]+'" x2="'+q[0].x.toFixed(1)+'" y2="'+q[0].y.toFixed(1)+'" stroke="'+soft+'" stroke-width="1.8"/>'+
        '<rect x="'+(q[0].x-2.5).toFixed(1)+'" y="'+(q[0].y-6.5).toFixed(1)+'" width="5" height="13" rx="2.5" fill="'+soft+'"/>';
    }).join('');
  }
  if(ex.equip==='dumbbell'&&ax==='vertical'){
    var mx=(L.x+R.x)/2, my=(L.y+R.y)/2;
    return '<rect x="'+(mx-4.5).toFixed(1)+'" y="'+(my-10).toFixed(1)+'" width="9" height="20" rx="3" fill="'+soft+'"/>'+
      '<rect x="'+(mx-9.5).toFixed(1)+'" y="'+(my-14).toFixed(1)+'" width="19" height="7" rx="2.5" fill="'+soft+'"/>'+
      '<rect x="'+(mx-9.5).toFixed(1)+'" y="'+(my+7).toFixed(1)+'" width="19" height="7" rx="2.5" fill="'+soft+'"/>';
  }
  if(ex.equip==='dumbbell'&&ax==='lateral'){
    return hands.map(function(h){
      return '<rect x="'+(h.x-10).toFixed(1)+'" y="'+(h.y-3).toFixed(1)+'" width="20" height="6" rx="3" fill="'+soft+'"/>'+
        '<rect x="'+(h.x-13).toFixed(1)+'" y="'+(h.y-8).toFixed(1)+'" width="6" height="16" rx="2" fill="'+soft+'"/>'+
        '<rect x="'+(h.x+7).toFixed(1)+'" y="'+(h.y-8).toFixed(1)+'" width="6" height="16" rx="2" fill="'+soft+'"/>';
    }).join('');
  }
  if(ex.equip==='dumbbell') return hands.map(function(h){
    return '<circle cx="'+h.x.toFixed(1)+'" cy="'+h.y.toFixed(1)+'" r="6" fill="'+soft+'"/>'; }).join('');
  if(ex.equip==='kettlebell'){
    var kb=bellFront(ex,s), kx=kb.h.x, ky=kb.h.y;
    return '<path d="M'+(kx-6).toFixed(1)+','+ky.toFixed(1)+' Q'+kx.toFixed(1)+','+(ky-7*kb.u).toFixed(1)+' '+(kx+6).toFixed(1)+','+ky.toFixed(1)+'" fill="none" stroke="'+soft+'" stroke-width="3.4" stroke-linecap="round"/>'+
      '<circle cx="'+kb.x.toFixed(1)+'" cy="'+kb.y.toFixed(1)+'" r="9" fill="'+soft+'"/>';
  }
  return '';
}
// A prop is part of the movement (the bench, the box, the wall), so it has an
// edge of its own (--prop, 3:1 against the panel) rather than a fill the same
// shade as the floor that vanished in the dark theme.
function rProp(p){
  return '<rect x="'+p[0]+'" y="'+p[1]+'" width="'+p[2]+'" height="'+p[3]+'" rx="'+(p[4]===undefined?2:p[4])+'" fill="var(--prop-fill)" stroke="var(--prop)" stroke-width="1.5"'+
    (p[5]?' transform="rotate('+p[5]+' '+(p[0]+p[2]/2)+' '+(p[1]+p[3]/2)+')"':'')+'/>';
}
// The floor runs the whole width of the panel, not only the cropped figure:
// the svg lets it out and the panel clips it.
function rGround(x0,x1){ return '<line x1="'+(x0-200)+'" y1="'+GROUND+'" x2="'+(x1+200)+'" y2="'+GROUND+'" stroke="var(--ground)" stroke-width="2"/>'; }
// A contact shadow under the feet, narrowing as they leave the floor, drawn
// under the floor line so the floor stays one unbroken line.
function rShadow(cx,rx,gap){ var k=Math.max(0.3,1-Math.max(0,gap)/45);
  return '<ellipse data-p="shadow" cx="'+rF(cx)+'" cy="'+GROUND+'" rx="'+rF(rx*k)+'" ry="2.4" fill="var(--fig-shadow)"/>'; }
// Layered as you would see it: legs behind the body, unless a knee comes up
// in front of it (a knee raised above its hip: high knees, the catch of a
// row); the head, then the arms in front of it, unless the rig holds them
// behind it (behindHead: an overhead triceps extension); a stick behind the
// back (the end of a shoulder dislocate, its side-view hands behind the hip)
// behind the body.
function rigFrontSVG(ex,u,bx){
  if(!ex.front) return '';
  var s=solveFront(frontAt(ex,u));
  var ink='var(--text)', hi='var(--accent)';
  var legCol=ex.active==='legs'?hi:ink, armCol=(ex.active==='arms'||ex.active==='armN')?hi:ink;
  var o='<svg viewBox="'+bx.fx+' '+bx.y+' '+bx.fw+' '+bx.h+'" role="img" aria-label="exercise front view">';
  // From above, the figure lies on a mat; from the front it stands on the
  // floor over its shadow.
  if(ex.frontPlan&&!ex.planProps) o+='<rect data-p="mat" x="'+(bx.fx+8)+'" y="'+(bx.y+4)+'" width="'+(bx.fw-16)+'" height="'+(bx.h-8)+'" rx="8" fill="var(--fig-mat)"/>';
  else o+=rShadow((s.footL.x+s.footR.x)/2,Math.abs(s.footR.x-s.footL.x)/2+8,GROUND-7-Math.max(s.footL.y,s.footR.y))+rGround(bx.fx,bx.fx+bx.fw);
  (ex.planProps||[]).forEach(function(p){ o+=rProp(p); });
  var gd=rGuideOf(ex.id,ex);
  o+=rGhost(gd.front[rGhostEnd(ex,gd,u)]);
  // A skipping rope arches between the hands to the height its loop has
  // reached: behind the body on the way over, in front of it on the way down
  // and under. Both places are always drawn, the unused one empty, so every
  // frame has the same shapes.
  var rope=['',''];
  if(ex.equip==='rope'){ var rq=ropeAt(s,70), st='" fill="none" stroke="var(--text-soft)" stroke-width="1.6"/>',
      mx=((s.handL.x+s.handR.x)/2).toFixed(1), qy=rq.y.toFixed(1),
      arch='<path d="M'+s.handL.x.toFixed(1)+' '+s.handL.y.toFixed(1)+' Q'+s.handL.x.toFixed(1)+' '+qy+' '+mx+' '+qy+' Q'+s.handR.x.toFixed(1)+' '+qy+' '+s.handR.x.toFixed(1)+' '+s.handR.y.toFixed(1)+st,
      none='<path d="M'+s.handL.x.toFixed(1)+' '+s.handL.y.toFixed(1)+st;
    rope=rq.front?[none,arch]:[arch,none]; }
  o+=rope[0];
  var w=RW.fleg, a=RW.farm;
  // A foot is a shoe seen from the front, its toe turned a little out.
  function leg(k,h,kn,f,side){ return rPart('thigh'+k,rCap(h,w[0],kn,w[1]),legCol)+rPart('shin'+k,rCap(kn,w[1],f,w[2]),legCol)+
    (ex.frontPlan?'':'<ellipse data-p="foot'+k+'" cx="'+rF(f.x+side*1.5)+'" cy="'+rF(f.y+4)+'" rx="4.6" ry="3" fill="'+legCol+'"/>'); }
  // The arms carry a cut line, so one crossing the body or the head shows.
  function arm(k,sh,e,h){ return rPart('upper'+k,rCap(sh,a[0],e,a[1]),armCol,1)+rPart('fore'+k,rCap(e,a[1],h,a[2]),armCol,1); }
  var bar=ex.equip==='barbell'||ex.equip==='fixedbar', back=false;
  if(ex.equip==='fixedbar'&&!ex.barAt&&ex.frames){ var sd=solve(poseAt(ex,u)); back=sd.handN.x<sd.hip.x; }
  var upL=!ex.frontPlan&&s.kneeL.y<s.hipL.y-1, upR=!ex.frontPlan&&s.kneeR.y<s.hipR.y-1;
  var legL=leg('L',s.hipL,s.kneeL,s.footL,-1), legR=leg('R',s.hipR,s.kneeR,s.footR,1);
  var head='<ellipse data-p="head" cx="'+rF(s.head.x)+'" cy="'+rF(s.head.y)+'" rx="7" ry="'+(ex.frontPlan?7:7.8)+'" fill="'+ink+'"/>';
  if(back) o+=rEquipFront(ex,s);
  if(!upL) o+=legL;
  if(!upR) o+=legR;
  o+=rPart('neck',rCap(s.shC,3.8,s.head,3.2),ink);
  o+=rPart('torso',rSmooth(rTorsoFrontPts(s)),ink);
  o+=rDot('capL',rP(s.shL.x,s.shL.y+0.5),5.2,ink)+rDot('capR',rP(s.shR.x,s.shR.y+0.5),5.2,ink);
  if(upL) o+=legL;
  if(upR) o+=legR;
  if(!ex.behindHead) o+=head;
  o+=arm('L',s.shL,s.elbL,s.handL)+arm('R',s.shR,s.elbR,s.handR);
  if(ex.behindHead) o+=head;
  if(bar&&!back) o+=rEquipFront(ex,s);
  o+=rDot('handL',s.handL,rF(a[3]*s.fistL),armCol,1)+rDot('handR',s.handR,rF(a[3]*s.fistR),armCol,1);
  if(!bar) o+=rEquipFront(ex,s);
  return o+rope[1]+rPath(gd.pf)+rArrow(gd.pf,rTrackFront(ex,s),function(v){ return rTrackFront(ex,solveFront(frontAt(ex,v))); },u)+'</svg>';
}

// Side view, back to front: far leg and arm, the body, the near leg, the
// implement in the near hand (in front of the body, behind the head it hangs
// past overhead and under the fist that holds it; a kettlebell goes behind
// the body while that fist is above the hip, so a rack is not a disc on the
// belly), the neck and head, the near arm with a cut line of panel colour
// round each part, so it shows where it crosses the body or passes the head,
// then a bar: the barbell's near plate, or a fixed bar the hands hang from.
// The far limbs are a lighter shade, the working pair's in a lighter accent,
// so both limbs of the pair that works read as working.
function rigSVG(ex,u,bx){
  var s=solve(poseAt(ex,u));
  var ink='var(--text)', hi='var(--accent)';
  var legA=ex.active==='legs', armA=ex.active==='arms'||ex.active==='armN';
  var legCol=legA?hi:ink, armCol=armA?hi:ink, farLeg=legA?'var(--fig-far-hi)':'var(--fig-far)', farArm=armA?'var(--fig-far-hi)':'var(--fig-far)';
  var o='<svg viewBox="'+bx.x+' '+bx.y+' '+bx.w+' '+bx.h+'" preserveAspectRatio="xMidYMax meet" role="img" aria-label="exercise animation">';
  o+=rShadow((s.ankN.x+s.ankF.x)/2+3,Math.abs(s.ankN.x-s.ankF.x)/2+7,GROUND-6-Math.max(s.ankN.y,s.ankF.y))+rGround(bx.x,bx.x+bx.w);
  (ex.props||[]).forEach(function(p){ o+=rProp(p); });
  var gd=rGuideOf(ex.id,ex);
  o+=rGhost(gd.side[rGhostEnd(ex,gd,u)]);
  var top=ex.equip==='barbell'||ex.equip==='fixedbar'||ex.equip==='plate', back=ex.equip==='kettlebell'&&s.handN.y<s.hip.y;
  function leg(k,h,kn,an,rot,col,w,cut){ return rPart('thigh'+k,rCap(h,w[0],kn,w[1]),col,cut)+rPart('shin'+k,rCap(kn,w[1],an,w[2]),col,cut)+rPart('foot'+k,rSmooth(rShoePts(an,rot)),col); }
  function arm(k,sh,e,hd,col,w,cut){ return rPart('upper'+k,rCap(sh,w[0],e,w[1]),col,cut)+rPart('fore'+k,rCap(e,w[1],hd,w[2]),col,cut)+rDot('hand'+k,hd,w[3],col,cut); }
  // A skipping rope: the far strand behind everything, the near one over the
  // near arm, each from its hand to the far end of the loop.
  var rq=ex.equip==='rope'?ropeAt(s):null, rst='" fill="none" stroke="var(--text-soft)" stroke-width="1.6"/>';
  if(rq) o+='<path d="'+rRopePath(s.handF,rP(rq.x-5,rq.y),s.rope)+rst;
  o+=leg('F',s.hipF,s.kneeF,s.ankF,s.footF,farLeg,RW.legF);
  o+=arm('F',s.shF,s.elbF,s.handF,farArm,RW.armF);
  if(back) o+=rEquip(ex,s);
  o+=rPart('torso',rSmooth(rTorsoPts(s.hip,s.mid,s.sh)),ink);
  o+=leg('N',s.hip,s.kneeN,s.ankN,s.footN,legCol,RW.leg,1);
  if(!top&&!back) o+=rEquip(ex,s);
  o+=rPart('neck',rNeck(s.sh,s.head),ink)+rPart('head',rSmooth(rHeadPts(s.sh,s.head)),ink);
  o+=arm('N',s.sh,s.elbN,s.handN,armCol,RW.arm,1);
  if(top) o+=rEquip(ex,s);
  if(rq) o+='<path d="'+rRopePath(s.handN,rq,s.rope)+rst;
  return o+rPath(gd.ps)+rArrow(gd.ps,rTrack(ex,s),function(v){ return rTrack(ex,solve(poseAt(ex,v))); },u)+'</svg>';
}


// Where in the rep (0 to 1) the still falls: the rig's still keyframe.
function rStillU(ex){
  var t=tempoOf(ex), k=stillOf(ex), acc=0;
  for(var i=0;i<k&&i<t.length;i++) acc+=t[i];
  return acc/t.reduce(function(a,b){ return a+b; },0)%1;
}
// ---- motion guides ----
// A coach's marks on the figure, shown while it stands still: a
// faint ghost of the other end of the rep, the path the bar (or the hip, or
// the shoulders) takes over the whole rep, and a small arrow on that path
// pointing the way the movement goes next. Each is one shape in every frame,
// so the figure still moves in place. The ghost and the path are worked out
// once per rig.
var rGuides={};
// What the path follows: the implement in the hand, else the shoulders for an
// arm drill or a hang, else the hip.
function rTrack(ex,s){
  var q=ex.equip;
  if(s.ball) return s.ball;
  if(q==='kettlebell') return bellAt(ex,s);
  if(q==='barbell'||q==='dumbbell'||q==='plate'||q==='cable'||q==='ball') return s.handN;
  return q==='fixedbar'||ex.active==='arms'||ex.active==='armN'?s.sh:s.hip;
}
function rTrackFront(ex,s){
  var q=ex.equip, m=rP((s.handL.x+s.handR.x)/2,(s.handL.y+s.handR.y)/2);
  if(s.ball) return s.ball;
  if(q==='kettlebell') return bellFront(ex,s);
  if(q==='barbell'||q==='ball'||(q==='dumbbell'&&rAxis(ex)==='vertical')||(q==='cable'&&ex.anchorFront&&ex.anchorFront.length<4)) return m;
  if(q&&q!=='fixedbar'&&q!=='rope') return ex.load==='L'?s.handL:s.handR;
  return q==='fixedbar'||ex.active==='arms'||ex.active==='armN'?s.shC:s.hipC;
}
// The ghost: the whole body as one shape, in a shade just off the panel. Its
// parts overlap and fill nonzero, so every part winds the way a limb does
// (rWound): one wound the other way cancels where they overlap and leaves a
// hole, a bite out of the head at the neck or a criss-cross over the chest.
function rWound(P){
  var a=0; for(var i=0;i<P.length;i++){ var p=P[i], q=P[(i+1)%P.length]; a+=p.x*q.y-q.x*p.y; }
  return rSmooth(a>0?P.slice().reverse():P);
}
function rGhostSide(s){
  var a=RW.arm, l=RW.leg;
  return rCap(s.hipF,l[0],s.kneeF,l[1])+rCap(s.kneeF,l[1],s.ankF,l[2])+rWound(rShoePts(s.ankF,s.footF))+
    rCap(s.shF,a[0],s.elbF,a[1])+rCap(s.elbF,a[1],s.handF,a[2])+rWound(rTorsoPts(s.hip,s.mid,s.sh))+
    rCap(s.hip,l[0],s.kneeN,l[1])+rCap(s.kneeN,l[1],s.ankN,l[2])+rWound(rShoePts(s.ankN,s.footN))+
    rNeck(s.sh,s.head)+rWound(rHeadPts(s.sh,s.head))+rCap(s.sh,a[0],s.elbN,a[1])+rCap(s.elbN,a[1],s.handN,a[2]);
}
function rGhostFront(s){
  var a=RW.farm, l=RW.fleg, h=s.head;
  return rCap(s.hipL,l[0],s.kneeL,l[1])+rCap(s.kneeL,l[1],s.footL,l[2])+rCap(s.hipR,l[0],s.kneeR,l[1])+rCap(s.kneeR,l[1],s.footR,l[2])+
    rWound(rTorsoFrontPts(s))+rCap(s.shC,3.8,h,3.2)+'M'+rF(h.x-7)+','+rF(h.y)+' A7,7.8 0 1,0 '+rF(h.x+7)+','+rF(h.y)+' A7,7.8 0 1,0 '+rF(h.x-7)+','+rF(h.y)+'Z'+
    rCap(s.shL,a[0],s.elbL,a[1])+rCap(s.elbL,a[1],s.handL,a[2])+rCap(s.shR,a[0],s.elbR,a[1])+rCap(s.elbR,a[1],s.handR,a[2]);
}
// Worked out once per rig: both ends of the rep (the start and the still) as
// ghosts, and each panel's path. A path that hardly moves (a sprint's hip) is
// left out: a dot of dashes says nothing. Where the rep goes back along the
// way it came (a squat's bar coming up) the path is drawn once: two dashed
// passes a hair apart fill each other's gaps and read as a solid line. So the
// path is runs of new ground, each from where it leaves the line drawn so far.
function rGuideOf(key,ex){
  if(Object.prototype.hasOwnProperty.call(rGuides,key)) return rGuides[key];
  var N=48, ends=[0,rStillU(ex)], g={ends:ends, side:[], front:[], ps:'', pf:''};
  function near(q,P){ for(var i=0;i+1<P.length;i++){ var a=P[i], dx=P[i+1].x-a.x, dy=P[i+1].y-a.y, t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));
      if(Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy)<1.5) return true; } return false; }
  function line(all){ var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9, runs=[], run=null, last=-9;
    all.forEach(function(q,i){
      if(runs.some(function(r){ return near(q,r); })||(run&&near(q,run.slice(0,-2)))){ if(run) runs.push(run); run=null; return; }
      // A step or two off the line (a slow start) carries the last run on.
      if(!run) run=last>=i-3&&runs.length?runs.pop().concat(all.slice(last+1,i)):i?[all[i-1]]:[];
      run.push(q); last=i; });
    if(run) runs.push(run);
    all.forEach(function(p){ x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y); });
    return Math.max(x1-x0,y1-y0)<6?'':runs.map(function(r){ return 'M'+r.map(rXY).join(' L'); }).join(' '); }
  ends.forEach(function(u){ g.side.push(rGhostSide(solve(poseAt(ex,u)))); if(ex.front) g.front.push(rGhostFront(solveFront(frontAt(ex,u)))); });
  var ps=[], pf=[];
  for(var i=0;i<=N;i++){ ps.push(rTrack(ex,solve(poseAt(ex,i/N)))); if(ex.front) pf.push(rTrackFront(ex,solveFront(frontAt(ex,i/N)))); }
  g.ps=line(ps); g.pf=ex.front?line(pf):'';
  return (rGuides[key]=g);
}
// Which end the ghost shows: whichever the figure is further from, so a still
// at the bottom of a squat shows the standing start and the start shows the
// bottom.
function rGhostEnd(ex,g,u){
  function far(v){ var a=solve(poseAt(ex,u)), b=solve(poseAt(ex,v)), d=0;
    ['hip','sh','head','handN','handF','kneeN','ankN'].forEach(function(k){ d+=Math.hypot(a[k].x-b[k].x,a[k].y-b[k].y); }); return d; }
  return far(g.ends[0])>=far(g.ends[1])?0:1;
}
// The arrow: a small head on the path (p) at the tracked point (c), pointing
// where it goes next (at(v), the point at v in the rep). A still is often
// followed by a hold or a slow start, so it looks on to where the point first
// moves. With no path it is a point: an arrow alone would float.
function rArrow(p,c,at,u){
  var n=c; if(p) for(var i=1;i<=48&&Math.hypot(n.x-c.x,n.y-c.y)<1;i++) n=at(u+i/48);
  var dx=n.x-c.x, dy=n.y-c.y, l=Math.hypot(dx,dy), k=l<1?0:1, ux=k*dx/(l||1), uy=k*dy/(l||1);
  var tip=rP(c.x+ux*6,c.y+uy*6), a=rP(c.x-uy*3.4,c.y+ux*3.4), b=rP(c.x+uy*3.4,c.y-ux*3.4);
  return '<path data-g="arrow" d="M'+rXY(tip)+' L'+rXY(a)+' L'+rXY(b)+'Z" fill="var(--accent)" stroke="var(--surface-raised)" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/>';
}
function rGhost(d){ return '<path data-g="ghost" d="'+d+'" fill="var(--fig-ghost)"/>'; }
function rPath(p){ return '<path data-g="path" d="'+p+'" fill="none" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="2.4 2.6" stroke-linecap="round" opacity="0.85"/>'; }

// ---- drawn in place, as the app draws its live figure ----
// A frame gives every shape of the drawing its new attributes rather than
// building the drawing again (the app's drawInPlace): the figure has the same
// shapes in the same order every frame, and a shape whose kind changes (a
// leg swinging in front of the body) is swapped on its own.
function svgShapes(html){
  return {h:html, s:(html.match(/<[a-z][^>]*>/g)||[]).map(function(tag){
    var a=[]; tag.replace(/([\w:-]+)="([^"]*)"/g,function(m,k,v){ a.push(k,v); return m; });
    return {n:tag.match(/^<([\w:-]+)/)[1], a:a};
  })};
}
function drawInPlace(el,d){
  var svg=el.firstElementChild, s=d.s, kids=svg?svg.children:[];
  if(!svg || svg.tagName.toLowerCase()!=='svg' || s.length!==kids.length+1){ el.innerHTML=d.h; return; }
  for(var i=0;i<s.length;i++){
    var node=i?kids[i-1]:svg, a=s[i].a;
    if(node.tagName.toLowerCase()!==s[i].n || node.attributes.length*2!==a.length){
      if(!i){ el.innerHTML=d.h; return; }
      var nn=document.createElementNS(svg.namespaceURI,s[i].n);
      for(var k=0;k<a.length;k+=2) nn.setAttribute(a[k],a[k+1]);
      svg.replaceChild(nn,node); continue;
    }
    for(var j=0;j<a.length;j+=2) if(node.getAttribute(a[j])!==a[j+1]) node.setAttribute(a[j],a[j+1]);
  }
}
// Each panel draws into a box of its own inside the card's frame, so the
// frame's label is not taken for the drawing.
function panel(host){ var b=document.createElement('div'); host.appendChild(b); return b; }
function buildFigure(ex,host,bx){ return {ex:ex, el:panel(host), bx:bx||boxOf(ex), u:null}; }
function buildFront(ex,host,bx){ return {ex:ex, el:panel(host), bx:bx||boxOf(ex), u:null}; }
function update(ex,ref,u){
  if(ref.u===u) return; ref.u=u;
  var html=rigSVG(ex,u,ref.bx).replace('aria-label="exercise animation"','aria-label="'+ex.name+' animation"');
  drawInPlace(ref.el,svgShapes(html)); ref.svg=ref.el.firstElementChild;
}
function updateFront(ex,ref,u){
  if(ref.u===u) return; ref.u=u;
  drawInPlace(ref.el,svgShapes(rigFrontSVG(ex,u,ref.bx).replace('aria-label="exercise front view"','aria-label="'+ex.name+' front view"')));
  ref.svg=ref.el.firstElementChild;
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
  if(wraps[1]){ wraps[1].style.flexGrow=bx.fw; wraps[1].style.flexBasis='0px'; wraps[1].style.setProperty('--fig-w',(bx.fw/100).toFixed(3)); }
  var ref=buildFigure(ex,wraps[0],bx);
  ref.front = ex.front ? buildFront(ex,wraps[1],bx) : null;
  refs.push(ref);
});
// Each rig plays at its own rep length (cycleMs in rig.js) in its own number
// of frames (stepsOf), as in the app. The scrubber sets every figure to the
// same point of its own rep.
var playing=true, speed=1, t0=performance.now(), elapsed=0, manual=null;
function frame(now){
  if(playing) elapsed=(now-t0)*speed;
  EXERCISES.forEach(function(ex,i){ var n=stepsOf(ex), u=manual===null?Math.floor((elapsed/cycleMs(ex))%1*n)/n:manual;
    update(ex,refs[i],u); if(refs[i].front) updateFront(ex,refs[i].front,u);
    // A cut (loop:'cut') fades the figure out and in round its swap.
    var a=String(alphaAt(ex,u)); [refs[i].el,refs[i].front&&refs[i].front.el].forEach(function(g){ if(g&&g.style.opacity!==a) g.style.opacity=a; }); });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
var playBtn=document.getElementById('playBtn'), scrub=document.getElementById('scrub');
playBtn.addEventListener('click',function(){
  playing=!playing; this.textContent=playing?'Pause':'Play'; this.classList.toggle('on',playing);
  if(playing){ manual=null; t0=performance.now()-elapsed/speed; }
  scrub.disabled=playing; guidesShown();
});
scrub.addEventListener('input',function(){ if(!playing) manual=+this.value/100; });
document.getElementById('slowBtn').addEventListener('click',function(){
  speed = speed===1?0.35:1; this.textContent = speed===1?'Slow motion':'Normal speed';
  this.classList.toggle('on',speed!==1); t0=performance.now()-elapsed/speed;
});
// The guides (the ghost of the other end of the rep, the path, the arrow)
// show while paused, as in the app, or all the time when asked.
var guideBtn=document.getElementById('guideBtn'), showGuides=false;
function guidesShown(){ grid.classList.toggle('guides',showGuides||!playing); }
guideBtn.addEventListener('click',function(){ showGuides=!showGuides; this.classList.toggle('on',showGuides); guidesShown(); });
