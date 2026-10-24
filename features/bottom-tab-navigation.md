# Bottom navigation and calendar based history

## Purpose

Make the app's main destinations easier to reach on mobile and bring completed workout history together with its attendance calendar.

## User-visible behavior

- Replace the four top navigation buttons with a persistent bottom bar containing icon and text labels for Entrenar, Historial, Progreso and Ajustes.
- The Historial destination keeps its title and presents the attendance calendar as its primary view. Selecting a calendar day opens its completed sessions and each session opens the existing read-only detail.
- Remove the separate completed-session list destination. Finishing a workout opens Historial.
- Keep the navigation visible while viewing a workout detail. While browsing with an active workout, keep the resume action above the bottom bar.
- Ajustes opens a clearly marked placeholder for future account and app options; it has no settings behavior yet.

## Implementation and limitations

- Frontend-only view and responsive CSS changes; no API, data model, or migration changes.
- The settings feature itself remains future work and will be defined separately as its behavior becomes clear.

## Verification

- `cd frontend && npm run build` passed TypeScript and generated the production PWA bundle.
- `node scripts/test-owner-auth.mjs` passed the real browser flow, including browsing Historial through the calendar, opening session details, the Ajustes placeholder and responsive widths.
- `git diff --check` passed.

## Delivery

- Branch: `feature/bottom-tab-navigation-history-calendar-settings`.
- Pull request: [#22](https://github.com/Miike886/PersonalGymRegistry/pull/22), open.
