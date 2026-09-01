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
    ck(tag,'thigh length intact', Math.abs(d(s.hipL,s.kneeL)-L.THIGH)<0.8,'got '+r(d(s.hipL,s.kneeL)));
    ck(tag,'shin length intact', Math.abs(d(s.kneeL,s.footL)-L.SHIN)<0.8,'got '+r(d(s.kneeL,s.footL)));
    ck(tag,'upper arm intact', Math.abs(d(s.shR,s.elbR)-L.UPPER)<0.8,'got '+r(d(s.shR,s.elbR)));
    ck(tag,'forearm intact', Math.abs(d(s.elbR,s.handR)-L.FORE)<0.8,'got '+r(d(s.elbR,s.handR)));
    ck(tag,'legs never over-extend', d(s.hipL,s.footL)<=L.THIGH+L.SHIN+0.5,'reach '+r(d(s.hipL,s.footL)));
    ck(tag,'arms never over-extend', d(s.shR,s.handR)<=L.UPPER+L.FORE+0.5,'reach '+r(d(s.shR,s.handR)));
    ck(tag,'stays above the floor', Math.max(s.footL.y,s.footR.y,s.hipC.y)<=GROUND+1,'lowest '+r(Math.max(s.footL.y,s.footR.y)));
    ck(tag,'left stays left of right', s.hipL.x<s.hipR.x && s.footL.x<s.footR.x,'sides crossed');
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
  if(ex.id==='pullup') ck(ex.id+' front','hands stay fixed on the bar',
    A.handL.x===B.handL.x && A.handL.y===B.handL.y,'hands moved');
  if(ex.id==='jabcross'){
    var g=rig.solveFront(ex.front[0]), jb=rig.solveFront(ex.front[1]), cr=rig.solveFront(ex.front[3]);
    ck(ex.id+' front','jab and cross are thrown by different hands',
      (jb.handR.x>g.handR.x+4) && (cr.handL.x<g.handL.x-4),
      'jab R '+r(jb.handR.x)+' vs guard '+r(g.handR.x)+'; cross L '+r(cr.handL.x)+' vs guard '+r(g.handL.x));
  }
});

console.log('=== VIEW + FLAGGED-FIX CHECK ===');
if(!fails.length) console.log('PASS: bench presses vertically, jab and cross differ, all front views valid.');
else { console.log('FAILURES ('+fails.length+'):'); var seen={};
  fails.forEach(function(f){ var k=f.split('  [')[0]; if(seen[k])return; seen[k]=1; console.log('  x '+f); }); }
process.exit(fails.length?1:0);
