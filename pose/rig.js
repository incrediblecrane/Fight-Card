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
function easeInOutSine(t){ return -(Math.cos(Math.PI*t)-1)/2; }

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
// honouring per-segment tempo so eccentrics are slower than concentrics.
function poseAt(ex,u){
  var n=ex.frames.length;
  var tempo=ex.tempo||ex.frames.map(function(){return 1;});
  var total=tempo.reduce(function(a,b){return a+b;},0);
  var target=((u%1)+1)%1*total, acc=0, i=0;
  for(i=0;i<n;i++){ if(target<acc+tempo[i]) break; acc+=tempo[i]; }
  if(i>=n) i=n-1;
  var local=(target-acc)/tempo[i];
  return lerpFrame(ex.frames[i], ex.frames[(i+1)%n], easeInOutSine(local));
}
// The keyframe a rep turns around at (the bottom of a squat, the top of a
// pull): stops[1] once a rig authors its stops, otherwise frame 2 of the usual
// four. Checks read it through here rather than hard-coding frame 2, which
// stops meaning the bottom the moment a rig gains a frame.
function turn(ex,front){ var s=(front&&ex.frontStops)||ex.stops; return s?s[1]:2; }
if(typeof module!=='undefined') module.exports.turn=turn, module.exports.lerpFrame=lerpFrame, module.exports.poseAt=poseAt, module.exports.easeInOutSine=easeInOutSine;

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
  var n=fr.length, tempo=ex.tempo||fr.map(function(){return 1;});
  var total=tempo.reduce(function(a,b){return a+b;},0);
  var target=((u%1)+1)%1*total, acc=0, i=0;
  for(i=0;i<n;i++){ if(target<acc+tempo[i]) break; acc+=tempo[i]; }
  if(i>=n) i=n-1;
  return lerpFront(frontKey(fr,i), frontKey(fr,(i+1)%n), easeInOutSine((target-acc)/tempo[i]));
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
