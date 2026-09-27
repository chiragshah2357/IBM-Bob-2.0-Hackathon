"""
scorer.py — Proof-Carrying Review benchmark scorer.

Reads:
  scorer/answer_key.json
  scorer/runs/{ours,bob,naive}/pr<NN>.json   (missing files = no findings)

Writes:
  reviewboard/data.js   (consumed by the dashboard unchanged)

Prints a leaderboard table to stdout.
"""

import json
import os
import sys

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT    = os.path.dirname(SCRIPT_DIR)
ANSWER_KEY   = os.path.join(SCRIPT_DIR, "answer_key.json")
RUNS_DIR     = os.path.join(SCRIPT_DIR, "runs")
OUT_PATH     = os.path.join(REPO_ROOT, "reviewboard", "data.js")

REVIEWERS    = ["ours", "naive"]

# The PRs this submission actually reviewed. IBM Bob credits ran out after PR 08,
# so PR 09 to PR 12 were never reviewed and are excluded from scoring rather than
# counted as silent misses. Both reviewers are scored over exactly this set.
SCOPE        = ["01", "02", "03", "04", "05", "06", "07", "08"]

# ---------------------------------------------------------------------------
# Load helpers
# ---------------------------------------------------------------------------

def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def load_run(reviewer, pr_num):
    """Return findings list for a reviewer/PR, or [] if file is missing."""
    path = os.path.join(RUNS_DIR, reviewer, f"pr{pr_num}.json")
    if not os.path.exists(path):
        return []
    return load_json(path)


# ---------------------------------------------------------------------------
# Matching logic
# ---------------------------------------------------------------------------

def match_findings(findings, planted):
    """
    Greedy matching: sort (finding, planted) pairs by |line delta| ascending,
    assign each planted issue at most once.

    Returns:
        matched_set  : set of finding indices that matched a planted issue
        caught_set   : set of planted issue ids that were caught
    """
    if not planted:
        return set(), set()

    # Build all candidate pairs: (abs_line_delta, finding_idx, planted_id)
    candidates = []
    for fi, f in enumerate(findings):
        for p in planted:
            line_delta = abs((f.get("line") or 0) - p["line"])
            same_file  = f.get("file", "") == p["file"]
            same_cat   = f.get("category", "") == p["category"]
            if same_file and (line_delta <= 8 or same_cat):
                candidates.append((line_delta, fi, p["id"]))

    # Sort greedy: nearest line first
    candidates.sort(key=lambda x: x[0])

    matched_finding_idxs = set()
    caught_planted_ids   = set()

    for _delta, fi, pid in candidates:
        if fi in matched_finding_idxs or pid in caught_planted_ids:
            continue
        matched_finding_idxs.add(fi)
        caught_planted_ids.add(pid)

    return matched_finding_idxs, caught_planted_ids


# ---------------------------------------------------------------------------
# Per-reviewer aggregate metrics
# ---------------------------------------------------------------------------

def compute_metrics(answer_key, reviewer):
    """
    Returns a dict with aggregate metrics across all PRs for one reviewer.

    Per-PR data also returned for sizeBuckets computation.
    """
    prs            = {k: v for k, v in answer_key["prs"].items() if k in SCOPE}
    sw             = answer_key["severity_weight"]

    # Scope-aware: counting against the whole 12-PR key while only 8 were reviewed
    # would charge this reviewer with misses on PRs nobody ran.
    total_planted      = sum(len(p.get("planted", [])) for p in prs.values())
    total_findings     = 0
    total_matched      = 0   # findings that hit a planted issue
    total_caught       = 0   # planted issues that were found
    total_fp           = 0   # false positives
    total_fail_tests   = 0   # findings with test_status == "FAIL"

    # Weighted recall accumulators
    total_planted_weight = 0
    total_caught_weight  = 0

    clean_pr_count = sum(1 for p in prs.values() if p["clean"])

    # per-PR recall by size bucket: {pr_num: (size, caught, planted_count)}
    pr_recall = {}

    for pr_num, pr_data in prs.items():
        planted  = pr_data.get("planted", [])
        is_clean = pr_data.get("clean", False)
        findings = load_run(reviewer, pr_num)

        matched_idxs, caught_ids = match_findings(findings, planted)

        pr_total     = len(findings)
        pr_matched   = len(matched_idxs)
        pr_caught    = len(caught_ids)
        pr_fp        = pr_total - pr_matched   # every unmatched finding is FP
        pr_fail      = sum(1 for f in findings if f.get("test_status") == "FAIL")

        if is_clean:
            # All findings on a clean PR are false positives (0 planted)
            pr_fp = pr_total

        total_findings   += pr_total
        total_matched    += pr_matched
        total_caught     += pr_caught
        total_fp         += pr_fp
        total_fail_tests += pr_fail

        for p in planted:
            w = sw.get(p["severity"], 1)
            total_planted_weight += w
            if p["id"] in caught_ids:
                total_caught_weight += w

        pr_recall[pr_num] = {
            "size":    pr_data["size"],
            "caught":  pr_caught,
            "planted": len(planted),
        }

    recall    = round(100 * total_caught   / total_planted)       if total_planted  else 0
    precision = round(100 * total_matched  / total_findings)      if total_findings else 0
    trust     = round(100 * total_fail_tests / total_findings)    if total_findings else 0
    false_alarms = total_fp
    # No clean PR in scope means noise is unmeasured, not zero. Never report 0.0 here.
    noise        = round(false_alarms / clean_pr_count, 1)        if clean_pr_count else None

    # Weighted recall (informational)
    w_recall = round(100 * total_caught_weight / total_planted_weight) if total_planted_weight else 0

    return {
        "recall":       recall,
        "precision":    precision,
        "trust":        trust,
        "false_alarms": false_alarms,
        "noise":        noise,
        "w_recall":     w_recall,
        "pr_recall":    pr_recall,   # internal; stripped before JSON output
    }


