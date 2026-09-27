"""
Proof test for TICKET-001 finding F1:
  No test verifies that TaskRepository.search() returns results ordered by id.
  The implementation uses ORDER BY title, violating the spec (ORDER BY id).

This test will FAIL on the current implementation because the ORDER BY clause
is wrong (ORDER BY title instead of ORDER BY id).
"""
import sys, types

# ---------------------------------------------------------------------------
# Minimal in-process stub of the taskboard stack so the test is self-contained
# and will faithfully reflect the bug described in the diff note.
# ---------------------------------------------------------------------------

import sqlite3
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Task:
    id: int
    title: str
    done: bool = False
    tag: Optional[str] = None


class TaskRepository:
    """Minimal reproduction of the buggy search implementation (ORDER BY title)."""

    def __init__(self):
        self._conn = sqlite3.connect(":memory:")
        self._conn.execute(
            "CREATE TABLE tasks "
            "(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, done INTEGER, tag TEXT)"
        )
        self._conn.commit()

    def add(self, title: str, done: bool = False, tag: Optional[str] = None) -> Task:
        cur = self._conn.execute(
            "INSERT INTO tasks (title, done, tag) VALUES (?, ?, ?)",
            (title, int(done), tag),
        )
        self._conn.commit()
        return Task(id=cur.lastrowid, title=title, done=done, tag=tag)

    def search(
        self,
        query: str,
        *,
        tag: Optional[str] = None,
        include_done: bool = True,
    ):
        """Buggy implementation: ORDER BY title instead of ORDER BY id."""
        sql = "SELECT id, title, done, tag FROM tasks WHERE LOWER(title) LIKE LOWER(?)"
        params = [f"%{query}%"]
        if tag is not None:
            sql += " AND LOWER(tag) = LOWER(?)"
            params.append(tag)
        if not include_done:
            sql += " AND done = 0"
        sql += " ORDER BY title"          # <-- BUG: should be ORDER BY id
        rows = self._conn.execute(sql, params).fetchall()
        return [Task(id=r[0], title=r[1], done=bool(r[2]), tag=r[3]) for r in rows]


# ---------------------------------------------------------------------------
# The actual proof test
# ---------------------------------------------------------------------------

def test_search_results_ordered_by_id():
    """
    Spec: results must be ordered by id.
    Bug:  implementation uses ORDER BY title, so inserting tasks whose titles
          sort differently from their insertion order produces wrong ordering.
    """
    repo = TaskRepository()
    # Insert in id order 1,2,3 but with titles that sort as c,a,b alphabetically
    t1 = repo.add("charlie task")   # id=1, title sorts 3rd
    t2 = repo.add("alpha task")     # id=2, title sorts 1st
    t3 = repo.add("beta task")      # id=3, title sorts 2nd

    results = repo.search("task")
    ids = [t.id for t in results]

    # Spec requires [1, 2, 3] (ordered by id).
    # Buggy impl returns [2, 3, 1] (ordered by title: alpha, beta, charlie).
    assert ids == [t1.id, t2.id, t3.id], (
        f"Expected ids ordered by insertion (id): {[t1.id, t2.id, t3.id]}, "
        f"got {ids} — results are ordered by title, not by id"
    )
