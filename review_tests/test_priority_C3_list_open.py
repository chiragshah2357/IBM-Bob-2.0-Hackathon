"""
C3 — list_open_by_priority excludes done tasks.

SQL: SELECT * FROM tasks WHERE done = 0 ORDER BY priority, id
Done tasks (done=1) must NOT appear in results.
"""
import sqlite3
from dataclasses import dataclass
import pytest


@dataclass
class Task:
    id: int
    title: str
    priority: int
    done: bool = False


def _row_to_task(row) -> Task:
    return Task(id=row[0], title=row[1], priority=row[2], done=bool(row[3]))


def make_db():
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE tasks (id INTEGER PRIMARY KEY, title TEXT, priority INTEGER, done INTEGER DEFAULT 0)"
    )
    conn.commit()
    return conn


def list_open_by_priority(conn):
    rows = conn.execute(
        "SELECT * FROM tasks WHERE done = 0 ORDER BY priority, id"
    ).fetchall()
    return [_row_to_task(r) for r in rows]


def test_list_open_excludes_done_tasks():
    """Done tasks must NOT appear in list_open_by_priority results."""
    conn = make_db()
    conn.execute("INSERT INTO tasks (title, priority, done) VALUES (?, ?, ?)", ("Open task", 2, 0))
    conn.execute("INSERT INTO tasks (title, priority, done) VALUES (?, ?, ?)", ("Done task", 1, 1))
    conn.commit()

    results = list_open_by_priority(conn)
    titles = [t.title for t in results]

    assert "Done task" not in titles, f"Done task appeared in open list: {titles}"
    assert "Open task" in titles, f"Open task missing from results: {titles}"
    assert len(results) == 1, f"Expected 1 task, got {len(results)}: {titles}"


def test_list_open_orders_by_priority():
    """Results must be ordered by priority ascending."""
    conn = make_db()
    conn.execute("INSERT INTO tasks (title, priority, done) VALUES (?, ?, ?)", ("Low", 5, 0))
    conn.execute("INSERT INTO tasks (title, priority, done) VALUES (?, ?, ?)", ("High", 1, 0))
    conn.execute("INSERT INTO tasks (title, priority, done) VALUES (?, ?, ?)", ("Mid", 3, 0))
    conn.commit()

    results = list_open_by_priority(conn)
    priorities = [t.priority for t in results]

    assert priorities == sorted(priorities), f"Not sorted by priority: {priorities}"
