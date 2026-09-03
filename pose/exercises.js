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
  equip:"dumbbell", axis:"vertical", active:"legs",
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

{ id:"deadhang", tempo:[600,900,900,600], name:"Dead hang",
  real:"Full grip on a fixed bar, arms dead straight, feet off the floor. Let the shoulders relax up toward the ears at first, then gently pack them down without bending the arms. The point is time under a decompressing spine, so almost nothing moves.",
  changed:"It is a hold, not a pull. The bar is fixed, the arms stay straight throughout, and the only travel is the shoulders settling. It used to share the pull-up pose and looked like a rep.",
  equip:"fixedbar", active:"arms", barAt:[60,30],
  frames:[
    {hip:[58,100],torso:0,ankN:[54,156],ankF:[46,155], handN:[60,30],handF:[55,30], elbowSign:1},
    {hip:[58,103],torso:0,ankN:[54,159],ankF:[46,158], handN:[60,30],handF:[55,30], elbowSign:1},
    {hip:[58,103],torso:0,ankN:[54,159],ankF:[46,158], handN:[60,30],handF:[55,30], elbowSign:1},
    {hip:[58,101],torso:0,ankN:[54,157],ankF:[46,156], handN:[60,30],handF:[55,30], elbowSign:1}
  ]},

{ id:"dip", tempo:[520,520,420,420], name:"Dip",
  real:"Hands fixed on parallel bars, body supported between them. Lower until the shoulder drops below the elbow, with a slight forward lean and the elbows tracking back rather than flaring wide, then press back to straight arms.",
  changed:"The hands are now pinned to the bars and the BODY travels down to them, which is the whole movement. The old pose swung the arms instead.",
  equip:null, active:"arms", props:[[50,108,44,5]],
  frames:[
    {hip:[58,106],torso:8, ankN:[46,150],ankF:[39,148], handN:[72,110],handF:[64,110], elbowSign:1},
    {hip:[58,114],torso:11,ankN:[46,150],ankF:[39,148], handN:[72,110],handF:[64,110], elbowSign:1},
    {hip:[58,122],torso:14,ankN:[46,150],ankF:[39,148], handN:[72,110],handF:[64,110], elbowSign:1},
    {hip:[58,114],torso:11,ankN:[46,150],ankF:[39,148], handN:[72,110],handF:[64,110], elbowSign:1}
  ]},

{ id:"pulldown", tempo:[420,420,520,520], name:"Lat pulldown",
  real:"Seated with the thighs pinned under a pad. Start with the arms fully extended overhead and a slight backward lean, then drive the elbows DOWN and back to bring the bar to the upper chest. The torso angle barely changes; leaning back to move the weight turns it into a row.",
  changed:"The cable now runs to a fixed overhead anchor and the elbows lead the pull, rather than the arm reaching up and back like a bent-over row stood upright.",
  equip:"cable", anchorAt:[58,24], anchorFront:[52,24,88,24], active:"arms",
  props:[[24,134,46,8],[30,142,7,26,0],[60,120,9,15]],
  frames:[
    {hip:[50,132],torso:350,ankN:[80,163],ankF:[72,163], handN:[56,62],handF:[50,63], elbowSign:1},
    {hip:[50,132],torso:350,ankN:[80,163],ankF:[72,163], handN:[57,76],handF:[51,77], elbowSign:1},
    {hip:[50,132],torso:350,ankN:[80,163],ankF:[72,163], handN:[58,90],handF:[52,91], elbowSign:1},
    {hip:[50,132],torso:350,ankN:[80,163],ankF:[72,163], handN:[57,76],handF:[51,77], elbowSign:1}
  ]},

