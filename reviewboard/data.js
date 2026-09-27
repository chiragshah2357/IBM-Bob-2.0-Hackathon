const DATA = {
  "leaderboard": {
    "ours": {
      "recall": 81,
      "precision": 100,
      "trust": 100,
      "false_alarms": 0,
      "noise": null
    },
    "naive": {
      "recall": 69,
      "precision": 58,
      "trust": 0,
      "false_alarms": 8
    }
  },
  "sizeBuckets": [
    {
      "size": "Small",
      "lines": "\u2264250 lines",
      "ours": 88,
      "naive": 75
    },
    {
      "size": "Medium",
      "lines": "250\u2013310 lines",
      "ours": 75,
      "naive": 62
    }
  ],
  "prs": [
    {
      "pr": "01",
      "title": "Search tasks",
      "desc": "Add case-insensitive title search with optional tag and status filters.",
      "size": "S",
      "clean": false,
      "categories": [
        "security",
        "spec"
      ],
      "planted": 2,
      "found": 2,
      "findings": [
        {
          "id": "F1",
          "category": "security",
          "severity": "high",
          "claim": "LIKE pattern is embedded into SQL via an f-string; a single-quote in the query breaks the SQL literal and raises OperationalError, violating SPEC \u00a74 (all SQL must use parameterized queries).",
          "file": "taskboard/storage.py",
          "line": 108,
          "test": "review_tests/test_pr01_F1.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr01_F1.py::test_sql_injection_via_single_quote_in_query\nsearch() raised OperationalError for a query containing a single-quote: near \"s\": syntax error\nRoot cause: pattern is interpolated into SQL via f-string \u2014 SPEC \u00a74 violation.\n2 failed in 0.31s",
          "fix": null
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "med",
          "claim": "search() uses ORDER BY title instead of ORDER BY id, violating SPEC \u00a73 ('Results are ordered by id') and TICKET-001 AC.",
          "file": "taskboard/storage.py",
          "line": 116,
          "test": "review_tests/test_pr01_F2.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr01_F2.py::test_search_results_ordered_by_id_not_title\nAssertionError: Expected results ordered by id [1, 2, 3], got [2, 3, 1]. The implementation uses ORDER BY title instead of ORDER BY id, violating SPEC \u00a73 and TICKET-001 AC.\nassert [2, 3, 1] == [1, 2, 3]\n2 failed in 0.31s",
          "fix": null
        }
      ]
    },
    {
      "pr": "02",
      "title": "Overdue and due-soon tasks",
      "desc": "Surface overdue and due-soon tasks, plus a formatted overdue report.",
      "size": "M",
      "clean": false,
      "categories": [
        "bug",
        "spec"
      ],
      "planted": 2,
      "found": 2,
      "findings": [
        {
          "id": "F1",
          "category": "bug",
          "severity": "med",
          "claim": "list_overdue uses `due_date <= today` \u2014 tasks due today are incorrectly flagged overdue (off-by-one).",
          "file": "taskboard/service.py",
          "line": 60,
          "test": "review_tests/test_pr02_F1.py",
          "code": "",
          "fail": "AssertionError: Expected [] but got [Task(title='Due today'...)] \u2014 task due today was incorrectly marked overdue\nassert [Task(...)] == []\n1 failed in 0.18s",
          "fix": "--- a/taskboard/service.py\n+++ b/taskboard/service.py\n@@ -57,7 +57,7 @@\n             for task in self._repo.list_all()\n-            if task.due_date is not None and task.due_date <= today\n+            if not task.done and task.due_date is not None and task.due_date < today"
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "med",
          "claim": "list_overdue does not filter out done tasks \u2014 completed tasks with a past due_date appear as overdue.",
          "file": "taskboard/service.py",
          "line": 60,
          "test": "review_tests/test_pr02_F2.py",
          "code": "",
          "fail": "AssertionError: Expected [] but got [Task(title='Old errand', done=True...)] \u2014 done task appeared in overdue list\nassert [Task(...)] == []\n1 failed in 0.14s",
          "fix": "--- a/taskboard/service.py\n+++ b/taskboard/service.py\n@@ -57,7 +57,7 @@\n             for task in self._repo.list_all()\n-            if task.due_date is not None and task.due_date <= today\n+            if not task.done and task.due_date is not None and task.due_date < today"
        }
      ]
    },
    {
      "pr": "03",
      "title": "Priority management",
      "desc": "Validate priority (1-5) and add set / bump / list-by-priority helpers.",
      "size": "M",
      "clean": false,
      "categories": [
        "bug",
        "coverage"
      ],
      "planted": 2,
      "found": 1,
      "findings": [
        {
          "id": "F1",
          "category": "spec",
          "severity": "high",
          "claim": "_validate_priority uses 'priority < MAX_PRIORITY' (strict less-than), so priority=5 raises ValueError even though SPEC \u00a71 and TICKET-003 require the range 1\u20135 inclusive.",
          "file": "taskboard/service.py",
          "line": 26,
          "test": "review_tests/test_pr03_F1.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr03_F1.py::test_create_task_accepts_priority_5\nValueError: priority must be between 1 and 5, got 5\nFAILED review_tests/test_pr03_F1.py::test_set_priority_accepts_priority_5\nValueError: priority must be between 1 and 5, got 5\n2 failed in 0.24s",
          "fix": "--- a/taskboard/service.py\n+++ b/taskboard/service.py\n@@ -26,1 +26,1 @@\n-    if not MIN_PRIORITY <= priority < MAX_PRIORITY:\n+    if not MIN_PRIORITY <= priority <= MAX_PRIORITY:"
        }
      ]
    },
    {
      "pr": "04",
      "title": "Board statistics",
      "desc": "Board statistics: completion rate and a per-priority breakdown.",
      "size": "M",
      "clean": false,
      "categories": [
        "bug",
        "coverage"
      ],
      "planted": 2,
      "found": 1,
      "findings": [
        {
          "id": "F1",
          "category": "bug",
          "severity": "high",
          "claim": "_completion_rate divides done/total without guarding for total=0; completion_rate() and stats() raise ZeroDivisionError on an empty board instead of returning 0.0 as SPEC \u00a73 and TICKET-004 require.",
          "file": "taskboard/service.py",
          "line": 78,
          "test": "review_tests/test_pr04_F1.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr04_F1.py::test_completion_rate_empty_board_returns_zero\nZeroDivisionError: division by zero\nFAILED review_tests/test_pr04_F1.py::test_stats_completion_rate_empty_board\nZeroDivisionError: division by zero\n2 failed in 0.23s",
          "fix": "--- a/taskboard/service.py\n+++ b/taskboard/service.py\n@@ -78,1 +78,2 @@\n-    return round(done / total * 100, 1)\n+    if total == 0:\n+        return 0.0\n+    return round(done / total * 100, 1)"
        }
      ]
    },
    {
      "pr": "05",
      "title": "Tag management",
      "desc": "Full tag management: normalize, add, remove, list, filter by tag.",
      "size": "S",
      "clean": false,
      "categories": [
        "bug",
        "spec"
      ],
      "planted": 2,
      "found": 2,
      "findings": [
        {
          "id": "F1",
          "category": "bug",
          "severity": "med",
          "claim": "add_tag dup-check uses raw-stripped tag, not normalized \u2014 adding 'Urgent' when 'urgent' is stored appends a duplicate.",
          "file": "taskboard/service.py",
          "line": 66,
          "test": "review_tests/test_pr05_F1.py",
          "code": "",
          "fail": "AssertionError: Expected ['urgent'] but got ['urgent', 'urgent'] \u2014 add_tag appended a case-variant duplicate\nassert ['urgent', 'urgent'] == ['urgent']\n1 failed in 0.24s",
          "fix": "--- a/taskboard/service.py\n+++ b/taskboard/service.py\n@@ -62,7 +62,7 @@\n         task = self._repo.get(task_id)\n-        tag = tag.strip()\n+        tag = normalize_tag(tag)\n         if tag in task.tags:"
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "med",
          "claim": "remove_tag filter `existing != tag` is case-sensitive \u2014 'Work' does not remove stored 'work'.",
          "file": "taskboard/service.py",
          "line": 84,
          "test": "review_tests/test_pr05_F2.py",
          "code": "",
          "fail": "AssertionError: Expected [] but got ['work'] \u2014 remove_tag did not remove case-variant 'Work' from stored 'work'\nassert ['work'] == []\n1 failed in 0.15s",
          "fix": "--- a/taskboard/service.py\n+++ b/taskboard/service.py\n@@ -81,7 +81,7 @@\n         task = self._repo.get(task_id)\n-        remaining = [existing for existing in task.tags if existing != tag]\n+        remaining = [existing for existing in task.tags if existing != tag.lower()]"
        }
      ]
    },
    {
      "pr": "06",
      "title": "Delete tasks",
      "desc": "Delete a task by id and bulk-delete completed tasks.",
      "size": "S",
      "clean": false,
      "categories": [
        "coverage",
        "spec"
      ],
      "planted": 2,
      "found": 1,
      "findings": [
        {
          "id": "F1",
          "category": "spec",
          "severity": "high",
          "claim": "TaskRepository.delete() returns True/False instead of raising TaskNotFoundError for a missing id, silently ignoring the deletion of a non-existent task and violating SPEC \u00a72 and TICKET-006.",
          "file": "taskboard/storage.py",
          "line": 84,
          "test": "review_tests/test_pr06_F1.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr06_F1.py::test_repo_delete_missing_id_raises_task_not_found_error\nFailed: DID NOT RAISE TaskNotFoundError\nFAILED review_tests/test_pr06_F1.py::test_service_delete_task_missing_id_raises_task_not_found_error\nFailed: DID NOT RAISE TaskNotFoundError\n2 failed in 0.23s",
          "fix": null
        }
      ]
    },
    {
      "pr": "07",
      "title": "Settings from environment",
      "desc": "Load settings from environment; require an export token.",
      "size": "M",
      "clean": false,
      "categories": [
        "security",
        "spec"
      ],
      "planted": 2,
      "found": 2,
      "findings": [
        {
          "id": "F1",
          "category": "security",
          "severity": "high",
          "claim": "A live secret token 'tbx_live_4f9a2c7e81d34b6a90c1' is hard-coded as _FALLBACK_EXPORT_TOKEN in source code, violating SPEC \u00a74 ('no secrets in source code, no hard-coded fallback values').",
          "file": "taskboard/config.py",
          "line": 27,
          "test": "review_tests/test_pr07_F1.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr07_F1.py::test_no_hardcoded_secret_token_in_source\nAssertionError: Found hardcoded secret token value(s) in taskboard/config.py: ['tbx_live_4f9a2c7e81d34b6a90c1']. SPEC \u00a74: 'No secrets in source code, and no hard-coded fallback values.'\nassert not ['tbx_live_4f9a2c7e81d34b6a90c1']\n4 failed in 0.27s",
          "fix": null
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "high",
          "claim": "get_export_token() returns a hard-coded fallback token when TASKBOARD_EXPORT_TOKEN is missing or empty instead of raising RuntimeError, violating SPEC \u00a74 and TICKET-007.",
          "file": "taskboard/config.py",
          "line": 126,
          "test": "review_tests/test_pr07_F1.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr07_F1.py::test_get_export_token_missing_raises_runtime_error\nFailed: DID NOT RAISE RuntimeError\nFAILED review_tests/test_pr07_F1.py::test_get_export_token_empty_string_raises_runtime_error\nFailed: DID NOT RAISE RuntimeError\nFAILED review_tests/test_pr07_F1.py::test_get_export_token_whitespace_only_raises_runtime_error\nFailed: DID NOT RAISE RuntimeError\n4 failed in 0.27s",
          "fix": null
        }
      ]
    },
    {
      "pr": "08",
      "title": "Export tasks",
      "desc": "Export tasks to CSV and JSON for spreadsheets and tooling.",
      "size": "S",
      "clean": false,
      "categories": [
        "bug",
        "style"
      ],
      "planted": 2,
      "found": 2,
      "findings": [
        {
          "id": "F1",
          "category": "spec",
          "severity": "high",
          "claim": "export_csv() joins fields with raw commas (','.join) instead of using Python's csv module, so a title containing a comma splits across columns and does not round-trip, violating SPEC \u00a75 and TICKET-008.",
          "file": "taskboard/export.py",
          "line": 57,
          "test": "review_tests/test_pr08_F1.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr08_F1.py::test_export_csv_title_with_comma_roundtrips\nAssertionError: Title with comma did not round-trip: got 'Pay rent'. The implementation uses manual ','.join() instead of Python's csv module, so commas in titles split the field into extra columns. SPEC \u00a75 violation.\nassert 'Pay rent' == 'Pay rent, groceries'\n2 failed, 1 passed in 0.31s",
          "fix": null
        },
        {
          "id": "F2",
          "category": "style",
          "severity": "low",
          "claim": "export_csv() calls print() to report the export count, violating STYLE_GUIDE rule 4 ('No print() in library code \u2014 use the module-level logger').",
          "file": "taskboard/export.py",
          "line": 61,
          "test": "review_tests/test_pr08_F2.py",
          "code": "",
          "fail": "FAILED review_tests/test_pr08_F2.py::test_export_csv_does_not_call_print\nAssertionError: Found print() call(s) at line(s) [61] in taskboard/export.py. STYLE_GUIDE rule 4: 'No print() in library code. Use the module-level logger.'\nassert not [61]\n2 failed, 1 passed in 0.31s",
          "fix": "--- a/taskboard/export.py\n+++ b/taskboard/export.py\n@@ -58,7 +58,7 @@\n     except OSError:\n         logger.error(\"could not write CSV export to %s\", target)\n         raise\n-    print(f\"Exported {len(rows)} tasks to {target}\")\n+    logger.info(\"exported %d tasks to %s\", len(rows), target)\n     return len(rows)"
        }
      ]
    }
  ]
};
DATA.repo = "github.com/chiragshah2357/IBM-Bob-Hackathon-TestCases";
