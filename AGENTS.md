# Delivery workflow

Treat each user-requested new feature as an isolated delivery.

1. Before changing feature code, create a descriptive branch from the current base branch using the `feature/` prefix.
2. Create or update exactly one corresponding `features/<feature-slug>.md` document in the same change. Keep it current for every subsequent change to that feature.
3. Implement and verify the feature on that branch.
4. Create one pull request for the completed feature after verification. Do not merge it unless the user explicitly asks.

Do not create a branch or pull request for documentation-only workflow changes, investigations, reviews, or fixes unless the user requests one.