{ id:"facepull", tempo:[420,420,480,480], name:"Face pull",
  real:"Cable set at face height. Start with the arms extended forward, then pull toward the face with the elbows staying HIGH, finishing with the hands beside the ears and the rear shoulders squeezed. The elbows leading low turns it into a row.",
  changed:"The elbows now stay above the wrists through the whole pull and the hands finish beside the head, which is what separates a face pull from every other row. It used to share the generic ROW pose.",
  equip:"cable", anchorAt:[132,62], anchorFront:[24,58,116,58], active:"arms",
  frames:[
    {hip:[55,107],torso:4,ankN:[62,163],ankF:[53,163], handN:[94,66],handF:[88,68], elbowSign:-1},
    {hip:[55,107],torso:4,ankN:[62,163],ankF:[53,163], handN:[82,63],handF:[76,65], elbowSign:-1},
    {hip:[55,107],torso:4,ankN:[62,163],ankF:[53,163], handN:[71,60],handF:[65,62], elbowSign:-1},
    {hip:[55,107],torso:4,ankN:[62,163],ankF:[53,163], handN:[82,63],handF:[76,65], elbowSign:-1}
  ]},

{ id:"press_incline", tempo:[500,500,400,400], name:"Incline dumbbell press",
  real:"Bench set around thirty to forty degrees. Dumbbells start at chest level just outside the shoulders and press up and slightly together, following the angle of the bench rather than straight up. Feet stay planted on the floor.",
  changed:"There is an actual inclined bench under the torso and the press follows its angle, so it no longer reads as a flat bench press. The dumbbell handles run across the body, so from the side you see one bell face and from the front the whole dumbbell.",
  equip:"dumbbell", axis:"lateral", active:"arms", props:[[6,108,58,10,3,-34],[16,146,7,24,0]],
  frames:[
    {hip:[50,142],torso:325,ankN:[80,163],ankF:[72,163], handN:[58,86],handF:[52,88], elbowSign:1},
    {hip:[50,142],torso:325,ankN:[80,163],ankF:[72,163], handN:[50,96],handF:[44,98], elbowSign:1},
    {hip:[50,142],torso:325,ankN:[80,163],ankF:[72,163], handN:[43,106],handF:[37,108], elbowSign:1},
    {hip:[50,142],torso:325,ankN:[80,163],ankF:[72,163], handN:[50,96],handF:[44,98], elbowSign:1}
  ]},

{ id:"triceps_ext", tempo:[480,480,420,420], name:"Triceps extension",
  real:"One weight held overhead in both hands. Only the elbows bend: the upper arms stay pointing at the ceiling while the weight lowers behind the head, then press back to straight. If the elbows drift forward and down it becomes a press.",
  changed:"The upper arm now stays vertical and only the forearm moves, which is the entire point of the exercise. It used to share the overhead press pose, where the whole arm travels.",
  equip:"dumbbell", axis:"vertical", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[58,36],handF:[52,38], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[50,46],handF:[44,48], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[41,54],handF:[35,56], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[50,46],handF:[44,48], elbowSign:1}
  ]},

{ id:"curl_bicep", tempo:[420,420,520,520], name:"Bicep curl",
  real:"Palms facing up, elbows pinned to the ribs. The forearm rotates around a fixed elbow; the upper arm does not swing forward and the shoulders do not shrug up to help.",
  changed:"The elbow now stays pinned at the ribs instead of the whole arm swinging. Supinated grip means the handle runs across the body, so the side view sees a bell face and the front view the full dumbbell. That is what tells it apart from the hammer curl.",
  equip:"dumbbell", axis:"lateral", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[60,112],handF:[54,111], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[71,84], handF:[65,83],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1}
  ]},

{ id:"curl_hammer", tempo:[420,420,520,520], name:"Hammer curl",
  real:"Neutral grip, palms facing each other, thumbs up the whole way. Same pinned elbow as a supinated curl; only the grip changes, and with it which muscles take the load.",
  changed:"Neutral grip means the handle runs front to back, so from the side you see the whole dumbbell in profile and from the front you see one bell face. That is the exact opposite of the bicep curl, and it is the only thing that distinguishes them at a glance.",
  equip:"dumbbell", axis:"sagittal", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[60,112],handF:[54,111], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[71,84], handF:[65,83],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1}
  ]},

