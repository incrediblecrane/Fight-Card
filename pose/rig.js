// Shared rig: planted-feet inverse kinematics, human proportions.
// Screen space: y grows downward. Angle 0 = up, 90 = +x, 180 = down.
// Proportions from the 7.5-head canon: head dia 16 => figure height 120.
var L = { THIGH:29, SHIN:29, TORSO:34, UPPER:21, FORE:19, HEAD_R:8, HEAD_OFF:16, FOOT:14 };
var GROUND = 170, ANKLE_Y = 163, STAND_HIP_Y = 105.5; // 163-29-29 = 105, the knee left soft (see analyse.js standingTall)

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
//         kneeSign, elbowSign, shrug:px of shoulder elevation,
//         footN, footF: each foot's pitch in degrees (footRot sets both)}
function solve(f){
  var hip=P(f.hip[0],f.hip[1]);
  var shBase=add(hip,dir(f.torso,L.TORSO));
  // nod turns the head off the line of the trunk (positive tucks the chin).
  var head=add(shBase,dir(f.torso+(f.nod||0),L.HEAD_OFF));
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
  var lN=armLen(f,false), lF=armLen(f,true);
  var elbN,handN,elbF,handF;
  if(f.handN){ handN=P(f.handN[0],f.handN[1]); elbN=ik(sh,handN,lN[0],lN[1],es); }
  else { var an=f.armN||[178,178]; elbN=add(sh,dir(an[0],lN[0])); handN=add(elbN,dir(an[1],lN[1])); }
  if(f.handF){ handF=P(f.handF[0],f.handF[1]); elbF=ik(shF,handF,lF[0],lF[1],es); }
  else { var af=f.armF||f.armN||[178,178]; elbF=add(shF,dir(af[0],lF[0])); handF=add(elbF,dir(af[1],lF[1])); }
  // The spine bows off the straight line from hip to shoulder (bow, positive
  // rounding the back, negative arching it), through a point half way along.
  // The hip and the shoulder stay where the torso angle puts them, so every
  // check on them still holds; only the drawing of the back changes. One
  // rigid segment could only pump the hips up and down, which is what the
  // cat-cow used to be.
  var bw=f.bow||0, tr=f.torso*Math.PI/180, mid=P((hip.x+sh.x)/2-bw*Math.cos(tr),(hip.y+sh.y)/2-bw*Math.sin(tr));

  var o={hip:hip,sh:sh,head:head,hipF:hipF,shF:shF,
    ankN:ankN,ankF:ankF,kneeN:kneeN,kneeF:kneeF,
    elbN:elbN,handN:handN,elbF:elbF,handF:handF,torso:f.torso,mid:mid,
    armScaleN:aN,armScaleF:aF,lenN:lN,lenF:lF,
    footN:pitch(f,'N'),footF:pitch(f,'F')};
  // A ball out of the hands (ballAt), and where a skipping rope has turned to.
  if(f.ballAt) o.ball=P(f.ballAt[0],f.ballAt[1]);
  if(f.rope!==undefined) o.rope=f.rope;
  return o;
}
// How long an arm's two segments are drawn, [upper arm, forearm]: armScale
// shortens both alike (an arm swinging toward the camera), and upperN/foreN
// (upperF/foreF for the far arm) one of them on top of that, for an arm whose
// upper arm and forearm point different ways out of the picture. At the top
// of a pull-up the upper arm points out to the side and the forearm straight
// up, and at the end of a face pull the upper arm is out wide beside the ear:
// one scale for both put the elbow in front of the face or drew a stub.
function armLen(f,far){ var k=far?'F':'N', a=f['armScale'+k], u=f['upper'+k], w=f['fore'+k];
  if(a===undefined) a=1; return [L.UPPER*a*(u===undefined?1:u), L.FORE*a*(w===undefined?1:w)]; }
// A foot's pitch: its own footN/footF, else footRot, which sets both.
function pitch(f,k){ var v=f['foot'+k]; return v===undefined?(f.footRot||0):v; }
// The foot as drawn from the side: a block hinged at the ankle, toe toward +x
// (the figure always faces +x), sole 6 below the ankle. Pitch turns it about
// the ankle, positive lifting the heel (up on the toes, a calf raise's top),
// negative the toes. It used to turn about a 'ball' level with the ankle and
// shared by both feet, so a raised heel left the foot floating 14 above the
// step, off the end of the shin. The author places the ankle so the part of
// the foot bearing weight lands on the floor or the step (checks: footing).
function footAt(ank,rot){
  var r=(rot||0)*Math.PI/180, c=Math.cos(r), s=Math.sin(r), F=L.FOOT;
  return [[F*0.72,1],[F*0.72,6],[-F*0.28,6],[-F*0.28,1]].map(function(p){ return P(ank.x+p[0]*c-p[1]*s, ank.y+p[0]*s+p[1]*c); });
}

