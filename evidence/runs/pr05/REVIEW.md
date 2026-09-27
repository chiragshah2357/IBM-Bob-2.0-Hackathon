# PR Review — feat/add-tag (PR-05)

## Summary

2 findings proven by failing pytests. Both are in `taskboard/service.py`. Both are
mechanical and were fixed in one attempt each. The tag-management feature is otherwise
well-structured; the bugs are confined to two lines in the same method pair.

## Findings

### F1 — add_tag dup-check is case-sensitive, appends duplicate tag (med / bug)
- **File:** `taskboard/service.py:66`
- **Category:** bug
- **Ticket ref:** TICKET-005
- **Test:** `review_tests/test_pr05_F1.py`
- **Test output:**
  ```
  AssertionError: Expected ['urgent'] but got ['urgent', 'urgent']
  add_tag appended a case-variant duplicate
  assert ['urgent', 'urgent'] == ['urgent']
  1 failed in 0.24s
  ```
- **Fix diff:**
  ```diff
  -        tag = tag.strip()
  +        tag = normalize_tag(tag)
           if tag in task.tags:
  ```

### F2 — remove_tag filter is case-sensitive, does not remove case-variant tag (med / spec)
- **File:** `taskboard/service.py:84`
- **Category:** spec
- **Ticket ref:** TICKET-005
- **Test:** `review_tests/test_pr05_F2.py`
- **Test output:**
  ```
  AssertionError: Expected [] but got ['work']
  remove_tag did not remove case-variant 'Work' from stored 'work'
  assert ['work'] == []
  1 failed in 0.15s
  ```
- **Fix diff:**
  ```diff
  -        remaining = [existing for existing in task.tags if existing != tag]
  +        remaining = [existing for existing in task.tags if existing != tag.lower()]
  ```
