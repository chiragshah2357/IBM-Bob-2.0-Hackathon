"""
PR 07 / DROPPED CANDIDATE C1 — Coverage: no test verifies RuntimeError is raised.

This candidate was identified by the coverage reviewer: the PR test suite has no test
asserting that get_export_token raises RuntimeError on missing/empty token.

This test is kept on disk per review protocol. The candidate is DROPPED because:
- The root cause (wrong behavior) is already proven and reported as F1/F2 in test_pr07_F1.py.
- This coverage gap is a symptom of the same defect, not an independent finding.
"""
import sys

WT07 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr07"
if WT07 not in sys.path:
    sys.path.insert(0, WT07)

import ast
import pathlib


def test_pr_tests_include_missing_token_runtime_error():
    """The PR's own tests/test_config.py must have a test for RuntimeError on missing token."""
    test_path = pathlib.Path(WT07) / "tests" / "test_config.py"
    source = test_path.read_text(encoding="utf-8")

    # Look for any test that uses RuntimeError in context of get_export_token
    has_runtime_error_test = (
        "RuntimeError" in source and "get_export_token" in source
        and any(
            "RuntimeError" in line and "get_export_token" in source[max(0, source.index(line) - 200):source.index(line) + 200]
            for line in source.splitlines()
            if "RuntimeError" in line
        )
    )

    assert has_runtime_error_test, (
        "tests/test_config.py contains no test that verifies get_export_token raises "
        "RuntimeError when TASKBOARD_EXPORT_TOKEN is missing or empty. "
        "TICKET-007 requires this behavior. "
        "[CANDIDATE DROPPED: same root cause as F1/F2 already reported]"
    )
