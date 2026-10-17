# Open Dot — Windows and WSL specification

Status: ready-for-agent (Stage 1); subsequent stages gated by the acceptance criteria below.
Date: 2026-10-15
Repository: https://github.com/AcidicSoil/open-dot
Inspected baseline: f838e17cf5c3a88ade5ceea54680a8145d048c1d
Scope: implementation specification; no application code has been changed or executed on the target machine.

## 1. Problem and intended outcome

Open Dot provides persistent personal agents, browser control, connected applications, rules, files, memory, skills, routines, and voice. Its desktop packaging and several host integrations assume macOS. It currently requires provider API keys rather than offering ChatGPT subscription authentication.

Deliver a Windows 11 desktop application that preserves those workflows, supports explicitly selected WSL2 Linux execution, and uses eligible ChatGPT Plus inference through the documented open-source sign-in flow. The application must show its actual capabilities and execution location. A successful installer launch alone does not establish functional parity.

The architecture below formalizes the preceding plan. Product defaults introduced to make implementation deterministic are specified here; they are not represented as previously user-approved implementation details.

## 2. Scope and release boundaries

### Required release scope

- Windows x64 Electron application, local server, tray lifecycle, and optional startup at sign-in.
- ChatGPT sign-in and verified subscription inference; preserve existing explicitly configured API-key providers.
- Persistent per-dot browser sessions, live view, human takeover, and hand-back.
- Explicit Windows host, WSL host, and Docker execution targets.
- File creation, browsing, sharing, and download across supported execution targets.
- Existing conversations, channels, memory, skills, rules, inter-dot handoffs, and connected-app flows.
- Durable job state, schedule recovery, cancellation, and approval persistence.
- Windows native application control through a separately scoped helper.
- Voice capability assessment and verification of the existing API-key voice path on Windows.

### Explicitly out of scope

- Reproducing every proprietary OpenAI Dots feature.
- Using private ChatGPT application binaries, extracting another application's credentials, or using undocumented backend endpoints.
- A new UI framework, visual redesign, or replacement of the existing agent engine.
- Autonomous work while the Windows host is asleep or off. An always-on remote agent worker is a later deployment scope.
- General-purpose Linux desktop automation, ARM64 packaging, or a Linux desktop installer.
- Guaranteed control of elevated applications, UAC secure desktops, locked desktops, or every third-party application.
- Mandatory paid cloud services, automatic paid provider fallback, or purchasing services.
- A new speech engine merely to provide subscription-only voice.
- Replacing Composio or adopting additional browser frameworks during this port.
- New test files, fixtures, or test-only helpers without explicit user approval.

macOS behavior must not be intentionally removed, but a fresh macOS release is not a Windows acceptance requirement.

## 3. Evidence and existing integration seams

The source was inspected through GitHub, including the application modules and repository AGENTS.md. That file requires reading the installed Next.js documentation before implementation. The user's separate local instruction paths were unavailable in this environment and must be read when implementing on that machine.

| Existing seam | Observed behavior | Specification consequence |
|---|---|---|
| electron/main.mjs | Spawns the standalone server; restores Unix login PATH; keeps the window hidden only on macOS | Preserve server ownership; add Windows lifecycle and environment handling |
| package.json and scripts/desktop-*.mjs | macOS-only target; Unix cp/find and environment assignment | Portable preparation and a Windows packaging target |
| agent/client.ts and runtime.ts | Responses API; provider-specific history and tool behavior coupled through stateless | Separate provider identity, history policy, and feature capabilities |
| agent/tools.ts | Shared tool registry and rule/approval integration | Route all new host capabilities through this seam |
| computer/index.ts and shell.ts | Cloud, Docker, and local modes; dynamic Docker fallback to Bash | Pin targets and stop on loss of the selected target |
| computer/browser.ts | Persistent Playwright profiles, CDP stream, Unix lock cleanup | Preserve behavior; implement platform-correct process recovery |
| computer/sky.ts and snapshot.ts | Sky installation is detected; execution is not connected to the agent tool registry | Treat native control as new integration, not established parity |
| vault.ts | AES-GCM with macOS Keychain or a plaintext master-key file | Add Windows-protected key storage and migration |
| db.ts and repo.ts | SQLite WAL, additive migrations, conversations/history/pending fields | Extend existing persistence instead of adding another database |
| scheduler.ts and boot.ts | In-memory cron; restart resets working status | Persist work and recover deliberately |
| voice.ts | OpenAI Realtime with API-key availability checks | Subscription Responses access does not prove voice access |

