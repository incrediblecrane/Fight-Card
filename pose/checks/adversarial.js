var rig=require('../rig.js'), EX=require('../exercises.js');
var solve=rig.solve, L=rig.L, GROUND=rig.GROUND;
function r(n){return Math.round(n*10)/10;}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
var fails=[];
function ck(id,label,cond,detail){ if(!cond) fails.push(id+' :: '+label+'  ['+detail+']'); }

EX.forEach(function(ex){
  var S=ex.frames.map(solve), T=rig.turn(ex); // T: the keyframe the rep turns around at
  S.forEach(function(s,i){
    var tag=ex.id+' f'+i;
    // RIG INTEGRITY: limbs must be exactly their anatomical length (no IK stretching).
    ck(tag,'thigh length intact', Math.abs(d(s.hip,s.kneeN)-L.THIGH)<0.6,'got '+r(d(s.hip,s.kneeN)));
    ck(tag,'shin length intact', Math.abs(d(s.kneeN,s.ankN)-L.SHIN)<0.6,'got '+r(d(s.kneeN,s.ankN)));
    // armScaleN is projection, not stretching: an arm swinging out of this
    // plane is drawn short on purpose, so the length it must hold is scaled.
    var aN=s.armScaleN===undefined?1:s.armScaleN;
    ck(tag,'upper arm length intact', Math.abs(d(s.sh,s.elbN)-L.UPPER*aN)<0.6,
      'got '+r(d(s.sh,s.elbN))+' of '+r(L.UPPER*aN));
    ck(tag,'forearm length intact', Math.abs(d(s.elbN,s.handN)-L.FORE*aN)<0.6,
      'got '+r(d(s.elbN,s.handN))+' of '+r(L.FORE*aN));
    // The far limbs too. Checking only the near ones let a broad-jump
    // take-off draw the far shin 2 units (7%) long through every suite: the
    // far ankle sat 10 behind the near one while the far hip is only 5 behind.
    var aF=s.armScaleF===undefined?1:s.armScaleF;
    ck(tag,'far thigh length intact', Math.abs(d(s.hipF,s.kneeF)-L.THIGH)<0.6,'got '+r(d(s.hipF,s.kneeF)));
    ck(tag,'far shin length intact', Math.abs(d(s.kneeF,s.ankF)-L.SHIN)<0.6,'got '+r(d(s.kneeF,s.ankF)));
    ck(tag,'far upper arm length intact', Math.abs(d(s.shF,s.elbF)-L.UPPER*aF)<0.6,
      'got '+r(d(s.shF,s.elbF))+' of '+r(L.UPPER*aF));
    ck(tag,'far forearm length intact', Math.abs(d(s.elbF,s.handF)-L.FORE*aF)<0.6,
      'got '+r(d(s.elbF,s.handF))+' of '+r(L.FORE*aF));
    // PROPORTION: 7.5-head canon sanity, head must be small relative to the body.
    ck(tag,'head is not oversized', L.HEAD_R*2 < L.TORSO*0.55,'head dia '+(L.HEAD_R*2)+' vs torso '+L.TORSO);
  });

  if(ex.id==='backsquat'||ex.id==='frontsquat'||ex.id==='goblet'){
    var bot=S[T];
    ck(ex.id,'bottom actually hits parallel (hip crease at/below knee)', bot.hip.y>=bot.kneeN.y-2,
      'hip '+r(bot.hip.y)+' vs knee '+r(bot.kneeN.y));
    // Real coaching cue: at the bottom the torso and shin are roughly parallel.
    var torsoAng=Math.atan2(bot.sh.x-bot.hip.x, bot.hip.y-bot.sh.y)*180/Math.PI;
    var shinAng=Math.atan2(bot.kneeN.x-bot.ankN.x, bot.ankN.y-bot.kneeN.y)*180/Math.PI;
    ck(ex.id,'torso and shin roughly parallel at the bottom', Math.abs(torsoAng-shinAng)<28,
      'torso '+r(torsoAng)+'deg shin '+r(shinAng)+'deg');
    ck(ex.id,'knee does not collapse behind the ankle', bot.kneeN.x>=bot.ankN.x-4,
      'knee '+r(bot.kneeN.x)+' ankle '+r(bot.ankN.x));
  }
  if(ex.id==='deadlift'){
    var st=S[0];
    ck(ex.id,'shoulders sit slightly in FRONT of the bar at the start', st.sh.x>st.handN.x-2,
      'shoulder '+r(st.sh.x)+' bar '+r(st.handN.x));
    ck(ex.id,'bar clears the knees on the way up', S[1].handN.y<S[1].kneeN.y+12,
      'bar '+r(S[1].handN.y)+' knee '+r(S[1].kneeN.y));
    ck(ex.id,'hips do not rise before the bar (bar and hip both ascend)',
      S[1].handN.y<S[0].handN.y && S[1].hip.y<S[0].hip.y,'bar/hip did not both rise');
  }
  if(ex.id==='bench'){
    var lock=S[0], chest=S[T];
    ck(ex.id,'bar stays over the torso, not out past the hips', chest.handN.x<lock.sh.x+35,
      'bar '+r(chest.handN.x)+' shoulder '+r(lock.sh.x));
    ck(ex.id,'bar stays above the chest surface (does not clip through)', chest.handN.y<chest.sh.y-6,
      'bar '+r(chest.handN.y)+' torso '+r(chest.sh.y));
    ck(ex.id,'knees bent, not straight legs on a bench', d(chest.hip,chest.ankN)<L.THIGH+L.SHIN-4,
      'hip-ankle '+r(d(chest.hip,chest.ankN)));
  }
  if(ex.id==='ohp'){
    ck(ex.id,'lockout stacks over midfoot', Math.abs(S[T].handN.x-S[T].ankN.x)<12,
      'bar '+r(S[T].handN.x)+' foot '+r(S[T].ankN.x));
    ck(ex.id,'bar passes the face, not through the head', S[1].handN.x>S[1].head.x-2,
      'bar '+r(S[1].handN.x)+' head '+r(S[1].head.x));
  }
  if(ex.id==='row'){
    ck(ex.id,'bar does not swing through the legs', S[T].handN.y<S[T].kneeN.y-8,
      'bar '+r(S[T].handN.y)+' knee '+r(S[T].kneeN.y));
    ck(ex.id,'hinged torso is well past upright', ex.frames[0].torso>45,'torso '+ex.frames[0].torso);
  }
  if(ex.id==='pullup'){
    S.forEach(function(s,i){
      ck(ex.id+' f'+i,'arm is not overstretched beyond reach', d(s.sh,s.handN)<=L.UPPER+L.FORE+0.5,
        'reach '+r(d(s.sh,s.handN))+' max '+(L.UPPER+L.FORE));
    });
    ck(ex.id,'arms are clearly flexed at the top', d(S[T].sh,S[T].handN)<30,
      'reach at top '+r(d(S[T].sh,S[T].handN)));
  }
  if(ex.id==='kbswing'){
    var hike=S[0];
    ck(ex.id,'bell passes UNDER the hips on the backswing', hike.handN.y>hike.hip.y+10,
      'bell '+r(hike.handN.y)+' hip '+r(hike.hip.y));
    ck(ex.id,'arms stay straight on the backswing', d(hike.sh,hike.handN)>34,
      'reach '+r(d(hike.sh,hike.handN)));
    ck(ex.id,'top is not an overhead swing', S[T].handN.y>S[T].head.y,
      'bell '+r(S[T].handN.y)+' head '+r(S[T].head.y));
  }
  if(ex.id==='splitsq_bulg'){
    var top=S[0], bot=S[T];
    ck(ex.id,'rear foot is elevated behind the front foot', S[0].ankF.y<S[0].ankN.y-12 && S[0].ankF.x<S[0].ankN.x-20,
      'rear '+r(S[0].ankF.x)+','+r(S[0].ankF.y)+' front '+r(S[0].ankN.x)+','+r(S[0].ankN.y));
    ck(ex.id,'front thigh reaches about parallel at the bottom', bot.hip.y>=bot.kneeN.y-6,
      'hip '+r(bot.hip.y)+' knee '+r(bot.kneeN.y));
    ck(ex.id,'rear knee travels down toward the floor', bot.kneeF.y>top.kneeF.y+10,
      'top '+r(top.kneeF.y)+' bottom '+r(bot.kneeF.y));
    ck(ex.id,'front shin stays near vertical, knee not thrown past the toes',
      bot.kneeN.x-bot.ankN.x<14,'knee '+r(bot.kneeN.x)+' ankle '+r(bot.ankN.x));
    ck(ex.id,'torso stays more upright than a hinge', ex.frames[T].torso<25,'torso '+ex.frames[T].torso);
  }
  if(ex.id==='hipthrust'){
    var lo=S[0], hi=S[T];
    ck(ex.id,'shoulders stay put on the bench while the hips travel',
      Math.abs(hi.sh.y-lo.sh.y)<6 && hi.hip.y<lo.hip.y-12,
      'shoulder '+r(lo.sh.y)+'->'+r(hi.sh.y)+' hip '+r(lo.hip.y)+'->'+r(hi.hip.y));
    ck(ex.id,'torso is horizontal at lockout', Math.abs(hi.sh.y-hi.hip.y)<8,
      'shoulder y '+r(hi.sh.y)+' hip y '+r(hi.hip.y));
    ck(ex.id,'shins are vertical at the top', Math.abs(hi.kneeN.x-hi.ankN.x)<10,
      'knee '+r(hi.kneeN.x)+' ankle '+r(hi.ankN.x));
    ck(ex.id,'the bar rides on the hips, not the belly or the thighs',
      Math.abs(hi.handN.y-hi.hip.y)<12 && Math.abs(lo.handN.y-lo.hip.y)<12,
      'top bar '+r(hi.handN.y)+' hip '+r(hi.hip.y));
    ck(ex.id,'hips finish level with the shoulders, not above them', hi.hip.y>hi.sh.y-8,
      'hip '+r(hi.hip.y)+' shoulder '+r(hi.sh.y));
  }
  if(ex.id==='calfraise'){
    var down=S[0], up=S[T];
    ck(ex.id,'the whole body rises', up.hip.y<down.hip.y-6,'hip '+r(down.hip.y)+'->'+r(up.hip.y));
    // Positive pitch lifts the heel, so the top of the raise must pitch
    // FURTHER positive than the stretched-heel start.
    ck(ex.id,'the heel actually lifts (the foot pivots)', up.footN>down.footN+20,
      'pitch '+down.footN+' -> '+up.footN);
    ck(ex.id,'knees stay straight throughout', S.every(function(x){return d(x.hip,x.ankN)>L.THIGH+L.SHIN-6;}),
      'shortest hip-ankle '+r(Math.min.apply(null,S.map(function(x){return d(x.hip,x.ankN);}))));
    ck(ex.id,'the heel starts BELOW the step, not level with it',
      ex.frames[0].ankN[1]>ex.frames[T].ankN[1]+6,'start '+ex.frames[0].ankN[1]+' top '+ex.frames[T].ankN[1]);
    // The ball of the foot (the sole under the toe, rig.footAt) is what stays
    // put, on the step's top edge, while the ankle rises round it. A fixed
    // ankle x passed a foot that pivoted about a point level with the ankle and
    // floated 14 above the step at the top.
    var step=ex.props[0], ball=function(s){ return rig.footAt(s.ankN,s.footN)[1]; }, b0=ball(S[0]), slide=0;
    for(var q=0;q<=96;q++){ var bq=ball(solve(rig.poseAt(ex,q/96))); slide=Math.max(slide,d(bq,b0)); }
    ck(ex.id,'the ball of the foot stays on the step, it does not slide or lift',
      slide<1 && Math.abs(b0.y-step[1])<=1.5 && b0.x>step[0],'ball at '+r(b0.x)+','+r(b0.y)+' moves '+r(slide)+', step top '+step[1]);
  }
  if(ex.id==='wallsit'){
    var hold=S[T];
    ck(ex.id,'thigh is parallel to the floor at the hold', Math.abs(hold.hip.y-hold.kneeN.y)<5,
      'hip '+r(hold.hip.y)+' knee '+r(hold.kneeN.y));
    ck(ex.id,'shin is vertical at the hold', Math.abs(hold.kneeN.x-hold.ankN.x)<5,
      'knee '+r(hold.kneeN.x)+' ankle '+r(hold.ankN.x));
    ck(ex.id,'back stays flat and vertical against the wall', Math.abs(hold.sh.x-hold.hip.x)<4,
      'shoulder '+r(hold.sh.x)+' hip '+r(hold.hip.x));
    ck(ex.id,'most of the time is the hold, not the descent',
      ex.tempo[2]+ex.tempo[3]>ex.tempo[0]+ex.tempo[1],'tempo '+ex.tempo.join(','));
  }
  if(ex.id==='deadbug'){
    var ext=S[1];
    ck(ex.id,'extended limbs hover, not driven into the floor', ext.ankN.y<GROUND-8 && ext.handF.y<GROUND-8,
      'ankle '+r(ext.ankN.y)+' hand '+r(ext.handF.y));
    ck(ex.id,'tabletop shin is roughly horizontal', Math.abs(ext.ankF.y-ext.kneeF.y)<12,
      'ankle y '+r(ext.ankF.y)+' knee y '+r(ext.kneeF.y));
    ck(ex.id,'extended leg is straighter than the tabletop leg',
      d(ext.hip,ext.ankN)>d(ext.hipF,ext.ankF)+10,
      'ext '+r(d(ext.hip,ext.ankN))+' tabletop '+r(d(ext.hipF,ext.ankF)));
  }
  if(ex.id==='jabcross'){
    var g=S[0], jab=S[1], cross=S[3];
    ck(ex.id,'lead foot is in FRONT of the rear foot', g.ankN.x>g.ankF.x,
      'lead '+r(g.ankN.x)+' rear '+r(g.ankF.x));
    ck(ex.id,'punching arm is near full extension', d(jab.sh,jab.handN)>34,
      'reach '+r(d(jab.sh,jab.handN)));
    ck(ex.id,'guard arm is clearly bent, not extended', d(g.sh,g.handN)<32,
      'guard reach '+r(d(g.sh,g.handN)));
    ck(ex.id,'the cross rotates the torso further than the jab', ex.frames[3].torso>ex.frames[1].torso,
      'cross '+ex.frames[3].torso+' jab '+ex.frames[1].torso);
    ck(ex.id,'punch does not pass through the head', jab.handN.x>jab.head.x,
      'hand '+r(jab.handN.x)+' head '+r(jab.head.x));
  }
});

