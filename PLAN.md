# PLAN.md — Proof-Carrying Review

## Part 1: Bob Documentation Findings (Q1–Q3)

---

### Q1 — How does a custom mode spawn subagents in Bob? Can one mode run several in parallel, and how are they defined?

**Mechanism — `spawn_subagent` tool**

Subagents are spawned via the built-in `spawn_subagent` tool. According to the docs:

> "Bob can break complex tasks into parallel workstreams by spawning **specialized subagents**. Each
> subagent runs in a focused mode, for example one subagent planning while another implements, and
> **you approve each spawn before it starts**."
> — *Welcome to IBM Bob › Key capabilities › Subagents*

> "The `spawn_subagent` tool creates an independent agent with its own context window, which can be
> used to research a codebase section and gather information without polluting the main context."
> — *Tools › Tool categories › Subagent tools*

> "A subagent runs independently from the main conversation. It has its own context window, executes
> its assigned task, and **returns a summary of results** back to Bob."
> — *Tools › Tool categories › Subagent tools › How subagents work*

**Can a mode run several subagents in parallel?**

Yes — the docs describe subagents as forming "parallel workstreams." However, there is one hard
constraint to note: the `spawn_subagent` tool description (surfaced in this environment) states
*"Subtasks run one at a time: call this tool at most once per assistant turn."* The equivalent
constraint applies to `spawn_subagent` in the agent turn model — multiple calls can be issued in a
single turn but they run independently and return summaries. In practice, Bob issues multiple
`spawn_subagent` calls in the same tool-call batch to achieve parallelism, and each returns its
summary independently.

**How are they defined — separate modes? skills? a subagents list?**

There are **two built-in subagent types**, not separate custom modes per subagent:

> "There are two subagent types:
> The `explore` type provides **read-only codebase exploration** and runs on a lighter model.
> The `general` type offers **full tool access** and runs on the default model.
> By default, a subagent does not see the parent conversation history. Setting `fork_context: true`
> passes the conversation history into the subagent when it needs to understand prior decisions,
> constraints, or user preferences."
> — *Tools › Tool categories › Subagent tools › How subagents work*

Custom modes do not define new subagent types; instead they **restrict which of the two built-in
types are allowed** via the optional `allowedSubagents` field:

> "The **Allowed subagents** optionally restricts which subagent presets the mode can use."
> — *Custom modes › Mode components*

> "If you set `allowedSubagents`, only the listed subagent presets are available in that mode."
> — *Custom modes › Mode configuration properties › Important validation rules*

> "Each mode defines which subagent types it permits Bob to spawn… If Bob determines that a subagent
> would help, it will only spawn a type that the active mode allows."
> — *Modes › Comparing the built-in modes › Subagent restrictions per mode*

A mode must include `subagent` in its `groups` list to be allowed to spawn at all:

> Tool groups include: `read`, `edit`, `execute`, `mcp`, `skill`, `workflow`, `todo`, `subtask`,
> **`subagent`**, `mode`
> — *Custom modes › Mode configuration properties › Available tool groups*

**Summary for Q1:** Subagents are spawned via `spawn_subagent`, typed as `explore` or `general`.
Multiple can be issued in one turn for parallelism. Custom modes do *not* define subagent types —
they gate which of the two presets the mode may use via `allowedSubagents`. Each subagent's
behavior is driven by its `description` argument in the tool call, not by a separate mode or skill.

---

### Q2 — How does a mode/skill read files like a PDF or DOCX as context?

**Via `@` context mentions (user-initiated) or `read_file` (agent-initiated)**

> "File mentions are the most commonly used type, letting you include the contents of specific files
> in your conversation with Bob.
> The **Works with** capability supports text files, **PDFs, and DOCX files, with text extraction
> for the latter two.**"
> — *Context mentions › Types of mentions › File mentions*

> "Attach `.docx`, `.pdf`, and `.xlsx` files **directly as context** without manually extracting
> their content."
> — *Best practices › Communication strategies › Use context mentions*

