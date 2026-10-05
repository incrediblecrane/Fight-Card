var rig=require('../rig.js'), EX=require('../exercises.js');
var solve=rig.solve, GROUND=rig.GROUND, L=rig.L;
function r(n){return Math.round(n*10)/10;}
var fails=[], warns=[];
function check(id,label,cond,detail){ (cond?null:fails.push(id+': '+label+'  ['+detail+']')); }
function soft(id,label,cond,detail){ (cond?null:warns.push(id+': '+label+'  ['+detail+']')); }

// How straight the near arm stays across the WHOLE rep, as a fraction of its
// drawn length. A movement that leaves the sagittal plane is drawn short by
// armScaleN, so the ratio to measure is against that scaled length, not the
// full one: a fly holds ONE soft elbow bend, and a lateral raise never bends.
function straightThroughout(ex){
  var worst=1;
  for(var u=0;u<1;u+=0.01){
    var s=rig.solve(rig.poseAt(ex,u));
    var max=(L.UPPER+L.FORE)*(s.armScaleN===undefined?1:s.armScaleN);
    if(max>0.5) worst=Math.min(worst, Math.hypot(s.handN.x-s.sh.x,s.handN.y-s.sh.y)/max);
  }
  return worst;
}
EX.forEach(function(ex){
  var S=ex.frames.map(solve);
  // The keyframe the rep turns around at (see rig.turn), side and front.
  var T=rig.turn(ex), TF=rig.turn(ex,true);
  // Universal: nothing should sink through the floor.
  S.forEach(function(s,i){
    var lowest=Math.max(s.ankN.y,s.ankF.y,s.kneeN.y,s.hip.y,s.handN.y);
    check(ex.id,'frame'+i+' stays above ground', lowest<=GROUND+2, 'lowest='+r(lowest)+' ground='+GROUND);
  });
  /* Universal: the head must never be INSIDE a piece of equipment. A head
     resting against a bench overlaps its edge on purpose, which is why this
     asks about the centre rather than the whole circle: a centre inside the
     rectangle is a head passing through the machine, and that is a drawing of
     something that cannot happen. Checked across the whole motion, because a
     fold that clears at both ends can still swing through the middle. */
  if(ex.props && ex.props.length){
    var through=null;
    for(var pi=0;pi<=120 && through===null;pi++){
      var hs=solve(rig.poseAt(ex,pi/120));
      ex.props.forEach(function(pr){
        if(through!==null) return;
        var x0=pr[0], y0=pr[1], x1=pr[0]+pr[2], y1=pr[1]+pr[3];
        var hx=hs.head.x, hy=hs.head.y;
        // A prop can be drawn rotated about its own centre, so the head has to
        // be brought into the prop's frame before the box test. Testing the
        // unrotated box meant the one slanted bench in the set was not covered.
        if(pr[5]){
          var cx=(x0+x1)/2, cy=(y0+y1)/2, a=-pr[5]*Math.PI/180;
          var dx=hx-cx, dy=hy-cy;
          hx=cx+dx*Math.cos(a)-dy*Math.sin(a);
          hy=cy+dx*Math.sin(a)+dy*Math.cos(a);
        }
        if(hx>x0+1 && hx<x1-1 && hy>y0+1 && hy<y1-1)
          through='head ('+r(hs.head.x)+','+r(hs.head.y)+') inside prop ['+pr.slice(0,4).join(',')+
                  (pr[5]?(' rot '+pr[5]):'')+']';
      });
    }
    check(ex.id,'the head never passes through the equipment', through===null, through||'');
  }
  // Universal: head must not be inside the torso (proportion sanity)
  S.forEach(function(s,i){
    var d=Math.hypot(s.head.x-s.sh.x,s.head.y-s.sh.y);
    check(ex.id,'frame'+i+' head clear of shoulder', d>10, 'dist='+r(d));
  });

  if(ex.id==='backsquat'||ex.id==='frontsquat'||ex.id==='goblet'){
    var top=S[0], bot=S[T];
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
    var bsBot=solve((function(e){ return e.frames[rig.turn(e)]; })(EX.filter(function(e){return e.id==='backsquat';})[0]));
    check(ex.id,'stays more upright than a back squat', ex.frames[T].torso < bsBot.torso,
      'this='+ex.frames[T].torso+' backsquat=35');
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
    check(ex.id,'locks out at the hip', Math.abs(S[T].handN.y-S[T].hip.y)<15,
      'bar y='+r(S[T].handN.y)+' hip y='+r(S[T].hip.y));
  }
  if(ex.id==='rdl'){
    var dl=solve(EX.filter(function(e){return e.id==='deadlift';})[0].frames[0]);
    var bot=S[T];
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
    check(ex.id,'bar comes down to chest level', S[T].handN.y > S[0].handN.y+18,
      'top='+r(S[0].handN.y)+' bottom='+r(S[T].handN.y));
    check(ex.id,'elbow drops below the torso line at the bottom', S[T].elbN.y > S[T].sh.y,
      'elbow='+r(S[T].elbN.y)+' torso='+r(S[T].sh.y));
    soft(ex.id,'bar drifts toward the shoulders at lockout (J-curve)', S[0].handN.x < S[T].handN.x,
      'lockout x='+r(S[0].handN.x)+' chest x='+r(S[T].handN.x));
  }
  if(ex.id==='ohp'){
    check(ex.id,'racks at collarbone height', Math.abs(S[0].handN.y-S[0].sh.y)<14,
      'hand='+r(S[0].handN.y)+' shoulder='+r(S[0].sh.y));
    check(ex.id,'locks out above the head', S[T].handN.y < S[T].head.y-12,
      'hand='+r(S[T].handN.y)+' head='+r(S[T].head.y));
    check(ex.id,'lockout stacks over the shoulder', Math.abs(S[T].handN.x-S[T].sh.x)<10,
      'hand x='+r(S[T].handN.x)+' shoulder x='+r(S[T].sh.x));
  }
  if(ex.id==='row'){
    check(ex.id,'torso stays still through the pull', S[0].sh.y===S[T].sh.y,'shoulder moved');
    check(ex.id,'arm hangs below the shoulder at the start', S[0].handN.y > S[0].sh.y+30,
      'hand='+r(S[0].handN.y)+' shoulder='+r(S[0].sh.y));
    check(ex.id,'pulls up to the abdomen, not past the shoulder', S[T].handN.y < S[0].handN.y-12 && S[T].handN.y > S[T].sh.y,
      'pulled hand='+r(S[T].handN.y)+' shoulder='+r(S[T].sh.y));
    check(ex.id,'elbow drives back behind the shoulder', S[T].elbN.x < S[T].sh.x,
      'elbow='+r(S[T].elbN.x)+' shoulder='+r(S[T].sh.x));
  }
  if(ex.id==='pullup'){
    var hx=S.map(function(s){return s.handN.x;}), hy=S.map(function(s){return s.handN.y;});
    check(ex.id,'hands never move off the bar',
      Math.max.apply(null,hx)-Math.min.apply(null,hx)<1 && Math.max.apply(null,hy)-Math.min.apply(null,hy)<1,'hands moved');
    check(ex.id,'body rises to the bar', S[T].hip.y < S[0].hip.y-15,
      'hang hip='+r(S[0].hip.y)+' top hip='+r(S[T].hip.y));
    check(ex.id,'chin clears the bar at the top', S[T].head.y < S[T].handN.y+14,
      'head='+r(S[T].head.y)+' bar='+r(S[T].handN.y));
    check(ex.id,'arms near straight at the hang',
      Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)>34,
      'reach='+r(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)));
    check(ex.id,'feet off the floor', S[0].ankN.y<GROUND,'ankle='+r(S[0].ankN.y));
  }
  if(ex.id==='kbswing'){
    var hike=S[0], top=S[T];
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
    // Contralateral: the near leg reaches with the FAR arm. These checks used
    // to ask for the near arm, so they held the same-side reach in place.
    check(ex.id,'extended arm reaches back past the head', ext.handF.x < ext.head.x,
      'hand='+r(ext.handF.x)+' head='+r(ext.head.x));
    check(ex.id,'opposite pairs: extended arm and extended leg are on different sides',
      (ext.handF.x<ext.head.x) && (ext.ankN.x>ext.ankF.x) && ext.handN.x>ext.head.x,'not contralateral');
    var alt=S[3];
    check(ex.id,'alternates to the other diagonal', alt.handN.x < alt.head.x && alt.handF.x > alt.head.x && alt.ankF.x > alt.ankN.x,
      'second diagonal not mirrored');
  }
  /* ---- the 45 rigs added in one pass. Each of these is the claim its own
     description makes; passing the geometry checks only proves a figure can be
     drawn, not that it is doing the exercise. ---- */
  if(ex.id==='pistol'){
    check(ex.id,'the free leg never touches the floor', S.every(function(x){return x.ankF.y<GROUND-6;}),
      'lowest free foot '+r(Math.max.apply(null,S.map(function(x){return x.ankF.y;}))));
    check(ex.id,'the standing foot stays planted', S.every(function(x){return x.ankN.y===S[0].ankN.y && x.ankN.x===S[0].ankN.x;}),'standing foot moved');
    check(ex.id,'the hips drop a long way', S[T].hip.y>S[0].hip.y+25,'drop '+r(S[T].hip.y-S[0].hip.y));
    check(ex.id,'the free leg is straighter than the working one',
      Math.hypot(S[T].hipF.x-S[T].ankF.x,S[T].hipF.y-S[T].ankF.y) > Math.hypot(S[T].hip.x-S[T].ankN.x,S[T].hip.y-S[T].ankN.y),'free leg not extended');
  }
  if(ex.id==='lunge_walk'){
    // A lunge drops both knees with the feet apart, then the back leg swings
    // through to lead. It used to keep the near foot in front throughout,
    // kick the back foot up at the bottom and slide it back along the floor.
    var f=ex.frames;
    check(ex.id,'the legs swap: the back foot of one lunge leads the next',
      f[0].ankN[0]>f[0].ankF[0]+40 && f[T].ankF[0]>f[T].ankN[0]+40,
      'lunge 1 lead '+f[0].ankN[0]+' back '+f[0].ankF[0]+', lunge 2 lead '+f[T].ankF[0]+' back '+f[T].ankN[0]);
    check(ex.id,'the swinging foot lifts off the floor to get there',
      f[1].ankF[1]<GROUND-14 && f[3].ankN[1]<GROUND-14,'swing feet '+f[1].ankF[1]+', '+f[3].ankN[1]);
    check(ex.id,'the back knee drops toward the floor with both feet down',
      S[0].kneeF.y>GROUND-12 && S[T].kneeN.y>GROUND-12 && f[0].ankF[1]===f[0].ankN[1] && f[T].ankF[1]===f[T].ankN[1],
      'back knees '+r(S[0].kneeF.y)+', '+r(S[T].kneeN.y));
  }
  if(ex.id==='glutebridge'){
    check(ex.id,'the shoulders stay on the floor, which is what makes it a bridge not a hip thrust',
      S.every(function(x){return x.sh.y>GROUND-22;}),'highest shoulder '+r(Math.min.apply(null,S.map(function(x){return x.sh.y;}))));
    // Capped by geometry, not taste: the torso pivots about an anchored
    // shoulder and the head hangs past that pivot, so more travel than this
    // buries the head. It is also about the range a real bridge covers.
    check(ex.id,'the hips actually lift', S[0].hip.y-S[T].hip.y>6,'lift '+r(S[0].hip.y-S[T].hip.y));
    check(ex.id,'the feet stay planted', S.every(function(x){return x.ankN.y===GROUND-7;}),'a foot left the floor');
  }
  if(ex.id==='row_single'){
    check(ex.id,'the torso is horizontal over a bench, not upright', ex.frames[0].torso>70,'torso '+ex.frames[0].torso);
    check(ex.id,'the working hand travels up toward the hip', S[0].handN.y-S[T].handN.y>16,
      'travel '+r(S[0].handN.y-S[T].handN.y));
    check(ex.id,'the supporting hand does not move', S.every(function(x){return x.handF.y===S[0].handF.y;}),'support hand moved');
    check(ex.id,'the torso does not rotate up to help', S.every(function(x){return x.sh.y===S[0].sh.y;}),'the torso moved');
    // The arm hangs straight under the shoulder, then the elbow drives up
    // past the back with the forearm hanging under it, the hand coming to
    // the hip. It used to bend backwards all rep and finish at the armpit.
    check(ex.id,'the working arm starts hanging straight under the shoulder',
      Math.abs(S[0].handN.x-S[0].sh.x)<3 && angAt(S[0].sh,S[0].elbN,S[0].handN)>=165,'hand x '+r(S[0].handN.x)+' shoulder x '+r(S[0].sh.x)+' elbow '+r(angAt(S[0].sh,S[0].elbN,S[0].handN)));
    check(ex.id,'it rows to the hip: the hand ends between hip and shoulder under a raised elbow',
      S[T].handN.x>S[T].hip.x && S[T].handN.x<S[T].sh.x-8 && S[T].elbN.y<S[T].handN.y-10,'hand '+r(S[T].handN.x)+','+r(S[T].handN.y)+' elbow '+r(S[T].elbN.x)+','+r(S[T].elbN.y));
    var bench=ex.props[0];
    check(ex.id,'the far knee and hand rest on the bench',
      S.every(function(x){ return x.kneeF.y>=bench[1]-7 && x.kneeF.y<=bench[1] && x.handF.y>=bench[1]-4 && x.handF.y<=bench[1]; }),
      'knee y '+r(S[0].kneeF.y)+' hand y '+r(S[0].handF.y)+' bench top '+bench[1]);
  }
  if(ex.id==='chinup'||ex.id==='hangingkneeraise'){
    check(ex.id,'the bar is fixed in space', S.every(function(x){return x.handN.x===S[0].handN.x && x.handN.y===S[0].handN.y;}),'the bar moved');
    check(ex.id,'the arms are near straight at the hang',
      Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)>36,'hang reach '+r(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)));
    check(ex.id,'the feet are off the floor', S.every(function(x){return x.ankN.y<GROUND-4;}),'a foot reached the floor');
  }
  if(ex.id==='chinup'){
    check(ex.id,'the body rises to the bar', S[0].hip.y-S[T].hip.y>18,'rise '+r(S[0].hip.y-S[T].hip.y));
    // The head used to rise into the bar and the chin never cleared it.
    var bar=ex.barAt, chin=S[T].head.y+L.HEAD_R*0.75, clear=1e9;
    for(var q=0;q<=96;q++){ var sq=solve(rig.poseAt(ex,q/96)); clear=Math.min(clear,Math.hypot(sq.head.x-bar[0],sq.head.y-bar[1])-L.HEAD_R); }
    check(ex.id,'the chin clears the bar at the top',chin<bar[1],'chin '+r(chin)+' bar '+bar[1]);
    check(ex.id,'the head passes beside the bar, never through it',clear>=2,'closest '+r(clear));
    check(ex.id,'the arms hang straight at the bottom',angAt(S[0].sh,S[0].elbN,S[0].handN)>=165,'elbow '+r(angAt(S[0].sh,S[0].elbN,S[0].handN)));
    check(ex.id,'the grip is narrower than a pull-up',
      ex.front && ex.front[0].handR[0]-ex.front[0].handL[0] < 42,'grip width '+r(ex.front[0].handR[0]-ex.front[0].handL[0]));
  }
  if(ex.id==='hangingkneeraise'){
    check(ex.id,'the knees travel up toward the chest', S[0].ankN.y-S[T].ankN.y>28,'travel '+r(S[0].ankN.y-S[T].ankN.y));
    check(ex.id,'the torso barely moves, so it is not a swing', Math.abs(S[T].hip.y-S[0].hip.y)<4,
      'hip moved '+r(Math.abs(S[T].hip.y-S[0].hip.y)));
  }
  if(ex.id==='invertedrow'){
    check(ex.id,'the bar is fixed in space', S.every(function(x){return x.handN.y===S[0].handN.y;}),'the bar moved');
    check(ex.id,'the heels stay on the floor', S.every(function(x){return x.ankN.y<=GROUND;}),'a heel sank');
    check(ex.id,'the chest travels up to the bar', S[0].sh.y-S[T].sh.y>8,'rise '+r(S[0].sh.y-S[T].sh.y));
    // Face up, heels down, one straight line from heel to head pivoting
    // about the heels. It used to check that the hip stayed a fixed height
    // below the shoulder, which passed a face-down body folded at the hips
    // with the knees bent under it and would fail a correct pivot.
    check(ex.id,'the body stays one straight line, heel to shoulder, knees straight',
      S.every(function(x){ return angAt(x.ankN,x.hip,x.sh)>168 && angAt(x.hip,x.kneeN,x.ankN)>165; }),
      S.map(function(x){ return r(angAt(x.ankN,x.hip,x.sh))+'/'+r(angAt(x.hip,x.kneeN,x.ankN)); }).join(' '));
    check(ex.id,'it lies face up under the bar, head past the hips from the heels',
      S.every(function(x){ return x.head.x<x.hip.x && x.hip.x<x.ankN.x && x.head.y<x.hip.y; }),'head '+r(S[0].head.x)+' hip '+r(S[0].hip.x)+' heel '+r(S[0].ankN.x));
    check(ex.id,'the heels stay put: the body pivots on them',
      ex.frames.every(function(f){ return f.ankN[0]===ex.frames[0].ankN[0] && f.ankN[1]===ex.frames[0].ankN[1]; }),'a heel moved');
  }
  // The top of a clean or a snatch is its highest hand: the rack or the
  // lockout, wherever the rig's stops put its turnaround.
  var TOP=S.reduce(function(b,x,i){ return x.handN.y<S[b].handN.y?i:b; },0);
  if(ex.id==='kb_clean'||ex.id==='kb_snatch'){
    check(ex.id,'it starts from a hinge with the bell behind the knees',
      ex.frames[0].torso>60 && S[0].handN.x<S[0].kneeN.x,'torso '+ex.frames[0].torso+' hand '+r(S[0].handN.x)+' knee '+r(S[0].kneeN.x));
    check(ex.id,'it finishes standing tall', ex.frames[TOP].torso<10,'finish torso '+ex.frames[TOP].torso);
    check(ex.id,'the feet stay planted throughout', S.every(function(x){return x.ankN.y===GROUND-7;}),'a foot moved');
  }
  if(ex.id==='kb_snatch'){
    var cl=EX.filter(function(e){return e.id==='kb_clean';})[0];
    var clTop=cl.frames.map(solve).reduce(function(b,x){ return x.handN.y<b.handN.y?x:b; });
    check(ex.id,'it finishes overhead, higher than a clean racks',
      S[TOP].handN.y < clTop.handN.y-30,'snatch '+r(S[TOP].handN.y)+' clean '+r(clTop.handN.y));
    check(ex.id,'the lockout arm is straight',
      Math.hypot(S[TOP].handN.x-S[TOP].sh.x,S[TOP].handN.y-S[TOP].sh.y)>37,'reach '+r(Math.hypot(S[TOP].handN.x-S[TOP].sh.x,S[TOP].handN.y-S[TOP].sh.y)));
    check(ex.id,'the lockout is held a moment, not swung through',
      ex.frames.some(function(f,i){ return i>0 && JSON.stringify(f)===JSON.stringify(ex.frames[i-1]) && solve(f).handN.y===S[TOP].handN.y; }),'no repeated lockout keyframe');
  }
  if(ex.id==='kb_clean'){
    // The rack: the fist in front of the chest at about collarbone height,
    // the elbow down by the ribs. It used to park the fist behind the
    // shoulder with the elbow out behind the back at shoulder height.
    var rk=S[TOP];
    check(ex.id,'the rack is in front of the chest at collarbone height, not overhead',rk.handN.y>rk.sh.y && rk.handN.y<rk.sh.y+16 && rk.handN.x>rk.sh.x+5,
      'fist '+r(rk.handN.x)+','+r(rk.handN.y)+' shoulder '+r(rk.sh.x)+','+r(rk.sh.y));
    check(ex.id,'the racked elbow is down by the ribs, not winged out behind',rk.elbN.y>rk.sh.y+12 && rk.elbN.x>rk.sh.x-6,
      'elbow '+r(rk.elbN.x)+','+r(rk.elbN.y)+' shoulder '+r(rk.sh.x)+','+r(rk.sh.y));
    check(ex.id,'the rack is held a moment',ex.frames.some(function(f,i){ return i>0 && JSON.stringify(f)===JSON.stringify(ex.frames[i-1]) && solve(f).handN.y===rk.handN.y; }),'no repeated rack keyframe');
  }
  if(ex.id==='kb_press'){
    check(ex.id,'only one arm presses; the other hangs still',
      S.every(function(x){return Math.abs(x.handF.y-S[0].handF.y)<1;}),'the free arm moved');
    check(ex.id,'the press goes from the rack to a straight arm overhead',
      S[T].handN.y<S[0].handN.y-40 && Math.hypot(S[T].handN.x-S[T].sh.x,S[T].handN.y-S[T].sh.y)>34,
      'rack '+r(S[0].handN.y)+' top '+r(S[T].handN.y));
    check(ex.id,'the torso stays upright rather than leaning away from the load',
      S.every(function(x){return Math.abs(x.sh.x-x.hip.x)<4;}),'the torso leaned');
    check(ex.id,'it racks with the fist in front of the chest and the elbow down by the ribs',
      S[0].handN.x>S[0].sh.x+5 && S[0].elbN.y>S[0].sh.y+12,'fist '+r(S[0].handN.x)+' elbow y '+r(S[0].elbN.y)+' shoulder '+r(S[0].sh.x)+','+r(S[0].sh.y));
    check(ex.id,'it locks out straight overhead',angAt(S[T].sh,S[T].elbN,S[T].handN)>=170,'elbow '+r(angAt(S[T].sh,S[T].elbN,S[T].handN)));
    var near=1e9; for(var q=0;q<=96;q++){ var sq=solve(rig.poseAt(ex,q/96)); near=Math.min(near,Math.hypot(sq.handN.x-sq.head.x,sq.handN.y-sq.head.y)); }
    check(ex.id,'the fist goes past the face, never through the head',near>=L.HEAD_R+5,'closest '+r(near));
    var tp=rig.tempoOf(ex), upT=0, dnT=0; tp.forEach(function(t,i){ if(i<T) upT+=t; else dnT+=t; });
    check(ex.id,'it lowers no faster than it presses',dnT>=upT,'press '+upT+' ms, lower '+dnT+' ms');
  }
  if(ex.id==='suitcasecarry'||ex.id==='kb_bottomsup'||ex.id==='briskwalkjog'){
    var strides={};
    S.forEach(function(x){ strides[r(x.ankN.x)+','+r(x.ankN.y)]=1; });
    check(ex.id,'it walks: the feet take more than one position', Object.keys(strides).length>2,
      'foot positions '+Object.keys(strides).length);
    check(ex.id,'it stays upright while walking', ex.frames.every(function(f){return f.torso<10;}),'it leaned over');
  }
  if(ex.id==='kb_bottomsup'){
    check(ex.id,'the bell is racked at shoulder height, not hanging at the side',
      S.every(function(x){return x.handN.y<x.sh.y+22;}),'hand '+r(S[0].handN.y)+' shoulder '+r(S[0].sh.y));
    // Bottoms up the forearm stands straight under the bell, the fist just
    // above the shoulder and in front of it. It used to be the clean's
    // chicken-winged rack, the elbow out behind the back.
    check(ex.id,'the forearm stands vertical under the bell, the fist in front of the shoulder',
      S.every(function(x){ return Math.abs(x.handN.x-x.elbN.x)<4 && x.handN.y<x.elbN.y && x.handN.x>x.sh.x+5; }),
      'fist '+r(S[0].handN.x)+','+r(S[0].handN.y)+' elbow '+r(S[0].elbN.x)+','+r(S[0].elbN.y));
  }
  if(ex.id==='suitcasecarry'){
    check(ex.id,'only one arm is loaded, so the two hands hang differently',
      Math.abs(S[0].handN.y-S[0].handF.y)>2,'hands level, both look loaded');
  }
  if(ex.id==='platepinch'){
    check(ex.id,'it is a hold: almost nothing moves',
      Math.max.apply(null,S.map(function(x){return Math.abs(x.handN.y-S[0].handN.y);}))<4,'the hands travelled');
    check(ex.id,'the plates hang at the sides, below the hips',
      S.every(function(x){return x.handN.y>x.hip.y;}),'a hand was above the hip');
  }
  if(ex.id==='sideplank'||ex.id==='hollowhold'){
    check(ex.id,'it is a hold, so nothing travels more than a breath',
      Math.max.apply(null,S.map(function(x){return Math.abs(x.hip.y-S[0].hip.y);}))<4,'the hips travelled');
  }
  if(ex.id==='sideplank'){
    // One straight line from ankle to shoulder, the elbow under the
    // shoulder. It used to ask for the hips 25 above the floor, which only a
    // pike could give: the hips were the highest point, the knees bent
    // backwards to get there.
    check(ex.id,'the body is one straight line from ankle to shoulder', S.every(function(x){
      var dx=x.sh.x-x.ankN.x, dy=x.sh.y-x.ankN.y; return Math.abs((x.hip.x-x.ankN.x)*dy-(x.hip.y-x.ankN.y)*dx)/Math.hypot(dx,dy)<3; }),'hip off the line');
    check(ex.id,'the hips are lifted clear of the floor', S.every(function(x){return x.hip.y<GROUND-12;}),
      'hip '+r(S[0].hip.y)+' ground '+GROUND);
    check(ex.id,'the elbow is planted under the shoulder', S.every(function(x){return Math.abs(x.elbN.x-x.sh.x)<3 && x.elbN.y>GROUND-8;}),
      'elbow '+r(S[0].elbN.x)+','+r(S[0].elbN.y)+' shoulder x '+r(S[0].sh.x));
    // Seen from above, someone lying on their side is a profile the front
    // solver cannot draw (its torso is always square to the camera): it drew
    // a seated butterfly stretch.
    check(ex.id,'it has no second panel rather than a wrong one',!ex.front,'a second panel was added back');
    check(ex.id,'one forearm is planted on the floor', S.every(function(x){return x.handN.y>GROUND-22;}),'the supporting hand floated');
  }
  if(ex.id==='hollowhold'){
    check(ex.id,'the shoulders are lifted off the floor', S.every(function(x){return x.sh.y<GROUND-12;}),
      'shoulder '+r(S[0].sh.y));
    check(ex.id,'the legs hover rather than resting down', S.every(function(x){return x.ankN.y<GROUND-20;}),
      'foot '+r(S[0].ankN.y));
    check(ex.id,'the hips stay down, which is what pins the lower back', S.every(function(x){return x.hip.y>GROUND-16;}),
      'hip '+r(S[0].hip.y));
  }
  if(ex.id==='bearcrawl'){
    check(ex.id,'the knees hover, they never touch down', S.every(function(x){return x.kneeN.y<GROUND-4 && x.kneeF.y<GROUND-4;}),
      'lowest knee '+r(Math.max.apply(null,S.map(function(x){return Math.max(x.kneeN.y,x.kneeF.y);}))));
    check(ex.id,'opposite hand and foot travel together',
      (S[1].ankN.x!==S[0].ankN.x) && (S[1].handF.x!==S[0].handF.x),'the limbs did not pair up');
    check(ex.id,'the hips stay low and level', S.every(function(x){return Math.abs(x.hip.y-S[0].hip.y)<3;}),'the hips rocked');
  }
  if(ex.id==='woodchopper'){
    check(ex.id,'the hands travel a long diagonal, high on one side to the opposite hip',
      S[T].handN.y-S[0].handN.y>40 && S[0].handN.x-S[T].handN.x>20,
      'dy '+r(S[T].handN.y-S[0].handN.y)+' dx '+r(S[0].handN.x-S[T].handN.x));
    check(ex.id,'the torso rotates with them rather than staying square',
      Math.abs(ex.frames[T].torso-ex.frames[0].torso)>15,'torso '+ex.frames[0].torso+' -> '+ex.frames[T].torso);
  }
  if(ex.id==='russiantwist'){
    check(ex.id,'it is seated and leaned back', ex.frames[0].torso>30 && S[0].hip.y>GROUND-22,
      'torso '+ex.frames[0].torso+' hip '+r(S[0].hip.y));
    check(ex.id,'the weight tracks side to side', Math.abs(S[1].handN.x-S[3].handN.x)>10,
      'travel '+r(Math.abs(S[1].handN.x-S[3].handN.x)));
    check(ex.id,'the hips stay still while it rotates', S.every(function(x){return x.hip.x===S[0].hip.x && x.hip.y===S[0].hip.y;}),'the hips moved');
    check(ex.id,'the feet stay up off the floor', S.every(function(x){return x.ankN.y<GROUND-16;}),'a foot went down');
  }
  if(ex.id==='palloffpress'){
    check(ex.id,'the hands press straight out from the sternum', S[T].handN.x-S[0].handN.x>20,
      'travel '+r(S[T].handN.x-S[0].handN.x));
    check(ex.id,'nothing rotates, which is the entire exercise',
      ex.frames.every(function(f){return f.torso===ex.frames[0].torso;}),'the torso turned');
    check(ex.id,'the hands stay near chest height', S.every(function(x){return Math.abs(x.handN.y-x.sh.y)<20;}),'the hands drifted off the chest line');
  }
  if(ex.id==='kb_tgu'){
    check(ex.id,'it starts lying down and finishes up off the floor', S[0].hip.y-S[T].hip.y>12,
      'hip '+r(S[0].hip.y)+' -> '+r(S[T].hip.y));
    check(ex.id,'the loaded arm never bends: it stays near full extension throughout',
      S.every(function(x){return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y)>32;}),
      'shortest loaded reach '+r(Math.min.apply(null,S.map(function(x){return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y);}))));
    check(ex.id,'the loaded hand stays above the shoulder the whole way up',
      S.every(function(x){return x.handN.y<x.sh.y;}),'the bell dropped below the shoulder');
  }
  if(ex.id==='sq_jump'||ex.id==='boxjump'||ex.id==='broadjump'){
    check(ex.id,'the feet actually leave the floor', S.some(function(x){return x.ankN.y<GROUND-14;}),
      'highest foot '+r(Math.min.apply(null,S.map(function(x){return x.ankN.y;}))));
    check(ex.id,'it loads the hips before jumping', S[0].hip.y>S[1].hip.y+14,
      'load '+r(S[0].hip.y)+' flight '+r(S[1].hip.y));
    check(ex.id,'it lands with the knees bent to absorb', S[3].hip.y>S[1].hip.y+8,
      'flight '+r(S[1].hip.y)+' landing '+r(S[3].hip.y));
  }
  if(ex.id==='boxjump'){
    var box=ex.props&&ex.props[0];
    check(ex.id,'it lands ON the box, not beside it',
      !!box && S[T].ankN.x>box[0] && S[T].ankN.x<box[0]+box[2] && Math.abs(S[T].ankN.y-box[1])<4,
      'foot '+r(S[T].ankN.x)+','+r(S[T].ankN.y)+' box '+JSON.stringify(box));
    check(ex.id,'it ends higher than it started', S[T].ankN.y<S[0].ankN.y-14,
      'start '+r(S[0].ankN.y)+' finish '+r(S[T].ankN.y));
  }
  if(ex.id==='broadjump'){
    check(ex.id,'it travels forward across the frame, which is what makes it broad',
      S[3].ankN.x-S[0].ankN.x>40,'travel '+r(S[3].ankN.x-S[0].ankN.x));
    check(ex.id,'it sticks a two-footed landing on the floor',
      Math.abs(S[3].ankN.y-GROUND)<9 && Math.abs(S[3].ankF.y-GROUND)<9,
      'feet '+r(S[3].ankN.y)+','+r(S[3].ankF.y));
  }
  if(ex.id==='medballthrow'){
    check(ex.id,'the ball travels across the body', S[T].handN.x-S[0].handN.x>35,
      'travel '+r(S[T].handN.x-S[0].handN.x));
    check(ex.id,'the torso rotates through it', ex.frames[T].torso-ex.frames[0].torso>20 ||
      (ex.frames[T].torso+360)-ex.frames[0].torso>20,'torso '+ex.frames[0].torso+' -> '+ex.frames[T].torso);
    check(ex.id,'the back heel pivots off the floor', ex.frames[T].ankF[1]<ex.frames[0].ankF[1]-4,
      'rear heel '+ex.frames[0].ankF[1]+' -> '+ex.frames[T].ankF[1]);
  }
  if(ex.id==='medballslam'){
    check(ex.id,'it starts fully extended overhead', S[0].handN.y<S[0].sh.y-30,
      'hand '+r(S[0].handN.y)+' shoulder '+r(S[0].sh.y));
    check(ex.id,'the ball ends near the floor', S[T].handN.y>GROUND-36,'hand '+r(S[T].handN.y));
    check(ex.id,'the torso folds over the slam rather than staying upright', ex.frames[T].torso>40,
      'torso '+ex.frames[T].torso);
  }
  if(ex.id==='facepull'){
    // The front view is the exercise: elbows flaring wide while the hands come
    // to the ears is the only thing separating a face pull from a row. It was
    // derived from the side, which foreshortened the arms to nothing and drew
    // a front view that barely moved across the whole rep.
    var FP=ex.front||[];
    check(ex.id,'the front view is authored, not projected from the side',
      FP.length>2 && FP[0].armScaleL!==undefined,
      FP.length?'no armScale, so it is a side projection':'no front view');
    check(ex.id,'the hands separate as they come to the ears',
      FP.length>2 && (FP[TF].handR[0]-FP[TF].handL[0])>(FP[0].handR[0]-FP[0].handL[0])+14,
      FP.length>2?('spread '+(FP[0].handR[0]-FP[0].handL[0])+' -> '+(FP[TF].handR[0]-FP[TF].handL[0])):'no front view');
    check(ex.id,'and they finish higher than they started',
      FP.length>2 && FP[TF].handL[1]<FP[0].handL[1]-12,
      FP.length>2?('hand y '+FP[0].handL[1]+' -> '+FP[TF].handL[1]):'no front view');
    check(ex.id,'the arms are near end-on at the start and square at the finish',
      FP.length>2 && FP[0].armScaleL<0.6 && FP[TF].armScaleL>0.9,
      FP.length>2?('armScale '+FP[0].armScaleL+' -> '+FP[TF].armScaleL):'no front view');
    // And the side view still has to keep the elbows above the wrists.
    check(ex.id,'the hands finish beside the head, not at the chest',
      S[T].handN.y<S[T].sh.y+4,'hand '+r(S[T].handN.y)+' shoulder '+r(S[T].sh.y));
  }
  if(ex.id==='raise_front'){
    check(ex.id,'it starts at the thigh and finishes at shoulder height',
      S[0].handN.y>S[0].hip.y-6 && Math.abs(S[T].handN.y-S[T].sh.y)<12,
      'hand '+r(S[0].handN.y)+' -> '+r(S[T].handN.y)+', shoulder '+r(S[T].sh.y));
    check(ex.id,'the hand travels forward, not up the body like a curl',
      S[T].handN.x-S[0].handN.x>22,'travel '+r(S[T].handN.x-S[0].handN.x));
    // No front view on purpose: the movement is purely sagittal, so from the
    // front the arms project to nothing and the hands land on the shoulders.
    check(ex.id,'it ships without a front view rather than a misleading one',
      !ex.front, ex.front?'a front view was added back':'side view only');
    check(ex.id,'the arm stays long: a bent one is a curl',
      Math.min.apply(null,S.map(function(x){return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y);}))>30,
      'shortest reach '+r(Math.min.apply(null,S.map(function(x){return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y);}))));
  }
  if(ex.id==='raise_lateral'){
    // A frontal-plane movement seen from the side is end-on, so the side view
    // SHOULD collapse. Drawing a big sagittal arc there would be a lie.
    check(ex.id,'the side view stays put rather than swinging forward',
      Math.abs(S[T].handN.x-S[0].handN.x)<14,'side travel '+r(S[T].handN.x-S[0].handN.x));
    // Abduction is entirely left-to-right, so the side view is a straight arm
    // pointing down that SHORTENS as it rises. Without armScaleN the solver
    // could only reach a nearer hand by folding the elbow, and the result was
    // a bent arm holding a bell at chest height: a curl.
    check(ex.id,'the side arm shortens rather than bending',
      ex.frames[0].armScaleN===1 && ex.frames[T].armScaleN<0.35,
      'armScaleN '+ex.frames[0].armScaleN+' -> '+ex.frames[T].armScaleN);
    check(ex.id,'and it stays straight the whole way, so it is never a curl',
      straightThroughout(ex)>0.8,'most bent the elbow gets: '+r(straightThroughout(ex)*100)+'% extended');
    check(ex.id,'the hand rises up the body without swinging out in front',
      S[T].handN.y<S[0].handN.y-24 && Math.abs(S[T].handN.x-S[0].handN.x)<6,
      'hand '+r(S[0].handN.x)+','+r(S[0].handN.y)+' -> '+r(S[T].handN.x)+','+r(S[T].handN.y));
    var LR=ex.front||[];
    check(ex.id,'the front view is where it happens: the hands go out and up',
      LR.length>2 && (LR[TF].handR[0]-LR[TF].handL[0])>(LR[0].handR[0]-LR[0].handL[0])+40
        && LR[TF].handL[1]<LR[0].handL[1]-20,
      LR.length>2?('spread '+(LR[0].handR[0]-LR[0].handL[0])+' -> '+(LR[TF].handR[0]-LR[TF].handL[0])):'no front view');
  }
  if(ex.id==='pulldown_straight'){
    check(ex.id,'the hands travel from overhead to the thighs',
      S[0].handN.y<S[0].sh.y-14 && S[T].handN.y>S[T].hip.y-4,
      'hand '+r(S[0].handN.y)+' -> '+r(S[T].handN.y)+', shoulder '+r(S[0].sh.y)+', hip '+r(S[T].hip.y));
    // The one cue this exercise has. A bending elbow is a triceps pushdown.
    var reach=S.map(function(x){ return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y); });
    check(ex.id,'the arms stay straight the whole way',
      Math.max.apply(null,reach)-Math.min.apply(null,reach)<8,
      'reach ranges '+r(Math.min.apply(null,reach))+' to '+r(Math.max.apply(null,reach)));
    // Without a front anchor the front view drew a person standing empty
    // handed, which is not a pulldown at all.
    check(ex.id,'the front view has the pulley overhead, so a cable is drawn',
      !!ex.anchorFront && ex.anchorFront[1]<40 && ex.anchorFront[3]<40,
      ex.anchorFront?('anchor y '+ex.anchorFront[1]+' and '+ex.anchorFront[3]):'no front anchor');
    var PD=ex.front||[];
    check(ex.id,'the front view does not bend the elbows either',
      PD.length>2 && PD[0].armScaleL!==undefined,
      PD.length?'front view is a side projection, which bends them to reach a fixed grip':'no front view');
  }
  // All three flys share one cue: a soft bend at the elbow that does NOT
  // change. The side view is a projection of a sweep that mostly happens out
  // of the sagittal plane, so without armScaleN the solver expressed all of
  // that foreshortening as elbow bend, and the drawn arm went from nearly
  // straight to badly folded and back inside one rep.
  if(ex.id==='fly_cable'||ex.id==='fly_cable_high'||ex.id==='fly_cable_rev'){
    check(ex.id,'the side view foreshortens the sweep instead of folding the elbow',
      ex.frames.every(function(f){ return f.armScaleN!==undefined && f.armScaleN<1.001; }) &&
      Math.min.apply(null,ex.frames.map(function(f){return f.armScaleN;}))<0.9,
      'armScaleN '+ex.frames.map(function(f){return f.armScaleN;}).join(', '));
    check(ex.id,'and the soft elbow bend stays roughly the same throughout',
      straightThroughout(ex)>0.6,'most bent the elbow gets: '+r(straightThroughout(ex)*100)+'% extended');
  }
  /* The bench has to be a bench the figure is actually on. It used to be a pad
     at thirty-four degrees under a torso at fifty-five, so the two crossed: the
     back lay against a floating plate, the hips hung past the end of it in mid
     air, and the single upright stood under the head end. */
  if(ex.id==='press_incline'){
    function angleMod180(deg){ var a=deg%180; return a<0?a+180:a; }
    var t=ex.frames[0].torso;
    var bodyAngle=angleMod180(Math.atan2(-Math.cos(t*Math.PI/180), Math.sin(t*Math.PI/180))*180/Math.PI);
    var pad=(ex.props||[])[0]||[];
    var padAngle=angleMod180(pad[5]||0);
    check(ex.id,'the back pad runs along the torso rather than across it',
      Math.abs(bodyAngle-padAngle)<6,'body '+r(bodyAngle)+'deg, pad '+r(padAngle)+'deg');
    // The seat is whatever prop the hip sits over. Without one the figure is
    // sitting on air, which is what it was doing.
    var hip=ex.frames[0].hip;
    var seat=(ex.props||[]).filter(function(p){
      return !p[5] && hip[0]>=p[0]-2 && hip[0]<=p[0]+p[2]+2 && p[1]>hip[1] && p[1]-hip[1]<16;
    })[0];
    check(ex.id,'there is a seat under the hips, not just a back pad',
      !!seat, seat?('seat top at '+seat[1]+' under a hip at '+hip[1]):'nothing under the hip');
    check(ex.id,'and something under it reaches the floor',
      (ex.props||[]).some(function(p){ return !p[5] && p[1]+p[3]>=GROUND-4 && p[0]>hip[0]-14; }),
      'lowest prop bottom '+r(Math.max.apply(null,(ex.props||[]).map(function(p){return p[1]+p[3];}))));
  }
  if(ex.id==='fly_cable_rev'){
    // It is the mirror of the chest flys, so the two things worth proving are
    // that the hands travel BACKWARD and that they finish wide, not together.
    check(ex.id,'the hands start out in front of the shoulder', S[0].handN.x>S[0].sh.x+24,
      'hand '+r(S[0].handN.x)+' shoulder '+r(S[0].sh.x));
    check(ex.id,'they travel backward, the opposite way to a chest fly',
      S[T].handN.x<S[0].handN.x-30,'travel '+r(S[0].handN.x-S[T].handN.x));
    check(ex.id,'they finish behind the shoulder', S[T].handN.x<S[T].sh.x,
      'hand '+r(S[T].handN.x)+' shoulder '+r(S[T].sh.x));
    check(ex.id,'the elbow angle barely changes: it is a fly, not a row',
      Math.abs(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)
              -Math.hypot(S[T].handN.x-S[T].sh.x,S[T].handN.y-S[T].sh.y))<16,
      'reach '+r(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y))+
      ' -> '+r(Math.hypot(S[T].handN.x-S[T].sh.x,S[T].handN.y-S[T].sh.y)));
    var F=ex.front||[];
    check(ex.id,'the hands cross in front at the start', F.length>2 && F[0].handL[0]>F[0].handR[0],
      F.length?('L '+F[0].handL[0]+' R '+F[0].handR[0]):'no front view');
    check(ex.id,'and finish wide apart', F.length>2 && (F[TF].handR[0]-F[TF].handL[0])>60,
      F.length>2?('spread '+(F[TF].handR[0]-F[TF].handL[0])):'front view has '+F.length+' frames');
    // Each hand holds the other side's handle, which is what makes them cross.
    check(ex.id,'the cords are anchored on the opposite sides',
      !!ex.anchorFront && ex.anchorFront[0]>ex.anchorFront[2],
      'anchors '+(ex.anchorFront||[]).join(','));
  }
  if(ex.id==='skierg'){
    check(ex.id,'it starts tall with the handles above the head',
      S[0].handN.y<S[0].head.y-6 && S[0].sh.y<S[0].hip.y-28,
      'hand '+r(S[0].handN.y)+' head '+r(S[0].head.y)+' shoulder '+r(S[0].sh.y));
    check(ex.id,'the trunk hinges through the pull rather than staying upright',
      ex.frames[T].torso-ex.frames[0].torso>30,
      'torso '+ex.frames[0].torso+' -> '+ex.frames[T].torso);
    check(ex.id,'the hands finish below the hips', S[T].handN.y>S[T].hip.y+6,
      'hand '+r(S[T].handN.y)+' hip '+r(S[T].hip.y));
    check(ex.id,'the hands travel a long way down', S[T].handN.y-S[0].handN.y>70,
      'travel '+r(S[T].handN.y-S[0].handN.y));
    check(ex.id,'the feet stay planted', ex.frames.every(function(f){
      return f.ankN[0]===ex.frames[0].ankN[0] && f.ankN[1]===ex.frames[0].ankN[1]; }),'a foot moved');
  }
  if(ex.id==='situpwallthrow'){
    // The two halves that make it this exercise and not a crunch: the trunk
    // actually leaves the floor, and the ball actually leaves the chest.
    check(ex.id,'it starts flat on the floor', S[0].sh.y>GROUND-20 && S[0].head.y>GROUND-20,
      'shoulder '+r(S[0].sh.y)+' head '+r(S[0].head.y));
    check(ex.id,'the trunk comes all the way up', S[T].sh.y<S[0].sh.y-24,
      'shoulder '+r(S[0].sh.y)+' -> '+r(S[T].sh.y));
    check(ex.id,'the feet never leave the floor', ex.frames.every(function(f){
      return f.ankN[1]>=GROUND-8 && f.ankF[1]>=GROUND-8; }),
      'ankles '+ex.frames.map(function(f){return f.ankN[1];}).join(','));
    check(ex.id,'the hips stay down: it is a sit-up, not a bridge', ex.frames.every(function(f){
      return f.hip[1]>=GROUND-16; }),'hips '+ex.frames.map(function(f){return f.hip[1];}).join(','));
    check(ex.id,'the ball leaves the chest toward the wall', S[T].handN.x-S[0].handN.x>50,
      'travel '+r(S[T].handN.x-S[0].handN.x));
    check(ex.id,'the throwing arm reaches out rather than staying folded',
      Math.hypot(S[T].handN.x-S[T].sh.x,S[T].handN.y-S[T].sh.y)>L.UPPER+L.FORE-6,
      'reach '+r(Math.hypot(S[T].handN.x-S[T].sh.x,S[T].handN.y-S[T].sh.y))+' of '+(L.UPPER+L.FORE));
    // The wall it is thrown at has to be somewhere the ball actually goes.
    var wall=(ex.props||[])[0];
    check(ex.id,'there is a wall in front of the release', !!wall && wall[0]>S[T].handN.x,
      wall?('wall x '+wall[0]+' hand x '+r(S[T].handN.x)):'no wall prop');
    check(ex.id,'the wall stands on the floor rather than floating',
      !!wall && wall[1]+wall[3]>=GROUND, wall?('wall bottom '+(wall[1]+wall[3])):'no wall prop');
  }
  if(ex.id==='sprint'||ex.id==='highknees'){
    check(ex.id,'the legs alternate', (S[0].ankN.y<S[0].ankF.y)!==(S[T].ankN.y<S[T].ankF.y),'the legs did not swap');
    check(ex.id,'a knee comes up high', Math.min(S[0].kneeN.y,S[T].kneeN.y)<S[0].hip.y+22,
      'highest knee '+r(Math.min(S[0].kneeN.y,S[T].kneeN.y))+' hip '+r(S[0].hip.y));
    check(ex.id,'opposite arm and leg drive together', (S[0].handN.y<S[0].handF.y)!==(S[T].handN.y<S[T].handF.y),
      'the arms did not alternate with the legs');
  }
  if(ex.id==='skipping'){
    check(ex.id,'the hops are small, an inch or two clear',
      S[0].ankN.y-S[1].ankN.y>1 && S[0].ankN.y-S[1].ankN.y<10,'hop height '+r(S[0].ankN.y-S[1].ankN.y));
    check(ex.id,'the elbows stay in near the ribs', S.every(function(x){return Math.abs(x.elbN.x-x.hip.x)<18;}),
      'furthest elbow '+r(Math.max.apply(null,S.map(function(x){return Math.abs(x.elbN.x-x.hip.x);}))));
  }
  if(ex.id==='jumpingjack'){
    check(ex.id,'the arms sweep from the sides to overhead',
      S[0].handN.y-S[T].handN.y>40,'travel '+r(S[0].handN.y-S[T].handN.y));
    check(ex.id,'the legs open and close', (S[T].ankN.x-S[T].ankF.x)-(S[0].ankN.x-S[0].ankF.x)>20,
      'stance '+r(S[0].ankN.x-S[0].ankF.x)+' -> '+r(S[T].ankN.x-S[T].ankF.x));
    check(ex.id,'arms and legs move together, not in sequence',
      (S[1].handN.y<S[0].handN.y)===((S[1].ankN.x-S[1].ankF.x)>(S[0].ankN.x-S[0].ankF.x)),'they were out of phase');
  }
  if(ex.id==='hipflexor'||ex.id==='couchstretch'){
    check(ex.id,'it is half-kneeling: one knee down, one foot planted in front',
      S.every(function(x){return x.kneeF.y>GROUND-16 && x.ankN.y>GROUND-8;}),
      'rear knee '+r(S[0].kneeF.y)+' front foot '+r(S[0].ankN.y));
    check(ex.id,'the hips travel forward into the stretch', S[T].hip.x>S[0].hip.x+2,
      'hip x '+r(S[0].hip.x)+' -> '+r(S[T].hip.x));
    check(ex.id,'the torso stays tall rather than folding forward',
      ex.frames.every(function(f){return f.torso<20;}),'the torso folded');
  }
  if(ex.id==='couchstretch'){
    var wall=ex.props&&ex.props[0];
    check(ex.id,'the rear shin is up against the wall, which is the whole difference',
      !!wall && ex.frames[0].ankF[1]<GROUND-30 && Math.abs(ex.frames[0].ankF[0]-(wall[0]+wall[2]))<10,
      'rear foot '+JSON.stringify(ex.frames[0].ankF)+' wall '+JSON.stringify(wall));
  }
  if(ex.id==='ankle_mob'){
    var w=ex.props&&ex.props[0];
    check(ex.id,'the knee travels forward toward the wall and gets close to it',
      !!w && (w[0]-S[T].kneeN.x)<8 && S[T].kneeN.x>S[0].kneeN.x+3,
      'knee '+r(S[0].kneeN.x)+' -> '+r(S[T].kneeN.x)+' wall at '+(w&&w[0]));
    check(ex.id,'the heel never lifts, which is the point of the test',
      S.every(function(x){return x.ankN.y===GROUND-7;}),'the heel came up');
  }
  if(ex.id==='catcow'){
    check(ex.id,'the hands stay planted under the shoulders',
      S.every(function(x){return x.handN.x===S[0].handN.x && x.handN.y===S[0].handN.y;}),'a hand moved');
    check(ex.id,'the shoulders stay put; it is the pelvis that rocks',
      S.every(function(x){return Math.abs(x.sh.y-S[0].sh.y)<3;}),
      'shoulder moved '+r(Math.max.apply(null,S.map(function(x){return Math.abs(x.sh.y-S[0].sh.y);}))));
    check(ex.id,'the pelvis actually tilts through a range', Math.abs(S[T].hip.y-S[0].hip.y)>10,
      'pelvis travel '+r(Math.abs(S[T].hip.y-S[0].hip.y)));
  }
  if(ex.id==='childspose'){
    check(ex.id,'it sits back onto the heels with the arms stretched long forward',
      S[0].handN.x>S[0].hip.x+50,'hand '+r(S[0].handN.x)+' hip '+r(S[0].hip.x));
    check(ex.id,'the head is down near the floor', S[0].head.y>GROUND-40,'head '+r(S[0].head.y));
    // It used to kneel up with the knees bent backwards (-147) behind the hips.
    S.forEach(function(x,i){ check(ex.id,'frame '+i+' rests the knees and forehead on the floor',
      x.kneeN.y>GROUND-8 && x.head.y+L.HEAD_R>GROUND-6,'knee '+r(x.kneeN.y)+' head '+r(x.head.y)); });
  }
  if(ex.id==='worldsgreatest'){
    check(ex.id,'the inside hand stays planted by the front foot',
      S.every(function(x){return x.handN.x===S[0].handN.x && x.handN.y===S[0].handN.y;}),'the planted hand moved');
    check(ex.id,'the free arm reaches to the ceiling', S[0].handF.y-S[T].handF.y>50,
      'reach travel '+r(S[0].handF.y-S[T].handF.y));
    check(ex.id,'it is a deep lunge underneath', S[0].ankN.x-S[0].ankF.x>50,'stride '+r(S[0].ankN.x-S[0].ankF.x));
  }
  if(ex.id==='hamstring'){
    check(ex.id,'the front leg is straight',
      S.every(function(x){return Math.hypot(x.hip.x-x.ankN.x,x.hip.y-x.ankN.y)>L.THIGH+L.SHIN-12;}),
      'shortest hip-ankle '+r(Math.min.apply(null,S.map(function(x){return Math.hypot(x.hip.x-x.ankN.x,x.hip.y-x.ankN.y);}))));
    check(ex.id,'it hinges further over as it goes', ex.frames[T].torso>ex.frames[0].torso+8,
      'torso '+ex.frames[0].torso+' -> '+ex.frames[T].torso);
  }
  if(ex.id==='shoulderdisloc'){
    check(ex.id,'the stick travels from in front of the thighs to behind the head',
      S[0].handN.y>S[0].hip.y-10 && S[T].handN.y<S[T].head.y,
      'start '+r(S[0].handN.y)+' hip '+r(S[0].hip.y)+' top '+r(S[T].handN.y)+' head '+r(S[T].head.y));
    check(ex.id,'the arms stay locked straight the whole way',
      S.every(function(x){return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y)>L.UPPER+L.FORE-2;}),
      'shortest reach '+r(Math.min.apply(null,S.map(function(x){return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y);}))));
    check(ex.id,'it goes past vertical and behind, not just up to overhead',
      S[3].handN.x<S[3].sh.x,'end hand '+r(S[3].handN.x)+' shoulder '+r(S[3].sh.x));
  }
  if(ex.id==='pigeon'){
    check(ex.id,'the front shin is folded across, not straight out',
      Math.hypot(S[0].hip.x-S[0].ankN.x,S[0].hip.y-S[0].ankN.y)<L.THIGH+L.SHIN-18,
      'hip-ankle '+r(Math.hypot(S[0].hip.x-S[0].ankN.x,S[0].hip.y-S[0].ankN.y)));
    check(ex.id,'the rear leg is long behind',
      Math.hypot(S[0].hipF.x-S[0].ankF.x,S[0].hipF.y-S[0].ankF.y)>44,
      'rear leg '+r(Math.hypot(S[0].hipF.x-S[0].ankF.x,S[0].hipF.y-S[0].ankF.y)));
    check(ex.id,'it folds forward over the front leg', ex.frames[T].torso>ex.frames[0].torso+10,
      'torso '+ex.frames[0].torso+' -> '+ex.frames[T].torso);
    // Its knees bent backwards, the front one 115 the wrong way.
    S.forEach(function(x,i){ check(ex.id,'frame '+i+' has the front knee forward on the floor and the rear leg long behind',
      x.ankF.x<x.hip.x-40 && x.kneeN.x>x.hip.x+20 && x.kneeN.y>GROUND-8 && x.kneeF.y<GROUND-3,
      'front knee '+r(x.kneeN.x-x.hip.x)+' ahead at y '+r(x.kneeN.y)+', rear foot '+r(x.hip.x-x.ankF.x)+' behind'); });
  }
  if(ex.id==='nine0'){
    check(ex.id,'it is seated on the floor', S.every(function(x){return x.hip.y>GROUND-26;}),'hip '+r(S[0].hip.y));
    check(ex.id,'both knees are folded, neither leg is straight',
      S.every(function(x){return Math.hypot(x.hip.x-x.ankN.x,x.hip.y-x.ankN.y)<L.THIGH+L.SHIN-8 &&
                                  Math.hypot(x.hipF.x-x.ankF.x,x.hipF.y-x.ankF.y)<L.THIGH+L.SHIN-8;}),'a leg was straight');
    check(ex.id,'the front view carries the rotation the side view cannot',
      !!ex.front && Math.abs(ex.front[0].footL[0]-ex.front[TF].footL[0])>4,
      'front feet did not travel');
  }
  if(ex.id==='thoracic'){
    check(ex.id,'the hips stay square while the top arm opens',
      S.every(function(x){return x.hip.x===S[0].hip.x && x.hip.y===S[0].hip.y;}),'the hips turned');
    check(ex.id,'the top hand opens upward through a real range', S[0].handF.y-S[T].handF.y>25,
      'travel '+r(S[0].handF.y-S[T].handF.y));
    check(ex.id,'the supporting hand stays planted',
      S.every(function(x){return x.handN.y===S[0].handN.y;}),'the support hand moved');
  }
  if(ex.id==='shadowbox'||ex.id==='bagspeed'){
    check(ex.id,'the stance is staggered', Math.abs(S[0].ankN.x-S[0].ankF.x)>20,
      'lead '+r(S[0].ankN.x)+' rear '+r(S[0].ankF.x));
    var guardN=S.map(function(x){return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y);});
    check(ex.id,'a shot reaches near full extension', Math.max.apply(null,guardN)>28 ||
      Math.max.apply(null,S.map(function(x){return Math.hypot(x.handF.x-x.shF.x,x.handF.y-x.shF.y);}))>28,
      'longest reach '+r(Math.max.apply(null,guardN)));
    check(ex.id,'the hands come back to a guard by the head',
      S.some(function(x){return x.handN.y<x.head.y+18 && Math.abs(x.handN.x-x.head.x)<20;}),'no guard position found');
  }
  if(ex.id==='bagspeed'){
    var bag=ex.props&&ex.props[0];
    check(ex.id,'the punches actually reach the bag',
      !!bag && Math.max.apply(null,S.map(function(x){return Math.max(x.handN.x,x.handF.x);}))>bag[0]-8,
      'furthest fist '+r(Math.max.apply(null,S.map(function(x){return Math.max(x.handN.x,x.handF.x);})))+' bag at '+(bag&&bag[0]));
  }
  if(ex.id==='battleropes'){
    check(ex.id,'it holds a braced quarter-squat', ex.frames.every(function(f){return f.torso>15 && f.torso<45;}),
      'torso '+ex.frames[0].torso);
    check(ex.id,'the hips stay put while the arms work',
      S.every(function(x){return x.hip.y===S[0].hip.y;}),'the hips moved');
    check(ex.id,'the arms alternate up and down', (S[0].handN.y<S[0].handF.y)!==(S[T].handN.y<S[T].handF.y),
      'the waves did not alternate');
  }
  if(ex.id==='rowerg'){
    check(ex.id,'the feet stay on the footplate', S.every(function(x){return x.ankN.y===S[0].ankN.y;}),'a foot moved');
    check(ex.id,'the seat travels: the hips move back down the rail', S[T].hip.x-S[0].hip.x>16,
      'hip '+r(S[0].hip.x)+' -> '+r(S[T].hip.x));
    check(ex.id,'legs drive before the arms pull: at mid-drive the handle has barely moved',
      Math.abs(S[1].handN.x-S[0].handN.x)<12 && S[1].hip.x>S[0].hip.x+6,
      'handle moved '+r(Math.abs(S[1].handN.x-S[0].handN.x))+' while the seat moved '+r(S[1].hip.x-S[0].hip.x));
    check(ex.id,'the finish pulls the handle in to the body', S[T].handN.x<S[1].handN.x-16,
      'mid '+r(S[1].handN.x)+' finish '+r(S[T].handN.x));
  }
  if(ex.id==='fly_cable'||ex.id==='fly_cable_high'){
    check(ex.id,'the hands sweep together across the body', ex.front &&
      (ex.front[0].handR[0]-ex.front[0].handL[0]) - (ex.front[TF].handR[0]-ex.front[TF].handL[0]) > 50,
      'gap '+(ex.front?r(ex.front[0].handR[0]-ex.front[0].handL[0]):'?')+' -> '+(ex.front?r(ex.front[TF].handR[0]-ex.front[TF].handL[0]):'?'));
    // NOT "the projected reach stays constant": the hand travels an arc centred
    // on the shoulder, so as the arm rotates toward the camera it legitimately
    // projects shorter. What is always wrong is the arm collapsing to a stub,
    // which is what a path cutting across the shoulder produces.
    check(ex.id,'the arm never collapses to nothing mid-sweep',
      (function(){
        for(var i=0;i<80;i++){
          var x=solve(rig.poseAt(ex,i/80));
          if(Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y)<14) return false;
        }
        return true;
      })(),'shortest drawn arm '+r(Math.min.apply(null,(function(){var o=[];for(var i=0;i<80;i++){
        var x=solve(rig.poseAt(ex,i/80)); o.push(Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y));} return o;})())));
    check(ex.id,'the hands meet, they do not cross over each other',
      ex.front.every(function(f){ return f.handL[0]<=f.handR[0]; }),'the hands crossed the midline');
    check(ex.id,'the body does not move: it is the arms that travel',
      S.every(function(x){ return x.hip.x===S[0].hip.x && x.hip.y===S[0].hip.y && Math.abs(x.sh.y-S[0].sh.y)<1; }),
      'the torso moved with the arms');
    check(ex.id,'the feet stay planted', S.every(function(x){return x.ankN.y===GROUND-7;}),'a foot moved');
  }
  if(ex.id==='fly_cable_high'){
    var mid=EX.filter(function(e){return e.id==='fly_cable';})[0];
    check(ex.id,'it starts higher than the mid-height fly',
      ex.front[0].handL[1] < mid.front[0].handL[1]-20,
      'high starts at '+ex.front[0].handL[1]+', mid at '+mid.front[0].handL[1]);
    check(ex.id,'and finishes lower, so the arc runs downward',
      ex.front[TF].handL[1] > ex.front[0].handL[1]+40,
      'start '+ex.front[0].handL[1]+' finish '+ex.front[TF].handL[1]);
    check(ex.id,'its pulleys are set above the mid fly\'s',
      ex.anchorAt[1] < mid.anchorAt[1]-20,'high anchor '+ex.anchorAt[1]+' mid '+mid.anchorAt[1]);
  }
  if(ex.id==='fly_cable'){
    check(ex.id,'the hands meet around chest height, not at the hips',
      Math.abs(ex.front[TF].handL[1]-(107-34))<22,'hands finish at y '+ex.front[TF].handL[1]);
  }
  if(ex.id==='shrug'){
    var lo=S[0], hi=S[T];
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
    // The guard is at the chin (about 8 under the head's centre); it sat at
    // the chest, 10 low.
    check(ex.id,'guard fists at the chin, not the chest', g.handN.y < g.head.y+16 && g.handF.y < g.head.y+16,
      'fists '+r(g.handN.y)+', '+r(g.handF.y)+' head '+r(g.head.y));
    // A punch snaps back at least as fast as it went out, and the combo
    // resets in guard before the next one.
    var tp=ex.tempo;
    check(ex.id,'each punch comes back no slower than it went out, then rests in guard',
      tp.length===5 && tp[1]<=tp[0] && tp[3]<=tp[2] && tp[4]>=tp[0]+tp[1]+tp[2]+tp[3]-200,'tempo '+tp.join(','));
  }
  // Face down on straight arms or forearms: one line from heel to shoulder,
  // the knees and hips straight. These planks used to bend the knees backwards
  // (57 to 133 degrees), pike the hips and prop the elbows in front of the
  // shoulders with the forearm running back.
  var PRONE={pushup:[0,1,2,3], plank:[0,1,2,3], mtnclimb:[0,2], burpee:[2,3]};
  if(PRONE[ex.id]) PRONE[ex.id].forEach(function(i){ var s=S[i];
    var knee=angAt(s.hip,s.kneeN,s.ankN), kneeF=angAt(s.hipF,s.kneeF,s.ankF), hip=angAt(s.sh,s.hip,s.kneeN);
    check(ex.id,'frame '+i+' holds one straight line, knees and hips at 165 or more',
      knee>=165 && kneeF>=165 && hip>=165,'knees '+r(knee)+', '+r(kneeF)+' hip '+r(hip));
  });
  if(ex.id==='pushup'){
    check(ex.id,'the top locks the arms out over the hands', angAt(S[0].sh,S[0].elbN,S[0].handN)>=155 && Math.abs(S[0].handN.x-S[0].sh.x)<4,
      'elbow '+r(angAt(S[0].sh,S[0].elbN,S[0].handN))+' hand '+r(S[0].handN.x-S[0].sh.x)+' ahead of the shoulder');
    check(ex.id,'at the bottom the elbows are back beside the ribs, behind the shoulder', S[T].elbN.x < S[T].sh.x,
      'elbow x '+r(S[T].elbN.x)+' shoulder x '+r(S[T].sh.x));
  }
  if(ex.id==='plank') S.forEach(function(s,i){
    check(ex.id,'frame '+i+' rests on the forearm: elbow under the shoulder, forearm flat',
      Math.abs(s.elbN.x-s.sh.x)<3 && Math.abs(s.handN.y-s.elbN.y)<2,'elbow '+r(s.elbN.x-s.sh.x)+' from the shoulder, forearm drop '+r(s.handN.y-s.elbN.y));
  });
  if(ex.id==='mtnclimb') [[1,'N'],[3,'F']].forEach(function(q){ var s=S[q[0]];
    check(ex.id,'frame '+q[0]+' drives the knee forward under the chest, off the floor',
      s['knee'+q[1]].x > s.hip.x+15 && s['ank'+q[1]].y < GROUND-14,'knee '+r(s['knee'+q[1]].x-s.hip.x)+' ahead of the hip');
  });
  // The reverse curl starts from straight arms (it stopped at 157, a partial
  // rep) and the upper arm stays by the side (hand targets drifted it 7 to 11).
  if(ex.id==='curl_reverse'){
    check(ex.id,'starts from straight arms', angAt(S[0].sh,S[0].elbN,S[0].handN)>=170,'elbow '+r(angAt(S[0].sh,S[0].elbN,S[0].handN)));
    var ua=S.map(function(s){ return Math.atan2(s.elbN.x-s.sh.x,s.elbN.y-s.sh.y)*180/Math.PI; });
    check(ex.id,'the upper arm stays pinned to the side', Math.max.apply(null,ua)-Math.min.apply(null,ua)<=10,
      'upper arm swings '+r(Math.max.apply(null,ua)-Math.min.apply(null,ua))+' degrees');
  }
});

