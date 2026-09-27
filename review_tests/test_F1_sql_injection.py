"""
F1 – SQL injection via f-string interpolation of `pattern` into the LIKE clause.
_escape_like only escapes \\, % and _ — a single-quote in the query
breaks out of the surrounding '...' literal and allows arbitrary SQL.
"""
import sqlite3

# ── minimal replica of the code under review ─────────────────────────────────

def _escape_like(value: str) -> str:
    """Exact copy from the PR."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search(conn: sqlite3.Connection, query: str) -> list[tuple]:
    """Replica of the search() method from the PR (LIKE clause only)."""
    pattern = _escape_like(query.casefold())
    sql = f"""
        SELECT * FROM tasks
        WHERE casefold(title) LIKE '%{pattern}%' ESCAPE '\\'
        ORDER BY title
    """
    return conn.execute(sql).fetchall()


# ── test ──────────────────────────────────────────────────────────────────────

def _make_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.create_function("casefold", 1, lambda s: s.casefold() if isinstance(s, str) else s)
    conn.execute("""
        CREATE TABLE tasks (
            id    INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            done  INTEGER NOT NULL DEFAULT 0,
            tags  TEXT NOT NULL DEFAULT '[]'
        )
    """)
    conn.execute("INSERT INTO tasks(title) VALUES ('alpha')")
    conn.execute("INSERT INTO tasks(title) VALUES ('beta')")
    conn.commit()
    return conn


def test_sql_injection_via_single_quote():
    """
    A query containing a single-quote must not cause a SQL error or
    return rows it shouldn't.  On the PR code the f-string interpolation
    breaks the LIKE literal, raising OperationalError (or returning wrong rows).
    The test asserts the call completes without an exception and returns
    only the expected rows — which the PR code fails to do.
    """
    conn = _make_db()
    # This payload closes the LIKE string and appends '-- to comment out the rest.
    # On safe (parameterised) code it would simply find no results.
    # On the PR code it raises sqlite3.OperationalError.
    try:
        rows = search(conn, "alpha' OR '1'='1")
    except sqlite3.OperationalError:
        # The f-string injection caused a SQL error → finding proven
        assert False, (
            "SQL injection: single-quote in query caused OperationalError "
            "because pattern is interpolated directly into the SQL string."
        )
    # Even if no exception, an injected query returning ALL rows is also wrong.
    assert len(rows) <= 1, (
        f"SQL injection: query returned {len(rows)} rows (expected ≤1); "
        "the injected OR clause matched every row."
    )
