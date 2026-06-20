/**
 * queue-economics — queueing-theory math for the economics of scale.
 *
 * Erlang B/C, M/M/c latency and percentiles, pool consolidation (split vs
 * merge), the square-root staffing rule, and a deterministic simulator.
 * Zero runtime dependencies, edge-safe.
 */

export { erlangB, erlangC, utilization } from "./erlang";

export {
  type MMcParams,
  type MMcMetrics,
  offeredLoad,
  waitProbability,
  meanWaitTime,
  meanResponseTime,
  waitTimeTail,
  waitQuantile,
  mmcMetrics,
} from "./metrics";

export {
  serversForWaitProbability,
  serversForWaitQuantile,
  delayProbabilityForBeta,
  betaForDelayProbability,
  squareRootStaffing,
  type SquareRootStaffing,
} from "./planning";

export {
  consolidationComparison,
  type ConsolidationInput,
  type ConsolidationResult,
} from "./consolidate";

export { simulateMMc, type SimulateInput, type SimulateResult } from "./simulate";

export { normalPdf, normalCdf, erf } from "./normal";