{ id:"curl_21s", tempo:[280,280,280,280,340,340], name:"21s (biceps)",
  real:"Twenty-one reps in three unbroken blocks: seven from full stretch to halfway, seven from halfway to the top, then seven full reps. Far lighter than a straight curl, elbows still throughout.",
  changed:"It now shows the actual structure: two short pulses in the bottom half, then the range opening out to the top. A single full curl looked identical to every other curl in the list, which is the whole problem with sharing one pose.",
  equip:"barbell", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[60,112],handF:[54,111], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[60,112],handF:[54,111], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[71,84], handF:[65,83],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1}
  ]},

{ id:"curl_cable_single", tempo:[420,420,520,520], name:"Single-arm cable curl",
  real:"A handle on each low pulley, both arms curling at the same time. Stand mid-stack with the elbows pinned by the ribs. The cable keeps tension at the bottom of the range where a dumbbell goes slack, which is the reason to choose it.",
  changed:"The cable now runs to a low anchor so the line of pull is visible, which is the only thing that separates this from a dumbbell curl. Both arms work together rather than one at a time.",
  equip:"cable", anchorAt:[112,160], anchorFront:[26,160,114,160], active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[60,112],handF:[54,111], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[71,84], handF:[65,83],  elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[70,98], handF:[64,97],  elbowSign:1}
  ]},

{ id:"press_push", tempo:[380,260,300,420], name:"Push press",
  real:"A strict press with legs. Dumbbells racked at the front delts, a short sharp dip of about a fifth of a squat with the torso staying vertical, then drive the floor away and let that momentum carry the load past the sticking point. The arms finish the job overhead. The dip is a dip, not a squat: if the torso pitches forward the load goes with it.",
  changed:"It has the dip-and-drive, which is the only thing separating it from an overhead press. It used to share the generic PRESS pose, where the legs never move. The implement is now dumbbells, matching the cue in the app, which said dumbbells while the picture drew a barbell. Handles run across the body, so the side view sees a bell face and the front the full dumbbell.",
  equip:"dumbbell", axis:"lateral", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[60,163],ankF:[51,163], handN:[64,74],handF:[58,75], elbowSign:1},
    {hip:[55,118],torso:2,ankN:[60,163],ankF:[51,163], handN:[64,85],handF:[58,86], elbowSign:1},
    {hip:[55,106],torso:2,ankN:[60,163],ankF:[51,163], handN:[58,34],handF:[52,35], elbowSign:1},
    {hip:[55,110],torso:2,ankN:[60,163],ankF:[51,163], handN:[60,55],handF:[54,56], elbowSign:1}
  ]},

{ id:"sq_air", tempo:[480,480,380,380], name:"Air squat",
  real:"Same squat pattern with no bar. Arms come forward as a counterweight, which lets the torso stay more upright than a loaded squat. Feet planted, hips back and down past parallel, knees tracking over the toes.",
  changed:"The arms now reach forward as the hips go back, which is what a bodyweight squat actually looks like and what stops you falling backwards. It used to share the loaded SQUAT pose with the arms racked on a bar that is not there.",
  equip:null, active:"legs",
  frames:[
    {hip:[55,107],torso:5, ankN:[60,163],ankF:[50,163], handN:[88,84],handF:[82,86], elbowSign:1},
    {hip:[50,122],torso:22,ankN:[60,163],ankF:[50,163], handN:[86,96],handF:[80,98], elbowSign:1},
    {hip:[45,138],torso:35,ankN:[60,163],ankF:[50,163], handN:[84,110],handF:[78,112], elbowSign:1},
    {hip:[50,122],torso:22,ankN:[60,163],ankF:[50,163], handN:[86,96],handF:[80,98], elbowSign:1}
  ]},

{ id:"shrug", tempo:[360,360,440,440], name:"Dumbbell shrug",
  real:"Stand tall with a dumbbell hanging at each side, arms dead straight. Lift the shoulders straight up toward the ears and hold a beat, then lower under control. The elbows never bend and the head never nods forward to meet the shoulders, which is the usual cheat.",
  changed:"New rig, and it needed a new degree of freedom: every other movement here is a joint angle, but a shrug is the shoulder girdle sliding up a fixed ribcage. Travel is small on purpose, about five centimetres scaled, because that is the real range. Neutral grip means the handles run front to back, so the side view shows the whole dumbbell and the front view the bell faces.",
  equip:"dumbbell", axis:"sagittal", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[178,178], shrug:0},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[178,178], shrug:2.5},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[178,178], shrug:5},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[178,178], shrug:2.5}
  ]},

