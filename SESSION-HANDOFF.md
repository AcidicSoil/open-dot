# Open Dot implementation session handoff

Session dates: October 15–16, 2026. This records the work and decisions from the conversation, including mistakes and recovery. Verification results are observations from this session, not promises about later state.

## Requested outcome and scope

The user supplied `open-dot-windows-wsl-spec.md` and requested Stage 1, subscription proof. Later Windows, WSL, packaging, native-control, durable-job, and voice stages remain gated. The user invoked astra-orchestrator and poteto-mode. The specification prohibits new test files, fixtures, and test-only helpers without approval. Verification therefore used existing checks, inline assertions, the real app, and public server routes.

The user later requested lower allowance consumption, current efficient models instead of older preferred defaults, a server restart, durable storage, and preservation of all setup progress.

## Implementation completed

- Added documented public ChatGPT OAuth sign-in with PKCE, state, nonce, dynamic registration, a stable host ID, loopback callback, and signed identity validation.
- Stored account credentials in the existing encrypted vault. Added refresh coordination, sign-out handling, account-specific cancellation, and usage-limit blocking.
- Added account model discovery and account-qualified model references in the form `chatgpt:<registration-id>:<model-slug>`.
- Separated provider identity and capabilities. ChatGPT Responses requests stream with `store:false` and replay locally persisted history, including encrypted reasoning and namespaced function calls.
- Bound conversations to their provider, account registration, and model. Updated main turns, approval continuation, review, titles, inter-dot consultation, queued work, routines, channels, and triggers to respect that binding.
- Added additive SQLite migration for provider binding. Ambiguous older histories remain readable but require a new chat rather than guessing a provider.
- Added ChatGPT account controls and account-labelled models to Settings and ModelPicker.
- Kept subscription native computer tools, hosted search, and voice explicitly disabled. Browser page function tools remain available. Voice requires a separately configured OpenAI API key.
- Preserved explicitly configured API providers. Subscription requests do not automatically fall back to paid providers.

Primary implementation files include `src/server/agent/chatgpt.ts`, `client.ts`, `runtime.ts`, `inference.ts`, `usage.ts`, `review.ts`, `src/server/titles.ts`, `db.ts`, `repo.ts`, `snapshot.ts`, `src/app/actions.ts`, SettingsView, ModelPicker, and related state types and callers. Inspect the working-tree diff for the exact current change set. Work was not committed or published during this conversation.

## Live verification and fixes it exposed

1. The assistant started an isolated acceptance server on port 3199 using `/tmp/open-dot-stage-one-acceptance`. Provider environment variables were initially removed from its launch command. Later startup showed that Next also loads repository environment files, so removing shell variables alone does not establish absence of configured keys.
2. Sign-in launch, PKCE parameters, invalid-state rejection, denied consent, invalid issued client ID rejection, and additive migration were checked through public app seams.
3. The user completed authorized sign-in. Several earlier attempts failed or expired. OpenAI twice displayed “Agent registration session changed; restart sign-in.” A later attempt succeeded without a confirmed code change for that upstream error. Do not claim a proven cause or fix for it.
4. Seven account models were discovered. GPT-6.1-Sol returned `SUBSCRIPTION_OK` in a real streamed request.
5. The first browser request silently ended. Real completion events had empty `output` even though output items arrived in the stream. Runtime and auxiliary inference now collect `response.output_item.done` items by `output_index`, preserving id-less function calls and response ordering.
6. After that fix, the app executed `open_url` and `read_page` on `https://example.com` and returned “Example Domain.” Local replay retained the namespaced calls and outputs.
7. A denial card continued with a refusal, and `denied-check.txt` was absent. An approved card eventually created `approval-check.txt` with exact contents `approved`. File effects were checked directly.
8. An earlier approval continuation returned HTTP 503 twice. Review found that tool outputs were previously saved only after subsequent inference succeeded. The fix persists stateless request input before the network request and clears consumed pending state. An inline check against the actual `respond` function simulated a 503 and verified that the result survived once without stale pending state.
9. Account, conversation, and browser-tool continuation worked after a server restart. A later explicit memory-recall request after another restart hit the account usage limit, so that particular recall request did not produce an answer.
10. The real account returned `subscription_sharing_usage_limit_exceeded`. The SDK threw that SSE error before the normal event switch. Runtime and auxiliary inference now record recognized usage errors from SDK exceptions and raw stream events. The next real request stopped locally with “ChatGPT usage limit reached. Requests are paused.” No paid fallback was observed for these subscription requests.

