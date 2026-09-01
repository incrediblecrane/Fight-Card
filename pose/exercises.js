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
  equip:"barbell", active:"arms", bench:true,
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
  backsquat:[
    {hipY:107,footL:[58,163],footR:[82,163],handL:[44,70],handR:[96,70]},
    {hipY:122,footL:[58,163],footR:[82,163],handL:[44,85],handR:[96,85]},
    {hipY:138,footL:[58,163],footR:[82,163],handL:[44,101],handR:[96,101]},
    {hipY:122,footL:[58,163],footR:[82,163],handL:[44,85],handR:[96,85]}],
  frontsquat:[
    {hipY:107,footL:[58,163],footR:[82,163],handL:[58,66],handR:[82,66]},
    {hipY:122,footL:[58,163],footR:[82,163],handL:[58,81],handR:[82,81]},
    {hipY:138,footL:[58,163],footR:[82,163],handL:[58,97],handR:[82,97]},
    {hipY:122,footL:[58,163],footR:[82,163],handL:[58,81],handR:[82,81]}],
  goblet:[
    {hipY:107,footL:[58,163],footR:[82,163],handL:[66,95],handR:[74,95]},
    {hipY:122,footL:[58,163],footR:[82,163],handL:[66,108],handR:[74,108]},
    {hipY:137,footL:[58,163],footR:[82,163],handL:[66,122],handR:[74,122]},
    {hipY:122,footL:[58,163],footR:[82,163],handL:[66,108],handR:[74,108]}],
  ohp:[
    {hipY:107,footL:[62,163],footR:[78,163],handL:[52,73],handR:[88,73]},
    {hipY:107,footL:[62,163],footR:[78,163],handL:[52,55],handR:[88,55]},
    {hipY:107,footL:[62,163],footR:[78,163],handL:[52,35],handR:[88,35]},
    {hipY:107,footL:[62,163],footR:[78,163],handL:[52,55],handR:[88,55]}],
  pullup:[
    {hipY:100,footL:[62,156],footR:[78,156],handL:[52,30],handR:[88,30]},
    {hipY:86, footL:[62,142],footR:[78,142],handL:[52,30],handR:[88,30]},
    {hipY:72, footL:[62,128],footR:[78,128],handL:[52,30],handR:[88,30]},
    {hipY:86, footL:[62,142],footR:[78,142],handL:[52,30],handR:[88,30]}],
  jabcross:[
    {hipY:112,footL:[56,163],footR:[84,163],handL:[62,80],handR:[78,80]},
    {hipY:112,footL:[56,163],footR:[84,163],handL:[62,80],handR:[86,74]},
    {hipY:112,footL:[56,163],footR:[84,163],handL:[62,80],handR:[78,80]},
    {hipY:111,footL:[56,163],footR:[84,158],handL:[50,72],handR:[78,80]}]
};
EXERCISES.forEach(function(e){ if(FRONTS[e.id]) e.front=FRONTS[e.id]; });

if(typeof module!=='undefined') module.exports=EXERCISES;
