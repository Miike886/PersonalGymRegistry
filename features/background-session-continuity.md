# Background session continuity

## Behavior

- Saved sessions/series and rest deadlines remain server-owned. Returning on focus, pageshow or visibility change refreshes API data and immediately recalculates wall-clock timers.
- Unsubmitted weights, repetitions, load types, warmup choice and custom exercise text survive reload in tab-scoped sessionStorage. They are drafts, never automatically submitted or treated as recorded sets.
- Logout, successful finish and cancellation remove the corresponding drafts. Storage unavailable/full does not block recording; recovery is then limited to saved server data.
- Drafts are device/tab-local. No cross-device or offline writes/synchronization are introduced.
- Optional Document Picture-in-Picture opens only after a user click and when capability exists; errors retain the normal timer. It closes on logout, expired authentication, session finish/cancel and component teardown.

## Platform limits

- Desktop Chromium: capability detected at runtime; optional floating HTML clock. Permissions/browser policy may reject opening.
- Chrome Android / Safari iPhone / installed mobile PWA: no universal outside-app HTML overlay. UI states the limitation and keeps reliable deadline-based recovery on return.
- Mobile OS may suspend/kill browser processes. This implementation does not promise background JS, alarms, notifications, full offline recording or recovery of tab storage after tab removal.
- Sources: https://developer.chrome.com/docs/web-platform/document-picture-in-picture and https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API . Physical iPhone/Android lifecycle validation remains manual; desktop browser tests cannot certify OS behavior.

## Verification / delivery

- Build, backend regression and real-browser tests cover drafts across reload, rest recovery and expiry/logout privacy.
- No backend schema migration beyond the base PR's 0004.
- Branch feature/background-session-continuity; base feature/session-timers; PR pending.
