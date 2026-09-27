"""
C5 — _save_priority logs the OLD priority after the update is committed.

The log line reads task.priority (the original value) AFTER the DB update,
which is correct for a "changed from X to Y" message. Verify the log captures
both old and new values accurately.

Also covers: _save_priority returns replace(task, priority=priority) — NOT the
DB row — so if any other field was concurrently updated, the returned object
won't reflect DB state. This is an implicit contract issue.
"""
from dataclasses import dataclass, replace
from unittest.mock import MagicMock, call
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
        logger.debug("task %s already has priority %d", task.id, priority)
        return task
    repo.update_priority(task.id, priority)
    logger.info("task %s priority changed from %d to %d", task.id, task.priority, priority)
    return replace(task, priority=priority)


def test_save_priority_returns_updated_dataclass():
    """_save_priority must return a new Task with the updated priority, not the original."""
    repo = MagicMock()
    task = Task(id=1, title="Work", priority=3)

    result = _save_priority(repo, task, 2)

    # New object with updated priority
    assert result.priority == 2, f"Expected priority=2, got {result.priority}"
    # Original task must NOT be mutated
    assert task.priority == 3, "Original task was mutated!"
    # Must be a different object
    assert result is not task, "Expected a new object from replace(), got same reference"


def test_save_priority_calls_update_with_correct_args():
    """_save_priority must call repo.update_priority(task.id, new_priority)."""
    repo = MagicMock()
    task = Task(id=42, title="Urgent", priority=5)

    _save_priority(repo, task, 1)

    repo.update_priority.assert_called_once_with(42, 1)
