# 03 — Report

After the proof-writer skill returns its proven findings list, write two output files.
Both go to the repo root. Never touch `taskboard/` or `tests/`.

---

## REVIEW.md

Structure:

```
# PR Review — <branch or commit>

## Summary
<2-4 sentences: total findings, categories, overall verdict>

## Findings

### <ID> — <claim> (<severity>)
- **File:** `<file>:<line>`
- **Category:** <category>
- **Ticket ref:** <ticket_ref>
- **Test:** `<test_file>`
- **Test output:**
  ```
  <test_output excerpt>
  ```
- **Fix diff:** <inline unified diff, or "none — manual fix required">
```

One `###` block per proven finding. Omit findings whose test did not fail.

---

## findings.json

Write an array whose entries conform exactly to this schema. Include only findings
where `test_status` is `"FAIL"`. Any finding whose test passed or was not run is
silently excluded — do not add it with a different status.

```json
[
  {
    "id": "F1",
    "category": "spec|bug|security|coverage|style",
    "severity": "high|med|low",
    "file": "taskboard/x.py",
    "line": 42,
    "claim": "one sentence",
    "test_file": "review_tests/test_F1.py",
    "test_status": "FAIL",
    "test_output": "short excerpt",
    "fix_diff": null,
    "ticket_ref": "TICKET-00X"
  }
]
```

Field rules:
- `id` — sequential, prefixed `F`, e.g. `F1`, `F2`.
- `category` — exactly one of: `spec`, `bug`, `security`, `coverage`, `style`.
- `severity` — exactly one of: `high`, `med`, `low`.
- `fix_diff` — unified diff string if a mechanical fix was applied and the test now
  passes; `null` otherwise.
- `ticket_ref` — ticket identifier from the gathered ticket context; `null` if none.
- `test_status` — always `"FAIL"` in this file. Entries with any other value must not
  be written.

After writing both files, validate `findings.json` is well-formed JSON:
```
python -m json.tool findings.json
```
Report any parse error to the user.
