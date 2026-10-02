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
| `state/session` | the in-flight workout, or null, and `ended`: the ids of the last twenty sessions finished or discarded |
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

Declaring `db` makes the artifact organization-internal: it cannot be shared
publicly. The app is always published with `db` declared, so a view without a
store is not a reason to save some other way. `dbState` is one of:

- `loading`: until the store answers. Taps that change data are held.
- `db`: the store answered and holds the truth.
- `local`: there is no store to read, so the old publish-to-save path is
  right. Only when the page is open outside the artifact runtime (no
  `window.claude.use`), or its embedded seed carries `localOnly: true`, the
  mark of a copy never moved into a store (the browser suites with no db stub
  use it, through `env.localOnly`).
- `error`: the store failed to answer at load, `use('db')` answered null (or
  rejected), or the whole load took longer than `DB_BOOT_MS` (12s; the code
  is then `timeout`). Nothing can be changed and nothing is published, because
  editing the embedded seed would be thrown away by the next load, which reads
  the store. The load is retried once on its own, then from the Retry button
  or when the page is looked at again. Each load has a generation (`bootGen`),
  so one given up on that answers late changes nothing.
- `paused`: the store refused this view for good (`DB_LOST`: `revoked`,
  `not_granted`, `capability_disabled`, `capability_removed`), at load or on a
  save. Nothing more is taken or saved for this page load; a banner says
  changes are no longer saved and offers Reload, without saying why access
  went.

A save that fails shows on the saving pill fixed to the bottom of the screen
("Not saved, retrying", or "Not saved" when retrying cannot help) until a save
lands, so a phone scrolled far down still sees it. The pill lives outside
`#app`, is never rebuilt by a render, and is a polite live region, so a screen
reader hears each change once. A change refused for good (`DB_HARD`:
`invalid_argument`, `quota_exceeded`, `transform_error`) is named in the
banner (`docLabel`: "your log for Fri 2 Oct", "the meal plan") and goes again
with the next change.

Which tab, slide and chart range a view is on, and which exercise histories
and recipe cards are unfolded, is that device's, not the record's: it lives in
`localStorage` under `fc.ui`, not in the store.