/* No two exercises may draw the same thing. This guards against a new entry
   that is really an old rig with a new label, which is the cheapest way for the
   library to start lying about what you are doing.
   The signature is the joints AND the implement, because sharing joint paths is
   sometimes right: a hammer curl and a supinated curl are the same movement of
   the same bones and differ only in how the dumbbell is held, which the rig
   says with `equip` and `axis` rather than with different frames. */
(function noTwins(){
  var seen={};
  EX.forEach(function(ex){
    var sig=JSON.stringify([ex.frames, ex.equip||null, ex.axis||null,
                            ex.anchorAt||null, ex.props||null]);
    if(seen[sig]) fails.push(ex.id+': draws exactly the same movement with the same kit as '+seen[sig]);
    else seen[sig]=ex.id;
  });
})();

/* The three flys specifically: two close the arms in front and one opens them
   behind, so the reverse one has to travel the OTHER way. Three labels on one
   arc would be worse than not having it. */
(function flysDiffer(){
  function get(id){ return EX.filter(function(e){return e.id===id;})[0]; }
  function span(id){
    var ex=get(id); if(!ex) return null;
    var S=ex.frames.map(solve);
    return S[rig.turn(ex)].handN.x-S[0].handN.x;
  }
  var chest=span('fly_cable'), high=span('fly_cable_high'), rev=span('fly_cable_rev');
  if(chest===null||high===null||rev===null) return;
  check('fly_cable_rev','it travels the opposite way to the chest flys',
    rev<0 && chest>0, 'reverse '+r(rev)+', cable fly '+r(chest));
  // The high fly comes DOWN across the body; the mid fly stays level. That
  // vertical travel is the whole reason for having both, so it is what
  // separates them, not where they happen to finish.
  function drop(id){ var ex=get(id), f=ex.frames; return f[rig.turn(ex)].handN[1]-f[0].handN[1]; }
  check('fly_cable_high','the high fly comes down across the body',drop('fly_cable_high')>35,
    'it drops '+r(drop('fly_cable_high')));
  check('fly_cable','the mid fly stays roughly level, so the two are not one arc',
    Math.abs(drop('fly_cable'))<15, 'it drops '+r(drop('fly_cable')));
})();

