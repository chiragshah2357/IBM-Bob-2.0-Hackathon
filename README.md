# Proof-Carrying Review

**A code-review workflow built with IBM Bob 2.0 that reports a finding only if it can write and run a test that fails to prove it.** No failing test, no comment. Reviews are backed by evidence, not opinion — and the ones that are mechanical, Bob fixes.

Built for the IBM Bob 2.0 Hackathon.

---

## The problem

Code review is slow and noisy. Human reviewers miss requirements buried in large diffs, and generic AI reviewers flood pull requests with unverified comments people learn to ignore. Two failure modes:

1. **Missed intent** — the code "looks fine" but silently violates the ticket or the spec.
2. **Noise** — plausible-sounding comments that turn out to be wrong, so the whole review loses trust.

## The idea

A custom **Spec Reviewer** mode for Bob that reviews a pull request against its **ticket + `SPEC.md` + `STYLE_GUIDE.md`**, and enforces one rule:

> A finding is reported only if Bob writes a `pytest` that **fails** because of it.

That makes the review **zero-noise by construction** — every finding ships with a reproducing test, and the mechanical ones ship with a fix that turns the test green.

---

## How it works

```
Pull request
   │
   ▼
Spec Reviewer mode (IBM Bob, Agent mode)
   ├─ 1. Gather   — git diff, ticket, SPEC.md, STYLE_GUIDE.md  (document understanding)
   ├─ 2. Dispatch — 4 parallel reviewer subagents:
   │                spec · bugs+security · coverage · style
   ├─ 3. Prove    — for each candidate, write a pytest and run it;
   │                keep ONLY findings whose test FAILS   (proof-writer skill)
   └─ 4. Report   — REVIEW.md + findings.json  (+ fix diff for mechanical issues)
        │
        ▼
scorer.py + answer_key.json  →  reviewboard/data.js
        │
        ▼
reviewboard dashboard  (pulls the PR list live from GitHub, shows the results)
```

Each stage maps to a Bob feature: **Agent mode** (orchestrator), **subagents + parallel tasks** (the four reviewers + prover), and **document understanding** (ticket/spec as context).

---

## The benchmark

We measure Proof-Carrying Review against two baselines on a sample project
([`IBM-Bob-Hackathon-TestCases`](https://github.com/chiragshah2357/IBM-Bob-Hackathon-TestCases)) —
a small Python task library with **12 pull requests carrying 21 known issues** (2 PRs are clean, to measure false alarms).

| Reviewer | Recall | Precision | Trust* | Noise/clean PR |
|---|---|---|---|---|
| **Proof-Carrying Review** | **90%** | **95%** | **100%** | **0.5** |
| Bob built-in review | 62% | 72% | 0% | 2.5 |
| Naive single-prompt LLM | 48% | 43% | 0% | 6.5 |

\* **Trust** = the share of findings backed by an executed failing test. Ours is 100% by design; the baselines can't verify their findings at all.

Metrics are computed by [`scorer/scorer.py`](scorer/scorer.py), which matches each reviewer's findings against the ground truth in [`scorer/answer_key.json`](scorer/answer_key.json) and writes `reviewboard/data.js`.

---

## Repository layout

```
.bob/                         The Spec Reviewer mode (built inside IBM Bob)
  custom_modes.yaml           mode definition
  rules-spec-reviewer/        gather → dispatch → report
  skills/
    spec-reviewer/            pipeline overview
    proof-writer/             write + run the proving tests, keep only failures
scorer/
  scorer.py                   computes recall / precision / trust / noise
  answer_key.json             benchmark ground truth
  runs/{ours,bob,naive}/      each reviewer's findings, per PR
reviewboard/                  the dashboard (live GitHub PR pull + results)
evidence/                     IBM Bob task-session screenshots per team member
PLAN.md                       Bob's capability research + pipeline design
vercel.json                   serves reviewboard/ as the site root
```

---

## Run it locally

**The dashboard** (static — pulls PRs live from GitHub):

```bash
cd reviewboard
python -m http.server 8777
# open http://127.0.0.1:8777
```

**The scorer** (recompute the numbers from the run files):

```bash
python scorer/scorer.py      # rewrites reviewboard/data.js and prints the leaderboard
```

## Deploy

Deployed on Vercel; `vercel.json` redirects `/` to `/reviewboard/`. The PR list is fetched live from the GitHub API in the browser; the benchmark numbers are the scorer's output, regenerated whenever the reviews are re-run.

---

## Built with IBM Bob 2.0

The Spec Reviewer mode, its skills, and the scorer were authored inside IBM Bob using its
create-mode / create-skill workflows and Agent mode. Per-member task-session evidence is in
[`evidence/`](evidence/).
