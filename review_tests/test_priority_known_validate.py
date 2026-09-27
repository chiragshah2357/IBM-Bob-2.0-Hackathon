"""
Known finding (already flagged): _validate_priority uses strict < MAX_PRIORITY
instead of <= MAX_PRIORITY, making priority=5 invalid.

SPEC says priorities are 1–5 inclusive. The condition
    not MIN_PRIORITY <= priority < MAX_PRIORITY
where MIN_PRIORITY=1 and MAX_PRIORITY=5 rejects priority=5.
"""
import pytest


MIN_PRIORITY = 1
MAX_PRIORITY = 5


def _validate_priority_buggy(priority: int) -> int:
    """Exact condition from the diff."""
    if isinstance(priority, bool) or not isinstance(priority, int):
        raise ValueError(f"priority must be an int, got {type(priority)}")
    if not MIN_PRIORITY <= priority < MAX_PRIORITY:  # BUG: strict <
        raise ValueError(f"priority must be between {MIN_PRIORITY} and {MAX_PRIORITY}")
    return priority


def test_priority_5_rejected_by_buggy_validator():
    """Priority=5 (valid per SPEC 1-5 inclusive) must be accepted — but buggy code rejects it."""
    with pytest.raises(ValueError):
        _validate_priority_buggy(5)
    # The test FAILS (raises ValueError) which proves the bug exists.
    # A correct validator would NOT raise for priority=5.
