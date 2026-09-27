"""
PR 01 / F1 — Security: LIKE pattern embedded via f-string (SQL injection risk).

SPEC §4: "All SQL must use parameterized queries. Never build SQL with string formatting."

The search() method in feat/search-tasks builds the SQL LIKE clause as:
    sql = f"... LIKE '%{pattern}%' ESCAPE '\\\\' ..."
A single-quote in the query is NOT escaped by _escape_like(), so it breaks the
SQL string literal and causes an OperationalError (or worse, data exfiltration).
"""
import sys
import os

WT = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr01"
if WT not in sys.path:
    sys.path.insert(0, WT)

import pytest
from taskboard.models import Task
from taskboard.storage import TaskRepository


def test_sql_injection_via_single_quote_in_query():
    """A single-quote in the search query must NOT raise a database error."""
    repo = TaskRepository()  # in-memory
    repo.add(Task(title="Pay rent"))
    repo.add(Task(title="Buy milk"))

    # A single quote is a valid substring to search for.
    # _escape_like does NOT escape single-quotes, and the pattern is
    # embedded directly into the SQL string via an f-string.
    # This will raise sqlite3.OperationalError on the buggy code.
    try:
        results = repo.search("it's")
    except Exception as exc:
        pytest.fail(
            f"search() raised {type(exc).__name__} for a query containing a single-quote: {exc}\n"
            "Root cause: pattern is interpolated into SQL via f-string — SPEC §4 violation."
        )
