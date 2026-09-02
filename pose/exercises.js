// Exercise frames. Feet planted on GROUND=170 (ankle y=163) for standing lifts.
// Standing hip y = 105. Figure faces +x.
var EXERCISES = [
{ id:"backsquat", tempo:[520,520,380,380], name:"Back squat", flag:true,
  real:"Feet planted. Hips travel back AND down while the knees track forward over the toes; torso leans ~35&deg;. Bar stays locked on the traps, elbows down and back, and the bar tracks in a straight vertical line over midfoot.",
  changed:"Feet are now planted and the hips move relative to them, so the knees drive forward as the hips sit back. Previously the hip was pinned and the feet swung out, which is why it never looked like squatting.",
  equip:"barbell", active:"legs",
  frames:[
    {hip:[55,107],torso:5, ankN:[60,163],ankF:[50,163], armN:[215,15]},
    {hip:[50,122],torso:22,ankN:[60,163],ankF:[50,163], armN:[215,15]},
    {hip:[45,138],torso:35,ankN:[60,163],ankF:[50,163], armN:[215,15]},
    {hip:[50,122],torso:22,ankN:[60,163],ankF:[50,163], armN:[215,15]}
  ]},

{ id:"frontsquat", tempo:[520,520,380,380], name:"Front squat",
  real:"Same squat pattern but the bar is racked on the front delts, so the torso stays far more upright (~18&deg;) and the elbows are driven high and forward to keep the rack.",
  changed:"Torso now stays visibly more upright than the back squat, and the elbow sits high and forward instead of hanging.",
  equip:"barbell", active:"legs",
  frames:[
    {hip:[55,107],torso:3, ankN:[60,163],ankF:[50,163], armN:[96,310]},
    {hip:[51,122],torso:12,ankN:[60,163],ankF:[50,163], armN:[96,310]},
    {hip:[47,138],torso:18,ankN:[60,163],ankF:[50,163], armN:[96,310]},
    {hip:[51,122],torso:12,ankN:[60,163],ankF:[50,163], armN:[96,310]}
  ]},

{ id:"goblet", tempo:[500,500,380,380], name:"Goblet squat",
  real:"Bell or dumbbell held vertically at the sternum with both hands, elbows tucked down and inside the knees at the bottom. Torso stays upright, more like a front squat than a back squat.",
  changed:"Elbows now hang down and in with the weight at chest height, instead of the arms drifting out in front.",
  equip:"dumbbell", active:"legs",
  frames:[
    {hip:[55,107],torso:4, ankN:[60,163],ankF:[50,163], armN:[163,22]},
    {hip:[51,122],torso:16,ankN:[60,163],ankF:[50,163], armN:[163,22]},
    {hip:[47,137],torso:24,ankN:[60,163],ankF:[50,163], armN:[163,22]},
    {hip:[51,122],torso:16,ankN:[60,163],ankF:[50,163], armN:[163,22]}
  ]},

{ id:"deadlift", tempo:[420,420,520,520], name:"Conventional deadlift",
  real:"Bar starts on the floor over midfoot. Shins near vertical, hips well behind the bar, shoulders just in front of it, arms hanging dead straight. The bar travels in a straight vertical line to a hips-through lockout at upper thigh.",
  changed:"Bar now stays on one vertical line over midfoot the whole pull, with the hips set back behind it at the start and shins vertical, instead of a generic bend.",
  equip:"barbell", active:"legs",
  frames:[
    {hip:[27,135],torso:62,ankN:[57,163],ankF:[47,163], armN:[178,178]},
    {hip:[35,120],torso:40,ankN:[57,163],ankF:[47,163], armN:[178,178]},
    {hip:[55,107],torso:3, ankN:[57,163],ankF:[47,163], armN:[178,178]},
    {hip:[35,120],torso:40,ankN:[57,163],ankF:[47,163], armN:[178,178]}
  ]},

{ id:"rdl", tempo:[520,520,400,400], name:"Romanian deadlift",
  real:"Legs stay nearly straight with only a soft knee. The hips push far back, the bar shaves the thighs and stops around mid-shin, and the range is limited by the hamstrings, not the floor.",
  changed:"Knees now stay nearly locked and the hips travel much further back than the conventional pull, so it no longer looks like the same lift.",
  equip:"barbell", active:"legs",
  frames:[
    {hip:[55,107],torso:3, ankN:[57,163],ankF:[47,163], armN:[178,178]},
    {hip:[33,114],torso:45,ankN:[57,163],ankF:[47,163], armN:[178,178]},
    {hip:[24,117],torso:75,ankN:[57,163],ankF:[47,163], armN:[178,178]},
    {hip:[33,114],torso:45,ankN:[57,163],ankF:[47,163], armN:[178,178]}
  ]},

{ id:"bench", tempo:[500,500,380,380], name:"Bench press",
  real:"Lying on a bench with feet planted on the floor either side, knees bent. Bar starts locked out over the shoulders, lowers to the sternum with the elbows dropping below bench level, then presses back on a slight J-curve toward the shoulders.",
  changed:"There is now an actual bench under the body with the feet planted on the floor beside it. Without it this read as a floor press. The bar now presses on a straight vertical line over the lower chest; it previously drifted 20 units sideways, an exaggerated J-curve that read as pressing diagonally.",
  equip:"barbell", active:"arms", props:[[8,139,78,9],[20,148,7,22,0],[68,148,7,22,0]],
  frames:[
    {hip:[60,131],torso:270,ankN:[100,163],ankF:[91,163], handN:[40,94], handF:[35,94], kneeSign:-1, elbowSign:1},
    {hip:[60,131],torso:270,ankN:[100,163],ankF:[91,163], handN:[40,107],handF:[35,107],kneeSign:-1, elbowSign:1},
    {hip:[60,131],torso:270,ankN:[100,163],ankF:[91,163], handN:[40,120],handF:[35,120],kneeSign:-1, elbowSign:1},
    {hip:[60,131],torso:270,ankN:[100,163],ankF:[91,163], handN:[40,107],handF:[35,107],kneeSign:-1, elbowSign:1}
  ]},

{ id:"ohp", tempo:[480,480,420,420], name:"Overhead press",
  real:"Standing tall, bar racked on the front delts at collarbone height. It travels up past the face, the head moves back to clear it, then the arm locks out with the bar stacked directly over the shoulders and midfoot.",
  changed:"The lockout now puts the bar directly overhead in line with the body, and the rack position starts at the collarbone rather than being bench-press angles stood upright.",
  equip:"barbell", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[58,163],ankF:[49,163], armN:[150,15]},
    {hip:[55,107],torso:2,ankN:[58,163],ankF:[49,163], armN:[90,342]},
    {hip:[55,107],torso:2,ankN:[58,163],ankF:[49,163], armN:[0,0]},
    {hip:[55,107],torso:2,ankN:[58,163],ankF:[49,163], armN:[90,342]}
  ]},

