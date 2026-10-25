# Initial Gym Session Tracker

## Purpose

Provide the first mobile-first vertical slice for recording personal gym sessions, replacing a manual WhatsApp log.

## User-visible behavior

- Start PUSH, PULL, LEGS, or FREE workouts; resume the one active session after reopening the app.
- Record working or warm-up sets with a persistent weight field, skip an exercise, add an exceptional exercise, finish explicitly, and review completed sessions.
- Show prior-workout set data as a reference where available.

## Implementation

- React, TypeScript, Vite, and a PWA manifest in `frontend/`.
- FastAPI, SQLAlchemy 2 models, Pydantic schemas, Alembic initial migration, seed data, and PostgreSQL Docker Compose support in `backend/`.
- One active-workout constraint, historical exercise-name snapshots, stable exercise/set positions, and separate session exercises from routine templates.

## Limitations

- This initial slice did not include authentication or charts; both have since shipped in separate features. Offline synchronization, PR/1RM calculations and supersets remain outside the delivered scope.
- Historical session detail has since shipped; history now uses the attendance calendar. See [history detail](workout-history-detail.md) and [bottom navigation](bottom-tab-navigation.md).

## Verification

- `cd backend && uv run pytest -q` passes.
- Frontend build verified in the current repository health check; see [repository health](../docs/repository-health.md).

## Delivery

- Branch: `feature/initial-gym-session-tracker`
- Pull request: [#1](https://github.com/Miike886/PersonalGymRegistry/pull/1), merged into `main`.
