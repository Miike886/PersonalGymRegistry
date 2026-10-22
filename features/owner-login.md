# Single-owner login and persistent authorization

## Purpose

Restrict all workout data to the owner while remembering a trusted phone/browser between visits.

## Behavior

- One owner configured server-side; no signup or public account creation.
- Username/password login in the existing dark/lime design.
- Remember-device checkbox defaults on: persistent session for 30 days; unchecked sessions expire within 12 hours and omit persistent-cookie Max-Age.
- Reloading restores the session and active workout. Expired authorization asks for login while retaining the mounted workout's current inputs in that tab; successful re-login refreshes server data. Logout clears the displayed data.
- Logout revokes the current session. Changing configured credentials invalidates all sessions.

## API and data

- All workout/catalog/history endpoints require the owner session in every environment. The old public X-App-Token cannot grant access.
- POST /auth/login, GET /auth/session and POST /auth/logout.
- Argon2 password hash in OWNER_PASSWORD_HASH; opaque random session cookie with HttpOnly, SameSite=Lax, Secure and __Host- prefix in production. Only a SHA-256 digest is stored in the database.
- Same-origin /api proxy through Vercel and Vite; no password or token embedded in the frontend or saved in localStorage.
- Unsafe requests require an explicitly allowed Origin, including login and logout. Authenticated/private responses use no-store caching directives.
- Persistent login throttle with a database row lock: 10 failed attempts per 15-minute window across instances.
- Migration 0002 adds owner_sessions and login_throttle and preserves workouts. The live-metadata initial migration explicitly excludes the new auth tables so fresh installations do not create them twice.

## Setup and deployment

- Generate the password hash locally with uv run python -m app.auth_cli; configure username and hash only on the backend.
- Apply uv run alembic upgrade head to Neon before the new backend starts serving traffic.
- Follow the README deployment sequence and environment list. No production variables or database are modified by implementation/testing.

## Verification

- All 30 backend tests pass, including authorization, credential rotation and migration upgrade/downgrade preserving existing workouts.
- Real Edge + Vite proxy + isolated API test passes: unauthorized direct API calls, wrong password, persistent cookie after browser reopen, cross-origin denial, expired-session re-login preserving inputs, set recording, active-workout recovery and logout.
- Login layout checked at 320, 375, 430, 768 and 1440px; screenshots inspected; no browser JavaScript errors.
- A dedicated CI job runs the real browser flow on Chromium.
- TypeScript/Vite/PWA production build and git diff whitespace validation pass.
- Late reference requests merge suggestions without overwriting values already typed by the owner.
- PR quality gate runs after creation; coordinated production activation remains a deployment step.

## Limitations

- Single owner; no email reset, registration, roles or MFA.
- Persistent sessions are per browser/device; private browsing, cookie removal, expiry, logout or credential changes require login again.
- Global throttling can temporarily block the owner after repeated failed attempts.
- Physical iPhone/Safari and Vercel same-origin cookie behavior must be smoke-tested after the coordinated deployment.

## Delivery

- Branch: feature/owner-login
- Pull request: [#11](https://github.com/Miike886/PersonalGymRegistry/pull/11) — open.