/* Standing tall. A standing frame used to put the hip at y 107, 5 behind the
   ankle, which leaves the knee at 150 degrees: every "standing" frame of the
   strength lifts was a quarter squat, and the strict press read as a push
   press. Standing is the hip over the ankle (within 3) at STAND_HIP_Y, the
   knee at 160 to 172 degrees: soft, never 180, where the leg's IK is singular
   and the knee shoots forward as the descent starts. The rigs listed here
   have been re-authored and fail outside it; any other frame that looks like
   standing (feet down, torso upright) and is not prints as a warning until its
   batch is re-authored. A list names the standing keyframes; 'none' marks a rig whose upright frames are not
   standing on both feet (a split stance, a walk), which the warning would
   otherwise ask to stand tall. */
function angAt(a,b,c){ var d=Math.abs(Math.atan2(a.y-b.y,a.x-b.x)-Math.atan2(c.y-b.y,c.x-b.x))*180/Math.PI; return d>180?360-d:d; }
var STANDING={backsquat:'top', frontsquat:'top', goblet:'top', rdl:'top', deadlift:'turn', ohp:'all', kbswing:'after',
  facepull:'all', triceps_ext:'all', kb_press:'all', platepinch:'top', kb_clean:[1,2,3,4,5,6], kb_snatch:[1,2,3,4,5],
  splitsq_bulg:'none', farmerscarry:'none', suitcasecarry:'none', kb_bottomsup:'none',
  curl_reverse:'all', burpee:[0], jabcross:'none', lunge_walk:'none'};
