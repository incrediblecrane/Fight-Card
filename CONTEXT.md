# Fight Card: domain model

A single-user training, nutrition and habit tracker, run as a Claude Artifact
on one person's phone and tablet. This file records what the words mean and
where data lives, so sessions stop re-deriving it by hand. It is not a guide
to using the app.

## Language

### Logging a day

**Day**:
One dated record (`days/<YYYY-MM-DD>`): water, workout, rest, alcohol,
smoking, weed. `touched` separates "nothing happened" from "not logged".
_Avoid_: entry, log (a log is a finished session)

**Blank day**:
A day untouched and with nothing on it. It is no record: looking at a day
draws it blank without making one, only a tap that logs something does, and a
blank day is neither saved nor exported. One the store already holds is left
there, never deleted unread. Water averages start at the first day that is not
blank.

**Cup**:
One water tap, 0.25L. The water target is a count of cups (`waterTarget`, 4 to
20, so 1 to 5L; 8 by default). XP for water follows the cups that earned it
(`wx` on the day), so untapping takes back only what was paid.
_Avoid_: glass, unit

**Log date**:
The day being logged to. Today, unless a past day is picked: then it is a
**backfill**, kept in `sessionStorage` (`fc.logDate`) as `{k, on}`, the day
picked and the day it was picked on, so it survives a reload, ends with the
tab, and is dropped once the day turns. Typed or arrowed from a keyboard it is
taken only as a whole date in the window, drawn on Enter or on leaving the box.
_Avoid_: selected date

**Yesterday nudge**:
"Yesterday isn't logged" offered once on Today when yesterday is a gap in an
ongoing run of logging. It goes when the day is filled in or waved off
("Nothing to log"), and never shows while another day is being logged.

**The day turning**:
A view left open is checked every half minute and redrawn on the new day at
midnight without a tap; the planned meals for the day just gone are pruned
then.

**Clean streak**:
Touched days in a row with nothing used. Forgiving: it steps over a day not
logged, and only a touched day with something used ends it (or more than seven
days in a row with nothing logged, which is no longer a current streak). A day
with something used is shown as "used" in a neutral colour, not as a failure.

**Day streak**:
Touched days in a row. It lets one untouched day go and ends on two in a row.
Both streaks count from yesterday until today is touched.

**Week target**:
Sessions wanted in the rolling last seven days (`weekTarget`, 1 to 7, 3 by
default). A day counts its finished sessions, or one for a quick log with no
finished session, so two sessions in a day are two.
_Avoid_: weekly goal, Mon-Sun week

**Quick log**:
A workout type tapped on Today's card, marking the day trained without a
session. A session finished on a day a quick log already marked keeps the
quick log's type as `dayWas` (see **A day's sessions**).

### Sessions and sets

**Session**:
A workout in progress (`state/session.active`): an id (`s` and its start
time), an ordered list of exercise ids, a target per exercise, supersets, and
the sets logged so far. Dated by when it STARTED, so one crossing midnight lands
on the right day. It is one thing however many views hold it.
_Avoid_: workout (a workout is the template it was started from)

**Workout log**:
A finished session (`workoutLogs/<id>`). Named after its session (`wl` and the
session's start time) and carrying `sessionId`, so two views finishing the same
session write one log, keep the sets of both, and pay its XP once. It holds
only exercises with sets, and records sets, not which were supersetted.
_Avoid_: history entry

**Ended session**:
One finished, discarded or replaced by an import. Its id is kept in
`state/session.ended` (the last twenty), so a set sent late by another view
cannot make it live again: such a set goes onto its log, or, if it was
discarded, the session is offered back here by Undo.

**Built session**:
One with sets or supersets, or whose exercises or targets differ from the
workout it was started from. Replacing a built session offers it back by Undo.

**Resume**:
Start on a workout's card resumes its session in progress, on the slide it was
left at, unless that session is from an earlier day that is not the log date
and has no sets: then a new one starts on the log date. A session from
another day is named with its date on the banner and in its title, and while
it is open the log date bar is hidden, since Finish writes the session's own
day.

**A day's sessions**:
The day's workout type reads as its newest session. Removing a log that
carries `dayWas` leaves the day trained with the quick log's type back and its
XP kept; removing one of several passes `dayWas` on to one that is left.

**Set**:
One logged effort. Its shape follows the exercise's `type`: `load` (weight and
reps), `time`, `distance`, `reps`, `cardio` (minutes, machine, work and rest
effort), `prep` (minutes, option, level). Every set carries `t`, when it was
logged. Only sets that count (`countsAsSet`) make a session: one holding only
a warm-up or warm-up sets is no session, and Finish discards it, with Undo.
_Avoid_: rep (a rep is one movement inside a set)

