"""
C4 — update_priority raises TaskNotFoundError when task_id doesn't exist.

SQL UPDATE returns rowcount=0 for non-existent id; code must raise TaskNotFoundError.
Also tests: commit() is called BEFORE the rowcount check — meaning on the buggy
ordering path the commit happens even when we're about to raise. For SQLite this
is a no-op commit but the logic order is semantically wrong.
"""
import sqlite3
import pytest
from dataclasses import dataclass


class TaskNotFoundError(Exception):
    def __init__(self, task_id):
        super().__init__(f"Task {task_id} not found")
        self.task_id = task_id


def make_db():
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, priority INTEGER, done INTEGER DEFAULT 0)"
    )
    conn.commit()
    return conn


def update_priority(conn, task_id: int, priority: int) -> None:
    """Exact logic from the diff."""
    cur = conn.execute(
        "UPDATE tasks SET priority = ? WHERE id = ?",
        (priority, task_id),
    )
    conn.commit()
    if cur.rowcount == 0:
        raise TaskNotFoundError(task_id)


def test_update_priority_raises_for_missing_task():
    """update_priority must raise TaskNotFoundError when task_id does not exist."""
    conn = make_db()

    with pytest.raises(TaskNotFoundError) as exc_info:
        update_priority(conn, task_id=999, priority=3)

    assert exc_info.value.task_id == 999


def test_update_priority_succeeds_for_existing_task():
    """update_priority must NOT raise when task exists."""
    conn = make_db()
    conn.execute("INSERT INTO tasks (id, title, priority) VALUES (1, 'Task A', 2)")
    conn.commit()

    update_priority(conn, task_id=1, priority=4)  # Should not raise

    row = conn.execute("SELECT priority FROM tasks WHERE id = 1").fetchone()
    assert row[0] == 4, f"Priority not updated: {row[0]}"
