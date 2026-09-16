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

- No offline synchronization, authentication, statistics, charts, PRs, 1RM calculations, or supersets in V1.
- The interface currently lists completed sessions; a richer historical session-detail view remains deferred.

## Verification

- `cd backend && uv run pytest -q` passes.
- Frontend build is pending local Node/npm availability.

## Delivery

- Branch: `feature/initial-gym-session-tracker`
- Pull request: pending creation