{ id:"farmerscarry", tempo:[340,340,340,340], name:"Farmer\'s carry",
  real:"Heavy in each hand, walk. Ribs down, shoulders pulled back and away from the ears, short deliberate steps. The load hangs; you do not shrug it. Grip usually gives out before anything else, which is the point.",
  changed:"It walks. The old pose was a static stand, which showed nothing about the exercise. Neutral grip means the handles run front to back, so the side view sees the whole dumbbell and the front view sees the bell faces.",
  equip:"dumbbell", axis:"sagittal", active:"arms",
  frames:[
    {hip:[55,107],torso:3,ankN:[66,163],ankF:[46,163], armN:[178,178]},
    {hip:[55,105],torso:3,ankN:[60,157],ankF:[52,163], armN:[178,178]},
    {hip:[55,107],torso:3,ankN:[46,163],ankF:[66,163], armN:[178,178]},
    {hip:[55,105],torso:3,ankN:[52,163],ankF:[60,157], armN:[178,178]}
  ]},

{ id:"pushup", tempo:[480,480,380,380], name:"Push-up",
  real:"Hands under the shoulders, body one rigid line from heel to head. Lower until the chest is a fist off the floor with the elbows tracking back at about forty-five degrees, not flared to the sides, then press away. The hips do not sag or pike.",
  changed:"The hands are pinned to the floor and the BODY travels, which is the movement. The old pose swung the arms while the torso stayed put.",
  equip:null, active:"arms", floor:true,
  frames:[
    {hip:[52,126],torso:92,ankN:[6,161],ankF:[2,160], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1},
    {hip:[52,133],torso:92,ankN:[6,161],ankF:[2,160], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1},
    {hip:[52,140],torso:92,ankN:[6,161],ankF:[2,160], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1},
    {hip:[52,133],torso:92,ankN:[6,161],ankF:[2,160], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1}
  ]},

{ id:"plank", tempo:[420,900,900,420], name:"Plank",
  real:"Forearms flat on the floor, elbows under the shoulders, body one line from heel to head. Squeeze the glutes and pull the ribs down so the lower back does not sag. It is a hold, so nothing should be moving except your breathing.",
  changed:"It is on the forearms with the elbows under the shoulders, and it holds instead of cycling. The old pose was a generic straight-body shape that could have been anything.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[44,137],torso:92,ankN:[4,163],ankF:[0,162], handN:[97,157],handF:[89,157], kneeSign:1, elbowSign:-1},
    {hip:[44,138],torso:92,ankN:[4,163],ankF:[0,162], handN:[97,157],handF:[89,157], kneeSign:1, elbowSign:-1},
    {hip:[44,138],torso:92,ankN:[4,163],ankF:[0,162], handN:[97,157],handF:[89,157], kneeSign:1, elbowSign:-1},
    {hip:[44,137],torso:92,ankN:[4,163],ankF:[0,162], handN:[97,157],handF:[89,157], kneeSign:1, elbowSign:-1}
  ]},

{ id:"mtnclimb", tempo:[240,240,240,240], name:"Mountain climbers",
  real:"Hold a push-up top position and drive the knees to the chest one at a time. The hips stay low and level: as soon as they pike up toward the ceiling it becomes a hip flexor exercise and the core stops working.",
  changed:"The knees now drive alternately toward the chest from a held plank, rather than the whole body cycling. Which side is working is the movement.",
  equip:null, active:"legs", floor:true,
  frames:[
    {hip:[50,128],torso:92,ankN:[8,161],ankF:[4,160], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1},
    {hip:[50,128],torso:92,ankN:[58,150],ankF:[4,160], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1},
    {hip:[50,128],torso:92,ankN:[8,161],ankF:[4,160], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1},
    {hip:[50,128],torso:92,ankN:[8,161],ankF:[54,149], handN:[94,163],handF:[86,163], kneeSign:1, elbowSign:-1}
  ]},

