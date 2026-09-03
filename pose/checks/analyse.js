var rig=require('../rig.js'), EX=require('../exercises.js');
var solve=rig.solve, GROUND=rig.GROUND;
function r(n){return Math.round(n*10)/10;}
var fails=[], warns=[];
function check(id,label,cond,detail){ (cond?null:fails.push(id+': '+label+'  ['+detail+']')); }
function soft(id,label,cond,detail){ (cond?null:warns.push(id+': '+label+'  ['+detail+']')); }

EX.forEach(function(ex){
  var S=ex.frames.map(solve);
  // Universal: nothing should sink through the floor.
  S.forEach(function(s,i){
    var lowest=Math.max(s.ankN.y,s.ankF.y,s.kneeN.y,s.hip.y,s.handN.y);
    check(ex.id,'frame'+i+' stays above ground', lowest<=GROUND+2, 'lowest='+r(lowest)+' ground='+GROUND);
  });
  // Universal: head must not be inside the torso (proportion sanity)
  S.forEach(function(s,i){
    var d=Math.hypot(s.head.x-s.sh.x,s.head.y-s.sh.y);
    check(ex.id,'frame'+i+' head clear of shoulder', d>10, 'dist='+r(d));
  });

  if(ex.id==='backsquat'||ex.id==='frontsquat'||ex.id==='goblet'){
    var top=S[0], bot=S[2];
    check(ex.id,'feet stay planted', top.ankN.y===bot.ankN.y && top.ankN.x===bot.ankN.x,'feet moved');
    check(ex.id,'hips travel back', bot.hip.x < top.hip.x, 'top='+r(top.hip.x)+' bot='+r(bot.hip.x));
    check(ex.id,'hips drop', bot.hip.y > top.hip.y+20, 'drop='+r(bot.hip.y-top.hip.y));
    check(ex.id,'knees travel forward past the ankle line', bot.kneeN.x > top.kneeN.x+8,
      'top knee x='+r(top.kneeN.x)+' bot='+r(bot.kneeN.x));
    check(ex.id,'bottom is at least parallel (hip near knee height)', bot.hip.y > bot.kneeN.y-12,
      'hip y='+r(bot.hip.y)+' knee y='+r(bot.kneeN.y));
    soft(ex.id,'knee stays roughly over the foot, not way past', bot.kneeN.x < bot.ankN.x+22,
      'knee='+r(bot.kneeN.x)+' ankle='+r(bot.ankN.x));
  }
  if(ex.id==='frontsquat'||ex.id==='goblet'){
    var bsBot=solve(EX.filter(function(e){return e.id==='backsquat';})[0].frames[2]);
    check(ex.id,'stays more upright than a back squat', ex.frames[2].torso < bsBot.torso,
      'this='+ex.frames[2].torso+' backsquat=35');
  }
  if(ex.id==='backsquat'){
    S.forEach(function(s,i){
      var d=Math.hypot(s.handN.x-s.sh.x,s.handN.y-s.sh.y);
      soft(ex.id,'frame'+i+' bar stays on the traps (hand near shoulder)', d<20,'dist='+r(d));
    });
  }
  if(ex.id==='deadlift'){
    var xs=S.map(function(s){return s.handN.x;});
    var spread=Math.max.apply(null,xs)-Math.min.apply(null,xs);
    check(ex.id,'bar travels a straight vertical line', spread<10,'bar x spread='+r(spread));
    var start=S[0];
    check(ex.id,'starts with the bar on the floor', start.handN.y>145,'bar y='+r(start.handN.y));
    check(ex.id,'hips start behind the bar', start.hip.x < start.handN.x-15,
      'hip='+r(start.hip.x)+' bar='+r(start.handN.x));
    check(ex.id,'shins near vertical at the start', Math.abs(start.kneeN.x-start.ankN.x)<10,
      'knee='+r(start.kneeN.x)+' ankle='+r(start.ankN.x));
    check(ex.id,'locks out at the hip', Math.abs(S[2].handN.y-S[2].hip.y)<15,
      'bar y='+r(S[2].handN.y)+' hip y='+r(S[2].hip.y));
  }
  if(ex.id==='rdl'){
    var dl=solve(EX.filter(function(e){return e.id==='deadlift';})[0].frames[0]);
    var bot=S[2];
    check(ex.id,'knees stay straighter than a conventional deadlift',
      Math.hypot(bot.hip.x-bot.ankN.x,bot.hip.y-bot.ankN.y) > Math.hypot(dl.hip.x-dl.ankN.x,dl.hip.y-dl.ankN.y),
      'rdl hip-ankle='+r(Math.hypot(bot.hip.x-bot.ankN.x,bot.hip.y-bot.ankN.y))+' dl='+r(Math.hypot(dl.hip.x-dl.ankN.x,dl.hip.y-dl.ankN.y)));
    check(ex.id,'stops above the floor (mid-shin)', bot.handN.y<155 && bot.handN.y>125,'bar y='+r(bot.handN.y));
    check(ex.id,'hips push back further than the deadlift start', bot.hip.x<=dl.hip.x+4,
      'rdl hip='+r(bot.hip.x)+' dl hip='+r(dl.hip.x));
  }
  if(ex.id==='bench'){
    S.forEach(function(s,i){
      check(ex.id,'frame'+i+' feet on the floor', s.ankN.y>=160,'ankle y='+r(s.ankN.y));
    });
    check(ex.id,'bar starts locked out above the chest', S[0].handN.y < S[0].sh.y-30,
      'bar='+r(S[0].handN.y)+' shoulder='+r(S[0].sh.y));
    check(ex.id,'bar comes down to chest level', S[2].handN.y > S[0].handN.y+18,
      'top='+r(S[0].handN.y)+' bottom='+r(S[2].handN.y));
    check(ex.id,'elbow drops below the torso line at the bottom', S[2].elbN.y > S[2].sh.y,
      'elbow='+r(S[2].elbN.y)+' torso='+r(S[2].sh.y));
    soft(ex.id,'bar drifts toward the shoulders at lockout (J-curve)', S[0].handN.x < S[2].handN.x,
      'lockout x='+r(S[0].handN.x)+' chest x='+r(S[2].handN.x));
  }
  if(ex.id==='ohp'){
    check(ex.id,'racks at collarbone height', Math.abs(S[0].handN.y-S[0].sh.y)<14,
      'hand='+r(S[0].handN.y)+' shoulder='+r(S[0].sh.y));
    check(ex.id,'locks out above the head', S[2].handN.y < S[2].head.y-12,
      'hand='+r(S[2].handN.y)+' head='+r(S[2].head.y));
    check(ex.id,'lockout stacks over the shoulder', Math.abs(S[2].handN.x-S[2].sh.x)<10,
      'hand x='+r(S[2].handN.x)+' shoulder x='+r(S[2].sh.x));
  }
  if(ex.id==='row'){
    check(ex.id,'torso stays still through the pull', S[0].sh.y===S[2].sh.y,'shoulder moved');
    check(ex.id,'arm hangs below the shoulder at the start', S[0].handN.y > S[0].sh.y+30,
      'hand='+r(S[0].handN.y)+' shoulder='+r(S[0].sh.y));
    check(ex.id,'pulls up to the abdomen, not past the shoulder', S[2].handN.y < S[0].handN.y-12 && S[2].handN.y > S[2].sh.y,
      'pulled hand='+r(S[2].handN.y)+' shoulder='+r(S[2].sh.y));
    check(ex.id,'elbow drives back behind the shoulder', S[2].elbN.x < S[2].sh.x,
      'elbow='+r(S[2].elbN.x)+' shoulder='+r(S[2].sh.x));
  }
  if(ex.id==='pullup'){
    var hx=S.map(function(s){return s.handN.x;}), hy=S.map(function(s){return s.handN.y;});
    check(ex.id,'hands never move off the bar',
      Math.max.apply(null,hx)-Math.min.apply(null,hx)<1 && Math.max.apply(null,hy)-Math.min.apply(null,hy)<1,'hands moved');
    check(ex.id,'body rises to the bar', S[2].hip.y < S[0].hip.y-15,
      'hang hip='+r(S[0].hip.y)+' top hip='+r(S[2].hip.y));
    check(ex.id,'chin clears the bar at the top', S[2].head.y < S[2].handN.y+14,
      'head='+r(S[2].head.y)+' bar='+r(S[2].handN.y));
    check(ex.id,'arms near straight at the hang',
      Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)>34,
      'reach='+r(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)));
    check(ex.id,'feet off the floor', S[0].ankN.y<GROUND,'ankle='+r(S[0].ankN.y));
  }
  if(ex.id==='kbswing'){
    var hike=S[0], top=S[2];
    check(ex.id,'bell hikes back behind the knee line', hike.handN.x < hike.kneeN.x,
      'bell='+r(hike.handN.x)+' knee='+r(hike.kneeN.x));
    check(ex.id,'bell is low at the bottom', hike.handN.y > hike.hip.y+15,'bell y='+r(hike.handN.y));
    check(ex.id,'it is a hinge not a squat (hips back, moderate knee bend)',
      hike.hip.x < 45 && Math.hypot(hike.hip.x-hike.ankN.x,hike.hip.y-hike.ankN.y)>42,
      'hip x='+r(hike.hip.x)+' hip-ankle='+r(Math.hypot(hike.hip.x-hike.ankN.x,hike.hip.y-hike.ankN.y)));
    check(ex.id,'finishes standing tall', Math.abs(top.hip.y-rig.STAND_HIP_Y)<4,'hip y='+r(top.hip.y));
    check(ex.id,'bell floats to chest height, not overhead', top.handN.y < top.hip.y-15 && top.handN.y > top.sh.y,
      'bell='+r(top.handN.y)+' shoulder='+r(top.sh.y)+' hip='+r(top.hip.y));
  }
  if(ex.id==='deadbug'){
    var ext=S[1];
    check(ex.id,'body stays flat on the floor', Math.abs(ext.hip.y-ext.sh.y)<6,
      'hip='+r(ext.hip.y)+' shoulder='+r(ext.sh.y));
    check(ex.id,'tabletop thigh is vertical', Math.abs(ext.kneeF.x-ext.hipF.x)<8,
      'knee x='+r(ext.kneeF.x)+' hip x='+r(ext.hipF.x));
    check(ex.id,'tabletop knee is above the hip', ext.kneeF.y < ext.hipF.y-18,
      'knee y='+r(ext.kneeF.y)+' hip y='+r(ext.hipF.y));
    check(ex.id,'extended leg is long and low', ext.ankN.x > ext.hip.x+45 && ext.ankN.y > ext.kneeF.y,
      'ankle='+r(ext.ankN.x)+','+r(ext.ankN.y));
    check(ex.id,'extended arm reaches back past the head', ext.handN.x < ext.head.x,
      'hand='+r(ext.handN.x)+' head='+r(ext.head.x));
    check(ex.id,'opposite pairs: extended arm and extended leg are on different sides',
      (ext.handN.x<ext.head.x) && (ext.ankN.x>ext.ankF.x),'not contralateral');
    var alt=S[3];
    check(ex.id,'alternates to the other diagonal', alt.handF.x < alt.head.x && alt.ankF.x > alt.ankN.x,
      'second diagonal not mirrored');
  }
  if(ex.id==='shrug'){
    var lo=S[0], hi=S[2];
    // Without the shrug degree of freedom the shoulder is a pure function of
    // hip and torso, both of which are identical in every frame here, so the
    // figure stands perfectly still. These three assertions are the whole
    // reason the DOF exists.
    check(ex.id,'shoulders actually rise', hi.sh.y < lo.sh.y-3,
      'top='+r(hi.sh.y)+' bottom='+r(lo.sh.y));
    check(ex.id,'the head does not ride up with them', Math.abs(hi.head.y-lo.head.y)<0.5,
      'top='+r(hi.head.y)+' bottom='+r(lo.head.y));
    check(ex.id,'the load rises with the shoulders, not by bending the elbow',
      hi.handN.y < lo.handN.y-3 && Math.abs((lo.handN.y-hi.handN.y)-(lo.sh.y-hi.sh.y))<0.5,
      'hand travel='+r(lo.handN.y-hi.handN.y)+' shoulder travel='+r(lo.sh.y-hi.sh.y));
    check(ex.id,'travel stays anatomical, not a caricature', (lo.sh.y-hi.sh.y)<10,
      'travel='+r(lo.sh.y-hi.sh.y));
    check(ex.id,'arms stay straight throughout', S.every(function(s){
      return Math.abs(Math.hypot(s.handN.x-s.sh.x,s.handN.y-s.sh.y)-(rig.L.UPPER+rig.L.FORE))<2; }),
      'an elbow bent');
    check(ex.id,'feet stay planted', S.every(function(s){ return s.ankN.y===lo.ankN.y; }),'feet moved');
  }
  if(ex.id==='jabcross'){
    var g=S[0], jab=S[1], cross=S[3];
    check(ex.id,'stance is staggered', Math.abs(g.ankN.x-g.ankF.x)>20,
      'lead='+r(g.ankN.x)+' rear='+r(g.ankF.x));
    check(ex.id,'guard hand sits at head height, not above it', g.handN.y > g.head.y && g.handN.y < g.head.y+22,
      'hand='+r(g.handN.y)+' head='+r(g.head.y));
    check(ex.id,'jab extends the lead hand well past the shoulder', jab.handN.x > jab.sh.x+30,
      'hand='+r(jab.handN.x)+' shoulder='+r(jab.sh.x));
    check(ex.id,'rear hand stays guarding during the jab', jab.handF.y > jab.head.y-2 && jab.handF.x < jab.handN.x-20,
      'rear hand='+r(jab.handF.x)+','+r(jab.handF.y));
    check(ex.id,'cross is thrown by the OTHER hand', cross.handF.x > cross.sh.x+25 && cross.handN.x < cross.handF.x-20,
      'rear='+r(cross.handF.x)+' lead='+r(cross.handN.x));
    check(ex.id,'punches land near shoulder height', Math.abs(jab.handN.y-jab.sh.y)<18,
      'hand='+r(jab.handN.y)+' shoulder='+r(jab.sh.y));
  }
});

console.log('=== ANALYSIS ===');
if(!fails.length) console.log('PASS: all '+EX.length+' exercises match their movement criteria.');
else { console.log('FAILURES ('+fails.length+'):'); fails.forEach(function(f){console.log('  x '+f);}); }
if(warns.length){ console.log('\nSoft warnings ('+warns.length+'):'); warns.forEach(function(w){console.log('  ! '+w);}); }
process.exit(fails.length?1:0);
