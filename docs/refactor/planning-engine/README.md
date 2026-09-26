# Planning engine refactor: working folder

Branch `refactor/planning-engine`, worktree `.claude/worktrees/planning-engine`,
started from `main` at `2134823` (PR #487).

These files are how the work is split between two places:

- **Cowork (Jan + Claude):** discussion, review and decisions. Writes
  `PLAN.md`, `TASKS.md` and the decision log.
- **Claude Code (in this worktree):** runs the tests and benchmarks, writes
  the code, reports in `STATUS.md`.

| File | Owner | Purpose |
| --- | --- | --- |
| `REVIEW.md` | Cowork | Findings from the code review, with line references at `2134823` |
| `PLAN.md` | Cowork | Phases, gates between them, decision log |
| `TASKS.md` | Cowork | The current tasks for Claude Code. Only work on what is listed here |
| `STATUS.md` | Claude Code | Results, numbers, deviations and open questions |

## Rules for Claude Code

1. Read `PLAN.md` and `TASKS.md` first. Work only on the tasks in `TASKS.md`.
2. Tick tasks off in `TASKS.md` as you finish them. Don't add new tasks there;
   put proposals under "Questions for Cowork" in `STATUS.md`.
3. Write every result (test counts, coverage, benchmark numbers, failures)
   into `STATUS.md`, with the commit hash it was measured on.
4. If something contradicts `REVIEW.md` or `PLAN.md`, stop and write it into
   `STATUS.md` instead of working around it.
5. Commit on this branch in small commits. Don't push or open a PR unless Jan
   asks.

## Kickoff prompt for Claude Code

> Work in this worktree. Read `docs/refactor/planning-engine/README.md`,
> `PLAN.md`, `REVIEW.md` and `TASKS.md`, then do the tasks in `TASKS.md` and
> report in `STATUS.md`.