{ id:"row", tempo:[420,420,480,480], name:"Bent-over row",
  real:"Hinged forward around 65&deg; with soft knees, torso held still. The arms hang dead straight under the shoulders, then the elbows drive back past the ribs, pulling the bar to the lower abdomen.",
  changed:"The arm now hangs straight down from the hinged shoulder rather than reaching upward, and the elbow drives backward past the torso on the pull.",
  equip:"barbell", active:"arms",
  frames:[
    {hip:[50,112],torso:65,ankN:[60,163],ankF:[50,163], armN:[178,178]},
    {hip:[50,112],torso:65,ankN:[60,163],ankF:[50,163], armN:[185,190]},
    {hip:[50,112],torso:65,ankN:[60,163],ankF:[50,163], armN:[200,265]},
    {hip:[50,112],torso:65,ankN:[60,163],ankF:[50,163], armN:[185,190]}
  ]},

{ id:"pullup", tempo:[430,430,540,540], name:"Pull-up",
  real:"The bar is fixed in space and the hands never move; the whole body travels up to it. Arms go from a dead straight hang to fully flexed with the chin above the bar, legs hanging slightly forward.",
  changed:"Hands are now pinned to a fixed bar and the body is solved from there, so the body rises to the bar instead of the bar drifting around with the hand.",
  equip:"fixedbar", active:"arms", barAt:[60,30],
  frames:[
    {hip:[58,104],torso:0,ankN:[54,160],ankF:[46,159], handN:[60,30],handF:[55,30], elbowSign:1},
    {hip:[58,88], torso:0,ankN:[52,144],ankF:[44,143], handN:[60,30],handF:[55,30], elbowSign:1},
    {hip:[58,72], torso:0,ankN:[52,128],ankF:[44,127], handN:[60,30],handF:[55,30], elbowSign:1},
    {hip:[58,88], torso:0,ankN:[52,144],ankF:[44,143], handN:[60,30],handF:[55,30], elbowSign:1}
  ]},

