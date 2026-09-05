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
  equip:"dumbbell", axis:"sagittal", active:"legs", props:[[6,140,34,8],[10,148,6,22,0],[30,148,6,22,0]],
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

{ id:"lunge_walk", tempo:[400,400,400,400], name:"Walking lunge",
  real:"Step out, drop the back knee toward the floor until both knees are near ninety degrees, then drive through the front heel to stand and step through with the other leg. The torso stays tall; leaning forward turns it into a good morning. The front shin stays close to vertical and the front knee tracks over the foot.",
  changed:"It walks: the trailing leg swings through to become the leading one, which is the only thing separating a walking lunge from a static one. It used to share a fixed LUNGE pose that never travelled.",
  equip:null, active:"legs",
  frames:[
    {hip:[55,116],torso:6, ankN:[74,163],ankF:[34,158], armN:[172,176]},
    {hip:[55,128],torso:8, ankN:[74,163],ankF:[30,150], armN:[172,176]},
    {hip:[57,116],torso:6, ankN:[74,163],ankF:[52,161], armN:[172,176]},
    {hip:[59,128],torso:8, ankN:[76,150],ankF:[74,163], armN:[172,176]}
  ]},

{ id:"pistol", tempo:[600,600,520,520], name:"Pistol squat",
  real:"One leg squats to the bottom while the other stays straight out in front, clear of the floor. Arms reach forward to balance. The standing heel stays down and the knee tracks over the foot; the free leg is what makes it hard, because it has to stay lifted the whole way.",
  changed:"The free leg now extends forward and stays off the floor while the standing leg does the work. The old shared pose had both feet planted, which is the one thing a pistol squat is not.",
  equip:null, active:"legs",
  frames:[
    {hip:[55,110],torso:6, ankN:[60,163],ankF:[86,148], armN:[100,96]},
    {hip:[50,128],torso:24,ankN:[60,163],ankF:[96,136], armN:[100,96]},
    {hip:[46,143],torso:38,ankN:[60,163],ankF:[93,127], armN:[100,96]},
    {hip:[50,128],torso:24,ankN:[60,163],ankF:[96,136], armN:[100,96]}
  ]},

{ id:"glutebridge", tempo:[440,440,520,520], name:"Glute bridge",
  real:"Flat on your back, heels pulled in close, arms at your sides. Drive through the heels until the hips make a straight line from knee to shoulder, squeeze at the top, then lower without letting the ribs flare. Shoulders stay on the floor throughout, which is what separates it from a hip thrust.",
  changed:"The shoulders are now pinned to the FLOOR and only the hips travel, so it is clearly the floor version rather than the bench-supported hip thrust it used to share a pose with. The torso here is one rigid segment pivoting about the shoulder, and the head extends past that pivot, so lifting the hips any further would swing the head down through the floor. That caps the travel at about eight units, which is roughly the twelve centimetres a real bridge covers anyway.",
  equip:null, active:"legs", floor:true,
  frames:[
    {hip:[46,156],torso:270,  ankN:[80,163],ankF:[71,163], handN:[34,163],handF:[28,162], kneeSign:-1, elbowSign:-1},
    {hip:[46,152],torso:263.3,ankN:[80,163],ankF:[71,163], handN:[34,163],handF:[28,162], kneeSign:-1, elbowSign:-1},
    {hip:[45,148],torso:256.4,ankN:[80,163],ankF:[71,163], handN:[34,163],handF:[28,162], kneeSign:-1, elbowSign:-1},
    {hip:[46,152],torso:263.3,ankN:[80,163],ankF:[71,163], handN:[34,163],handF:[28,162], kneeSign:-1, elbowSign:-1}
  ]},

{ id:"row_single", tempo:[460,460,520,520], name:"Single-arm row",
  real:"One hand and the same-side knee on a bench, back flat and roughly horizontal, the working arm hanging straight down. Pull the dumbbell to the hip with the elbow tracking back along the ribs, not out wide. The torso does not rotate to help; if the shoulder swings up to finish the rep, the weight is too heavy.",
  changed:"There is a bench under the supporting hand and knee, the torso is horizontal rather than upright, and the weight travels up to the hip on one side only. It used to share the bent-row pose, which is a two-handed movement with a completely different base.",
  equip:"dumbbell", axis:"sagittal", active:"arms", props:[[10,132,58,7]],
  frames:[
    {hip:[46,124],torso:86, ankN:[16,163],ankF:[24,140], handN:[80,152],handF:[74,127], elbowSign:-1},
    {hip:[46,124],torso:86, ankN:[16,163],ankF:[24,140], handN:[80,142],handF:[74,127], elbowSign:-1},
    {hip:[46,124],torso:86, ankN:[16,163],ankF:[24,140], handN:[76,128],handF:[74,127], elbowSign:-1},
    {hip:[46,124],torso:86, ankN:[16,163],ankF:[24,140], handN:[80,142],handF:[74,127], elbowSign:-1}
  ]},

{ id:"chinup", tempo:[520,520,620,620], name:"Chin-up",
  real:"Underhand grip about shoulder width, arms straight at the bottom. Pull until the chin clears the bar, leading with the elbows down and in toward the ribs, then lower under full control. The supinated grip puts the biceps in a stronger line than a pull-up, which is why most people can do more of them.",
  changed:"It hangs from a fixed bar and the BODY rises to it, same as the pull-up, but with a narrower grip and a more vertical pull line. It used to share one HANG pose with the pull-up and the dead hang, so all three looked identical.",
  equip:"fixedbar", active:"arms", barAt:[60,30],
  frames:[
    {hip:[58,103],torso:2, ankN:[52,157],ankF:[44,156], handN:[60,30],handF:[56,30], elbowSign:1},
    {hip:[58,92],torso:2,  ankN:[52,146],ankF:[44,145], handN:[60,30],handF:[56,30], elbowSign:1},
    {hip:[58,80],torso:2,  ankN:[52,134],ankF:[44,133], handN:[60,30],handF:[56,30], elbowSign:1},
    {hip:[58,92],torso:2,  ankN:[52,146],ankF:[44,145], handN:[60,30],handF:[56,30], elbowSign:1}
  ]},

{ id:"invertedrow", tempo:[460,460,520,520], name:"Inverted row",
  real:"Under a fixed bar, heels on the floor, body one straight line from heel to head. Pull the chest to the bar with the elbows tracking back, squeeze, then lower under control. The hips do not sag and do not pike; the whole body travels as one plank.",
  changed:"The bar is fixed overhead and the body swings up to it on straight heels, which is the movement. The old pose bent at the hips and pulled the arms, so it read as a seated row lying down.",
  equip:"fixedbar", active:"arms", barAt:[86,120],
  frames:[
    {hip:[52,148],torso:88, ankN:[102,163],ankF:[96,162], handN:[86,120],handF:[80,120], elbowSign:-1},
    {hip:[52,142],torso:88, ankN:[102,157],ankF:[96,156], handN:[86,120],handF:[80,120], elbowSign:-1},
    {hip:[52,136],torso:88, ankN:[102,151],ankF:[96,150], handN:[86,120],handF:[80,120], elbowSign:-1},
    {hip:[52,142],torso:88, ankN:[102,157],ankF:[96,156], handN:[86,120],handF:[80,120], elbowSign:-1}
  ]},

{ id:"kb_clean", tempo:[300,260,420,420], name:"Kettlebell clean",
  real:"A hinge, not a curl. The bell swings back between the legs, then the hips snap through and the bell rides up close to the body and rolls around the wrist into the front rack at the chest. If it flips over and bangs the forearm, you pulled it with the arm instead of guiding it.",
  changed:"It has the hinge and the rack, which is the whole movement. It used to share the generic HINGE pose with the swing and the deadlift, so all three looked like the same rep.",
  equip:"kettlebell", active:"legs",
  frames:[
    {hip:[32,118],torso:72,ankN:[60,163],ankF:[50,163], armN:[200,200]},
    {hip:[50,110],torso:25,ankN:[60,163],ankF:[50,163], armN:[152,152]},
    {hip:[55,107],torso:4, ankN:[60,163],ankF:[50,163], handN:[52,88],handF:[46,89], elbowSign:1},
    {hip:[50,111],torso:24,ankN:[60,163],ankF:[50,163], armN:[162,162]}
  ]},

{ id:"kb_snatch", tempo:[280,240,380,400], name:"Kettlebell snatch",
  real:"One unbroken movement from between the legs to locked out overhead. Same hip snap as a swing, but the arm keeps going and the bell rolls around the wrist at the top rather than flipping onto it. The lockout is a straight arm with the bicep by the ear.",
  changed:"It now finishes overhead in one continuous path instead of stopping at chest height, which is the only thing separating it from a clean. Both used to share the HINGE pose.",
  equip:"kettlebell", active:"arms",
  frames:[
    {hip:[32,118],torso:72,ankN:[60,163],ankF:[50,163], armN:[200,200]},
    {hip:[50,110],torso:25,ankN:[60,163],ankF:[50,163], armN:[138,138]},
    {hip:[55,107],torso:2, ankN:[60,163],ankF:[50,163], armN:[8,8]},
    {hip:[50,111],torso:22,ankN:[60,163],ankF:[50,163], armN:[92,92]}
  ]},

