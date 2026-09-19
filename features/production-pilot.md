# Production Pilot

## Purpose

Prepare the application for a private personal deployment without adding user accounts.

## Behavior

- Production API accepts requests only with the configured application token, except health checks.
- CORS, API URL, environment and database configuration are environment-driven.
- Health verifies database connectivity; production no longer creates schema on startup.

## Deployment

- Run Alembic migrations and seed explicitly against Neon.
- Build the PWA with Vercel using the supplied configuration and production environment values.

## Limitations

- The shared application token is appropriate only for a private personal pilot; it is not a replacement for user authentication.

## Verification

- Backend tests and frontend production build.

## Delivery

- Branch: `feature/production-pilot`
- Pull request: [#6](https://github.com/Miike886/PersonalGymRegistry/pull/6) — open
