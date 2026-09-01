# Installed skills

Engineering skills from https://github.com/mattpocock/skills (docs/engineering).
Installed 2026-09-01 from commit 6654f6b.
Licence: MIT License.

These are vendored copies. To update, re-copy from upstream, or use the
maintainer's auto-updating plugin instead: /plugin install mattpocock-skills
(installing both would give you every skill twice).

## Local modifications

- `code-review` was renamed to `conformance-review` to avoid colliding with
  Claude Code's built-in `code-review` skill (the project skill was shadowing
  the built-in one entirely). Its `name:` field, a disambiguating clause in its
  description, and cross-references from `ask-matt`, `tdd` and `implement` were
  updated to match. Everything else is upstream, unmodified.
