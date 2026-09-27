"""
PR 06 / F1 — Spec: TaskRepository.delete() silently ignores missing task ids.

TICKET-006: "TaskRepository.delete(task_id: int) -> None: deleting a missing id
raises TaskNotFoundError (SPEC A2: never fail silently)."
SPEC §2: "Operations must never fail silently on a missing id."

The implementation returns True/False (found/not-found) instead of raising
TaskNotFoundError when the id does not exist. Consequently TaskService.delete_task()
also silently succeeds on missing ids.
"""
import sys

WT06 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr06"
if WT06 not in sys.path:
    sys.path.insert(0, WT06)

import pytest
from taskboard.storage import TaskRepository, TaskNotFoundError
from taskboard.service import TaskService


def make_service():
    repo = TaskRepository()
    return TaskService(repo), repo


def test_repo_delete_missing_id_raises_task_not_found_error():
    """TaskRepository.delete() must raise TaskNotFoundError for a missing id."""
    repo = TaskRepository()
    with pytest.raises(TaskNotFoundError):
        repo.delete(9999)


def test_service_delete_task_missing_id_raises_task_not_found_error():
    """TaskService.delete_task() must raise TaskNotFoundError for a missing id."""
    service, _ = make_service()
    with pytest.raises(TaskNotFoundError):
        service.delete_task(9999)
