// Geometry probe: reports the margins a frame set has against the rig's hard
// limits, so a new exercise can be checked while it is being authored instead
// of by reading a wall of check failures afterwards.
// Usage: node pose/probe.js <id> [<id> ...]     (ids already in exercises.js)
var rig=require('./rig.js'), EX=require('./exercises.js');
var L=rig.L, G=rig.GROUND;
function r(n){ return Math.round(n*10)/10; }
function d(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
// Same tolerances the checks use, so the probe and the suite agree.
var LEG=L.THIGH+L.SHIN+0.5, ARM=L.UPPER+L.FORE+0.5;

process.argv.slice(2).forEach(function(id){
  var ex=EX.filter(function(e){return e.id===id;})[0];
  if(!ex){ console.log(id+': NOT FOUND'); return; }
  console.log('\n== '+id+' ('+ex.frames.length+' frames'+(ex.front?', front derived':', NO FRONT')+') ==');
  var worst={legN:0,legF:0,armN:0,armF:0,low:0};
  for(var i=0;i<160;i++){
    var s=rig.solve(rig.poseAt(ex,i/160));
    worst.legN=Math.max(worst.legN,d(s.hip,s.ankN));
    worst.legF=Math.max(worst.legF,d(s.hipF,s.ankF));
    worst.armN=Math.max(worst.armN,d(s.sh,s.handN));
    worst.armF=Math.max(worst.armF,d(s.shF,s.handF));
    worst.low=Math.max(worst.low,s.ankN.y,s.ankF.y,s.kneeN.y,s.kneeF.y,s.hip.y,s.handN.y,s.handF.y,s.head.y+L.HEAD_R);
  }
  function line(label,v,limit){
    var ok=v<=limit;
    console.log('   '+(ok?'ok  ':'OVER')+'  '+label.padEnd(22)+r(v)+' / '+limit+(ok?'':'   <-- FIX'));
  }
  line('near leg reach',worst.legN,LEG);
  line('far leg reach',worst.legF,LEG);
  line('near arm reach',worst.armN,ARM);
  line('far arm reach',worst.armF,ARM);
  // The checks allow a joint to rest ON the floor, hence +2.
  line('lowest point',worst.low,ex.frontPlan?9999:G+2);
  ex.frames.forEach(function(f,i){
    var s=rig.solve(f);
    console.log('   f'+i+'  hip('+f.hip+') torso '+f.torso+
      '  sh('+r(s.sh.x)+','+r(s.sh.y)+')  handN('+r(s.handN.x)+','+r(s.handN.y)+')'+
      '  kneeN('+r(s.kneeN.x)+','+r(s.kneeN.y)+')  head('+r(s.head.x)+','+r(s.head.y)+')');
  });
});
