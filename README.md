# queue-economics

[![npm version](https://img.shields.io/npm/v/queue-economics.svg)](https://www.npmjs.com/package/queue-economics)
[![npm downloads](https://img.shields.io/npm/dm/queue-economics.svg)](https://www.npmjs.com/package/queue-economics)
[![license: MIT](https://img.shields.io/npm/l/queue-economics.svg)](./LICENSE)

> **Full write-up with live, interactive charts:** [Why Bigger Pools Wait Less](https://kayhan.dev/posts/017-why-bigger-pools-wait-less/)

Queueing-theory math for the **economics of scale**: bigger server pools wait
dramatically less at the *same* per-server utilization. Erlang B/C, M/M/c latency
and percentiles, pool consolidation (split vs merge), and the square-root staffing
rule.

Zero runtime dependencies. Edge-safe (no Node built-ins). TypeScript.

On npm: [`queue-economics`](https://www.npmjs.com/package/queue-economics). It powers the
interactive post
[_Why Bigger Pools Wait Less_](https://kayhan.dev/posts/017-why-bigger-pools-wait-less/)
and is the multi-server sequel to the well-known single-server "give your systems some
slack" intuition.

## Install

```bash
npm install queue-economics
# or: bun add queue-economics
```

## Why

The textbook Erlang formulas use factorials that overflow IEEE double precision past
~170 servers. This package computes Erlang B with the numerically stable recursion
(`B(n) = a·B(n-1) / (n + a·B(n-1))`, always in `[0, 1]`) and derives Erlang C from it,
so it stays correct into the thousands of servers. M/M/c also has a closed-form
waiting-time tail, so percentiles are **exact**, not simulated.

## Quick start

```ts
import {
  waitProbability,
  waitQuantile,
  consolidationComparison,
  squareRootStaffing,
} from "queue-economics";

// 10 servers, 8 req/s, 1s each → 80% utilization.
const params = { lambda: 8, Ts: 1, c: 10 };
waitProbability(params);      // P(an arrival has to wait)
waitQuantile(params, 0.99);   // exact p99 waiting time

// Split into 4 pools of 10, or merge into one pool of 40 — same utilization.
const r = consolidationComparison({ pools: 4, perPoolLambda: 8, Ts: 1, serversPerPool: 10 });
r.waitProbabilityDrop;        // how much merging cuts the wait probability
r.waitQuantileDrop;           // how much merging cuts p99 wait

// To hit a 50% delay probability at load a = 500 Erlangs:
squareRootStaffing(500, 0.5); // { servers, safetyMargin, beta, ... }
```

## API

| Function | Description |
| --- | --- |
| `erlangB(c, a)` | Blocking probability (M/M/c/c loss system). |
| `erlangC(c, a)` | Wait probability (M/M/c delay system). |
| `utilization(c, a)` | Per-server utilization `a / c`. |
| `waitProbability({lambda, Ts, c})` | Erlang C in real units. |
| `meanWaitTime` / `meanResponseTime` | Mean queue wait `Wq` and total `W = Wq + Ts`. |
| `waitTimeTail(params, t)` | Exact `P(Wait > t)`. |
| `waitQuantile(params, q)` | Exact q-quantile of waiting time (e.g. `q = 0.99`). |
| `waitTimeVariance(params)` | Variance of the waiting time. |
| `experiencedWaitTime(params)` | Wait as *felt* by arrivals (inspection paradox): `2·Ts/(c − a)`. |
| `sizeBiasedMean(mean, variance)` | General length-biased mean `mean + variance/mean`. |
| `mmcMetrics(params)` | Bundle of the above. |
| `serversForWaitProbability(a, target)` | Smallest `c` meeting a wait-probability target. |
| `serversForWaitQuantile(lambda, Ts, t, q)` | Smallest `c` whose p-quantile wait ≤ `t`. |
| `squareRootStaffing(a, targetDelayProb)` | `c ≈ a + β·√a`, with the safety margin. |
| `consolidationComparison(input)` | N independent pools vs one merged pool. |
| `simulateMMc(input)` | Seeded discrete-event sim (for validating the analytic curve). |

`a` is the offered load in Erlangs (`a = lambda · Ts`). All time-based functions use
whatever time unit you pass in via `Ts` and `lambda`.

## Caveats

These are clean-room M/M/c results: Poisson arrivals, exponential service, infinite
patience, no retries. Real systems bend the curve (retries add load under stress,
cold starts break the fixed-service-time assumption, and a single-threaded actor is
effectively M/M/1 and gets none of the economies of scale). Use this for intuition
and first-order capacity planning, not as a substitute for measuring your system.

## Development

```bash
bun test          # run the test suite
bun run build     # bundle ESM + CJS + types into dist/ via tsup
bun run typecheck # tsc --noEmit
```

## Releasing

This package publishes to npm through GitHub Actions using OIDC trusted publishing,
so there is no npm token anywhere. Provenance is attached automatically, and the
publish runs behind a protected `release` environment that requires a manual approval.

To cut a release (maintainers):

1. Bump `version` in `package.json` (this project follows SemVer).
2. Add an entry to [CHANGELOG.md](./CHANGELOG.md).
3. Commit and push to `master`.
4. Create a GitHub Release with the tag `vX.Y.Z`. That tags the commit and triggers
   the publish workflow (`.github/workflows/publish.yml`).
5. Approve the `release` deployment when the run pauses for review. The workflow then
   builds, runs the test suite, and publishes with `npm publish --provenance`.

Notes:

- `v*` tags are protected by a repository ruleset; only admins can create them.
- For an out-of-band publish you can also run the workflow manually
  (`gh workflow run publish.yml --ref master`), which still requires the same approval.
- Requirements baked into the workflow: npm >= 11.5.1, Node 22, and `id-token: write`.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT © Kayhan Babaee
