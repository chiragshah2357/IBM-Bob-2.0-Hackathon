"""
PR-02 F1: list_overdue uses `due_date <= today` instead of `due_date < today`.
A task due today should NOT be overdue (SPEC §3, TICKET-002 AC).
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


def test_task_due_today_is_not_overdue(service):
    """A task whose due_date == today must not appear in list_overdue."""
    today = date(2026, 9, 26)
    service.create_task("Due today", due_date=today)
    result = service.list_overdue(today)
    assert result == [], (
        f"Expected [] but got {result!r} — "
        "task due today was incorrectly marked overdue (off-by-one: <= vs <)"
    )
