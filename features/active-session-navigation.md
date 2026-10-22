# Navigate during an active workout

## Purpose and behavior

- Explore Home, History and completed-session details while a workout is active.
- A persistent resume button returns to the active workout from every browsing screen.
- The active session component remains mounted so typed loads, repetitions and the rest timer survive navigation.
- Reloading still recovers the single active session from the API.
- Starting another routine is disabled while one workout exists. Cancellation and finishing remain explicit actions.

## Implementation

- Frontend view state adds the session screen and keeps it mounted while browsing.
- No schema changes or migrations.

## Verification

- Authenticated browser test covers leaving a session, opening history/detail and resuming with typed inputs intact.
- Production build, backend regression tests and whitespace validation run before delivery.

## Limits and delivery

- No offline synchronization.
- Branch: feature/active-session-navigation, base feature/pounds-load-units.
- PR: [#13](https://github.com/Miike886/PersonalGymRegistry/pull/13), abierta; depende de #12.
