"""
PR-05 F2: remove_tag filter uses `existing != tag` (case-sensitive).
Removing "Work" when the stored tag is "work" leaves the tag in place.
TICKET-005 AC: "remove_tag is case-insensitive."
"""
import sys
sys.path.insert(0, r"C:/Users/chira/AppData/Local/Temp/claude/C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing/1f20e37e-d0b2-4369-b030-c9d10c66fd90/scratchpad/wt/pr05")

import pytest
from taskboard.storage import TaskRepository
from taskboard.service import TaskService


@pytest.fixture
def service(tmp_path):
    db = str(tmp_path / "t.db")
    repo = TaskRepository(db)
    return TaskService(repo)


def test_remove_tag_is_case_insensitive(service):
    """remove_tag('Work') must remove stored tag 'work'."""
    task = service.create_task("Pay rent", tags=["work"])
    updated = service.remove_tag(task.id, "Work")
    assert updated.tags == [], (
        f"Expected [] but got {updated.tags!r} — "
        "remove_tag did not remove case-variant 'Work' from stored 'work'"
    )
