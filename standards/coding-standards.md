# Team Coding Standards

> This file is injected into every AI review as context. Edit it to match your
> team's real conventions — the bot will enforce whatever you put here.

## General
- Prefer clear, descriptive names over comments. Avoid abbreviations.
- Keep functions small and single-purpose.
- No commented-out / dead code in PRs.
- No `console.log` left in production code paths (use the logger).

## Error handling
- Every I/O, network, file, or JSON-parse call must handle failure.
- Always `await` promises or handle them explicitly — no floating promises.
- Never swallow errors silently; log with enough context to debug.

## Security
- No hardcoded secrets, API keys, tokens, or passwords. Use environment variables.
- Validate and sanitize all external/user input.
- Use parameterized queries — never build SQL by string concatenation.
- Avoid `eval`, `child_process` with unsanitized input, and unsafe deserialization.

## JavaScript / TypeScript
- Use `const`/`let`, never `var`.
- Use strict equality (`===` / `!==`).
- Prefer async/await over raw `.then()` chains.
- Handle `null`/`undefined` explicitly before dereferencing.

## Testing
- New features and bug fixes should include tests.
- Tests live alongside code (`*.test.js`) or under `tests/` / `__tests__/`.

## Git / Process
- Branch names must include the Jira ticket id, e.g. `feature/PROJ-42-short-desc`.
- Keep PRs focused and reasonably small.
