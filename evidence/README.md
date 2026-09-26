# Evidence (naming convention)

Every member commits their own Bob evidence. Keep names lowercase, zero-padded.

## screenshots/<member>/NN-<task>.png
Screenshot of the Bob task **session summary** panel.
  chirag/01-build-mode.png
  chirag/02-review-pr05.png
  arjun/01-review-pr02.png

## sessions/<member>/NN-<task>.md
The exported session-summary TEXT (if Bob can export it). Same NN/<task> as the screenshot.

## runs/pr<NN>/
Copied out of the test repo after each review:
  REVIEW.md, findings.json, review_tests/
  fix.diff  (if Bob applied fixes)
Generated (offline, non-Bob) runs go in runs/pr<NN>/ too, with a file GENERATED.txt
noting they were produced for dashboard completeness, not by a live Bob session.

## Rule mapping
- Bob evidence  → screenshots/ + sessions/  (per member)
- Bob output    → runs/