(function standingTall(){
  EX.forEach(function(ex){
    var how=STANDING[ex.id], T=rig.turn(ex), bad=[];
    ex.frames.forEach(function(f,i){
      var want=how==='all'||(Array.isArray(how)&&how.indexOf(i)>=0)||(how==='top'&&i===0)||(how==='turn'&&i===T)||(how==='after'&&i>0);
      var s=solve(f), knee=angAt(s.hip,s.kneeN,s.ankN), dx=s.hip.x-s.ankN.x;
      var tall=knee>=160 && knee<=172 && Math.abs(dx)<=3 && Math.abs(s.hip.y-rig.STAND_HIP_Y)<=0.5;
      var why='knee '+r(knee)+' deg, hip '+r(dx)+' from the ankle at y '+r(s.hip.y);
      if(want) check(ex.id,'frame'+i+' stands tall (knee 160-172, hip over the ankle)',tall,why);
      else if(!how && !tall && f.ankN && Math.abs(f.ankN[1]-rig.ANKLE_Y)<0.1 && Math.abs(f.torso)<=10 && s.hip.y<110) bad.push(i+' knee '+Math.round(knee));
    });
    if(bad.length) soft(ex.id,'standing frames still to re-author',false,'frame '+bad.join(', '));
  });
})();

/* A plate is a 45 cm disc round the bar: from the side a ring of radius 15
   (and a 3.5 stroke), from the front edge-on, 13 tall (and a 3 stroke). Its
   drawn edge must never go below the floor line (2 thick at GROUND). The
   deadlift started with the bar at y 159 and the plate 4 units into the
   floor, in both panels. It now starts, and resets between reps, with the
   plate resting on the floor. */
