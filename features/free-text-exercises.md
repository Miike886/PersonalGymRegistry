# Free-text exercises

## Purpose and behavior

- FREE sessions can create a named exercise directly from the add/substitute dialog.
- Names are trimmed and repeated whitespace collapsed; blank/overlong names are rejected.
- The user chooses total load or per-hand convention.
- Exercises persist in the catalog for reuse. Existing names are reused case-insensitively.
- The session stores its own name snapshot. Routine templates are never changed.
- Errors remain visible and requests are disabled while pending; an expired login keeps the custom draft in the mounted session.

## API

- POST /workouts/{id}/exercises accepts either exercise_id or name plus load_convention, never both.
- Named creation is allowed only on active FREE sessions.
- No migration; existing catalog and snapshot tables are reused.

## Verification and limits

- Backend tests cover validation, catalog reuse, conventions, immutable snapshots and completed-session rejection.
- Browser/build/regression checks run before delivery.
- This adds catalog entries, not a routine editor.

## Delivery

- Branch: feature/free-text-exercises; base feature/active-session-navigation.
- PR #14 merged into its base; [integration into main](../docs/integration-main.md) remains pending.
- PR: #14, stacked on #13. Backend: 35 tests pass; production build and real-browser custom creation pass. Quality gate: no blocking findings after reviewing API validation, snapshot behavior, dialog errors and PR diff. Exact-name races return 409; this is not a multilingual catalog deduplication service.
