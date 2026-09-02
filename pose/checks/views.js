var rig=require('../rig.js'), EX=require('../exercises.js');
var L=rig.L, GROUND=rig.GROUND;
function r(n){return Math.round(n*10)/10;}
function d(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
var fails=[];
function ck(id,label,cond,detail){ if(!cond) fails.push(id+' :: '+label+'  ['+detail+']'); }
function get(id){ return EX.filter(function(e){return e.id===id;})[0]; }

// --- user-flagged: bench must press straight up ---
(function(){
  var S=get('bench').frames.map(rig.solve);
  var xs=S.map(function(s){return s.handN.x;});
  ck('bench','bar path is vertical, no sideways drift',
    Math.max.apply(null,xs)-Math.min.apply(null,xs)<2,'drift '+r(Math.max.apply(null,xs)-Math.min.apply(null,xs)));
  ck('bench','bar sits over the chest, not the face or belly',
    S[0].handN.x>S[0].sh.x+8 && S[0].handN.x<S[0].hip.x-12,
    'bar '+r(S[0].handN.x)+' shoulder '+r(S[0].sh.x)+' hip '+r(S[0].hip.x));
  ck('bench','elbow drops below the bench line at the bottom', S[2].elbN.y>S[2].sh.y,
    'elbow '+r(S[2].elbN.y)+' torso '+r(S[2].sh.y));
  ck('bench','locks out near full arm extension', d(S[0].sh,S[0].handN)>36,
    'reach '+r(d(S[0].sh,S[0].handN)));
})();

// --- user-flagged: jab and cross must be visibly different ---
(function(){
  var ex=get('jabcross'), S=ex.frames.map(rig.solve);
  var jab=S[1], cross=S[3];
  ck('jabcross','the two punches use different arm angles',
    JSON.stringify(ex.frames[1].armN)!==JSON.stringify(ex.frames[3].armF),
    'jab '+JSON.stringify(ex.frames[1].armN)+' cross '+JSON.stringify(ex.frames[3].armF));
  ck('jabcross','cross rotates the torso further than the jab',
    ex.frames[3].torso > ex.frames[1].torso+6,
    'jab '+ex.frames[1].torso+' cross '+ex.frames[3].torso);
  ck('jabcross','cross reaches further than the jab',
    cross.handF.x > jab.handN.x+3,'jab '+r(jab.handN.x)+' cross '+r(cross.handF.x));
  ck('jabcross','rear heel pivots off the floor on the cross',
    ex.frames[3].ankF[1] < ex.frames[1].ankF[1],
    'cross heel '+ex.frames[3].ankF[1]+' jab heel '+ex.frames[1].ankF[1]);
  ck('jabcross','lead hand stays guarding during the cross',
    cross.handN.x < cross.handF.x-20,'lead '+r(cross.handN.x)+' rear '+r(cross.handF.x));
  ck('jabcross','rear hand stays guarding during the jab',
    jab.handF.x < jab.handN.x-20,'rear '+r(jab.handF.x)+' lead '+r(jab.handN.x));
})();

// --- front-plane views ---
EX.filter(function(e){return e.front;}).forEach(function(ex){
  for(var i=0;i<40;i++){
    var f=rig.frontAt(ex,i/40), s=rig.solveFront(f), tag=ex.id+' front';
    ck(tag,'thigh never exceeds its length', d(s.hipL,s.kneeL)<=L.THIGH+0.8,'got '+r(d(s.hipL,s.kneeL)));
    ck(tag,'shin never exceeds its length', d(s.kneeL,s.footL)<=L.SHIN+0.8,'got '+r(d(s.kneeL,s.footL)));
    ck(tag,'right thigh never exceeds its length', d(s.hipR,s.kneeR)<=L.THIGH+0.8,'got '+r(d(s.hipR,s.kneeR)));
    ck(tag,'right shin never exceeds its length', d(s.kneeR,s.footR)<=L.SHIN+0.8,'got '+r(d(s.kneeR,s.footR)));
    // A limb angled toward the camera projects SHORTER than it is. The
    // invariant a projection must obey is therefore an upper bound, not an
    // equality: no drawn segment may ever exceed its anatomical length.
    ck(tag,'upper arm never exceeds its length', d(s.shR,s.elbR)<=L.UPPER+0.8,'got '+r(d(s.shR,s.elbR)));
    ck(tag,'forearm never exceeds its length', d(s.elbR,s.handR)<=L.FORE+0.8,'got '+r(d(s.elbR,s.handR)));
    ck(tag,'left upper arm never exceeds its length', d(s.shL,s.elbL)<=L.UPPER+0.8,'got '+r(d(s.shL,s.elbL)));
    ck(tag,'left forearm never exceeds its length', d(s.elbL,s.handL)<=L.FORE+0.8,'got '+r(d(s.elbL,s.handL)));
    ck(tag,'legs never over-extend', d(s.hipL,s.footL)<=L.THIGH+L.SHIN+0.5,'reach '+r(d(s.hipL,s.footL)));
    ck(tag,'arms never over-extend', d(s.shR,s.handR)<=L.UPPER+L.FORE+0.5,'reach '+r(d(s.shR,s.handR)));
    ck(tag,'stays above the floor', Math.max(s.footL.y,s.footR.y,s.hipC.y)<=GROUND+1,'lowest '+r(Math.max(s.footL.y,s.footR.y)));
    ck(tag,'left stays left of right', s.hipL.x<s.hipR.x && s.footL.x<s.footR.x,'sides crossed');
    // A human elbow never bends upward, but that only constrains an arm working
    // from BELOW the shoulder. Overhead (a triceps extension, a face pull with
    // high elbows, a pull-up) the elbow is legitimately the apex, so the rule
    // applies only when the hand is below the shoulder.
    if(!ex.frontPlan){
    if(s.handL.y>s.shL.y) ck(tag,'left elbow never bends upward', s.elbL.y>=s.shL.y-1,
      'elbow '+r(s.elbL.y)+' shoulder '+r(s.shL.y)+' hand '+r(s.handL.y));
    if(s.handR.y>s.shR.y) ck(tag,'right elbow never bends upward', s.elbR.y>=s.shR.y-1,
      'elbow '+r(s.elbR.y)+' shoulder '+r(s.shR.y)+' hand '+r(s.handR.y));
    }
    ck(tag,'shoulders are wider than the hips', s.shR.x-s.shL.x > s.hipR.x-s.hipL.x,
      'shoulders '+r(s.shR.x-s.shL.x)+' hips '+r(s.hipR.x-s.hipL.x));

  }
  var A=rig.solveFront(ex.front[0]), B=rig.solveFront(ex.front[2]);
  if(['backsquat','frontsquat','goblet','kbswing'].indexOf(ex.id)>=0){
    ck(ex.id+' front','knees track outside the hips at depth',
      B.kneeL.x < B.hipL.x && B.kneeR.x > B.hipR.x,
      'kneeL '+r(B.kneeL.x)+' hipL '+r(B.hipL.x));
    ck(ex.id+' front','feet stay planted through the rep',
      A.footL.x===B.footL.x && A.footL.y===B.footL.y,'foot moved');
  }
  if(ex.id==='backsquat') ck(ex.id+' front','grip is wider than the shoulders',
    A.handL.x < A.shL.x-8,'hand '+r(A.handL.x)+' shoulder '+r(A.shL.x));
  if(ex.id==='goblet') ck(ex.id+' front','both hands together on one bell at the midline',
    Math.abs(A.handL.x-A.handR.x)<12,'gap '+r(Math.abs(A.handL.x-A.handR.x)));
  if(ex.id==='ohp') ck(ex.id+' front','bar finishes overhead above the head',
    B.handL.y < B.head.y,'hand '+r(B.handL.y)+' head '+r(B.head.y));
  // Exact equality here; the whole-rep drift bound is checked separately.
  if(ex.id==='pullup') ck(ex.id+' front','hands stay fixed on the bar',
    A.handL.x===B.handL.x && Math.abs(A.handL.y-B.handL.y)<1.2,'hands moved');
  if(ex.id==='jabcross'){
    var g=rig.solveFront(ex.front[0]), jb=rig.solveFront(ex.front[1]), cr=rig.solveFront(ex.front[3]);
    // A straight punch goes at the camera, so it must foreshorten toward the
    // centreline and grow, never swing out sideways like a hook.
    ck(ex.id+' front','jab fist travels toward the centreline, not outward',
      jb.handR.x < g.handR.x && jb.handR.x >= 68,'guard '+r(g.handR.x)+' jab '+r(jb.handR.x));
    ck(ex.id+' front','cross fist travels toward the centreline, not outward',
      cr.handL.x > g.handL.x && cr.handL.x <= 72,'guard '+r(g.handL.x)+' cross '+r(cr.handL.x));
    ck(ex.id+' front','jab fist foreshortens (grows toward viewer)', jb.fistR>1.5,'scale '+r(jb.fistR));
    ck(ex.id+' front','cross fist foreshortens further than the jab', cr.fistL>jb.fistR,
      'cross '+r(cr.fistL)+' jab '+r(jb.fistR));
    ck(ex.id+' front','only the punching hand foreshortens',
      jb.fistL===1 && cr.fistR===1,'jab off-hand '+r(jb.fistL)+' cross off-hand '+r(cr.fistR));
    ck(ex.id+' front','rear shoulder rotates through on the cross', cr.shC.x>g.shC.x+3,
      'guard '+r(g.shC.x)+' cross '+r(cr.shC.x));
    ck(ex.id+' front','stance is staggered in depth (lead foot nearer/lower)',
      g.footR.y>g.footL.y+3,'lead '+r(g.footR.y)+' rear '+r(g.footL.y));
  }
});

// A bar fixed in space must stay fixed. The body travels to it on a pull-up;
// if the derivation lets the hands drift, the bar swings instead.
EX.filter(function(e){return e.front && e.equip==='fixedbar';}).forEach(function(ex){
  var ys=[]; for(var i=0;i<120;i++) ys.push(rig.solveFront(rig.frontAt(ex,i/120)).handL.y);
  var spread=Math.max.apply(null,ys)-Math.min.apply(null,ys);
  ck(ex.id+' front','the fixed bar does not move', spread<1.2,'drifts '+r(spread));
});

// Reach across the whole continuous rep, not just the keyframes. Front frames
// that raise the shoulder (torso foreshortening) while leaving the hands low
// silently stretch the arm past its length; the IK clamps it, so the figure
// still draws and nothing looks obviously wrong in a still.
EX.forEach(function(ex){
  if(!ex.front) return;
  var n=0, worst=0, at=0;
  for(var i=0;i<120;i++){
    var s=rig.solveFront(rig.frontAt(ex,i/120));
    var armMaxL=(L.UPPER+L.FORE)*s.armScaleL, armMaxR=(L.UPPER+L.FORE)*s.armScaleR, leg=L.THIGH+L.SHIN;
    [[d(s.shL,s.handL),armMaxL],[d(s.shR,s.handR),armMaxR],
     [d(s.hipL,s.footL),leg],[d(s.hipR,s.footR),leg]].forEach(function(p){
      if(p[0]>p[1]+0.5){ n++; if(p[0]-p[1]>worst){worst=p[0]-p[1]; at=i;} }
    });
  }
  ck(ex.id+' front','limbs never over-extend anywhere in the rep', n===0,
    n+' samples, worst +'+r(worst)+' at '+at+'/120');
});

console.log('=== VIEW + FLAGGED-FIX CHECK ===');
if(!fails.length) console.log('PASS: bench presses vertically, jab and cross differ, all front views valid.');
else { console.log('FAILURES ('+fails.length+'):'); var seen={};
  fails.forEach(function(f){ var k=f.split('  [')[0]; if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
process.exit(fails.length?1:0);
