<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN ASTRA ORCHESTRATOR MANAGED BLOCK -->
# Codex project instructions

> **Fork adapter disclaimer:** This file is the preserved Codex-native instruction surface. When running Claude Code in this fork, `CLAUDE.md` and `.claude/` are authoritative; translate the behavioral intent instead of executing Codex-only syntax or model settings literally.

When the installer appends this orchestration block to an existing `AGENTS.md`, keep the project's existing instructions. This block owns orchestration behavior only.

For complex coding tasks, use the `astra-orchestrator` skill when its trigger conditions match.

The root agent owns architecture, decomposition, integration, and final verification.
Prefer specialized subagents for bounded exploration, implementation, testing, review, and technical research.

Do not delegate trivial work merely for parallelism.
Do not let multiple implementation agents edit the same files without explicit ownership boundaries.
User instructions always take precedence over this orchestration policy.

## Upstream synchronization

This repository is a private standalone adaptation of `donvito/codex-astra-luna-orchestrator`, not a GitHub-native fork. When updating from the public upstream repository, follow [`guides/upstream-sync.md`](guides/upstream-sync.md). Treat the private repository as `origin` and the public source as read-only `upstream`; never hard-reset private `main` to upstream or push private changes to upstream.

## Post-merge housekeeping

After an implementation branch is confirmed merged, remove repository-owned implementation worktrees, run `git worktree prune`, delete the merged local feature branch with `git branch -d`, and delete the matching remote fork branch when it is no longer needed. Never delete the default branch, active branch, unmerged work, or a worktree containing uncommitted/untracked files. Preserve branches/worktrees for open PRs until merge is confirmed.
<!-- END ASTRA ORCHESTRATOR MANAGED BLOCK -->
