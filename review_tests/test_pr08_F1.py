"""
PR 08 / F1 — Spec/Bug: export_csv() uses manual string joining instead of Python's csv module.

SPEC §5: "CSV exports must be valid RFC 4180 CSV (use Python's csv module) so titles
         containing commas or quotes round-trip correctly."
TICKET-008: "Must be valid CSV via the csv module so titles with commas/quotes round-trip."

The implementation writes: handle.write(",".join(row) + "\\n")
A title containing a comma or double-quote breaks RFC 4180 compliance and causes
parsers to misread column boundaries.
"""
import sys
import csv
import io
import pathlib

WT08 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr08"
if WT08 not in sys.path:
    sys.path.insert(0, WT08)

from taskboard.models import Task
from taskboard.export import export_csv


def test_export_csv_title_with_comma_roundtrips(tmp_path):
    """A title containing a comma must survive a CSV round-trip unchanged."""
    task = Task(title="Pay rent, groceries", id=1)
    target = str(tmp_path / "tasks.csv")
    export_csv([task], target)

    with open(target, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    assert len(rows) == 1, f"Expected 1 data row, got {len(rows)}"
    assert rows[0]["title"] == "Pay rent, groceries", (
        f"Title with comma did not round-trip: got {rows[0]['title']!r}. "
        "The implementation uses manual ','.join() instead of Python's csv module, "
        "so commas in titles split the field into extra columns. SPEC §5 violation."
    )


def test_export_csv_title_with_double_quote_roundtrips(tmp_path):
    """A title containing a double-quote must survive a CSV round-trip unchanged."""
    task = Task(title='He said "hello"', id=2)
    target = str(tmp_path / "tasks.csv")
    export_csv([task], target)

    with open(target, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))

    assert len(rows) == 1, f"Expected 1 data row, got {len(rows)}"
    assert rows[0]["title"] == 'He said "hello"', (
        f"Title with double-quote did not round-trip: got {rows[0]['title']!r}. "
        "SPEC §5 violation: csv module not used for RFC 4180 quoting."
    )
