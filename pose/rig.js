// Shared rig: planted-feet inverse kinematics, human proportions.
// Screen space: y grows downward. Angle 0 = up, 90 = +x, 180 = down.
// Proportions from the 7.5-head canon: head dia 16 => figure height 120.
var L = { THIGH:29, SHIN:29, TORSO:34, UPPER:21, FORE:19, HEAD_R:8, HEAD_OFF:16, FOOT:14 };
var GROUND = 170, ANKLE_Y = 163, STAND_HIP_Y = 107; // 163-29-29 = 105

function P(x,y){ return {x:x,y:y}; }
function dir(deg,len){ var r=deg*Math.PI/180; return {x:len*Math.sin(r), y:-len*Math.cos(r)}; }
function add(p,v){ return {x:p.x+v.x, y:p.y+v.y}; }

// Two-link IK: given root and end effector, return the middle joint.
// sign selects which of the two mirror solutions (bend direction).
function ik(root,end,l1,l2,sign){
  var dx=end.x-root.x, dy=end.y-root.y;
  var d=Math.sqrt(dx*dx+dy*dy) || 0.0001;
  var maxd=l1+l2-0.01, mind=Math.abs(l1-l2)+0.01;
  var dc=Math.max(mind,Math.min(maxd,d));
  var ux=dx/d, uy=dy/d;
  var a=(dc*dc + l1*l1 - l2*l2)/(2*dc);
  var h=Math.sqrt(Math.max(0,l1*l1-a*a));
  return {x: root.x+ux*a-uy*h*sign, y: root.y+uy*a+ux*h*sign};
}

// Build every joint for one frame.
// frame: {hip:[x,y], torso:deg, ankN:[x,y], ankF:[x,y],
//         armN:[upperDeg,foreDeg] | handN:[x,y], armF:[...] | handF:[x,y],
//         kneeSign, elbowSign, shrug:px of shoulder elevation}
function solve(f){
  var hip=P(f.hip[0],f.hip[1]);
  var shBase=add(hip,dir(f.torso,L.TORSO));
  var head=add(shBase,dir(f.torso,L.HEAD_OFF));
  // A shrug is the one movement with no joint angle behind it: the shoulder
  // girdle rides up the ribcage toward a head that stays put. Every other DOF
  // here is an angle, so without this the figure cannot move at all.
  var sh=f.shrug?P(shBase.x,shBase.y-f.shrug):shBase;
  var depth={x:-5,y:0}; // far side sits slightly back for depth
  var hipF=add(hip,depth), shF=add(sh,depth);
  var ks=(f.kneeSign===undefined)?-1:f.kneeSign;
  var es=(f.elbowSign===undefined)?1:f.elbowSign;

  var ankN=P(f.ankN[0],f.ankN[1]), ankF=P(f.ankF[0],f.ankF[1]);
  var kneeN=ik(hip,ankN,L.THIGH,L.SHIN,ks);
  var kneeF=ik(hipF,ankF,L.THIGH,L.SHIN,ks);

  // An arm swinging out of the sagittal plane projects SHORT into this view,
  // it does not bend. Without a scale the solver had only one way to reach a
  // hand that is closer than arm's length, which is to fold the elbow, so a
  // lateral raise came out as a curl. This is the same mechanism solveFront
  // has for an arm pointing at the camera.
  var aN=f.armScaleN===undefined?1:f.armScaleN, aF=f.armScaleF===undefined?1:f.armScaleF;
  var elbN,handN,elbF,handF;
  if(f.handN){ handN=P(f.handN[0],f.handN[1]); elbN=ik(sh,handN,L.UPPER*aN,L.FORE*aN,es); }
  else { var an=f.armN||[178,178]; elbN=add(sh,dir(an[0],L.UPPER*aN)); handN=add(elbN,dir(an[1],L.FORE*aN)); }
  if(f.handF){ handF=P(f.handF[0],f.handF[1]); elbF=ik(shF,handF,L.UPPER*aF,L.FORE*aF,es); }
  else { var af=f.armF||f.armN||[178,178]; elbF=add(shF,dir(af[0],L.UPPER*aF)); handF=add(elbF,dir(af[1],L.FORE*aF)); }

  return {hip:hip,sh:sh,head:head,hipF:hipF,shF:shF,
    ankN:ankN,ankF:ankF,kneeN:kneeN,kneeF:kneeF,
    elbN:elbN,handN:handN,elbF:elbF,handF:handF,torso:f.torso,
    armScaleN:aN,armScaleF:aF,
    footRot:f.footRot||0};
}

