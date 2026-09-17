# Smart Set Entry

## Purpose

Reduce friction when recording a working set by suggesting the weight and weight type used in the last completed workout of the same routine.

## User-visible behavior

- Each active exercise shows its last effective set as reference when available.
- The suggested load and weight type are prefilled independently for each exercise.
- Warm-up sets do not replace a working-set suggestion.
- The load control explains whether an exercise uses total weight or weight per hand.
- Bodyweight sets can be selected without entering an external load.

## Implementation

- Reuse the existing last-workout endpoint and exercise catalog; no schema change is required.
- Keep the chosen weight and type in the active-session UI while recording consecutive sets.

## Limitations

- No rest timer, notifications, custom rest duration, or offline persistence is included.

## Verification

- `cd backend && uv run pytest -q` passes (3 tests).
- `cd frontend && npm run build` passes and generates the PWA bundle.

## Delivery

- Branch: `feature/smart-set-entry`
- Pull request: [#3](https://github.com/Miike886/PersonalGymRegistry/pull/3) — open