var PLATE_EDGE=15+1.75, PLATE_EDGE_F=13+1.5;
(function platesOnTheFloor(){
  EX.forEach(function(ex){
    if(ex.equip!=='barbell') return;
    var low=0, lowF=0;
    for(var i=0;i<=400;i++){ var s=solve(rig.poseAt(ex,i/400)); low=Math.max(low,s.handN.y+PLATE_EDGE);
      if(ex.front && !ex.frontPlan){ var f=rig.solveFront(rig.frontAt(ex,i/400)); lowF=Math.max(lowF,f.handL.y+PLATE_EDGE_F,f.handR.y+PLATE_EDGE_F); } }
    check(ex.id,'the plate never sinks into the floor',low<=GROUND+2,'plate edge '+r(low)+' ground '+GROUND);
    check(ex.id+' front','the plates never sink into the floor',lowF<=GROUND+2,'plate edge '+r(lowF)+' ground '+GROUND);
  });
  var dl=EX.filter(function(e){ return e.id==='deadlift'; })[0], n=dl.frames.length;
  var s0=solve(dl.frames[0]), f0=rig.solveFront(dl.front[0]);
  check('deadlift','starts with the plate resting on the floor',Math.abs(s0.handN.y+PLATE_EDGE-GROUND)<=2,'plate edge '+r(s0.handN.y+PLATE_EDGE));
  check('deadlift front','starts with the plates resting on the floor',Math.abs(f0.handL.y+PLATE_EDGE_F-GROUND)<=2,'plate edge '+r(f0.handL.y+PLATE_EDGE_F));
  // Each rep sets the bar down and pauses (a dead stop), rather than
  // bouncing it off the floor.
  check('deadlift','the bar settles on the floor between reps',
    JSON.stringify(dl.frames[n-1])===JSON.stringify(dl.frames[0]) && rig.tempoOf(dl)[n-1]>=250 && rig.stopsOf(dl).indexOf(0)>=0,
    n+' frames, last segment '+rig.tempoOf(dl)[n-1]+' ms');
})();

