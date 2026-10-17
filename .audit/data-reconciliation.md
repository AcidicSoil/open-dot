# Data reconciliation

Canonical data directory: /home/user/.local/share/open-dot. Startup: pnpm dev from repository, http://localhost:3100. DOTS_DATA_DIR is set in .env.local.

Stopped both Next database writers before reconciliation. Complete source snapshots and verified SQLite backups: /home/user/.local/share/open-dot-backups/20261016-075653/dev and setup. Original .data and /tmp directory retained. No source data deleted.

Dev database had no non-settings user records. Merged all dev settings into canonical database. Preserved both ChatGPT registrations by ID, canonical conversation model bindings, default GPT-6-Luna, full latest Composio OAuth object, trigger identity, and E2B key. All encrypted settings authenticated with the canonical vault key before merge; no source vault.key existed, consistent with hot-reloaded code using a newer DATA_DIR while the globally cached database still held the old connection. No vault key was replaced.

Verified exact equality of all 28 canonical messages before/after merge, SQLite integrity, both conversations served via port 3100 (15 and 13 messages), and only canonical database open by running Next server. UI shows both chats, both ChatGPT registrations, selected GPT-6-Luna, and Composio signed in. Composio Refresh completed without an error. No inference sent. No source files or repository implementation work reverted.

Start with pnpm dev; do not override DOTS_DATA_DIR to .data or /tmp. Restart the server after changing storage configuration; hot reload cannot replace its cached SQLite connection.