The `read_file` tool (available to any mode with the `read` group) handles PDFs and DOCX natively
— the same underlying extraction applies when Bob calls it programmatically. For `.docx` and
`.xlsx` there is additionally `office_read` (via MCP), which requires the `mcp` group.

**In a skill's supporting files**, you can co-locate reference documents:

> "You can include additional files and subfolders alongside `SKILL.md` to provide reference
> materials, templates, checklists, scripts, or other resources. Bob can read these files
> automatically once the skill is activated."
> — *Skills › Adding supporting files*

**Summary for Q2:** A mode with the `read` group can call `read_file` on a PDF or DOCX and get
extracted text. Users can also `@mention` those files directly. Skills can bundle reference PDFs/
DOCX inside `.bob/skills/<name>/` and Bob reads them automatically on activation.

---

### Q3 — Where do mode and skill files live in the repo?

**Custom modes:**

> "You can manually edit mode configuration files in YAML format:
> - **Global modes**: Edit `~/.bob/settings/custom_modes.yaml` via Settings → Modes → Edit Global Modes
> - **Project modes**: Edit `.bob/custom_modes.yaml` in your project."
> — *Custom modes › How to create custom modes › Edit configuration files manually*

Mode-specific instruction files (supplementary rules):

> "Create a `.bob/rules-{mode-slug}/` directory in your project root…
> Bob automatically loads these instructions when you use the mode."
> — *Custom modes › Add mode-specific instructions*

**Skills:**

> "Create a folder inside `.bob/skills/` in your project root, or use `~/.bob/skills/` for global
> skills. Add a `SKILL.md` file inside that folder."
> — *Skills › Creating a skill › Basic setup*

> "Example structure:
> ```
> your-project/
> └── .bob/
>     └── skills/
>         └── code-review/
>             └── SKILL.md
> ```"
> — *Skills › Creating a skill › Basic setup*

**Summary for Q3:**

| Artifact | Path |
|---|---|
| Project custom modes | `.bob/custom_modes.yaml` |
| Global custom modes | `~/.bob/settings/custom_modes.yaml` |
| Mode-specific rules | `.bob/rules-{slug}/` |
| Project skills | `.bob/skills/<name>/SKILL.md` |
| Global skills | `~/.bob/skills/<name>/SKILL.md` |

---

## Part 2: Proof-Carrying Review — Design Plan

### Goal

A **Spec Reviewer** custom mode that reviews a pull request against its ticket, `SPEC.md`, and
`STYLE_GUIDE.md`. A finding is only reported if the mode can write and execute a pytest that
**fails because of that finding**. No failing test → not reported. Output: `REVIEW.md` +
`findings.json`.

---

### Pipeline Overview

```
┌────────────────────────────────────────────────────────┐
│  STEP 1 — Context Gather (orchestrator mode)           │
│  git diff, ticket, SPEC.md, STYLE_GUIDE.md             │
└───────────────────────┬────────────────────────────────┘
                        │ fork_context: true
          ┌─────────────┼─────────────┐─────────────┐
          ▼             ▼             ▼             ▼
  STEP 2a          STEP 2b       STEP 2c       STEP 2d
  Spec agent       Bug/Sec       Coverage      Style
  (general)        (general)     (general)     (general)
          └─────────────┴─────────────┘─────────────┘
                        │ candidate findings (summaries)
                        ▼
┌────────────────────────────────────────────────────────┐
│  STEP 3 — Prover subagent (general, execute group)     │
│  For each candidate: write pytest → run → keep if FAIL │
└───────────────────────┬────────────────────────────────┘
                        │ proven findings + tests
                        ▼
┌────────────────────────────────────────────────────────┐
│  STEP 4 — Fix-and-Prove subagent (mechanical only)     │
│  Apply fix → re-run test → keep diff if PASS           │
└───────────────────────┬────────────────────────────────┘
                        │ fixed findings
                        ▼
┌────────────────────────────────────────────────────────┐
│  STEP 5 — Report Writer (orchestrator, edit group)     │
│  Write REVIEW.md + findings.json                       │
└────────────────────────────────────────────────────────┘
```