{ id:"kb_press", tempo:[480,480,420,420], name:"Kettlebell single-arm press",
  real:"Bell in the front rack, the handle diagonal across the back of the hand and the weight resting on the forearm. Press to a straight arm overhead while the ribs stay down and the free side does not lean away to help. One side at a time, so the torso has to resist bending.",
  changed:"It presses one bell from a rack position rather than sharing the two-handed PRESS pose. The working side is now visibly different from the free side, which is what makes it a single-arm press. The rack sits in front of the shoulder rather than on it, which is both where a bell actually rests and the only path that does not run the hand through its own shoulder joint.",
  equip:"kettlebell", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[48,84],handF:[46,110], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[52,58],handF:[46,110], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[58,36],handF:[46,110], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[52,58],handF:[46,110], elbowSign:1}
  ]},

{ id:"kb_bottomsup", tempo:[340,340,340,340], name:"Kettlebell bottoms-up carry",
  real:"Bell held upside down at shoulder height, handle squeezed hard enough to keep it balanced there, and walk. The grip and the shoulder work overtime to stop it tipping. Go far lighter than a normal carry; the bell falling over is the failure point, not your legs.",
  changed:"The bell is now racked at the shoulder with an inverted bell above the fist, rather than hanging at the side like a farmer's carry. Where the load sits is the entire difference between the two carries.",
  equip:"kettlebell", active:"arms",
  frames:[
    {hip:[55,107],torso:3,ankN:[66,163],ankF:[46,163], handN:[52,88],handF:[48,110], elbowSign:1},
    {hip:[55,105],torso:3,ankN:[60,157],ankF:[52,163], handN:[52,86],handF:[48,108], elbowSign:1},
    {hip:[55,107],torso:3,ankN:[46,163],ankF:[66,163], handN:[52,88],handF:[48,110], elbowSign:1},
    {hip:[55,105],torso:3,ankN:[52,163],ankF:[60,157], handN:[52,86],handF:[48,108], elbowSign:1}
  ]},

{ id:"suitcasecarry", tempo:[340,340,340,340], name:"Suitcase carry",
  real:"One weight in one hand, walk tall. The whole job is refusing to lean: the free side wants to hitch up and the loaded side wants to drop, and you resist both. Shoulders level, ribs down, short steps.",
  changed:"Only one hand is loaded and the torso stays vertical against it, which is the exercise. It used to share the farmer's carry pose with a weight in each hand, so the anti-lean demand was invisible.",
  equip:"dumbbell", axis:"sagittal", active:"arms",
  frames:[
    {hip:[55,107],torso:3,ankN:[66,163],ankF:[46,163], armN:[178,178], armF:[166,154]},
    {hip:[55,105],torso:3,ankN:[60,157],ankF:[52,163], armN:[178,178], armF:[166,154]},
    {hip:[55,107],torso:3,ankN:[46,163],ankF:[66,163], armN:[178,178], armF:[166,154]},
    {hip:[55,105],torso:3,ankN:[52,163],ankF:[60,157], armN:[178,178], armF:[166,154]}
  ]},

{ id:"platepinch", tempo:[700,800,800,700], name:"Plate pinch hold",
  real:"Two plates pinched smooth-side-out between the thumb and fingers of each hand, hanging at your sides. Nothing moves. You hold until the fingers open on their own, which is the point: it trains the pinch grip a bar handle never touches.",
  changed:"The hands now hang at the sides gripping a flat plate pair rather than sharing the dead hang's overhead bar pose. It is a hold, so the only travel is a slight settle.",
  equip:"plate", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[178,178]},
    {hip:[55,108],torso:2,ankN:[62,163],ankF:[53,163], armN:[178,178]},
    {hip:[55,108],torso:2,ankN:[62,163],ankF:[53,163], armN:[179,179]},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[178,178]}
  ]},

{ id:"sideplank", tempo:[420,900,900,420], name:"Side plank",
  real:"On one forearm with the elbow under the shoulder, feet stacked, hips lifted so the body is one straight line from ankle to ear. The bottom hip wants to sag toward the floor and the top hip wants to roll back; you hold against both. Nothing moves.",
  changed:"It is on its side on one forearm with the hips lifted clear of the floor, rather than sharing the front plank pose. It is a hold, so the only travel is breathing.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[52,132],torso:100,ankN:[8,160],ankF:[4,161], handN:[86,152],handF:[80,150], kneeSign:1, elbowSign:-1},
    {hip:[52,133],torso:100,ankN:[8,160],ankF:[4,161], handN:[86,152],handF:[80,150], kneeSign:1, elbowSign:-1},
    {hip:[52,133],torso:100,ankN:[8,160],ankF:[4,161], handN:[86,152],handF:[80,150], kneeSign:1, elbowSign:-1},
    {hip:[52,132],torso:100,ankN:[8,160],ankF:[4,161], handN:[86,152],handF:[80,150], kneeSign:1, elbowSign:-1}
  ]},

{ id:"hollowhold", tempo:[420,900,900,420], name:"Hollow hold",
  real:"On your back with the lower back pressed flat into the floor, shoulders and legs lifted into a shallow banana shape, arms overhead. The lower back leaving the floor is the failure: raise the legs higher to make it easier, not lower.",
  changed:"The shoulders and legs now hover off the floor with the lumbar spine pinned down, instead of a generic supine pose. It is a hold, so almost nothing travels.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[50,160],torso:288,ankN:[96,140],ankF:[90,143], handN:[-6,133],handF:[-2,136], kneeSign:-1, elbowSign:-1},
    {hip:[50,160],torso:288,ankN:[96,137],ankF:[90,140], handN:[-6,131],handF:[-2,134], kneeSign:-1, elbowSign:-1},
    {hip:[50,160],torso:288,ankN:[96,137],ankF:[90,140], handN:[-6,131],handF:[-2,134], kneeSign:-1, elbowSign:-1},
    {hip:[50,160],torso:288,ankN:[96,140],ankF:[90,143], handN:[-6,133],handF:[-2,136], kneeSign:-1, elbowSign:-1}
  ]},

{ id:"bearcrawl", tempo:[260,260,260,260], name:"Bear crawl",
  real:"Hands and feet on the floor, knees hovering a couple of inches off it, back flat. Crawl by moving the opposite hand and foot together while the hips stay low and stop rocking side to side. If the knees touch down or the hips sway, slow it right down.",
  changed:"The knees now hover just clear of the floor and opposite limbs travel together, which is the movement. It used to share the static plank pose and never moved at all.",
  equip:null, active:"legs", floor:true,
  frames:[
    {hip:[48,132],torso:88,ankN:[16,156],ankF:[10,158], handN:[92,160],handF:[84,162], kneeSign:1, elbowSign:-1},
    {hip:[48,132],torso:88,ankN:[32,150],ankF:[10,158], handN:[92,160],handF:[76,156], kneeSign:1, elbowSign:-1},
    {hip:[48,132],torso:88,ankN:[16,156],ankF:[10,158], handN:[92,160],handF:[84,162], kneeSign:1, elbowSign:-1},
    {hip:[48,132],torso:88,ankN:[16,156],ankF:[26,151], handN:[84,156],handF:[84,162], kneeSign:1, elbowSign:-1}
  ]},

{ id:"woodchopper", tempo:[380,380,460,460], name:"Cable or band woodchopper",
  real:"Cable set high on one side. Pull it down and across the body to the opposite hip, letting the torso rotate and the back heel pivot, arms staying long. It is a rotation driven from the hips, not a lat pulldown done sideways.",
  changed:"The hands now travel on a long diagonal from high on one side to the opposite hip with the torso rotating behind them, rather than sharing the generic TWIST pose that only turned the shoulders.",
  equip:"cable", active:"arms", anchorAt:[124,40], anchorFront:[16,44,124,44],
  frames:[
    {hip:[55,110],torso:352,ankN:[64,163],ankF:[46,163], handN:[82,58],handF:[76,60], elbowSign:1},
    {hip:[55,110],torso:6,  ankN:[64,163],ankF:[46,163], handN:[72,88],handF:[66,90], elbowSign:1},
    {hip:[55,112],torso:18, ankN:[64,163],ankF:[46,161], handN:[50,112],handF:[44,114], elbowSign:1},
    {hip:[55,110],torso:6,  ankN:[64,163],ankF:[46,163], handN:[72,88],handF:[66,90], elbowSign:1}
  ]},

{ id:"russiantwist", tempo:[340,340,340,340], name:"Russian twist",
  real:"Seated, leaning back to about forty-five degrees with the feet up or lightly down, weight held at the chest. Rotate it side to side from the ribcage while the hips stay still. Swinging the arms across a rigid torso is the usual cheat and does nothing.",
  changed:"It now sits with the torso leaned back and the feet up, which is the position that makes it hard, and the weight tracks across the body rather than the arms flapping. It used to share the standing TWIST pose.",
  equip:"dumbbell", axis:"vertical", active:"arms", floor:true,
  frames:[
    {hip:[40,152],torso:42,ankN:[86,138],ankF:[80,140], handN:[74,116],handF:[68,118], kneeSign:-1, elbowSign:1},
    {hip:[40,152],torso:42,ankN:[86,138],ankF:[80,140], handN:[64,112],handF:[58,114], kneeSign:-1, elbowSign:1},
    {hip:[40,152],torso:42,ankN:[86,138],ankF:[80,140], handN:[74,116],handF:[68,118], kneeSign:-1, elbowSign:1},
    {hip:[40,152],torso:42,ankN:[86,138],ankF:[80,140], handN:[80,124],handF:[74,126], kneeSign:-1, elbowSign:1}
  ]},

