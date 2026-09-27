# PR Review — feat/export-token-config (TICKET-007)

## Summary
2 proven findings, both high-severity. The `config.py` module hard-codes a live secret token as `_FALLBACK_EXPORT_TOKEN = "tbx_live_4f9a2c7e81d34b6a90c1"` (F1, security), directly violating SPEC §4. The `get_export_token()` function compounds this by silently returning that fallback instead of raising `RuntimeError` when the environment variable is absent or empty (F2, spec). Together they mean the PR ships a live credential into the codebase and bypasses the required error signal for missing configuration. The PR is **not mergeable** in its current state. 1 candidate dropped (coverage gap, same root cause as F1/F2).

## Findings

### F1 — Hard-coded live secret token in source code (high)
- **File:** `taskboard/config.py:27`
- **Category:** security
- **Ticket ref:** TICKET-007
- **Test:** `review_tests/test_pr07_F1.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr07_F1.py::test_no_hardcoded_secret_token_in_source
  review_tests\test_pr07_F1.py:43: in test_no_hardcoded_secret_token_in_source
      assert not found, (
  E   AssertionError: Found hardcoded secret token value(s) in taskboard/config.py: ['tbx_live_4f9a2c7e81d34b6a90c1'].
  E   SPEC §4: 'No secrets in source code, and no hard-coded fallback values.'
  E   assert not ['tbx_live_4f9a2c7e81d34b6a90c1']
  4 failed in 0.27s
  ```
- **Fix diff:** none — manual fix required. Remove `_FALLBACK_EXPORT_TOKEN` entirely and raise `RuntimeError` instead.

### F2 — get_export_token() returns fallback instead of raising RuntimeError (high)
- **File:** `taskboard/config.py:126`
- **Category:** spec
- **Ticket ref:** TICKET-007
- **Test:** `review_tests/test_pr07_F1.py`
- **Test output:**
  ```
  FAILED review_tests/test_pr07_F1.py::test_get_export_token_missing_raises_runtime_error
  review_tests\test_pr07_F1.py:52: in test_get_export_token_missing_raises_runtime_error
      with pytest.raises(RuntimeError):
  E   Failed: DID NOT RAISE RuntimeError
  WARNING  taskboard.config:config.py:125 TASKBOARD_EXPORT_TOKEN is not set; using the default export token

  FAILED review_tests/test_pr07_F1.py::test_get_export_token_empty_string_raises_runtime_error
  E   Failed: DID NOT RAISE RuntimeError

  FAILED review_tests/test_pr07_F1.py::test_get_export_token_whitespace_only_raises_runtime_error
  E   Failed: DID NOT RAISE RuntimeError
  4 failed in 0.27s
  ```
- **Fix diff:** none — manual fix required. Replace the fallback return with `raise RuntimeError(f"{EXPORT_TOKEN_ENV_VAR} is required but not set")`.
