# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project follows
[Semantic Versioning](https://semver.org/).

## [0.2.3] - 2026-06-20

### Added

- `responseTimeTail` and `responseQuantile`: exact end-to-end response (sojourn) time
  tail and percentiles, including service, not just queue wait.
- `consolidationComparison` now also returns `serversPerPoolToMatchMerged` and
  `extraServersFromSplitting`, the cost of staying split instead of merging.
- `mmcMetrics` now includes `waitTimeVariance` and `experiencedWaitTime`.

### Docs

- README links the full write-up at the top.

## [0.2.2] - 2026-06-20

### Changed

- Docs: add npm version, downloads, and license badges plus package links to the README.
- CI: publish through a protected `release` GitHub environment that requires review
  before the OIDC publish runs.

## [0.2.1] - 2026-06-20

### Added

- Inspection-paradox helpers for the wait users actually feel: `sizeBiasedMean(mean, variance)`,
  `waitTimeVariance(params)`, and `experiencedWaitTime(params)`. For M/M/c the experienced
  wait is exactly `2 * Ts / (c - a)`, twice the conditional mean wait.

## [0.2.0] - 2026-06-20

### Added

- Initial release.
- Erlang B and Erlang C via the numerically stable recursion (safe past hundreds of servers).
- M/M/c metrics in real units: wait probability, mean wait, mean response time, and exact
  waiting-time tail and percentiles.
- `consolidationComparison`: N independent pools versus one merged pool at equal utilization.
- Capacity planning: `serversForWaitProbability`, `serversForWaitQuantile`, and the
  Halfin-Whitt `squareRootStaffing` rule.
- `simulateMMc`: a seeded discrete-event simulator for validating the analytic curve.

[0.2.3]: https://github.com/KayhanB21/queue-economics/releases/tag/v0.2.3
[0.2.2]: https://github.com/KayhanB21/queue-economics/releases/tag/v0.2.2
[0.2.1]: https://github.com/KayhanB21/queue-economics/releases/tag/v0.2.1
[0.2.0]: https://github.com/KayhanB21/queue-economics/releases/tag/v0.2.0
