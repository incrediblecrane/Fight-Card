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
  return new Function(src+';return {RIGFRAMES:RIGFRAMES,solve:rSolve,poseAt:rPoseAt,solveFront:rSolveFront,frontAt:rFrontAt};')();
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
console.log('=== CONTINUOUS MOTION CHECK ('+SAMPLES+' samples/exercise) ===');
if(!fails.length) console.log('PASS: motion is valid at every point, not just the keyframes.');
else { console.log('FAILURES ('+fails.length+'):');
  var seen={}; fails.forEach(function(f){ var k=f.split('(sample')[0]; if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
process.exit(fails.length?1:0);
