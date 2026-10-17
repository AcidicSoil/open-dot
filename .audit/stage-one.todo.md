- [x] Read the Principles section of the poteto-mode skill.
- [x] Phase A: Frame.
- [x] Phase B: Design the workflow.
- [x] Phase C: Run the loop.
- [x] Phase D: Keep the audit trail.
- [ ] Phase E: Verify and hand back.

Definition of done is an authorized account completing streamed inference, a function/browser round trip, approval and denial, restart continuation, refresh and usage-limit handling with no paid fallback.

1. Verify the public OAuth and inference contract before implementation.
2. Compare provider boundary designs and select the smallest complete shape.
3. Implement encrypted account authentication, refresh, catalog and sign-out.
4. Integrate explicit provider capabilities and conversation account pinning across main turns, reviews, titles and consultation.
5. Add Settings sign-in, account model labels and explicit capability limitations.
6. Run lint, production build and direct public-flow checks. No new test files or fixtures per specification.
7. Obtain independent review and resolve material findings.

Authentication and runtime are separate ownership units. UI follows their contract. Account acceptance requires the user's browser sign-in and cannot be replaced by compilation.

Scope excludes Windows packaging and Stages 2 through 7. Existing uncommitted user files are preserved.

Design A retains string model references and adds explicit account identity and capability metadata. Design B separates account selection into new tables. Independent review favored A because it preserves the existing picker and requires fewer caller changes. Both require immutable account binding and local replay history.

Account sign-in, seven-model discovery, streamed inference, browser tools, approve/deny file effects, and restart continuation passed. Actual usage exhaustion and subsequent local blocking passed. Token expiry/refresh remains open. No new tests, fixtures, or test-only helpers were added. Direct negative checks used an isolated live data directory at /tmp/open-dot-stage-one-acceptance.