{ id:"palloffpress", tempo:[420,520,520,420], name:"Pallof press",
  real:"Stand side-on to a cable at chest height, hands together at the sternum. Press straight out and hold: the cable is trying to rotate you and you refuse. Nothing should turn. The further the hands travel from the chest, the harder the anti-rotation demand gets.",
  changed:"The hands now press straight out from the sternum with the torso locked square, so the exercise reads as anti-rotation. It used to share the overhead PRESS pose, which is the wrong plane entirely.",
  equip:"cable", active:"arms", anchorAt:[6,88], anchorFront:[6,88,134,88],
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[62,88],handF:[56,89], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[76,86],handF:[70,87], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[90,84],handF:[84,85], elbowSign:1},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], handN:[76,86],handF:[70,87], elbowSign:1}
  ]},

{ id:"hangingkneeraise", tempo:[420,420,520,520], name:"Hanging knee raise",
  real:"Hang from a bar with straight arms and lift the knees toward the chest by curling the pelvis up, not just by bending the hips. Lower under control. If you swing, you are using momentum and the abs have stopped working.",
  changed:"It hangs from a fixed bar with straight arms while the KNEES travel, which is the movement. It used to share one HANG pose with the pull-up, so the legs never moved.",
  equip:"fixedbar", active:"legs", barAt:[60,30],
  frames:[
    {hip:[58,103],torso:2, ankN:[54,157],ankF:[46,156], handN:[60,30],handF:[56,30], elbowSign:1},
    {hip:[58,103],torso:4, ankN:[76,140],ankF:[68,141], handN:[60,30],handF:[56,30], elbowSign:1},
    {hip:[58,103],torso:6, ankN:[84,118],ankF:[76,119], handN:[60,30],handF:[56,30], elbowSign:1},
    {hip:[58,103],torso:4, ankN:[76,140],ankF:[68,141], handN:[60,30],handF:[56,30], elbowSign:1}
  ]},

{ id:"kb_tgu", tempo:[600,600,700,700], name:"Turkish get-up",
  real:"From flat on your back with one arm locked overhead, stand up without ever letting that arm bend or the eyes leave the bell, then reverse it. It is a slow sequence of positions rather than a rep: roll to the elbow, to the hand, bridge, sweep the leg through, kneel, stand.",
  changed:"It now shows the actual sequence, from lying with the arm locked out to the half-kneeling position, with the loaded arm vertical the whole way. It used to share the generic REACH pose and looked like a standing stretch.",
  equip:"kettlebell", active:"arms", floor:true,
  frames:[
    {hip:[46,156],torso:268,ankN:[86,150],ankF:[78,158], handN:[14,120],handF:[24,152], kneeSign:-1, elbowSign:-1},
    {hip:[52,150],torso:300,ankN:[86,156],ankF:[76,158], handN:[28,96],handF:[16,158], kneeSign:-1, elbowSign:-1},
    {hip:[56,138],torso:344,ankN:[82,163],ankF:[32,159], handN:[52,70], handF:[36,136], kneeSign:-1, elbowSign:1},
    {hip:[52,150],torso:300,ankN:[86,156],ankF:[76,158], handN:[28,96],handF:[16,158], kneeSign:-1, elbowSign:-1}
  ]},

{ id:"sq_jump", tempo:[380,220,300,420], name:"Jump squat",
  real:"Quarter to half squat, then jump as high as you can and land soft on the same spot, absorbing through the hips and knees. The landing is the part that matters: quiet feet, knees tracking out, straight back into the next one only when you have control.",
  changed:"The feet now actually leave the floor and it lands back into a bent-knee absorb, rather than sharing a generic JUMP pose that stayed planted.",
  equip:null, active:"legs",
  frames:[
    {hip:[52,130],torso:26,ankN:[60,163],ankF:[50,163], armN:[196,196]},
    {hip:[55,102],torso:6, ankN:[60,155],ankF:[50,155], armN:[20,14]},
    {hip:[56,86], torso:2, ankN:[60,140],ankF:[50,140], armN:[10,6]},
    {hip:[53,124],torso:20,ankN:[60,163],ankF:[50,163], armN:[150,150]}
  ]},

{ id:"boxjump", tempo:[380,240,320,420], name:"Box jump",
  real:"Load the hips, swing the arms and jump up onto the box, landing soft with the hips absorbing and the feet fully on. Step down, never jump down: the landing off a box is where achilles injuries come from.",
  changed:"There is a box in front and the figure lands ON it, so the height gain is visible. It used to share the jump pose with nothing to jump onto.",
  equip:null, active:"legs", props:[[86,140,44,30]],
  frames:[
    {hip:[46,130],torso:30,ankN:[54,163],ankF:[44,163], armN:[200,200]},
    {hip:[54,104],torso:10,ankN:[62,152],ankF:[52,152], armN:[24,18]},
    {hip:[92,102],torso:12,ankN:[96,140],ankF:[86,140], armN:[150,140]},
    {hip:[92,114],torso:26,ankN:[96,140],ankF:[86,140], armN:[170,160]}
  ]},

{ id:"broadjump", tempo:[380,240,320,420], name:"Broad jump",
  real:"Hips back, arms swung behind, then jump forward as far as you can and stick the landing with both feet and bent knees. It is a horizontal version of the same hip extension, and sticking the landing rather than stumbling out of it is the skill.",
  changed:"It now travels FORWARD across the frame and sticks a two-foot landing, which is the only thing separating it from a vertical jump. Both used to share one pose.",
  equip:null, active:"legs",
  frames:[
    {hip:[30,132],torso:34,ankN:[38,163],ankF:[28,163], armN:[204,204]},
    {hip:[54,110],torso:22,ankN:[52,150],ankF:[42,150], armN:[46,40]},
    {hip:[86,120],torso:26,ankN:[98,150],ankF:[88,150], armN:[120,110]},
    {hip:[90,132],torso:30,ankN:[100,163],ankF:[90,163], armN:[150,140]}
  ]},

{ id:"medballthrow", tempo:[360,260,340,440], name:"Med ball rotational throw",
  real:"Side on to a wall, ball at the hip. Turn hard from the back foot through the hips and let the ball go across the body into the wall. The arms are the last link, not the engine: if your back heel does not pivot, you are throwing with your shoulders.",
  changed:"It now rotates from the hips with the back heel pivoting and the ball travelling across the body, rather than sharing the standing TWIST pose that only turned the shoulders.",
  equip:"ball", active:"arms",
  frames:[
    {hip:[55,110],torso:344,ankN:[64,163],ankF:[44,163], handN:[36,110],handF:[30,112], elbowSign:1},
    {hip:[55,110],torso:358,ankN:[64,163],ankF:[44,161], handN:[56,102],handF:[50,104], elbowSign:1},
    {hip:[55,110],torso:14, ankN:[64,163],ankF:[46,154], handN:[86,92], handF:[80,94], elbowSign:1},
    {hip:[55,110],torso:358,ankN:[64,163],ankF:[44,161], handN:[56,102],handF:[50,104], elbowSign:1}
  ]},

{ id:"medballslam", tempo:[340,240,300,420], name:"Med ball slam",
  real:"Ball overhead with the whole body extended, then drive it into the floor by folding hard at the hips and pulling down through the lats. Follow the ball down; do not stay upright and drop it. Catch the bounce and reset.",
  changed:"The ball now goes from a full overhead extension to the floor with the torso folding over it, so the slam has somewhere to travel. The old REACH pose only lifted the arms.",
  equip:"ball", active:"arms",
  frames:[
    {hip:[55,107],torso:2, ankN:[62,163],ankF:[53,163], handN:[59,34], handF:[53,36], elbowSign:1},
    {hip:[52,112],torso:20,ankN:[62,163],ankF:[53,163], handN:[68,76], handF:[62,78], elbowSign:1},
    {hip:[42,124],torso:56,ankN:[62,163],ankF:[53,163], handN:[80,140],handF:[74,142], elbowSign:1},
    {hip:[50,114],torso:26,ankN:[62,163],ankF:[53,163], handN:[70,84], handF:[64,86], elbowSign:1}
  ]},

{ id:"situpwallthrow", tempo:[300,240,300,460], name:"Sit-up wall throw",
  real:"Sit on the floor facing a wall, knees bent and feet planted, ball held at the chest. Sit up and throw the ball into the wall at the top of the rep, catch the rebound and lower back down with it. The throw comes from the torso finishing the sit-up, not from pressing with the arms: if you can do it lying still, you are only pressing.",
  changed:"New. The trunk travels from flat on the floor to fully sat up with the feet pinned, and the ball leaves the hands toward a wall in front rather than staying at the chest, which is the half of the movement that makes it a throw.",
  equip:"ball", active:"arms", floor:true, props:[[116,36,7,134]],
  frames:[
    {hip:[58,158],torso:270,ankN:[96,163],ankF:[90,163], handN:[34,146],handF:[28,148], kneeSign:-1, elbowSign:1},
    {hip:[58,156],torso:320,ankN:[96,163],ankF:[90,163], handN:[48,124],handF:[42,126], kneeSign:-1, elbowSign:1},
    {hip:[58,156],torso:34, ankN:[96,163],ankF:[90,163], handN:[107,103],handF:[101,105], kneeSign:-1, elbowSign:1},
    {hip:[58,156],torso:330,ankN:[96,163],ankF:[90,163], handN:[62,112],handF:[56,114], kneeSign:-1, elbowSign:1}
  ]},