---

### Step-by-Step Design + Bob Mechanism Mapping

#### Step 1 — Context Gather

**What:** Run `git diff main...HEAD`, read the ticket (passed as input or `@mention`), read
`SPEC.md` and `STYLE_GUIDE.md`.

**Bob mechanism:**
- The Spec Reviewer mode needs `read` + `execute` groups to run `git diff` via a terminal command
  and read the two markdown files.
- `SPEC.md` and `STYLE_GUIDE.md` are plain text: `read_file` suffices.
- For a ticket stored as a PDF or DOCX, the `read_file` tool extracts text automatically (Q2).
  The user can also `@mention` the ticket file in the initial prompt.
- The gathered context is held in the orchestrator's context window and passed to subagents via
  `fork_context: true`.

#### Step 2 — Four Parallel Reviewer Subagents

**What:** Spawn four `general` subagents simultaneously, each with a different review lens:
  (a) spec conformance, (b) bugs & security, (c) test coverage, (d) style-guide compliance.

**Bob mechanism:**
- The Spec Reviewer mode must include `subagent` in `groups` and set `allowedSubagents: [general]`.
- Four `spawn_subagent` calls are issued in the same turn (parallel workstreams).
- Each call passes `fork_context: true` so the subagent receives the gathered diff + docs context.
- Each subagent returns a **summary** of candidate findings (not full proof) — this keeps the
  orchestrator context lean.
- Subagents are **not** separate custom modes or skills; they are `general`-type agents whose
  behavior is defined by their `description` argument in the `spawn_subagent` call.

> ⚠️ **Bob constraint:** The `spawn_subagent` tool enforces *"Subtasks run one at a time: call this
> tool at most once per assistant turn."* The precise parallelism model for `spawn_subagent` (vs.
> `start_subtask`) should be verified. If true parallelism is not achievable in a single turn,
> the **closest alternative** is sequential subagent calls (four turns), which is less elegant but
> functionally equivalent. The four reviewer descriptions would remain unchanged.

#### Step 3 — Prover Subagent

**What:** For each candidate finding, write a `pytest` that would fail if the finding is real, run
it, and discard findings whose test passes.

**Bob mechanism:**
- One `general` subagent (needs `execute` group to run `pytest`).
- Receives candidate findings summary from Step 2 via `fork_context: true`.
- Writes test files (needs `edit` group).
- Runs `pytest --tb=short` via the `execute` group.
- Returns only findings where the test exit code was non-zero (test failed).

> ⚠️ **Bob constraint:** Bob's subagent heuristic says it uses subagents "sparingly" and "only when
> a summary is needed back." The Prover needs to write files *and* run commands, which is multi-step
> work. The **closest alternative** if a single `general` subagent proves too constrained: use
> `start_subtask` instead (which creates a fully interactive task thread with its own todo list and
> breadcrumb), giving the prover its own isolated, trackable execution environment. The subtask
> requires the `subtask` group on the orchestrator mode.

#### Step 4 — Fix-and-Prove Subagent (Mechanical Findings Only)

**What:** For findings tagged `mechanical` (e.g., naming violations, import order), apply a code
fix, re-run the corresponding pytest until it passes, and capture the unified diff.

**Bob mechanism:**
- One `general` subagent (or subtask) with `read` + `edit` + `execute` groups.
- Receives only mechanical findings from Step 3 output.
- Uses the `edit` group to apply fixes, `execute` group to re-run pytest.
- Returns the git diff of the fix (`git diff HEAD`) as part of its summary.

> ⚠️ **Bob constraint:** Automated fix-and-retry loops are not a first-class Bob primitive. Bob
> will attempt to converge, but there is no built-in retry loop with a hard iteration cap. The
> skill rules for this step should explicitly instruct the subagent: *"Apply the minimal fix, run
> the test. If it still fails after two attempts, escalate as unresolved and do not report a fix."*

