"""
PR 04 / F1 — Bug: completion_rate() raises ZeroDivisionError on an empty board.

SPEC §3: "An empty board has a completion rate of 0.0."
TICKET-004: "TaskService.completion_rate() -> float: ... An empty board returns 0.0."

The implementation:
    def _completion_rate(done: int, total: int) -> float:
        return round(done / total * 100, 1)   # ZeroDivisionError when total=0

This divides by total without guarding for total=0, raising ZeroDivisionError
instead of returning 0.0 as the spec requires.
"""
import sys

WT04 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr04"
if WT04 not in sys.path:
    sys.path.insert(0, WT04)

import pytest
from taskboard.storage import TaskRepository
from taskboard.service import TaskService


def make_service():
    repo = TaskRepository()
    return TaskService(repo)


def test_completion_rate_empty_board_returns_zero():
    """An empty board must return 0.0, not raise ZeroDivisionError."""
    service = make_service()
    # No tasks added — board is empty
    result = service.completion_rate()
    assert result == 0.0, (
        f"Expected completion_rate() == 0.0 on empty board, got {result!r}. "
        "SPEC §3: 'An empty board has a completion rate of 0.0.'"
    )


def test_stats_completion_rate_empty_board():
    """stats().completion_rate must be 0.0 on an empty board."""
    service = make_service()
    stats = service.stats()
    assert stats.completion_rate == 0.0, (
        f"Expected stats().completion_rate == 0.0 on empty board, got {stats.completion_rate!r}."
    )
    assert stats.total == 0
    assert stats.done == 0
    assert stats.open == 0
