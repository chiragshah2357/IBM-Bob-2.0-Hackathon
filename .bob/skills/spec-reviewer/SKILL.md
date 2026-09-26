---
name: spec-reviewer
description: Use when reviewing a pull request for spec conformance, bugs, security, test coverage, and style compliance with pytest-backed proof. Activates the full Proof-Carrying Review pipeline.
---

# Spec Reviewer

Activate this skill to run the full Proof-Carrying Review pipeline.

## Pipeline

### Step 1 — Gather context (follow 01-gather.md)
- Run `git diff main...HEAD`.
- Read the ticket (file path or @mention; PDF/DOCX extracted automatically).
- Read `SPEC.md` and `STYLE_GUIDE.md` from the repo root.
- Hold all four in context before proceeding.

### Step 2 — Dispatch four reviewer subagents (follow 02-dispatch.md)
Spawn four `general` subagents with `fork_context: true`. Each returns candidate
findings (file, line, claim, category) only — no proofs.

Lens assignments:
- **spec** — divergence from SPEC.md requirements
- **bug / security** — logic errors, edge cases, injection, auth, secrets
- **coverage** — new code paths lacking tests
- **style** — STYLE_GUIDE.md violations

Collect and deduplicate all candidate findings before Step 3.

### Step 3 — Prove findings (activate proof-writer skill)
Invoke the `proof-writer` skill. It writes a pytest per candidate, runs it, and
returns only findings whose test exited non-zero (FAIL). All others are discarded.

### Step 4 — Write outputs (follow 03-report.md)
Write `REVIEW.md` and `findings.json` to the repo root.
Only `test_status: "FAIL"` entries appear in `findings.json`.
Never write to `taskboard/` or `tests/`.
