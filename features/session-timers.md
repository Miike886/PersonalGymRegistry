# Session and rest timers

## Behavior

- Elapsed session time counts from the server's started_at, including time away.
- Each successfully created set, working or warmup, starts 165 seconds of rest (2:45). This follows the request for every new set; editing/deleting a set does not reset rest.
- Server stores rest_until atomically with the new set. Refresh/reload recovers the same deadline, never a fresh countdown.
- Skip rest persists to the server. Finish clears the deadline; cancellation deletes the workout as before.
- Timers calculate from timestamps, not accumulated interval ticks. No automatic series creation or session finish.

## Contract and migration

- Workout responses include nullable rest_until. POST /workouts/{id}/rest/skip requires owner authentication and CSRF origin checks.
- Alembic 0004 adds nullable workouts.rest_until. Existing history/active workouts are not assigned an invented rest period.
- Browser treats timezone-less SQLite timestamps as UTC, matching production timestamptz semantics.

## Verification

- API tests cover exact 165-second deadline for working/warmup sets, recovery, skip, finish and authorization.
- Build and real-browser checks include countdown recovery after reload.
- Background OS execution, outside-app overlays and audible alarms are separate capability concerns, not guaranteed by this timer.

## Delivery

- Branch feature/session-timers, base feature/free-text-exercises; PR #15.
- PR #15 merged into its base; integrated into `main` through [PR #21](../docs/integration-main.md).
- Quality gate: reviewed PR contract/diff, migration and privacy; no blocking findings. 37 backend tests, build and real-browser recovery/skip pass. Remote CI tracked separately.
