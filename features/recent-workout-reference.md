# Recent Workout Reference

## Purpose

Show the user's most relevant recent loads during an active workout without requiring a separate history search.

## User-visible behavior

- The bottom of an active session shows the two most recent completed workouts for the same routine.
- The latest workout is expanded initially and the second remains collapsible for quick mobile access.
- Each reference shows its date, duration, exercise names, and working-set repetitions and loads.
- When no previous completed workout exists, the reference area explains that this is the first recorded session for the routine.
- A failed reference request is shown separately with a retry action.
- Reference data remains read-only and never changes the active workout.

## Implementation

- `GET /routines/{routine_id}/recent-workouts` returns completed workouts for one routine, newest first.
- The endpoint defaults to two results and accepts a validated `limit` from 1 to 10.
- The active session reuses the newest returned workout for existing load suggestions.
- No database migration is required.

## Limitations

- This slice does not add general history search or filters.
- Warm-up sets are omitted from the compact reference so working loads remain easy to scan.

## Verification

- `cd backend && uv run pytest -q` passes (6 tests), covering ordering, routine filtering, active-session exclusion, response detail, and limit validation.
- `cd frontend && npm run build` passes and generates the production PWA bundle.
- `git diff --check` passes.

## Delivery

- Branch: `feature/recent-workout-reference`
- Pull request: pending
