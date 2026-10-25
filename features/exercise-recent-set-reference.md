# Recent records by exercise

## Purpose

Show factual, read-only history for the exercise currently being recorded so the owner can consult prior loads without receiving a recommendation.

## User-visible behavior

- Immediately below each exercise card, an attached history panel shows up to its two most recent working-set records from completed workouts, with session date, set position, repetitions, recorded load/type and original unit. The records stay expanded and visible.
- Warm-up sets and the current active workout are excluded. Zero, bodyweight, assisted, missing-load, kg and lb records retain their recorded meaning.
- The reference never fills or changes the current set inputs. Without prior data, the panel explains that records will appear after completing a session; it never displays invented samples.
- Keep the presentation compact and visually secondary to the current set form.
- Remove the routine-wide reference at the end of the page. Each panel contains only its own exercise, across completed routines. Skipped exercise cards omit the panel until resumed.

## Implementation and limitations

- Derive from the already loaded owner-authenticated workout history; no API, database, or migration changes.
- The session no longer requests routine-wide recent workouts. Catalog loading retains its own visible error and retry action.
- Match records by canonical exercise id. Legacy free-text snapshots without an exercise id cannot be matched to a catalog exercise.
- Only completed workout history is shown; working sets in the current active session are not treated as history.

## Verification

- `npm test` passes model checks for ordering, completed-session filtering, warm-up exclusion, original units and absent exercises.
- `npm run build` passes TypeScript and creates the production PWA bundle.
- `node scripts/test-owner-auth.mjs` checks populated and empty panels directly below their cards using isolated synthetic history, exercise isolation, responsive layout and unchanged typed inputs.
- `git diff --check` passes.

## Delivery

- Original reference delivery: [#23](https://github.com/Miike886/PersonalGymRegistry/pull/23), merged into main.
- Contextual layout follow-up branch: `feature/contextual-exercise-history`, targeting main.
- Follow-up PR: [#25](https://github.com/Miike886/PersonalGymRegistry/pull/25), open. The same feature document is reused.
