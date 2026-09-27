# PR Review — feat/delete-task (TICKET-006)

## Summary
1 proven finding: a high-severity spec violation. `TaskRepository.delete()` returns `True/False` to indicate whether a row was removed, but never raises `TaskNotFoundError` when the id is missing. SPEC §2 states "Operations must never fail silently on a missing id" and TICKET-006 explicitly requires `delete()` to raise `TaskNotFoundError`. Consequently `TaskService.delete_task()` also silently succeeds on non-existent ids. The PR is **not mergeable** in its current state.

## Findings

### F1 — TaskRepository.delete() silently ignores missing task ids (high)
- **File:** `taskboard/storage.py:84`
- **Category:** spec
- **Ticket ref:** TICKET-006
- **Test:** `review_tests/test_pr06_F1.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr06_F1.py::test_repo_delete_missing_id_raises_task_not_found_error
  review_tests\test_pr06_F1.py:31: in test_repo_delete_missing_id_raises_task_not_found_error
      with pytest.raises(TaskNotFoundError):
  E   Failed: DID NOT RAISE TaskNotFoundError

  FAILED review_tests/test_pr06_F1.py::test_service_delete_task_missing_id_raises_task_not_found_error
  review_tests\test_pr06_F1.py:38: in test_service_delete_task_missing_id_raises_task_not_found_error
      with pytest.raises(TaskNotFoundError):
  E   Failed: DID NOT RAISE TaskNotFoundError
  2 failed in 0.23s
  ```
- **Fix diff:** none — manual fix required. `delete()` must check `cur.rowcount == 0` and raise `TaskNotFoundError(task_id)` instead of returning `False`. The return type should also change from `bool` to `None` to match the ticket spec.
