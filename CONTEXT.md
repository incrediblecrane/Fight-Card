# Fight Card: domain model

Written because sessions kept re-deriving this by hand. It records what the
words mean and where data lives, not how to use the app.

## Where data lives

Two stores, and the split is the point.

**The artifact document** holds code: the `App` function, the CSS string, the
exercise library, and 79 rigs' worth of geometry. About 344KB, and it changes
only when a new version is published.

**The `db` capability** holds everything the user logs. Seventy-odd small
documents:

| path | what |
|---|---|
| `state/profile` | XP, water target, which tab and slide the app was on |
| `state/shopping` | which shopping items are ticked, plus the hand-added ones |
| `state/session` | the in-flight workout, or null |
| `state/meta` | the seeded marker; its presence means the store is the truth |
| `days/<YYYY-MM-DD>` | one day: water, workout, rest, alcohol, smoking, weed |
| `workoutLogs/<id>` | one finished session and its sets |
| `sauna/<id>` | one sauna visit and its stints |
| `library/<id>`, `recipes/<id>` | notes and recipes |
| `plan/<id>` | one planned meal: recipe, date, slot, portions |

Data used to live inside the document. Every water tap rewrote the whole page
and republished it, and a republish reloads every open view, which is the
mechanism behind the backfill date resetting, swallowed change events, and
conflicts when the app was open twice. A tap now writes about 150 bytes and
nothing reloads.

`state/meta` is the switch. Present means read the store and ignore the seed
embedded in the document, so shipping code never touches logged data. Absent
means seed the store from that embedded copy, marker written last so a half
migration is retried rather than believed.

A view that cannot run `db` falls back to the old publish-to-save path, which
still works. Declaring `db` makes the artifact organization-internal: it cannot
be shared publicly.

## Vocabulary

- **Day** — one dated record. `touched` distinguishes "nothing happened" from
  "not logged", which is what streaks count.
- **Session** — a workout in progress: an ordered list of exercise ids, a
  target per exercise, and the sets logged so far. Dated by when it STARTED,
  so a session crossing midnight lands on the right day.
- **Set** — one logged effort. Its shape follows the exercise's `type`:
  `load` (weight and reps), `time`, `distance`, `reps`, `cardio` (minutes,
  machine, work/rest effort), `prep` (minutes, option, level).
- **Superset** — several exercises done back to back as one round. It is a
  slide in a session, not a movement: `ss1`, `ss2` are instances, and
  `activeSession.supersets[ssId]` holds the exercise ids in the round. Logging
  a round calls the normal per-exercise logger for each member, so the sets land
  on the exercises themselves and history, PBs and volume need to know nothing
  about it. The grouping lives on the in-flight session only; a finished
  workout log records the sets, not the fact they were paired.
- **Prep kind** — what second number a prep option actually has, from
  `PREP_LEVEL`: a bike has a resistance, a treadmill a speed, a stretch only how
  hard it felt, and "Light sets of the first lift" has a weight. That last one
  is `load`, and it is the only prep entry whose `v` is REPS rather than
  minutes, which is why the label and the trend chart both ask the entry what
  kind it is. Light sets are left off the minutes chart and listed in the table.
- **Prep step** — the warm-up and cool-down injected into every session that
  does not already have its own. `role: "warmup"|"cooldown"` marks the ones a
  plan already provides.
- **Per implement** — a logged weight is one dumbbell, not the pair. Declared
  in `PER_IMPLEMENT`; drives the "kg each" input, the note, the "ea" in a set
  label, and doubling in total volume.
- **Stint** — one continuous spell at one bench height inside a sauna visit.
  A visit has many; its `mins` is their total.
- **Backfill date** — the day being logged to, when it is not today. Lives in
  `sessionStorage` so it survives a reload but not closing the app.
- **Planned meal** — one entry in `state.plan`: a recipe, a real date, a slot
  (breakfast, lunch, dinner) and its own portion count. It is its own thing,
  not a flag on the recipe, which is what lets the same recipe be planned twice
  in one week and lets Monday be two portions while Thursday is one. The
  portions the shopping list buys are these, not the recipe's.
- **The week** — a rolling seven days from today, not a Mon-Sun week. Nothing
  to roll over and nothing to reset: a meal drops off the back the day after it
  was for, and `prunePlan()` deletes it rather than leaving documents nothing
  can reach. Real dates rather than weekday names are also what let the
  shopping list be scoped to part of the week.
