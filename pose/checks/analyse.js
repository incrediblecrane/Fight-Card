var rig=require('../rig.js'), EX=require('../exercises.js');
var solve=rig.solve, GROUND=rig.GROUND, L=rig.L;
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
  /* ---- the 45 rigs added in one pass. Each of these is the claim its own
     description makes; passing the geometry checks only proves a figure can be
     drawn, not that it is doing the exercise. ---- */
  if(ex.id==='pistol'){
    check(ex.id,'the free leg never touches the floor', S.every(function(x){return x.ankF.y<GROUND-6;}),
      'lowest free foot '+r(Math.max.apply(null,S.map(function(x){return x.ankF.y;}))));
    check(ex.id,'the standing foot stays planted', S.every(function(x){return x.ankN.y===S[0].ankN.y && x.ankN.x===S[0].ankN.x;}),'standing foot moved');
    check(ex.id,'the hips drop a long way', S[2].hip.y>S[0].hip.y+25,'drop '+r(S[2].hip.y-S[0].hip.y));
    check(ex.id,'the free leg is straighter than the working one',
      Math.hypot(S[2].hipF.x-S[2].ankF.x,S[2].hipF.y-S[2].ankF.y) > Math.hypot(S[2].hip.x-S[2].ankN.x,S[2].hip.y-S[2].ankN.y),'free leg not extended');
  }
  if(ex.id==='lunge_walk'){
    check(ex.id,'the trailing leg swings through past the lead one, so it walks',
      ex.frames[3].ankF[0]-ex.frames[0].ankF[0]>30 &&
      ex.frames[3].ankF[0]>=ex.frames[0].ankN[0]-2,
      'trailing foot '+r(ex.frames[0].ankF[0])+' -> '+r(ex.frames[3].ankF[0])+', lead was at '+r(ex.frames[0].ankN[0]));
    check(ex.id,'the swinging foot lifts off the floor to get there',
      ex.frames[1].ankF[1]<GROUND-14,'swing foot '+r(ex.frames[1].ankF[1]));
    check(ex.id,'the back knee drops toward the floor', S[1].kneeF.y>S[0].kneeF.y+6,
      'rear knee '+r(S[0].kneeF.y)+' -> '+r(S[1].kneeF.y));
  }
  if(ex.id==='glutebridge'){
    check(ex.id,'the shoulders stay on the floor, which is what makes it a bridge not a hip thrust',
      S.every(function(x){return x.sh.y>GROUND-22;}),'highest shoulder '+r(Math.min.apply(null,S.map(function(x){return x.sh.y;}))));
    // Capped by geometry, not taste: the torso pivots about an anchored
    // shoulder and the head hangs past that pivot, so more travel than this
    // buries the head. It is also about the range a real bridge covers.
    check(ex.id,'the hips actually lift', S[0].hip.y-S[2].hip.y>6,'lift '+r(S[0].hip.y-S[2].hip.y));
    check(ex.id,'the feet stay planted', S.every(function(x){return x.ankN.y===GROUND-7;}),'a foot left the floor');
  }
  if(ex.id==='row_single'){
    check(ex.id,'the torso is horizontal over a bench, not upright', ex.frames[0].torso>70,'torso '+ex.frames[0].torso);
    check(ex.id,'the working hand travels up toward the hip', S[0].handN.y-S[2].handN.y>16,
      'travel '+r(S[0].handN.y-S[2].handN.y));
    check(ex.id,'the supporting hand does not move', S.every(function(x){return x.handF.y===S[0].handF.y;}),'support hand moved');
    check(ex.id,'the torso does not rotate up to help', S.every(function(x){return x.sh.y===S[0].sh.y;}),'the torso moved');
  }
  if(ex.id==='chinup'||ex.id==='hangingkneeraise'){
    check(ex.id,'the bar is fixed in space', S.every(function(x){return x.handN.x===S[0].handN.x && x.handN.y===S[0].handN.y;}),'the bar moved');
    check(ex.id,'the arms are near straight at the hang',
      Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)>36,'hang reach '+r(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)));
    check(ex.id,'the feet are off the floor', S.every(function(x){return x.ankN.y<GROUND-4;}),'a foot reached the floor');
  }
  if(ex.id==='chinup'){
    check(ex.id,'the body rises to the bar', S[0].hip.y-S[2].hip.y>18,'rise '+r(S[0].hip.y-S[2].hip.y));
    check(ex.id,'the grip is narrower than a pull-up',
      ex.front && ex.front[0].handR[0]-ex.front[0].handL[0] < 42,'grip width '+r(ex.front[0].handR[0]-ex.front[0].handL[0]));
  }
  if(ex.id==='hangingkneeraise'){
    check(ex.id,'the knees travel up toward the chest', S[0].ankN.y-S[2].ankN.y>28,'travel '+r(S[0].ankN.y-S[2].ankN.y));
    check(ex.id,'the torso barely moves, so it is not a swing', Math.abs(S[2].hip.y-S[0].hip.y)<4,
      'hip moved '+r(Math.abs(S[2].hip.y-S[0].hip.y)));
  }
  if(ex.id==='invertedrow'){
    check(ex.id,'the bar is fixed in space', S.every(function(x){return x.handN.y===S[0].handN.y;}),'the bar moved');
    check(ex.id,'the heels stay on the floor', S.every(function(x){return x.ankN.y<=GROUND;}),'a heel sank');
    check(ex.id,'the chest travels up to the bar', S[0].sh.y-S[2].sh.y>8,'rise '+r(S[0].sh.y-S[2].sh.y));
    check(ex.id,'the body stays one line, hips do not sag behind the shoulders',
      S.every(function(x){return Math.abs((x.hip.y-x.sh.y)-(S[0].hip.y-S[0].sh.y))<3;}),'the body folded');
  }
  if(ex.id==='kb_clean'||ex.id==='kb_snatch'){
    check(ex.id,'it starts from a hinge with the bell behind the knees',
      ex.frames[0].torso>60 && S[0].handN.x<S[0].kneeN.x,'torso '+ex.frames[0].torso+' hand '+r(S[0].handN.x)+' knee '+r(S[0].kneeN.x));
    check(ex.id,'it finishes standing tall', ex.frames[2].torso<10,'finish torso '+ex.frames[2].torso);
    check(ex.id,'the feet stay planted throughout', S.every(function(x){return x.ankN.y===GROUND-7;}),'a foot moved');
  }
  if(ex.id==='kb_snatch'){
    var cl=EX.filter(function(e){return e.id==='kb_clean';})[0];
    var clTop=solve(cl.frames[2]);
    check(ex.id,'it finishes overhead, higher than a clean racks',
      S[2].handN.y < clTop.handN.y-30,'snatch '+r(S[2].handN.y)+' clean '+r(clTop.handN.y));
    check(ex.id,'the lockout arm is straight',
      Math.hypot(S[2].handN.x-S[2].sh.x,S[2].handN.y-S[2].sh.y)>37,'reach '+r(Math.hypot(S[2].handN.x-S[2].sh.x,S[2].handN.y-S[2].sh.y)));
  }
  if(ex.id==='kb_clean'){
    check(ex.id,'the rack is at chest height, not overhead', S[2].handN.y>S[2].sh.y+6 && S[2].handN.y<S[2].hip.y,
      'rack '+r(S[2].handN.y)+' shoulder '+r(S[2].sh.y));
  }
  if(ex.id==='kb_press'){
    check(ex.id,'only one arm presses; the other hangs still',
      S.every(function(x){return Math.abs(x.handF.y-S[0].handF.y)<1;}),'the free arm moved');
    check(ex.id,'the press goes from the rack to a straight arm overhead',
      S[2].handN.y<S[0].handN.y-40 && Math.hypot(S[2].handN.x-S[2].sh.x,S[2].handN.y-S[2].sh.y)>34,
      'rack '+r(S[0].handN.y)+' top '+r(S[2].handN.y));
    check(ex.id,'the torso stays upright rather than leaning away from the load',
      S.every(function(x){return Math.abs(x.sh.x-x.hip.x)<4;}),'the torso leaned');
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
    check(ex.id,'the hips are lifted clear of the floor', S.every(function(x){return x.hip.y<GROUND-25;}),
      'hip '+r(S[0].hip.y)+' ground '+GROUND);
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
      S[2].handN.y-S[0].handN.y>40 && S[0].handN.x-S[2].handN.x>20,
      'dy '+r(S[2].handN.y-S[0].handN.y)+' dx '+r(S[0].handN.x-S[2].handN.x));
    check(ex.id,'the torso rotates with them rather than staying square',
      Math.abs(ex.frames[2].torso-ex.frames[0].torso)>15,'torso '+ex.frames[0].torso+' -> '+ex.frames[2].torso);
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
    check(ex.id,'the hands press straight out from the sternum', S[2].handN.x-S[0].handN.x>20,
      'travel '+r(S[2].handN.x-S[0].handN.x));
    check(ex.id,'nothing rotates, which is the entire exercise',
      ex.frames.every(function(f){return f.torso===ex.frames[0].torso;}),'the torso turned');
    check(ex.id,'the hands stay near chest height', S.every(function(x){return Math.abs(x.handN.y-x.sh.y)<20;}),'the hands drifted off the chest line');
  }
  if(ex.id==='kb_tgu'){
    check(ex.id,'it starts lying down and finishes up off the floor', S[0].hip.y-S[2].hip.y>12,
      'hip '+r(S[0].hip.y)+' -> '+r(S[2].hip.y));
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
      !!box && S[2].ankN.x>box[0] && S[2].ankN.x<box[0]+box[2] && Math.abs(S[2].ankN.y-box[1])<4,
      'foot '+r(S[2].ankN.x)+','+r(S[2].ankN.y)+' box '+JSON.stringify(box));
    check(ex.id,'it ends higher than it started', S[2].ankN.y<S[0].ankN.y-14,
      'start '+r(S[0].ankN.y)+' finish '+r(S[2].ankN.y));
  }
  if(ex.id==='broadjump'){
    check(ex.id,'it travels forward across the frame, which is what makes it broad',
      S[3].ankN.x-S[0].ankN.x>40,'travel '+r(S[3].ankN.x-S[0].ankN.x));
    check(ex.id,'it sticks a two-footed landing on the floor',
      Math.abs(S[3].ankN.y-GROUND)<9 && Math.abs(S[3].ankF.y-GROUND)<9,
      'feet '+r(S[3].ankN.y)+','+r(S[3].ankF.y));
  }
  if(ex.id==='medballthrow'){
    check(ex.id,'the ball travels across the body', S[2].handN.x-S[0].handN.x>35,
      'travel '+r(S[2].handN.x-S[0].handN.x));
    check(ex.id,'the torso rotates through it', ex.frames[2].torso-ex.frames[0].torso>20 ||
      (ex.frames[2].torso+360)-ex.frames[0].torso>20,'torso '+ex.frames[0].torso+' -> '+ex.frames[2].torso);
    check(ex.id,'the back heel pivots off the floor', ex.frames[2].ankF[1]<ex.frames[0].ankF[1]-4,
      'rear heel '+ex.frames[0].ankF[1]+' -> '+ex.frames[2].ankF[1]);
  }
  if(ex.id==='medballslam'){
    check(ex.id,'it starts fully extended overhead', S[0].handN.y<S[0].sh.y-30,
      'hand '+r(S[0].handN.y)+' shoulder '+r(S[0].sh.y));
    check(ex.id,'the ball ends near the floor', S[2].handN.y>GROUND-36,'hand '+r(S[2].handN.y));
    check(ex.id,'the torso folds over the slam rather than staying upright', ex.frames[2].torso>40,
      'torso '+ex.frames[2].torso);
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
      FP.length>2 && (FP[2].handR[0]-FP[2].handL[0])>(FP[0].handR[0]-FP[0].handL[0])+14,
      FP.length>2?('spread '+(FP[0].handR[0]-FP[0].handL[0])+' -> '+(FP[2].handR[0]-FP[2].handL[0])):'no front view');
    check(ex.id,'and they finish higher than they started',
      FP.length>2 && FP[2].handL[1]<FP[0].handL[1]-12,
      FP.length>2?('hand y '+FP[0].handL[1]+' -> '+FP[2].handL[1]):'no front view');
    check(ex.id,'the arms are near end-on at the start and square at the finish',
      FP.length>2 && FP[0].armScaleL<0.6 && FP[2].armScaleL>0.9,
      FP.length>2?('armScale '+FP[0].armScaleL+' -> '+FP[2].armScaleL):'no front view');
    // And the side view still has to keep the elbows above the wrists.
    check(ex.id,'the hands finish beside the head, not at the chest',
      S[2].handN.y<S[2].sh.y+4,'hand '+r(S[2].handN.y)+' shoulder '+r(S[2].sh.y));
  }
  if(ex.id==='raise_front'){
    check(ex.id,'it starts at the thigh and finishes at shoulder height',
      S[0].handN.y>S[0].hip.y-6 && Math.abs(S[2].handN.y-S[2].sh.y)<12,
      'hand '+r(S[0].handN.y)+' -> '+r(S[2].handN.y)+', shoulder '+r(S[2].sh.y));
    check(ex.id,'the hand travels forward, not up the body like a curl',
      S[2].handN.x-S[0].handN.x>22,'travel '+r(S[2].handN.x-S[0].handN.x));
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
      Math.abs(S[2].handN.x-S[0].handN.x)<14,'side travel '+r(S[2].handN.x-S[0].handN.x));
    // The side rig cannot foreshorten a limb, only bend it, so an attempt to
    // draw the arm rising end-on came out as a bent arm holding a bell at
    // chest height: a curl. The side view therefore keeps the arm long and
    // low and lets the front view carry the exercise.
    var LRr=S.map(function(x){ return Math.hypot(x.handN.x-x.sh.x,x.handN.y-x.sh.y); });
    check(ex.id,'the side arm stays long, because a bent one reads as a curl',
      Math.min.apply(null,LRr)>26,'shortest reach '+r(Math.min.apply(null,LRr)));
    check(ex.id,'and the side hand stays well below the shoulder',
      Math.min.apply(null,S.map(function(x){return x.handN.y-x.sh.y;}))>18,
      'closest the hand gets to the shoulder: '+
      r(Math.min.apply(null,S.map(function(x){return x.handN.y-x.sh.y;}))));
    var LR=ex.front||[];
    check(ex.id,'the front view is where it happens: the hands go out and up',
      LR.length>2 && (LR[2].handR[0]-LR[2].handL[0])>(LR[0].handR[0]-LR[0].handL[0])+40
        && LR[2].handL[1]<LR[0].handL[1]-20,
      LR.length>2?('spread '+(LR[0].handR[0]-LR[0].handL[0])+' -> '+(LR[2].handR[0]-LR[2].handL[0])):'no front view');
  }
  if(ex.id==='pulldown_straight'){
    check(ex.id,'the hands travel from overhead to the thighs',
      S[0].handN.y<S[0].sh.y-14 && S[2].handN.y>S[2].hip.y-4,
      'hand '+r(S[0].handN.y)+' -> '+r(S[2].handN.y)+', shoulder '+r(S[0].sh.y)+', hip '+r(S[2].hip.y));
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
  if(ex.id==='fly_cable_rev'){
    // It is the mirror of the chest flys, so the two things worth proving are
    // that the hands travel BACKWARD and that they finish wide, not together.
    check(ex.id,'the hands start out in front of the shoulder', S[0].handN.x>S[0].sh.x+24,
      'hand '+r(S[0].handN.x)+' shoulder '+r(S[0].sh.x));
    check(ex.id,'they travel backward, the opposite way to a chest fly',
      S[2].handN.x<S[0].handN.x-30,'travel '+r(S[0].handN.x-S[2].handN.x));
    check(ex.id,'they finish behind the shoulder', S[2].handN.x<S[2].sh.x,
      'hand '+r(S[2].handN.x)+' shoulder '+r(S[2].sh.x));
    check(ex.id,'the elbow angle barely changes: it is a fly, not a row',
      Math.abs(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y)
              -Math.hypot(S[2].handN.x-S[2].sh.x,S[2].handN.y-S[2].sh.y))<16,
      'reach '+r(Math.hypot(S[0].handN.x-S[0].sh.x,S[0].handN.y-S[0].sh.y))+
      ' -> '+r(Math.hypot(S[2].handN.x-S[2].sh.x,S[2].handN.y-S[2].sh.y)));
    var F=ex.front||[];
    check(ex.id,'the hands cross in front at the start', F.length>2 && F[0].handL[0]>F[0].handR[0],
      F.length?('L '+F[0].handL[0]+' R '+F[0].handR[0]):'no front view');
    check(ex.id,'and finish wide apart', F.length>2 && (F[2].handR[0]-F[2].handL[0])>60,
      F.length>2?('spread '+(F[2].handR[0]-F[2].handL[0])):'front view has '+F.length+' frames');
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
      ex.frames[2].torso-ex.frames[0].torso>30,
      'torso '+ex.frames[0].torso+' -> '+ex.frames[2].torso);
    check(ex.id,'the hands finish below the hips', S[2].handN.y>S[2].hip.y+6,
      'hand '+r(S[2].handN.y)+' hip '+r(S[2].hip.y));
    check(ex.id,'the hands travel a long way down', S[2].handN.y-S[0].handN.y>70,
      'travel '+r(S[2].handN.y-S[0].handN.y));
    check(ex.id,'the feet stay planted', ex.frames.every(function(f){
      return f.ankN[0]===ex.frames[0].ankN[0] && f.ankN[1]===ex.frames[0].ankN[1]; }),'a foot moved');
  }
  if(ex.id==='situpwallthrow'){
    // The two halves that make it this exercise and not a crunch: the trunk
    // actually leaves the floor, and the ball actually leaves the chest.
    check(ex.id,'it starts flat on the floor', S[0].sh.y>GROUND-20 && S[0].head.y>GROUND-20,
      'shoulder '+r(S[0].sh.y)+' head '+r(S[0].head.y));
    check(ex.id,'the trunk comes all the way up', S[2].sh.y<S[0].sh.y-24,
      'shoulder '+r(S[0].sh.y)+' -> '+r(S[2].sh.y));
    check(ex.id,'the feet never leave the floor', ex.frames.every(function(f){
      return f.ankN[1]>=GROUND-8 && f.ankF[1]>=GROUND-8; }),
      'ankles '+ex.frames.map(function(f){return f.ankN[1];}).join(','));
    check(ex.id,'the hips stay down: it is a sit-up, not a bridge', ex.frames.every(function(f){
      return f.hip[1]>=GROUND-16; }),'hips '+ex.frames.map(function(f){return f.hip[1];}).join(','));
    check(ex.id,'the ball leaves the chest toward the wall', S[2].handN.x-S[0].handN.x>50,
      'travel '+r(S[2].handN.x-S[0].handN.x));
    check(ex.id,'the throwing arm reaches out rather than staying folded',
      Math.hypot(S[2].handN.x-S[2].sh.x,S[2].handN.y-S[2].sh.y)>L.UPPER+L.FORE-6,
      'reach '+r(Math.hypot(S[2].handN.x-S[2].sh.x,S[2].handN.y-S[2].sh.y))+' of '+(L.UPPER+L.FORE));
    // The wall it is thrown at has to be somewhere the ball actually goes.
    var wall=(ex.props||[])[0];
    check(ex.id,'there is a wall in front of the release', !!wall && wall[0]>S[2].handN.x,
      wall?('wall x '+wall[0]+' hand x '+r(S[2].handN.x)):'no wall prop');
    check(ex.id,'the wall stands on the floor rather than floating',
      !!wall && wall[1]+wall[3]>=GROUND, wall?('wall bottom '+(wall[1]+wall[3])):'no wall prop');
  }
  if(ex.id==='sprint'||ex.id==='highknees'){
    check(ex.id,'the legs alternate', (S[0].ankN.y<S[0].ankF.y)!==(S[2].ankN.y<S[2].ankF.y),'the legs did not swap');
    check(ex.id,'a knee comes up high', Math.min(S[0].kneeN.y,S[2].kneeN.y)<S[0].hip.y+22,
      'highest knee '+r(Math.min(S[0].kneeN.y,S[2].kneeN.y))+' hip '+r(S[0].hip.y));
    check(ex.id,'opposite arm and leg drive together', (S[0].handN.y<S[0].handF.y)!==(S[2].handN.y<S[2].handF.y),
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
      S[0].handN.y-S[2].handN.y>40,'travel '+r(S[0].handN.y-S[2].handN.y));
    check(ex.id,'the legs open and close', (S[2].ankN.x-S[2].ankF.x)-(S[0].ankN.x-S[0].ankF.x)>20,
      'stance '+r(S[0].ankN.x-S[0].ankF.x)+' -> '+r(S[2].ankN.x-S[2].ankF.x));
    check(ex.id,'arms and legs move together, not in sequence',
      (S[1].handN.y<S[0].handN.y)===((S[1].ankN.x-S[1].ankF.x)>(S[0].ankN.x-S[0].ankF.x)),'they were out of phase');
  }
  if(ex.id==='hipflexor'||ex.id==='couchstretch'){
    check(ex.id,'it is half-kneeling: one knee down, one foot planted in front',
      S.every(function(x){return x.kneeF.y>GROUND-16 && x.ankN.y>GROUND-8;}),
      'rear knee '+r(S[0].kneeF.y)+' front foot '+r(S[0].ankN.y));
    check(ex.id,'the hips travel forward into the stretch', S[2].hip.x>S[0].hip.x+2,
      'hip x '+r(S[0].hip.x)+' -> '+r(S[2].hip.x));
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
      !!w && (w[0]-S[2].kneeN.x)<8 && S[2].kneeN.x>S[0].kneeN.x+3,
      'knee '+r(S[0].kneeN.x)+' -> '+r(S[2].kneeN.x)+' wall at '+(w&&w[0]));
    check(ex.id,'the heel never lifts, which is the point of the test',
      S.every(function(x){return x.ankN.y===GROUND-7;}),'the heel came up');
  }
  if(ex.id==='catcow'){
    check(ex.id,'the hands stay planted under the shoulders',
      S.every(function(x){return x.handN.x===S[0].handN.x && x.handN.y===S[0].handN.y;}),'a hand moved');
    check(ex.id,'the shoulders stay put; it is the pelvis that rocks',
      S.every(function(x){return Math.abs(x.sh.y-S[0].sh.y)<3;}),
      'shoulder moved '+r(Math.max.apply(null,S.map(function(x){return Math.abs(x.sh.y-S[0].sh.y);}))));
    check(ex.id,'the pelvis actually tilts through a range', Math.abs(S[2].hip.y-S[0].hip.y)>10,
      'pelvis travel '+r(Math.abs(S[2].hip.y-S[0].hip.y)));
  }
  if(ex.id==='childspose'){
    check(ex.id,'it sits back onto the heels with the arms stretched long forward',
      S[0].handN.x>S[0].hip.x+50,'hand '+r(S[0].handN.x)+' hip '+r(S[0].hip.x));
    check(ex.id,'the head is down near the floor', S[0].head.y>GROUND-40,'head '+r(S[0].head.y));
  }
  if(ex.id==='worldsgreatest'){
    check(ex.id,'the inside hand stays planted by the front foot',
      S.every(function(x){return x.handN.x===S[0].handN.x && x.handN.y===S[0].handN.y;}),'the planted hand moved');
    check(ex.id,'the free arm reaches to the ceiling', S[0].handF.y-S[2].handF.y>50,
      'reach travel '+r(S[0].handF.y-S[2].handF.y));
    check(ex.id,'it is a deep lunge underneath', S[0].ankN.x-S[0].ankF.x>50,'stride '+r(S[0].ankN.x-S[0].ankF.x));
  }
  if(ex.id==='hamstring'){
    check(ex.id,'the front leg is straight',
      S.every(function(x){return Math.hypot(x.hip.x-x.ankN.x,x.hip.y-x.ankN.y)>L.THIGH+L.SHIN-12;}),
      'shortest hip-ankle '+r(Math.min.apply(null,S.map(function(x){return Math.hypot(x.hip.x-x.ankN.x,x.hip.y-x.ankN.y);}))));
    check(ex.id,'it hinges further over as it goes', ex.frames[2].torso>ex.frames[0].torso+8,
      'torso '+ex.frames[0].torso+' -> '+ex.frames[2].torso);
  }
  if(ex.id==='shoulderdisloc'){
    check(ex.id,'the stick travels from in front of the thighs to behind the head',
      S[0].handN.y>S[0].hip.y-10 && S[2].handN.y<S[2].head.y,
      'start '+r(S[0].handN.y)+' hip '+r(S[0].hip.y)+' top '+r(S[2].handN.y)+' head '+r(S[2].head.y));
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
    check(ex.id,'it folds forward over the front leg', ex.frames[2].torso>ex.frames[0].torso+10,
      'torso '+ex.frames[0].torso+' -> '+ex.frames[2].torso);
  }
  if(ex.id==='nine0'){
    check(ex.id,'it is seated on the floor', S.every(function(x){return x.hip.y>GROUND-26;}),'hip '+r(S[0].hip.y));
    check(ex.id,'both knees are folded, neither leg is straight',
      S.every(function(x){return Math.hypot(x.hip.x-x.ankN.x,x.hip.y-x.ankN.y)<L.THIGH+L.SHIN-8 &&
                                  Math.hypot(x.hipF.x-x.ankF.x,x.hipF.y-x.ankF.y)<L.THIGH+L.SHIN-8;}),'a leg was straight');
    check(ex.id,'the front view carries the rotation the side view cannot',
      !!ex.front && Math.abs(ex.front[0].footL[0]-ex.front[2].footL[0])>4,
      'front feet did not travel');
  }
  if(ex.id==='thoracic'){
    check(ex.id,'the hips stay square while the top arm opens',
      S.every(function(x){return x.hip.x===S[0].hip.x && x.hip.y===S[0].hip.y;}),'the hips turned');
    check(ex.id,'the top hand opens upward through a real range', S[0].handF.y-S[2].handF.y>25,
      'travel '+r(S[0].handF.y-S[2].handF.y));
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
    check(ex.id,'the arms alternate up and down', (S[0].handN.y<S[0].handF.y)!==(S[2].handN.y<S[2].handF.y),
      'the waves did not alternate');
  }
  if(ex.id==='rowerg'){
    check(ex.id,'the feet stay on the footplate', S.every(function(x){return x.ankN.y===S[0].ankN.y;}),'a foot moved');
    check(ex.id,'the seat travels: the hips move back down the rail', S[2].hip.x-S[0].hip.x>16,
      'hip '+r(S[0].hip.x)+' -> '+r(S[2].hip.x));
    check(ex.id,'legs drive before the arms pull: at mid-drive the handle has barely moved',
      Math.abs(S[1].handN.x-S[0].handN.x)<12 && S[1].hip.x>S[0].hip.x+6,
      'handle moved '+r(Math.abs(S[1].handN.x-S[0].handN.x))+' while the seat moved '+r(S[1].hip.x-S[0].hip.x));
    check(ex.id,'the finish pulls the handle in to the body', S[2].handN.x<S[1].handN.x-16,
      'mid '+r(S[1].handN.x)+' finish '+r(S[2].handN.x));
  }
  if(ex.id==='fly_cable'||ex.id==='fly_cable_high'){
    check(ex.id,'the hands sweep together across the body', ex.front &&
      (ex.front[0].handR[0]-ex.front[0].handL[0]) - (ex.front[2].handR[0]-ex.front[2].handL[0]) > 50,
      'gap '+(ex.front?r(ex.front[0].handR[0]-ex.front[0].handL[0]):'?')+' -> '+(ex.front?r(ex.front[2].handR[0]-ex.front[2].handL[0]):'?'));
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
      ex.front[2].handL[1] > ex.front[0].handL[1]+40,
      'start '+ex.front[0].handL[1]+' finish '+ex.front[2].handL[1]);
    check(ex.id,'its pulleys are set above the mid fly\'s',
      ex.anchorAt[1] < mid.anchorAt[1]-20,'high anchor '+ex.anchorAt[1]+' mid '+mid.anchorAt[1]);
  }
  if(ex.id==='fly_cable'){
    check(ex.id,'the hands meet around chest height, not at the hips',
      Math.abs(ex.front[2].handL[1]-(107-34))<22,'hands finish at y '+ex.front[2].handL[1]);
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
    return S[2].handN.x-S[0].handN.x;
  }
  var chest=span('fly_cable'), high=span('fly_cable_high'), rev=span('fly_cable_rev');
  if(chest===null||high===null||rev===null) return;
  check('fly_cable_rev','it travels the opposite way to the chest flys',
    rev<0 && chest>0, 'reverse '+r(rev)+', cable fly '+r(chest));
  // The high fly comes DOWN across the body; the mid fly stays level. That
  // vertical travel is the whole reason for having both, so it is what
  // separates them, not where they happen to finish.
  function drop(id){ var f=get(id).frames; return f[2].handN[1]-f[0].handN[1]; }
  check('fly_cable_high','the high fly comes down across the body',drop('fly_cable_high')>35,
    'it drops '+r(drop('fly_cable_high')));
  check('fly_cable','the mid fly stays roughly level, so the two are not one arc',
    Math.abs(drop('fly_cable'))<15, 'it drops '+r(drop('fly_cable')));
})();

console.log('=== ANALYSIS ===');
if(!fails.length) console.log('PASS: all '+EX.length+' exercises match their movement criteria.');
else { console.log('FAILURES ('+fails.length+'):'); fails.forEach(function(f){console.log('  x '+f);}); }
if(warns.length){ console.log('\nSoft warnings ('+warns.length+'):'); warns.forEach(function(w){console.log('  ! '+w);}); }
process.exit(fails.length?1:0);