{ id:"kbswing", tempo:[300,260,300,320], name:"Kettlebell swing",
  real:"A hip hinge, not a squat. The bell is hiked back between the legs with straight arms, then the hips snap through and the bell floats up to chest height on momentum. The arms never lift it.",
  changed:"The backswing now hikes the bell behind the knees with the hips loaded back, and the top is a standing hip-through with the bell floating at chest height rather than being raised by the shoulders.",
  equip:"kettlebell", active:"legs",
  frames:[
    {hip:[32,118],torso:72,ankN:[60,163],ankF:[50,163], armN:[200,200]},
    {hip:[50,110],torso:25,ankN:[60,163],ankF:[50,163], armN:[125,125]},
    {hip:[55,107],torso:3, ankN:[60,163],ankF:[50,163], armN:[105,105]},
    {hip:[50,110],torso:25,ankN:[60,163],ankF:[50,163], armN:[125,125]}
  ]},

{ id:"splitsq_bulg", tempo:[540,540,420,420], name:"Bulgarian split squat",
  real:"Rear foot up on a bench behind you, front foot roughly two feet forward. Descend by bending the front knee until the front thigh is near parallel and the rear knee drops toward the floor. The torso leans slightly forward, the front shin stays close to vertical, and the front heel never lifts. The rear leg balances; it does not push.",
  changed:"Now has the bench behind it with the rear foot actually on it, so it reads as a split squat rather than a lunge. The rear knee travels down toward the floor while the front foot stays planted, which is the part the shared LUNGE pose could not show.",
  equip:"dumbbell", active:"legs", props:[[6,140,34,8],[10,148,6,22,0],[30,148,6,22,0]],
  frames:[
    {hip:[58,116],torso:6, ankN:[72,163],ankF:[26,140], armN:[178,178]},
    {hip:[57,126],torso:10,ankN:[72,163],ankF:[26,140], armN:[178,178]},
    {hip:[56,136],torso:14,ankN:[72,163],ankF:[26,140], armN:[178,178]},
    {hip:[57,126],torso:10,ankN:[72,163],ankF:[26,140], armN:[178,178]}
  ]},

{ id:"hipthrust", tempo:[420,420,520,520], name:"Hip thrust",
  real:"Upper back braced across a bench, feet planted, bar across the hips. Drive the hips straight up until the torso is horizontal and the shins are vertical, squeeze at the top, then lower under control. The shoulders stay on the bench and the ribs stay down; the movement is the hips travelling, not the back arching.",
  changed:"There is now a bench under the shoulders and the bar sits across the hips, so the top is a horizontal torso with vertical shins instead of a generic floor bridge.",
  equip:"barbell", active:"legs", props:[[-6,132,52,8],[0,140,6,30,0],[40,140,6,30,0]],
  frames:[
    {hip:[48,148],torso:308,ankN:[88,163],ankF:[79,163], handN:[50,147],handF:[42,147], kneeSign:-1, elbowSign:-1},
    {hip:[52,139],torso:291,ankN:[88,163],ankF:[79,163], handN:[54,138],handF:[46,138], kneeSign:-1, elbowSign:-1},
    {hip:[56,130],torso:275,ankN:[88,163],ankF:[79,163], handN:[58,129],handF:[50,129], kneeSign:-1, elbowSign:-1},
    {hip:[52,139],torso:291,ankN:[88,163],ankF:[79,163], handN:[54,138],handF:[46,138], kneeSign:-1, elbowSign:-1}
  ]},

