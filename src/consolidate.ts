/**
 * The core "split vs merge" comparison: N independent pools versus one merged
 * pool at the *same* total utilization. This is the surprise from Brooker's post
 * made concrete: merging holds per-server utilization fixed yet collapses the
 * wait probability and the tail latency.
 */

import { mmcMetrics, waitQuantile, type MMcMetrics, type MMcParams } from "./metrics";

export interface ConsolidationInput {
  /** Number of independent pools (N). */
  pools: number;
  /** Arrival rate handled by each pool. */
  perPoolLambda: number;
  /** Mean service time (shared across all pools). */
  Ts: number;
  /** Servers in each pool (c). The merged pool has N·c servers. */
  serversPerPool: number;
  /**
   * Quantile to report for tail latency (default 0.99 = p99 wait). The merged
   * pool serves N·lambda with N·c servers, so utilization is identical to a
   * single split pool.
   */
  quantile?: number;
}

export interface ConsolidationResult {
  /** Per-server utilization, identical for split and merged by construction. */
  utilization: number;
  /** Metrics for one of the N independent pools. */
  split: MMcMetrics & { waitQuantile: number };
  /** Metrics for the single merged pool of N·c servers. */
  merged: MMcMetrics & { waitQuantile: number };
  /** Wait-probability reduction from merging (split − merged). */
  waitProbabilityDrop: number;
  /** Tail-latency reduction from merging (split − merged), for the chosen quantile. */
  waitQuantileDrop: number;
}

function validate(input: ConsolidationInput): void {
  if (!Number.isInteger(input.pools) || input.pools < 1) {
    throw new RangeError(`pools must be a positive integer, got ${input.pools}`);
  }
  if (!Number.isInteger(input.serversPerPool) || input.serversPerPool < 1) {
    throw new RangeError(
      `serversPerPool must be a positive integer, got ${input.serversPerPool}`,
    );
  }
}

function withQuantile(params: MMcParams, q: number): MMcMetrics & { waitQuantile: number } {
  return { ...mmcMetrics(params), waitQuantile: waitQuantile(params, q) };
}

/**
 * Compare N independent M/M/c pools against one merged M/M/(N·c) pool at the
 * same total utilization.
 */
export function consolidationComparison(input: ConsolidationInput): ConsolidationResult {
  validate(input);
  const q = input.quantile ?? 0.99;
  const { pools, perPoolLambda, Ts, serversPerPool } = input;

  const split = withQuantile({ lambda: perPoolLambda, Ts, c: serversPerPool }, q);
  const merged = withQuantile(
    { lambda: perPoolLambda * pools, Ts, c: serversPerPool * pools },
    q,
  );

  return {
    utilization: split.utilization,
    split,
    merged,
    waitProbabilityDrop: split.waitProbability - merged.waitProbability,
    waitQuantileDrop: split.waitQuantile - merged.waitQuantile,
  };
}
