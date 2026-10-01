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
| `state/profile` | XP, the water target (in 0.25L taps, 1-5L), the weekly sessions target (`weekTarget`, 1-7), and any built-in meal-prep recipes deleted (`deletedRecipes`, so they are not topped up again) |
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
be shared publicly. The fallback is only for a view with no store at all (`use('db')` is
missing or answers null). A store that is there but fails to answer at load is
`dbState='error'`: nothing can be changed, nothing is published, and the load is
retried once on its own and then from a Retry button, because editing the
embedded seed would be thrown away by the next load, which reads the store.

Which tab, slide and chart range a view is on, and which exercise histories
and recipe cards are unfolded, is that device's, not the record's: it lives in
`localStorage` under `fc.ui`, not in the store.

Saving goes one save at a time through `dbSave`, and all store access through
one **Store** (see below). Before each save, and whenever the
page is looked at again, the documents two open views are likely both to touch
(`state/*`, the day being logged, and any other day about to be written) are
re-read and merged field by field
against what this view last heard from the store: a field changed here keeps
this view's value, every other field takes the store's, and XP merges as the
sum of both views' changes. A transient refusal (`unavailable`,
`resource_exhausted`, anything unknown) is retried with backoff; one retrying
cannot fix is shown and waits for the next change. Every write in a save
settles before the next save starts, and `state/session` is written only after
everything else in that save landed, so a finished session is never cleared
before its log is stored. A save still waiting on its timer goes at once when
the page is hidden or closed; with no time to re-read, it sends only the fields
this view changed (`update`), never a whole document, and the next save merges.

## The Store seam

Every read and write of saved data goes through one object, `dbStore`:

| call | does |
|---|---|
| `get(path)` | the body, or `undefined` when there is none (not an error) |
| `readAll()` | `{path: body}` for every document in the six collections and the three `state/*` documents |
| `put(path, body)` | write the whole document |
| `update(path, fields)` | merge fields into a document that exists; rejects `invalid_argument` if it does not |
| `remove(path)` | delete it; deleting nothing is fine |
| `subscribe(fn)` | optional: `fn(path, body or undefined)` on every change, returns a stop function |

`DbStore(db)` wraps `claude.use('db')`; `subscribe` is there only when the db
handed over has `onSnapshot`, and nothing calls it yet. `MemoryStore(init)` is
the same contract over a plain object, used by the headless suite
(`test-store.js`). `dbDocs`/`dbApply` stay the serialisation layer either
side: state in, `{path: body}` out, and back. A rejection carries `{code}`;
`dbSave` treats the codes in `DB_HARD` as final and anything else as
transient.

A self-hosted backend would be a third Store, with the same paths as REST
resources:

- `put` is `PUT /docs/<path>` with the JSON body; `remove` is
  `DELETE /docs/<path>` (204 whether or not it existed); `get` is
  `GET /docs/<path>`, 404 meaning `undefined`.
- `update` is `PATCH /docs/<path>` with the fields, 404 when absent.
- `readAll` is `GET /docs`, answering `{path: body}` for the paths above.
- Errors map to codes: 429 and 5xx to `unavailable`, 400 to
  `invalid_argument`, 413 to `quota_exceeded`, 401/403 to `not_granted`.
- `subscribe` can be left out, or done with server-sent events on
  `GET /docs/events`.

The artifact page probably cannot reach such a server (its CSP is likely to
block `fetch` to other hosts), so a backend may mean hosting the page as well.
Check the CSP before building one.

## Export and import

**Export** (Progress, Your data) is the whole record as one JSON document:
`{schema: 1, exportedAt, waterTarget, weekTarget, totalXp, deletedRecipes,
days, workoutLogs, saunaSessions, library, recipes, plan, shoppingChecked,
shopExtras, activeSession}`, the same shape as the seed embedded in the
document. It is shown as text with Copy and a download; it uses no capability
other than `db`.

