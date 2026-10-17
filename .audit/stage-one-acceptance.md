# Stage 1 acceptance record

Environment is the current Linux workspace, Node 24.22.0, Next.js 16.3.6, and an isolated local data directory at `/tmp/open-dot-stage-one-acceptance`. No provider keys were supplied to the verification server.

| Scenario | Observed result | Remaining limitation |
| --- | --- | --- |
| Production build and TypeScript | Passed | Does not prove account eligibility |
| Existing lint | Zero errors and eight existing warnings, including the nested worktree | Warnings remain |
| Settings in the browser | Authorized account signed in, seven models discovered, GPT-6.1-Sol selected | Discovery alone does not prove all capabilities |
| Sign-in launch | Existing UI action opened OpenAI sign-in and reached account selection and plan consent | Consent submission returned OpenAI error: Agent registration session changed; restart sign-in. No successful callback or persisted account was observed | 
| Repeated sign-in attempts through server actions | Stable host ID, fresh state and nonce, S256 PKCE, dynamic registration | Successful code exchange not exercised |
| Invalid state | Callback returned 400 and kept the pending attempt available | No successful callback exercised |
| Denied consent | Callback returned 400, closed its listener, and stored no account credentials | No refresh or revocation exercised |
| SQLite migration | Version record and provider binding column exist in the live database | Upgrade with real historical credentials not exercised |
| Independent code review | Reported material findings fixed and rechecked | Review is not behavioral proof |

Stage 1 is INCONCLUSIVE until an authorized account completes streamed inference, a browser function-tool round trip, approval and denial, restart continuation, token refresh, and usage-limit handling without paid fallback. The code includes these paths but this record does not claim they passed.

Historical conversations without a trustworthy provider association remain readable and require a new chat. The existing vault is reused. Windows credential protection and packaging belong to later stages.

No new test files, fixtures, or test-only helpers were added. Stages 2 through 7 were not started.

## Authorized account verification, 2026-10-15

The user completed consent. Streamed inference returned SUBSCRIPTION_OK. Real stream completion omitted output items, exposing a replay/tool bug. Runtime and auxiliary inference now retain output_item.done items by output_index. The repaired artifact executed open_url and read_page on https://example.com and returned Example Domain. Conversation and account survived server restart.

A fresh conversation denied a file creation request and continued with Permission denied. The denied file was absent. Approval subsequently created approval-check.txt with exact contents approved. An earlier continuation returned HTTP 503 twice; no paid fallback occurred. Review found tool results were persisted only after subsequent inference succeeded; the durability fix passed an inline check against the real respond function with a simulated 503, preserving the exact tool result once and clearing pending state. Independent re-review reported no remaining material findings.

Actual usage exhaustion returned subscription_sharing_usage_limit_exceeded on the final restart-continuation request. The SDK threw the SSE error before the event handler, exposing a missing account-block transition; its fix passed independent review and the production build. A subsequent real request returned the limit and persisted the block; the next request stopped locally with ChatGPT usage limit reached. Requests are paused. No paid provider was configured or used. Actual token expiry/refresh remains unverified. Stage 1 remains INCONCLUSIVE until the remaining gates pass.