// Where a kettlebell sits on the hand that holds it, side view: its centre
// and the way it lies from the fist (d, a unit vector). It used to hang 12
// below the fist whatever the arm did, so it sat on the crown of the head at
// the top of a press, upright in a bottoms-up hold and dropped straight down
// at the top of a swing. Now, by where the hand is:
// - bellUp (a bottoms-up hold): upside down, 12 above the fist;
// - hand below the elbow: it hangs, straight down from a bent arm and along
//   the line of a straight one (a swing's arm and bell are one pendulum);
// - hand above the elbow (a rack, a lockout): behind the wrist, lying on the
//   back of the forearm. The offset assumes the figure faces +x, as every
//   rig does.
// Between the last two it turns around the wrist, over the back of the hand
// as a bell rolls over it in a snatch or a clean, and never through the
// forearm. The turn is measured from the forearm (r, the angle from the line
// back to the elbow, kept between 0 and 360 so the bell cannot cross it) and
// runs while the forearm is between 30 and 98 degrees from straight up: below
// 30 a get-up's tilted lockout stays racked, past 98 a swing's float stays in
// line with the arm, and the snatch gets the widest arc its rig allows.
function bellAt(ex,s){
  var h=s.handN, D=12, T=2*Math.PI;
  if(ex.bellUp) return {x:h.x, y:h.y-D, d:P(0,-1)};
  var fx=h.x-s.elbN.x, fy=h.y-s.elbN.y, fl=Math.hypot(fx,fy)||1; fx/=fl; fy/=fl;
  var ax=h.x-s.sh.x, ay=h.y-s.sh.y, al=Math.hypot(ax,ay)||1;
  var k=ramp(0.88,0.97,al/(s.lenN[0]+s.lenN[1]));
  var e=Math.atan2(-fx,-fy), r1=((Math.atan2(k*ax/al,(1-k)+k*ay/al)-e)%T+T)%T, r0=T-0.4636;
  var b=Math.max(0,Math.min(1,(Math.acos(Math.max(-1,Math.min(1,-fy)))*180/Math.PI-30)/68));
  var a=e+r0+(r1-r0)*b, len=lerp(11,D,b), d=P(Math.sin(a),Math.cos(a));
  return {x:h.x+d.x*len, y:h.y+d.y*len, d:d};
}
function ramp(a,b,x){ var t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
// The second panel: one bell, in the loaded hand when the rig names one
// (load:'L'|'R', one-handed lifts), else between the two hands that share it;
// 9 below the handle, or above it held bottoms-up. Racked or overhead (the
// loaded hand above its elbow) it rests on the back of the forearm, so it
// shows just outside the fist rather than hanging over the hand and the head.
// It moves there as the hand rises from 8 below its elbow to 14 above it, by
// height rather than the forearm's direction, which swings round in one frame
// when a foreshortened forearm passes the elbow.
function bellFront(ex,f){
  var L2=f.handL, R2=f.handR, h=ex.load?(ex.load==='L'?L2:R2):P((L2.x+R2.x)/2,(L2.y+R2.y)/2), u=ex.bellUp?-1:1, x=h.x, y=h.y+9*u;
  if(ex.load&&!ex.bellUp){ var e=ex.load==='L'?f.elbL:f.elbR, k=Math.max(0,Math.min(1,(8-h.y+e.y)/22));
    x=lerp(x,h.x+(ex.load==='L'?-8:8),k); y=lerp(y,h.y+6,k); }
  return {x:x, y:y, h:h, u:u};
}
// Which label, L or R, a second panel gives the side view's near limbs. The
// side view looks at the lifter's left side, and L and R in a second panel
// are sides of the screen, so the near limbs are R from the front (the lifter
// faces you, their left on your right) and from above someone face up, and L
// from above someone face down (you see their back, their left on your left).
// A one-handed lift's load names this hand, since the side view draws the
// implement in the near hand.
function nearSide(ex){ return ex.frontPlan&&ex.frames&&Math.sin(ex.frames[0].torso*Math.PI/180)>0?'L':'R'; }
if(typeof module!=='undefined') module.exports={L:L,armLen:armLen,GROUND:GROUND,ANKLE_Y:ANKLE_Y,STAND_HIP_Y:STAND_HIP_Y,solve:solve,ik:ik,dir:dir,add:add,P:P,footAt:footAt,bellAt:bellAt,bellFront:bellFront,nearSide:nearSide};

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
function shoulderOf(f,far){
  var sh=add(P(f.hip[0],f.hip[1]),dir(f.torso,L.TORSO));
  if(f.shrug) sh=add(sh,{x:0,y:-f.shrug});
  return far?add(sh,{x:-5,y:0}):sh;
}
function handFromAngles(f,arm,far){
  var sh=shoulderOf(f,far), l=armLen(f,far);
  var elb=add(sh,dir(arm[0],l[0]));
  var h=add(elb,dir(arm[1],l[1]));
  return [h.x,h.y];
}
// Where a keyframe's hand is, whichever way its arm is given (as solve reads it).
function handOf(f,far){
  if(far) return f.handF||handFromAngles(f,f.armF||f.armN||[178,178],true);
  return f.handN||handFromAngles(f,f.armN||[178,178],false);
}
// A hand target blended in a straight line cuts the corner of an arm that
// sweeps round its shoulder: half way through a raise or a jack it passes
// close to the shoulder and the elbow folds to reach it. A rig with
// handPolar blends each hand as an angle and a reach about its own shoulder
// instead, so a straight arm sweeps an arc and stays straight.
// handPolar:'front' does it in the front view only. A jack's arm sweeps in
// the plane facing the camera, so from the side it passes end on through the
// shoulder, where an angle has no direction: blended as one, it swung
// through forward, a curl and then a bent-arm front raise.
function polarHand(A,B,t,f,key,far){
  if(!f[key]) return;
  var a=handOf(A,far), b=handOf(B,far), sa=shoulderOf(A,far), sb=shoulderOf(B,far), so=shoulderOf(f,far);
  f[key]=polarAt(a,b,sa,sb,so,t);
}
function polarAt(a,b,sa,sb,so,t){
  var aa=Math.atan2(a[0]-sa.x,-(a[1]-sa.y))*180/Math.PI, ab=Math.atan2(b[0]-sb.x,-(b[1]-sb.y))*180/Math.PI;
  var r=lerp(Math.hypot(a[0]-sa.x,a[1]-sa.y),Math.hypot(b[0]-sb.x,b[1]-sb.y),t), g=lerpAng(aa,ab,t)*Math.PI/180;
  return [so.x+r*Math.sin(g), so.y-r*Math.cos(g)];
}
// An arm drawn short (armScale) keeps its bend between keyframes. Its hand
// and its scale used to blend separately, so half way through a fly the hand
// came closer to the shoulder than the shortened arm's straight length had
// shrunk and the elbow folded to reach it: a hug in the middle of every rep.
// The bend is the hand's reach over the arm's drawn length; it blends from
// one keyframe's to the other's and the scale is set to keep it. Only where
// a keyframe sets a scale.
function keepBend(A,B,t,f,key,sk,far){
  if(!f[key] || (A[sk]===undefined && B[sk]===undefined)) return;
  function bend(F){ var h=handOf(F,far), s=shoulderOf(F,far), l=armLen(F,far); return Math.hypot(h[0]-s.x,h[1]-s.y)/(l[0]+l[1]); }
  var r=lerp(bend(A),bend(B),t), s=shoulderOf(f,far), d=Math.hypot(f[key][0]-s.x,f[key][1]-s.y), l=armLen(f,far), a=f[sk]===undefined?1:f[sk];
  if(r>0.05) f[sk]=Math.max(0.06,Math.min(1,d*a/((l[0]+l[1])*r)));
}
function seg(F,k){ return F[k]===undefined?1:F[k]; }
// Blend two keyframes into a valid in-between pose. ex, the rig, carries the
// options that change how (handPolar).
function lerpFrame(A,B,t,ex){
  var f={ hip:lerpPt(A.hip,B.hip,t), torso:lerpAng(A.torso,B.torso,t),
          ankN:lerpPt(A.ankN,B.ankN,t), ankF:lerpPt(A.ankF,B.ankF,t),
          // The bend sign blends too. Held from A for the whole segment, a sign
          // that changes at B drew B's pose bent A's way and then snapped the
          // knee to its mirror the instant the next segment began. ik() scales
          // the bend by the sign, so in between the joint swings through the
          // limb line instead of jumping across it.
          kneeSign:lerp(A.kneeSign===undefined?-1:A.kneeSign,B.kneeSign===undefined?-1:B.kneeSign,t),
          elbowSign:lerp(A.elbowSign===undefined?1:A.elbowSign,B.elbowSign===undefined?1:B.elbowSign,t),
          shrug:lerp(A.shrug||0,B.shrug||0,t), bow:lerp(A.bow||0,B.bow||0,t), nod:lerp(A.nod||0,B.nod||0,t),
          upperN:lerp(seg(A,'upperN'),seg(B,'upperN'),t), foreN:lerp(seg(A,'foreN'),seg(B,'foreN'),t),
          upperF:lerp(seg(A,'upperF'),seg(B,'upperF'),t), foreF:lerp(seg(A,'foreF'),seg(B,'foreF'),t),
          armScaleN:lerp(A.armScaleN===undefined?1:A.armScaleN,B.armScaleN===undefined?1:B.armScaleN,t),
          armScaleF:lerp(A.armScaleF===undefined?1:A.armScaleF,B.armScaleF===undefined?1:B.armScaleF,t),
          footN:lerp(pitch(A,'N'),pitch(B,'N'),t), footF:lerp(pitch(A,'F'),pitch(B,'F'),t) };
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
  if(ex&&ex.handPolar&&ex.handPolar!=='front'){ polarHand(A,B,t,f,'handN',false); polarHand(A,B,t,f,'handF',true); }
  keepBend(A,B,t,f,'handN','armScaleN',false); keepBend(A,B,t,f,'handF','armScaleF',true);
  // A ball let go of (ballAt on a keyframe: on the floor after a slam, at the
  // wall after a throw) travels from the hands to there and back; on a
  // keyframe without one it is in the near hand.
  if(A.ballAt||B.ballAt) f.ballAt=lerpPt(A.ballAt||handOf(A,false),B.ballAt||handOf(B,false),t);
  return f;
}

// Pose at normalised progress u (0..1) around the whole rep cycle,
// honouring per-segment tempo so eccentrics are slower than concentrics. Where
// in its segment the pose is comes from warp() (see timing, below).
function poseAt(ex,u){
  var n=ex.frames.length, g=segAt(tempoOf(ex),u), c=cutAt(ex,g), f;
  if(c>=0) f=lerpFrame(ex.frames[c],ex.frames[c],0,ex);
  else f=lerpFrame(ex.frames[g.i], ex.frames[(g.i+1)%n], hermite(g.t,warp(ex)[g.i]), ex);
  if(ex.equip==='rope') f.rope=ropeTurn(ex.frames,g);
  // A ball in the hands is in the near one (ballAt otherwise).
  if(ex.equip==='ball'&&!f.ballAt) f.ballAt=handOf(f,false);
  return f;
}
// loop:'cut' ends the rep on its last keyframe and starts the next on its
// first with no movement between them: the figure fades out, swaps while it
// cannot be seen, and fades back in. A broad jump sticks its landing 60 units
// in front of where it took off, and used to slide back there in a crouch.
// cutAt is the keyframe shown in the last segment of such a rig, else -1;
// alphaAt the figure's opacity, 0 for the middle fifth of that segment and
// fading over the two fifths either side.
function cutAt(ex,g){ var n=(ex.frames||ex.front).length; return ex.loop==='cut'&&g.i===n-1?(g.t<0.5?n-1:0):-1; }
function alphaAt(ex,u){
  var g=segAt(tempoOf(ex),u); if(cutAt(ex,g)<0) return 1;
  return Math.max(0,Math.min(1,(Math.abs(1-2*g.t)-0.2)*2));
}
// A skipping rope's turn (equip:'rope'), in degrees: 0 overhead, 90 in front,
// 180 under the feet, 270 behind. Each keyframe gives it (rope) and it turns
// on forwards from one to the next at an even pace, not on the figure's time
// warp: a rope turned by the wrists does not stop when the body does.
function ropeTurn(fr,g){
  var a=fr[g.i].rope||0, b=fr[(g.i+1)%fr.length].rope||0;
  return (a+((b-a)%360+360)%360*g.t)%360;
}
// Where the rope is (rig.solve's rope): the far end of its loop, which runs
// round the figure from above the head to just over the floor, under the
// feet at 180. front: it is on the near side of the body in a front view.
function ropeAt(s,c){
  var top=s.head.y-L.HEAD_R-8, bot=GROUND-1, a=s.rope*Math.PI/180, x=c===undefined?s.hip.x+3:c;
  return {x:x+28*Math.sin(a), y:(top+bot)/2-(bot-top)/2*Math.cos(a), front:Math.sin(a)>0};
}
// The keyframe a rep turns around at (the bottom of a squat, the top of a
// pull): stops[1] once a rig authors its stops, otherwise frame 2 of the usual
// four. Checks read it through here rather than hard-coding frame 2, which
// stops meaning the bottom the moment a rig gains a frame.
function turn(ex,front){ var s=(front&&ex.frontStops)||ex.stops; return s?s[1]:2; }
if(typeof module!=='undefined') module.exports.turn=turn, module.exports.lerpFrame=lerpFrame, module.exports.poseAt=poseAt, module.exports.alphaAt=alphaAt, module.exports.ropeAt=ropeAt;

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
    fistL:f.fistL===undefined?1:f.fistL, fistR:f.fistR===undefined?1:f.fistR,
    ball:f.ballFront?P(f.ballFront[0],f.ballFront[1]):undefined, rope:f.rope};
}
// An explicit joint in only one of the two keyframes is blended with the joint
// the other keyframe solves to. Dropping it instead (it used to carry through
// only when both had one) jumped from the given joint to a solved one at the
// keyframe boundary.
function lerpFront(A,B,t,ex){
  var sA=solveFront(A), sB=solveFront(B);
  function jt(k){ if(!A[k]&&!B[k]) return undefined;
    return lerpPt(A[k]||[sA[k].x,sA[k].y], B[k]||[sB[k].x,sB[k].y], t); }
  function sg(k){ return lerp(sA.sign[k],sB.sign[k],t); }
  var o={cx:lerp(A.cx===undefined?70:A.cx,B.cx===undefined?70:B.cx,t),
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
  // As the side view: hands about their shoulders with handPolar, and a
  // shortened arm keeping its bend, each only where no elbow is given.
  ['L','R'].forEach(function(k){ var hk='hand'+k, sk='armScale'+k;
    if(A['elb'+k]||B['elb'+k]) return;
    if(ex&&ex.handPolar) o[hk]=polarAt(A[hk],B[hk],shFront(A,k),shFront(B,k),shFront(o,k),t);
    if(A[sk]===undefined&&B[sk]===undefined) return;
    function bend(F){ var s=shFront(F,k); return Math.hypot(F[hk][0]-s.x,F[hk][1]-s.y)/((L.UPPER+L.FORE)*(F[sk]===undefined?1:F[sk])); }
    var r=lerp(bend(A),bend(B),t), s=shFront(o,k), d=Math.hypot(o[hk][0]-s.x,o[hk][1]-s.y);
    if(r>0.05) o[sk]=Math.max(0.06,Math.min(1,d/((L.UPPER+L.FORE)*r)));
  });
  // A ball let go of (ballFront), else between the hands.
  function mid(F){ return [(F.handL[0]+F.handR[0])/2,(F.handL[1]+F.handR[1])/2]; }
  if(A.ballFront||B.ballFront) o.ballFront=lerpPt(A.ballFront||mid(A),B.ballFront||mid(B),t);
  return o;
}
// A front frame's shoulder on side k, as solveFront places it.
function shFront(F,k){ var tS=F.torsoScale===undefined?1:F.torsoScale, cx=F.cx===undefined?70:F.cx;
  return P(cx+(F.lean||0)+(k==='L'?-1:1)*(F.shHW===undefined?16:F.shHW), F.hipY-L.TORSO*tS-(F.shrug||0)); }
function frontAt(ex,u){
  var fr=ex.front; if(!fr) return null;
  var n=fr.length, g=segAt(tempoOf(ex),u), c=cutAt(ex,g), f;
  if(c>=0) f=lerpFront(frontKey(fr,c),frontKey(fr,c),0,ex);
  else f=lerpFront(frontKey(fr,g.i), frontKey(fr,(g.i+1)%n), hermite(g.t,warp(ex,true)[g.i]), ex);
  if(ex.equip==='rope'&&ex.frames) f.rope=ropeTurn(ex.frames,g);
  if(ex.equip==='ball'&&!f.ballFront) f.ballFront=[(f.handL[0]+f.handR[0])/2,(f.handL[1]+f.handR[1])/2];
  return f;
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
function trackAt(ex,i,w,side,front,jf){
  var n=(ex.frames||ex.front).length, j=(i+1)%n, o=[];
  if(side&&ex.frames){ var s=solve(lerpFrame(ex.frames[i],ex.frames[j],w,ex)); TRACK.forEach(function(k){ o.push(s[k]); }); }
  if(front&&ex.front){ var f=solveFront(lerpFront(frontKey(ex.front,i),frontKey(ex.front,j),w,ex)); (jf||TRACKF).forEach(function(k){ o.push(f[k]); }); }
  return o;
}
// A second panel whose hips, head, hands and feet keep still through a
// segment while its elbows or knees move (a bench press seen from above,
// where only the elbows open and close) is read off those as well, or every
// keyframe of it would look held and be a stop while the side panel flows
// through.
var LIMBF=TRACKF.concat(['elbL','elbR','kneeL','kneeR']);
function frontJoints(ex){
  var n=ex.front.length;
  for(var i=0;i<n;i++){ var a=trackAt(ex,i,0,false,true,LIMBF), most=0, all=0;
    for(var q=1;q<=12;q++){ var b=trackAt(ex,i,q/12,false,true,LIMBF);
      most=Math.max(most,vmax(b.slice(0,TRACKF.length),a.slice(0,TRACKF.length))); all=Math.max(all,vmax(b,a)); }
    if(most<0.5 && all>=0.5) return LIMBF; }
  return TRACKF;
}
// Per segment: path length, and per joint the direction and rate (units per
// unit of w) it leaves its first keyframe at and reaches its second at.
function segPaths(ex,side,front){
  var n=(ex.frames||ex.front).length, E=0.002, K=24, out=[], jf=front&&ex.front&&!side?frontJoints(ex):null;
  for(var i=0;i<n;i++){
    var pts=[], len=0, most=0, q;
    // A cut (loop:'cut') holds still either side of it: both its ends rest.
    if(ex.loop==='cut'&&i===n-1){ var z=trackAt(ex,i,0,side,front,jf).map(function(){ return {x:0,y:0}; });
      out.push({len:0, held:true, d0:z, d1:z}); continue; }
    for(q=0;q<=K;q++) pts.push(trackAt(ex,i,q/K,side,front,jf));
    for(q=0;q<K;q++) len+=vlen(pts[q+1],pts[q]);
    for(q=1;q<=K;q++) most=Math.max(most,vmax(pts[q],pts[0]));
    out.push({len:len, held:most<0.5, d0:vdiff(trackAt(ex,i,E,side,front,jf),pts[0],E), d1:vdiff(pts[K],trackAt(ex,i,1-E,side,front,jf),E)});
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
// second nor a 1 s sprint stride at 48. A rig whose hips, head, hands or feet
// would jump more than 6 units (about 9 CSS px) between two such frames reads
// as a jump rather than a movement, and is drawn every 33 ms (two refreshes)
// instead: the boxing drills, sprints, jumps and swings. Only one rig plays at
// a time, so the cost is that rig's: on a phone at 4x CPU throttle the push
// press kept the main thread 15 to 25% busy at 33 ms against 12 to 16% at 50,
// inside the 30% budget.
// `emit-rig.js --stops` lists what each rig jumps a frame.
var FRAME_MS=50, FAST_MS=100/3, STROBE=6;
function jumpsAt(ex,n){
  var worst=0, prev=null;
  for(var i=0;i<=n;i++){
    var s=ex.frames?solve(poseAt(ex,i/n)):null, f=ex.front?solveFront(frontAt(ex,i/n)):null, cur=[];
    if(s) TRACK.forEach(function(k){ cur.push(s[k]); });
    if(f) TRACKF.forEach(function(k){ cur.push(f[k]); });
    // The swap of a cut happens out of sight (alphaAt), so it is no jump.
    if(prev&&!cutBetween(ex,(i-1)/n,i/n)) worst=Math.max(worst,vmax(cur,prev));
    prev=cur;
  }
  return worst;
}
// Whether the swap of a cut falls between two moments of a rep.
function cutBetween(ex,u0,u1){ var t=tempoOf(ex), a=segAt(t,u0), b=segAt(t,u1), x=cutAt(ex,a), y=cutAt(ex,b); return x>=0&&y>=0&&x!==y; }
function stepsOf(ex){ var at=Math.round(cycleMs(ex)/FRAME_MS); return jumpsAt(ex,at)>STROBE?Math.round(cycleMs(ex)/FAST_MS):at; }
// The biggest jump between two of the frames the app draws.
function strobes(ex){ return jumpsAt(ex,stepsOf(ex)); }
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
  module.exports.ship=ship; module.exports.segAt=segAt; module.exports.tempoOf=tempoOf; module.exports.cutBetween=cutBetween; }