**Warm-up set**:
A lift's set marked `wu` by tapping its chip. Still weight moved, but left out
of PBs, set counts, last time and the prefill.
_Avoid_: light set (that is a prep option, below)

**Units**:
Weight in kg, time in seconds, distance in metres, cardio and prep in minutes,
a treadmill's level in km/h. A `time` exercise marked `unit: 'min'` (the
drilling block, the brisk walk) is logged in minutes, and its sets carry
`u: 'min'` so the one-off conversion of older sets typed as seconds runs once.
Every number is typed into a text box and read by `parseNum`, which takes a
comma decimal ("62,5") and refuses a thousands comma ("1,000") and anything
else, marking the box.

**Per implement**:
A logged weight is one dumbbell, not the pair. Declared in `PER_IMPLEMENT`;
drives the "kg each" box, the "ea" in a set label, and doubling in total
volume.

**Last time**:
The newest finished log holding working sets of the exercise. A lift's slide
shows it with a double-progression hint (every working set at the top of the
rep range: add weight; otherwise build the reps) and prefills kg and reps from
the previous working set this session or, failing that, last time.
_Avoid_: previous session, history

**Rest clock**:
The line on a lift or reps slide counting up from the newest set of the live
session against a rest goal: 60s for bodyweight reps, 150s for a lift whose
top of range is 8 reps or fewer, 90s otherwise. It ticks in place without a
render, marks itself over once the goal is passed, and goes after fifteen
minutes. A session started while backfilling has none, and its log no
`durationMin`.
_Avoid_: rest timer (there is no countdown or alarm)

**Session length**:
`durationMin` on a log, from the session's `t0` to its last set, unless it was
left open: opened over two hours before the first set it starts at that set,
and past four hours it ends at the last set.

**Superset**:
Several exercises done back to back as one round. A slide in a session, not a
movement: `ss1`, `ss2` are instances, and `supersets[ssId]` holds the exercise
ids. A round calls the normal logger for each member, so history, PBs and
volume need know nothing of it. `roundLog` records which members each round
actually logged, and each set a round logs carries the superset's id (`ss`):
an exercise's sets of one superset line up with the rounds that hold it,
newest with newest. So Undo round, the Undo on a member's row and the Undo on
the exercise's own slide all take back exactly that round's set and keep the
count right, never a set logged on the exercise's own slide. A round from
before sets were tagged takes the newest untagged set. A typo in any box
stops the whole round. Removing a superset takes with it the sets of members
shown nowhere else (Undo puts them back); taking one member out moves its
sets out of the rounds and, if it is shown nowhere else, onto a slide of its
own. Superset ids are never reused while a removal can be undone.

**Prep step**:
The warm-up and cool-down put into every session that does not already have
its own; `role: "warmup"|"cooldown"` marks the ones a plan provides. A prep
option and minutes picked but not logged belong to that session and go when it
starts, finishes or is discarded.

**Prep kind**:
What second number a prep option has, from `PREP_LEVEL`: a bike a resistance,
a treadmill a speed, a stretch how hard it felt, and "Light sets of the first
lift" a weight. That last is `load`, the only prep entry whose `v` is REPS
rather than minutes, so it is left off the minutes chart and listed in the
table.

**Stint**:
One continuous spell at one bench height inside a sauna visit. A visit has
many; its `mins` is their total.

### Meals and shopping

**Recipe**:
A meal-prep card (`recipes/<id>`) with a base portion count and ingredients
typed as "Name (quantity unit)". Built-in recipes deleted are listed in
`deletedRecipes` so they are not topped up again.

**Ingredient**:
One line of a recipe, read by `parseIng` into a name, a quantity and a unit.
Fractions ("1 1/2", "½") and ranges ("2-3", bought at the top end) are read; a
line with no number ("Honey (drizzle)") keeps its name and invents no
quantity; any name is allowed, `constructor` included. The bracket is found
by index, not a pattern, so a long line cannot freeze the page; a line is
kept to 500 characters (`ING_MAX`) by the Add recipe form. An import is not
held to it: older forms took any length, so that is data the app already
holds, and refusing it would refuse the owner's own export and Put back.

**Planned meal**:
One entry in `state.plan`: a recipe, a real date, a slot (breakfast, lunch,
dinner) and its own portion count. Its own thing, not a flag on the recipe,
which is what lets the same recipe be planned twice in a week at different
portions. The shopping list buys these portions, not the recipe's.

**The week**:
A rolling seven days from today, not a Mon-Sun week. A meal drops off the back
the day after it was for, and `prunePlan()` deletes it.
_Avoid_: this week, calendar week

