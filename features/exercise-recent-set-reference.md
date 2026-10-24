# Recent records by exercise

## Purpose

Show factual, read-only history for the exercise currently being recorded so the owner can consult prior loads without receiving a recommendation.

## User-visible behavior

- Each exercise card shows up to its two most recent working-set records from completed workouts, with session date, repetitions, recorded load/type and original unit.
- Warm-up sets and the current active workout are excluded. Zero, bodyweight, assisted, missing-load, kg and lb records retain their recorded meaning.
- The reference never fills or changes the current set inputs. If no prior record exists, the form remains unchanged.
- Keep the presentation compact and visually secondary to the current set form.

## Implementation and limitations

- Derive from the already loaded owner-authenticated workout history; no API, database, or migration changes.
- Match records by canonical exercise id. Legacy free-text snapshots without an exercise id cannot be matched to a catalog exercise.
- Only completed workout history is shown; working sets in the current active session are not treated as history.

## Verification

- `npm test` passes model checks for ordering, completed-session filtering, warm-up exclusion, original units and absent exercises.
- `npm run build` passes TypeScript and creates the production PWA bundle.
- `node scripts/test-owner-auth.mjs` passes the authenticated browser flow and checks that the reference leaves the weight field empty until the owner enters a value.
- `git diff --check` passes.

## Delivery

- Branch: `feature/exercise-recent-set-reference` (stacked on the bottom-navigation feature branch).
- Pull request: pending.
