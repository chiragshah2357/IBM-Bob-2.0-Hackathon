# PR Review — feat/export-csv (TICKET-008)

## Summary
2 proven findings: 1 high-severity spec violation and 1 low-severity style violation. `export_csv()` constructs CSV rows by manually calling `",".join(row)` instead of using Python's `csv` module, so any task whose title contains a comma is split across multiple fields and does not round-trip (F1). The same function also calls `print()` to log the export count, violating STYLE_GUIDE rule 4 which mandates `logger` for library code (F2 — mechanical fix applied, test now passes). 1 candidate dropped: title-with-double-quote round-trip test passes on the buggy code. The PR is **not mergeable** in its current state.

## Findings

### F1 — export_csv uses manual join instead of csv module (high)
- **File:** `taskboard/export.py:57`
- **Category:** spec
- **Ticket ref:** TICKET-008
- **Test:** `review_tests/test_pr08_F1.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr08_F1.py::test_export_csv_title_with_comma_roundtrips
  review_tests\test_pr08_F1.py:35: in test_export_csv_title_with_comma_roundtrips
      assert rows[0]["title"] == "Pay rent, groceries", (
  E   AssertionError: Title with comma did not round-trip: got 'Pay rent'.
  E   The implementation uses manual ','.join() instead of Python's csv module,
  E   so commas in titles split the field into extra columns. SPEC §5 violation.
  E   assert 'Pay rent' == 'Pay rent, groceries'
  2 failed, 1 passed in 0.31s
  ```
- **Fix diff:** none — manual fix required. Replace the manual `",".join(CSV_HEADER)` and `",".join(row)` writes with `csv.writer(handle)`.

### F2 — export_csv calls print() in library code (low)
- **File:** `taskboard/export.py:61`
- **Category:** style
- **Ticket ref:** TICKET-008
- **Test:** `review_tests/test_pr08_F2.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr08_F2.py::test_export_csv_does_not_call_print
  review_tests\test_pr08_F2.py:35: in test_export_csv_does_not_call_print
      assert not print_calls, (
  E   AssertionError: Found print() call(s) at line(s) [61] in taskboard/export.py.
  E   STYLE_GUIDE rule 4: 'No print() in library code. Use the module-level logger.'
  E   assert not [61]
  2 failed, 1 passed in 0.31s
  ```
- **Fix diff:**
  ```diff
  --- a/taskboard/export.py
  +++ b/taskboard/export.py
  @@ -58,7 +58,7 @@
       except OSError:
           logger.error("could not write CSV export to %s", target)
           raise
  -    print(f"Exported {len(rows)} tasks to {target}")
  +    logger.info("exported %d tasks to %s", len(rows), target)
       return len(rows)
  ```