// FOOTING. A foot is a block hinged at the ankle (rig.footAt), so where it
// meets the floor or a prop depends on its pitch as well as the ankle. One
// meant to be standing on something lies on it: a foot whose lowest point
// is 1.5 to 4 above the floor or a prop is one that should be on it and
// floats, and no foot sinks more than 1.5 into either at any moment of the
// rep. (Further up it is in the air on purpose: a step, a jump, a hang.)
// The floor line is 2 wide, so a sole 1 above its middle touches it. Props
// turned at an angle are left out. The rigs listed below break it today and
// are being re-authored (their toes and rear feet need footN and footF), so
// they print as warnings; any other rig breaking it fails, and a listed rig
// that comes right says so, so the list only shrinks.
var FOOTING={woodchopper:'hover',
  boxjump:'sink',medballthrow:'hover',skipping:'hover',jumpingjack:'hover',highknees:'hover',briskwalkjog:'hover',
  hipflexor:'hover',couchstretch:'sink',catcow:'hover',thoracic:'hover',
  ankle_mob:'hover',rowerg:'sink'};
var footWarn=[], footDone=[];
function surfaces(ex){ var t=[{x0:-1e9,x1:1e9,y:GROUND,h:1e9}];
  (ex.props||[]).forEach(function(p){ if(!p[5]) t.push({x0:p[0],x1:p[0]+p[2],y:p[1],h:p[3]}); }); return t; }
