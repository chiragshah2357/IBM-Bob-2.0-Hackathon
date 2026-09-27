# naive baseline: how these files were produced

The `naive` column is the control, not the product. It is what an ordinary single
pass LLM review looks like with none of the Proof Carrying Review machinery.

Produced by **Claude (Anthropic), not IBM Bob**, on 2026-09-27, under these constraints:

- read only `git diff main...<branch>` for each PR, excluding the tests directory
- did NOT read the ticket, SPEC.md or STYLE_GUIDE.md
- did NOT write or run a single test
- one pass, no subagents, no prover, no drop step
- every finding carries `test_status: "not_run"` and `fix_diff: null`, because
  nothing here is proven

The answer key was not consulted while writing these findings. One partial exception
is recorded for honesty: the planted issues for PR 01 had been read earlier in the
same working session. That can only flatter the baseline, not the proof mode result.

Covers PR 01 to PR 08, matching the eight PRs IBM Bob actually reviewed.