**Shopping row**:
One line of the shopping list, keyed so a tick survives a portion change.
`i|<name>` is derived: every mention of an ingredient across the planned meals
in view, at each meal's portions, added into one row. kg folds into g and l
into ml; amounts that do not add (200g and a handful) share the row
("Spinach (200g + 1 handful)"). Countable amounts (tins, cloves, onions)
always round UP, since 0.4 of a tin cannot be bought and being short costs a
trip; weights, volumes and spoons stay fractional.

**Extra**:
A shopping row typed by hand (`x|<id>`, in `state.shopExtras`). No quantity,
no recipe, so clearing the week leaves it; it sorts into the same alphabetical
list.

### Undo

**Undo**:
One slot (`undoMem`, copied to `sessionStorage` as `fc.undo` so it survives
the reload a save can cause and ends with the tab; with storage blocked it
still works, it just does not survive that reload). Offered for ten minutes as
a toast fixed to the bottom of every view, shrinking to its two buttons after
nine seconds; the page keeps room below its end for it. Announced once from a
live region outside `#app`. Not offered once the item is back by another
route, so it never puts back a second copy.
_Avoid_: history, trash

**Undo kind**:
What the slot holds: `sauna` (a visit), `log` (a finished session, with the XP
it took), `recipe` (with its planned meals), `lib` (a note), `meal` (a planned
meal), `extra` (with its tick), `week` (a cleared week with its ticks),
`session` (a discarded or replaced session), `sessionEx` (one exercise taken
out of a session, tied to that session's `t0`, not the next of the same
workout), and `many`.

**Many**:
A run of list removals (`sauna`, `log`, `recipe`, `lib`, `meal`, `extra`)
each within five seconds of the last, joined so one Undo puts back everything a
quick run of taps took. A second tap on the same spot within 400ms is ignored.

### Saving and views

**Store**:
The one object (`dbStore`) every read and write of saved data goes through.
See **The Store seam**.

**View**:
One open copy of the app (a phone tab, a tablet tab). Each has an id made at
load (`DB_VIEW`, `pend_` plus a random part) and keeps `lastSaved`, what it
last heard from the store, per document.
_Avoid_: client, device (one device can hold two views)

**Merge**:
What a save does with another view's changes: the documents both views are
likely to touch are re-read and combined field by field against `lastSaved`.
See **Merge between views**.

**Pending fields**:
A view's `pend_` field on a document: the merging fields it sent without
re-reading, as it last heard them (`b`) and as they are now (`m`). Every read
folds another view's in as that view's change.

**Store state** (`dbState`):
`loading`, `db`, `local`, `error` or `paused`. See **Store states**.