if(typeof module!=='undefined') module.exports={L:L,GROUND:GROUND,ANKLE_Y:ANKLE_Y,STAND_HIP_Y:STAND_HIP_Y,solve:solve,ik:ik,dir:dir,add:add,P:P};

// ---- continuous interpolation -------------------------------------------
function lerp(a,b,t){ return a+(b-a)*t; }
function lerpAng(a,b,t){ var d=((b-a+540)%360)-180; return a+d*t; }
function lerpPt(a,b,t){ return [lerp(a[0],b[0],t), lerp(a[1],b[1],t)]; }

// An arm is given either as joint angles (armN) or as a target the hand must
// reach (handN). A movement can legitimately switch between the two mid-rep: a
// burpee has the arms hanging while standing and planted on the floor a moment
// later. Blending an angle frame with a target frame used to produce a frame
// with neither, which crashed the solver, so resolve the angles to where that
// hand actually is and interpolate positions.
function handFromAngles(f,arm,far){
  var hip=P(f.hip[0],f.hip[1]), sh=add(hip,dir(f.torso,L.TORSO));
  if(f.shrug) sh=add(sh,{x:0,y:-f.shrug});
  if(far) sh=add(sh,{x:-5,y:0});
  var a=(far?f.armScaleF:f.armScaleN); if(a===undefined) a=1;
  var elb=add(sh,dir(arm[0],L.UPPER*a));
  var h=add(elb,dir(arm[1],L.FORE*a));
  return [h.x,h.y];
}
// Blend two keyframes into a valid in-between pose.
function lerpFrame(A,B,t){
  var f={ hip:lerpPt(A.hip,B.hip,t), torso:lerpAng(A.torso,B.torso,t),
          ankN:lerpPt(A.ankN,B.ankN,t), ankF:lerpPt(A.ankF,B.ankF,t),
          // The bend sign blends too. Held from A for the whole segment, a sign
          // that changes at B drew B's pose bent A's way and then snapped the
          // knee to its mirror the instant the next segment began. ik() scales
          // the bend by the sign, so in between the joint swings through the
          // limb line instead of jumping across it.
          kneeSign:lerp(A.kneeSign===undefined?-1:A.kneeSign,B.kneeSign===undefined?-1:B.kneeSign,t),
          elbowSign:lerp(A.elbowSign===undefined?1:A.elbowSign,B.elbowSign===undefined?1:B.elbowSign,t),
          shrug:lerp(A.shrug||0,B.shrug||0,t),
          armScaleN:lerp(A.armScaleN===undefined?1:A.armScaleN,B.armScaleN===undefined?1:B.armScaleN,t),
          armScaleF:lerp(A.armScaleF===undefined?1:A.armScaleF,B.armScaleF===undefined?1:B.armScaleF,t),
          footRot:lerp(A.footRot||0,B.footRot||0,t) };
  // Each keyframe resolves its far arm by its OWN key: armF when it has one,
  // else armN, which is what solve() draws. Reading B through A's key took a
  // far hand going from handF to armF from B's armN, and one going from armF
  // to handF from A's armN, so the segment ended on a pose neither keyframe has.
  function arm(key,ak,bk,far){
    var a=A[key], b=B[key];
    if(!a && A[ak]) a=handFromAngles(A,A[ak],far);
    if(!b && B[bk]) b=handFromAngles(B,B[bk],far);
    return (a&&b)?lerpPt(a,b,t):null;
  }
  if((A.handN||B.handN) && (A.handN||A.armN) && (B.handN||B.armN)) f.handN=arm('handN','armN','armN',false);
  if((A.handF||B.handF) && (A.handF||A.armF||A.armN) && (B.handF||B.armF||B.armN))
    f.handF=arm('handF', A.armF?'armF':'armN', B.armF?'armF':'armN', true);
  if(!f.handN && A.armN && B.armN) f.armN=[lerpAng(A.armN[0],B.armN[0],t), lerpAng(A.armN[1],B.armN[1],t)];
  if(!f.handF){
    var fa=A.armF||A.armN, fb=B.armF||B.armN;
    if((A.armF||B.armF) && fa && fb) f.armF=[lerpAng(fa[0],fb[0],t), lerpAng(fa[1],fb[1],t)];
    else if(f.armN) f.armF=f.armN;
  }
  return f;
}