Saving goes one save at a time through `dbSave`, and all store access through
one **Store** (see below). Before each save the documents two open views are
likely both to touch (`state/*`, the day being logged, and any other day about
to be written) are re-read and merged field by field against what this view
last heard from the store: a field changed here keeps this view's value, every
other field takes the store's, and XP merges as the sum of both views'
changes. Shopping ticks, hand-added extras and deleted built-in recipes merge
as sets (the store's, less what this view took out since, plus what it added),
so two views adding different things keep both. A list entry already saved (a
session, a recipe, a note, a planned meal) is re-read before it is written
again: one this view changed but another deleted stays deleted rather than
being written back. When the page is looked at again the whole store is read
(`readAll`), so what other views added, changed or deleted reaches this one:
an entry this view has not changed takes the store's copy, or goes when the
store's has gone, and one that is new elsewhere is added. A transient refusal
(`unavailable`, `resource_exhausted`, anything unknown) is retried with
backoff; one retrying cannot fix is shown and waits for the next change. Every
write in a save settles before the next save starts. When a save clears
`state/session` and writes workout logs, the session is written only after
those logs landed, so a finished session is never cleared before its log is
stored; any other session change goes out alongside the rest. A save still
waiting on its timer goes at once when the page is hidden or closed; with no
time to re-read, it sends only the fields this view changed (`update`), never
a whole document, and the next save merges. A day this view never read is
diffed against a blank day, and a finished session's log it never read
against an empty log (another view may have finished the same session); each
is put whole only when the store refuses the update because there is none.
A field that merges (XP, deleted
recipes, ticks, extras, the session and `ended`, a log's sets) is not sent
over the store's copy, which would take away what another view added since
and count this view's change twice: it goes beside it, in a field of the
view's own, `pend_` and a view id made at load, holding those fields as the
view last heard of them (`b`) and as they are now (`m`). Every read (load,
the re-read before a save, an import) folds another view's `pend_` in as that
view's change and leaves its own out, since its own change is still in its
state; the next save puts the document back without it. When a view's own
has been folded and cleared by another view, the XP it sent counts as heard.

The session in flight is one thing however many views hold it. It has an id
(`s` and its start time), and the same session in two views merges exercise by
exercise: sets as a union keyed by when each was logged, the exercise list and
targets key by key. An exercise left with no sets, taken out of the session
or its only set undone, has no entry in `logs` (not an empty list), and a
finished log holds only exercises with sets. A session that has ended
elsewhere (finished, discarded, or replaced by an import) stays ended,
whatever this view still holds of it: sets
logged here since go onto its log, or, if it was discarded, the session is
offered back here by Undo. A finished log carries the session's id as
`sessionId` and is named after it (`wl` and its start time), so two views
finishing the same session write one document, keep the sets of both, and pay
its XP once, and `finishWorkout` adds to a log the session already has rather
than writing a second. Every ended session's id is kept in `state/session`'s
`ended`, so a set sent by a view hidden straight after it cannot make an
ended session live again: it is kept beside it, not live, for its log.

## The Store seam

Every read and write of saved data goes through one object, `dbStore`:

| call | does |
|---|---|
| `get(path)` | the body, or `undefined` when there is none (not an error) |
| `readAll()` | `{path: body}` for every document in the six collections and the three `state/*` documents: read at load, when the page is looked at again, and before an import is written |
| `put(path, body)` | write the whole document |
| `update(path, fields)` | merge fields into a document that exists; rejects `invalid_argument` if it does not |
| `remove(path)` | delete it; deleting nothing is fine |
| `subscribe(fn)` | optional: `fn(path, body or undefined)` on every change, returns a stop function |

`DbStore(db)` wraps `claude.use('db')`; `subscribe` is there only when the db
handed over has `onSnapshot`, and nothing calls it yet: a view picks up other
views' changes before each save and with `readAll` when it is looked at again.
`MemoryStore(init)` is the same contract over a plain object, used by the
headless suite (`test-store.js`). `dbDocs`/`dbApply` stay the serialisation
layer either side: state in, `{path: body}` out, and back. A rejection carries
`{code}`; `dbSave` treats the codes in `DB_HARD` as final for that change,
those in `DB_LOST` as the end of saving for the page load (`paused`), and
anything else as transient.

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
document paths), no duplicate ids, targets in range, every field of a set the
kind `logSet` writes, a day's workout type and a session's tag one of the
workout types, a planned meal's slot breakfast, lunch or dinner. Ids, and the
keys of a session's or a log's sets and targets, are also looked up in plain
objects and written into attributes, so a name `Object.prototype` already has
(`constructor`, `toString`) is refused as one, and so is any key called
`__proto__`, anywhere: JSON keeps it as a key, but code takes it for a
prototype. Anything else is refused with a reason and nothing is written.
It also takes a **dump** of a store (`readDump`): `{path: document}`, or a
list of `{path, data}` or `{collection, doc_id, data}`, which is how data
comes over from the old artifact (see MIGRATION.md). Its `pend_` fields are
folded in, it goes through `dbApply` as a load does, and the result is then
checked as an export; the summary counts its documents and any it left out.
Everything an import can carry is drawn escaped, as text. A good one shows a summary (days,
sessions, planned meals, recipes, notes, sauna) and then:

- **Replace** makes it the whole record.
- **Merge** adds what is new and replaces anything with the same id or date,
  keeping this view's targets, XP (plus that of what it brings in), shopping
  and session in progress.

Each takes the text in the box when tapped: text changed since Check is
checked again and shown, and only the next tap imports it.

Either way it becomes state and is written by `dbSave` through the Store,
straight away rather than after the usual re-read (which would merge the old
day back over the imported one); a write that fails is retried the same way.
The whole store is read first. The data it replaced is kept, in the export
format, in `localStorage` under `fc.backup`: what the store held, with this
view's unsaved changes on top, so it includes what another view saved after
this one loaded. Replace then deletes every document the import does not
have, those included. "Put back the data before the last import" restores the
backup as a Replace, after asking: it names when the copy is from (its
`exportedAt`) and what it replaces, and it is gone until the writes have
landed, so a second tap cannot swap it back. Where this device cannot keep a
copy (no `localStorage`), the import says so before and after, and offers an
export first. A session in progress that an import replaces counts as
ended in every view: this view's own, and for a Replace the one the store
holds, which another view may have started since this one last read. An
import clears any undo offered before it.

An import is many writes (a year is about 700), so it is made safe to cut
off. Before the first write, what it is writing is kept in `localStorage`
under `fc.importing` and `state/meta` gets `importing` set to the time that
copy was taken; both are cleared only once the last write and delete have
landed, and until then the app says "Importing 140/736, keep this open" rather
than "Imported". A load that finds `fc.importing` while the store still carries
that same mark finishes the import (a Replace from that copy, a Merge laid over
what is stored) if the copy is under 15 minutes old; an older one is offered
("Finish the import started ...") rather than replayed, since it would undo
what another device did since. A copy the store is no longer marked by (left,
finished or replaced elsewhere), or one on a store that is seeded afresh, is
dropped. A load that finds only the store's mark says the import did not
finish and offers the backup or to leave it; the backup is called "the data
from before" only on the device that ran the import, and named by its date
elsewhere. An import refused for good (quota, invalid argument and the like)
is unfinished in the same way: Put back and Leave it are offered, and Leave it
drops the copy and the mark, so it is not replayed on the next change or load.
While an import is unfinished `fc.backup` is never replaced, so it stays the
data from before the first one.

Merge pays the XP of what it brings in, as if it had been logged here: per
date, the cups (`wx`), trained day and rest day of the incoming day less those
of the day it replaces, and a sauna visit with a new id; clamped at 0. So
removing a merged session or untapping its water later takes back only XP that
was paid.

## Vocabulary

- **Day** — one dated record. `touched` distinguishes "nothing happened" from
  "not logged", which is what streaks count. A blank day (untouched, nothing
  on it) is no record: looking at a day draws it blank without making one,
  only a tap that logs something does, and a blank day is neither saved nor
  exported. One the store already holds is left there, never deleted unread,
  and the water averages start at the first day that is not blank.
- **Streaks** are forgiving. The clean streak counts touched days with nothing
  used and steps over a day not logged; only a touched day with something used
  ends it. The day streak lets one untouched day go and ends on two in a row.
  A day with something used is shown as "used" in a neutral colour.
- **The week target** is sessions in the rolling last seven days: days whose
  workout is done, quick logs included, against `weekTarget`.
- **Session**: a workout in progress, with an id, an ordered list of exercise
  ids, a target per exercise, and the sets logged so far. Dated by when it
  STARTED, so a session crossing midnight lands on the right day.
  Start on a workout's card resumes its session in progress (the card says
  Resume, on the slide it was left at), unless that session is from an
  earlier day that is not the one being logged and has no sets: then a new
  one starts on the day being logged. A session from another day is named
  with its date on the resume banner and in its title, and while one is open
  the log date bar is not shown, since Finish writes the session's own day
  whatever the log date says. Replacing a session that was built (sets,
  exercises, targets or supersets changed) offers it back by Undo, and so
  does Start after a discard until the new session has sets. A session
  started while logging an earlier day has no rest clock and its log no
  `durationMin`: its times are when it was typed in.
  Finish counts sets the way everything else does (`countsAsSet`): a session
  holding only a warm-up or warm-up sets is no session, and Finish discards
  it, with Undo. A warm-up option and minutes picked but not logged belong to
  that session and go when it starts, finishes or is discarded.
