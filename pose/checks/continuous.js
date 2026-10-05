var rig=require('../rig.js'), EX=require('../exercises.js');
var L=rig.L, GROUND=rig.GROUND;
function r(n){return Math.round(n*10)/10;}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
var SAMPLES=120, fails=[];
function ck(id,label,cond,detail){ if(!cond) fails.push(id+' :: '+label+'  ['+detail+']'); }

EX.forEach(function(ex){
  var worstStretch=0, floorBreak=0, footDrift=0, barXs=[], ankles=[];
  var planted = ['backsquat','frontsquat','goblet','deadlift','rdl','ohp','row','kbswing','press_push','sq_air','wallsit'].indexOf(ex.id)>=0;
  for(var i=0;i<SAMPLES;i++){
    var s=rig.solve(rig.poseAt(ex,i/SAMPLES));
    // limb integrity across the WHOLE motion, not just keyframes
    // An arm may be drawn SHORT on purpose (armScaleN/F) when it swings out of
    // this plane, so what must hold is its scaled length, not its full one.
    var aN=s.armScaleN===undefined?1:s.armScaleN, aF=s.armScaleF===undefined?1:s.armScaleF;
    worstStretch=Math.max(worstStretch,
      Math.abs(d(s.hip,s.kneeN)-L.THIGH), Math.abs(d(s.kneeN,s.ankN)-L.SHIN),
      Math.abs(d(s.sh,s.elbN)-L.UPPER*aN), Math.abs(d(s.elbN,s.handN)-L.FORE*aN),
      Math.abs(d(s.hipF,s.kneeF)-L.THIGH), Math.abs(d(s.kneeF,s.ankF)-L.SHIN),
      Math.abs(d(s.shF,s.elbF)-L.UPPER*aF), Math.abs(d(s.elbF,s.handF)-L.FORE*aF));
    // reach: a limb asked to span more than its length would be silently stretched
    var legReach=d(s.hip,s.ankN), armReach=d(s.sh,s.handN);
    ck(ex.id,'leg never asked to over-extend (sample '+i+')', legReach<=L.THIGH+L.SHIN+0.5,'reach '+r(legReach));
    ck(ex.id,'arm never asked to over-extend (sample '+i+')', armReach<=(L.UPPER+L.FORE)*aN+0.5,
      'reach '+r(armReach)+' of '+r((L.UPPER+L.FORE)*aN));
    var low=Math.max(s.ankN.y,s.ankF.y,s.kneeN.y,s.hip.y,s.handN.y,s.head.y+L.HEAD_R);
    if(low>GROUND+2) floorBreak++;
    if(planted) ankles.push(s.ankN.x+','+s.ankN.y);
    barXs.push(s.handN.x);
  }
  ck(ex.id,'no limb stretches during the motion', worstStretch<0.8,'worst '+r(worstStretch));
  ck(ex.id,'nothing sinks through the floor', floorBreak===0, floorBreak+' samples below ground');
  if(planted){
    var uniq={}; ankles.forEach(function(a){uniq[a]=1;});
    ck(ex.id,'planted foot never slides', Object.keys(uniq).length===1,'foot took '+Object.keys(uniq).length+' positions');
  }
  if(ex.id==='deadlift'||ex.id==='backsquat'){
    var spread=Math.max.apply(null,barXs)-Math.min.apply(null,barXs);
    ck(ex.id,'bar path stays vertical through the whole rep', spread<14,'horizontal drift '+r(spread));
  }
});
// The same limb lengths, sampled four times finer: a far shin stretched 2
// units for a moment either side of a keyframe peaked between two of the 120
// samples above and passed (a broad-jump take-off).
EX.forEach(function(ex){
  var worst=0, where='';
  for(var i=0;i<400;i++){ var s=rig.solve(rig.poseAt(ex,i/400));
    [['thigh',d(s.hip,s.kneeN)-L.THIGH],['shin',d(s.kneeN,s.ankN)-L.SHIN],
     ['far thigh',d(s.hipF,s.kneeF)-L.THIGH],['far shin',d(s.kneeF,s.ankF)-L.SHIN],
     ['upper arm',d(s.sh,s.elbN)-L.UPPER*s.armScaleN],['forearm',d(s.elbN,s.handN)-L.FORE*s.armScaleN],
     ['far upper arm',d(s.shF,s.elbF)-L.UPPER*s.armScaleF],['far forearm',d(s.elbF,s.handF)-L.FORE*s.armScaleF]
    ].forEach(function(q){ if(Math.abs(q[1])>worst){ worst=Math.abs(q[1]); where=q[0]+' at u='+(i/400); } });
  }
  ck(ex.id,'no limb stretches anywhere in the rep (fine)', worst<0.8,'worst '+r(worst)+' '+where);
});
// No joint may jump between two moments of the rep that sit next to each
// other. Every check above samples 120 points, and a joint can teleport
// between two of them while each pose is valid on its own: an elbow taking the
// mirror IK branch when a hand passes the shoulder's x, or a knee bend sign
// held from one keyframe and swapped at the next. Sampled fine enough that
// honest motion moves well under a unit per step, in both views, for this rig
// and for the copy of it the app ships.
var FINE=2000, JUMP=3;
var app=(function(){
  var h=require('fs').readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
  var src=h.slice(h.indexOf('var RL='), h.indexOf('function rSeg('))+h.slice(h.indexOf('function rSolveFront('), h.indexOf('function rEquipFront('));
  return new Function(src+';return {RIGFRAMES:RIGFRAMES,solve:rSolve,poseAt:rPoseAt,lerpFrame:rFrame,solveFront:rSolveFront,frontAt:rFrontAt};')();
})();
function jumps(tag,at){
  var prev=null, worst=0, where='';
  for(var i=0;i<=FINE;i++){
    var s=at(i/FINE);
    if(prev) for(var k in s){ var a=s[k], b=prev[k];
      if(a && typeof a.x==='number'){ var dd=d(a,b); if(dd>worst){ worst=dd; where=k+' at u='+(i/FINE).toFixed(4); } } }
    prev=s;
  }
  ck(tag,'no joint jumps between adjacent moments', worst<=JUMP,'worst '+r(worst)+' '+where);
}
EX.forEach(function(ex){
  var ax=app.RIGFRAMES[ex.id];
  jumps(ex.id+' side',function(u){ return rig.solve(rig.poseAt(ex,u)); });
  jumps(ex.id+' side (app)',function(u){ return app.solve(app.poseAt(ax,u)); });
  if(!ex.front) return;
  jumps(ex.id+' front',function(u){ return rig.solveFront(rig.frontAt(ex,u)); });
  jumps(ex.id+' front (app)',function(u){ return app.solveFront(app.frontAt(ax,u)); });
});
// The app ships its own copy of the solver (rSolve, rFrame, rPoseAt and the
// front ones), so a fix made in rig.js alone leaves the app drawing the old
// pose while every check here passes. Both copies must draw the same figure at
// every moment of every rig, and on the edge cases below, which exercise paths
// no shipped rig takes yet: a far arm switching between a hand target and
// angles, armF on one keyframe only, a shrug with scaled arms, and front
// frames that set their own hip and shoulder width.
var EDGE=[
  {id:'edge far hand<->angles',frames:[
    {hip:[50,107],torso:4,ankN:[56,163],ankF:[46,163],armN:[180,175],handF:[66,138]},
    {hip:[48,112],torso:10,ankN:[56,163],ankF:[46,163],armN:[170,120],armF:[150,95],armScaleF:0.8}]},
  {id:'edge armF on one keyframe',frames:[
    {hip:[50,107],torso:0,ankN:[56,163],ankF:[46,163],armN:[180,170],armF:[120,60]},
    {hip:[50,110],torso:6,ankN:[56,163],ankF:[46,163],armN:[200,190]}]},
  {id:'edge near hand<->angles, shrug',frames:[
    {hip:[50,107],torso:0,ankN:[56,163],ankF:[46,163],handN:[70,120],handF:[64,122],shrug:3,armScaleN:0.7},
    {hip:[52,118],torso:20,ankN:[56,163],ankF:[46,163],armN:[150,60],kneeSign:-1}]}];
