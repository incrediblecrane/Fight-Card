# Fight Card

A personal training, nutrition and habit tracker. Published as a Claude Artifact:
https://claude.ai/code/artifact/23eff3ea-c353-489a-a4eb-ae644cea2838

Built for one user (Andy) to sustain a routine, not to be a general fitness app.
Design bias throughout: low friction, forgiving mechanics, nothing that needs
willpower or memory to keep up.

## Layout

- `index.html` — the whole app. One inline `<script>`: `function App(DATA){...}`
  called with the seed data. Republishing regenerates the document with
  `(${App.toString()})(JSON.parse("<the data as JSON>"))`, so the function
  source round-trips through `.toString()`. The data goes in as text for
  `JSON.parse`, not as an object literal, which would take a key called
  `__proto__` as a prototype; an older document holding the literal still
  reads, and `seedAt` in `test-env.js` finds the seed either way.
- `pose/` — the exercise-animation rig, extracted and independently testable.
  - `rig.js` — planted-feet inverse kinematics, human proportions, interpolation
  - `exercises.js` — exercises as keyframes plus per-exercise tempo
  - `checks/` — movement and rig verification suites (`npm test`)
  - `preview.html` — animated preview, published separately from the app
- `.claude/skills/` — vendored engineering skills. See its README.
- `CONTEXT.md` — the domain model: what the words mean, where data lives.

## Workflow

Follow this on every change:

1. **Diagnose before fixing.** For anything broken or "not right", use
   `/diagnosing-bugs` to find the root cause first. This project's repeated
   failure mode is treating symptoms: three cosmetic passes on the figures
   before finding that the rig had floating feet.
2. **Test it.** Run `npm test`: `test:pose` is the rig suite and `test:app`
   builds the document and runs every browser and headless suite over it. Use
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
  organization-internal: it cannot be shared publicly.

## Style

- No em dashes in prose.
- Be a blunt sparring partner, not a yes-man. Push back on scope creep.
- Cite sources for health and factual claims; flag weak sources.
