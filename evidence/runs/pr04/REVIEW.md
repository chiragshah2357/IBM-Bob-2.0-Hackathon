# PR Review — feat/completion-rate (TICKET-004)

## Summary
1 proven finding: a high-severity bug. `_completion_rate()` performs an unconditional `done / total` division; when the board is empty (`total=0`), both `completion_rate()` and `stats()` raise `ZeroDivisionError` instead of returning `0.0` as required by SPEC §3 and TICKET-004. The PR has no test for the empty-board case, so the defect is invisible in the existing test suite. The PR is **not mergeable** in its current state.

## Findings

### F1 — completion_rate() raises ZeroDivisionError on empty board (high)
- **File:** `taskboard/service.py:78`
- **Category:** bug
- **Ticket ref:** TICKET-004
- **Test:** `review_tests/test_pr04_F1.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr04_F1.py::test_completion_rate_empty_board_returns_zero
  taskboard\service.py:78: in _completion_rate
      return round(done / total * 100, 1)
  E   ZeroDivisionError: division by zero

  FAILED review_tests/test_pr04_F1.py::test_stats_completion_rate_empty_board
  taskboard\service.py:78: in _completion_rate
      return round(done / total * 100, 1)
  E   ZeroDivisionError: division by zero
  2 failed in 0.23s
  ```
- **Fix diff:**
  ```diff
  --- a/taskboard/service.py
  +++ b/taskboard/service.py
  @@ -78,1 +78,3 @@
  -    return round(done / total * 100, 1)
  +    if total == 0:
  +        return 0.0
  +    return round(done / total * 100, 1)
  ```
