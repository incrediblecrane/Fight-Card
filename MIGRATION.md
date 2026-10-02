# Moving your data from the old artifact

The old Fight Card artifact keeps everything you logged in its own database.
This app can import that database as it is: a dump of every document, keyed by
its path. Import reads it the way the app reads its own store when it opens,
so documents in the old shape (recipes with a weekday, drills in seconds, the
old profile) are converted on the way in.

## 1. Dump the old artifact

Open Claude Code signed in to the OLD account (the one that owns the old
artifact) and paste this prompt as it is:

```
Use the ArtifactData tool on https://claude.ai/code/artifact/23eff3ea-c353-489a-a4eb-ae644cea2838
to read its whole database and save it as one JSON file. Only read: do not write,
update or delete anything in that database, and do not publish anything.

1. For each collection in: days, workoutLogs, sauna, library, recipes, plan
   call ArtifactData action "list" with query {"limit": 1000} and out_dir
   "./fc-dump". If a result has a next_cursor, call it again with that cursor
   until there is none. A collection that is empty or missing is fine.
2. Call ArtifactData action "list" on the collection "state" the same way, so
   state/profile, state/shopping, state/session and state/meta are included.
3. Write and run a small script that walks ./fc-dump and builds ONE JSON
   object whose keys are "<collection>/<doc_id>" (for example "days/2026-08-29",
   "workoutLogs/wl1788070912139", "state/profile") and whose values are the
   documents' own fields, exactly as stored. If a saved file wraps the document
   with metadata such as version or id, keep only the document's fields. Do not
   change, round, rename or drop any field.
4. Save that object as fight-card-dump.json, then tell me how many documents
   it holds per collection and the file's size. Check it parses as JSON.
```

The result looks like this (shortened):

```json
{
  "state/profile": {"waterTarget": 8, "totalXp": 1240, "uiTab": "today"},
  "state/session": {"active": null},
  "days/2026-08-29": {"water": 6, "workout": {"done": true, "type": "Conditioning"}, "rest": false},
  "workoutLogs/wl1788070912139": {"id": "wl1788070912139", "date": "2026-08-30", "logs": {}}
}
```

Import also takes the same documents as a list, either
`[{"path": "days/2026-08-29", "data": {...}}, ...]` or
`[{"collection": "days", "doc_id": "2026-08-29", "data": {...}}, ...]`, so a
dump in either of those shapes works too. Documents this app does not use are
left out and counted in the summary; `state/meta` is always left out.

## 2. Import it here

1. Open fight-card-dump.json and copy all of it, from the first `{` to the
   last `}`. This is easiest on the tablet or a computer.
2. In Fight Card, go to Progress, then the Data card, and tap Import.
3. Paste into the box and tap Check. It reads "A database dump of N
   documents" followed by the days, sessions, planned meals, recipes, notes and
   sauna visits it found. If a count looks wrong, stop and dump again.
4. Tap "Replace everything with this" to make the old data the record here, or
   "Merge in by id" to add it to what is already logged here (anything with the
   same id or date is replaced by the old copy).
5. Keep the page open until "Imported." shows. If it is closed early, the
   import is finished the next time the app opens.

What was here before the import is kept on this device, and "Put back the data
before the last import" on the same card restores it.