{ id:"burpee", tempo:[300,260,300,240,260,300,340], name:"Burpee",
  real:"Stand, drop the hands to the floor, kick the feet back to a plank, snap them in again, then jump and land soft. The plank is the bit people skip: the hips should reach a straight line before the feet come back, or it turns into a squat thrust with extra steps.",
  changed:"All five positions are there in order, including the plank and the jump. The old pose was a two-frame crouch that showed neither. The arms swing forward and up on the way out of the squat rather than folding through the shoulder, which is both what happens and the only path the joint can actually take.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[55,107],torso:4, ankN:[60,163],ankF:[50,163], handN:[59,111],handF:[53,111], kneeSign:-1, elbowSign:-1},
    {hip:[50,145],torso:60,ankN:[60,163],ankF:[50,163], handN:[80,163],handF:[72,163], kneeSign:-1, elbowSign:-1},
    {hip:[46,136],torso:92,ankN:[4,161],ankF:[0,160],  handN:[80,163],handF:[72,163], kneeSign:1,  elbowSign:-1},
    {hip:[50,145],torso:60,ankN:[60,163],ankF:[50,163], handN:[80,163],handF:[72,163], kneeSign:-1, elbowSign:-1},
    {hip:[55,112],torso:8, ankN:[60,163],ankF:[50,163], handN:[78,100],handF:[72,102], kneeSign:-1, elbowSign:-1},
    {hip:[55,96], torso:2, ankN:[60,152],ankF:[50,151], handN:[58,26], handF:[52,26],  kneeSign:-1, elbowSign:-1},
    {hip:[55,110],torso:6, ankN:[60,163],ankF:[50,163], handN:[74,100],handF:[68,102], kneeSign:-1, elbowSign:-1}
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

    // Bench press seen from ABOVE (frontPlan): lying supine, the frontal plane
  // faces the ceiling, so this is a plan view. Head at the top, feet at the
  // bottom. The bar does not move laterally, so what this view carries is grip
  // width and elbow flare: tucked at lockout, wide at the chest. An arm pressed
  // straight up points AT the camera and projects to almost nothing.
  bench:[
    {hipY:150,footL:[50,168],footR:[90,168],kneeL:[46,158],kneeR:[94,158],
     handL:[44,116],handR:[96,116],elbL:[49,118],elbR:[91,118]},
    {hipY:150,footL:[50,168],footR:[90,168],kneeL:[46,158],kneeR:[94,158],
     handL:[44,116],handR:[96,116],elbL:[43,123],elbR:[97,123]},
    {hipY:150,footL:[50,168],footR:[90,168],kneeL:[46,158],kneeR:[94,158],
     handL:[44,116],handR:[96,116],elbL:[38,128],elbR:[102,128]},
    {hipY:150,footL:[50,168],footR:[90,168],kneeL:[46,158],kneeR:[94,158],
     handL:[44,116],handR:[96,116],elbL:[43,123],elbR:[97,123]}],

  // Dead bug seen from ABOVE (frontPlan). A limb pointing at the ceiling
  // projects to almost nothing, so the tabletop side collapses toward the joint
  // it hangs from while the reaching side extends long up or down the screen.
  // Which diagonal is working is the whole point and the side view cannot say.
  deadbug:[
    {hipY:130,footL:[61,152],footR:[79,152],kneeL:[61,138],kneeR:[79,138],
     handL:[56,92],handR:[84,92],elbL:[56,99],elbR:[84,99]},
    {hipY:130,footL:[61,178],footR:[79,152],kneeL:[61,154],kneeR:[79,138],
     handL:[56,60],handR:[84,92],elbL:[56,78],elbR:[84,99]},
    {hipY:130,footL:[61,152],footR:[79,152],kneeL:[61,138],kneeR:[79,138],
     handL:[56,92],handR:[84,92],elbL:[56,99],elbR:[84,99]},
    {hipY:130,footL:[61,152],footR:[79,178],kneeL:[61,138],kneeR:[79,154],
     handL:[56,92],handR:[84,60],elbL:[56,99],elbR:[84,78]}],

  // Split squat from the front. The rear foot is behind and higher on screen;
  // the front knee must track over the toes, not collapse inward, which is the
  // single thing this view is worth having for.
  splitsq_bulg:[
    {hipY:116,footL:[58,146],footR:[80,166],kneeL:[57,132],kneeR:[83,142],handL:[52,150],handR:[88,150]},
    {hipY:126,footL:[58,146],footR:[80,166],kneeL:[56,138],kneeR:[84,148],handL:[52,158],handR:[88,158]},
    {hipY:136,footL:[58,146],footR:[80,166],kneeL:[55,144],kneeR:[85,153],handL:[52,166],handR:[88,166]},
    {hipY:126,footL:[58,146],footR:[80,166],kneeL:[56,138],kneeR:[84,148],handL:[52,158],handR:[88,158]}],

  // Hip thrust from the feet end: knees track out over the toes and the bar
  // sits square across both hips.
  hipthrust:[
    {hipY:148,torsoScale:0.16,footL:[56,163],footR:[84,163],kneeL:[52,150],kneeR:[88,150],
     handL:[48,148],handR:[92,148],elbL:[40,152],elbR:[100,152]},
    {hipY:139,torsoScale:0.1, footL:[56,163],footR:[84,163],kneeL:[52,146],kneeR:[88,146],
     handL:[48,139],handR:[92,139],elbL:[40,144],elbR:[100,144]},
    {hipY:130,torsoScale:0.08,footL:[56,163],footR:[84,163],kneeL:[52,142],kneeR:[88,142],
     handL:[48,130],handR:[92,130],elbL:[40,136],elbR:[100,136]},
    {hipY:139,torsoScale:0.1, footL:[56,163],footR:[84,163],kneeL:[52,146],kneeR:[88,146],
     handL:[48,139],handR:[92,139],elbL:[40,144],elbR:[100,144]}],

  // Calf raise from the front: both heels rise together and the ankles must not
  // roll out to the little toe, which is the common fault.
  calfraise:[
    {hipY:101,footL:[62,158],footR:[78,158],kneeL:[61,130],kneeR:[79,130],handL:[54,140],handR:[86,140]},
    {hipY:95, footL:[62,152],footR:[78,152],kneeL:[61,124],kneeR:[79,124],handL:[54,134],handR:[86,134]},
    {hipY:87, footL:[62,144],footR:[78,144],kneeL:[61,116],kneeR:[79,116],handL:[54,126],handR:[86,126]},
    {hipY:95, footL:[62,152],footR:[78,152],kneeL:[61,124],kneeR:[79,124],handL:[54,134],handR:[86,134]}],

  // Wall sit from the front: knees stay stacked over the ankles rather than
  // falling in, and the stance stays hip width.
  wallsit:[
    {hipY:120,footL:[61,163],footR:[79,163],kneeL:[60,142],kneeR:[80,142],handL:[58,112],handR:[82,112]},
    {hipY:127,footL:[61,163],footR:[79,163],kneeL:[60,148],kneeR:[80,148],handL:[58,119],handR:[82,119]},
    {hipY:134,footL:[61,163],footR:[79,163],kneeL:[60,154],kneeR:[80,154],handL:[58,126],handR:[82,126]},
    {hipY:134,footL:[61,163],footR:[79,163],kneeL:[60,154],kneeR:[80,154],handL:[58,126],handR:[82,126]}],

  // Dead bug from above: opposite arm and leg reach away while the other pair
  // holds tabletop. Which diagonal is working is only visible from here.
  deadbug:[
    {hipY:150,torsoScale:0.5,footL:[56,120],footR:[84,120],kneeL:[54,134],kneeR:[86,134],
     handL:[52,108],handR:[88,108],elbL:[46,124],elbR:[94,124]},
    {hipY:150,torsoScale:0.5,footL:[58,96], footR:[84,120],kneeL:[56,122],kneeR:[86,134],
     handL:[52,108],handR:[92,146],elbL:[46,124],elbR:[96,130]},
    {hipY:150,torsoScale:0.5,footL:[56,120],footR:[84,120],kneeL:[54,134],kneeR:[86,134],
     handL:[52,108],handR:[88,108],elbL:[46,124],elbR:[94,124]},
    {hipY:150,torsoScale:0.5,footL:[56,120],footR:[82,96], kneeL:[54,134],kneeR:[84,122],
     handL:[48,146],handR:[88,108],elbL:[44,130],elbR:[94,124]}],

  // Floor work seen from ABOVE (frontPlan). Hand and foot width is the whole
  // point here: a push-up with the hands too wide, or a plank with the elbows
  // outside the shoulders, is the fault you cannot see from the side.
  pushup:[
    {hipY:132,footL:[62,176],footR:[78,176],kneeL:[61,156],kneeR:[79,156],
     handL:[42,104],handR:[98,104],elbL:[40,112],elbR:[100,112]},
    {hipY:132,footL:[62,176],footR:[78,176],kneeL:[61,156],kneeR:[79,156],
     handL:[42,104],handR:[98,104],elbL:[32,118],elbR:[108,118]},
    {hipY:132,footL:[62,176],footR:[78,176],kneeL:[61,156],kneeR:[79,156],
     handL:[42,104],handR:[98,104],elbL:[28,124],elbR:[112,124]},
    {hipY:132,footL:[62,176],footR:[78,176],kneeL:[61,156],kneeR:[79,156],
     handL:[42,104],handR:[98,104],elbL:[32,118],elbR:[108,118]}],

  plank:[
    {hipY:132,footL:[62,178],footR:[78,178],kneeL:[61,157],kneeR:[79,157],
     handL:[58,92],handR:[82,92],elbL:[54,110],elbR:[86,110]},
    {hipY:133,footL:[62,178],footR:[78,178],kneeL:[61,158],kneeR:[79,158],
     handL:[58,92],handR:[82,92],elbL:[54,110],elbR:[86,110]},
    {hipY:133,footL:[62,178],footR:[78,178],kneeL:[61,158],kneeR:[79,158],
     handL:[58,92],handR:[82,92],elbL:[54,110],elbR:[86,110]},
    {hipY:132,footL:[62,178],footR:[78,178],kneeL:[61,157],kneeR:[79,157],
     handL:[58,92],handR:[82,92],elbL:[54,110],elbR:[86,110]}],

  // Which knee is driving is only visible from here.
  mtnclimb:[
    {hipY:132,footL:[62,176],footR:[78,176],kneeL:[61,156],kneeR:[79,156],
     handL:[42,104],handR:[98,104],elbL:[40,112],elbR:[100,112]},
    {hipY:132,footL:[64,146],footR:[78,176],kneeL:[62,140],kneeR:[79,156],
     handL:[42,104],handR:[98,104],elbL:[40,112],elbR:[100,112]},
    {hipY:132,footL:[62,176],footR:[78,176],kneeL:[61,156],kneeR:[79,156],
     handL:[42,104],handR:[98,104],elbL:[40,112],elbR:[100,112]},
    {hipY:132,footL:[62,176],footR:[76,146],kneeL:[61,156],kneeR:[78,140],
     handL:[42,104],handR:[98,104],elbL:[40,112],elbR:[100,112]}],

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
    // The shoulder the arms hang from is the shrugged one; the head is not,
    // which solveFront handles from the same field.
    var shY=f.hip[1]-RIG.L.TORSO*tS-(f.shrug||0);
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
    var out={hipY:f.hip[1], torsoScale:tS,
      footL:[cx-opt.stance,footY], footR:[cx+opt.stance,footY],
      handL:[cx-opt.grip,handY],   handR:[cx+opt.grip,handY],
      kneeL:[kL[0],kL[1]], kneeR:[kR[0],kR[1]], elbL:[eL[0],eL[1]], elbR:[eR[0],eR[1]]};
    if(f.shrug) out.shrug=f.shrug;
    return out;
  });
}

