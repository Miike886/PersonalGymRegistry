# Recent records by exercise

## Purpose

Show factual, read-only history for the exercise currently being recorded so the owner can consult prior loads without receiving a recommendation.

## User-visible behavior

- Immediately below each exercise card, an attached history panel shows up to two working-set records, prioritizing the most recent completed workout and ascending set position within each workout. The first working set appears first, followed by the second; if only one exists, the next record comes from an older workout. Each row shows session date, original set position, repetitions, recorded load/type and original unit. The records stay expanded and visible on mobile and desktop.
- Warm-up sets and the current active workout are excluded. Zero, bodyweight, assisted, missing-load, kg and lb records retain their recorded meaning.
- The reference never fills or changes the current set inputs. Without prior data, the panel explains that records will appear after completing a session; it never displays invented samples.
- Keep the presentation compact and visually secondary to the current set form.
- Remove the routine-wide reference at the end of the page. Each panel contains only its own exercise, across completed routines. Skipped exercise cards omit the panel until resumed.

## Implementation and limitations

- Derive from the already loaded owner-authenticated workout history; no API, database, or migration changes.
- The session no longer requests routine-wide recent workouts. Catalog loading retains its own visible error and retry action.
- Match records by canonical exercise id. Legacy free-text snapshots without an exercise id cannot be matched to a catalog exercise.
- Only completed workout history is shown; working sets in the current active session are not treated as history.
- Reference records for the selected exercise are memoized by history and canonical exercise ID, so timer ticks do not re-sort the full history.
- Delivery resolves the dependency-audit blocker in PWA build tooling: the lock uses vite-plugin-pwa 2.0.0, and scoped overrides select glob 14.0.3, off-main-thread plugin 4.0.0 and deepmerge 4.1.1 (outside the affected 4.2.0–4.3.1 range). Revisit the overrides when upstream dependencies adopt fixes; no runtime API or database changes.

## Verification

- `npm test` covers first-working-set priority with three working sets, unsorted input, warmups before working sets, completed-session filtering, original units, limits and absent exercises.
- `npm run build` passes TypeScript and creates the production PWA bundle.
- `node scripts/test-owner-auth.mjs` checks populated and empty panels directly below their cards using isolated synthetic history, exercise isolation, responsive layout and unchanged typed inputs.
- With three historical working sets, the browser regression checks that positions 1 and 2 appear at widths 320, 375, 768 and 1440; the 375px screenshot was visually checked.
- `git diff --check` passes.
- Backend verification: `uv run pytest -q` passes (64 tests). `npm audit --package-lock-only --audit-level=low` passes with zero vulnerabilities; production build and browser flow pass with the updated tooling.
- Quality-gate for #27 reviewed its title, description, diff against main, first-working-set ordering, units and read-only behavior. The dependency-audit blocker is resolved by the tooling overrides above. Legacy snapshots without a canonical exercise ID remain unmatched; production verification does not create or edit owner workout data.
- Quality-gate reviewed the PR title, description and diff against main, exercise isolation, completed/working-only history, empty states and responsive placement. Missing assisted/additional loads retain an explicit unknown label rather than becoming zero. No remaining blocking findings; the final CI result is checked at handoff.

## Delivery

- Original reference delivery: [#23](https://github.com/Miike886/PersonalGymRegistry/pull/23), merged into the bottom-navigation branch; integrated into `main` through #25.
- Contextual layout follow-up branch: `feature/contextual-exercise-history`, integrated into `main`.
- Follow-up PR: [#25](https://github.com/Miike886/PersonalGymRegistry/pull/25), merged into `main`. The same feature document is reused.
- First-working-set correction: [#27](https://github.com/Miike886/PersonalGymRegistry/pull/27), merged into `main` as `7f481f4` after all CI checks passed, including dependency audits, PostgreSQL concurrency and the owner browser flow. Branch: `feature/first-working-set-reference`. Production deploys automatically from `main` through the existing Vercel integration.
