# 01 — Context Gather

Before dispatching any reviewer subagent, collect all PR context into the current
conversation. Complete every step below before moving on.

## Steps

1. **Git diff** — run the following command and hold the output in context:
   ```
   git diff main...HEAD
   ```

2. **Ticket** — read the ticket file supplied by the user (typically passed as an
   `@mention` or a file path argument). Accepted formats: plain text, Markdown, PDF,
   DOCX. Use `read_file` for on-disk files; PDF and DOCX text is extracted
   automatically.

3. **Spec** — read `SPEC.md` from the repo root with `read_file`.

4. **Style guide** — read `STYLE_GUIDE.md` from the repo root with `read_file`.

## Output

Hold all four artefacts (diff, ticket, spec, style guide) in the orchestrator context.
They will be forwarded to the reviewer subagents via `fork_context: true`.

Do not begin Step 2 (dispatch) until all four reads succeed.
