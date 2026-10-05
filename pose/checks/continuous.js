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
  return new Function(src+';return {RIGFRAMES:RIGFRAMES,solve:rSolve,poseAt:rPoseAt,lerpFrame:rFrame,solveFront:rSolveFront,frontAt:rFrontAt,bellAt:rBellAt,bellFront:rBellFront,footAt:rFootPts};')();
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
    {hip:[52,118],torso:20,ankN:[56,163],ankF:[46,163],armN:[150,60],kneeSign:-1}]},
  // Authored stops and a jump's ballistic eases: take-off to apex 'out',
  // apex to landing 'in', the rest of the rep found.
  {id:'edge authored stops and ease',stops:[0,2],ease:[null,'out','in',null],tempo:[300,200,200,300],frames:[
    {hip:[50,107],torso:4,ankN:[56,163],ankF:[46,163],armN:[180,175]},
    {hip:[50,122],torso:20,ankN:[56,163],ankF:[46,163],armN:[200,190]},
    {hip:[52,90],torso:2,ankN:[58,148],ankF:[48,148],armN:[10,10]},
    {hip:[52,115],torso:12,ankN:[58,163],ankF:[48,163],armN:[170,170]}]}];
// The authored eases are exactly the curves they name.
(function(){
  var ex=EDGE[EDGE.length-1], w=rig.warp(ex);
  ck(ex.id,'an authored ease is the curve it names',JSON.stringify(w[1])==='[2,0]'&&JSON.stringify(w[2])==='[0,2]'&&
    Math.abs(rig.hermite(0.3,w[1])-(1-0.7*0.7))<1e-12&&Math.abs(rig.hermite(0.3,w[2])-0.09)<1e-12,JSON.stringify(w));
  ck(ex.id,'authored stops are the stops',JSON.stringify(rig.stopsOf(ex))==='[0,2]',JSON.stringify(rig.stopsOf(ex)));
})();
var EDGEFRONT=[{id:'edge front widths',front:[
  {hipY:107,hipHW:11,shHW:18,cx:72,lean:2,footL:[56,163],footR:[86,163],handL:[50,140],handR:[94,140]},
  {hipY:118,torsoScale:0.9,shrug:2,footL:[56,163],footR:[86,163],handL:[46,96],handR:[98,96],
   elbL:[44,100],armScaleR:0.8,fistL:1.5}]}];
