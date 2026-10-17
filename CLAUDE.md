@AGENTS.md

<!-- BEGIN ASTRA ORCHESTRATOR MANAGED BLOCK -->
# Claude Code project instructions

> **CRITICAL — fork adapter notice:** This is an unofficial Claude Code + CLIProxyAPI adaptation of the upstream Codex project. Do not equate the Claude Code `opus` family alias with Astra. In this environment, the user-level `opus` default resolves to `claude-opus-4-8`, and CLIProxyAPI maps `claude-opus-4-8` to GPT-5.6 Luna. Astra is exposed through the separate client-visible route `claude-opus-5`, which CLIProxyAPI maps to GPT-6 Astra. This project pins concrete `claude-*` route IDs and does not redefine the user's `opus`, `sonnet`, or `haiku` family defaults.

This file is the project `CLAUDE.md`: the persistent project-instruction surface Claude Code loads for this repository. The preserved `AGENTS.md`, `.codex/`, `.agents/`, and Codex-oriented guides remain useful upstream reference material, but `.claude/` and this file are authoritative when running Claude Code.

When installed into an existing project, this orchestration block owns only model routing, delegation, verification, and post-merge housekeeping. Existing project instructions outside the managed block remain in force for project-specific architecture, commands, conventions, and workflows.

## Active model contract

| Claude Code role | pinned Claude-compatible route | CLIProxyAPI backing model | `effort` |
|---|---|---|---|
| root / orchestrator | `claude-opus-5` | `gpt-6-astra` | project `effortLevel: low` |
| explorer | `claude-sonnet-4-6` | `gpt-5.6-luna` | `low` |
| worker | `claude-sonnet-4-6` | `gpt-5.6-luna` | `low` |
| tester | `claude-sonnet-4-6` | `gpt-5.6-luna` | `low` |
| researcher | `claude-sonnet-4-6` | `gpt-5.6-luna` | `low` |
| reviewer | `claude-opus-5` | `gpt-6-astra` | `low` |

The user-level Claude family defaults are separate from this project contract. In the current environment, `opus` resolves to `claude-opus-4-8` and therefore reaches Luna, `sonnet` resolves to `claude-sonnet-4-6` and reaches Luna, and `haiku` resolves to `claude-haiku-4-5-20251001` and reaches Luna. The reserved Astra route is `claude-opus-5`.

`.claude/settings.json` sets `ANTHROPIC_BASE_URL`, pins the root to `claude-opus-5`, sets `CLAUDE_CODE_SUBAGENT_MODEL` to `claude-sonnet-4-6`, and configures concurrency, depth, root effort, permissions, and sandbox behavior. It does not set `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, or `ANTHROPIC_DEFAULT_HAIKU_MODEL`. Those remain user-level defaults. Authentication stays user-local.

## Native Claude Code feature map

Use these exact Claude Code concepts when adapting upstream behavior:

| Upstream concept | Claude Code native equivalent |
|---|---|
| project agent instructions | project `CLAUDE.md` |
| project configuration | shared project `.claude/settings.json` |
| named agent profiles | project subagents in `.claude/agents/*.md` |
| role model | subagent frontmatter `model` |
| role reasoning effort | subagent frontmatter `effort` |
| role tool access | `tools` and `disallowedTools` |
| spawn a named subagent | `Agent` tool with `subagent_type` |
| retain a spawned task identifier | retain the returned agent ID and/or assign `name` in the `Agent` call |
| continue or steer an existing subagent | `SendMessage` with the agent ID or name |
| parallel independent subagents | concurrent/background `Agent` calls |
| subagent concurrency cap | `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` |
| prohibit nested worker delegation | `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` and role tool restrictions |
| reusable orchestration workflow | project Skill at `.claude/skills/astra-orchestrator/SKILL.md` |

## Operating rules

- Preserve upstream orchestration behavior using the native feature map above; do not emulate Codex commands in prose when Claude Code has a direct feature.
- For a delegated task, call the `Agent` tool with the appropriate `subagent_type`: `astra-explorer`, `astra-worker`, `astra-tester`, `astra-researcher`, or `astra-reviewer`.
- Do not pass raw `gpt-*` backend model IDs in an `Agent` call. Project subagent definitions pin the client-visible CLIProxyAPI routes `claude-opus-5` or `claude-sonnet-4-6`; CLIProxyAPI maps those route IDs to Astra or Luna.
- Use `SendMessage` when an existing named/identified subagent needs follow-up work or should resume with its prior context; do not start a duplicate agent merely to continue the same task.
- Use parallel/background subagents only for independent scopes. Keep one writer per file or subsystem unless ownership is explicitly coordinated.
- The root owns architecture, decomposition, integration, conflict resolution, final diff review, and final verification.
- Use the `astra-orchestrator` Skill for non-trivial work. Do not delegate trivial work solely to demonstrate orchestration.
- Explorer, researcher, and reviewer roles omit native edit/write tools, while worker and tester roles include them. Bash can still write files, subject to the active user or project permission policy. This adapter does not set approval or sandbox policy.
- If CLIProxyAPI is unavailable or rejects a mapped provider model identifier, report a gateway/configuration failure. Do not silently fall back to another provider or model.
- Never expose or commit API keys, auth tokens, or other user-local gateway secrets.


## Post-merge housekeeping

After an implementation branch is confirmed merged into the default branch:

- remove any repository-owned implementation worktree and run `git worktree prune`
- delete the merged local feature branch with `git branch -d`
- delete the matching remote feature branch from this fork when it is no longer needed
- never delete the default branch, the active branch, unmerged work, or a worktree containing uncommitted/untracked files
- preserve branches and worktrees for open pull requests until the merge is confirmed
- finish by verifying the default branch is current and the repository is clean

Do not use force deletion as routine housekeeping. If safe cleanup is blocked, report the blocker instead.

## Official Claude Code references used for this adapter

- Project instructions / `CLAUDE.md`: https://code.claude.com/docs/en/memory
- Shared project settings: https://code.claude.com/docs/en/settings
- Project subagents, `Agent`, `SendMessage`, frontmatter, concurrency: https://code.claude.com/docs/en/sub-agents
- Project Skills: https://code.claude.com/docs/en/skills
- Model aliases and provider model mappings: https://code.claude.com/docs/en/model-config
<!-- END ASTRA ORCHESTRATOR MANAGED BLOCK -->