The repository has lint/build commands but no test command or test files in the inspected tree. Acceptance will use direct public-flow checks unless new tests are separately approved.

## 4. User stories

1. As a Windows user, I want to install and open the app without development tools, so that I can use my dots normally.
2. As a user, I want to sign in with ChatGPT, so that eligible requests use my existing plan.
3. As a user, I want to see whether my account can complete a request, so that sign-in success is not confused with usable access.
4. As a user, I want expired sessions to renew or request sign-in clearly, so that work does not fail silently.
5. As a user, I want usage limits to pause work without switching billing methods, so that I control spending.
6. As a user, I want to select a supported model, so that my choice reflects the active account.
7. As a user, I want to retain chats, memories, skills, channels, and instructions after restart, so that work remains continuous.
8. As a user, I want to create, pause, resume, and delete dots, so that I control their lifecycle.
9. As a user, I want each dot to retain its own website logins, so that accounts remain separated.
10. As a user, I want to watch browsing and temporarily take control, so that I can complete sign-in and other manual steps.
11. As a user, I want my dot to wait while I control its browser, so that our actions do not conflict.
12. As a user, I want to choose Windows, a Linux environment, or a container for a command, so that it runs in the intended place.
13. As a user, I want unavailable execution environments to stop work clearly, so that commands never move silently to my host.
14. As a user, I want to create and retrieve files from a dot's workspace, so that its outputs are usable.
15. As a user, I want to approve or deny consequential actions and retain that decision across restart, so that permissions remain meaningful.
16. As a user, I want a stop control to halt active work, so that I can interrupt mistakes.
17. As a user, I want connected applications to retain their own authorization, so that ChatGPT sign-in does not imply unrelated access.
18. As a user, I want routines to run with the window closed while my computer is awake, so that I do not need to keep the app visible.
19. As a user, I want missed schedules and interrupted jobs to be shown and handled consistently, so that I know what happened.
20. As a user, I want trigger deliveries to avoid duplicate work, so that repeated events do not repeat external actions.
21. As a user, I want notifications to reopen the relevant conversation, so that I can respond to results and approvals.
22. As a user, I want optional startup at sign-in and an explicit Quit command, so that background behavior stays under my control.
23. As a user, I want to grant access to specific Windows applications, so that my dot can help with desktop tasks.
24. As a user, I want dots to take turns controlling the desktop, so that they do not fight over focus or typing.
25. As a user, I want unsupported or inaccessible windows to be identified, so that the app does not report actions it could not perform.
26. As a user, I want secrets kept out of chat and model inputs, so that account access stays private.
27. As a user, I want existing data and credentials preserved during upgrades, so that an update does not erase my work.
28. As a user, I want to see whether voice is available and which provider it uses, so that I understand its requirements.
29. As a user, I want tasks requested during a voice call to continue after the call ends, so that voice retains the existing workflow.
30. As a developer, I want to run the application from WSL and open it in Windows, so that my existing development workflow remains useful.

## 5. Architecture decisions and contracts

### 5.1 Process ownership

Windows Electron owns the packaged Next.js server, credential broker, and native automation helper. The server owns agent orchestration, SQLite, browser sessions, and execution adapters. The UI must not receive raw credentials.

Production data has one canonical Windows application-data location. WSL processes must not open the Windows SQLite database directly. Development mode retains its own data directory and must not concurrently use production data.

Use existing server actions, event streaming, and API routes where practical. Do not introduce a second public HTTP service for the Windows helper. Prefer structured child-process communication. Authenticate any local HTTP bridge, restrict its origin and host checks, and keep it off public interfaces.

### 5.2 Model provider contract

Represent provider identity, authentication state, model selection, history policy, and supported features independently.

Each provider exposes:
- Authentication readiness and actionable failure state.
- Model catalog with stable identifier, display name, and account association.
- Streaming inference with terminal completed, failed, incomplete, and cancelled outcomes.
- Capabilities for function tools, image inputs, computer actions, search, and voice.
- History policy and credential-refresh behavior.

