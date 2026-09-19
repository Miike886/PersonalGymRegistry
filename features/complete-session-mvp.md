# Complete Session MVP Flow

## Purpose

Make the active workout practical for daily use with real routines, corrections, substitutions, flexible ordering, and a visible rest timer.

## User-visible behavior

- Seed PUSH, PULL, and LEGS with the user's current exercise order plus an incline-machine substitute.
- Reorder or substitute session exercises without changing the routine.
- Edit or remove an accidentally recorded set.
- Start a three-minute visible rest countdown after recording a working set.

## Limitations

- No background notifications, custom rest duration, routine editor, or statistics.

## Verification

- `cd backend && uv run pytest -q` passes (3 tests).
- `cd frontend && npm run build` passes and generates the PWA bundle.

## Delivery

- Branch: `feature/complete-session-mvp`
- Pull request: pending creation
