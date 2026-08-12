# ClawHub #3457 real behavior proof

The proof used two real ClawHub Vite applications against the same real local Convex deployment:

- baseline: exact live base `faab45bace675a046b9b628dbc4581008ebbef96`;
- candidate: exact PR head `25db30d26c881fd7d9d60956ced543654d1be26b`;
- route: `http://localhost:<lane>/skills?tab=new`;
- data: the repository's `devSeed:seedLocalFixtures` fixture, including a visible local skill;
- browser: real Chromium controlled with Playwright CLI.

For each lane, Playwright intercepted the real Convex `/api/query` network request with an HTTP 503
response containing only `proof-only simulated outage`. No application code, DOM, database row or
HTML was edited to manufacture the state.

Baseline behavior after the 503 was the false terminal message `No skills found` / `No skills have
been published yet`, with no `Load more` button. Candidate behavior after the identical 503 showed
`Load more`. The route interception was then removed, that real button was clicked, the second
Convex request returned 200, and the seeded skill rendered. The retry button disappeared after
successful recovery.

The screenshots contain only local fixture data and localhost URLs. Network and console logs are
retained in the external session evidence; no private endpoint or credential is included.
