# Proof-Carrying Review

A code-review workflow built on **IBM Bob 2.0** that reviews a pull request against its
ticket and specification — and reports a finding **only if it can write and run a test
that fails because of it**. No failing test, no finding. Reviews are evidence-backed by
construction, not opinion.

## Why

Code review is slow and noisy. Human reviewers miss requirements buried in large diffs;
generic AI reviewers flood PRs with unverified comments people learn to ignore. Proof-
Carrying Review attacks both: it checks the diff against the actual ticket + `SPEC.md` +
`STYLE_GUIDE.md`, and every reported issue ships with a reproducing test.

## How it works (IBM Bob)

A custom **Spec Reviewer** mode orchestrates the review:

1. **Gather** — `git diff`, the ticket, `SPEC.md`, `STYLE_GUIDE.md` (Bob reads PDF/DOCX too).
2. **Review (parallel subagents)** — four lenses: spec conformance, bugs & security,
   test coverage, style compliance.
3. **Prove** — for each candidate, write a `pytest` that fails iff the issue is real; run
   it; keep only the ones that fail.
4. **Fix-and-prove** — for mechanical issues, apply a fix and re-run until the test passes.
5. **Report** — `REVIEW.md` (human brief) + `findings.json` (machine-readable).

## Repository layout

```
.bob/
  custom_modes.yaml            # the Spec Reviewer mode
  rules-spec-reviewer/         # orchestration steps (gather / dispatch / report)
  skills/
    spec-reviewer/             # pipeline overview
    proof-writer/              # write + run the proving tests
evidence/                      # IBM Bob task-session screenshots & summaries
PLAN.md                        # Bob's capability research + design plan
```

The live dashboard, scorer, and benchmark are added in follow-up work.

## Built with IBM Bob 2.0

The mode and skills were authored inside IBM Bob using its create-mode and create-skill
workflows. Task-session evidence is in `evidence/`.
