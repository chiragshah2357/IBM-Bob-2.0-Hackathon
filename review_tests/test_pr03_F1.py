"""
PR 03 / F1 — Spec: _validate_priority rejects priority=5 (the maximum valid value).

SPEC §1: "priority: int — 1 (highest) to 5 (lowest), inclusive."
TICKET-003: "create_task validates priority: 1 to 5 inclusive (SPEC A1)."

The implementation uses:
    if not MIN_PRIORITY <= priority < MAX_PRIORITY:   (line 26, service.py)
which translates to: if not (1 <= priority < 5)
So priority=5 is rejected as out of range, even though the spec says 5 is valid.
The correct check is: if not MIN_PRIORITY <= priority <= MAX_PRIORITY
"""
import sys

WT03 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr03"
if WT03 not in sys.path:
    sys.path.insert(0, WT03)

import pytest
from taskboard.storage import TaskRepository
from taskboard.service import TaskService


def make_service():
    repo = TaskRepository()
    return TaskService(repo)


def test_create_task_accepts_priority_5():
    """Priority 5 is the lowest valid priority per SPEC §1 and must be accepted."""
    service = make_service()
    # Should NOT raise; priority=5 is explicitly allowed by the spec.
    task = service.create_task("Low-priority task", priority=5)
    assert task.priority == 5, (
        f"Expected priority=5 to be accepted, but create_task raised ValueError. "
        "Bug: _validate_priority uses 'priority < MAX_PRIORITY' (strict) "
        "instead of 'priority <= MAX_PRIORITY'."
    )


def test_set_priority_accepts_priority_5():
    """set_priority to 5 must work — 5 is the maximum valid priority."""
    service = make_service()
    task = service.create_task("Some task", priority=3)
    updated = service.set_priority(task.id, 5)
    assert updated.priority == 5, (
        f"Expected set_priority(5) to succeed, got priority={updated.priority}."
    )