// Hand-authored front frames state intent (where the grip is, where the elbow
// flares) and routinely state it slightly out of reach. Rather than hand-tuning
// coordinates until the checks go quiet, pull every one of them inside what the
// limbs can actually do, keeping the direction asked for and only shortening
// the distance. placeJoint then settles the elbow and knee.
function clampFront(fr){
  var cx=70, hipHW=9, shHW=16, ARM=39.2, LEG=57.2;
  return fr.map(function(f){
    var g=JSON.parse(JSON.stringify(f));
    var lean=g.lean||0, tS=g.torsoScale===undefined?1:g.torsoScale;
    // Same shrugged shoulder the solver uses. Inert for everything authored so
    // far, since the shrug frames are derived after this runs, but re-solving
    // elbows from an unshrugged shoulder would be silently wrong the moment
    // that ordering changed.
    var shY=g.hipY-RIG.L.TORSO*tS-(g.shrug||0);
    var sh={L:[cx+lean-shHW,shY], R:[cx+lean+shHW,shY]};
    var hip={L:[cx-hipHW,g.hipY], R:[cx+hipHW,g.hipY]};
    function pull(pt,root,max){
      var dx=pt[0]-root[0], dy=pt[1]-root[1], d=Math.hypot(dx,dy);
      if(d<=max||d===0) return pt;
      return [root[0]+dx/d*max, root[1]+dy/d*max];
    }
    ['L','R'].forEach(function(k){
      var aS=g['armScale'+k]===undefined?1:g['armScale'+k];
      g['hand'+k]=pull(g['hand'+k], sh[k], ARM*aS);
      g['foot'+k]=pull(g['foot'+k], hip[k], LEG);
      if(g['elb'+k]){
        var e=placeJoint(sh[k][0],sh[k][1],g['hand'+k][0],g['hand'+k][1],
              RIG.L.UPPER*aS,RIG.L.FORE*aS,g['elb'+k][1],g['elb'+k][0]);
        g['elb'+k]=[e[0],e[1]];
      }
      if(g['knee'+k]){
        var n=placeJoint(hip[k][0],hip[k][1],g['foot'+k][0],g['foot'+k][1],
              RIG.L.THIGH,RIG.L.SHIN,g['knee'+k][1],g['knee'+k][0]);
        g['knee'+k]=[n[0],n[1]];
      }
    });
    return g;
  });
}
Object.keys(FRONTS).forEach(function(k){ FRONTS[k]=clampFront(FRONTS[k]); });