var EDGEFRONT=[{id:'edge front widths',front:[
  {hipY:107,hipHW:11,shHW:18,cx:72,lean:2,footL:[56,163],footR:[86,163],handL:[50,140],handR:[94,140]},
  {hipY:118,torsoScale:0.9,shrug:2,footL:[56,163],footR:[86,163],handL:[46,96],handR:[98,96],
   elbL:[44,100],armScaleR:0.8,fistL:1.5}]}];
var PAR=400, PTOL=0.01;
function diff(a,b,path,out,keep){
  for(var k in a){ var x=a[k], y=b?b[k]:undefined;
    if(x===undefined||x===null) continue;
    if(keep&&(typeof x!=='object'||typeof x.x==='number')&&!keep(path+k)) continue;
    if(typeof x==='number'){ if(typeof y==='number'){ var e=Math.abs(x-y);
      if(k==='torso') e=Math.abs(((x-y)%360+540)%360-180); // 360 apart is the same lean
      if(e>out.w){ out.w=e; out.at=path+k; } } }
    else if(typeof x==='object' && typeof x.x==='number'){
      if(!y||typeof y.x!=='number'){ out.w=Infinity; out.at=path+k+' missing'; continue; }
      var e2=d(x,y); if(e2>out.w){ out.w=e2; out.at=path+k; } }
    else if(typeof x==='object') diff(x,y,path+k+'.',out,keep);
  }
  return out;
}
function parity(tag,ours,theirs){
  var out={w:0,at:''};
  for(var i=0;i<PAR;i++){ var o=diff(ours(i/PAR),theirs(i/PAR),'',{w:0,at:''});
    if(o.w>out.w){ out.w=o.w; out.at=o.at+' at u='+(i/PAR); } }
  ck(tag,'the app draws the same figure as pose/',out.w<=PTOL,'off by '+r(out.w*100)/100+' '+out.at);
}
EX.concat(EDGE).forEach(function(ex){
  var ax=app.RIGFRAMES[ex.id]||ex;
  parity(ex.id+' side',function(u){ return rig.solve(rig.poseAt(ex,u)); },function(u){ return app.solve(app.poseAt(ax,u)); });
});
EX.concat(EDGEFRONT).forEach(function(ex){
  if(!ex.front) return;
  var ax=app.RIGFRAMES[ex.id]||ex;
  parity(ex.id+' front',function(u){ return rig.solveFront(rig.frontAt(ex,u)); },function(u){ return app.solveFront(app.frontAt(ax,u)); });
});
// A segment starts on its first keyframe and ends on its second, exactly, in
// both copies. Blending reads each keyframe's arms by that keyframe's own keys;
// reading one through the other's ended a segment on a pose neither has (a far
// hand going from a target to angles finished where the NEAR arm's angles put
// it, then snapped on the next segment).
// The worst miss that breaks its tolerance, or null: 0.5 for the elbows (see
// below), PTOL for everything else, each judged on its own keys, so a large
// elbow miss never lends its tolerance to a hand or knee that is also off.
function kfOff(a,b){
  var e=diff(a,b,'',{w:0,at:''},function(p){ return /^elb/.test(p); }),
      o=diff(a,b,'',{w:0,at:''},function(p){ return !/^elb/.test(p); });
  return e.w>0.5?e:o.w>PTOL?o:null;
}
ck('keyframe tolerance','a hand off by 0.3 fails even when an elbow is off more',
  !!kfOff({elbN:{x:0,y:0},handN:{x:0,y:0}},{elbN:{x:0.4,y:0},handN:{x:0.3,y:0}}),'passed');
