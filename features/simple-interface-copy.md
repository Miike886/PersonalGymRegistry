# Simple interface copy

## Purpose

Remove motivational slogans and generic filler so screens focus on the available actions and workout data.

## User-visible behavior

- Login shows a compact form without an introductory slogan. Its submit action is labeled “Entrar”.
- Main screens use compact, descriptive titles: Entrenar, Historial, Progreso and Ajustes. Remove the decorative hero, motivational eyebrows and footer slogan.
- Routine descriptions identify muscle groups or the absence of predefined exercises. History, progress, exercise selection and session headings use factual labels.
- Rest shows “Descanso” and the remaining time. The floating timer omits the motivational sentence.
- Empty exercise history and unavailable settings use short factual messages. Required instructions, validation, errors and destructive-action confirmations remain available.

## Implementation and scope

Frontend copy and spacing only. No API, persistence, timer, workout or authentication behavior changes. Retain the existing colors, controls and navigation.

## Verification

- `npm run build` passes TypeScript, Vite and PWA generation.
- `node scripts/test-owner-auth.mjs` passes the existing login, registration, navigation, workout, history and progress flow with updated text selectors, including widths 320, 375, 768 and 1440.
- Visually inspected the 375px registration/history captures and 1440px progress capture. No text overflow or unnecessary hero space.
- `git diff --check` passes. Backend behavior is unchanged; backend verification is left to the existing PR CI.

## Delivery

- Branch: `feature/simple-interface-copy`
- PR: pending creation.
