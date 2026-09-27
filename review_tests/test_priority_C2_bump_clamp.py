"""
C2 — bump_priority clamp at MIN_PRIORITY=1.

bump_priority computes max(MIN_PRIORITY, task.priority - 1).
When task.priority == MIN_PRIORITY (1), the result must still be 1 (not 0).
"""
from dataclasses import dataclass, replace
from unittest.mock import MagicMock
import logging
import pytest

MIN_PRIORITY = 1
MAX_PRIORITY = 5
logger = logging.getLogger(__name__)


@dataclass
class Task:
    id: int
    title: str
    priority: int
    done: bool = False


def _save_priority(repo, task: Task, priority: int) -> Task:
    if task.priority == priority:
        return task
    repo.update_priority(task.id, priority)
    return replace(task, priority=priority)


def bump_priority(repo, task: Task) -> Task:
    return _save_priority(repo, task, max(MIN_PRIORITY, task.priority - 1))


def test_bump_priority_clamps_at_min():
    """bump_priority on a task already at priority=1 must keep it at 1."""
    repo = MagicMock()
    task = Task(id=1, title="Top priority task", priority=1)

    result = bump_priority(repo, task)

    # Must NOT go below MIN_PRIORITY
    assert result.priority == 1, f"Expected priority=1, got {result.priority}"
    # No update should have been triggered (priority unchanged)
    repo.update_priority.assert_not_called()


def test_bump_priority_decrements_normally():
    """bump_priority on priority=3 should produce priority=2."""
    repo = MagicMock()
    task = Task(id=2, title="Normal task", priority=3)

    result = bump_priority(repo, task)

    assert result.priority == 2, f"Expected priority=2, got {result.priority}"
    repo.update_priority.assert_called_once_with(2, 2)