/* The core strength lifts, as the coaches' review (batch A) found them wrong. */
(function strength(){
  function get(id){ return EX.filter(function(e){return e.id===id;})[0]; }
  function S(id){ return get(id).frames.map(solve); }
  function spread(a){ return Math.max.apply(null,a)-Math.min.apply(null,a); }
  function midfoot(s){ return s.ankN.x+L.FOOT*0.22; }
  var dl=S('deadlift');
  check('deadlift','hips start above the knees, not in a squat',dl[0].hip.y<dl[0].kneeN.y-2,'hip y '+r(dl[0].hip.y)+' knee y '+r(dl[0].kneeN.y));
  check('deadlift','the bar passes in front of the knees, not through them',dl[1].handN.x>dl[1].kneeN.x,'bar x '+r(dl[1].handN.x)+' knee x '+r(dl[1].kneeN.x));
  var bs=S('backsquat');
  check('backsquat','the bar travels straight up and down',spread(bs.map(function(s){ return s.handN.x; }))<3,'bar x spread '+r(spread(bs.map(function(s){ return s.handN.x; }))));
  ['backsquat','frontsquat','goblet'].forEach(function(id){
    var f=rig.solveFront(get(id).front[0]), w=f.footR.x-f.footL.x, sw=f.shR.x-f.shL.x;
    check(id+' front','a squat stance, about shoulder width',w>=sw*7/8,'feet '+r(w)+' apart, shoulders '+r(sw));
  });
  var fs=rig.solveFront(get('frontsquat').front[0]);
  check('frontsquat front','elbows sit under the bar, not flared out past the hands',
    Math.abs(fs.elbL.x-fs.handL.x)<=3 && Math.abs(fs.elbR.x-fs.handR.x)<=3,'elbow x '+r(fs.elbL.x)+' hand x '+r(fs.handL.x));
  var rd=S('rdl'), knees=rd.map(function(s){ return angAt(s.hip,s.kneeN,s.ankN); });
  check('rdl','the knee sets once and holds its soft bend',spread(knees)<=8,'knee '+knees.map(r).join(', '));
  var bn=S('bench'), bp=get('bench').front.map(rig.solveFront);
  check('bench','locks out with the elbow all but straight (170 degrees or more)',angAt(bn[0].sh,bn[0].elbN,bn[0].handN)>=170,
    'elbow '+r(angAt(bn[0].sh,bn[0].elbN,bn[0].handN))+' deg');
  bp.forEach(function(p,i){
    var plan=p.handL.y-p.shL.y, side=bn[i].handN.x-bn[i].sh.x;
    check('bench above','frame'+i+' hands sit as far toward the feet as the side view puts the bar',Math.abs(plan-side)<3,
      'from above '+r(plan)+', from the side '+r(side));
  });
  var op=S('ohp');
  check('ohp','racks on the front of the shoulder',Math.abs(op[0].handN.x-op[0].sh.x)<9,'bar x '+r(op[0].handN.x)+' shoulder x '+r(op[0].sh.x));
  check('ohp','the bar goes up in a line, not looping out in front of the face',spread(op.map(function(s){ return s.handN.x; }))<7,
    'bar x '+op.map(function(s){ return r(s.handN.x); }).join(', '));
  var rw=S('row'), Tr=rig.turn(get('row')), fa=rw[Tr];
  check('row','the bar hangs over the middle of the foot',Math.abs(rw[0].handN.x-midfoot(rw[0]))<5,'bar x '+r(rw[0].handN.x)+' midfoot '+r(midfoot(rw[0])));
  check('row','at the top the forearm hangs down from the elbow, not out behind it',
    Math.abs(fa.handN.x-fa.elbN.x)<fa.handN.y-fa.elbN.y,'elbow '+r(fa.elbN.x)+','+r(fa.elbN.y)+' hand '+r(fa.handN.x)+','+r(fa.handN.y));
  var pu=S('pullup'), pf=get('pullup').front.map(rig.solveFront), Tp=rig.turn(get('pullup'));
  check('pullup','feet hang clear of the floor, not on tiptoe',pu[0].ankN.y+7<=GROUND-4,'sole '+r(pu[0].ankN.y+7)+' ground '+GROUND);
  check('pullup front','at the top the elbows drive down below the shoulders, not a W at shoulder height',
    pf[Tp].elbL.y>pf[Tp].shL.y+4 && pf[Tp].elbR.y>pf[Tp].shR.y+4,'elbow y '+r(pf[Tp].elbL.y)+' shoulder y '+r(pf[Tp].shL.y));
  var kb=S('kbswing');
  check('kbswing','the bell clears the floor at the hike',GROUND-(kb[0].handN.y+22)>=8,'bell bottom '+r(kb[0].handN.y+22));
  check('kbswing','the hips have locked by the time the bell is at the belly (the arms do not raise it from a hinge)',
    get('kbswing').frames[1].torso<=5 && kb[1].handN.y>kb[1].sh.y,'torso '+get('kbswing').frames[1].torso+' bell y '+r(kb[1].handN.y));
})();