// These ten are upright and sagittal, so the same derivation applies. Grip is
// the point of most of them: a hammer curl and a supinated curl are the same
// geometry and differ only in what the implement does, which is why the
// equipment axis matters as much as the joints.
[{id:'press_push',stance:8,grip:17},{id:'sq_air',stance:11,grip:20},
 {id:'farmerscarry',stance:8,grip:20},{id:'burpee',stance:10,grip:16},
 {id:'shrug',   stance:8, grip:20},
 {id:'deadhang',stance:8, grip:19},{id:'dip',          stance:8, grip:14},
 {id:'pulldown',stance:9, grip:24},{id:'facepull',     stance:9, grip:15},
 {id:'press_incline',stance:9,grip:20},{id:'triceps_ext',stance:8,grip:5},
 {id:'curl_bicep',stance:8,grip:13},{id:'curl_hammer',  stance:8, grip:13},
 {id:'curl_21s', stance:8, grip:14},{id:'curl_cable_single',stance:9,grip:16}
].forEach(function(o){
  var ex=EXERCISES.filter(function(e){return e.id===o.id;})[0];
  if(ex) FRONTS[o.id]=frontFromSide(ex,o);
});

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

// A plan view has no gravity in it: "up the screen" means toward the head.
['bench','deadbug','pushup','plank','mtnclimb'].forEach(function(id){
  var ex=EXERCISES.filter(function(e){return e.id===id;})[0]; if(ex) ex.frontPlan=true;
});
EXERCISES.forEach(function(e){ if(FRONTS[e.id]) e.front=FRONTS[e.id]; });

if(typeof module!=='undefined') module.exports=EXERCISES;
