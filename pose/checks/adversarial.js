var rig=require('../rig.js'), EX=require('../exercises.js');
var solve=rig.solve, L=rig.L, GROUND=rig.GROUND;
function r(n){return Math.round(n*10)/10;}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
var fails=[];
function ck(id,label,cond,detail){ if(!cond) fails.push(id+' :: '+label+'  ['+detail+']'); }

EX.forEach(function(ex){
  var S=ex.frames.map(solve);
  S.forEach(function(s,i){
    var tag=ex.id+' f'+i;
    // RIG INTEGRITY: limbs must be exactly their anatomical length (no IK stretching).
    ck(tag,'thigh length intact', Math.abs(d(s.hip,s.kneeN)-L.THIGH)<0.6,'got '+r(d(s.hip,s.kneeN)));
    ck(tag,'shin length intact', Math.abs(d(s.kneeN,s.ankN)-L.SHIN)<0.6,'got '+r(d(s.kneeN,s.ankN)));
    ck(tag,'upper arm length intact', Math.abs(d(s.sh,s.elbN)-L.UPPER)<0.6,'got '+r(d(s.sh,s.elbN)));
    ck(tag,'forearm length intact', Math.abs(d(s.elbN,s.handN)-L.FORE)<0.6,'got '+r(d(s.elbN,s.handN)));
    // PROPORTION: 7.5-head canon sanity, head must be small relative to the body.
    ck(tag,'head is not oversized', L.HEAD_R*2 < L.TORSO*0.55,'head dia '+(L.HEAD_R*2)+' vs torso '+L.TORSO);
  });

  if(ex.id==='backsquat'||ex.id==='frontsquat'||ex.id==='goblet'){
    var bot=S[2];
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
    var lock=S[0], chest=S[2];
    ck(ex.id,'bar stays over the torso, not out past the hips', chest.handN.x<lock.sh.x+35,
      'bar '+r(chest.handN.x)+' shoulder '+r(lock.sh.x));
    ck(ex.id,'bar stays above the chest surface (does not clip through)', chest.handN.y<chest.sh.y-6,
      'bar '+r(chest.handN.y)+' torso '+r(chest.sh.y));
    ck(ex.id,'knees bent, not straight legs on a bench', d(chest.hip,chest.ankN)<L.THIGH+L.SHIN-4,
      'hip-ankle '+r(d(chest.hip,chest.ankN)));
  }
  if(ex.id==='ohp'){
    ck(ex.id,'lockout stacks over midfoot', Math.abs(S[2].handN.x-S[2].ankN.x)<12,
      'bar '+r(S[2].handN.x)+' foot '+r(S[2].ankN.x));
    ck(ex.id,'bar passes the face, not through the head', S[1].handN.x>S[1].head.x-2,
      'bar '+r(S[1].handN.x)+' head '+r(S[1].head.x));
  }
  if(ex.id==='row'){
    ck(ex.id,'bar does not swing through the legs', S[2].handN.y<S[2].kneeN.y-8,
      'bar '+r(S[2].handN.y)+' knee '+r(S[2].kneeN.y));
    ck(ex.id,'hinged torso is well past upright', ex.frames[0].torso>45,'torso '+ex.frames[0].torso);
  }
  if(ex.id==='pullup'){
    S.forEach(function(s,i){
      ck(ex.id+' f'+i,'arm is not overstretched beyond reach', d(s.sh,s.handN)<=L.UPPER+L.FORE+0.5,
        'reach '+r(d(s.sh,s.handN))+' max '+(L.UPPER+L.FORE));
    });
    ck(ex.id,'arms are clearly flexed at the top', d(S[2].sh,S[2].handN)<30,
      'reach at top '+r(d(S[2].sh,S[2].handN)));
  }
  if(ex.id==='kbswing'){
    var hike=S[0];
    ck(ex.id,'bell passes UNDER the hips on the backswing', hike.handN.y>hike.hip.y+10,
      'bell '+r(hike.handN.y)+' hip '+r(hike.hip.y));
    ck(ex.id,'arms stay straight on the backswing', d(hike.sh,hike.handN)>34,
      'reach '+r(d(hike.sh,hike.handN)));
    ck(ex.id,'top is not an overhead swing', S[2].handN.y>S[2].head.y,
      'bell '+r(S[2].handN.y)+' head '+r(S[2].head.y));
  }
  if(ex.id==='deadbug'){
    var ext=S[1];
    ck(ex.id,'extended limbs hover, not driven into the floor', ext.ankN.y<GROUND-8 && ext.handN.y<GROUND-8,
      'ankle '+r(ext.ankN.y)+' hand '+r(ext.handN.y));
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

console.log('=== ADVERSARIAL ANALYSIS ===');
if(!fails.length) console.log('PASS: no violations across '+EX.length+' exercises.');
else { console.log('FAILURES ('+fails.length+'):'); fails.forEach(function(f){console.log('  x '+f);}); }
process.exit(fails.length?1:0);