{ id:"sprint", tempo:[200,200,200,200], name:"Short sprint",
  real:"Tall posture, aggressive arm drive front to back rather than across the body, knees up and the foot striking under the hips. Short efforts at full speed with long rests, because the quality of each one is the point.",
  changed:"It now cycles a real sprint stride with opposite arm and leg driving and a front-to-back arm swing, instead of sharing a static forward-lean pose.",
  equip:null, active:"legs",
  frames:[
    {hip:[55,104],torso:12,ankN:[80,130],ankF:[30,150], armN:[210,150], armF:[20,60]},
    {hip:[55,110],torso:12,ankN:[66,158],ankF:[44,132], armN:[250,200], armF:[340,20]},
    {hip:[55,104],torso:12,ankN:[30,150],ankF:[80,130], armN:[20,60],  armF:[210,150]},
    {hip:[55,110],torso:12,ankN:[44,132],ankF:[66,158], armN:[340,20], armF:[250,200]}
  ]},

{ id:"skipping", tempo:[200,180,200,180], name:"Skipping",
  real:"Small hops off the balls of the feet, an inch or two clear, with the rope turned by the wrists rather than the whole arm. Elbows stay in near the ribs. The knees stay soft and the heels never really touch down.",
  changed:"It now hops just clear of the floor with the elbows pinned and only the wrists turning, rather than sharing the big JUMP pose, which is the opposite of what skipping looks like.",
  equip:null, active:"legs",
  frames:[
    {hip:[55,109],torso:3,ankN:[62,161],ankF:[52,161], armN:[150,84]},
    {hip:[55,105],torso:3,ankN:[62,157],ankF:[52,157], armN:[150,112]},
    {hip:[55,109],torso:3,ankN:[62,161],ankF:[52,161], armN:[150,140]},
    {hip:[55,105],torso:3,ankN:[62,157],ankF:[52,157], armN:[150,112]}
  ]},

{ id:"jumpingjack", tempo:[240,240,240,240], name:"Jumping jacks",
  real:"Feet jump out wide as the arms sweep overhead, then both come back together. Land on the balls of the feet with soft knees. It is a warm-up movement, so rhythm matters more than height.",
  changed:"The arms and legs now open and close together, which is the whole movement and the one thing the shared JUMP pose could not do.",
  equip:null, active:null,
  frames:[
    {hip:[55,107],torso:2,ankN:[60,163],ankF:[52,163], armN:[176,176]},
    {hip:[55,105],torso:2,ankN:[66,160],ankF:[44,160], armN:[100,80]},
    {hip:[55,107],torso:2,ankN:[74,159],ankF:[36,159], armN:[16,10]},
    {hip:[55,105],torso:2,ankN:[66,160],ankF:[44,160], armN:[100,80]}
  ]},

{ id:"highknees", tempo:[200,200,200,200], name:"High knees",
  real:"Run on the spot driving each knee up to at least hip height, staying tall on the balls of the feet with quick ground contact. Leaning back to get the knees up defeats the point.",
  changed:"The knees now alternate up to hip height with the opposite arm driving, rather than sharing a static pose where nothing rose at all.",
  equip:null, active:"legs",
  frames:[
    {hip:[55,107],torso:6,ankN:[74,118],ankF:[52,160], armN:[200,160], armF:[20,50]},
    {hip:[55,110],torso:6,ankN:[64,150],ankF:[58,140], armN:[240,190], armF:[350,30]},
    {hip:[55,107],torso:6,ankN:[52,160],ankF:[74,118], armN:[20,50],   armF:[200,160]},
    {hip:[55,110],torso:6,ankN:[58,140],ankF:[64,150], armN:[350,30],  armF:[240,190]}
  ]},

{ id:"briskwalkjog", tempo:[340,340,340,340], name:"Brisk walk or jog",
  real:"Steady, conversational effort: you should be able to speak in short sentences but not sing. Relaxed shoulders, arms swinging front to back from the elbow, and a stride you could hold for the full block of time.",
  changed:"It walks with a real alternating stride and a relaxed arm swing rather than sharing the loaded CARRY pose, which had the arms hanging dead at the sides.",
  equip:null, active:"legs",
  frames:[
    {hip:[55,107],torso:4,ankN:[74,160],ankF:[38,158], armN:[200,175], armF:[160,175]},
    {hip:[55,105],torso:4,ankN:[64,158],ankF:[50,161], armN:[185,175], armF:[175,175]},
    {hip:[55,107],torso:4,ankN:[38,158],ankF:[74,160], armN:[160,175], armF:[200,175]},
    {hip:[55,105],torso:4,ankN:[50,161],ankF:[64,158], armN:[175,175], armF:[185,175]}
  ]},

{ id:"hipflexor", tempo:[600,900,900,600], name:"Hip flexor stretch",
  real:"Half-kneeling, back knee down, front foot forward. Tuck the tailbone under first, then push the hips gently forward. The stretch belongs at the front of the back hip; if you feel it in your lower back you have arched instead of tucking.",
  changed:"It is now genuinely half-kneeling with the rear knee on the floor and the pelvis tucked, rather than a generic KNEEL pose that could have been any kneeling position.",
  equip:null, active:null,
  frames:[
    {hip:[52,132],torso:6, ankN:[76,163],ankF:[22,162], handN:[54,124],handF:[46,126], kneeSign:-1, elbowSign:1},
    {hip:[56,133],torso:2, ankN:[76,163],ankF:[22,162], handN:[58,125],handF:[50,127], kneeSign:-1, elbowSign:1},
    {hip:[58,133],torso:0, ankN:[76,163],ankF:[22,162], handN:[60,125],handF:[52,127], kneeSign:-1, elbowSign:1},
    {hip:[54,132],torso:4, ankN:[76,163],ankF:[22,162], handN:[56,124],handF:[48,126], kneeSign:-1, elbowSign:1}
  ]},

{ id:"couchstretch", tempo:[600,900,900,600], name:"Couch stretch",
  real:"Same half-kneeling shape but the back foot is up against a wall or couch, so the quad is stretched at the knee as well as the hip. Tuck the pelvis and come upright only as far as you can hold without the lower back arching. It is brutal; ease into it.",
  changed:"The rear shin is now vertical against a wall behind, which is the entire difference from a plain hip flexor stretch. Both used to share one KNEEL pose.",
  equip:null, active:null, props:[[18,104,7,66]],
  frames:[
    {hip:[54,142],torso:14,ankN:[80,163],ankF:[26,131], handN:[64,134],handF:[56,136], kneeSign:-1, elbowSign:1},
    {hip:[56,142],torso:9, ankN:[80,163],ankF:[26,131], handN:[66,134],handF:[58,136], kneeSign:-1, elbowSign:1},
    {hip:[58,142],torso:4, ankN:[80,163],ankF:[26,131], handN:[68,134],handF:[60,136], kneeSign:-1, elbowSign:1},
    {hip:[55,142],torso:11,ankN:[80,163],ankF:[26,131], handN:[65,134],handF:[57,136], kneeSign:-1, elbowSign:1}
  ]},

{ id:"childspose", tempo:[600,900,900,600], name:"Child\'s pose",
  real:"Knees wide, big toes together, sit back onto the heels and walk the hands forward until the forehead rests down. Breathe into the back of the ribs. It is a rest position, so let the shoulders and neck go completely.",
  changed:"It now sits back onto the heels with the arms stretched forward and the head down, rather than sharing an upright KNEEL pose which is nearly the opposite shape.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[30,150],torso:78,ankN:[16,163],ankF:[12,162], handN:[96,157],handF:[90,159], kneeSign:1, elbowSign:-1},
    {hip:[28,152],torso:80,ankN:[16,163],ankF:[12,162], handN:[96,158],handF:[90,160], kneeSign:1, elbowSign:-1},
    {hip:[28,152],torso:80,ankN:[16,163],ankF:[12,162], handN:[96,158],handF:[90,160], kneeSign:1, elbowSign:-1},
    {hip:[30,150],torso:78,ankN:[16,163],ankF:[12,162], handN:[96,157],handF:[90,159], kneeSign:1, elbowSign:-1}
  ]},

{ id:"catcow", tempo:[520,520,520,520], name:"Cat-cow",
  real:"On hands and knees, alternate between arching the back and dropping the belly, and rounding it up toward the ceiling with the head tucked. Move with the breath and go slowly; it is a spinal warm-up, not a stretch to force.",
  changed:"The pelvis now rocks between an arched and a tucked position under planted hands, which is what the movement looks like from the side. The torso here is one rigid segment, so it cannot round a spine; tilting the pelvis under a fixed shoulder is the honest version of the same motion. It used to share the HINGE pose and looked like a standing bend.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[38,140],torso:70, ankN:[16,161],ankF:[10,162], handN:[94,156],handF:[86,158], kneeSign:1, elbowSign:-1},
    {hip:[36,132],torso:87, ankN:[16,161],ankF:[10,162], handN:[94,156],handF:[86,158], kneeSign:1, elbowSign:-1},
    {hip:[37,124],torso:100,ankN:[16,161],ankF:[10,162], handN:[94,156],handF:[86,158], kneeSign:1, elbowSign:-1},
    {hip:[36,132],torso:87, ankN:[16,161],ankF:[10,162], handN:[94,156],handF:[86,158], kneeSign:1, elbowSign:-1}
  ]},

