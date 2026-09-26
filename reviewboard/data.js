const DATA = {
  "leaderboard": {
    "ours": {
      "recall": 90,
      "precision": 95,
      "trust": 100,
      "false_alarms": 1,
      "noise": 0.5
    },
    "bob": {
      "recall": 62,
      "precision": 72,
      "trust": 0,
      "false_alarms": 5
    },
    "naive": {
      "recall": 48,
      "precision": 43,
      "trust": 0,
      "false_alarms": 13
    }
  },
  "sizeBuckets": [
    {
      "size": "Small",
      "lines": "\u2264250 lines",
      "ours": 100,
      "bob": 62,
      "naive": 50
    },
    {
      "size": "Medium",
      "lines": "250\u2013310 lines",
      "ours": 88,
      "bob": 62,
      "naive": 50
    },
    {
      "size": "Large",
      "lines": "310+ lines",
      "ours": 80,
      "bob": 60,
      "naive": 40
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
          "claim": "SQL built with f-string (injection)",
          "file": "taskboard/storage.py",
          "line": 71,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "AssertionError / injection reproduced\n1 failed",
          "fix": "- insecure line\n+ safe line"
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "med",
          "claim": "results ordered by title, not id",
          "file": "taskboard/storage.py",
          "line": 73,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "assert mismatch vs spec\n1 failed",
          "fix": "- wrong\n+ per spec"
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
          "claim": "<= includes tasks due today",
          "file": "taskboard/service.py",
          "line": 44,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "assert / error reproduced\n1 failed",
          "fix": "- buggy\n+ fixed"
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "med",
          "claim": "done tasks not excluded",
          "file": "taskboard/service.py",
          "line": 44,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "assert mismatch vs spec\n1 failed",
          "fix": "- wrong\n+ per spec"
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
      "found": 2,
      "findings": [
        {
          "id": "F1",
          "category": "bug",
          "severity": "med",
          "claim": "< MAX rejects priority 5",
          "file": "taskboard/service.py",
          "line": 26,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "assert / error reproduced\n1 failed",
          "fix": "- buggy\n+ fixed"
        },
        {
          "id": "F2",
          "category": "coverage",
          "severity": "low",
          "claim": "no boundary-5 test",
          "file": "tests/test_priority.py",
          "line": 1,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "AssertionError: required test missing\n1 failed",
          "fix": null
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
          "claim": "ZeroDivision on empty board",
          "file": "taskboard/service.py",
          "line": 58,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "assert / error reproduced\n1 failed",
          "fix": "- buggy\n+ fixed"
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
          "claim": "case-variant dup tag",
          "file": "taskboard/service.py",
          "line": 40,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "assert / error reproduced\n1 failed",
          "fix": "- buggy\n+ fixed"
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "med",
          "claim": "remove_tag case-sensitive",
          "file": "taskboard/service.py",
          "line": 49,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "assert mismatch vs spec\n1 failed",
          "fix": "- wrong\n+ per spec"
        },
        {
          "id": "F3",
          "category": "style",
          "severity": "low",
          "claim": "minor naming nit",
          "file": "taskboard/_review_nit.py",
          "line": 1,
          "test": "review_tests/test_F3.py",
          "code": "",
          "fail": "AssertionError\n1 failed",
          "fix": null
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
      "found": 2,
      "findings": [
        {
          "id": "F1",
          "category": "spec",
          "severity": "med",
          "claim": "missing id fails silently",
          "file": "taskboard/storage.py",
          "line": 80,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "assert mismatch vs spec\n1 failed",
          "fix": "- wrong\n+ per spec"
        },
        {
          "id": "F2",
          "category": "coverage",
          "severity": "low",
          "claim": "no missing-id test",
          "file": "tests/test_delete.py",
          "line": 1,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "AssertionError: required test missing\n1 failed",
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
          "claim": "hard-coded fallback token",
          "file": "taskboard/config.py",
          "line": 9,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "AssertionError / injection reproduced\n1 failed",
          "fix": "- insecure line\n+ safe line"
        },
        {
          "id": "F2",
          "category": "spec",
          "severity": "med",
          "claim": "missing token not RuntimeError",
          "file": "taskboard/config.py",
          "line": 11,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "assert mismatch vs spec\n1 failed",
          "fix": "- wrong\n+ per spec"
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
          "category": "bug",
          "severity": "med",
          "claim": "manual CSV join breaks commas",
          "file": "taskboard/export.py",
          "line": 22,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "assert / error reproduced\n1 failed",
          "fix": "- buggy\n+ fixed"
        },
        {
          "id": "F2",
          "category": "style",
          "severity": "low",
          "claim": "print() in library",
          "file": "taskboard/export.py",
          "line": 29,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "AssertionError: style rule violated\n1 failed",
          "fix": "- violation\n+ compliant"
        }
      ]
    },
    {
      "pr": "09",
      "title": "Task summaries and table view",
      "desc": "Human-readable task summary and a plain-text table view.",
      "size": "L",
      "clean": true,
      "categories": [],
      "planted": 0,
      "found": 0,
      "findings": []
    },
    {
      "pr": "10",
      "title": "Paginate task list",
      "desc": "Paginate the task list with 1-indexed pages and totals.",
      "size": "L",
      "clean": false,
      "categories": [
        "bug",
        "spec"
      ],
      "planted": 2,
      "found": 1,
      "findings": [
        {
          "id": "F1",
          "category": "bug",
          "severity": "high",
          "claim": "offset = page*size, page 1 skips",
          "file": "taskboard/storage.py",
          "line": 96,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "assert / error reproduced\n1 failed",
          "fix": "- buggy\n+ fixed"
        }
      ]
    },
    {
      "pr": "11",
      "title": "Bulk status changes",
      "desc": "Bulk status changes: complete by tag, complete many, reopen.",
      "size": "L",
      "clean": false,
      "categories": [
        "style"
      ],
      "planted": 3,
      "found": 3,
      "findings": [
        {
          "id": "F1",
          "category": "style",
          "severity": "low",
          "claim": "camelCase completeAllWithTag",
          "file": "taskboard/service.py",
          "line": 70,
          "test": "review_tests/test_F1.py",
          "code": "",
          "fail": "AssertionError: style rule violated\n1 failed",
          "fix": "- violation\n+ compliant"
        },
        {
          "id": "F2",
          "category": "style",
          "severity": "low",
          "claim": "bare except: pass",
          "file": "taskboard/service.py",
          "line": 76,
          "test": "review_tests/test_F2.py",
          "code": "",
          "fail": "AssertionError: style rule violated\n1 failed",
          "fix": "- violation\n+ compliant"
        },
        {
          "id": "F3",
          "category": "style",
          "severity": "low",
          "claim": "no type hints / docstring",
          "file": "taskboard/service.py",
          "line": 70,
          "test": "review_tests/test_F3.py",
          "code": "",
          "fail": "AssertionError: style rule violated\n1 failed",
          "fix": "- violation\n+ compliant"
        }
      ]
    },
    {
      "pr": "12",
      "title": "Relative due dates",
      "desc": "Parse relative due dates (today / tomorrow / +Nd) and format them.",
      "size": "L",
      "clean": true,
      "categories": [],
      "planted": 0,
      "found": 0,
      "findings": []
    }
  ]
};
DATA.repo = "github.com/chiragshah2357/IBM-Bob-Hackathon-TestCases";