- **A day's sessions**: the day's workout type reads as its newest session.
  A log finished on a day a quick log had already marked trained carries
  `dayWas` (that day's type then); removing it leaves the day trained, its XP
  kept, and the quick log's type back. Removing one of several sessions passes
  `dayWas` on to one that is left.
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
- **Undo**: one slot, held in a variable (`undoMem`) and copied to
  `sessionStorage` so it survives the reload a save can cause and ends with
  the tab; with storage blocked it still works, it just does not survive that
  reload. Every one-tap removal parks what it took there: a sauna visit or
  finished session, a note, a recipe with its planned meals, a planned meal,
  one of your own shopping items with its tick, a cleared week with its ticks,
  a discarded session, or one exercise taken out of a session. A list removal
  made within five seconds of another joins it (`kind: 'many'`), so one Undo
  puts back everything a quick run of taps took; a second tap on the same spot
  within 400ms is ignored. It is offered as a toast fixed to the bottom of
  every view, shrinks to its two buttons after nine seconds, and the page
  keeps room below its end for it. It is announced once, from a live region
  outside `#app`, not by the toast. It is not offered once the item is back by
  some other route, so it can never put back a second copy, and an exercise
  taken out of a session goes with that session (`t0`), not with the next one
  of the same workout.
- **Round log**: `roundLog` on a superset box: the members each logged round
  actually recorded a set for, so Undo round takes back exactly that round.
- **Stint** — one continuous spell at one bench height inside a sauna visit.
  A visit has many; its `mins` is their total.
- **Backfill date** — the day being logged to, when it is not today. Lives in
  `sessionStorage` so it survives a reload but not closing the app, as
  `{k, on}`: the day picked and the day it was picked on, so it is dropped
  once the day turns. Typed or arrowed from a keyboard it is taken only as a
  whole date in the window, and drawn on Enter or on leaving the box.
- **The day turning**: a view left open is checked every half minute and
  redrawn on the new day at midnight without a tap, and the planned meals
  for the day just gone are pruned then.
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
- `test-dates.js`: the log date picked by a real tap and typed from a
  keyboard, a backfill left over from yesterday, a view open across midnight,
  and a past day looked at without leaving a blank record.
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
- `test-undo.js` — the undo offer on a phone: removals in quick succession,
  blocked storage, a shopping item, which session an undo belongs to, the
  announcement, and the toast staying clear of the page.
- `test-session.js` — prep steps, per-implement weights, sauna stints, search.
- `test-db.js`: seeding, small saves, reload survival, how a failed save and
  every `dbState` are shown, and the fallback.
- `test-roundtrip.js` — state survives the trip through documents unchanged.
- `test-store.js`: the Store contract over `MemoryStore`, and export then
  import reproducing the record exactly; malformed imports refused.

Every browser suite stubs the artifact capability faithfully: a publish saves
AND reloads. Tests that skipped the reload once hid a whole class of bug.
