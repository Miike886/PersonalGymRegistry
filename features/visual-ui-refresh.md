# Performance UI Refresh

## Purpose

Give Gym Tracker a dark and lime visual identity and make long exercise names, dates and load labels readable on mobile and desktop.

## User-visible behavior

- Expressive home typography, routine accents and descriptive cards.
- Numbered exercises, labeled inputs, readable set rows and a prominent rest countdown.
- Recent references alongside the workout on desktop and below it on mobile.
- Consistent history and detail views with explicit destructive actions.
- Scrollable native catalog dialog, Escape handling, focus containment and restoration.
- At least 44px touch controls, keyboard focus and reduced-motion support.

## Implementation

- Frontend presentation, CSS tokens and reusable presentation components.
- Existing API contracts, snapshots and confirmation prompts remain; no migration.

## Verification

- Production build passed (TypeScript, Vite and PWA).
- All 6 existing backend regression tests passed.
- Headless Edge with local request fixtures: home, history, detail, active session and rest timer checked at 320, 375, 430, 768 and 1440px; no document or checked text overflow.
- Browser checks passed for registering a set, starting rest, catalog focus containment/restoration, Escape dismissal, declining cancellation and reduced motion; no JavaScript errors.
- Desktop/mobile screenshots inspected. No physical iPhone/Safari validation or writes to production data.
- Git whitespace validation passed.

## Limitations

- Confirmation and set-edit prompts remain native.
- No analytics or general history search.
- Existing client-visible pilot token authentication is unchanged.

## Delivery

- Branch: `feature/visual-ui-refresh`
- Pull request: [#10](https://github.com/Miike886/PersonalGymRegistry/pull/10) — open.
