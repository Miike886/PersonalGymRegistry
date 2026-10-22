# Session interaction polish

## Purpose / behavior

- Keep Performance/lime direction; polish reliable input and error interactions, not a speculative visual redesign.
- Each exercise owns its repetitions and warmup draft independently; changing one card never populates another. Tab reload recovery accepts the earlier shared draft only on the first card.
- Replace set-edit prompts with an accessible modal form. Cancel/Escape never sends a PATCH, original units remain intact, blank load explicitly means unknown.
- Edit errors remain in the modal; authentication expiry suspends it without losing the edit draft, with a Continue editing action after login.
- Guard in-flight session actions against repeated submission; keep drafts on failed recording and surface actionable inline errors. Reordering/skipping/deleting/skip-rest failures are caught.
- Completed sessions are read-only at the backend, not only in UI; intentional whole-workout deletion remains supported.

## API / data

- No migration. Set creation/update reject non-finite loads; edits share the 1..999 rep range. Explicit null is rejected for required update fields, while nullable load remains valid.
- Drafts are still ephemeral tab-local inputs, never automatic server writes. No historical values/units are rewritten.

## Verification / limits

- API tests cover read-only history, explicit deletion, update nulls/ranges and non-finite loads.
- Browser tests exercise independent cards, cancelled/successful edits, recording failures, retry and duplicate-click guards, plus existing login/navigation/timer/calendar/chart flows.
- Build/model/backend/browser checks run before delivery. Further aesthetic changes await the user's concrete feedback as recorded in ROADMAP.md.

## Delivery

- Branch feature/session-interaction-polish; base feature/workout-progress-charts; PR pending.
