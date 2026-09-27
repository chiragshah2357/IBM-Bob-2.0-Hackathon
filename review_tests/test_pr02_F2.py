"""
PR-02 F2: list_overdue does not filter out done tasks.
TICKET-002 AC: "not done" — done tasks must be excluded from overdue list.
"""
import sys
sys.path.insert(0, r"C:/Users/chira/AppData/Local/Temp/claude/C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing/1f20e37e-d0b2-4369-b030-c9d10c66fd90/scratchpad/wt/pr02")

import pytest
from datetime import date
from taskboard.storage import TaskRepository
from taskboard.service import TaskService


@pytest.fixture
def service(tmp_path):
    repo = TaskRepository(str(tmp_path / "t.db"))
    return TaskService(repo)


def test_done_task_not_in_overdue(service):
    """A completed task with a past due_date must not appear in list_overdue."""
    today = date(2026, 9, 26)
    task = service.create_task("Old errand", due_date=date(2026, 9, 1))
    service.complete_task(task.id)
    result = service.list_overdue(today)
    assert result == [], (
        f"Expected [] but got {result!r} — "
        "done task appeared in overdue list (missing 'not task.done' filter)"
    )
