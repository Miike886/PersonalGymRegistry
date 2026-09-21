---
name: gym-session-tracker-domain
description: Preserve and evolve Gym Session Tracker business rules when changing workouts, routines, exercises, sets, weights, historical records, or related API and UI behavior.
metadata:
  short-description: Preserve Gym Session Tracker domain rules
---

# Gym Session Tracker Domain

Use this skill whenever a change affects the Gym Session Tracker domain model, API contracts, persistence, business rules, or workflow UI. Do not apply it to purely visual or infrastructure-only work that has no effect on the domain.

## Domain invariants

- A `Workout` is active exactly when `ended_at` is `null`. There may be at most one active workout across the application. Closing the PWA never finishes it; finishing is always explicit.
- Cancelling an active workout permanently deletes it and its recorded sets instead of adding it to completed history. Deleting a completed workout also removes its historical snapshot and must be an explicit, confirmed action.
- A workout belongs to one `Routine`: `PUSH`, `PULL`, `LEGS`, or `FREE`. `FREE` begins without preloaded exercises.
- Starting a workout copies the current `RoutineExercise` entries into `WorkoutExercise` records. Never use routine entries as the session's mutable state.
- `WorkoutExercise.exercise_name_snapshot` is immutable historical data. Renaming or removing a catalog exercise must not rewrite prior workout names.
- Workout exercises may be added, skipped, reordered, or omitted without changing the routine template. Preserve an explicit, stable position for exercises and for sets.
- A `WorkoutSet` records positive `reps`; all loads are kilograms in V1. `load_value` is nullable for bodyweight work.
- Load conventions describe the catalog exercise (`TOTAL` or `PER_HAND`). Weight types describe the recorded set (`EXTERNAL`, `BODYWEIGHT`, `BODYWEIGHT_PLUS`, `BODYWEIGHT_ASSISTED`); do not conflate them.
- Sets distinguish `WORKING` from `WARMUP`. Do not introduce volume, PR, 1RM, charts, authentication, supersets, or offline sync unless explicitly requested.

## Product behavior

- The backend is the source of truth. The frontend must reload and surface errors rather than silently losing a series.
- Active-session recovery is required, not an optional cache feature.
- The normal mobile flow is weight confirmation, repetitions entry, and one tap to record. Preserve the selected/preloaded weight after a set.
- Recent completed workout data is reference-only, excludes active sessions, and must not mutate current records.

## Change workflow

Before implementing a domain-affecting change, identify affected invariants and the API, model, migration, tests, and UI consequences. Keep changes scoped to the request.

When the domain change is a new feature, follow the repository delivery workflow: create a descriptive `feature/` branch before changing feature code, verify the work, then create a pull request. Do not merge without explicit user authorization.

After a domain-affecting change is implemented, update this skill in the same change whenever the durable business meaning, an invariant, supported enum value, or workflow rule has changed. Do not update it for refactors that leave domain behavior unchanged. Keep this file concise and make corresponding automated tests cover the changed invariant.

For schema changes, preserve historical records and create an Alembic migration. For API changes, keep creation, update, and response schemas separate and use clear HTTP validation errors.
