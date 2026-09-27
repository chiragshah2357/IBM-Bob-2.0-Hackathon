"""
PR 08 / DROPPED CANDIDATE C1 — Bug: title with double-quote corrupts CSV.

This candidate was identified by the bug reviewer: a title containing a double-quote
like 'He said "hello"' would produce malformed RFC 4180 CSV.

However, this specific test PASSES (DictReader is lenient with bare double-quotes in
non-quoted fields when they appear inline). The finding is DROPPED because the test
passes on the buggy code — per review protocol, a finding is only reported if its
test fails.

The root CSV correctness issue IS reported as F1 (comma in title), which proves the
same underlying defect: manual string joining instead of the csv module.
"""
import sys
import csv
import pathlib

WT08 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr08"
if WT08 not in sys.path:
    sys.path.insert(0, WT08)

from taskboard.models import Task
from taskboard.export import export_csv


def test_export_csv_title_with_double_quote_roundtrips(tmp_path):
    """A title containing a double-quote must survive a CSV round-trip unchanged.

    NOTE: This test PASSES on the buggy implementation because csv.DictReader
    is lenient with unescaped double-quotes in unquoted fields. DROPPED as candidate.
    """
    task = Task(title='He said "hello"', id=2)
    target = str(tmp_path / "tasks.csv")
    export_csv([task], target)

    with open(target, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    # This assertion PASSES on buggy code (DictReader is lenient)
    # so this candidate is dropped per protocol
    assert len(rows) == 1