Production builds, TypeScript, and diff whitespace checks passed after the fixes. Lint reported zero errors and eight existing warnings, four inside a nested worktree. Independent reviewers reported no remaining material findings in their scoped final checks. Review does not replace the incomplete acceptance scenarios below.

## Allowance-conservation decision

The user chose “Conserve allowance” and requested current token-efficient models rather than a preference for older models. The assistant had used a full model for titles and multiple live tool checks before configuring usage. Those calls consumed allowance. The exact reason the account exhausted its allowance so quickly was not measured and must not be stated as proven.

`DOTS_CHATGPT_USAGE=conserve` is configured in `.env.local` and documented in `.env.example` and README. For ChatGPT requests it applies low reasoning effort, a 2,048-token output cap, an eight-response-step limit, and local conversation titles that do not call a model. Other providers retain their own behavior. Full ChatGPT replay history is preserved.

Conserve automatic selection prefers an offered lightweight model within the newest GPT major generation. The actual catalog offered GPT-6-Luna, which was selected for new chats. Existing conversations keep their original models. This is a model-family policy, not a measured price or quota comparison. Low reasoning and output caps can reduce answer depth or produce incomplete responses. Longer tool tasks may require continuation.

Configuration verification used inline checks and builds without further inference. Metadata-only model discovery can operate while an account is usage-blocked. This does not unblock inference. A separate API-provider bug remains: a failed model-list request can substitute hard-coded model names, making the picker misleading. The invalid API key did not successfully fetch those fallback models.

## Browser and sign-in workflow

The assistant initially asked the user to sign in through the in-app browser. The user asked about PPM, meaning PinchTab Profile Manager. The assistant created and launched a dedicated `open-dot` profile, then the user chose to continue in the in-app browser. The profile may still exist and needs lifecycle review before cleanup. Do not copy authentication out of unrelated browser profiles.

The user subsequently signed in with Composio on the dev instance. That sign-in was preserved during data reconciliation and its Refresh action completed successfully. The Settings view reported signed in with zero connected downstream apps at verification time. Composio account sign-in and individual app connections are distinct.

## Storage mistake and recovery

The assistant kept the acceptance data under `/tmp` after real account sign-in. This was a mistake for continued use. The assistant initially copied it to durable storage and updated `.env.local`, but failed to verify port 3100 immediately. It also incorrectly told the user that the already-running dev server was using the new location.

Inspection established that port 3100 still held `/home/user/tools/open-dot/.data/dots.db`, while port 3199 held `/home/user/.local/share/open-dot/dots.db`. The dev database had no chats but contained newer sign-ins and settings. The permanent database contained one dot, two conversations, and 28 messages. A globally cached SQLite connection surviving dev hot reload is consistent with the evidence: the dev database used the older path, while its credentials authenticated with the permanent vault key and there was no `.data/vault.key`. This mechanism was inferred, not instrumented during the original change.

The assistant stopped both database writers and created complete directory snapshots plus integrity-checked SQLite backups at:

`/home/user/.local/share/open-dot-backups/20261016-075653/dev`

`/home/user/.local/share/open-dot-backups/20261016-075653/setup`

All dev settings were merged atomically into the permanent database. The latest complete Composio OAuth object, trigger identity, and E2B setting were preserved. ChatGPT registrations were unioned by ID. The existing default model and all original message rows remained intact. Ciphertexts were authenticated without printing secrets. The permanent vault key was not replaced.

Port 3100 was restarted on the permanent directory. Verification showed only that database open by the running Next server. The public conversation routes returned 15 and 13 messages, and Settings displayed both chats, both ChatGPT registrations, GPT-6-Luna, and the preserved Composio sign-in. Composio Refresh completed without an error. No inference was sent during reconciliation. Both original folders and backups were retained. No implementation changes were reverted.

## Current operational setup

Run from `/home/user/tools/open-dot`:

```bash
pnpm dev
```

Open `http://localhost:3100`.

Local `.env.local` configuration includes:

```dotenv
DOTS_DATA_DIR=/home/user/.local/share/open-dot
DOTS_CHATGPT_USAGE=conserve
```

Do not add the earlier `/tmp` override. Fully restart the server after changing the data directory. Hot reload does not replace an existing global database connection. Port 3199 was stopped during reconciliation. Development changes are in the repository working tree, while application records live in the permanent data directory.