**Saving pill**:
The status fixed to the bottom of the screen, outside `#app` and never rebuilt
by a render, a polite live region. Shows saving, and a failed save ("Not saved,
retrying", or "Not saved" when retrying cannot help) until a save lands.

**Ui state**:
What a device is looking at, not part of the record: tab, slide, chart range,
whether the session screen is open, which exercise histories and recipe cards
are unfolded, and the yesterday nudge waved off. Kept in `localStorage` under
`fc.ui` and never in the store, because writing it to the profile made every
tab change carry this view's stale XP over another view's.

## Where data lives

Two stores, and the split is the point.

**The artifact document** holds code: the `App` function, the CSS string, the
exercise library, and 79 rigs' worth of geometry. It changes only when a new
version is published.

**The `db` capability** holds everything the user logs, as small documents:

| path | what |
|---|---|
| `state/profile` | XP, `waterTarget`, `weekTarget`, `deletedRecipes` |
| `state/shopping` | `shoppingChecked` (ticked rows) and `shopExtras` |
| `state/session` | `active`, the session in flight or null, and `ended`, the ids of the last twenty ended sessions |
| `state/meta` | the seeded marker (with `paths`, the documents its seed had), and `importing` while an import is unfinished |
| `state/seeding` | only the lease the view seeding a fresh store holds; never read as data |
| `days/<YYYY-MM-DD>` | one day |
| `workoutLogs/<id>` | one finished session and its sets |
| `sauna/<id>` | one sauna visit and its stints |
| `library/<id>`, `recipes/<id>` | notes and recipes |
| `plan/<id>` | one planned meal |

**The browser** holds what belongs to one device or one tab:

| key | where | what |
|---|---|---|
| `fc.ui` | `localStorage` | ui state |
| `fc.backup` | `localStorage` | the record before the last import, in the export format |
| `fc.importing` | `localStorage` | what an unfinished import is writing |
| `fc.logDate` | `sessionStorage` | the backfill date |
| `fc.undo` | `sessionStorage` | the undo slot |
| `fc.drafts` | `sessionStorage` | half-entered drafts, across a save without a store |

Every read and write of these is wrapped, and the app works with them blocked;
it only loses what they would have kept.

Data used to live inside the document. Every water tap rewrote the whole page
and republished it, and a republish reloads every open view, which is what
reset the backfill date, swallowed change events and made conflicts when the
app was open twice. A tap now writes about 150 bytes and nothing reloads.

`state/meta` is the switch. Present means read the store and ignore the seed
embedded in the document, so shipping code never touches logged data. Absent
means seed the store from that embedded copy, the marker written last so a
half migration is retried rather than believed.

**Seeding** runs in the background (`dbSeedStart`): the view goes to `db` at
once, running on the embedded seed, which is what is being written. Taps go
into state as ever and saves are held until the marker lands; then
`lastSaved` is the seed as written and the whole store is read and merged, as
when the page is looked at again, so what was tapped meanwhile is saved and
what another view logged comes in. A year of data had kept the page on
"loading your data" for up to half a minute. One view seeds: it holds a lease
(`acquire` on `state/seeding`, ten seconds, renewed every third of that) and
lets it go once the marker is written. Any other view opened meanwhile waits
for the marker, trying for the lease each second, so the lease of a view that
closed part way is taken over when it runs out. Two seeding at once had the
later one's whole documents land over what was logged in the first. The
lease counts as held only while each renewal answers before the last one ran
out and the version moves on by one (no grant to another view between): a
phone suspended mid-seed has its timers stopped, and its lease can lapse,
another view seed and log, and its next renewal still be granted. Lost, it
writes nothing more and looks at the store again. The marker is looked for
before each batch of eight as well, lease or not. A db with no `acquire`
(and `MemoryStore`), or one that refuses it, also reads each document just
before writing it and leaves one that is there: without a create-if-absent
write that narrows, and cannot close, the gap in which another view's tap is
written over. A seed picks up where one cut off left it: documents already
in the store are not written again. The marker lists the documents its seed
had (`paths`), and a view that waited on it takes as written only those and
its own: one its build has and the other's did not (a newer prep recipe) is
then saved, not read as deleted. A marker without the list is taken to have
had them all. A refusal retrying cannot fix leaves that document for the first
save to name; a transient one is retried with the save backoff; one in
`DB_LOST` pauses the view. A page closed before the marker lands loses what
was tapped on it, since nothing can be written before.

What a load from the store hands over goes through the same top-ups as the
seed: `topUpRecipes` attaches `RECIPE_META` to a recipe without a base and
adds any built-in prep recipe that is neither there nor in `deletedRecipes`,
on the seed, on a load (beside `migratePlan`, `prunePlan` and
`migrateMinutes`) and on an import. On a load or an import the first eight
(`PREP_FIRST`, p1..p8) are never added: every store was seeded with them and
`deletedRecipes` is younger than the store, so one missing there was deleted. Notes and recipes are put in the order
they were made (`byListId`): the built-in ids by number (r1..r37, then p1..p8,
t1), then any other id, then those added here, whose ids carry the time they
were made. The store hands a collection back in id order (r1, r10, r11 ...),
which reshuffled them on every load and put a new recipe in the middle.

The store takes at most 256 KiB of JSON in one document, nested at most 32
levels (the body is the first), and no `.` or `..` path segment: a write past
either limit is refused, and a bad path throws as the reference is made.
`docFault` measures a body against the limits (`DB_DOC_MAX`, `DB_DEPTH`, UTF-8
counted at three bytes for anything past ASCII); the Add a note and Add a
recipe forms refuse what would not fit, with a reason, keeping what was typed.

Declaring `db` makes the artifact organization-internal: it cannot be shared
publicly. The app is always published with `db` declared, so a view without a
store is not a reason to save some other way. It is also published with
`downloads` declared (`capabilities: {db: {}, downloads: true}`, alongside
the `artifact` capability it already uses): Export's Download goes through
it, and without it Download is not offered.

## Store states

- `loading`: until the store answers. Taps that change data are held.
- `db`: the store answered and holds the truth.
- `local`: there is no store to read, so the old publish-to-save path is
  right. Only when the page is open outside the artifact runtime (no
  `window.claude.use`), or its embedded seed carries `localOnly: true`, the
  mark of a copy never moved into a store (the browser suites with no db stub
  use it, through `env.localOnly`).
- `error`: the store failed to answer at load, `use('db')` answered null or
  rejected, or the whole load took longer than `DB_BOOT_MS` (12s; the code is
  then `timeout`). Nothing can be changed and nothing is published, because
  editing the embedded seed would be thrown away by the next load, which reads
  the store. The load is retried once on its own, then from the Retry button
  or when the page is looked at again. Each load has a generation (`bootGen`),
  so one given up on that answers late changes nothing.
- `paused`: the store refused this view for good (`DB_LOST`: `revoked`,
  `not_granted`, `capability_disabled`, `capability_removed`), at load or on a
  save. Nothing more is taken or saved for this page load; a banner says
  changes are no longer saved and offers Reload, without saying why access
  went.

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
`{code}`; `dbSave` treats the codes in `DB_HARD` (`invalid_argument`,
`quota_exceeded`, `transform_error`) as final for that change, those in
`DB_LOST` as the end of saving for the page load (`paused`), and anything else,
unknown codes included, as transient. A path `DbStore` cannot make a reference
to (the db throws a `TypeError` synchronously) is an `invalid_argument`
rejection of that one document, so the rest of its batch still goes. A throw
in the app's own code while working out a save (`ownCode`) is `transform_error`,
final for that change, never retried for ever.

A self-hosted backend would be a third Store, a small object with these six
calls over `fetch`, with the same paths as REST resources:

- `put` is `PUT /docs/<path>` with the JSON body; `remove` is
  `DELETE /docs/<path>` (204 whether or not it existed); `get` is
  `GET /docs/<path>`, 404 meaning `undefined`.
- `update` is `PATCH /docs/<path>` with the fields, a shallow merge, 404 when
  absent (mapped to `invalid_argument`, which is what tells a save to put the
  document whole instead). A field sent as `null` is stored as `null`.
- `readAll` is `GET /docs`, answering `{path: body}` for the paths above.
- Errors map to codes: 429 and 5xx to `unavailable`, 400 and 404 on `PATCH` to
  `invalid_argument`, 413 to `quota_exceeded`, 401/403 to `not_granted`, a
  network failure to `unavailable`.
- `subscribe` can be left out, or done with server-sent events on
  `GET /docs/events`.
- Last writer wins per document; the server needs no merging of its own,
  because every view merges before it writes.

The artifact page probably cannot reach such a server (its CSP is likely to
block `fetch` to other hosts), so a backend may mean hosting the page as well.
Check the CSP before building one. Swapping it in is one line where `dbStore`
is made; nothing above the seam changes.

## Saving

**One save at a time.** A change schedules a save a second later
(`scheduleSave`); `dbSave` runs one at a time, and one asked for while another
is out runs when it is done. Every write in a save settles before the next save
starts, and `lastSaved` moves one document at a time as each write lands, so a
late write from an older save never puts back a snapshot a newer one replaced.
Writes go in batches, as seeding does. When a save clears `state/session` and
writes workout logs, the session is written only after those logs landed, so a
finished session is never cleared before its log is stored.

**Retry.** A transient refusal leaves what did not land different from
`lastSaved`, so the next save carries it; that save is scheduled on its own,
backing off 2s, 4s, 8s up to 30s with a little jitter. A refusal in `DB_HARD`
is named in the banner (`docLabel`: "your log for Fri 2 Oct", "the meal plan")
and goes again with the next change. One in `DB_LOST` pauses the view.

**Without a store.** In `local` a save publishes the whole document
(`pubSave`), and the runtime reloads every open view onto it. One publish is
out at a time, and a save asked for meanwhile goes when it is done. Once
`publish` is called the page on screen is the one the reload brings back, so
until the reload (or `PUB_RELOAD_MS` if none comes) taps that change data are
refused and the controls are held, as while loading. A transient refusal is
retried with the same backoff as `dbSave`, and every failure shows on the pill
and the banner. A `conflict` means another view published a newer copy, which
this whole document would overwrite: the view pauses and offers Reload. What
the view is in the middle of goes across the reload: the sauna stints already
added and the temperature, the shopping box, a prep option and its minutes
(`fc.drafts` in `sessionStorage`, read back once). Where web storage is
blocked, what it would have kept (ui state, the backfill date, the drafts)
goes in the published document as `_view`, read only by a `localOnly` copy and
never made state, put in the store or exported.

**Going away.** A save still waiting on its timer goes at once when the page
is hidden or closed. With no time to re-read, it sends only the fields this
view changed (`update`), never a whole document, and the next save merges. A
day this view never read is diffed against a blank day, and a finished
session's log it never read against an empty log; each is put whole only when
the store refuses the update because there is none.

## Merge between views

Before each save the documents two views are likely both to touch
(`state/*`, the day being logged, and any other day about to be written) are
re-read and merged field by field against `lastSaved`:

- A field changed here keeps this view's value; every other field takes the
  store's.
- XP merges as the sum of both views' changes.
- A day's counts (water, the cups that earned XP `wx`, alcohol, smoking,
  weed) merge the same way, as the sum of both views' changes, held between 0
  and the most a day goes to: a cup tapped in each view is two cups. Rest and
  trained are one choice, never both, so `rest` and `workout` merge as a pair:
  this view's if it changed either, else the store's.