ChatGPT subscription authentication uses the documented public-client authorization flow, PKCE, state and nonce validation, approved callback handling, and encrypted credentials. Complete sign-out removes local credentials and prevents queued work from using that account.

Subscription requests use the documented public Responses endpoint, store=false and stream=true. This applies to main turns, rule review, titles, and inter-dot consultation. Persist complete replayable function-call/result history locally. Do not reuse server-side response IDs as the only conversation state.

Refresh account models after sign-in or account change. A catalog entry is not proof of successful inference. Do not automatically move an existing conversation to a different provider or paid account after a failure.

Capability discovery must not infer computer-tool availability solely from model-name regexes. Unsupported optional tools must be excluded from requests and represented accurately in the UI. Use existing page tools when available; do not claim equivalent visual capability without verifying it.

### 5.3 Execution target contract

A run records its selected target at creation. Target resolution returns kind, host platform, selected WSL distribution when applicable, workspace identity, shell, and isolation classification.

Command execution receives the run identity, target identity, command, working directory, timeout, and cancellation signal. It returns exit status, bounded stdout/stderr, and explicit cancelled, timed-out, unavailable, or failed states.

- Windows host: explicit PowerShell execution; never assume Bash exists.
- WSL host: invoke the chosen distribution explicitly through wsl.exe; avoid accidental selection of the default distribution.
- Docker: require a healthy daemon and the selected container/workspace.
- Existing cloud: preserve the adapter as an optional configured target.

Host execution, including ordinary WSL host execution, is not a sandbox. Apply the existing host-access permission and approval rules. Docker failure must not redirect execution to either host.

Cancellation must stop owned descendant work and report any failure to stop. Never terminate unrelated user processes. Remove synchronous health probes from latency-sensitive paths when changing those paths.

### 5.4 Files and workspace contract

Keep a logical workspace-relative path separate from its physical Windows, WSL, container, or cloud representation. Only target adapters resolve physical paths.

Reject traversal, drive changes, UNC escapes, sibling-prefix matches, and symlink/junction escapes outside the granted root. For new files, validate the existing parent chain before creation. Transfers between Windows and WSL use an explicit adapter operation; do not concatenate Windows paths into shell strings.

Preserve existing file metadata and share/download routes. Closing or resetting a computer must not silently delete user deliverables; deletion follows the existing explicit dot deletion flow.

### 5.5 Credential contract

Keep AES-GCM application encryption. Protect its master key with Windows-backed credential protection through Electron. The server accesses encryption/decryption through a narrow authenticated broker; renderer code never receives the master key.

Migrate an existing file-based key by protecting the same key before changing its storage reference. Verify decryption before retiring the old copy. If the key cannot be opened, report a locked vault rather than generate a replacement over existing data.

Redact provider tokens and passwords from logs, errors, events, and tool output. Preserve direct credential filling into website fields. Avoid capturing exposed secret values in screenshots sent to models.

### 5.6 Browser and native desktop control

Retain Playwright, separate dot profiles, screenshots, CDP streaming, and current input routes. Track owned browser processes and profile ownership explicitly; do not trust a stale PID alone.

Takeover establishes a control lease: while the human owns it, agent input is suspended. Hand-back releases the lease and refreshes observed state. Stop and shutdown release sessions without killing unrelated Chrome instances.

The Windows helper provides capability discovery, window enumeration, element inspection, supported UI Automation actions, screenshots, coordinate input, and cancellation. Implementation language is not prescribed; the structured contract is.

Requests carry run ID, target application/window identity, action, arguments, timeout, and approval reference. Responses carry success/failure, observations, and artifacts without credentials. Reject stale window/element references instead of acting on another window.

Serialize native input across all dots. Coordinate fallback must account for monitor position and DPI. Loss of access, locked sessions, elevated windows, and unsupported controls produce explicit unsupported/unavailable outcomes. The helper must not bypass OS access controls.

### 5.7 Approvals and recovery

New tools use the existing rule and approval pipeline. Bind approval to run, tool, target, and exact arguments. Changing any of those invalidates the approval.

Persist pending decisions and tool execution state. A denied or cancelled call must not execute. Following a crash after a potentially external action, mark the outcome uncertain and reconcile or ask before replaying it. Do not promise exactly-once external execution when the provider offers no idempotency mechanism.

### 5.8 Background lifecycle