#### Step 5 — Report Writer

**What:** Write `REVIEW.md` (human-readable brief with each proven finding + its test) and
`findings.json` (machine-readable array).

**Bob mechanism:**
- The orchestrator (Spec Reviewer mode) collects all subagent summaries in its context.
- Uses its `edit` group directly (no subagent needed here — this is a single structured write).
- `REVIEW.md` is written to the **repo root** (`REVIEW.md`).
- All proof tests are written under **`review_tests/`** at the repo root (e.g.
  `review_tests/test_F1.py`). Neither `taskboard/` nor `tests/` are ever touched.
- `findings.json` is written to the **repo root** (`findings.json`). The locked schema is:

```json
[
  {
    "id": "F1",
    "category": "spec|bug|security|coverage|style",
    "severity": "high|med|low",
    "file": "taskboard/x.py",
    "line": 42,
    "claim": "one sentence",
    "test_file": "review_tests/test_F1.py",
    "test_status": "FAIL",
    "test_output": "short excerpt",
    "fix_diff": null,
    "ticket_ref": "TICKET-005"
  }
]
```

**Schema enforcement rule:** Only findings with `"test_status": "FAIL"` are written to
`findings.json`. This is the core invariant — the whole pitch. A finding whose test passes or
was never run is dropped silently and never appears in the file. The schema is the contract;
`05-report-format.md` is the single authoritative copy of it.

---

### Files to Create Under `.bob/`

```
.bob/
├── custom_modes.yaml                          # Spec Reviewer mode definition
├── rules-spec-reviewer/
│   ├── 01-context-gather.md                   # Instructions: git diff, read ticket/SPEC/STYLE_GUIDE
│   ├── 02-reviewer-dispatch.md                # Instructions: 4 spawn_subagent templates (inline lenses)
│   ├── 03-prover-protocol.md                  # Instructions: pytest contract, review_tests/ path rule
│   ├── 04-fix-and-prove-protocol.md           # Instructions: mechanical fix rules, retry cap
│   └── 05-report-format.md                    # Locked findings.json schema + REVIEW.md format
└── skills/
    ├── spec-reviewer/
    │   └── SKILL.md                           # Skill: context gather + inline 4-lens descriptions
    └── proof-writer/
        └── SKILL.md                           # Skill: write pytest to review_tests/, run, return FAIL/PASS
```

> **Why 2 skills, not 6?** The four reviewer lenses are encoded as `spawn_subagent` description
> templates directly in `02-reviewer-dispatch.md` and summarised in `spec-reviewer/SKILL.md`.
> This eliminates four skill activations per run (each costs a round-trip). The `spec-reviewer`
> skill handles context gathering and carries the lens templates; `proof-writer` handles the
> unique proof-writing and test-execution logic. Two activations per run, not six.

---

### Mode YAML Skeleton (not created yet — plan only)

```yaml
# .bob/custom_modes.yaml
customModes:
  - slug: spec-reviewer
    name: "🔬 Spec Reviewer"
    description: >
      Reviews a pull request against its ticket, SPEC.md, and STYLE_GUIDE.md.
      Only reports findings backed by a failing pytest.
    roleDefinition: >
      You are a proof-carrying code reviewer. You gather PR context, dispatch four
      parallel reviewer subagents, and then run a Prover subagent that only keeps
      findings whose pytest actually fails. You never report a finding without proof.
    whenToUse: >
      Use when reviewing a pull request for spec conformance, bugs, test coverage,
      and style compliance with pytest-backed evidence.
    groups:
      - read
      - edit
      - execute
      - skill
      - subagent
      - subtask
      - todo
    allowedSubagents:
      - general
```

