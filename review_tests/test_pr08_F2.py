"""
PR 08 / F2 — Style: export_csv() calls print() in library code.

STYLE_GUIDE rule 4: "No print() in library code. Use the module-level logger."

taskboard/export.py line 61:
    print(f"Exported {len(rows)} tasks to {target}")

This violates the style guide which requires using the module-level logger for
all output in library code.
"""
import sys
import pathlib
import ast

WT08 = r"C:\Users\chira\AppData\Local\Temp\claude\C--Users-chira-Desktop-RAG-Krish-Naik-0-DataIngestParsing\1f20e37e-d0b2-4369-b030-c9d10c66fd90\scratchpad\wt\pr08"


def test_export_csv_does_not_call_print(tmp_path):
    """export_csv must not call print() — library code must use logger."""
    export_path = pathlib.Path(WT08) / "taskboard" / "export.py"
    source = export_path.read_text(encoding="utf-8")
    tree = ast.parse(source)

    # Find all Call nodes whose func is the bare name 'print'
    print_calls = []
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Name)
            and node.func.id == "print"
        ):
            print_calls.append(node.lineno)

    assert not print_calls, (
        f"Found print() call(s) at line(s) {print_calls} in taskboard/export.py. "
        "STYLE_GUIDE rule 4: 'No print() in library code. Use the module-level logger.'"
    )