Closing the main window hides it to the tray by default. Quit is explicit and stops application-owned work cleanly. Startup at sign-in is off by default. Second launch opens the existing instance.

The server and scheduler continue while Windows is awake and the app remains running. E2B does not change this ownership model. After sleep, reconnect services and apply missed-run policy; do not display a claim that local orchestration runs while the PC sleeps.

Notifications must be delivered by the desktop process while the window is hidden and open the associated conversation when selected.

## 6. Persistence changes

Use additive, versioned SQLite migrations through existing db/repo boundaries. Preserve original records and fail migration visibly without resetting the database.

| Entity | Required additions or behavior |
|---|---|
| Settings | Selected provider/account reference; desktop startup preference; execution defaults |
| Provider accounts | Nonsecret account ID, provider, display metadata, credential reference, authentication status |
| Execution targets | Kind, WSL distro/container reference, workspace mapping, isolation classification |
| Conversations | Provider/account association and replayable history; retain existing history/thread/pending data |
| Routines | Explicit IANA timezone and missed-run policy |
| Runs | Dot/conversation/source IDs, selected target/provider/model, status, scheduled/start/end timestamps, error and recovery state |
| Run steps | Tool call ID, argument fingerprint, approval reference, execution status and result reference |
| Trigger receipts | Provider event identity and deduplication record where supplied |
| App permissions | Application identity, decision, session/persistent scope and revocation state |
| Schema version | Ordered migration tracking and transactional upgrade state |

Run states: queued, running, waiting_for_approval, paused, completed, failed, cancelled, interrupted. Persist transitions before externally observable actions when necessary for recovery.

Default missed-run policy is skip with visible history, preserving the existing skip behavior. Offer an explicit run-once-after-resume policy; coalesce missed occurrences into one catch-up run. Store routine timezone at creation so moving hosts does not silently change schedule meaning.

Claim jobs atomically to prevent concurrent local workers executing the same run. Retry only when the action is known safe or supports idempotency. Record limits/re-authentication as blocked work, not success.

## 7. File-level implementation map

| Files or existing area | Planned work |
|---|---|
| electron/main.mjs; electron package metadata | Windows tray, notifications, startup, process cleanup, credential/helper ownership |
| package.json; scripts/desktop-prepare.mjs; desktop-after-pack.mjs | Portable file operations and environment configuration; Windows x64 installer |
| agent/client.ts; agent/openrouter.ts | Provider identity, capabilities, authentication and catalog separation |
| agent/runtime.ts; agent/review.ts; titles.ts | Stream-compatible helpers, local replay history, terminal status and durable recovery |
| agent/tools.ts; agent/prompt.ts | Target-aware tool descriptions, host approvals, native helper tools |
| computer/index.ts; shell.ts | Pinned execution contracts and WSL/Windows adapters |
| computer/browser.ts; browser input/stream routes | Ownership-safe recovery and takeover leases |
| vault.ts | Credential-broker integration and key migration |
| db.ts; repo.ts | Additive schemas and persistence operations |
| scheduler.ts; boot.ts; triggers.ts | Durable jobs, missed runs, deduplication and reconnect |
| snapshot.ts; lib/types.ts; lib/store.ts | Actual capability and runtime-state propagation |
| SettingsView; ComputerPane; SetupPane | Provider sign-in, execution selection, capability explanations and platform wording |
| voice.ts; voiceCall.ts; VoicePanel | Verify configured voice path; expose unsupported subscription capability |
| README.md; .env.example | Windows installation, WSL setup, lifecycle and provider documentation |

Preserve existing names and interfaces when their behavior remains valid. Exact placement of new modules follows repository conventions; avoid unrelated refactors.

## 8. Delivery stages and acceptance gates

