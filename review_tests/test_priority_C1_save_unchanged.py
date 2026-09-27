"""
C1 — _save_priority returns stale task (not a fresh DB read) on unchanged path.

When priority is unchanged, _save_priority skips update_priority and returns
the original task object unchanged. If the caller expects a post-write-consistent
object this is fine — but the returned object is the *exact same mutable reference*,
not a dataclass copy, which could lead to silent aliasing bugs if the caller
mutates it. However, the core claim is simpler: verify the no-op path returns
a Task with the correct priority and does NOT call update_priority.
"""
from dataclasses import dataclass, replace
from unittest.mock import MagicMock, patch
import pytest


MIN_PRIORITY = 1
MAX_PRIORITY = 5


@dataclass
class Task:
    id: int
    title: str
    priority: int
    done: bool = False


class TaskNotFoundError(Exception):
    pass


# ---- inline the exact _save_priority logic from the diff ----
import logging
logger = logging.getLogger(__name__)


def _save_priority(repo, task: Task, priority: int) -> Task:
    if task.priority == priority:
        logger.debug("task %s already has priority %d", task.id, priority)
        return task
    repo.update_priority(task.id, priority)
    logger.info("task %s priority changed from %d to %d", task.id, task.priority, priority)
    return replace(task, priority=priority)


def test_save_priority_unchanged_does_not_call_update():
    """When priority is unchanged, update_priority must NOT be called."""
    repo = MagicMock()
    task = Task(id=1, title="Test", priority=3)

    result = _save_priority(repo, task, 3)

    # update_priority should NOT have been called
    repo.update_priority.assert_not_called()
    # Should return the same task unchanged
    assert result.priority == 3
    assert result is task  # exact same object returned
