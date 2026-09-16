# Workout History Detail

## Purpose

Allow completed gym sessions to be opened from history and reviewed without modifying historical records.

## User-visible behavior

- History contains only finished workouts.
- A tap opens a read-only session detail with routine, weekday/date, duration, exercises, skipped exercises, and working or warm-up sets.
- Session notes appear only when notes exist.

## Implementation

- Reuse `GET /workouts/{workout_id}` as the source for the detail view.
- Keep historical data immutable from the UI; no edit controls are introduced.

## Limitations

- No session editing, notes capture, statistics, or charts are included.

## Verification

- `cd backend && uv run pytest -q` passes (2 tests).
- Frontend build is pending because Node/npm is unavailable in the local environment.

## Delivery

- Branch: `feature/workout-history-detail`
- Pull request: [#2](https://github.com/Miike886/PersonalGymRegistry/pull/2) — open