/* Walking. The three carries moonwalked: the figure faced forward on a
   still hip while the planted foot slid FORWARD 20 units a step and the
   lifted one swung back. Seen against a still hip, a foot on the floor can
   only travel back (the body passes over it), and a walk's lifted foot only
   forward (it swings through to the next step). A walk here is an upright
   rig with a foot on the floor at every moment and one lifted at some. The
   rigs listed slide or swing a foot the wrong way today and are being
   re-authored, so they print as warnings; any other rig doing it fails, and
   a listed one that comes right says so. */
var GAIT={burpee:'slide', shadowbox:'swing'};
(function walking(){
  var done=[];
  EX.forEach(function(ex){
    var N=480, S=[], Y=rig.ANKLE_Y, known=(GAIT[ex.id]||'').split(' ');
    for(var i=0;i<=N;i++) S.push(solve(rig.poseAt(ex,i/N)));
    function down(p){ return p.y>=Y-0.3; }
    var walk=ex.frames.every(function(f){ return Math.abs(((f.torso+180)%360)-180)<15; }) &&
      S.every(function(x){ return down(x.ankN)||down(x.ankF); }) && S.some(function(x){ return !down(x.ankN)||!down(x.ankF); });
    var fw=0, fwAt='', bw=0, bwAt='';
    ['ankN','ankF'].forEach(function(k){ var run=0, back=0;
      for(var i=1;i<=N;i++){ var a=S[i-1][k], b=S[i][k], dx=b.x-a.x;
        if(down(a)&&down(b)){ run=Math.max(0,run+dx); if(run>fw){ fw=run; fwAt=k+' at u='+r(i/N*100)/100; } } else run=0;
        if(!down(a)&&!down(b)){ back=Math.min(0,back+dx); if(back<bw){ bw=back; bwAt=k+' at u='+r(i/N*100)/100; } } else back=0; } });
    [['slide','a foot on the floor never slides forward under a still hip',fw<=1,'slides forward '+r(fw)+', '+fwAt],
     ['swing','a walk\'s lifted foot swings forward, never back (no moonwalk)',!walk||bw>=-1,'swings back '+r(-bw)+', '+bwAt]].forEach(function(c){
      if(known.indexOf(c[0])>=0){ if(c[2]) done.push(ex.id+' '+c[0]); else soft(ex.id,c[1]+' (listed in GAIT, being re-authored)',false,c[3]); }
      else check(ex.id,c[1],c[2],c[3]); });
  });
  if(done.length) soft('GAIT','now walking the right way, take off GAIT',false,done.join(', '));
})();

