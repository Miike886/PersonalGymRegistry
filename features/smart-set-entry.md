# Smart Set Entry

## Purpose

Show recent exercise data alongside set entry so the owner can make their own choice without a weight recommendation or automatic prefill.

## User-visible behavior

- Each active exercise shows up to two recent working-set records as read-only reference data when available.
- Previous exercise records are displayed as read-only facts; they do not prefill or recommend the current load or weight type.
- Warm-up sets are excluded from the reference data.
- The load control explains whether an exercise uses total weight or weight per hand.
- Bodyweight sets can be selected without entering an external load.

## Implementation

- Reuse the existing last-workout endpoint and exercise catalog; no schema change is required.
- Keep the owner's chosen weight and type in the active-session UI while recording consecutive sets.

## Limitations

- No rest timer, notifications, custom rest duration, or offline persistence is included.

## Verification

- `cd backend && uv run pytest -q` passes (3 tests).
- `cd frontend && npm run build` passes and generates the PWA bundle.

## Delivery

- Branch: `feature/smart-set-entry`
- Pull request: [#3](https://github.com/Miike886/PersonalGymRegistry/pull/3), merged into `main`.
