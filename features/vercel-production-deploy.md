# Vercel Production Deploy

## Purpose

Make the frontend and FastAPI backend independently deployable to Vercel with Neon as the production database.

## Implementation

- `frontend/vercel.json` builds and serves the PWA from the frontend project root.
- Vercel discovers the FastAPI application at `backend/app/main.py` and preserves its API paths without a rewrite.
- `backend/vercel.json` excludes non-runtime files from that function bundle.
- Production CORS preflight requests bypass the application-token guard, while API requests still require the token.
- GitHub Actions validates backend tests and the frontend production build on pull requests and updates to `main`.

## Deployment

Create two Vercel projects from this repository: set root directory to `frontend` for the PWA and `backend` for the API. Configure production variables from `.env.example`, run Alembic and seed against Neon before sending traffic.

## Verification

- `cd backend && uv run pytest -q` passes (4 tests), including production CORS preflight and token protection.
- `cd frontend && npm run build` passes and generates the PWA bundle.
- Production smoke check expects `GET /health` to return `200` without an application token.

## Delivery

- Branch: `feature/vercel-production-deploy-final`
- Pull request: [#7](https://github.com/Miike886/PersonalGymRegistry/pull/7) — merged
