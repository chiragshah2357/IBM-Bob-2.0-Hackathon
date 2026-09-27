"""
C6 — update_priority: commit() is called before rowcount check.

The diff's update_priority does:
    cur = conn.execute("UPDATE tasks SET priority = ? WHERE id = ?", ...)
    conn.commit()              # <-- commit happens first
    if cur.rowcount == 0:
        raise TaskNotFoundError(task_id)  # <-- then raises

This means if the UPDATE matched zero rows (task not found), the empty
transaction is committed BEFORE the error is raised. Any outer exception
handler that tries conn.rollback() after catching TaskNotFoundError
will find nothing to roll back — the "failed" operation is already persisted
(as a no-op commit). This is a logic-order bug: the error check must come
BEFORE commit().

Proof: demonstrate that after TaskNotFoundError is raised, the connection
has no pending transaction to roll back (autocommit state is reset).
"""
import sqlite3
import pytest


class TaskNotFoundError(Exception):
    def __init__(self, task_id):
        super().__init__(f"Task {task_id} not found")
        self.task_id = task_id


def update_priority_buggy(conn, task_id: int, priority: int) -> None:
    """Exact logic from the diff — commit BEFORE rowcount check."""
    cur = conn.execute(
        "UPDATE tasks SET priority = ? WHERE id = ?",
        (priority, task_id),
    )
    conn.commit()           # BUG: commit before validation
    if cur.rowcount == 0:
        raise TaskNotFoundError(task_id)


def update_priority_correct(conn, task_id: int, priority: int) -> None:
    """Correct order — check rowcount BEFORE committing."""
    cur = conn.execute(
        "UPDATE tasks SET priority = ? WHERE id = ?",
        (priority, task_id),
    )
    if cur.rowcount == 0:   # check first
        raise TaskNotFoundError(task_id)
    conn.commit()           # only commit if row was found


def make_db():
    # isolation_level=None → autocommit; we switch to manual below
    conn = sqlite3.connect(":memory:", isolation_level="DEFERRED")
    conn.execute(
        "CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, priority INTEGER, done INTEGER DEFAULT 0)"
    )
    conn.commit()
    return conn


def test_buggy_commit_before_rowcount_check():
    """
    With the buggy ordering, after TaskNotFoundError is raised the connection
    should have no pending transaction (commit already happened).
    This means a caller's rollback() is silently ignored — the 'failed' write
    has already been committed.

    We prove the bug exists by showing that after the buggy version raises,
    a manual INSERT (simulating concurrent work) that was started before the
    call is NOT rolled back — because commit() already closed the transaction.
    """
    conn = make_db()

    # Simulate: caller opens a transaction, does some work, then calls update_priority
    conn.execute("INSERT INTO tasks (id, title, priority) VALUES (10, 'Side effect', 3)")
    # NOTE: not committed yet — this is in the same transaction

    # Now call the buggy update_priority for a non-existent task
    with pytest.raises(TaskNotFoundError):
        update_priority_buggy(conn, task_id=999, priority=2)

    # The buggy code called conn.commit() internally — this committed the
    # INSERT above that the caller hadn't intended to commit yet!
    # A subsequent rollback by the caller won't undo the INSERT.
    conn.rollback()  # caller tries to roll back on error — should undo the INSERT

    row = conn.execute("SELECT * FROM tasks WHERE id = 10").fetchone()

    # CORRECT behaviour: row should be None (rolled back)
    # BUGGY behaviour: row exists (was committed by update_priority's premature commit)
    assert row is None, (
        f"BUG: The INSERT for id=10 was committed by update_priority's premature "
        f"conn.commit() even though TaskNotFoundError was raised. "
        f"Caller's rollback() had no effect. Row: {row}"
    )
