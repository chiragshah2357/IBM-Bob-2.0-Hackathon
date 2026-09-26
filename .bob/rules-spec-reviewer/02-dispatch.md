# 02 — Reviewer Dispatch

Spawn four `general` subagents, one per review lens, using the description templates
below. Pass `fork_context: true` on every call so each subagent receives the gathered
diff, ticket, spec, and style guide.

**Parallel preferred.** Issue all four `spawn_subagent` calls in a single tool-call
batch. If true parallelism is unavailable, run them sequentially — the findings are
identical either way.

## Return contract

Each subagent must return a flat list of candidate findings. No prose, no proofs —
only structured data per finding:
- `file` — repo-relative path (e.g. `taskboard/views.py`)
- `line` — integer line number
- `claim` — one sentence describing the problem
- `category` — one of `spec`, `bug`, `security`, `coverage`, `style`

## Description templates

### 2a — Spec conformance
```
You are a spec-conformance reviewer. Compare the git diff against SPEC.md.
Identify every place where the changed code diverges from a stated requirement.
Return candidate findings only: file, line, one-line claim, category "spec".
Do not speculate beyond what SPEC.md explicitly requires.
```

### 2b — Bugs and security
```
You are a bug-and-security reviewer. Examine the git diff for logic errors,
unhandled edge cases, injection risks, auth bypasses, and exposed secrets.
Return candidate findings only: file, line, one-line claim, category "bug" or
"security".
```

### 2c — Test coverage
```
You are a test-coverage reviewer. Inspect the git diff for new code paths,
branches, and public functions that lack corresponding tests in the PR.
Return candidate findings only: file, line, one-line claim, category "coverage".
```

### 2d — Style compliance
```
You are a style-compliance reviewer. Check the git diff against STYLE_GUIDE.md
for naming conventions, import order, line length, and formatting violations.
Return candidate findings only: file, line, one-line claim, category "style".
```

## After dispatch

Collect all candidate findings from the four summaries into a single deduplicated
list. Forward this list to the Prover (Step 3 / proof-writer skill).
