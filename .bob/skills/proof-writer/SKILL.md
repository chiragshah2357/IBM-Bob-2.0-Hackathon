---
name: proof-writer
description: Use when writing and running a pytest that proves or disproves a candidate code finding. Writes the test to review_tests/, runs it, and returns only findings whose test fails.
---

# Proof Writer

Given a list of candidate findings from the reviewer subagents, prove or discard
each one by writing and running a pytest.

## Rules

- All test files go in `review_tests/` at the repo root. File name: `test_<id>.py`
  (e.g. `review_tests/test_F1.py`).
- Never create or modify files inside `taskboard/` or `tests/`.
- A finding is **proven** only if its pytest exits non-zero (test FAILED).
- A finding whose test passes is silently discarded — never reported.

## For each candidate finding

1. **Write the test** — `review_tests/test_<id>.py`.
   The test must import and exercise the specific code at `file:line` named in the
   finding. The test should pass on correct code and fail on the buggy code as it
   exists in the PR. Keep it minimal: one function, one assert.

2. **Run the test**:
   ```
   pytest review_tests/test_<id>.py --tb=short -q
   ```

3. **Evaluate exit code**:
   - Non-zero (test FAILED) → finding is proven. Capture the short `--tb=short`
     output as `test_output`. Assign severity:
     - `high` — security, data loss, crash
     - `med` — incorrect behaviour, spec violation
     - `low` — style, coverage gap
   - Zero (test PASSED) → discard the finding entirely.

## For mechanical findings only (category `style` or trivially fixable `spec`)

After proving the finding:
1. Apply the minimal code fix directly to the source file.
2. Re-run the test. If it passes, capture `git diff HEAD` as `fix_diff`.
3. If still failing after a second attempt, mark `fix_diff: null` and set the
   finding status to `unresolved` in your summary (it will still appear in
   `findings.json` with `test_status: "FAIL"` and `fix_diff: null`).

## Return value

Return a structured list of proven findings to the orchestrator:
```
[
  {
    id, category, severity, file, line, claim,
    test_file, test_status: "FAIL", test_output,
    fix_diff,   # string or null
    ticket_ref  # from context, or null
  }
]
```

Only include entries where `test_status` is `"FAIL"`.