/* The machines and isolation lifts, as the coaches' review (batch B) found
   them: a dip that squatted behind a rail with the shoulder never reaching the
   elbow, a dead hang drawn as a small pull-up, a pulldown that stopped at the
   chin, a split squat that showed only the bottom half, a triceps extension
   whose elbows drifted, an incline press that pushed out along the bench, a
   face pull that finished as a high pull, and a wall sit that squatted. */
(function machines(){
  function get(id){ return EX.filter(function(e){return e.id===id;})[0]; }
  function at(ex,n){ var o=[]; for(var i=0;i<=n;i++) o.push(solve(rig.poseAt(ex,i/n))); return o; }
  function elb(s){ return angAt(s.sh,s.elbN,s.handN); }
  var dp=get('dip'), D=dp.frames.map(solve), Td=rig.turn(dp);
  check('dip','starts on straight arms',elb(D[0])>=165,'elbow '+r(elb(D[0])));
  check('dip','the shoulder comes down level with the elbow at the bottom',D[Td].sh.y>=D[Td].elbN.y-2,'shoulder y '+r(D[Td].sh.y)+' elbow y '+r(D[Td].elbN.y));
  check('dip','the hands rest on a bar',D.every(function(s){ return (dp.props||[]).some(function(p){ return Math.abs(s.handN.y-p[1])<=2 && s.handN.x>=p[0] && s.handN.x<=p[0]+p[2]; }); }),'hand y '+r(D[0].handN.y));
  var dh=at(get('deadhang'),48), worst=Math.min.apply(null,dh.map(elb));
  check('deadhang','the arms stay dead straight: only the shoulders pack',worst>=170,'most bent elbow '+r(worst));
  var pd=get('pulldown'), PD=pd.frames.map(solve), Tp=rig.turn(pd);
  check('pulldown','starts with the arms fully extended overhead',elb(PD[0])>=165,'elbow '+r(elb(PD[0])));
  check('pulldown','the bar comes down to the upper chest, below the shoulder',PD[Tp].handN.y>=PD[Tp].sh.y && PD[Tp].elbN.y>PD[Tp].sh.y+8,
    'hand y '+r(PD[Tp].handN.y)+' elbow y '+r(PD[Tp].elbN.y)+' shoulder y '+r(PD[Tp].sh.y));
  var pf=rig.solveFront(pd.front[rig.turn(pd,true)]);
  check('pulldown front','the hands come down below the chin',pf.handL.y>pf.head.y+8,'hand y '+r(pf.handL.y)+' head y '+r(pf.head.y));
  var ht=get('hipthrust'), H=ht.frames.map(solve), Th=rig.turn(ht);
  check('hipthrust','the bench is knee height (about 40 cm), not a table under the back',ht.props[0][1]>=GROUND-30,'bench top '+ht.props[0][1]);
  check('hipthrust','the knee is over the ankle at the top',Math.abs(H[Th].kneeN.x-H[Th].ankN.x)<=2,'knee x '+r(H[Th].kneeN.x)+' ankle x '+r(H[Th].ankN.x));
  var sq=get('splitsq_bulg'), Q=sq.frames.map(solve), Tq=rig.turn(sq);
  check('splitsq_bulg','the rep starts from the top, front leg near straight',angAt(Q[0].hip,Q[0].kneeN,Q[0].ankN)>=150,'front knee '+r(angAt(Q[0].hip,Q[0].kneeN,Q[0].ankN)));
  var qf=rig.solveFront(sq.front[rig.turn(sq,true)]);
  check('splitsq_bulg front','the rear knee is the low one, as from the side',qf.kneeL.y>qf.kneeR.y+10 && Math.abs(qf.kneeL.y-Q[Tq].kneeF.y)<4,
    'rear knee y '+r(qf.kneeL.y)+' front knee y '+r(qf.kneeR.y)+' side rear knee y '+r(Q[Tq].kneeF.y));
  var te=get('triceps_ext'), TE=at(te,48), ex0=TE.map(function(s){ return s.elbN.x; }), ey0=TE.map(function(s){ return s.elbN.y; });
  var drift=Math.max(Math.max.apply(null,ex0)-Math.min.apply(null,ex0),Math.max.apply(null,ey0)-Math.min.apply(null,ey0));
  check('triceps_ext','the upper arm stays put: only the forearm moves',drift<1.5,'elbow travels '+r(drift));
  var TS=te.frames.map(solve);
  check('triceps_ext','locks out straight and lowers deep behind the head',elb(TS[0])>=170 && elb(TS[rig.turn(te)])<=60,'elbow '+r(elb(TS[0]))+' to '+r(elb(TS[rig.turn(te)])));
  var pi=get('press_incline'), PI=pi.frames.map(solve), Ti=rig.turn(pi);
  check('press_incline','presses straight up over the shoulder, not out along the bench',Math.abs(PI[0].handN.x-PI[0].sh.x)<=8 && PI[0].handN.y<PI[0].sh.y-30,
    'hand '+r(PI[0].handN.x)+','+r(PI[0].handN.y)+' shoulder '+r(PI[0].sh.x)+','+r(PI[0].sh.y));
  check('press_incline','the forearm is vertical under the bell at the bottom',Math.abs(PI[Ti].handN.x-PI[Ti].elbN.x)<=4,'hand x '+r(PI[Ti].handN.x)+' elbow x '+r(PI[Ti].elbN.x));
  var fp=get('facepull'), FP=fp.frames.map(solve), Tf=rig.turn(fp);
  check('facepull','starts with the arms extended toward the cable',elb(FP[0])>=160,'elbow '+r(elb(FP[0])));
  check('facepull','the elbow finishes below the middle of the head, not up by the crown',FP[Tf].elbN.y>FP[Tf].head.y,'elbow y '+r(FP[Tf].elbN.y)+' head y '+r(FP[Tf].head.y));
  var ws=get('wallsit'), WS=at(ws,48), hy=WS.map(function(s){ return s.hip.y; });
  check('wallsit','it is a hold: the hips barely move',Math.max.apply(null,hy)-Math.min.apply(null,hy)<=4.5,'hip travels '+r(Math.max.apply(null,hy)-Math.min.apply(null,hy)));
  check('wallsit front','the hands stay off the thighs',ws.front.every(function(f){ return f.handL[1]<f.hipY-12 && f.handR[1]<f.hipY-12; }),'hand y '+ws.front[0].handL[1]+' hip y '+ws.front[0].hipY);
})();

// Frame 2 is the bottom of the usual four-frame rep and nothing more: a rig
// that gains a frame, or authors its stops, moves its turnaround, and a check
// still reading frame 2 then judges the wrong pose and can pass on it. Every
// suite reads the turnaround through rig.turn instead, and this keeps it so.
(function(){
  var fs=require('fs'), path=require('path'), hits=[];
  fs.readdirSync(__dirname).filter(function(f){ return /\.js$/.test(f); }).forEach(function(f){
    fs.readFileSync(path.join(__dirname,f),'utf8').split('\n').forEach(function(l,i){
      if(/\b(S|F|FP|LR|f|frames|front)\[2\]/.test(l)) hits.push(f+':'+(i+1));
    });
  });
  check('checks','no suite hard-codes frame 2 as the turnaround (use rig.turn)',hits.length===0,hits.join(', '));
})();

console.log('=== ANALYSIS ===');
if(!fails.length) console.log('PASS: all '+EX.length+' exercises match their movement criteria.');
else { console.log('FAILURES ('+fails.length+'):'); fails.forEach(function(f){console.log('  x '+f);}); }
if(warns.length){ console.log('\nSoft warnings ('+warns.length+'):'); warns.forEach(function(w){console.log('  ! '+w);}); }
process.exit(fails.length?1:0);
