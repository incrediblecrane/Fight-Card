var rig=require('../rig.js'), EX=require('../exercises.js');
var L=rig.L, GROUND=rig.GROUND;
function r(n){return Math.round(n*10)/10;}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
var SAMPLES=120, fails=[];
function ck(id,label,cond,detail){ if(!cond) fails.push(id+' :: '+label+'  ['+detail+']'); }

EX.forEach(function(ex){
  var worstStretch=0, floorBreak=0, footDrift=0, barXs=[], ankles=[];
  var planted = ['backsquat','frontsquat','goblet','deadlift','rdl','ohp','row','kbswing'].indexOf(ex.id)>=0;
  for(var i=0;i<SAMPLES;i++){
    var s=rig.solve(rig.poseAt(ex,i/SAMPLES));
    // limb integrity across the WHOLE motion, not just keyframes
    worstStretch=Math.max(worstStretch,
      Math.abs(d(s.hip,s.kneeN)-L.THIGH), Math.abs(d(s.kneeN,s.ankN)-L.SHIN),
      Math.abs(d(s.sh,s.elbN)-L.UPPER), Math.abs(d(s.elbN,s.handN)-L.FORE),
      Math.abs(d(s.hipF,s.kneeF)-L.THIGH), Math.abs(d(s.kneeF,s.ankF)-L.SHIN),
      Math.abs(d(s.shF,s.elbF)-L.UPPER), Math.abs(d(s.elbF,s.handF)-L.FORE));
    // reach: a limb asked to span more than its length would be silently stretched
    var legReach=d(s.hip,s.ankN), armReach=d(s.sh,s.handN);
    ck(ex.id,'leg never asked to over-extend (sample '+i+')', legReach<=L.THIGH+L.SHIN+0.5,'reach '+r(legReach));
    ck(ex.id,'arm never asked to over-extend (sample '+i+')', armReach<=L.UPPER+L.FORE+0.5,'reach '+r(armReach));
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
console.log('=== CONTINUOUS MOTION CHECK ('+SAMPLES+' samples/exercise) ===');
if(!fails.length) console.log('PASS: motion is valid at every point, not just the keyframes.');
else { console.log('FAILURES ('+fails.length+'):');
  var seen={}; fails.forEach(function(f){ var k=f.split('(sample')[0]; if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
process.exit(fails.length?1:0);