ck('keyframe tolerance','an elbow within 0.5 and the rest exact passes',
  !kfOff({elbN:{x:0,y:0},handN:{x:0,y:0}},{elbN:{x:0.4,y:0},handN:{x:0.005,y:0}}),'failed');
EX.concat(EDGE).forEach(function(ex){
  var n=ex.frames.length;
  ex.frames.forEach(function(A,j){ var B=ex.frames[(j+1)%n];
    [['',rig.lerpFrame,rig.solve],[' (app)',app.lerpFrame,app.solve]].forEach(function(v){
      // An arm blended between angles and a target is solved by IK, which
      // stops a hair short of a dead straight arm, so its elbow lands within
      // half a unit of the angles' elbow (kb_clean's straight hanging arm).
      var bo=kfOff(rig.solve(B),v[2](v[1](A,B,1))), bo0=kfOff(rig.solve(A),v[2](v[1](A,B,0)));
      ck(ex.id+v[0],'segment '+j+' to '+((j+1)%n)+' starts and ends on its keyframes',!bo&&!bo0,
        'end off by '+(bo?r(bo.w)+' '+bo.at:'0')+', start off by '+(bo0?r(bo0.w)+' '+bo0.at:'0'));
    });
  });
});
// A hand hanging (near enough) straight below its shoulder leaves neither IK
// branch clearly lower, so that keyframe cannot say which side the elbow bends
// to. Letting it flare out anyway swung the elbow through the limb line, the
// arm collapsing to a stub mid-rep, and flared the single-arm row's working
// elbow out wide every rep. Such a keyframe takes the branch of its nearest
// decided neighbour, so the elbow only changes side where a hand genuinely
// crosses the shoulder. (Overhead, a tie flares out on purpose: a face pull.)
function tieAt(s,k,f){
  var a=f['armScale'+k]===undefined?1:f['armScale'+k], sh=s['sh'+k], h=s['hand'+k];
  var p=rig.ik(sh,h,L.UPPER*a,L.FORE*a,1), m=rig.ik(sh,h,L.UPPER*a,L.FORE*a,-1);
  return Math.abs(p.y-m.y)<=Math.abs(p.x-m.x)*0.1 && p.y+m.y>2*sh.y;
}
EX.forEach(function(ex){
  var fr=ex.front; if(!fr) return;
  var tempo=ex.tempo||fr.map(function(){return 1;}), tot=tempo.reduce(function(a,b){return a+b;},0);
  [['',rig.frontAt,ex],[' (app)',app.frontAt,app.RIGFRAMES[ex.id]]].forEach(function(v){
    var acc=0, g=fr.map(function(f,j){ var u=acc/tot; acc+=tempo[j]; return v[1](v[2],u); });
    ['L','R'].forEach(function(k){
      fr.forEach(function(f,j){ var j2=(j+1)%fr.length, f2=fr[j2];
        if(f['elb'+k]||f2['elb'+k]) return;
        if(g[j]['elbSign'+k]===g[j2]['elbSign'+k]) return;
        ck(ex.id+' front'+v[0],'elb'+k+' changes side only where the hand crosses the shoulder',
          !tieAt(rig.solveFront(f),k,f)&&!tieAt(rig.solveFront(f2),k,f2),'keyframes '+j+' to '+j2);
      });
    });
  });
});
// Elbows that should stay by the ribs: the row's working arm (the plan view
// exists to show it not flaring) and both arms of the running drills.
[['row_single',['R'],4,99],['sprint',['L','R'],6,6],['highknees',['L','R'],6,6]].forEach(function(c){
  var ex=EX.filter(function(e){return e.id===c[0];})[0], ax=app.RIGFRAMES[c[0]], worst=0, where='';
  for(var i=0;i<800;i++){ var s=i&1?app.solveFront(app.frontAt(ax,i/800)):rig.solveFront(rig.frontAt(ex,i/800));
    c[1].forEach(function(k){ var o=(s['elb'+k].x-s['sh'+k].x)*(k==='L'?-1:1);
      var bad=Math.max(o-c[2],-o-c[3]); if(bad>worst){ worst=bad; where='elb'+k+' '+r(o)+' outside the shoulder at u='+(i/800)+(i&1?' (app)':''); } }); }
  ck(c[0]+' front','elbows stay tucked, neither flared nor crossed',worst<=0,where);
});
// Which way a knee or elbow bends. Flexion is the signed angle from the upper
// segment to the lower: 0 straight, positive the way the joint folds, negative
// bent backwards, which no knee or elbow does (a push-up whose knees bent 57 to
// 133 degrees the wrong way passed every check here). A range of -10 to 160
// leaves room for a soft lockout and a deep fold. Near +-180 the sign wraps, so
// a fully folded arm can land on the wrong end of it; read those by eye.
// The rigs listed below already break the range and are being re-authored, so
// for now they print as warnings. Any other rig breaking it fails, and a
// listed rig that has come back inside it says so, so the list only shrinks.
var BENDS={backsquat:'elbF elbN',row:'elbF elbN',hipthrust:'elbF elbN',facepull:'elbF elbN',
  press_push:'elbF',glutebridge:'elbF elbN',row_single:'elbF elbN',invertedrow:'elbF elbN',
  kb_press:'elbN',sideplank:'elbF elbN kneeF kneeN',hollowhold:'elbF elbN',
  bearcrawl:'elbF elbN kneeF kneeN',kb_tgu:'elbF elbN',sq_jump:'elbF elbN',boxjump:'elbF elbN',
  medballslam:'elbF elbN',sprint:'elbF elbN',highknees:'elbF elbN',briskwalkjog:'elbF elbN',
  childspose:'elbF elbN kneeF kneeN',catcow:'elbF elbN kneeF kneeN',worldsgreatest:'elbF',
  pigeon:'kneeF kneeN',thoracic:'elbF elbN kneeF kneeN',shadowbox:'elbF elbN',
  bagspeed:'elbF elbN',skierg:'elbN',pushup:'elbF elbN kneeF kneeN',plank:'elbF elbN kneeF kneeN',
  mtnclimb:'elbF elbN kneeF kneeN',burpee:'elbF elbN'};
