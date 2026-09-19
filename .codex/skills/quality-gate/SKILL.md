---
name: quality-gate
description: Review Gym Session Tracker feature changes and their pull request for architecture, domain invariants, mobile UX, verification, and deployment safety before merge.
metadata:
  short-description: Review feature quality before merge
---

# Quality Gate

Use this skill for a final quality review of a Gym Session Tracker feature and immediately after its pull request is created. It is not a generic style pass: review the changed behavior against this repository's architecture and the feature's stated scope.

## Review the change in context

Read the corresponding `features/<feature-slug>.md`, the pull request description, and the diff against its base branch. Confirm that the document still describes the implementation, behavior, verification, and known limitations.

For changes affecting workouts, routines, exercises, sets, weights, or history, read `.codex/skills/gym-session-tracker-domain/SKILL.md` before judging the implementation. Check in particular that:

- only one workout can be active, finishing it is explicit, and in-progress sessions do not appear as completed history;
- routine and exercise choices are copied into the session so historical records remain snapshots;
- session and set ordering are preserved, and weights/repetitions use the established units and validation;
- an intended backend invariant is not silently made a frontend-only rule.

## Architecture and product checks

Evaluate only the checks relevant to the change. Look for issues that would make the feature inconsistent with the current product:

- Keep React/TypeScript/Vite/PWA concerns in `frontend` and FastAPI, SQLAlchemy, Alembic, and PostgreSQL concerns in `backend`.
- Model schema changes with an Alembic migration; do not rely on `create_all` in production. Keep request, update, and response models explicit when their contracts differ.
- Preserve API validation and actionable client error states. On mobile, primary actions must remain touch-friendly and a failed request must not unnecessarily discard entered workout data.
- Avoid unnecessary abstractions or speculative features; follow the documented V1 scope.
- Do not commit secrets. Environment examples must contain placeholders. For public deployment, flag client-visible tokens as a pilot barrier rather than real authentication, and check production CORS, allowed-host, and migration settings when they change.

## Verification

Run or inspect the smallest meaningful verification set for the changed areas. Normally include:

```powershell
git diff --check
cd backend; uv run pytest -q
```

When the frontend changes and Node is available, also build it. In this Windows repository, when PowerShell blocks `npm.ps1`, use:

```powershell
cmd /c "set PATH=C:\Program Files\nodejs;%PATH% && npm.cmd run build"
```

Report checks that cannot run and why; do not present unrun checks as passing.

## Pull request review procedure

After a feature PR exists, review its title, description, files, diff, and status checks with GitHub CLI where available, for example `gh pr view`, `gh pr diff`, and `gh pr checks`. Compare the PR only with its intended base branch.

Classify findings clearly:

- **Blocking:** a broken invariant, missing migration, regression, security/deployment risk, incomplete feature-documentation contract, or failed required verification.
- **Suggestion:** a non-blocking refinement that can be intentionally deferred.

Resolve blocking findings within the same feature branch when authorized to continue the feature. Update its single `features/<feature-slug>.md` document whenever the scope, behavior, or verification changes, rerun the relevant checks, and push the revisions to the existing PR. Do not create another PR for the same feature.

End with a concise review record: what was inspected, checks and results, blocking findings resolved or remaining, and explicit limitations. This skill never merges, deploys, changes PR approval state, or performs other external mutations merely to review a PR; those actions require separate user authorization.