- XP follows the records: after a day is merged, what it pays (`dayXp`: the
  cups in `wx`, a trained day, a rest day) less what this view and the store
  each paid for their own copy goes onto XP. So a flag dropped by the pair, or
  a count held at zero, gives back what it paid, and a session finished in two
  views pays once, through its day. When both views changed the water, `wx`
  is held to no more than the merged cups and no more than the water target
  (or what either view had already earned, if more), as one view tapping
  twice would be.
- A profile an older version wrote lacks the settings it had none for
  (`weekTarget`): it is read with the defaults this view fills in, so a
  default is never taken for a change made here. That holds for a page going
  hidden too, which sends only what changed without reading first.
- A whole write that answered with an error may still have landed. Until the
  document is next read, this view keeps what it tried to write; read back
  exactly, it is the base of the merge, so XP and counts are not added twice
  when the save is retried.
- Shopping ticks, extras and deleted built-in recipes merge as sets: the
  store's, less what this view took out since, plus what it added.
- The session in flight merges exercise by exercise: sets as a union keyed by
  when each was logged (`t`), the exercise list and targets key by key. An
  exercise left with no sets has no entry in `logs`, not an empty list.
- A session ended elsewhere stays ended, whatever this view still holds of it.
- A list entry already saved (a session log, a recipe, a note, a planned meal)
  is re-read before it is written again: one this view changed but another
  deleted stays deleted.