The setup dot is `dot_47b404243c3f48c6`. Its conversations are `conv_21ac669a52f74f00` and `conv_fd137c6420004598`.

## Cleanup and unfinished work

- [x] Resolve duplicate account presentation without consolidating credentials. The two Settings entries came from repeated sign-ins and merging the dev and setup databases. They are not two subscriptions. Preserve or migrate conversation, default-model, and dot references before removing a registration. Do not revoke either registration as a casual duplicate cleanup.
- [x] Fix API model-list failures being presented as hard-coded available models. Report the provider error and preserve genuine subscription discovery independently. Do not remove user environment keys without checking their intended use.
- [x] Make storage configuration changes in development fail clearly or require restart, so a cached database cannot silently keep the previous directory.
- [ ] Reconcile PPM profile and server configuration with the single canonical port and data directory. Inspect ownership before stopping or removing anything.
- [ ] Verify actual token expiry and refresh. Stage 1 is still incomplete until remaining acceptance gates pass.
- [x] Verify eight-step tool continuation with the actual runtime and simulated provider, runtime reload, and 503. Real provider/OS-crash acceptance remains separate.
- [ ] Reassess usage after allowance recovery with a minimal authorized check. Do not run inference merely to validate configuration.
- [ ] Keep Stage 2–7 work out of this change until explicitly requested and gated by the specification.
- [ ] Review the final repository diff and user changes before committing or publishing. Preserve `.gitignore`, AGENTS.md, CLAUDE.md, `.agents/`, the supplied spec, and all unrelated work.
- [ ] Retain backups until reconciliation and any registration migration have been verified. Do not delete `.data`, `/tmp` data, or backups based only on this checklist.

## Supporting records

- `.audit/stage-one-acceptance.md` records Stage 1 verification and limitations.
- `.audit/stage-one.todo.md` and `.audit/stage-one.tsv` track the original implementation work.
- `.audit/usage-configuration.todo.md` records conservation configuration.
- `.audit/data-reconciliation.md` records the database merge and recovery locations.

Some older audit entries describe earlier states. Use this session handoff for the overall chronology and the latest recorded storage state. Recheck the running process and database before a future migration.

## Worktree cleanup on October 16

The active implementation checkout is `/home/user/tools/open-dot` on `main`. Implementation changes remain uncommitted there. The unused `.worktrees/subscription-stage-one` checkout was on `codex/subscription-stage-one`, at the original baseline commit. It had no tracked changes, no untracked work, and no unique commits. Its only ignored entry was a node_modules symlink to the main checkout.

At the user’s request, the unused worktree was removed with `git worktree remove`, its fully contained branch was deleted with `git branch -d`, and `git worktree prune` was run. No main-checkout implementation changes, dependencies, application data, or backups were removed. The earlier unchecked worktree-cleanup concern is resolved.

## Stage 1 review fixes, October 16

Completed read-only vault error reporting, HTTP 401 transition to reauthentication, schema version 2 legacy-binding repair, and cached database/vault directory guards requiring restart. Existing chats now expose and display their bound model; the picker is labelled for new chats. Settings groups matching account email labels while retaining both OAuth connections and their controls. Live evidence showed distinct subject IDs for the two registrations but identical email labels; grouping is presentation only and never merges credentials or bindings. API model discovery no longer invents available models on failure; conserve mode retains a subscription model even for non-GPT catalog slugs.

Verified actual migration code with in-memory SQLite, existing binding preservation and cache-directory rejection. Isolated execution of actual auth source verified unreadable-vault reads, fail-closed mutation, concurrent refresh single-flight, rotated token persistence, and rejection of further calls after 401. Actual runtime turn/drive/respond executed eight mock tools, reloaded runtime context, handled a simulated 503, reloaded and continued with all eight outputs exactly once and no repeated execution. These are isolated behavioral checks, not real provider expiry or OS-crash acceptance.

Production build passed. The live dev server was restarted on port 3100 with canonical storage and still serves two chats and all 28 messages. Server rendering of the actual Settings component using the live snapshot confirms one account heading and two preserved connection controls. Browser visual verification was blocked by the browser tool policy. No live inference was sent and no credential, registration, chat, or backup was removed. Real token expiry/refresh against OpenAI remains an external acceptance check; do not describe it as verified.
