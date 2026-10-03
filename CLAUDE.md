# Fight Card

A personal training, nutrition and habit tracker, published as a Claude Artifact
with the `db` capability. It is being republished on a new account: the new
artifact URL is to be filled in here on publish. The old artifact,
https://claude.ai/code/artifact/23eff3ea-c353-489a-a4eb-ae644cea2838, belongs
to the old account and is only read, to move the data across (MIGRATION.md).

Built for one user (Andy) to sustain a routine, not to be a general fitness app.
Design bias throughout: low friction, forgiving mechanics, nothing that needs
willpower or memory to keep up.

## Layout

- `index.html`: the whole app. One inline `<script>`: `function App(DATA){...}`
  called with the seed data. Republishing regenerates the document with
  `(${App.toString()})(JSON.parse("<the data as JSON>"))`, so the function
  source round-trips through `.toString()`. The data goes in as text for
  `JSON.parse`, not as an object literal, which would take a key called
  `__proto__` as a prototype; an older document holding the literal still
  reads, and `seedAt` in `test-env.js` finds the seed either way.
- `pose/`: the exercise-animation rig, extracted and independently testable.
  - `rig.js`: planted-feet inverse kinematics, human proportions, interpolation
  - `exercises.js`: exercises as keyframes plus per-exercise tempo
  - `checks/`: movement and rig verification suites (`npm test`)
  - `preview.html`: animated preview, published separately from the app
- `build-publish.js`: builds the document to publish, exactly what the app's
  own save writes (`index.html` on disk carries the injected runtime, so it is
  not the thing to publish). Strict about its arguments.
- `test-env.js`: what every suite needs from the machine (`launch()`,
  `PUBLISH`, `FC_CHROMIUM`, `FC_PUBLISH`); `test-*.js`: the suites, listed in
  CONTEXT.md under Test suites.
- `.claude/skills/`: vendored engineering skills. See its README.
- `CONTEXT.md`: the domain model: what the words mean, where data lives, the
  Store seam, saving and merging, export and import, the test suites.
- `MIGRATION.md`: moving the data from the old account's artifact by import.

## Workflow

Follow this on every change:

1. **Diagnose before fixing.** For anything broken or "not right", use
   `/diagnosing-bugs` to find the root cause first. This project's repeated
   failure mode is treating symptoms: three cosmetic passes on the figures
   before finding that the rig had floating feet.
2. **Test it.** Run `npm test` (about ten minutes): `test:pose` is the rig
   suite (`pose/build.js`, `emit-rig.js --check`, then `pose/checks/`:
   analyse, adversarial, continuous, views, render) and `test:app` builds the
   document and runs every suite over it: build, tooling, shopping, planmodel,
   catalog, volume, coaching, roundtrip, app, removal, undo, session, meals,
   publish, db, store, plan, addplan, ticks, design, dates, touch, slideview, a11y (`test-<name>.js`). A new suite goes
   into `test:app` in `package.json` and into CONTEXT.md's list. Use
   `npm run test:pose` alone only for the fast loop while authoring a rig, never
   as the gate before publishing: `npm test` used to be the rig suites only, so
   a change to the app could ship green with none of its own checks run. When
   fixing a bug, add a check that fails first and passes after, so it cannot
   silently return.
3. **Review before publishing.** Run `/code-review` on the diff. Publishing
   overwrites a live app holding real logged data, so a defect gate is cheap
   relative to the cost of shipping one.
4. **Read the artifact before republishing.** Always `Artifact action: "read"`
   first and merge in any state changed by live use. Never blind-overwrite.
5. **Keep `CONTEXT.md` current** when domain vocabulary or architecture changes,
   via `/domain-modeling`, so sessions don't re-derive context by hand.

## Known constraints

- **Exercise demos must stay procedural.** No AI-generated or photographic form
  imagery: a realistic-looking image carries authority it hasn't earned, and a
  wrong one gets copied literally. Everything is drawn from explicit joint
  angles that can be pointed at and checked.
- **State and code are now separate.** Logged data lives in the `db` capability
  as small documents; the artifact holds only code. A water tap writes ~150
  bytes and nothing reloads, and shipping code no longer touches data. See
  CONTEXT.md for the layout. Declaring `db` makes the artifact
  organization-internal: it cannot be shared publicly. All store access goes
  through one Store object, so a different backend is a new Store, not a
  rewrite; CONTEXT.md describes the seam.
- **Publish with `downloads` declared** as well as `db`
  (`capabilities: {db: {}, downloads: true}`): Export's Download saves through
  it, and a view without it offers no Download.
- **The rig in `index.html` is generated.** `RIGFRAMES` comes from `pose/` by
  `pose/emit-rig.js`: change `pose/` and regenerate, never edit it in place.
- **`App.toString()` must round-trip**, and the app is compact ES5 in one
  function: match the surrounding style.

## Style

- No em dashes in prose.
- Be a blunt sparring partner, not a yes-man. Push back on scope creep.
- Cite sources for health and factual claims; flag weak sources.