**Import** takes pasted JSON. `readImport` only `JSON.parse`s it and checks
every shape before any of it becomes state: `schema` must be 1, days keyed by
date, every list entry an object whose id is a safe path segment (ids become
document paths), no duplicate ids, targets in range. Anything else is refused
with a reason and nothing is written. A good one shows a summary (days,
sessions, planned meals, recipes, notes, sauna) and then:

- **Replace** makes it the whole record.
- **Merge** adds what is new and replaces anything with the same id or date,
  keeping this view's targets, XP, shopping and session in progress.

Either way it becomes state and is written by `dbSave` through the Store,
straight away rather than after the usual re-read (which would merge the old
day back over the imported one). The data it replaced is kept first, in the
export format, in `localStorage` under `fc.backup`, and "Put back the data
before the last import" restores it the same way.

## Vocabulary

- **Day** — one dated record. `touched` distinguishes "nothing happened" from
  "not logged", which is what streaks count.
- **Streaks** are forgiving. The clean streak counts touched days with nothing
  used and steps over a day not logged; only a touched day with something used
  ends it. The day streak lets one untouched day go and ends on two in a row.
  A day with something used is shown as "used" in a neutral colour.
- **The week target** is sessions in the rolling last seven days: days whose
  workout is done, quick logs included, against `weekTarget`.
- **Session** — a workout in progress: an ordered list of exercise ids, a
  target per exercise, and the sets logged so far. Dated by when it STARTED,
  so a session crossing midnight lands on the right day.
- **Set** — one logged effort. Its shape follows the exercise's `type`:
  `load` (weight and reps), `time`, `distance`, `reps`, `cardio` (minutes,
  machine, work/rest effort), `prep` (minutes, option, level).
  A `time` exercise marked `unit: 'min'` (the drilling block, the brisk
  walk) is logged in minutes, and its sets carry `u: 'min'` so the one-off
  conversion of older sets typed as seconds runs once.
  Every set carries `t`, when it was logged, which drives the rest clock on a
  slide; a session carries `t0` and a finished log `durationMin`. A lift's set
  can be marked a **warm-up set** (`wu`) by tapping it: still weight moved,
  but left out of PBs, set counts, "last time" and the prefill.
- **Last time**: the newest finished log holding working sets of the
  exercise. The slide shows it with a double-progression hint (every working
  set at the top of the rep range: add weight; otherwise build the reps) and
  prefills kg and reps from the previous set this session or, failing that,
  the first working set last time. Numbers are typed
  into text boxes and read with `parseNum`, which takes a comma decimal;
  anything else is refused and the box marked.
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
- **Undo**: one slot, in `sessionStorage` so it survives the reload a save can
  cause and ends with the tab. Every one-tap removal parks what it took there:
  a sauna visit or finished session, a note, a recipe with its planned meals, a
  planned meal, a cleared week with its ticks, a discarded session, or one
  exercise taken out of a session. It is offered as a toast fixed to the bottom
  of every view, and not offered once the item is back by some other route, so
  it can never put back a second copy.
- **Round log**: `roundLog` on a superset box: the members each logged round
  actually recorded a set for, so Undo round takes back exactly that round.
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
- **Bend sign**: which of the two mirror IK solutions a knee or elbow takes.
  It is decided at keyframes only (`kneeSign`/`elbowSign` on a side frame; on a
  front frame the solver picks elbows low and knees out, or `kneeSignL/R`,
  `elbSignL/R` set it) and blends between them, so a joint never jumps to its
  mirror mid-rep. A front keyframe whose hand hangs straight below the
  shoulder has no low side, so it takes its nearest neighbour's elbow side. A sign that changes between two side keyframes swings the
  limb through straight, which the stretch check flags.
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
- `test-store.js`: the Store contract over `MemoryStore`, and export then
  import reproducing the record exactly; malformed imports refused.

Every browser suite stubs the artifact capability faithfully: a publish saves
AND reloads. Tests that skipped the reload once hid a whole class of bug.