{ id:"worldsgreatest", tempo:[500,500,500,500], name:"World\'s greatest stretch",
  real:"Deep lunge, drop the back knee or keep it up, plant the inside hand beside the front foot, then rotate and reach the other arm to the ceiling following it with your eyes. It covers hip, thoracic spine and hamstring in one shape, which is why it is worth the time.",
  changed:"It now has the lunge, the planted inside hand and the rotation reaching overhead, which is the sequence. The shared LUNGE pose had none of the rotation, which is most of the value.",
  equip:null, active:null,
  frames:[
    {hip:[48,132],torso:70,ankN:[80,163],ankF:[16,158], handN:[74,152],handF:[68,150], elbowSign:1},
    {hip:[48,131],torso:70,ankN:[80,163],ankF:[16,158], handN:[74,152],handF:[74,116], elbowSign:1},
    {hip:[48,130],torso:70,ankN:[80,163],ankF:[16,158], handN:[74,152],handF:[78,86], elbowSign:1},
    {hip:[48,131],torso:70,ankN:[80,163],ankF:[16,158], handN:[74,152],handF:[74,116], elbowSign:1}
  ]},

{ id:"pigeon", tempo:[600,900,900,600], name:"Pigeon / figure-4",
  real:"Front shin across the body, back leg long behind, hips square to the front. Sink the hips toward the floor and fold forward only as far as the glute lets you. If the front knee complains, bring the shin closer to parallel with your hips.",
  changed:"The front shin now sits across the body with the rear leg long behind and the torso folding over it, rather than sharing the seated SITROT pose with the 90/90.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[54,146],torso:44,ankN:[24,158],ankF:[96,160], handN:[80,156],handF:[74,158], kneeSign:1, elbowSign:1},
    {hip:[54,148],torso:54,ankN:[24,158],ankF:[96,160], handN:[84,158],handF:[78,160], kneeSign:1, elbowSign:1},
    {hip:[54,150],torso:62,ankN:[24,158],ankF:[96,160], handN:[88,160],handF:[82,162], kneeSign:1, elbowSign:1},
    {hip:[54,148],torso:54,ankN:[24,158],ankF:[96,160], handN:[84,158],handF:[78,160], kneeSign:1, elbowSign:1}
  ]},

{ id:"nine0", tempo:[560,560,560,560], name:"90/90 hip mobility",
  real:"Sit with both knees bent at ninety degrees, one leg in front and one out to the side, and rotate the whole arrangement from one side to the other without using your hands. It trains internal and external rotation together, which is what most stiff hips are actually short of.",
  changed:"The side view now holds the seated 90/90 shape with both knees folded to one side, and the FRONT view carries the rotation between sides. The rotation happens in the transverse plane, which a sagittal side view genuinely cannot show: swapping the legs across the midline there just walks a knee through the floor. It used to share the SITROT pose, where only the shoulders turned.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[52,148],torso:6, ankN:[88,158],ankF:[80,163], handN:[74,148],handF:[38,150], kneeSign:-1, elbowSign:1},
    {hip:[52,148],torso:2, ankN:[88,158],ankF:[80,163], handN:[74,148],handF:[38,150], kneeSign:-1, elbowSign:1},
    {hip:[52,148],torso:6, ankN:[88,158],ankF:[80,163], handN:[74,148],handF:[38,150], kneeSign:-1, elbowSign:1},
    {hip:[52,148],torso:10,ankN:[88,158],ankF:[80,163], handN:[74,148],handF:[38,150], kneeSign:-1, elbowSign:1}
  ]},

{ id:"thoracic", tempo:[520,520,560,560], name:"Thoracic rotation",
  real:"On all fours or side-lying, one hand behind the head, rotate the elbow up toward the ceiling and follow it with your eyes, then bring it back down under the body. The movement belongs in the upper back; the hips stay still.",
  changed:"It now rotates from a quadruped base with one hand behind the head and the hips locked, so the rotation reads as thoracic. It used to share the standing TWIST pose where the hips turned too.",
  equip:null, active:null, floor:true,
  frames:[
    {hip:[36,132],torso:82,ankN:[16,160],ankF:[10,161], handN:[92,158],handF:[72,140], kneeSign:1, elbowSign:-1},
    {hip:[36,132],torso:82,ankN:[16,160],ankF:[10,161], handN:[92,158],handF:[78,120], kneeSign:1, elbowSign:-1},
    {hip:[36,132],torso:82,ankN:[16,160],ankF:[10,161], handN:[92,158],handF:[80,100], kneeSign:1, elbowSign:-1},
    {hip:[36,132],torso:82,ankN:[16,160],ankF:[10,161], handN:[92,158],handF:[78,120], kneeSign:1, elbowSign:-1}
  ]},

{ id:"shoulderdisloc", tempo:[560,560,620,620], name:"Shoulder dislocate",
  real:"Wide grip on a band or broomstick, arms straight, take it from in front of your thighs up over your head and behind you, then back. Go as wide as you need to keep the elbows locked. If they bend, the grip is too narrow.",
  changed:"The stick now travels on a full arc from the thighs to behind the head with the arms staying straight, which is the whole movement. The old REACH pose just lifted the arms in front.",
  equip:"fixedbar", active:"arms",
  frames:[
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[168,168]},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[100,100]},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[10,10]},
    {hip:[55,107],torso:2,ankN:[62,163],ankF:[53,163], armN:[336,336]}
  ]},

{ id:"hamstring", tempo:[600,900,900,600], name:"Hamstring stretch",
  real:"One leg straight out in front with the heel down and toes up, hinge forward from the hips with a flat back until you feel it behind the thigh. Rounding the spine to reach further just moves the stretch into your lower back.",
  changed:"It now hinges over a straight front leg with a flat back, rather than sharing the overhead REACH pose, which stretched nothing at all.",
  equip:null, active:null,
  frames:[
    {hip:[50,124],torso:62,ankN:[92,146],ankF:[42,163], handN:[88,138],handF:[82,140], kneeSign:-1, elbowSign:1},
    {hip:[48,126],torso:70,ankN:[92,146],ankF:[42,163], handN:[92,144],handF:[86,146], kneeSign:-1, elbowSign:1},
    {hip:[46,128],torso:76,ankN:[92,146],ankF:[42,163], handN:[94,150],handF:[88,152], kneeSign:-1, elbowSign:1},
    {hip:[48,126],torso:70,ankN:[92,146],ankF:[42,163], handN:[92,144],handF:[86,146], kneeSign:-1, elbowSign:1}
  ]},

{ id:"ankle_mob", tempo:[480,480,520,520], name:"Ankle mobility (knee-to-wall)",
  real:"Foot a few inches from a wall, drive the knee forward over the toes to touch the wall without the heel lifting. Back the foot off until you find the furthest distance you can still reach. It is the single best predictor of whether you can squat deep with a flat foot.",
  changed:"There is a wall in front and the knee now travels forward to it with the heel pinned down, which is the test. It used to share the LUNGE pose, where nothing was being measured.",
  equip:null, active:"legs", props:[[88,88,7,82]],
  frames:[
    {hip:[52,124],torso:16,ankN:[76,163],ankF:[38,160], handN:[86,120],handF:[80,122], kneeSign:-1, elbowSign:1},
    {hip:[54,130],torso:14,ankN:[76,163],ankF:[38,160], handN:[88,124],handF:[82,126], kneeSign:-1, elbowSign:1},
    {hip:[56,136],torso:12,ankN:[76,163],ankF:[38,160], handN:[90,128],handF:[84,130], kneeSign:-1, elbowSign:1},
    {hip:[54,130],torso:14,ankN:[76,163],ankF:[38,160], handN:[88,124],handF:[82,126], kneeSign:-1, elbowSign:1}
  ]},

{ id:"shadowbox", tempo:[260,240,260,240], name:"Shadowboxing",
  real:"Move and throw at nothing, staying relaxed. Hands back to the guard after every shot, chin down, and keep the feet moving rather than standing and punching. Snap the shots and pull them back; do not push them out.",
  changed:"It now works from a real stance with the guard up, throwing and recovering, rather than sharing a static GUARD pose that never punched.",
  equip:null, active:"arms",
  frames:[
    {hip:[55,112],torso:352,ankN:[70,163],ankF:[40,163], handN:[62,74],handF:[50,76], elbowSign:1},
    {hip:[55,112],torso:0,  ankN:[70,163],ankF:[40,163], handN:[88,80],handF:[50,76], elbowSign:1},
    {hip:[55,112],torso:352,ankN:[70,163],ankF:[40,163], handN:[62,74],handF:[50,76], elbowSign:1},
    {hip:[55,112],torso:12, ankN:[70,163],ankF:[38,157], handN:[62,74],handF:[86,82], elbowSign:1}
  ]},

{ id:"bagspeed", tempo:[180,180,180,180], name:"Heavy-bag speed combo",
  real:"Short bursts of fast, light shots on the bag. It is about hand speed and staying relaxed, not power: the moment you start loading up you slow down. Guard comes straight back between every shot.",
  changed:"It now throws rapid alternating shots at a bag in front, with the guard recovering between them, instead of sharing the static GUARD pose.",
  equip:null, active:"arms", props:[[90,50,22,76]],
  frames:[
    {hip:[55,112],torso:0,ankN:[70,163],ankF:[40,163], handN:[86,78],handF:[52,76], elbowSign:1},
    {hip:[55,112],torso:2,ankN:[70,163],ankF:[40,163], handN:[62,74],handF:[50,76], elbowSign:1},
    {hip:[55,112],torso:6,ankN:[70,163],ankF:[40,163], handN:[62,74],handF:[86,82], elbowSign:1},
    {hip:[55,112],torso:2,ankN:[70,163],ankF:[40,163], handN:[62,74],handF:[50,76], elbowSign:1}
  ]},