var PAR=400, PTOL=0.01;
// What emit-rig.js would hand the app for a rig it has not shipped: the rig
// plus rig.ship's timing.
function shipped(ex){ var o={}, s=rig.ship(ex), k; for(k in ex) o[k]=ex[k]; for(k in s) o[k]=s[k]; return o; }
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
  var ax=app.RIGFRAMES[ex.id]||shipped(ex);
  parity(ex.id+' side',function(u){ return rig.solve(rig.poseAt(ex,u)); },function(u){ return app.solve(app.poseAt(ax,u)); });
});
EX.concat(EDGEFRONT).forEach(function(ex){
  if(!ex.front) return;
  var ax=app.RIGFRAMES[ex.id]||shipped(ex);
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
// Elbows that should stay by the ribs: the row's working arm (L from above,
// see views.js on which side is which; the plan view
// exists to show it not flaring) and both arms of the running drills.
[['row_single',['L'],4,99],['sprint',['L','R'],6,6],['highknees',['L','R'],6,6]].forEach(function(c){
  var ex=EX.filter(function(e){return e.id===c[0];})[0], ax=app.RIGFRAMES[c[0]], worst=0, where='';
  for(var i=0;i<800;i++){ var s=i&1?app.solveFront(app.frontAt(ax,i/800)):rig.solveFront(rig.frontAt(ex,i/800));
    c[1].forEach(function(k){ var o=(s['elb'+k].x-s['sh'+k].x)*(k==='L'?-1:1);
      var bad=Math.max(o-c[2],-o-c[3]); if(bad>worst){ worst=bad; where='elb'+k+' '+r(o)+' outside the shoulder at u='+(i/800)+(i&1?' (app)':''); } }); }
  ck(c[0]+' front','elbows stay tucked, neither flared nor crossed',worst<=0,where);
});
// Where a kettlebell lies on the fist (rig.bellAt), in both copies. It used
// to hang 12 below the fist whatever the arm did: on the crown of the head at
// the top of a press, upright in a bottoms-up hold, dropped straight down at
// the top of a swing. Within 30 degrees of what the hand is doing: upside down
// above the fist held bottoms-up; under a hand below its elbow, straight down
// from a bent arm and along a straight one; back down the forearm or behind
// it, in a rack or a lockout.
// Always on the fist (10 to 13 from it) and the same in the app.
// Turning round the wrist it goes over the back of the hand: it never passes
// through the forearm, which is the bell flipping over and banging the
// forearm that the clean and the snatch warn against. And it does not jump
// round the fist between two frames the app draws (RIGFRAMES steps): at most
// 6 a frame, or as far as the fist itself moves that frame when the arm is
// whipping faster. Measured per sample, a flip across the forearm in one
// 33 ms frame passed, as it moved under a unit between samples 1/2000 of a rep
// apart. The same in the second panel, 6 a frame as it moves outside the fist.
function crossesForearm(prev,s,b){ var h=s.handN, e={x:s.elbN.x-h.x,y:s.elbN.y-h.y}, o={x:b.x-h.x,y:b.y-h.y};
  var side=e.x*o.y-e.y*o.x, toward=e.x*o.x+e.y*o.y; return {side:side, cross:prev&&prev.toward>0&&toward>0&&(prev.side<0)!==(side<0), toward:toward}; }
function ang(a,b){ var c=(a.x*b.x+a.y*b.y)/((Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y))||1); return Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI; }
EX.filter(function(e){ return e.equip==='kettlebell'; }).forEach(function(ex){
  var ax=app.RIGFRAMES[ex.id], worst=0, where='', far=0, farAt='', par=0, parAt='', cross='', fc=null;
  for(var i=0;i<=FINE;i++){ var u=i/FINE, s=rig.solve(rig.poseAt(ex,u)), b=rig.bellAt(ex,s), h=s.handN;
    var off={x:b.x-h.x,y:b.y-h.y}, len=Math.hypot(off.x,off.y), want=null;
    var fx=h.x-s.elbN.x, fy=(h.y-s.elbN.y)/Math.hypot(fx,h.y-s.elbN.y), reach=d(s.sh,h)/((L.UPPER+L.FORE)*s.armScaleN);
    // Racked once the forearm is within 30 degrees of straight up, hanging
    // or in line once it is past 98 (it used to switch over between -0.3 and
    // 0.05 of the forearm's unit y, about 20 degrees, which a snatch swept in
    // one frame); between, it is turning round the wrist (checked below).
    var up=Math.acos(Math.max(-1,Math.min(1,-fy)))*180/Math.PI;
    if(ex.bellUp) want={x:0,y:-1};
    else if(up>=98&&reach>=0.97) want={x:h.x-s.sh.x,y:h.y-s.sh.y};
    else if(up>=98&&reach<=0.88) want={x:0,y:1};
    else if(up<=30) want={x:s.elbN.x-h.x,y:s.elbN.y-h.y};
    if(want){ var a=ang(off,want);
      // Racked, anywhere on the back of the forearm will do (the side away
      // from the face, -x as the figure faces +x).
      if(up<=30 && a<=90 && want.y*off.x-want.x*off.y<0) a=0;
      if(a>worst){ worst=a; where='u='+u.toFixed(4); } }
    var e=Math.max(10-len,len-13); if(e>far){ far=e; farAt=r(len)+' at u='+u.toFixed(4); }
    fc=crossesForearm(fc,s,b); if(fc.cross&&!cross) cross='u='+u.toFixed(4);
    if(i%5===0){ var bp=app.bellAt(ax,app.solve(app.poseAt(ax,u))), q=d(bp,b); if(q>par){ par=q; parAt='u='+u.toFixed(4); } }
  }
  ck(ex.id,'the kettlebell lies the way the hand holds it (within 30 degrees)',worst<=30,r(worst)+' degrees off at '+where);
  ck(ex.id,'the kettlebell stays on the fist',far<=0,'centre '+farAt);
  ck(ex.id,'the kettlebell turns over the back of the hand, never through the forearm',!cross,'crosses at '+cross);
  var n=ax.steps, pr=null, ph=null, step=0, stepAt='';
  for(var i=0;i<=n;i++){ var s=app.solve(app.poseAt(ax,i/n)), b=app.bellAt(ax,s), h=s.handN, rel={x:b.x-h.x,y:b.y-h.y};
    if(pr){ var over=d(rel,pr)-Math.max(6,d(h,ph)); if(over>step){ step=over; stepAt='step '+i+'/'+n+': '+r(d(rel,pr))+' round the fist, the fist moved '+r(d(h,ph)); } }
    pr=rel; ph=h; }
  ck(ex.id,'the kettlebell turns round the wrist without jumping between frames',step<=0,stepAt);
  ck(ex.id,'the app puts the kettlebell where pose/ does',par<=PTOL,'off by '+r(par*100)/100+' at '+parAt);
  if(ex.front){ var fp=0, fj=0, fjAt='', pf=null;
    for(var k=0;k<=FINE;k+=5){ var bf=rig.bellFront(ex,rig.solveFront(rig.frontAt(ex,k/FINE)));
      var af=app.bellFront(ax,app.solveFront(app.frontAt(ax,k/FINE))); fp=Math.max(fp,d(bf,af),d(bf.h,af.h)); }
    for(var i=0;i<=n;i++){ var bf=app.bellFront(ax,app.solveFront(app.frontAt(ax,i/n))), rel={x:bf.x-bf.h.x,y:bf.y-bf.h.y};
      if(pf&&d(rel,pf)>fj){ fj=d(rel,pf); fjAt='step '+i+'/'+n; } pf=rel; }
    ck(ex.id+' front','the kettlebell moves onto the back of the forearm without jumping between frames',fj<=6,r(fj)+' round the fist at '+fjAt);
    ck(ex.id+' front','the app puts the kettlebell where pose/ does',fp<=PTOL,'off by '+r(fp*100)/100); }
});
// The foot is the same block in both copies (rig.footAt), so a raised heel
// is drawn where the checks put it.
EX.forEach(function(ex){ var ax=app.RIGFRAMES[ex.id], w=0;
  for(var i=0;i<PAR;i++){ var s=rig.solve(rig.poseAt(ex,i/PAR)), t=app.solve(app.poseAt(ax,i/PAR));
    ['N','F'].forEach(function(k){ var a=rig.footAt(s['ank'+k],s['foot'+k]), b=app.footAt(t['ank'+k],t['foot'+k]);
      a.forEach(function(p,j){ w=Math.max(w,d(p,b[j])); }); }); }
  ck(ex.id,'the app draws the feet where pose/ does',w<=PTOL,'off by '+r(w*100)/100);
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
var BENDS={backsquat:'elbF elbN',hipthrust:'elbF elbN',facepull:'elbF elbN',
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
// When the figure is where (rig.warp). Every segment used to ease in and out
// on its own, so the figure stopped dead at every keyframe: half way down
// every squat, and the swing's bell at the hip snap, its fastest moment. A
// keyframe the rep does not rest at (rig.stopsOf) is passed through at speed,
// in both views and in the copy the app ships.
// Speed is read off the hips, head, hands and feet: an elbow swinging through
// its IK branch (listed in WHIPS below) would otherwise set the top speed.
var SIDEJ=['hip','head','ankN','ankF','handN','handF'], FRONTJ=['hipC','head','footL','footR','handL','handR'],
    SIDEALL=SIDEJ.concat(['kneeN','kneeF','elbN','elbF']), FRONTALL=FRONTJ.concat(['kneeL','kneeR','elbL','elbR']);
function views(ex,ax){
  var o=[['side',function(u){ return rig.solve(rig.poseAt(ex,u)); },SIDEJ,SIDEALL],
         ['side (app)',function(u){ return app.solve(app.poseAt(ax,u)); },SIDEJ,SIDEALL]];
  if(ex.front) o.push(['front',function(u){ return rig.solveFront(rig.frontAt(ex,u)); },FRONTJ,FRONTALL],
                      ['front (app)',function(u){ return app.solveFront(app.frontAt(ax,u)); },FRONTJ,FRONTALL]);
  return o;
}
function speed(at,J,u,dt){ var a=at(u), b=at(u+dt), t=0;
  J.forEach(function(k){ var dx=b[k].x-a[k].x, dy=b[k].y-a[k].y; t+=dx*dx+dy*dy; }); return Math.sqrt(t)/Math.abs(dt); }
function keyAt(ex){ var t=rig.tempoOf(ex), tot=t.reduce(function(a,b){ return a+b; },0), acc=0;
  return t.map(function(x){ var u=acc/tot; acc+=x; return u; }); }
var DT=1e-4;
EX.forEach(function(ex){
  var ax=app.RIGFRAMES[ex.id], ku=keyAt(ex), n=ku.length, ease=ex.ease||[];
  views(ex,ax).forEach(function(v){
    var front=/front/.test(v[0]), stops=rig.stopsOf(ex,front), top=0;
    for(var i=0;i<400;i++) top=Math.max(top,speed(v[1],v[2],i/400,DT));
    ku.forEach(function(u,k){
      if(stops.indexOf(k)>=0 || ease[k] || ease[(k-1+n)%n]) return;
      var a=speed(v[1],v[2],u,-DT), b=speed(v[1],v[2],u,DT);
      ck(ex.id+' '+v[0],'passes through keyframe '+k+' at speed rather than stopping dead',
        Math.min(a,b)>=0.1*top,'speed '+r(Math.min(a,b))+' of a top speed of '+r(top));
      ck(ex.id+' '+v[0],'keeps its speed through keyframe '+k+' (no lurch)',
        Math.max(a,b)<=2*Math.min(a,b)+0.01*top,'speed '+r(a)+' in, '+r(b)+' out');
    });
  });
});
// Between two equal keyframes the figure holds still. Nothing interpolated
// across a hold may wander off it (a spline through the keyframes would).
EX.forEach(function(ex){
  var n=ex.frames.length, ku=keyAt(ex), ax=app.RIGFRAMES[ex.id];
  views(ex,ax).forEach(function(v){
    var fr=/front/.test(v[0])?ex.front:ex.frames;
    fr.forEach(function(f,k){ if(JSON.stringify(f)!==JSON.stringify(fr[(k+1)%n])) return;
      var u0=ku[k], u1=k+1<n?ku[k+1]:1, a=v[1](u0), worst=0;
      for(var q=1;q<20;q++){ var b=v[1](u0+(u1-u0)*q/20); v[3].forEach(function(j){ worst=Math.max(worst,d(a[j],b[j])); }); }
      ck(ex.id+' '+v[0],'holds still between equal keyframes '+k+' and '+((k+1)%n),worst<=0.1,'moved '+r(worst));
    });
  });
});
// No joint whips: none moves more than 6 units (9 px on a phone) in 1/144 of
// a rep. The rigs listed have an elbow that swings through its IK branch or a
// ballistic hand that already does, and print as warnings while they are
// re-authored; any other rig breaking it fails, and a listed one that has come
// back inside it says so.
var WHIPS={kb_snatch:'front',woodchopper:'front',sq_jump:'side',medballslam:'side',jumpingjack:'front',
  worldsgreatest:'side',bagspeed:'side',pulldown_straight:'front',burpee:'side'};
var whipWarn=[], whipDone=[];
EX.forEach(function(ex){
  var ax=app.RIGFRAMES[ex.id], known=(WHIPS[ex.id]||'').split(' ').filter(Boolean), N=1152, W=N/144;
  views(ex,ax).forEach(function(v){
    if(/app/.test(v[0])) return;
    var S=[], worst=0, where='';
    for(var i=0;i<N;i++) S.push(v[1](i/N));
    for(i=0;i<N;i++){ var a=S[i], b=S[(i+W)%N];
      v[3].forEach(function(k){ var dd=d(a[k],b[k]); if(dd>worst){ worst=dd; where=k+' at u='+(i/N).toFixed(3); } }); }
    var listed=known.indexOf(v[0])>=0;
    if(worst>6){ if(listed) whipWarn.push(ex.id+' '+v[0]+' '+r(worst)+' '+where);
      else ck(ex.id+' '+v[0],'no joint moves more than 6 units in 1/144 of a rep',false,r(worst)+' '+where); }
    else if(listed) whipDone.push(ex.id+' '+v[0]);
  });
});
// How often the app draws a frame. A frame every 50 ms is three screen
// refreshes; a rig whose hips, head, hands or feet would jump more than 6
// units (about 9 CSS px) between two such frames is drawn every 33 ms (two
// refreshes) instead. Measured here, not with rig.strobes, which picks it.
function jumpAt(ex,n){
  var worst=0, prev=null;
  for(var i=0;i<=n;i++){ var cur=[];
    if(ex.frames){ var s=rig.solve(rig.poseAt(ex,i/n)); SIDEJ.forEach(function(k){ cur.push(s[k]); }); }
    if(ex.front){ var f=rig.solveFront(rig.frontAt(ex,i/n)); FRONTJ.forEach(function(k){ cur.push(f[k]); }); }
    if(prev) cur.forEach(function(p,k){ worst=Math.max(worst,d(p,prev[k])); });
    prev=cur; }
  return worst;
}
EX.forEach(function(ex){
  var ax=app.RIGFRAMES[ex.id], cyc=ax.cycleMs, at50=Math.round(cyc/50), at33=Math.round(cyc*3/100);
  ck(ex.id,'is drawn a frame every 50 or 33 ms',ax.steps===at50||ax.steps===at33,ax.steps+' frames in '+cyc+' ms');
  var j=jumpAt(ex,at50);
  if(j>6) ck(ex.id,'jumps '+r(j)+' units a frame at 50 ms, so is drawn every 33 ms',ax.steps===at33,ax.steps+' frames in '+cyc+' ms');
});
// Every view comes to rest somewhere in a rep. One that never does turns the
// same way all round (the dislocate's arm windmilling through the hips).
EX.forEach(function(ex){
  ck(ex.id+' side','rests at some keyframe',rig.stopsOf(ex).length>0,JSON.stringify(rig.stopsOf(ex)));
  if(ex.front) ck(ex.id+' front','rests at some keyframe',rig.stopsOf(ex,true).length>0,JSON.stringify(rig.stopsOf(ex,true)));
});
// The core lifts rest at the top and the bottom only. The check above that a
// keyframe is passed at speed skips the stops, so a keyframe edit that made
// half way down a squat a stop again would pass it. A bench press seen from
// the feet moves only its elbows, and used to rest at every keyframe. The
// deadlift also rests once more, with the bar set down on the floor between
// reps (its fifth keyframe is its first), rather than bouncing it.
var FLOW={backsquat:'[0,2]',frontsquat:'[0,2]',goblet:'[0,2]',deadlift:'[0,2,4]',rdl:'[0,2]',
  pullup:'[0,2]',ohp:'[0,2]',kbswing:'[0,2]',sq_air:'[0,2]',bench:'[0,2]',dip:'[0,2]'};
Object.keys(FLOW).forEach(function(id){ var ex=EX.filter(function(e){ return e.id===id; })[0];
  ['side','front'].forEach(function(v){ var st=rig.stopsOf(ex,v==='front');
    ck(id+' '+v,'rests at the top and bottom only, passing through half way',JSON.stringify(st)===FLOW[id],JSON.stringify(st)+' not '+FLOW[id]); }); });
// Every rig's stops, as reviewed. A change in which keyframes the figure rests
// at changes how every rep of it looks, so it is a deliberate edit: look at the
// rigs named, then rewrite the table with --write-stops.
var STOPSFILE=require('path').join(__dirname,'stops.json'), now={};
EX.forEach(function(ex){ now[ex.id]=ex.front?[rig.stopsOf(ex),rig.stopsOf(ex,true)]:[rig.stopsOf(ex)]; });
if(process.argv.indexOf('--write-stops')>-1){
  require('fs').writeFileSync(STOPSFILE,'{\n'+EX.map(function(ex){ return JSON.stringify(ex.id)+':'+JSON.stringify(now[ex.id]); }).join(',\n')+'\n}\n');
  console.log('wrote '+STOPSFILE);
}
var was={}; try{ was=JSON.parse(require('fs').readFileSync(STOPSFILE,'utf8')); }catch(e){}
EX.forEach(function(ex){ ck(ex.id,'rests at the reviewed keyframes (pose/checks/stops.json; --write-stops to accept)',
  JSON.stringify(was[ex.id])===JSON.stringify(now[ex.id]),'was '+JSON.stringify(was[ex.id])+', now '+JSON.stringify(now[ex.id])); });
// The still (reduced motion, the end of a tapped rep) of a jump shows it
// loading or landing, not hanging in the air at the apex with the arms up:
// the feet are no higher there than at the keyframes either side.
['sq_jump','boxjump','broadjump'].forEach(function(id){
  var ex=EX.filter(function(e){ return e.id===id; })[0], n=ex.frames.length, k=app.RIGFRAMES[id].still;
  var y=ex.frames.map(function(f){ var s=rig.solve(f); return Math.max(s.ankN.y,s.ankF.y); });
  ck(id,'the still is not in the air',!(y[k]<y[(k+n-1)%n]&&y[k]<y[(k+1)%n]),'still keyframe '+k+', feet at y '+r(y[k])+' between '+r(y[(k+n-1)%n])+' and '+r(y[(k+1)%n]));
});
console.log('=== CONTINUOUS MOTION CHECK ('+SAMPLES+' samples/exercise) ===');
if(bendWarn.length) console.log('WARN: '+bendWarn.length+' joints bend outside -10..160 (listed in BENDS, being re-authored):\n  ! '+bendWarn.join('\n  ! '));
if(bendDone.length) console.log('NOTE: now inside -10..160, take off BENDS: '+bendDone.join(', '));
if(whipWarn.length) console.log('WARN: '+whipWarn.length+' views whip a joint (listed in WHIPS, being re-authored):\n  ! '+whipWarn.join('\n  ! '));
if(whipDone.length) console.log('NOTE: no longer whipping, take off WHIPS: '+whipDone.join(', '));
if(!fails.length) console.log('PASS: motion is valid at every point, not just the keyframes.');
else { console.log('FAILURES ('+fails.length+'):');
  var seen={}; fails.forEach(function(f){ var k=f.split('(sample')[0]; if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
process.exit(fails.length?1:0);
