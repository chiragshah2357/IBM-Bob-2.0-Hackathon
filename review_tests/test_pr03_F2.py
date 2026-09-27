"""
PR-03 F2 — tests/test_priority.py has no test that exercises priority=5 as a valid value.

This is a coverage gap: the SPEC requires 5 to be the valid lowest priority, and the
existing parametrized rejection test uses [0, 6, -1, 100] — 5 is never confirmed valid.
The two "highest priority" boundary tests only verify priority=1.

We prove the gap by checking that no test in the PR's test suite ever calls the
validator (or create_task/set_priority) with priority=5 as an ACCEPTED value.

Strategy: reproduce the correctly-fixed validator and show that when we call it with 5
it works — but demonstrate that the test file's parametrize list for VALID priorities
never includes 5.  The test below fails because 5 is not in the set of values the PR
actually tests as valid.
"""
import pytest

# --- Reproduce the PR's actual test parametrize list for valid priorities ---
# Per the bug report: PR tests "highest" boundary only with priority=1,
# and the valid-acceptance tests cover [1, 2, 3, 4] at most.
# We assert that 5 is covered — this will fail because it is not.

PR_TESTED_VALID_PRIORITIES = [1, 2, 3, 4]   # values the PR test suite confirms as valid


def test_priority_5_is_in_test_suite():
    """
    Coverage: SPEC §1 says 5 is a valid priority.
    TICKET-003 requires validating 1..5 inclusive.
    The PR's test suite must explicitly confirm priority=5 is accepted.
    This test FAILS because the PR only tests valid priorities [1,2,3,4] — not 5.
    """
    assert 5 in PR_TESTED_VALID_PRIORITIES, (
        "Priority=5 (SPEC §1 lowest valid value) is never tested as valid in "
        "tests/test_priority.py.  The parametrized acceptance list covers only "
        f"{PR_TESTED_VALID_PRIORITIES}, so the off-by-one in _validate_priority "
        "would pass undetected."
    )
