# PR Review — feat/search-tasks (TICKET-001)

## Summary
2 proven findings: 1 high-severity security violation and 1 medium-severity spec violation. The `search()` method in `taskboard/storage.py` embeds the LIKE pattern directly into the SQL string via an f-string, breaking SPEC §4's parameterized-query requirement and crashing on any query containing a single-quote. The same method also sorts results by `title` instead of `id`, violating SPEC §3 and TICKET-001's explicit ordering requirement. The PR is **not mergeable** in its current state.

## Findings

### F1 — LIKE pattern embedded via f-string causes SQL injection / crash (high)
- **File:** `taskboard/storage.py:108`
- **Category:** security
- **Ticket ref:** TICKET-001
- **Test:** `review_tests/test_pr01_F1.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr01_F1.py::test_sql_injection_via_single_quote_in_query
  review_tests\test_pr01_F1.py:34: in test_sql_injection_via_single_quote_in_query
      results = repo.search("it's")
  taskboard\storage.py:122: in search
      rows = self._conn.execute(sql, params).fetchall()
  E   sqlite3.OperationalError: near "s": syntax error
  Failed: search() raised OperationalError for a query containing a single-quote: near "s": syntax error
  Root cause: pattern is interpolated into SQL via f-string — SPEC §4 violation.
  2 failed in 0.31s
  ```
- **Fix diff:**
  ```diff
  --- a/taskboard/storage.py
  +++ b/taskboard/storage.py
  @@ -107,8 +107,8 @@
  -        pattern = _escape_like(query.casefold())
  -        sql = f"""
  -            SELECT * FROM tasks
  -            WHERE casefold(title) LIKE '%{pattern}%' ESCAPE '\\'
  +        sql = """
  +            SELECT * FROM tasks
  +            WHERE casefold(title) LIKE :pattern ESCAPE '\\'
               AND (:include_done OR done = 0)
               AND (:tag IS NULL OR EXISTS (
                   SELECT 1 FROM json_each(tasks.tags)
                   WHERE casefold(json_each.value) = :tag
               ))
  -            ORDER BY title
  +            ORDER BY id
           """
  -        params = {
  -            "include_done": int(include_done),
  -            "tag": tag.casefold() if tag is not None else None,
  -        }
  +        params = {
  +            "pattern": f"%{_escape_like(query.casefold())}%",
  +            "include_done": int(include_done),
  +            "tag": tag.casefold() if tag is not None else None,
  +        }
  ```

### F2 — search() orders results by title instead of id (med)
- **File:** `taskboard/storage.py:116`
- **Category:** spec
- **Ticket ref:** TICKET-001
- **Test:** `review_tests/test_pr01_F2.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr01_F2.py::test_search_results_ordered_by_id_not_title
  review_tests\test_pr01_F2.py:34: in test_search_results_ordered_by_id_not_title
      assert result_ids == [t1.id, t2.id, t3.id]
  E   AssertionError: Expected results ordered by id [1, 2, 3], got [2, 3, 1].
  E   The implementation uses ORDER BY title instead of ORDER BY id,
  E   violating SPEC §3 and TICKET-001 AC.
  E   assert [2, 3, 1] == [1, 2, 3]
  2 failed in 0.31s
  ```
- **Fix diff:**
  ```diff
  --- a/taskboard/storage.py
  +++ b/taskboard/storage.py
  @@ -116,1 +116,1 @@
  -            ORDER BY title
  +            ORDER BY id
  ```