// Pose at normalised progress u (0..1) around the whole rep cycle,
// honouring per-segment tempo so eccentrics are slower than concentrics. Where
// in its segment the pose is comes from warp() (see timing, below).
function poseAt(ex,u){
  var n=ex.frames.length, g=segAt(tempoOf(ex),u);
  return lerpFrame(ex.frames[g.i], ex.frames[(g.i+1)%n], hermite(g.t,warp(ex)[g.i]));
}
// The keyframe a rep turns around at (the bottom of a squat, the top of a
// pull): stops[1] once a rig authors its stops, otherwise frame 2 of the usual
// four. Checks read it through here rather than hard-coding frame 2, which
// stops meaning the bottom the moment a rig gains a frame.
function turn(ex,front){ var s=(front&&ex.frontStops)||ex.stops; return s?s[1]:2; }
if(typeof module!=='undefined') module.exports.turn=turn, module.exports.lerpFrame=lerpFrame, module.exports.poseAt=poseAt;

// ---- frontal-plane rig ---------------------------------------------------
// Viewer faces the lifter. x is lateral, y vertical. Depth is invisible, so
// this view carries what the side view cannot: stance width, grip width,
// elbow flare, knee tracking, and which arm is doing the work.
// frame: {cx, hipY, hipHW, shHW, footL/footR:[x,y], handL/handR:[x,y]}
function solveFront(f){
  var cx=f.cx===undefined?70:f.cx;
  var hipHW=f.hipHW===undefined?9:f.hipHW, shHW=f.shHW===undefined?16:f.shHW;
  var lean=f.lean||0;
  // A hinged torso seen from the front is foreshortened: it projects shorter and
  // the head drops toward the shoulders because you start seeing the crown.
  var tS=f.torsoScale===undefined?1:f.torsoScale;
  var hipC=P(cx,f.hipY);
  var shBase=P(cx+lean, f.hipY-L.TORSO*tS);
  var head=P(shBase.x+lean*0.5, shBase.y-L.HEAD_OFF*(0.35+0.65*tS));
  // Shoulders rise, head does not. See solve().
  var shC=f.shrug?P(shBase.x,shBase.y-f.shrug):shBase;
  var hipL=P(hipC.x-hipHW,hipC.y), hipR=P(hipC.x+hipHW,hipC.y);
  var shL=P(shC.x-shHW,shC.y),   shR=P(shC.x+shHW,shC.y);
  var footL=P(f.footL[0],f.footL[1]), footR=P(f.footR[0],f.footR[1]);
  var handL=P(f.handL[0],f.handL[1]), handR=P(f.handR[0],f.handR[1]);
  // Pick the anatomically correct branch rather than a fixed sign:
  // knees track outward away from the midline, elbows always droop below the
  // shoulder-to-hand line (a human elbow never bends upward). That rule is
  // applied at a keyframe only. Applied to every in-between pose it flipped the
  // elbow to the mirror branch whenever a hand crossed the shoulder's x, a
  // one-frame pop, so frontAt hands each pose the sign its keyframes chose
  // (kneeSignL/R, elbSignL/R, which a keyframe may also set by hand).
  // t: the hand hangs (near enough) straight below the shoulder, see below.
  function side(a,b,l1,l2,s,better,tied){
    var p=ik(a,b,l1,l2,1), m=ik(a,b,l1,l2,-1), t=s===undefined&&!!tied&&tied(p,m)&&p.y+m.y>2*a.y;
    if(s===undefined) s=better(p,m)?1:-1;
    return {s:s, j:ik(a,b,l1,l2,s), t:t};
  }
  // A hand (near enough) straight above or below the shoulder leaves neither
  // branch clearly lower. Overhead, the elbow flares out, rather than going
  // whichever way rounding says. Hanging below, the arm bends front to back (a
  // row, a running arm), so this view has nothing to choose a side by: frontAt
  // hands that keyframe its nearest decided neighbour's branch, and only with
  // none does the elbow flare out.
  function outL(p,m){ return p.x<=m.x; }
  function outR(p,m){ return p.x>=m.x; }
  function tie(p,m){ return Math.abs(p.y-m.y)<=Math.abs(p.x-m.x)*0.1; }
  function lowL(p,m){ return tie(p,m)?outL(p,m):p.y>m.y; }
  function lowR(p,m){ return tie(p,m)?outR(p,m):p.y>m.y; }
  // Explicit joints win over IK. A limb that bends front-to-back (every hinge,
  // every squat) has no lateral bend to solve for: its knee or elbow sits on
  // the hip-to-foot line at the height the side view already gives it. Solving
  // it as a frontal-plane bend instead threw the knees and elbows out sideways,
  // which is why the row read as chicken-winged.
  var aL=f.armScaleL===undefined?1:f.armScaleL, aR=f.armScaleR===undefined?1:f.armScaleR;
  var kL=side(hipL,footL,L.THIGH,L.SHIN,f.kneeSignL,outL), kR=side(hipR,footR,L.THIGH,L.SHIN,f.kneeSignR,outR);
  // An arm pointing at the camera projects short, so its segments scale down.
  var eL=side(shL,handL,L.UPPER*aL,L.FORE*aL,f.elbSignL,lowL,tie), eR=side(shR,handR,L.UPPER*aR,L.FORE*aR,f.elbSignR,lowR,tie);
  var kneeL = f.kneeL ? P(f.kneeL[0],f.kneeL[1]) : kL.j;
  var kneeR = f.kneeR ? P(f.kneeR[0],f.kneeR[1]) : kR.j;
  var elbL = f.elbL ? P(f.elbL[0],f.elbL[1]) : eL.j;
  var elbR = f.elbR ? P(f.elbR[0],f.elbR[1]) : eR.j;
  return {hipC:hipC,shC:shC,head:head,hipL:hipL,hipR:hipR,shL:shL,shR:shR,
    footL:footL,footR:footR,handL:handL,handR:handR,
    kneeL:kneeL,kneeR:kneeR,elbL:elbL,elbR:elbR,armScaleL:aL,armScaleR:aR,
    sign:{kneeL:kL.s,kneeR:kR.s,elbL:eL.s,elbR:eR.s}, hang:{elbL:eL.t,elbR:eR.t},
    fistL:f.fistL===undefined?1:f.fistL, fistR:f.fistR===undefined?1:f.fistR};
}
// An explicit joint in only one of the two keyframes is blended with the joint
// the other keyframe solves to. Dropping it instead (it used to carry through
// only when both had one) jumped from the given joint to a solved one at the
// keyframe boundary.
function lerpFront(A,B,t){
  var sA=solveFront(A), sB=solveFront(B);
  function jt(k){ if(!A[k]&&!B[k]) return undefined;
    return lerpPt(A[k]||[sA[k].x,sA[k].y], B[k]||[sB[k].x,sB[k].y], t); }
  function sg(k){ return lerp(sA.sign[k],sB.sign[k],t); }
  return {cx:lerp(A.cx===undefined?70:A.cx,B.cx===undefined?70:B.cx,t),
    hipY:lerp(A.hipY,B.hipY,t), hipHW:lerp(A.hipHW||9,B.hipHW||9,t),
    shHW:lerp(A.shHW||16,B.shHW||16,t), lean:lerp(A.lean||0,B.lean||0,t),
    shrug:lerp(A.shrug||0,B.shrug||0,t),
    fistL:lerp(A.fistL===undefined?1:A.fistL,B.fistL===undefined?1:B.fistL,t),
    fistR:lerp(A.fistR===undefined?1:A.fistR,B.fistR===undefined?1:B.fistR,t),
    torsoScale:lerp(A.torsoScale===undefined?1:A.torsoScale,B.torsoScale===undefined?1:B.torsoScale,t),
    armScaleL:lerp(A.armScaleL===undefined?1:A.armScaleL,B.armScaleL===undefined?1:B.armScaleL,t),
    armScaleR:lerp(A.armScaleR===undefined?1:A.armScaleR,B.armScaleR===undefined?1:B.armScaleR,t),
    footL:lerpPt(A.footL,B.footL,t), footR:lerpPt(A.footR,B.footR,t),
    handL:lerpPt(A.handL,B.handL,t), handR:lerpPt(A.handR,B.handR,t),
    kneeL:jt('kneeL'), kneeR:jt('kneeR'), elbL:jt('elbL'), elbR:jt('elbR'),
    kneeSignL:sg('kneeL'), kneeSignR:sg('kneeR'), elbSignL:sg('elbL'), elbSignR:sg('elbR')};
}
function frontAt(ex,u){
  var fr=ex.front; if(!fr) return null;
  var n=fr.length, g=segAt(tempoOf(ex),u);
  return lerpFront(frontKey(fr,g.i), frontKey(fr,(g.i+1)%n), hermite(g.t,warp(ex,true)[g.i]));
}
// A keyframe whose hand hangs straight below the shoulder (see solveFront)
// bends that elbow the way its nearest decided neighbour does. Flaring it out
// instead swung the elbow through the limb line on the way to and from that
// keyframe, the arm shrinking to a stub, and threw the single-arm row's tucked
// elbow out wide every rep.
function frontKey(fr,j){
  var s=solveFront(fr[j]), n=fr.length, o=null;
  ['L','R'].forEach(function(k){
    if(!s.hang['elb'+k]) return;
    for(var q=1;q<n;q++) for(var w=0;w<2;w++){
      var y=solveFront(fr[((j+(w?-q:q))%n+n)%n]);
      if(!y.hang['elb'+k]){ if(!o){ o={}; for(var x in fr[j]) o[x]=fr[j][x]; } o['elbSign'+k]=y.sign['elb'+k]; return; }
    }
  });
  return o||fr[j];
}
if(typeof module!=='undefined'){ module.exports.solveFront=solveFront; module.exports.frontAt=frontAt; module.exports.lerpFront=lerpFront; }