When the page is looked at again the whole store is read (`readAll`): an entry
this view has not changed takes the store's copy, or goes when the store's has
gone, and one new elsewhere is added.

A merging field (XP, deleted recipes, ticks, extras, the session and `ended`, a
log's sets, a day's rest or trained pair) is never sent over the store's copy without a re-read, which would
take away what another view added and count this view's change twice. A save
going away puts it beside the document as **pending fields**. Every read (load,
the re-read before a save, an import) folds another view's `pend_` in as that
view's change and leaves its own out, since its own is still in its state; the
next save puts the document back without it. A day's pair always goes beside
it whole. Folding another view's day settles the XP read with it the way a
merge does, and the profile is then put back too. When a view's own has been
folded and cleared by another view, the XP it sent counts as heard, and its
rest or trained pair as the store's. A day's counts are the exception: they go
over the store's at once, so the tap is there for anyone reading it, and once
the store takes them they are this view's base, so the next merge does not
add them again. A count another view saved in the moment before is lost to
that write, as before.

## Export and import

**Export** (Progress, Your data) is the whole record as one JSON document:

```
{schema: 1, exportedAt, waterTarget, weekTarget, totalXp, deletedRecipes,
 days, workoutLogs, saunaSessions, library, recipes, plan, shoppingChecked,
 shopExtras, activeSession}
```

the same shape as the seed embedded in the document. It is shown as text with
Copy and Download, and both take the record as it is at the tap, not as it was
when the pane opened; the text shown is worked out again when the pane opens,
when Progress is shown again and after a change. Download saves
`fight-card-<today>.json` through the `downloads` capability, which asks the
viewer first, and says whether it was saved or declined: inside the artifact
frame a plain download link is dropped without a word. A view with no
`downloads` shows no Download and says to copy the text instead; a page
opened outside the artifact runtime uses a plain download link.

The export and a pasted import run to hundreds of KB, so their boxes are not
drawn as markup. Each is drawn empty and the node itself is kept across
renders (`drawKeeping`): a render that has the box on the page again leaves
it, and its ancestors, in place and replaces everything around them, because
taking a box of that size out of the page and putting it back lays all of its
text out again, which was most of a second a tap. What was pasted stays in the
box when Progress is left and shown again.

**Import** takes pasted text, in one of two forms:

- **An export.** `readImport` only `JSON.parse`s it and checks every shape
  before any of it becomes state: `schema` must be 1, days keyed by date, every
  list entry an object whose id is a safe path segment (ids become document
  paths), no duplicate ids, targets in range, every field of a set the kind
  `logSet` writes, a day's workout type and a session's tag one of the workout
  types, a planned meal's slot breakfast, lunch or dinner. An id is never `.`
  or `..`. Every document the import would write has to fit the store (see
  Where data lives), with two levels spare for pending fields, and is named
  when it does not ("The recipe "Big stew" is too large to store"); the text
  is refused unread when its brackets nest deeper than an export does. A
  recipe's ingredient line is at most 500 characters. Fields the check does
  not know are kept, not dropped, so measuring the whole document is what
  keeps a deep or huge one out. Ids, and the keys of
  a session's or a log's sets and targets, are refused when they are a name
  `Object.prototype` already has (`constructor`, `toString`), and any key
  called `__proto__` is refused anywhere. Anything else is refused with a
  reason and nothing is written. Older shapes are converted as a load converts
  a store.
