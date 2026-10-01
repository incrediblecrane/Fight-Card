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
console.log('=== CONTINUOUS MOTION CHECK ('+SAMPLES+' samples/exercise) ===');
if(!fails.length) console.log('PASS: motion is valid at every point, not just the keyframes.');
else { console.log('FAILURES ('+fails.length+'):');
  var seen={}; fails.forEach(function(f){ var k=f.split('(sample')[0]; if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
process.exit(fails.length?1:0);