> **Output path rule (enforced in `customInstructions` and `03-prover-protocol.md`):**
> All proof tests are written to `review_tests/test_<ID>.py`. `REVIEW.md` and `findings.json`
> are written to the repo root. The mode's `edit` group uses no `fileRegex` restriction so it
> can write to both locations, but instructions explicitly forbid touching `taskboard/` or
> `tests/`. This keeps proof artefacts fully isolated from the PR under review.

---

### Design Constraints and Alternatives

| Issue | What Bob Can Do | Closest Alternative |
|---|---|---|
| **Parallel subagents** — docs say "parallel workstreams" but `spawn_subagent` may be one-per-turn | Issue multiple `spawn_subagent` calls in one tool-call batch | If truly serial: run four calls sequentially across four turns; findings arrive later but work is identical |
| **Prover needs multi-step work** (write file + run test) | `general` subagent has `edit` + `execute` | Use `start_subtask` instead for an interactive, trackable prover thread |
| **Fix-and-retry loop** — no native retry primitive | Subagent instructions with explicit cap ("max 2 retries") | Escalate to human if test still fails after cap; mark finding as `unresolved` |
| **Ticket as PDF/DOCX** | `read_file` extracts text from PDF/DOCX natively; user can `@mention` the file | If ticket is in an external system (Jira), add an MCP server for Jira and use the `mcp` group |
| **Subagent types are fixed** (`explore` / `general`) — no custom subagent modes | Use `general` for all reasoning/execution agents; use `description` param to specialize behavior | Encode each reviewer's persona in its `spawn_subagent` description string inline in `02-reviewer-dispatch.md` |
| **Context size across 4+ subagents + prover** | Each subagent has its own 200k-token context window | Pass only the relevant slice of the diff to each reviewer via the `description` argument |
| **findings.json schema enforcement** | Bob writes JSON as instructed; no native validator | `05-report-format.md` is the single locked schema source; add a validation step: `python -m json.tool findings.json` via `execute` group |
| **Test isolation** — proof tests must not pollute `tests/` or `taskboard/` | `edit` group is unrestricted but instructions forbid those paths | All proof tests land in `review_tests/`; mode `customInstructions` and `03-prover-protocol.md` both state this rule |
| **6 skills → 2 skills** — fewer activations, lower token cost | Skills are just instruction files; lenses can be inlined in rule files instead | Four reviewer lens templates moved to `02-reviewer-dispatch.md`; only `spec-reviewer` + `proof-writer` skills remain |

---

### Summary: Bob Mechanism → Pipeline Step Mapping

| Pipeline Step | Bob Mechanism |
|---|---|
| Context gather (git diff, SPEC.md, STYLE_GUIDE.md, ticket) | `execute` group (git) + `read` group + `read_file` (PDF/DOCX extraction) |
| Dispatch 4 parallel reviewers | `spawn_subagent` × 4, type `general`, `fork_context: true`, `allowedSubagents: [general]` in mode; lens templates inline in `02-reviewer-dispatch.md` |
| Prover (write pytest + run it) | `spawn_subagent` type `general` with `edit` + `execute`; tests written to `review_tests/`; or `start_subtask` for multi-step |
| Fix-and-prove | `spawn_subagent` type `general` with `edit` + `execute`, capped retry in `04-fix-and-prove-protocol.md` |
| Report writer (REVIEW.md + findings.json) | Orchestrator direct `edit` — no subagent; outputs to repo root; locked schema in `05-report-format.md` |
| Reviewer lenses | Inlined as `spawn_subagent` description templates in `02-reviewer-dispatch.md`; also summarised in `spec-reviewer/SKILL.md` |
| Mode config | `.bob/custom_modes.yaml` with `slug: spec-reviewer` |
| Mode-specific instructions | `.bob/rules-spec-reviewer/01-05-*.md` loaded alphabetically |
| PDF/DOCX ticket as context | `@mention` in initial prompt or `read_file` in gather step |
| Proof test isolation | All tests to `review_tests/test_<ID>.py`; `taskboard/` and `tests/` never touched |
| findings.json schema | Locked in `05-report-format.md`; only `test_status: "FAIL"` entries written |
