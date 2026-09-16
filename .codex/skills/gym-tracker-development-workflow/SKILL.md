---
name: gym-tracker-development-workflow
description: Implement Gym Session Tracker changes while preserving its React/FastAPI architecture, mobile-first UX, migrations, verification, and intentionally small V1 scope.
metadata:
  short-description: Build Gym Tracker features with disciplined scope
---

# Gym Tracker Development Workflow

Use this skill for implementation work in the Gym Session Tracker repository. It complements the domain and feature-documentation skills; use those when a change also affects their respective concerns.

## Architecture boundaries

- Keep the monorepo split into `frontend/` (React, TypeScript, Vite, PWA) and `backend/` (FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, Pydantic).
- The API is the source of truth. Do not add offline synchronization or client-side persistence as a competing source of truth without an explicit request.
- Keep REST endpoints small and explicit. Use separate Pydantic schemas for create, update, and response payloads, validate input, and return intentional HTTP errors.
- Use SQLAlchemy models for persistence and Alembic migrations for any persistent-schema change. Preserve existing data in migrations.

## Mobile interaction standard

- Treat iPhone-sized touch screens as the primary surface: clear hierarchy, large reachable controls, readable spacing, and no desktop-only interaction assumptions.
- For session logging, minimize taps and typing. Preserve input context such as an accepted weight when it safely speeds the next set.
- Show loading, success, and failure states for asynchronous actions. A failed request must remain visible and recoverable rather than silently dropping user input.

## Scope discipline

- Deliver the smallest cohesive vertical slice that meets the request. Prefer direct code over new abstractions, libraries, services, or background jobs unless they solve a demonstrated need.
- Do not add analytics, charts, PR calculations, complex authentication, visual supersets, full offline sync, or production deployment configuration unless explicitly requested.
- Avoid unrelated reformatting and preserve existing behavior outside the requested feature.

## Verification

- Add or update focused tests for changed backend behavior, validation, and persistence invariants. Run them with `cd backend && uv run pytest -q`.
- For frontend changes, run `cd frontend && npm run build` when Node dependencies are available. Manually check the relevant mobile flow when a browser is available.
- Run `git diff --check` before handoff. Report commands that could not run and why.

## Feature delivery

Follow the repository's `AGENTS.md` delivery workflow: branch first, maintain its one `features/<feature-slug>.md` document, verify, and create one pull request. Do not merge without explicit authorization.