- **A raw dump** of a store (`readDump`): `{path: document}`, or a list of
  `{path, data}` or `{collection, doc_id, data}`. This is how data comes over
  from the old artifact on the old account (see MIGRATION.md). Its `pend_`
  fields are folded in, it goes through `dbApply` as a load does (so old
  shapes are converted), and the result is then checked as an export; the
  summary counts its documents and any it left out.

Everything an import carries is drawn escaped, as text. A good one shows a
summary (when it was exported, on this device's calendar; days, sessions,
planned meals, recipes, notes, sauna). Planned meals are counted as
the import keeps them: an old recipe's `inPlan` becomes a meal, and meals
whose day has gone are left out, as the summary says ("3 planned meals (9
past, left out)"). Then:

- **Replace** makes it the whole record.
- **Merge** adds what is new and replaces anything with the same id or date,
  keeping this view's targets, XP (plus that of what it brings in), shopping
  and session in progress. The XP it pays is per date the incoming day's cups,
  trained day and rest day less those of the day it replaces, plus a sauna
  visit with a new id, clamped at 0; so removing a merged session later takes
  back only XP that was paid.

Neither says it is done ("Imported.") until the last write has landed.
Each takes the text in the box when tapped: text changed since Check is checked
again and shown, and only the next tap imports it. Either way it becomes state
and is written by `dbSave` as whole documents, straight away rather than after
the usual re-read (which would merge the old day back over the imported one),
and retried the same way.

**Backup.** The whole store is read first, and the data it replaced is kept in
`fc.backup`: what the store held with this view's unsaved changes on top, so
it includes what another view saved after this one loaded. Replace then deletes
every document the import does not have. "Put back the data before the last
import" restores the backup as a Replace, after asking: it names when the copy
is from and what it replaces, and it is gone until the writes have landed, so a
second tap cannot swap it back. Where this device cannot keep a copy, the
import says so before and after and offers an export first. A session in
progress that an import replaces counts as ended in every view. An import
clears any undo offered before it.

