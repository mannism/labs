# PR Comprehension Gate

All PRs must answer these questions before merge. Include answers as a numbered list in the PR description.

## Core Questions (required on every PR)

1. **What does this change do in one sentence?**
2. **What fails silently?** — Identify swallowed errors, empty catches, fire-and-forget patterns.
3. **What's the blast radius?** — If this code has a bug, what else breaks?

## Extended Questions (required — Labs is a large project)

4. **Why this dependency?** — Every new import/package must have a stated reason.
5. **What's cached and why?** — Cache layers, TTLs, invalidation strategy.
6. **How are concerns separated?** — Business logic mixed with UI or data access?
7. **What are the failure modes?** — For external calls: what happens on timeout, 429, 500?

## Application

- Agent-generated PRs: agent includes answers in the PR description.
- Unanswered questions block merge.