{ id:"calfraise", tempo:[380,380,460,460], name:"Calf raise",
  real:"Balls of the feet on a step with the heels hanging off the back. Let the heels sink below the step for a stretch, then drive up onto the toes to full extension. The knees stay straight and the body stays vertical; the only joint moving is the ankle.",
  changed:"The foot now pivots over the ball of the foot while the whole body rises, which is the entire exercise. A flat foot sliding up and down showed nothing. The heel also starts BELOW the step, which is the half of the range a floor calf raise cannot reach.",
  equip:null, active:"legs", props:[[66,158,56,12]],
  frames:[
    {hip:[64,101],torso:2,ankN:[64,158],ankF:[58,158], armN:[178,178], footRot:-16},
    {hip:[64,95], torso:2,ankN:[64,152],ankF:[58,152], armN:[178,178], footRot:0},
    {hip:[64,87], torso:2,ankN:[64,144],ankF:[58,144], armN:[178,178], footRot:34},
    {hip:[64,95], torso:2,ankN:[64,152],ankF:[58,152], armN:[178,178], footRot:0}
  ]},

{ id:"wallsit", tempo:[420,420,1000,1000], name:"Wall sit",
  real:"Back flat against a wall, slide down until the thighs are parallel to the floor and the knees are at ninety degrees with the shins vertical. Then hold. Weight through the heels, no hands on the thighs.",
  changed:"There is a wall to sit against and the hold is where the time goes, rather than a squat cycling up and down. At the bottom the knee sits directly over the ankle with the thigh level, which is the position being held.",
  equip:null, active:"legs", props:[[16,52,10,118,0]],
  frames:[
    {hip:[33,120],torso:0,ankN:[62,163],ankF:[53,163], handN:[46,100],handF:[40,102], elbowSign:1},
    {hip:[33,127],torso:0,ankN:[62,163],ankF:[53,163], handN:[46,107],handF:[40,109], elbowSign:1},
    {hip:[33,134],torso:0,ankN:[62,163],ankF:[53,163], handN:[46,114],handF:[40,116], elbowSign:1},
    {hip:[33,134],torso:0,ankN:[62,163],ankF:[53,163], handN:[46,114],handF:[40,116], elbowSign:1}
  ]},

{ id:"deadbug", tempo:[760,700,760,700], name:"Dead bug", flag:true,
  real:"Lying flat on the back. Opposite arm and leg extend away long and low while the other pair holds a 90/90 tabletop, then it alternates. The lower back stays pinned throughout.",
  changed:"Now genuinely alternates diagonal pairs with the body flat on the floor: one side holds tabletop (thigh vertical, shin horizontal) while the opposite arm and leg reach out long and low.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[80,158],torso:270, ankN:[109,129],ankF:[104,126], armN:[0,0],armF:[0,0], kneeSign:-1},
    {hip:[80,158],torso:270, ankN:[136,154],ankF:[104,126], armN:[284,284],armF:[0,0], kneeSign:-1},
    {hip:[80,158],torso:270, ankN:[109,129],ankF:[104,126], armN:[0,0],armF:[0,0], kneeSign:-1},
    {hip:[80,158],torso:270, ankN:[109,129],ankF:[131,151], armN:[0,0],armF:[284,284], kneeSign:-1}
  ]},

