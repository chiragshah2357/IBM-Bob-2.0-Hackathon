# PR Review — feat/priority-validation (TICKET-003)

## Summary
1 proven finding: a high-severity spec violation. `_validate_priority` uses a strict less-than comparison against `MAX_PRIORITY`, making priority=5 (the lowest valid priority per SPEC §1) incorrectly rejected with a `ValueError`. The bug affects `create_task`, `set_priority`, and any other caller of `_validate_priority`. The PR's tests never exercise priority=5, so the defect is invisible in the test suite. The PR is **not mergeable** in its current state.

## Findings

### F1 — _validate_priority rejects priority=5 (off-by-one on upper bound) (high)
- **File:** `taskboard/service.py:26`
- **Category:** spec
- **Ticket ref:** TICKET-003
- **Test:** `review_tests/test_pr03_F1.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr03_F1.py::test_create_task_accepts_priority_5
  taskboard\service.py:27: in _validate_priority
      raise ValueError(
  E   ValueError: priority must be between 1 and 5, got 5

  FAILED review_tests/test_pr03_F1.py::test_set_priority_accepts_priority_5
  taskboard\service.py:27: in _validate_priority
      raise ValueError(
  E   ValueError: priority must be between 1 and 5, got 5
  2 failed in 0.24s
  ```
- **Fix diff:**
  ```diff
  --- a/taskboard/service.py
  +++ b/taskboard/service.py
  @@ -26,1 +26,1 @@
  -    if not MIN_PRIORITY <= priority < MAX_PRIORITY:
  +    if not MIN_PRIORITY <= priority <= MAX_PRIORITY:
  ```
