---
name: feature-documenter
description: Maintain one concise, current Markdown document per product feature and pull request in a repository's features/ directory whenever that feature changes.
metadata:
  short-description: Document features alongside their pull requests
---

# Feature Documenter

Apply this skill when implementing or changing a product feature. Do not apply it to a purely mechanical refactor, isolated investigation, or dependency-only change unless it alters an existing feature's observable behavior.

## Documentation contract

- Store feature documents at `<repository-root>/features/<feature-slug>.md`.
- A feature has exactly one document and exactly one pull request. Reuse and update its existing document when extending that feature; do not create a second document or a second feature PR for it.
- Create the document when a new feature begins. Update it in the same working change whenever the feature's behavior, scope, API, data, UX, limitations, or verification changes.
- Keep the document factual and concise. It should describe the delivered behavior, not a chronological implementation log or speculative roadmap.

## Required content

Use clear headings that cover: purpose, user-visible behavior, implementation/API or data impact when relevant, limitations or deferred work, and verification. Include the branch and pull-request link or identifier when they exist. For an open PR, state its status rather than inventing a merged state.

## Delivery workflow

Before opening the feature pull request, ensure the feature document is current and committed with the implementation. Update the same document on every follow-up change to that feature. Do not open a PR merely to document a feature when no feature change is requested.