- **Shopping row** — one line of the shopping list, keyed so a tick survives a
  portion change. `i|<name>` is derived: every mention of an ingredient across
  the planned meals in view, each at its own portion count, added up into one
  row. Countable amounts (tins, onions, cloves) always round UP: 2.4 tins is
  three tins, because there is no such thing as 0.4 of a tin and being short
  costs a second trip to the shop. Weights, volumes and spoons stay fractional.
  `x|<id>` is an **extra**, typed by hand and held in `state.shopExtras`. Extras carry no quantity and belong to
  no recipe, so clearing the week leaves them behind; they sort into the same
  alphabetical list, because shopping from two lists is how the second one gets
  forgotten.

## The rig

`pose/` is the exercise animation, testable on its own.

- **Frame** — one keyframe: hip position, torso angle, ankle positions, and
  arms given either as angles (`armN`) or as a hand target (`handN`). Limbs
  are fixed lengths; the solver never stretches one.
- **Side view** — the sagittal drawing, solved from planted feet upward.
- **Front view** — either derived from the side by `frontFromSide` (for
  symmetric sagittal movements) or hand-authored (for unilateral ones, where a
  derived symmetric view would show both sides doing the same thing, and for
  anything whose arms point at the camera). One exercise, the front dumbbell
  raise, ships with no front view at all: the movement is purely sagittal, so
  the frontal projection collapses onto the shoulders and carries nothing. Its
  second panel is the finish of the side view instead.
- **armScale** — how much of its true length an arm projects in a view, 1 being
  square to the camera. Both views have it: `armScaleL`/`armScaleR` on a front
  frame, `armScaleN`/`armScaleF` on a side one. It is the only way to draw an
  arm pointing at the viewer, because the solver bends limbs rather than
  shortening them, and the one thing it can do to reach a hand nearer than
  arm's length is fold the elbow. Without it a face pull drew two lumps beside
  the head, a lateral raise drew a curl, and the cable flys went from a nearly
  straight arm to a badly folded one inside a rep instead of holding the one
  soft elbow bend they ask for.
- **Plan view** (`frontPlan`) — looking down at someone on the floor. No
  gravity and no ground line; labelled "Above".
- **Axis** — which way a dumbbell's handle runs: `lateral` (across the body),
  `sagittal` (front to back), `vertical`. Decides whether the side view shows
  a bell face or the whole dumbbell. Read for dumbbells only.
- **Shrug** — a shoulder-elevation offset. The only degree of freedom here
  that is not a joint angle, because a shrug is the shoulder girdle riding up
  a fixed ribcage.

Eleven exercises have no rig deliberately: warm-up, cool-down, technique and
rounds blocks and the three gym-machine slots are containers rather than
movements, and the four swim entries have no ground to stand on.

`RIGFRAMES` in the app is generated from `pose/exercises.js` by
`pose/emit-rig.js`; it used to be hand-pasted, which is how a rig could be
fixed in `pose/` and stay broken in the app. `pose/probe.js` reports a frame
set's margins against the rig's limits while it is being authored.

## Test suites

- `npm test` — five rig suites: movement criteria, adversarial geometry,
  continuous motion, views, and rendering.
- `test-app.js` — backfill dates and session dating.
- `test-meals.js` — recipe portions and the shopping list.
- `test-plan.js` — the meal planner in the browser: the same meal twice, slots,
  partial-week shopping.
- `npm test` runs both halves: `test:pose` for the rig, `test:app` for the
  document and every suite over it.
- `test-shopping.js` — the shopping arithmetic headless, swept over every recipe
  and every pair. A list that is short is worse than no list, so countable
  amounts are checked against what you have to BUY, not what the recipe needs.
- `test-planmodel.js` — the plan model headless, including the one-way
  migration off the old `inPlan`/`day` pair.
- `test-removal.js` — swipe-to-remove and undo.
- `test-session.js` — prep steps, per-implement weights, sauna stints, search.
- `test-db.js` — seeding, small saves, reload survival, and the fallback.
- `test-roundtrip.js` — state survives the trip through documents unchanged.

Every browser suite stubs the artifact capability faithfully: a publish saves
AND reloads. Tests that skipped the reload once hid a whole class of bug.
