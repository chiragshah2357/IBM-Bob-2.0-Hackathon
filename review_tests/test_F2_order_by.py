"""
F2 – ORDER BY title instead of ORDER BY id violates SPEC §4.
The spec requires ordering by id; the PR orders by title.
We prove this by checking that the SQL string produced by the method
contains 'ORDER BY id' (case-insensitive) and NOT 'ORDER BY title'.
"""
import re

# ── exact copy of the relevant part of search() from the PR ──────────────────

def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def build_sql(query: str) -> str:
    """Returns the SQL string that search() would build."""
    pattern = _escape_like(query.casefold())
    sql = f"""
        SELECT * FROM tasks
        WHERE casefold(title) LIKE '%{pattern}%' ESCAPE '\\'
          AND (:include_done OR done = 0)
          AND (:tag IS NULL OR EXISTS (
              SELECT 1 FROM json_each(tasks.tags)
              WHERE casefold(json_each.value) = :tag
          ))
        ORDER BY title
    """
    return sql


# ── test ──────────────────────────────────────────────────────────────────────

def test_order_by_should_be_id_not_title():
    """
    SPEC §4 mandates ORDER BY id.
    The PR uses ORDER BY title — this test fails on the PR code.
    """
    sql = build_sql("anything")
    has_order_by_id = bool(re.search(r"order\s+by\s+id", sql, re.IGNORECASE))
    has_order_by_title = bool(re.search(r"order\s+by\s+title", sql, re.IGNORECASE))

    assert has_order_by_id and not has_order_by_title, (
        f"ORDER BY clause is wrong: expected 'ORDER BY id', "
        f"got ORDER BY title={has_order_by_title}, ORDER BY id={has_order_by_id}. "
        "Violates SPEC §4."
    )
