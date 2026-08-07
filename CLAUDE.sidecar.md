# CLAUDE.md sidecar — editing rules + decision log

## Editing rules for CLAUDE.md

- Terse, machine/LLM-readable. Keep word/token count low. No fluff.
- Do NOT bloat. Delegate detail to child/linked files; all links are
  optional reading, never mandatory.
- Do NOT add sections without explicit user approval.
- Nothing conflicting or confusing may remain in it.
- No "User decision ..." / change-log / "Previously ..." notes in
  CLAUDE.md — those belong in this sidecar only.
- These rules apply to CLAUDE.md files only, not other docs.

## Repo-wide sidecar rule

Decision notes and change logging (e.g. "User decision 2026-08-07",
"Previously did XYZ") must live in sidecar files, never in core files —
anywhere in the repo. Not retroactive.

## Decision log

- 2026-08-07: Single root CLAUDE.md; no per-directory CLAUDE.md files
  for now — feature folders are uniform, per-section files would
  duplicate the root. Candidate for a future child file:
  `src/features/planning/` if the subsection/planning feature adds
  enough local complexity.
- 2026-08-07: Adopted sidecar pattern (rules above) per user request.