{ id:"jabcross", tempo:[170,240,170,240], name:"Jab-cross combo", flag:true,
  real:"Staggered stance, lead foot forward, rear foot back and turned out. The jab fires from the lead hand while the rear hand guards the chin; the cross then fires from the rear hand with the hips and rear shoulder rotating through. The guard hand never drops.",
  changed:"The jab and cross were using identical arm angles, so only the limb differed and both punches looked the same. The cross now reaches further, rotates the torso more than twice as far, drives the hip forward and lifts the rear heel, which is what actually separates it from a jab.",
  equip:null, active:"armN",
  frames:[
    {hip:[55,112],torso:8, ankN:[70,163],ankF:[44,163], armN:[172,15], armF:[172,15]},
    {hip:[56,112],torso:10,ankN:[70,163],ankF:[44,163], armN:[95,92],  armF:[172,15]},
    {hip:[55,112],torso:8, ankN:[70,163],ankF:[44,163], armN:[172,15], armF:[172,15]},
    {hip:[60,111],torso:20,ankN:[70,163],ankF:[46,158], armN:[168,20], armF:[88,86]}
  ]}
];

// Front-plane frames, authored only where this view carries something the side
// view physically cannot: stance and grip width, elbow flare, knee tracking,
// and which arm is working.
var FRONTS = {
  jabcross:[
    {hipY:112,footL:[58,163],footR:[80,167],kneeL:[58,136],kneeR:[82,140],
     handL:[60,70],handR:[80,70],elbL:[56,88],elbR:[84,88]},
    {hipY:112,footL:[58,163],footR:[80,167],kneeL:[58,136],kneeR:[82,140],
     handL:[59,70],handR:[78,65],elbL:[56,88],elbR:[82,76],fistR:1.9},
    {hipY:112,footL:[58,163],footR:[80,167],kneeL:[58,136],kneeR:[82,140],
     handL:[60,70],handR:[80,70],elbL:[56,88],elbR:[84,88]},
    {hipY:112,footL:[58,157],footR:[80,167],kneeL:[58,133],kneeR:[82,140],lean:5,
     handL:[66,64],handR:[82,70],elbL:[64,76],elbR:[86,88],fistL:2.15}],

  // Every other front view is DERIVED from the side frames. See frontFromSide().
};

// A hinge or a squat bends front-to-back, so its front view is that same
// movement projected: joint heights are exactly the side view's, the torso
// foreshortens by cos(lean), and only stance and grip width are new. Front
// frames written by hand drifted out of phase with the side view (the deadlift
// front stood up while the side view was on the floor) and threw the knees and
// elbows out sideways, which is why the row read as chicken-winged and the
// goblet squat as a sumo. Deriving them makes both impossible by construction.
var RIG = (typeof require!=='undefined') ? require('./rig.js') : {L:L, solve:solve};

// Place a middle joint at a wanted height and lateral position, then pull it
// back inside what its two segments can actually reach. Solving that by hand is
// where the earlier front frames went wrong; this states the intent and lets
// the constraint settle it.
function placeJoint(aLat,aY,bLat,bY,l1,l2,wantY,wantLat){
  var midY=(aY+bY)/2;
  for(var k=0;k<=10;k++){
    var jY=wantY+(midY-wantY)*(k/10);
    // A hair short of full reach: keyframes are exact, but the frames between them
    // are linear blends of these joints and can bulge slightly past them.
    var s1=l1*0.99, s2=l2*0.99;
    var r1=Math.sqrt(Math.max(0,s1*s1-(jY-aY)*(jY-aY)));
    var r2=Math.sqrt(Math.max(0,s2*s2-(jY-bY)*(jY-bY)));
    var lo=Math.max(aLat-r1,bLat-r2), hi=Math.min(aLat+r1,bLat+r2);
    if(lo<=hi) return [Math.max(lo,Math.min(hi,wantLat)), jY];
  }
  return [(aLat+bLat)/2, midY];
}