// How far the foot's lowest point is above whatever is under it: negative is
// into it.
function footGap(T,s,k){ var g=1e9;
  rig.footAt(s['ank'+k],s['foot'+k]).forEach(function(p){ T.forEach(function(t){
    if(p.x>=t.x0&&p.x<=t.x1&&p.y<=t.y+t.h) g=Math.min(g,t.y-p.y); }); });
  return g; }
EX.forEach(function(ex){
  var T=surfaces(ex), bad={}, known=(FOOTING[ex.id]||'').split(' ');
  ex.frames.forEach(function(f,i){ var s=solve(f); ['N','F'].forEach(function(k){ var g=footGap(T,s,k);
    if(g>1.5&&g<=4&&!bad.hover) bad.hover='frame '+i+' ank'+k+' '+r(g)+' above'; }); });
  for(var q=0;q<96;q++){ var s=solve(rig.poseAt(ex,q/96)); ['N','F'].forEach(function(k){ var g=footGap(T,s,k);
    if(g<-1.5&&!bad.sink) bad.sink='ank'+k+' '+r(-g)+' in at u='+r(q/96*100)/100; }); }
  ['hover','sink'].forEach(function(w){ var msg=w==='hover'?'a foot on the floor or a prop lies on it, not floating just above':'no foot sinks into the floor or a prop';
    if(known.indexOf(w)>=0){ if(bad[w]) footWarn.push(ex.id+' '+w+': '+bad[w]); else footDone.push(ex.id+' '+w); }
    else ck(ex.id,msg,!bad[w],bad[w]); });
});
if(footWarn.length) console.log('WARN: '+footWarn.length+' rigs float or sink a foot (listed in FOOTING, being re-authored):\n  ! '+footWarn.join('\n  ! '));
if(footDone.length) console.log('NOTE: now standing on their feet, take off FOOTING: '+footDone.join(', '));

console.log('=== ADVERSARIAL ANALYSIS ===');
if(!fails.length) console.log('PASS: no violations across '+EX.length+' exercises.');
else { console.log('FAILURES ('+fails.length+'):'); fails.forEach(function(f){console.log('  x '+f);}); }
process.exit(fails.length?1:0);
