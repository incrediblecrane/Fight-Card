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

  var elbN,handN,elbF,handF;
  if(f.handN){ handN=P(f.handN[0],f.handN[1]); elbN=ik(sh,handN,L.UPPER,L.FORE,es); }
  else { var an=f.armN||[178,178]; elbN=add(sh,dir(an[0],L.UPPER)); handN=add(elbN,dir(an[1],L.FORE)); }
  if(f.handF){ handF=P(f.handF[0],f.handF[1]); elbF=ik(shF,handF,L.UPPER,L.FORE,es); }
  else { var af=f.armF||f.armN||[178,178]; elbF=add(shF,dir(af[0],L.UPPER)); handF=add(elbF,dir(af[1],L.FORE)); }

  return {hip:hip,sh:sh,head:head,hipF:hipF,shF:shF,
    ankN:ankN,ankF:ankF,kneeN:kneeN,kneeF:kneeF,
    elbN:elbN,handN:handN,elbF:elbF,handF:handF,torso:f.torso,
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
  var elb=add(sh,dir(arm[0],L.UPPER));
  var h=add(elb,dir(arm[1],L.FORE));
  return [h.x,h.y];
}
// Blend two keyframes into a valid in-between pose.
function lerpFrame(A,B,t){
  var f={ hip:lerpPt(A.hip,B.hip,t), torso:lerpAng(A.torso,B.torso,t),
          ankN:lerpPt(A.ankN,B.ankN,t), ankF:lerpPt(A.ankF,B.ankF,t),
          kneeSign:A.kneeSign, elbowSign:A.elbowSign,
          shrug:lerp(A.shrug||0,B.shrug||0,t),
          footRot:lerp(A.footRot||0,B.footRot||0,t) };
  function arm(key,angKey,far){
    var a=A[key], b=B[key];
    if(!a && A[angKey]) a=handFromAngles(A,A[angKey],far);
    if(!b && B[angKey]) b=handFromAngles(B,B[angKey],far);
    return (a&&b)?lerpPt(a,b,t):null;
  }
  if((A.handN||B.handN) && (A.handN||A.armN) && (B.handN||B.armN)) f.handN=arm('handN','armN',false);
  if((A.handF||B.handF) && (A.handF||A.armF||A.armN) && (B.handF||B.armF||B.armN))
    f.handF=arm('handF', A.armF?'armF':'armN', true) || arm('handF','armN',true);
  if(!f.handN && A.armN && B.armN) f.armN=[lerpAng(A.armN[0],B.armN[0],t), lerpAng(A.armN[1],B.armN[1],t)];
  if(!f.handF){
    if(A.armF&&B.armF) f.armF=[lerpAng(A.armF[0],B.armF[0],t), lerpAng(A.armF[1],B.armF[1],t)];
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
if(typeof module!=='undefined') module.exports.lerpFrame=lerpFrame, module.exports.poseAt=poseAt, module.exports.easeInOutSine=easeInOutSine;

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
  // shoulder-to-hand line (a human elbow never bends upward).
  function both(a,b,l1,l2){ return [ik(a,b,l1,l2,1), ik(a,b,l1,l2,-1)]; }
  function lower(p){ return p[0].y>=p[1].y?p[0]:p[1]; }
  // Explicit joints win over IK. A limb that bends front-to-back (every hinge,
  // every squat) has no lateral bend to solve for: its knee or elbow sits on
  // the hip-to-foot line at the height the side view already gives it. Solving
  // it as a frontal-plane bend instead threw the knees and elbows out sideways,
  // which is why the row read as chicken-winged.
  var aL=f.armScaleL===undefined?1:f.armScaleL, aR=f.armScaleR===undefined?1:f.armScaleR;
  var kneeL = f.kneeL ? P(f.kneeL[0],f.kneeL[1])
    : (function(k){ return k[0].x<=k[1].x?k[0]:k[1]; })(both(hipL,footL,L.THIGH,L.SHIN));
  var kneeR = f.kneeR ? P(f.kneeR[0],f.kneeR[1])
    : (function(k){ return k[0].x>=k[1].x?k[0]:k[1]; })(both(hipR,footR,L.THIGH,L.SHIN));
  // An arm pointing at the camera projects short, so its segments scale down.
  var elbL = f.elbL ? P(f.elbL[0],f.elbL[1]) : lower(both(shL,handL,L.UPPER*aL,L.FORE*aL));
  var elbR = f.elbR ? P(f.elbR[0],f.elbR[1]) : lower(both(shR,handR,L.UPPER*aR,L.FORE*aR));
  return {hipC:hipC,shC:shC,head:head,hipL:hipL,hipR:hipR,shL:shL,shR:shR,
    footL:footL,footR:footR,handL:handL,handR:handR,
    kneeL:kneeL,kneeR:kneeR,elbL:elbL,elbR:elbR,armScaleL:aL,armScaleR:aR,
    fistL:f.fistL===undefined?1:f.fistL, fistR:f.fistR===undefined?1:f.fistR};
}
// Explicit joints only carry through when BOTH keyframes have them; a frame
// that mixes the two would jump between a solved and a given joint.
function both2(a,b,t){ return (a&&b)?lerpPt(a,b,t):undefined; }
function lerpFront(A,B,t){
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
    kneeL:both2(A.kneeL,B.kneeL,t), kneeR:both2(A.kneeR,B.kneeR,t),
    elbL:both2(A.elbL,B.elbL,t),    elbR:both2(A.elbR,B.elbR,t)};
}
function frontAt(ex,u){
  var fr=ex.front; if(!fr) return null;
  var n=fr.length, tempo=ex.tempo||fr.map(function(){return 1;});
  var total=tempo.reduce(function(a,b){return a+b;},0);
  var target=((u%1)+1)%1*total, acc=0, i=0;
  for(i=0;i<n;i++){ if(target<acc+tempo[i]) break; acc+=tempo[i]; }
  if(i>=n) i=n-1;
  return lerpFront(fr[i], fr[(i+1)%n], easeInOutSine((target-acc)/tempo[i]));
}
if(typeof module!=='undefined'){ module.exports.solveFront=solveFront; module.exports.frontAt=frontAt; module.exports.lerpFront=lerpFront; }