| Stage | Required observable acceptance |
|---|---|
| 1. Subscription proof | Sign in; discover account models; complete streamed inference and a browser/function-tool round trip; approve/deny correctly; continue conversation after restart; handle refresh and usage limits without paid fallback |
| 2. Windows package | Install on Windows x64 without Node/pnpm; launch packaged server including node:sqlite; hide/reopen through tray; notify with window hidden; preserve credentials and data on restart |
| 3. WSL and files | Choose a distro; execute in the correct workspace; transfer files with spaces/Unicode; reject escapes; cancel descendants; report stopped WSL/Docker without host fallback |
| 4. Browser and apps | Isolated profiles survive restart; live view/input work; takeover prevents agent input; reconnect app authorization; deny a write without performing it |
| 5. Durable work | Restart during queued/running/waiting work; preserve approvals; mark uncertain external effects; deduplicate repeated trigger delivery; handle sleep/resume according to timezone and missed-run policy |
| 6. Windows apps | Inspect and operate representative Windows applications; verify multiple-monitor/DPI behavior, per-app permissions, desktop serialization, stale target rejection, and Stop |
| 7. Voice and release | Verify existing configured voice provider on Windows, task handoff and microphone permission; clearly disable unsupported paths; verify installer upgrade and final clean shutdown |

Every stage produces a short record of environment, scenario, observed result, and remaining limitation. A stage is not complete because its code compiles.

Stage 1 is the first buildable slice. Unsupported subscription features must become explicit capability limitations or a documented revised decision before dependent stages claim parity.

## 9. Verification decisions

Use the highest public seams: packaged desktop UI, existing server actions/API routes, streamed events, real browser takeover, and selected execution environments.

Run existing lint and a production build, scoped as appropriate. Perform direct acceptance scenarios without introducing test files or test-only fixtures. If an automated regression suite would materially reduce a specific risk, request approval separately.

Critical negative scenarios:
- Sign-in denied, refresh rejected, model unavailable, and response failure after text begins.
- Docker/WSL unavailable before and during a run.
- Path traversal, junction/symlink escape, and filenames with spaces or Unicode.
- Browser stale ownership, profile lock, takeover, and unexpected process exit.
- Approval denied, revoked, changed arguments, restart while waiting, and Stop during execution.
- Crash after an external write but before its result is recorded.
- Sleep through a scheduled run, timezone/DST transition, duplicate trigger event.
- Locked desktop, elevated window, stale element, and competing dot input.
- Upgrade with existing encrypted credentials and unavailable vault protection.

Do not use source-string assertions or mock-heavy tests as evidence of user-visible behavior.

## 10. Known compatibility gates

- Plus eligibility, model/tool entitlement, and current request requirements must be verified with the user's own authorized sign-in. Documentation is not proof of this account's access.
- Subscription computer tools and search must be demonstrated individually; function tools and browser page actions are the initial useful path.
- Realtime voice coverage under subscription auth is unconfirmed. The existing API-key voice path remains explicit and optional.
- Windows Chrome login behavior and profile recovery require real-machine validation.
- Bundled Electron Node must support the repository's node:sqlite usage in the packaged build.
- Native automation application coverage is empirical; publish the verified coverage and limitations.
- Never describe cloud computer availability as proof that locally hosted orchestration survives sleep.

## 11. Sources

Repository source links below refer to the inspected commit:
- [Repository baseline](https://github.com/AcidicSoil/open-dot/tree/f838e17cf5c3a88ade5ceea54680a8145d048c1d)
- [Desktop launcher](https://github.com/AcidicSoil/open-dot/blob/f838e17cf5c3a88ade5ceea54680a8145d048c1d/electron/main.mjs)
- [Agent runtime](https://github.com/AcidicSoil/open-dot/blob/f838e17cf5c3a88ade5ceea54680a8145d048c1d/src/server/agent/runtime.ts)
- [Execution](https://github.com/AcidicSoil/open-dot/blob/f838e17cf5c3a88ade5ceea54680a8145d048c1d/src/server/computer/shell.ts)
- [Schema](https://github.com/AcidicSoil/open-dot/blob/f838e17cf5c3a88ade5ceea54680a8145d048c1d/src/server/db.ts)
- [Sign in with ChatGPT](https://developers.openai.com/siwc/quickstart)
- [Open-source sign-in overview](https://developers.openai.com/siwc/token-sharing-open-source)
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking)
- [Windows UI Automation](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview)

## 12. Publication and handoff

This specification is the deliverable; no GitHub issue, comment, branch, or code change is created by this task. The fork's issue tracker was disabled in the inspected repository metadata. The ready-for-agent designation above is document metadata, not a claim that a tracker label was applied.

For subsequent tracker-based decomposition, run /setup-engineering-workflows to configure the intended tracker. Implementation may begin with Stage 1 using this specification and the live repository instructions.

