"""
PR 01 / F2 — Spec: search() returns results ORDER BY title instead of ORDER BY id.

SPEC §3: "Search: case-insensitive substring match on title. Results are ordered by id."
TICKET-001: "Results ordered by id (SPEC A3)."

The implementation uses ORDER BY title; results are in alphabetical order,
not insertion/id order.
"""
import sys

WT = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr01"
if WT not in sys.path:
    sys.path.insert(0, WT)

from taskboard.models import Task
from taskboard.storage import TaskRepository


def test_search_results_ordered_by_id_not_title():
    """search() must return tasks ordered by id, not alphabetically by title."""
    repo = TaskRepository()  # in-memory

    # Insert tasks so that alphabetical title order != insertion (id) order.
    t1 = repo.add(Task(title="Zebra task"))    # id=1, would be last alphabetically
    t2 = repo.add(Task(title="Apple task"))    # id=2, would be first alphabetically
    t3 = repo.add(Task(title="Mango task"))    # id=3, would be in the middle

    results = repo.search("task")
    result_ids = [t.id for t in results]

    # Expected: ordered by id → [1, 2, 3]
    # Actual (buggy ORDER BY title): [2, 3, 1]
    assert result_ids == [t1.id, t2.id, t3.id], (
        f"Expected results ordered by id {[t1.id, t2.id, t3.id]}, "
        f"got {result_ids}. "
        "The implementation uses ORDER BY title instead of ORDER BY id, "
        "violating SPEC §3 and TICKET-001 AC."
    )