# ---------------------------------------------------------------------------
# Size-bucket recall
# ---------------------------------------------------------------------------

# Bucket definitions: label -> size code(s) in answer_key
BUCKET_DEFS = [
    ("Small",  "≤250 lines",   {"S"}),
    ("Medium", "250-310 lines", {"M"}),
    ("Large",  "310+ lines",   {"L"}),
]

# Dash version of Medium label used in JS output (en-dash to match mock)
MEDIUM_LABEL = "250\u2013310 lines"


def size_buckets(metrics_by_reviewer):
    """
    Returns the sizeBuckets list for the JS output.
    Each bucket: { size, lines, ours:<recall%>, bob:<recall%>, naive:<recall%> }
    """
    buckets = []
    for label, _lines, codes in BUCKET_DEFS:
        display_lines = MEDIUM_LABEL if label == "Medium" else _lines
        row = {"size": label, "lines": display_lines}
        for rev in REVIEWERS:
            pr_recall = metrics_by_reviewer[rev]["pr_recall"]
            caught_total  = 0
            planted_total = 0
            for pr_data in pr_recall.values():
                if pr_data["size"] in codes:
                    caught_total  += pr_data["caught"]
                    planted_total += pr_data["planted"]
            row[rev] = round(100 * caught_total / planted_total) if planted_total else None
            row["_planted"] = planted_total
        # A bucket with no PR in scope is unmeasured; drop it rather than plot 0%.
        if row.pop("_planted", 0):
            buckets.append(row)
    return buckets


# ---------------------------------------------------------------------------
# Build the prs[] array (ours run only, per dashboard spec)
# ---------------------------------------------------------------------------

def build_prs(answer_key):
    """
    Build the prs array from ground truth + ours findings.
    Clean PRs: categories=[], planted=0, findings=[].
    """
    prs_out = []
    for pr_num in sorted(k for k in answer_key["prs"] if k in SCOPE):
        pr_data  = answer_key["prs"][pr_num]
        planted  = pr_data.get("planted", [])
        is_clean = pr_data.get("clean", False)
        findings = load_run("ours", pr_num)

        matched_idxs, caught_ids = match_findings(findings, planted)

        # Distinct categories from planted issues
        categories = sorted({p["category"] for p in planted}) if not is_clean else []

        # Only proven (test_status=="FAIL") findings in the display list
        display_findings = []
        for idx, f in enumerate(findings):
            if f.get("test_status") != "FAIL":
                continue
            display_findings.append({
                "id":       f.get("id", ""),
                "category": f.get("category", ""),
                "severity": f.get("severity", ""),
                "claim":    f.get("claim", ""),
                "file":     f.get("file", ""),
                "line":     f.get("line", 0),
                "test":     f.get("test_file", ""),
                "code":     "",   # test source not stored in run file
                "fail":     f.get("test_output", ""),
                "fix":      f.get("fix_diff", None),
            })

        prs_out.append({
            "pr":         pr_num,
            "title":      pr_data.get("title", ""),
            "desc":       pr_data.get("desc", ""),
            "size":       pr_data.get("size", ""),
            "clean":      is_clean,
            "categories": categories,
            "planted":    len(planted),
            "found":      len(caught_ids),
            "findings":   display_findings,
        })

    return prs_out


# ---------------------------------------------------------------------------
# Write reviewboard/data.js
# ---------------------------------------------------------------------------

def write_data_js(answer_key, metrics_by_reviewer):
    def strip_internal(m):
        """Remove internal-only keys before export."""
        return {k: v for k, v in m.items() if k not in ("w_recall", "pr_recall")}

    obj = {
        "leaderboard": {
            "ours":  strip_internal(metrics_by_reviewer["ours"]),
            "naive": {k: v for k, v in strip_internal(metrics_by_reviewer["naive"]).items()
                      if k != "noise"},
        },
        "sizeBuckets": size_buckets(metrics_by_reviewer),
        "prs":         build_prs(answer_key),
    }

    js = "const DATA = " + json.dumps(obj, indent=2) + ";\n"
    js += f'DATA.repo = "{answer_key["repo"]}";\n'

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as fh:
        fh.write(js)

    print(f"Wrote {OUT_PATH}")


# ---------------------------------------------------------------------------
# Console leaderboard table
# ---------------------------------------------------------------------------

def print_leaderboard(metrics_by_reviewer):
    cols = ["recall", "precision", "trust", "false_alarms", "noise", "w_recall"]
    w    = 13
    header = f"{'reviewer':<10}" + "".join(f"{c:>{w}}" for c in cols)
    sep    = "-" * len(header)
    print()
    print("=== Leaderboard ===")
    print(sep)
    print(header)
    print(sep)
    for rev in REVIEWERS:
        m   = metrics_by_reviewer[rev]
        row = f"{rev:<10}" + "".join(f"{('n/a' if m[c] is None else m[c]):>{w}}" for c in cols)
        print(row)
    print(sep)
    print("  recall/precision/trust = %, false_alarms = count, noise = FP/clean PR, w_recall = severity-weighted recall %")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not os.path.exists(ANSWER_KEY):
        sys.exit(f"ERROR: answer key not found at {ANSWER_KEY}")

    answer_key = load_json(ANSWER_KEY)

    metrics_by_reviewer = {}
    for rev in REVIEWERS:
        metrics_by_reviewer[rev] = compute_metrics(answer_key, rev)

    print_leaderboard(metrics_by_reviewer)
    write_data_js(answer_key, metrics_by_reviewer)


if __name__ == "__main__":
    main()