{ id:"battleropes", tempo:[200,200,200,200], name:"Battle ropes",
  real:"Athletic stance, hips back, knees soft, and drive alternating waves down the ropes from the shoulders. The legs and trunk brace while the arms work. If you stand up tall it becomes an arm exercise and you last about twenty seconds.",
  changed:"It now holds a braced quarter-squat while the arms alternate up and down, which is what makes the waves. It used to share the ROW pose, which pulled both arms back together.",
  equip:null, active:"arms",
  frames:[
    {hip:[50,124],torso:26,ankN:[64,163],ankF:[46,163], handN:[78,104],handF:[70,130], elbowSign:1},
    {hip:[50,124],torso:26,ankN:[64,163],ankF:[46,163], handN:[78,118],handF:[72,118], elbowSign:1},
    {hip:[50,124],torso:26,ankN:[64,163],ankF:[46,163], handN:[78,130],handF:[70,104], elbowSign:1},
    {hip:[50,124],torso:26,ankN:[64,163],ankF:[46,163], handN:[78,118],handF:[72,118], elbowSign:1}
  ]},

{ id:"rowerg", tempo:[300,300,420,420], name:"Rowing machine",
  real:"Legs, then body, then arms on the drive; arms, then body, then legs on the recovery. That order is the whole technique. Most of the power is the legs; pulling with the arms first is the classic mistake and caps your split immediately.",
  changed:"It now runs the real catch-to-finish sequence on a seated erg with the legs driving before the arms, rather than sharing the standing bent-row pose.",
  equip:"fixedbar", active:"legs", props:[[16,148,62,6],[80,132,8,26]],
  frames:[
    {hip:[40,138],torso:26,ankN:[74,140],ankF:[68,142], handN:[76,120],handF:[70,122], kneeSign:-1, elbowSign:1},
    {hip:[52,138],torso:12,ankN:[74,140],ankF:[68,142], handN:[80,124],handF:[74,126], kneeSign:-1, elbowSign:1},
    {hip:[62,138],torso:348,ankN:[74,140],ankF:[68,142], handN:[56,126],handF:[50,128], kneeSign:-1, elbowSign:1},
    {hip:[52,138],torso:8, ankN:[74,140],ankF:[68,142], handN:[76,124],handF:[70,126], kneeSign:-1, elbowSign:1}
  ]},

{ id:"fly_cable", tempo:[420,420,520,520], name:"Cable fly",
  real:"Handles from pulleys at about chest height, one foot forward for balance, a slight forward lean. Elbows stay softly bent at a fixed angle and the hands sweep out wide then back together in front of the chest. The angle at the elbow does not change: the moment it opens and closes you are pressing, not flying.",
  changed:"New rig. The front view carries it, because the hands sweep across the body and a side view sees that arc almost end-on. From the side the arm is genuinely foreshortened at the stretch, which is why the hand sits close to the shoulder there rather than far behind it.",
  equip:"cable", active:"arms", anchorAt:[8,84], anchorFront:[18,80,122,80],
  frames:[
    {hip:[55,107],torso:8,ankN:[64,163],ankF:[46,163], handN:[36,95],handF:[32,97], elbowSign:1},
    {hip:[55,107],torso:8,ankN:[64,163],ankF:[46,163], handN:[66,97],handF:[62,99], elbowSign:1},
    {hip:[55,107],torso:8,ankN:[64,163],ankF:[46,163], handN:[90,95],handF:[86,97], elbowSign:1},
    {hip:[55,107],torso:8,ankN:[64,163],ankF:[46,163], handN:[66,97],handF:[62,99], elbowSign:1}
  ]},

