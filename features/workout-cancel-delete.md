# Workout Cancel And Delete

## Purpose

Let the user discard an active workout or permanently remove an unwanted completed workout without confusing either action with finishing a session.

## User-visible behavior

- An active session offers `Cancelar entrenamiento` separately from `Finalizar`.
- Cancelling requires confirmation and removes the active session, its exercises, and its recorded sets without adding it to history.
- A completed workout detail offers `Eliminar entrenamiento` at the bottom of the screen.
- Deleting a completed workout requires confirmation, removes it permanently, and returns to the refreshed history.
- Failed deletions remain visible so the user can retry.

## Implementation

- `DELETE /workouts/{workout_id}` removes the workout through SQLAlchemy relationships, including its workout exercises and sets.
- Missing workouts return `404 Workout no encontrado`.
- No database migration is required because the existing relationships already define the deletion cascade.

## Limitations

- Deletion is permanent; there is no recycle bin or undo action.
- Recent-workout references and general history search belong to a separate feature.

## Verification

- `cd backend && uv run pytest -q` passes (5 tests), including deletion of active and completed workouts and their dependent records.
- `cd frontend && npm run build` passes and generates the production PWA bundle.
- `git diff --check` passes.

## Delivery

- Branch: `feature/workout-cancel-delete`
- Pull request: pending