// ---- timing: when the figure is where -----------------------------------
// Every segment used to be eased in and out on its own, so the figure stopped
// dead at every keyframe, including the half-way keyframes that only shape the
// path: a squat stalled half way down and half way up, and a swing's bell at
// the hip snap, its fastest moment. The poses are unchanged; only the time
// spent along each segment is warped, by a cubic Hermite w(t) whose end slopes
// m0, m1 are the segment-fraction speeds at its keyframes. A stop keyframe has
// slope 0 and eases to rest as before; any other is passed through at the
// speed its two segments share. Slopes stay within 0..3, so w is monotone and
// never overshoots a pose.
var STOP_TURN=0.5, M_CAP=3, DEAD=0.12;
function tempoOf(ex){ return ex.tempo||(ex.frames||ex.front).map(function(){ return 1; }); }
function segAt(tempo,u){
  var n=tempo.length, total=tempo.reduce(function(a,b){ return a+b; },0);
  var target=((u%1)+1)%1*total, acc=0, i=0;
  for(i=0;i<n;i++){ if(target<acc+tempo[i]) break; acc+=tempo[i]; }
  if(i>=n) i=n-1;
  return {i:i, t:(target-acc)/tempo[i]};
}
function hermite(t,m){ var t2=t*t, t3=t2*t; return (t3-2*t2+t)*m[0]+(-2*t3+3*t2)+(t3-t2)*m[1]; }
// The joints that carry a movement, in each view. Elbows and knees follow
// from them by IK, so their paths turn wherever a limb folds and an elbow
// swinging through its IK branch would set the pace of the whole rep.
var TRACK=['hip','head','ankN','ankF','handN','handF'], TRACKF=['hipC','head','footL','footR','handL','handR'];
// Every tracked joint of segment i at blend w, side then (if asked) front.
function trackAt(ex,i,w,side,front){
  var n=(ex.frames||ex.front).length, j=(i+1)%n, o=[];
  if(side&&ex.frames){ var s=solve(lerpFrame(ex.frames[i],ex.frames[j],w)); TRACK.forEach(function(k){ o.push(s[k]); }); }
  if(front&&ex.front){ var f=solveFront(lerpFront(frontKey(ex.front,i),frontKey(ex.front,j),w)); TRACKF.forEach(function(k){ o.push(f[k]); }); }
  return o;
}
// Per segment: path length, and per joint the direction and rate (units per
// unit of w) it leaves its first keyframe at and reaches its second at.
function segPaths(ex,side,front){
  var n=(ex.frames||ex.front).length, E=0.002, K=24, out=[];
  for(var i=0;i<n;i++){
    var pts=[], len=0, most=0, q;
    for(q=0;q<=K;q++) pts.push(trackAt(ex,i,q/K,side,front));
    for(q=0;q<K;q++) len+=vlen(pts[q+1],pts[q]);
    for(q=1;q<=K;q++) most=Math.max(most,vmax(pts[q],pts[0]));
    out.push({len:len, held:most<0.5, d0:vdiff(trackAt(ex,i,E,side,front),pts[0],E), d1:vdiff(pts[K],trackAt(ex,i,1-E,side,front),E)});
  }
  return out;
}
function vdiff(a,b,e){ return a.map(function(p,k){ return {x:(p.x-b[k].x)/e, y:(p.y-b[k].y)/e}; }); }
function vlen(a,b){ var t=0; a.forEach(function(p,k){ var dx=p.x-(b?b[k].x:0), dy=p.y-(b?b[k].y:0); t+=dx*dx+dy*dy; }); return Math.sqrt(t); }
function vmax(a,b){ var m=0; a.forEach(function(p,k){ m=Math.max(m,Math.hypot(p.x-b[k].x,p.y-b[k].y)); }); return m; }
function vcos(a,b){ var t=0; a.forEach(function(p,k){ t+=p.x*b[k].x+p.y*b[k].y; }); return t/((vlen(a)*vlen(b))||1); }
// The keyframes a rep comes to rest at, in each view. Authored as `stops`
// (and `frontStops` for a second panel that turns around elsewhere),
// otherwise found from that view's paths: a keyframe borders a hold (both ends
// of a held segment are stops), the path of a hip, hand or foot that is really
// moving on both sides of it (a fifth of the fastest of them) turns through
// more than 60 degrees there, or the view's joints taken together do (a crawl
// hands over from one limb to the next, each turning only a little). The two
// views can differ, as a 3D path can reverse across the body while it carries
// on front to back.
var TURNS=[0,2,3,4,5];
function autoStops(ex,front){
  var P=segPaths(ex,!front,!!front), n=P.length, tempo=tempoOf(ex), st=[];
  for(var k=0;k<n;k++){
    var p=(k-1+n)%n, a=P[p].d1, b=P[k].d0, stop=P[p].held||P[k].held, top=0;
    var sa=a.map(function(v){ return Math.hypot(v.x,v.y)/tempo[p]; }), sb=b.map(function(v){ return Math.hypot(v.x,v.y)/tempo[k]; });
    TURNS.forEach(function(j){ top=Math.max(top,sa[j],sb[j]); });
    TURNS.forEach(function(j){
      if(Math.min(sa[j],sb[j])<0.2*top) return;
      if((a[j].x*b[j].x+a[j].y*b[j].y)/(Math.hypot(a[j].x,a[j].y)*Math.hypot(b[j].x,b[j].y))<STOP_TURN) stop=true;
    });
    if(vcos(a,b)<STOP_TURN) stop=true;
    if(stop) st.push(k);
  }
  return st;
}
function authored(ex,front){ return (front&&(ex.frontStops||ex.stops))||(!front&&ex.stops)||null; }
// The keyframes a view rests at: authored, or found (autoStops) along with
// any it would pass through so slowly that they are made stops (warpTable).
function stopsOf(ex,front){ return authored(ex,front)||timed(ex,front).stops; }
// The slope table [[m0,m1],...] for one view, from that view's own paths, so
// each panel keeps its own speed through a keyframe; both reach every keyframe
// at the same moment. An authored segment `ease` wins: 'out' (1-(1-t)^2)
// leaves at speed and arrives at rest, a take-off to the apex of a jump, 'in'
// (t^2) the fall to the landing, and 'inout' rests at both ends.
var EASE={inout:[0,0], out:[2,0], 'in':[0,2]};
function warpTable(ex,front){
  var P=segPaths(ex,!front,!!front), n=P.length, tempo=tempoOf(ex), ease=ex.ease||[];
  var stops=(authored(ex,front)||autoStops(ex,front)).slice(), m, v, top, slow;
  for(var pass=0;pass<4;pass++){
    m=P.map(function(){ return [0,0]; }); v=[]; top=0; slow=[];
    for(var k=0;k<n;k++){
      var p=(k-1+n)%n; v[k]=0;
      if(stops.indexOf(k)>=0 || P[p].held || P[k].held) continue;
      // Fritsch-Butland: the two segments' average speeds, weighted harmonic
      // mean, less where the path bends.
      var s1=P[p].len/tempo[p], s2=P[k].len/tempo[k], w1=2*tempo[k]+tempo[p], w2=tempo[k]+2*tempo[p];
      var g1=vlen(P[p].d1), g0=vlen(P[k].d0), c=Math.max(0,vcos(P[p].d1,P[k].d0));
      // A slope capped on one side only would leave the two speeds unequal.
      v[k]=Math.min(c*(w1+w2)/(w1/s1+w2/s2), M_CAP*g1/tempo[p], M_CAP*g0/tempo[k]);
      if(!(v[k]>0)){ v[k]=0; continue; }
      m[p][1]=Math.round(v[k]*tempo[p]/g1*1000)/1000; m[k][0]=Math.round(v[k]*tempo[k]/g0*1000)/1000;
    }
    ease.forEach(function(e,i){ if(EASE[e]) m[i]=EASE[e].slice(); });
    // A keyframe passed at a tenth of the rep's top speed or less is a stop
    // that stutters: make it a real one.
    m.forEach(function(q,i){ for(var j=0;j<=20;j++){ var t=j/20;
      top=Math.max(top,((3*t*t-4*t+1)*q[0]+6*t*(1-t)+(3*t*t-2*t)*q[1])*P[i].len/tempo[i]); } });
    v.forEach(function(x,k){ if(x>0 && x<DEAD*top && !ease[k] && !ease[(k-1+n)%n]) slow.push(k); });
    if(!slow.length) break;
    stops=stops.concat(slow);
  }
  return {m:m, stops:stops.sort(function(a,b){ return a-b; })};
}
function timed(ex,front){
  var key=front?'_timedF':'_timed';
  if(!ex[key]) Object.defineProperty(ex,key,{value:warpTable(ex,front),configurable:true});
  return ex[key];
}
function warp(ex,front){ return timed(ex,front).m; }
// How long one rep takes, in ms: authored, or the tempo's own sum kept inside
// 0.9 to 3 seconds. Every rep used to take 2.4 s, so sprints and boxing drills
// played at a third to a half of their speed and a held plank looked like reps.
function cycleMs(ex){
  if(ex.cycleMs) return ex.cycleMs;
  return Math.max(900,Math.min(3000,tempoOf(ex).reduce(function(a,b){ return a+b; },0)));
}
// Frames per rep the app draws: one every 50 ms (three screen refreshes),
// whatever the rep's length, so a 6 s stretch is not drawn at 8 frames a
// second nor a 1 s sprint stride at 48. A frame every 33 ms would steady the
// fastest rigs (strobes() is the biggest jump of a hip, hand, foot or head
// between two frames; over 6 units, about 9 CSS px, it reads as a jump, and
// `emit-rig.js --stops` lists them), but on a phone at 4x CPU throttle it kept
// the main thread 38 to 45% busy against 25% at 50 ms, over the 30% budget,
// so it waits for a cheaper way to draw a frame.
var FRAME_MS=50;
function stepsOf(ex){ return Math.round(cycleMs(ex)/FRAME_MS); }
function strobes(ex){
  var n=stepsOf(ex), worst=0, prev=null;
  for(var i=0;i<=n;i++){
    var s=ex.frames?solve(poseAt(ex,i/n)):null, f=ex.front?solveFront(frontAt(ex,i/n)):null, cur=[];
    if(s) TRACK.forEach(function(k){ cur.push(s[k]); });
    if(f) TRACKF.forEach(function(k){ cur.push(f[k]); });
    if(prev) worst=Math.max(worst,vmax(cur,prev));
    prev=cur;
  }
  return worst;
}
// The keyframe a still shows (reduced motion, or the end of a tapped rep): an
// authored `still`, else the turnaround (the bottom of a squat, the top of a
// press) when the rep rests there, else the last keyframe it rests at (a
// jump's landing). The end of the first segment it used to be is half way
// down.
function stillOf(ex){
  if(ex.still!==undefined) return ex.still;
  var t=Math.min(turn(ex),(ex.frames||ex.front).length-1), st=ex.frames?stopsOf(ex):[];
  if(!st.length || st.indexOf(t)>=0) return t;
  return st[st.length-1];
}
// What the app is handed beyond the rig itself, so it never has to work any
// of this out on a phone.
function ship(ex){
  var o={cycleMs:cycleMs(ex), steps:stepsOf(ex), still:stillOf(ex)};
  if(ex.frames) o.warp=warp(ex);
  if(ex.front) o.warpF=warp(ex,true);
  return o;
}
if(typeof module!=='undefined'){ module.exports.hermite=hermite; module.exports.warp=warp; module.exports.stopsOf=stopsOf;
  module.exports.autoStops=autoStops; module.exports.cycleMs=cycleMs; module.exports.stepsOf=stepsOf; module.exports.strobes=strobes; module.exports.stillOf=stillOf;
  module.exports.ship=ship; module.exports.segAt=segAt; module.exports.tempoOf=tempoOf; }
