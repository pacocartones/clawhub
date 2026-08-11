# PR #3453 real-app evidence

These screenshots exercise ClawHub's real Skill Diff route in dark mode against an isolated local Convex deployment.

- `before-base-real-error.png`: base `82313c2bb17fb8401c41c8ed2b0144d42b461ae7`, showing Monaco rejecting the computed `lab(98.26% 0 0)` token.
- `after-fix-real-diff.png`: fix `650f0d5e4adff10aa51811b809d3272df3e06a10`, full real skill page after publishing versions `1.0.0` and `1.0.1` through the browser UI.
- `after-fix-real-diff-panel.png`: close-up of the real side-by-side Monaco DiffEditor with `SKILL.md`, `ALPHA`/`BRAVO`, and `+10 -9` visible.

The proof used the same local route and published versions in both lanes. No credentials or production data appear in the images.
