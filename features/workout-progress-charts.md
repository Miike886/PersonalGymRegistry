# Workout progress charts

## Purpose / behavior

- Private Progress view with 30/90/365-day presets, full-history/custom local-date range and routine filter.
- Overview: completed sessions, distinct training days, working sets and recorded elapsed minutes. Monthly attendance frequency chart.
- Per-exercise line chart: choose canonical exercise, weight type and original unit. Accessible exact-data table links each point to the read-only session.
- Bodyweight shows maximum repetitions, assisted shows minimum recorded assistance, external/additional weights show maximum recorded load for each session. Working sets only, no warmup influence.
- Missing loads are omitted, not treated as zero. lb/kg and different weight types never share a series; per-hand values are not doubled. Reps column is independent maximum reps for that session/filter, not necessarily the reps of the highest load.
- Active-session drafts/resume remain available while exploring progress.

## Architecture / limits

- Derives entirely from existing owner-authenticated history, read-only. No new backend endpoint, schema, chart dependency, estimated 1RM, invented bodyweight, volume or automatic conversion.
- One-owner history is filtered in memory; large histories may later need server range queries/pagination. Frequency displays months with attendance, not a training plan.
- Historical names remain snapshots; exercise selection uses canonical ID and a historical name. No comparisons across machine substitutions/canonical exercises.

## Verification / delivery

- Pure-model tests cover mixed units/types, missing/zero loads, warmups, assisted/bodyweight metrics, active exclusion, inclusive/reversed ranges and KPIs.
- Production build, backend regression and responsive real-browser chart filters/detail navigation run before handoff.
- Branch feature/workout-progress-charts; base feature/workout-attendance-calendar; PR #18 merged into its base; integrated into `main` through [PR #21](../docs/integration-main.md).
- Quality gate: no blocking findings after reviewing unit/type isolation, nullable loads, completed-only metrics, UTC/local dates, responsive charts and PR scope. 37 backend tests, model tests, build and real-browser flow pass; remote CI tracked at final handoff.
