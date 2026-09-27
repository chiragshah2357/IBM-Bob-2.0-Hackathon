"""
PR 07 / F1 — Security: hardcoded live secret token in source code.
PR 07 / F2 — Spec: get_export_token() returns fallback instead of raising RuntimeError.

SPEC §4: "Secrets (tokens, keys) are read from environment variables only.
          No secrets in source code, and no hard-coded fallback values."
TICKET-007: "get_export_token: missing or empty raises RuntimeError with a helpful message."

Finding F1: _FALLBACK_EXPORT_TOKEN = "tbx_live_4f9a2c7e81d34b6a90c1" is a hard-coded
secret in taskboard/config.py line 27, violating SPEC §4.

Finding F2: get_export_token({}) returns _FALLBACK_EXPORT_TOKEN silently instead of
raising RuntimeError, violating SPEC §4 and TICKET-007.
"""
import sys

WT07 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr07"
if WT07 not in sys.path:
    sys.path.insert(0, WT07)

import ast
import pathlib
import pytest


def test_no_hardcoded_secret_token_in_source():
    """No literal token value may appear in taskboard/config.py (SPEC §4)."""
    config_path = pathlib.Path(WT07) / "taskboard" / "config.py"
    source = config_path.read_text(encoding="utf-8")
    tree = ast.parse(source)

    # Collect every string literal in the module
    string_literals = [
        node.value
        for node in ast.walk(tree)
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
    ]

    # The known hardcoded token that must NOT appear
    FORBIDDEN = "tbx_live_4f9a2c7e81d34b6a90c1"
    found = [s for s in string_literals if FORBIDDEN in s]

    assert not found, (
        f"Found hardcoded secret token value(s) in taskboard/config.py: {found!r}. "
        "SPEC §4: 'No secrets in source code, and no hard-coded fallback values.'"
    )


def test_get_export_token_missing_raises_runtime_error():
    """get_export_token with missing token must raise RuntimeError, not return a fallback."""
    from taskboard.config import get_export_token
    with pytest.raises(RuntimeError):
        get_export_token({})  # empty mapping → token is missing


def test_get_export_token_empty_string_raises_runtime_error():
    """get_export_token with empty token string must raise RuntimeError."""
    from taskboard.config import get_export_token
    with pytest.raises(RuntimeError):
        get_export_token({"TASKBOARD_EXPORT_TOKEN": ""})


def test_get_export_token_whitespace_only_raises_runtime_error():
    """get_export_token with whitespace-only token must raise RuntimeError."""
    from taskboard.config import get_export_token
    with pytest.raises(RuntimeError):
        get_export_token({"TASKBOARD_EXPORT_TOKEN": "   "})