var bendWarn=[], bendDone=[];
function head(p,q){ return Math.atan2(q.x-p.x,-(q.y-p.y))*180/Math.PI; }
function flex(a,b,c){ return ((head(a,b)-head(b,c))%360+540)%360-180; }
EX.forEach(function(ex){
  var out={};
  for(var i=0;i<240;i++){ var s=rig.solve(rig.poseAt(ex,i/240)), u=i/240;
    [['elbN',flex(s.sh,s.elbN,s.handN)],['elbF',flex(s.shF,s.elbF,s.handF)],
     ['kneeN',-flex(s.hip,s.kneeN,s.ankN)],['kneeF',-flex(s.hipF,s.kneeF,s.ankF)]].forEach(function(q){
      var over=q[1]<-10?-10-q[1]:q[1]>160?q[1]-160:0;
      if(over>0 && (!out[q[0]]||over>out[q[0]].o)) out[q[0]]={o:over,v:q[1],u:u};
    });
  }
  var known=(BENDS[ex.id]||'').split(' ').filter(Boolean);
  Object.keys(out).forEach(function(k){ var w=k+' '+Math.round(out[k].v)+' at u='+out[k].u.toFixed(3);
    if(known.indexOf(k)>=0) bendWarn.push(ex.id+' '+w);
    else ck(ex.id,'knees and elbows bend only the way they can (-10 to 160)',false,w); });
  known.forEach(function(k){ if(!out[k]) bendDone.push(ex.id+' '+k); });
});
console.log('=== CONTINUOUS MOTION CHECK ('+SAMPLES+' samples/exercise) ===');
if(bendWarn.length) console.log('WARN: '+bendWarn.length+' joints bend outside -10..160 (listed in BENDS, being re-authored):\n  ! '+bendWarn.join('\n  ! '));
if(bendDone.length) console.log('NOTE: now inside -10..160, take off BENDS: '+bendDone.join(', '));
if(!fails.length) console.log('PASS: motion is valid at every point, not just the keyframes.');
else { console.log('FAILURES ('+fails.length+'):');
  var seen={}; fails.forEach(function(f){ var k=f.split('(sample')[0]; if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
process.exit(fails.length?1:0);