{ id:"fly_cable_high", tempo:[420,420,520,520], name:"High cable fly",
  real:"Same movement from pulleys set high, so the hands travel down and in and meet low, around the belly button. Coming from above puts the line of pull across the lower chest rather than the mid chest, which is the only reason to do both. Same fixed soft elbow throughout.",
  changed:"New rig, and it is deliberately NOT the mid-height fly with a different label: the hands start high and finish low, so the arc runs downward across the body. That difference is the whole point of having the two, and it is visible in both views.",
  equip:"cable", active:"arms", anchorAt:[8,38], anchorFront:[20,36,120,36],
  frames:[
    {hip:[55,107],torso:10,ankN:[64,163],ankF:[46,163], handN:[44,50],handF:[40,52], elbowSign:1},
    {hip:[55,107],torso:10,ankN:[64,163],ankF:[46,163], handN:[86,60],handF:[82,62], elbowSign:1},
    {hip:[55,107],torso:10,ankN:[64,163],ankF:[46,163], handN:[80,100],handF:[76,102], elbowSign:1},
    {hip:[55,107],torso:10,ankN:[64,163],ankF:[46,163], handN:[86,60],handF:[82,62], elbowSign:1}
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

  // Kettlebell clean from the front. Two hands on one bell in the backswing,
  // then it racks on ONE side at the chest while the free arm stays out of the
  // way. Where the bell finishes is the whole difference from a swing.
  kb_clean:[
    {hipY:118,footL:[58,163],footR:[82,163],handL:[64,140],handR:[76,140]},
    {hipY:110,footL:[58,163],footR:[82,163],handL:[64,116],handR:[76,116]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[62,88], handR:[86,104]},
    {hipY:111,footL:[58,163],footR:[82,163],handL:[64,120],handR:[78,118]}],

  // Kettlebell snatch from the front: same start as the clean, but one arm
  // keeps going to a locked-out overhead finish with the bicep by the ear.
  kb_snatch:[
    {hipY:118,footL:[58,163],footR:[82,163],handL:[64,140],handR:[76,140]},
    {hipY:110,footL:[58,163],footR:[82,163],handL:[62,104],handR:[78,104]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[60,36], handR:[86,106]},
    {hipY:111,footL:[58,163],footR:[82,163],handL:[62,110],handR:[80,110]}],

  // Single-arm press from the front. The point of the view is the free side:
  // the ribs stay stacked and the torso does not bend away from the load to
  // help the press through, which is the fault a side view cannot show.
  kb_press:[
    {hipY:107,footL:[60,163],footR:[80,163],handL:[60,90], handR:[86,110]},
    {hipY:107,footL:[60,163],footR:[80,163],handL:[60,64], handR:[86,110]},
    {hipY:107,footL:[60,163],footR:[80,163],handL:[61,38], handR:[86,110]},
    {hipY:107,footL:[60,163],footR:[80,163],handL:[60,64], handR:[86,110]}],

  // Bottoms-up carry from the front. The bell is inverted above the fist at
  // shoulder height on one side only, and the shoulders stay level while you
  // walk, which is what the load is really asking for.
  kb_bottomsup:[
    {hipY:107,footL:[52,163],footR:[84,163],handL:[58,90],handR:[86,112]},
    {hipY:105,footL:[56,157],footR:[80,163],handL:[58,88],handR:[86,110]},
    {hipY:107,footL:[56,163],footR:[88,163],handL:[58,90],handR:[86,112]},
    {hipY:105,footL:[54,163],footR:[82,157],handL:[58,88],handR:[86,110]}],

  // Suitcase carry from the front. One side loaded, and the whole exercise is
  // that the shoulders stay level and the torso does not lean away from it.
  suitcasecarry:[
    {hipY:107,footL:[52,163],footR:[84,163],handL:[50,112],handR:[88,108]},
    {hipY:105,footL:[56,157],footR:[80,163],handL:[50,110],handR:[88,106]},
    {hipY:107,footL:[56,163],footR:[88,163],handL:[50,112],handR:[88,108]},
    {hipY:105,footL:[54,163],footR:[82,157],handL:[50,110],handR:[88,106]}],

  // Side plank seen from ABOVE (frontPlan): you are lying on your side, so the
  // camera looks down the length of you. The stacked feet and the single
  // planted forearm are what say "side" rather than "front" plank.
  sideplank:[
    {hipY:132,footL:[68,166],footR:[72,166],handL:[64,108],handR:[76,120]},
    {hipY:133,footL:[68,166],footR:[72,166],handL:[64,108],handR:[76,120]},
    {hipY:133,footL:[68,166],footR:[72,166],handL:[64,108],handR:[76,120]},
    {hipY:132,footL:[68,166],footR:[72,166],handL:[64,108],handR:[76,120]}],

  // Hollow hold seen from ABOVE (frontPlan). Arms overhead and legs out
  // straight, both hovering. What this view carries is that the legs stay
  // together and the arms stay by the ears rather than drifting wide.
  hollowhold:[
    {hipY:132,footL:[66,172],footR:[74,172],handL:[64,88],handR:[76,88]},
    {hipY:132,footL:[66,174],footR:[74,174],handL:[64,86],handR:[76,86]},
    {hipY:132,footL:[66,174],footR:[74,174],handL:[64,86],handR:[76,86]},
    {hipY:132,footL:[66,172],footR:[74,172],handL:[64,88],handR:[76,88]}],

  // Bear crawl seen from ABOVE (frontPlan): opposite hand and foot travel
  // together, which is the whole coordination and is invisible from the side
  // because the near limbs hide the far ones.
  bearcrawl:[
    {hipY:134,footL:[58,166],footR:[82,166],handL:[54,106],handR:[86,106]},
    {hipY:134,footL:[58,152],footR:[82,166],handL:[54,106],handR:[86,94]},
    {hipY:134,footL:[58,166],footR:[82,166],handL:[54,106],handR:[86,106]},
    {hipY:134,footL:[58,166],footR:[82,152],handL:[54,94], handR:[86,106]}],

  // Woodchopper from the front. The hands travel a long diagonal from high on
  // one side to the opposite hip, and the whole point is that the torso turns
  // with them rather than the arms swinging across a still trunk.
  woodchopper:[
    {hipY:110,footL:[58,163],footR:[84,163],lean:-4,handL:[74,58], handR:[88,62]},
    {hipY:110,footL:[58,163],footR:[84,163],handL:[62,88], handR:[78,90]},
    {hipY:112,footL:[58,163],footR:[84,161],lean:5, handL:[48,116],handR:[62,120]},
    {hipY:110,footL:[58,163],footR:[84,163],handL:[62,88], handR:[78,90]}],

  // Russian twist seen from ABOVE (frontPlan): seated and leaned back, so the
  // camera looks down at the chest. The weight tracking side to side while the
  // hips stay put is the movement, and only this view shows the travel.
  russiantwist:[
    {hipY:140,footL:[62,172],footR:[78,172],handL:[76,120],handR:[88,124]},
    {hipY:140,footL:[62,172],footR:[78,172],handL:[62,118],handR:[74,120]},
    {hipY:140,footL:[62,172],footR:[78,172],handL:[76,120],handR:[88,124]},
    {hipY:140,footL:[62,172],footR:[78,172],handL:[50,122],handR:[62,124]}],

  // Sit-up wall throw seen from ABOVE (frontPlan): flat on your back to begin
  // with, so the camera looks down at the chest. What only this view can show
  // is that both hands stay on the ball and it leaves down the midline. Drifting
  // to one side turns it into a rotational throw, which is a different exercise.
  // Sitting up lifts the chest toward the camera, so the torso foreshortens and
  // the hands close together as they drive away.
  situpwallthrow:[
    {hipY:150,footL:[56,168],footR:[84,168],kneeL:[52,158],kneeR:[88,158],handL:[63,126],handR:[77,126]},
    {hipY:150,footL:[56,168],footR:[84,168],kneeL:[52,158],kneeR:[88,158],handL:[64,134],handR:[76,134]},
    {hipY:150,footL:[56,168],footR:[84,168],kneeL:[52,158],kneeR:[88,158],handL:[66,152],handR:[74,152]},
    {hipY:150,footL:[56,168],footR:[84,168],kneeL:[52,158],kneeR:[88,158],handL:[64,138],handR:[76,138]}],

  // Pallof press from the front. Hands together at the sternum pressing
  // straight out, and the shoulders staying square to the camera IS the
  // exercise: the cable pulls from one side and nothing is allowed to turn.
  palloffpress:[
    {hipY:107,footL:[60,163],footR:[80,163],handL:[66,90],handR:[76,90]},
    {hipY:107,footL:[60,163],footR:[80,163],handL:[66,86],handR:[76,86]},
    {hipY:107,footL:[60,163],footR:[80,163],handL:[66,82],handR:[76,82]},
    {hipY:107,footL:[60,163],footR:[80,163],handL:[66,86],handR:[76,86]}],

  // Turkish get-up from the front. The loaded arm stays locked vertical while
  // everything underneath it changes shape, which is the one rule of the lift
  // and the thing worth checking at a glance.
  kb_tgu:[
    {hipY:150,footL:[58,166],footR:[84,160],handL:[62,104],handR:[88,150]},
    {hipY:144,footL:[58,164],footR:[84,158],handL:[62,96], handR:[90,156]},
    {hipY:138,footL:[56,163],footR:[86,150],handL:[60,74], handR:[88,140]},
    {hipY:144,footL:[58,164],footR:[84,158],handL:[62,96], handR:[90,156]}],

  // Jumping jacks from the front. This is the view the movement is FOR: the
  // legs opening wide and the arms sweeping overhead both happen in the frontal
  // plane, so the side view sees almost none of it.
  jumpingjack:[
    {hipY:107,footL:[62,163],footR:[78,163],handL:[52,140],handR:[88,140]},
    {hipY:105,footL:[48,160],footR:[92,160],handL:[40,104],handR:[100,104]},
    {hipY:107,footL:[40,163],footR:[100,163],handL:[54,46],handR:[86,46]},
    {hipY:105,footL:[48,160],footR:[92,160],handL:[40,104],handR:[100,104]}],

  // High knees from the front. Which knee is up alternates, and from here you
  // can see the knee driving straight up rather than swinging out to the side.
  highknees:[
    {hipY:107,footL:[58,120],footR:[80,163],handL:[54,140],handR:[86,96]},
    {hipY:110,footL:[58,150],footR:[80,146],handL:[54,124],handR:[86,120]},
    {hipY:107,footL:[58,163],footR:[80,120],handL:[54,96], handR:[86,140]},
    {hipY:110,footL:[58,146],footR:[80,150],handL:[54,120],handR:[86,124]}],

  // Sprint from the front. Arms driving front to back rather than crossing the
  // midline is the cue this view exists for; from the side they overlap.
  sprint:[
    {hipY:104,footL:[58,134],footR:[80,158],handL:[52,132],handR:[86,86]},
    {hipY:110,footL:[58,152],footR:[80,140],handL:[52,116],handR:[86,110]},
    {hipY:104,footL:[58,158],footR:[80,134],handL:[52,86], handR:[86,132]},
    {hipY:110,footL:[58,140],footR:[80,152],handL:[52,110],handR:[86,116]}],

  // Brisk walk or jog from the front. Relaxed and symmetrical, with the arms
  // swinging by the ribs rather than across the body.
  briskwalkjog:[
    {hipY:107,footL:[58,150],footR:[80,161],handL:[52,132],handR:[86,116]},
    {hipY:105,footL:[58,158],footR:[80,156],handL:[52,126],handR:[86,124]},
    {hipY:107,footL:[58,161],footR:[80,150],handL:[52,116],handR:[86,132]},
    {hipY:105,footL:[58,156],footR:[80,158],handL:[52,124],handR:[86,126]}],

  // Rotational throw from the front. The hips and shoulders turning together
  // toward the target, with the back heel pivoting off the floor, is the
  // difference between throwing with your body and throwing with your arms.
  medballthrow:[
    {hipY:110,footL:[52,163],footR:[82,163],lean:-6,handL:[42,112],handR:[56,112]},
    {hipY:110,footL:[52,161],footR:[82,163],handL:[58,104],handR:[72,104]},
    {hipY:110,footL:[54,154],footR:[82,163],lean:7, handL:[76,94], handR:[90,96]},
    {hipY:110,footL:[52,161],footR:[82,163],handL:[58,104],handR:[72,104]}],

  // Half-kneeling hip flexor stretch from the front. The pelvis tucking under
  // rather than the lower back arching is the whole technique, and from here
  // you can also see the front knee stacked over its own foot.
  hipflexor:[
    {hipY:132,footL:[46,163],footR:[78,161],handL:[52,128],handR:[86,128]},
    {hipY:133,footL:[46,163],footR:[78,161],handL:[52,129],handR:[86,129]},
    {hipY:133,footL:[46,163],footR:[78,161],handL:[52,129],handR:[86,129]},
    {hipY:132,footL:[46,163],footR:[78,161],handL:[52,128],handR:[86,128]}],

  // Couch stretch from the front: same shape, but the rear shin is vertical up
  // a wall behind, so the rear foot sits high on screen rather than on the floor.
  couchstretch:[
    {hipY:130,footL:[46,132],footR:[78,163],handL:[52,124],handR:[86,124]},
    {hipY:130,footL:[46,132],footR:[78,163],handL:[52,124],handR:[86,124]},
    {hipY:130,footL:[46,132],footR:[78,163],handL:[52,124],handR:[86,124]},
    {hipY:130,footL:[46,132],footR:[78,163],handL:[52,124],handR:[86,124]}],

  // Child's pose seen from ABOVE (frontPlan). Knees wide with the big toes
  // together and the arms stretched long and even is what the view carries.
  childspose:[
    {hipY:140,footL:[66,168],footR:[74,168],handL:[54,86],handR:[86,86]},
    {hipY:140,footL:[66,168],footR:[74,168],handL:[54,84],handR:[86,84]},
    {hipY:140,footL:[66,168],footR:[74,168],handL:[54,84],handR:[86,84]},
    {hipY:140,footL:[66,168],footR:[74,168],handL:[54,86],handR:[86,86]}],

  // Cat-cow seen from ABOVE (frontPlan): hands under shoulders, knees under
  // hips, everything square. The arching and rounding travels toward and away
  // from the camera, so what this view is for is checking nothing drifts wide.
  catcow:[
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,96],handR:[82,96]},
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,96],handR:[82,96]},
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,96],handR:[82,96]},
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,96],handR:[82,96]}],

  // Thoracic rotation seen from ABOVE (frontPlan). The top elbow opening toward
  // the ceiling comes straight at the camera, so it reads as the hand swinging
  // clear of the body while the hips stay square. That contrast is the point.
  thoracic:[
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,98],handR:[76,110]},
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,98],handR:[92,104]},
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,98],handR:[100,96]},
    {hipY:136,footL:[60,166],footR:[80,166],handL:[58,98],handR:[92,104]}],

  // World's greatest stretch from the front. Inside hand planted by the front
  // foot, the other reaching to the ceiling: the rotation is the whole reason
  // to do it and it happens almost entirely in this plane.
  worldsgreatest:[
    {hipY:132,footL:[46,160],footR:[78,163],handL:[50,152],handR:[84,150]},
    {hipY:131,footL:[46,160],footR:[78,163],handL:[50,152],handR:[92,120]},
    {hipY:130,footL:[46,160],footR:[78,163],handL:[50,152],handR:[96,94]},
    {hipY:131,footL:[46,160],footR:[78,163],handL:[50,152],handR:[92,120]}],

  // Pigeon from the front. The hips staying square to the front rather than
  // rolling open onto one buttock is the thing that makes it work, and only
  // this view shows it.
  pigeon:[
    {hipY:146,footL:[38,158],footR:[86,163],handL:[52,150],handR:[84,150]},
    {hipY:148,footL:[38,158],footR:[86,163],handL:[52,154],handR:[84,154]},
    {hipY:150,footL:[38,158],footR:[86,163],handL:[52,158],handR:[84,158]},
    {hipY:148,footL:[38,158],footR:[86,163],handL:[52,154],handR:[84,154]}],

  // 90/90 from the front. This is the view the movement lives in: both knees
  // swing from one side to the other across the floor, which is the rotation
  // the side view cannot show without walking a knee through the ground.
  nine0:[
    {hipY:148,footL:[40,162],footR:[88,156],handL:[46,150],handR:[80,150]},
    {hipY:148,footL:[50,160],footR:[86,163],handL:[48,150],handR:[82,150]},
    {hipY:148,footL:[32,156],footR:[80,162],handL:[44,150],handR:[78,150]},
    {hipY:148,footL:[44,163],footR:[80,160],handL:[46,150],handR:[80,150]}],

  // Hamstring stretch from the front. Hips square and the front foot pointing
  // straight up: letting the leg roll out turns it into an adductor stretch.
  hamstring:[
    {hipY:124,footL:[58,163],footR:[84,148],handL:[62,140],handR:[86,140]},
    {hipY:126,footL:[58,163],footR:[84,148],handL:[62,146],handR:[86,146]},
    {hipY:128,footL:[58,163],footR:[84,148],handL:[62,152],handR:[86,152]},
    {hipY:126,footL:[58,163],footR:[84,148],handL:[62,146],handR:[86,146]}],

  // Shadowboxing from the front. A staggered stance, the guard high by the
  // cheeks, and shots returning to it: from side on the two hands overlap and
  // you cannot tell whether the guard came back at all.
  shadowbox:[
    {hipY:112,footL:[46,163],footR:[76,166],handL:[60,74],handR:[80,76]},
    {hipY:112,footL:[46,163],footR:[76,166],handL:[60,74],handR:[92,66],fistR:1.9},
    {hipY:112,footL:[46,163],footR:[76,166],handL:[60,74],handR:[80,76]},
    {hipY:112,footL:[46,157],footR:[76,166],lean:4,handL:[52,66],handR:[80,76],fistL:2.1}],

  // Heavy-bag speed combo from the front. Fast alternating shots with the guard
  // snapping back between each one, which is the only thing worth checking.
  bagspeed:[
    {hipY:112,footL:[46,163],footR:[76,166],handL:[56,68],handR:[80,76],fistL:1.9},
    {hipY:112,footL:[46,163],footR:[76,166],handL:[60,74],handR:[80,76]},
    {hipY:112,footL:[46,163],footR:[76,166],handL:[60,74],handR:[92,68],fistR:1.9},
    {hipY:112,footL:[46,163],footR:[76,166],handL:[60,74],handR:[80,76]}],

  // Rowing machine from the front. The handle staying level and the knees
  // tracking straight rather than splaying out at the catch is what this view
  // is for; from the side the near leg hides the far one entirely.
  rowerg:[
    {hipY:138,footL:[60,146],footR:[80,146],handL:[64,122],handR:[76,122]},
    {hipY:138,footL:[60,146],footR:[80,146],handL:[64,126],handR:[76,126]},
    {hipY:138,footL:[60,146],footR:[80,146],handL:[62,128],handR:[78,128]},
    {hipY:138,footL:[60,146],footR:[80,146],handL:[64,126],handR:[76,126]}],

  // Cable fly from the front. This is the view the movement lives in: the
  // hands sweep from wide out to together in front of the chest. An arm
  // reaching toward the camera at the finish projects short, so the hands
  // converge near the midline rather than crossing it.
  fly_cable:[
    {hipY:107,footL:[58,163],footR:[82,163],handL:[26,78],handR:[114,78]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[44,82],handR:[96,82]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[62,86],handR:[78,86]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[44,82],handR:[96,82]}],

  // High cable fly from the front. Hands start high and wide and finish low
  // and together: the downward arc is the whole difference from the mid fly.
  fly_cable_high:[
    {hipY:107,footL:[58,163],footR:[82,163],handL:[28,50],handR:[112,50]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[46,76],handR:[94,76]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[62,104],handR:[78,104]},
    {hipY:107,footL:[58,163],footR:[82,163],handL:[46,76],handR:[94,76]}],

  // Pistol squat from the front. The free leg points AT the camera, so it
  // projects short and sits high on screen; the standing leg does all the
  // visible travelling. Which leg is working is the whole point of the view.
  // Elbows and most knees are left to the solver: a hand-placed joint is taken
  // verbatim, so getting one wrong silently draws a limb the wrong length.
  pistol:[
    {hipY:110,footL:[60,163],footR:[78,146],handL:[60,102],handR:[82,102]},
    {hipY:128,footL:[60,163],footR:[80,138],handL:[60,120],handR:[82,120]},
    {hipY:143,footL:[60,163],footR:[82,132],handL:[60,134],handR:[82,134]},
    {hipY:128,footL:[60,163],footR:[80,138],handL:[60,120],handR:[82,120]}],

  // Walking lunge from the front. Which leg is leading shows in how low its
  // foot sits on screen, never by the legs crossing over: the trailing leg is
  // behind you, so it projects shorter and higher. The front knee tracking
  // over its foot rather than caving inward is what this view is worth having
  // for, and the legs swap roles across the four frames because it walks.
  lunge_walk:[
    {hipY:116,footL:[54,150],footR:[80,163],handL:[52,148],handR:[88,148]},
    {hipY:128,footL:[52,144],footR:[80,163],handL:[52,160],handR:[88,160]},
    {hipY:116,footL:[58,158],footR:[80,163],handL:[52,148],handR:[88,148]},
    {hipY:128,footL:[56,163],footR:[82,146],handL:[52,160],handR:[88,160]}],

  // Glute bridge seen from ABOVE (frontPlan): flat on your back, so the frontal
  // plane faces the ceiling. The hips rising travel toward the camera and move
  // nothing sideways, so what this view carries is the knees staying in line
  // with the feet instead of splaying out, which is the usual fault.
  glutebridge:[
    {hipY:130,footL:[58,166],footR:[82,166],handL:[46,140],handR:[94,140]},
    {hipY:130,footL:[58,166],footR:[82,166],handL:[46,140],handR:[94,140]},
    {hipY:130,footL:[59,166],footR:[81,166],handL:[46,140],handR:[94,140]},
    {hipY:130,footL:[58,166],footR:[82,166],handL:[46,140],handR:[94,140]}],

  // Single-arm row seen from ABOVE (frontPlan): bent over a bench, so the
  // camera looks down your back. One arm is planted on the bench and the other
  // pulls back toward the hip. Which side is working, and the elbow staying in
  // along the ribs rather than flaring wide, is what the side view cannot say.
  row_single:[
    {hipY:140,footL:[58,166],footR:[84,158],handL:[50,112],handR:[90,126]},
    {hipY:140,footL:[58,166],footR:[84,158],handL:[50,112],handR:[88,134]},
    {hipY:140,footL:[58,166],footR:[84,158],handL:[50,112],handR:[86,142]},
    {hipY:140,footL:[58,166],footR:[84,158],handL:[50,112],handR:[88,134]}],

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
 {id:'chinup', stance:8, grip:12},{id:'invertedrow',stance:8,grip:18},
 {id:'platepinch',stance:8,grip:20},{id:'hangingkneeraise',stance:8,grip:19},
 {id:'sq_jump', stance:11,grip:16},{id:'boxjump',  stance:10,grip:16},
 {id:'broadjump',stance:10,grip:16},{id:'medballslam',stance:9,grip:7},
 {id:'skipping',stance:7, grip:14},{id:'shoulderdisloc',stance:8,grip:30},
 {id:'ankle_mob',stance:7,grip:16},{id:'battleropes',stance:11,grip:16},
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
['bench','deadbug','pushup','plank','mtnclimb','glutebridge','row_single',
 'sideplank','hollowhold','bearcrawl','russiantwist','situpwallthrow',
 'childspose','catcow','thoracic'].forEach(function(id){
  var ex=EXERCISES.filter(function(e){return e.id===id;})[0]; if(ex) ex.frontPlan=true;
});
EXERCISES.forEach(function(e){ if(FRONTS[e.id]) e.front=FRONTS[e.id]; });

if(typeof module!=='undefined') module.exports=EXERCISES;
