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
- **Shopping row** — one line of the shopping list, keyed so a tick survives a
  portion change. `i|<name>` is derived: every mention of an ingredient across
  the week's recipes, added up into one row. `x|<id>` is an **extra**, typed by
  hand and held in `state.shopExtras`. Extras carry no quantity and belong to
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
  derived symmetric view would show both sides doing the same thing).
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
- `test-removal.js` — swipe-to-remove and undo.
- `test-session.js` — prep steps, per-implement weights, sauna stints, search.
- `test-db.js` — seeding, small saves, reload survival, and the fallback.
- `test-roundtrip.js` — state survives the trip through documents unchanged.

Every browser suite stubs the artifact capability faithfully: a publish saves
AND reloads. Tests that skipped the reload once hid a whole class of bug.