**Unfinished import.** An import is many writes (a year is about 700), so it
is made safe to cut off. Before the first write, what it is writing is kept in
`fc.importing` and `state/meta.importing` is set to the time that copy was
taken; both are cleared only once the last write and delete have landed, and
until then the app says "Importing 140/736, keep this open". A load that finds
`fc.importing` while the store carries the same mark finishes the import if the
copy is under 15 minutes old; an older one is offered ("Finish the import
started ...") rather than replayed, since it would undo what another device
did since. A copy the store is no longer marked by is dropped. A load that
finds only the store's mark says the import did not finish and offers the
backup or to leave it. An import refused for good is unfinished in the same
way, and Leave it drops the copy and the mark. While an import is unfinished
`fc.backup` is never replaced, so it stays the data from before the first one.

## The rig

`pose/` is the exercise animation, testable on its own.

**Frame**:
One keyframe: hip position, torso angle, ankle positions, and arms given
either as angles (`armN`) or as a hand target (`handN`). Limbs are fixed
lengths; the solver never stretches one.
_Avoid_: pose (a pose is the named starting position an exercise refers to)

**Side view**:
The sagittal drawing, solved from planted feet upward.

**Front view**:
Either derived from the side by `frontFromSide` (symmetric sagittal
movements) or hand-authored (unilateral ones, and anything whose arms point at
the camera). The front dumbbell raise ships with none: the frontal projection
collapses onto the shoulders, so its second panel is the finish of the side
view.

**Plan view** (`frontPlan`):
Looking down at someone on the floor. No gravity and no ground line; labelled
"Above".

**armScale**:
How much of its true length an arm projects in a view, 1 being square to the
camera (`armScaleL`/`armScaleR` on a front frame, `armScaleN`/`armScaleF` on a
side one). The only way to draw an arm pointing at the viewer, because the
solver bends limbs rather than shortening them.

**Bend sign**:
Which of the two mirror IK solutions a knee or elbow takes. Decided at
keyframes only (`kneeSign`/`elbowSign` on a side frame; on a front frame the
solver picks elbows low and knees out, or `kneeSignL/R`, `elbSignL/R` set it)
and blended between them, so a joint never jumps to its mirror mid-rep. A
front keyframe whose hand hangs straight below the shoulder has no low side,
so it takes its nearest neighbour's elbow side. A sign that changes between
two side keyframes swings the limb through straight, which the stretch check
flags.

**Continuity**:
No joint jumps between frames: bend signs are chosen at keyframes, and a joint
given in only one keyframe blends with the solved joint of the other. The
continuous-motion suite fails any joint moving more than 3 units between
samples 1/2000 of a rep apart, in both views and in the rig the app ships.

**Axis**:
Which way a dumbbell's handle runs: `lateral`, `sagittal`, `vertical`.
Decides whether the side view shows a bell face or the whole dumbbell.

**Shrug**:
A shoulder-elevation offset, the only degree of freedom that is not a joint
angle, because a shrug is the shoulder girdle riding up a fixed ribcage.

Eleven exercises have no rig deliberately: warm-up, cool-down, technique and
rounds blocks and the three gym-machine slots are containers rather than
movements, and the four swim entries have no ground to stand on.

`RIGFRAMES` in the app is generated from `pose/exercises.js` by
`pose/emit-rig.js`, never edited by hand: change `pose/` and regenerate.
`emit-rig.js --check` (part of `npm test`) fails when the app is behind.
`pose/probe.js` reports a frame set's margins against the rig's limits while it
is being authored.

## Test suites

`npm test` runs both halves: `test:pose` for the rig, then `test:app`, which
builds the document (`build-publish.js`) and runs every suite over it. It takes
about ten minutes. Browser suites launch Chromium through `test-env.js`
(`launch()`, `PUBLISH`; `FC_CHROMIUM` and `FC_PUBLISH` override) and stub the
artifact capability faithfully: a publish saves AND reloads, and a db stub
survives the reload while the document does not. Tests that skipped the
reload once hid a whole class of bug. Headless suites pull functions out of
the shipped `index.html`, so they test what ships.

`test:pose`:

- `pose/build.js`, then `emit-rig.js --check`: the app's rig matches `pose/`.
- `pose/checks/`: movement criteria (`analyse.js`), adversarial geometry,
  continuous motion, views, and rendering.

`test:app`, in the order it runs:

- `test-build.js`: the build does not depend on accidents of the source, and
  the page has exactly one stylesheet, the current CSS.
- `test-tooling.js`: `build-publish.js` and `emit-rig.js` refuse a mistyped
  command rather than overwrite a file.
- `test-shopping.js`: shopping arithmetic swept over every recipe and pair;
  countable amounts checked against what you have to BUY. Ingredient parsing,
  in linear time on a long line.
- `test-planmodel.js`: the plan model, including the one-way migration off the
  old `inPlan`/`day` pair.
- `test-catalog.js`: the exercise and workout catalogues as data: no duplicate
  ids, every planned exercise in the library, targets that match what the box
  logs, minute units.
- `test-volume.js`: what counts as weight moved, and what a log keeps of
  supersets.
- `test-coaching.js`: last time and the prefill, warm-up sets, the rest clock,
  session length, streaks, the week target, form cues.
- `test-roundtrip.js`: state survives `dbDocs`/`dbApply` with every key.
- `test-app.js`: the real save cycle, backfill dates and session dating.
- `test-removal.js`: swipe-to-remove and undo.
- `test-undo.js`: the undo offer on a phone: quick runs of removals, blocked
  storage, a shopping item, which session an undo belongs to, the
  announcement, and the toast staying clear of the page.
- `test-session.js`: prep steps, per-implement weights, sauna stints, search.
- `test-meals.js`: recipe portions and the shopping list in the browser.
- `test-publish.js`: the save without a store: one publish at a time, a
  refusal retried and shown, a conflict, a publish that throws, a tap while one
  is out, and the session screen and drafts kept across the reload, with web
  storage and without.
- `test-db.js`: seeding (in the background, one view at a time, a lease run
  out, a store with no leases, a seed cut off), small saves, reload survival,
  merge between views,
  save serialization and retry, every store state and how a failed save shows,
  imports in the browser: the backup, Put back and an unfinished import; the
  store's per-document limits, which the stub keeps, and the forms and imports
  that would pass them.
- `test-store.js`: the Store contract over `MemoryStore`; export then import
  reproducing the record exactly; raw dumps and state as 5aba0f6 held it;
  malformed imports refused with a reason, including ids, depth, size and
  ingredient lines the store or the page could not take.
- `test-plan.js`: the meal planner in the browser: the same meal twice, slots,
  partial-week shopping.
- `test-design.js`: computed contrast, tap target sizes, what touch can reach,
  and layout at phone width.
- `test-dates.js`: the log date picked by a real tap and typed, a backfill left
  from yesterday, a view open across midnight, a past day looked at without
  leaving a blank record.
- `test-touch.js`: real touch input on a phone context: the slide swipe,
  swipe-to-remove, and what a scroll, pinch, caret drag or cancelled touch must
  not do.