function frontFromSide(ex,opt){
  var cx=70, hipHW=9, shHW=16, ARM=39.5, LEG=57.5;
  var lat=Math.abs(opt.grip-shHW), legLat=Math.abs(opt.stance-hipHW);
  var armV=Math.sqrt(Math.max(0,ARM*ARM-lat*lat)), legV=Math.sqrt(Math.max(0,LEG*LEG-legLat*legLat));
  var kMul=opt.kneeOut===undefined?1:opt.kneeOut, eMul=opt.elbowOut===undefined?1:opt.elbowOut;
  function D(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  return ex.frames.map(function(f){
    var s=RIG.solve(f);
    var tS=Math.max(0.08,Math.cos(f.torso*Math.PI/180));
    var shY=f.hip[1]-RIG.L.TORSO*tS;
    var dy=s.handN.y-s.sh.y;
    var handY=shY+(dy<0?-1:1)*Math.min(Math.abs(dy), armV);
    var footY=Math.min(s.ankN.y, f.hip[1]+legV);
    // Laterally a joint sits between its neighbours, pushed outward by however
    // bent the limb is: knees track out over the toes, elbows flare off the
    // ribs. Neither wanders far, because a limb bending front-to-back barely
    // moves sideways at all.
    var kOut=(2+9*(1-D(s.hip,s.ankN)/(RIG.L.THIGH+RIG.L.SHIN)))*kMul;
    var eOut=(1.5+7*(1-D(s.sh,s.handN)/(RIG.L.UPPER+RIG.L.FORE)))*eMul;
    var kL=placeJoint(cx-hipHW,f.hip[1],cx-opt.stance,footY,RIG.L.THIGH,RIG.L.SHIN,
                      s.kneeN.y, cx-(hipHW+opt.stance)/2-kOut);
    var kR=placeJoint(cx+hipHW,f.hip[1],cx+opt.stance,footY,RIG.L.THIGH,RIG.L.SHIN,
                      s.kneeN.y, cx+(hipHW+opt.stance)/2+kOut);
    var eL=placeJoint(cx-shHW,shY,cx-opt.grip,handY,RIG.L.UPPER,RIG.L.FORE,
                      shY+(s.elbN.y-s.sh.y), cx-(shHW+opt.grip)/2-eOut);
    var eR=placeJoint(cx+shHW,shY,cx+opt.grip,handY,RIG.L.UPPER,RIG.L.FORE,
                      shY+(s.elbN.y-s.sh.y), cx+(shHW+opt.grip)/2+eOut);
    return {hipY:f.hip[1], torsoScale:tS,
      footL:[cx-opt.stance,footY], footR:[cx+opt.stance,footY],
      handL:[cx-opt.grip,handY],   handR:[cx+opt.grip,handY],
      kneeL:[kL[0],kL[1]], kneeR:[kR[0],kR[1]], elbL:[eL[0],eL[1]], elbR:[eR[0],eR[1]]};
  });
}

// Stance and grip are the only genuinely new information a front view carries.
// Squats stand wider than the hinges; the back-squat grip is wide out on the
// bar, the front rack and goblet narrow at the neck and sternum, and both hands
// share one bell on a swing. elbowOut 0 where the elbows tuck in rather than
// flare (goblet, swing).
[{id:'backsquat',stance:12,grip:26},{id:'frontsquat',stance:12,grip:13},
 {id:'goblet',   stance:12,grip:4, elbowOut:0},
 {id:'deadlift', stance:8, grip:18},{id:'rdl',    stance:8, grip:17},
 {id:'row',      stance:9, grip:20},{id:'kbswing',stance:11,grip:5,elbowOut:0},
 {id:'ohp',      stance:8, grip:16},{id:'pullup', stance:8, grip:19}].forEach(function(o){
  var ex=EXERCISES.filter(function(e){return e.id===o.id;})[0];
  FRONTS[o.id]=frontFromSide(ex,o);
});

EXERCISES.forEach(function(e){ if(FRONTS[e.id]) e.front=FRONTS[e.id]; });

if(typeof module!=='undefined') module.exports=EXERCISES;
