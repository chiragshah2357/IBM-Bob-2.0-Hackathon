"""
PR-05 F1: add_tag dup-check is case-sensitive — adding "Urgent" when task already
has "urgent" (stored normalized) bypasses the no-op guard and appends a duplicate.
TICKET-005 AC: "adding a tag that already exists in any letter case is a no-op."
"""
import sys, os
sys.path.insert(0, r"C:/Users/chira/AppData/Local/Temp/claude/C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing/1f20e37e-d0b2-4369-b030-c9d10c66fd90/scratchpad/wt/pr05")

import sqlite3
import tempfile
import pytest
from taskboard.storage import TaskRepository
from taskboard.service import TaskService


@pytest.fixture
def service(tmp_path):
    db = str(tmp_path / "t.db")
    repo = TaskRepository(db)
    return TaskService(repo)


def test_add_tag_case_variant_is_noop(service):
    """Adding 'Urgent' when task already carries normalized 'urgent' must be a no-op."""
    task = service.create_task("Pay rent", tags=["urgent"])
    updated = service.add_tag(task.id, "Urgent")
    assert updated.tags == ["urgent"], (
        f"Expected ['urgent'] but got {updated.tags!r} — "
        "add_tag appended a case-variant duplicate"
    )
