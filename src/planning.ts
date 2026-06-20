/**
 * Capacity planning: go from a service-level target to a server count, plus the
 * square-root staffing rule that explains *why* big pools need proportionally
 * less slack.
 */

import { erlangC } from "./erlang";
import { waitQuantile, type MMcParams } from "./metrics";
import { normalCdf, normalPdf } from "./normal";

const MAX_SERVERS = 100_000;

/**
 * Smallest server count `c` whose Erlang C wait probability is at or below
 * `target`, for offered load `a` (Erlangs). Wait probability is monotonically
 * decreasing in `c`, so a simple upward scan from the stability floor finds it.
 */
export function serversForWaitProbability(a: number, target: number): number {
  if (!Number.isFinite(a) || a < 0) {
    throw new RangeError(`offered load must be non-negative, got ${a}`);
  }
  if (!(target > 0 && target <= 1)) {
    throw new RangeError(`target wait probability must be in (0, 1], got ${target}`);
  }
  let c = Math.max(1, Math.floor(a) + 1); // must have c > a for stability.
  while (c < MAX_SERVERS) {
    if (erlangC(c, a) <= target) return c;
    c++;
  }
  return MAX_SERVERS;
}

/**
 * Smallest server count `c` such that the q-quantile of waiting time is at or
 * below `t` seconds. Equivalent to bounding P(Wait > t) at (1 − q).
 */
export function serversForWaitQuantile(
  lambda: number,
  Ts: number,
  t: number,
  q: number,
): number {
  if (t < 0) throw new RangeError(`t must be >= 0, got ${t}`);
  const a = lambda * Ts;
  let c = Math.max(1, Math.floor(a) + 1);
  while (c < MAX_SERVERS) {
    const params: MMcParams = { lambda, Ts, c };
    if (waitQuantile(params, q) <= t) return c;
    c++;
  }
  return MAX_SERVERS;
}

/**
 * Halfin-Whitt limiting delay probability for staffing c = a + beta·sqrt(a):
 *
 *     alpha(beta) = [ 1 + beta · Phi(beta) / phi(beta) ]^(-1)
 *
 * As beta grows the delay probability shrinks. This is the asymptotic backbone
 * of the square-root staffing rule.
 */
export function delayProbabilityForBeta(beta: number): number {
  const ratio = (beta * normalCdf(beta)) / normalPdf(beta);
  return 1 / (1 + ratio);
}

/**
 * Invert `delayProbabilityForBeta`: find the quality-of-service parameter beta
 * that yields a target delay probability, via bisection. alpha is decreasing in
 * beta, so the search is well behaved.
 */
export function betaForDelayProbability(target: number): number {
  if (!(target > 0 && target < 1)) {
    throw new RangeError(`target delay probability must be in (0, 1), got ${target}`);
  }
  let lo = 0; // alpha(0) = 1 (everyone waits).
  let hi = 8; // alpha(8) is effectively 0.
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (delayProbabilityForBeta(mid) > target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export interface SquareRootStaffing {
  /** Offered load in Erlangs. */
  offeredLoad: number;
  /** Quality-of-service parameter beta for the target delay probability. */
  beta: number;
  /** Safety margin beta·sqrt(a) of spare servers above the bare load. */
  safetyMargin: number;
  /** Recommended server count: ceil(a + beta·sqrt(a)). */
  servers: number;
}

/**
 * The square-root staffing rule: to hit a target delay probability, staff
 *
 *     c ≈ a + beta · sqrt(a)
 *
 * The key, non-obvious consequence: the *safety margin* grows like sqrt(load),
 * not linearly, so a 100x bigger system needs only ~10x the absolute slack (and
 * proportionally far less). That is the engine behind the economies of scale.
 */
export function squareRootStaffing(a: number, targetDelayProbability: number): SquareRootStaffing {
  if (!Number.isFinite(a) || a < 0) {
    throw new RangeError(`offered load must be non-negative, got ${a}`);
  }
  const beta = betaForDelayProbability(targetDelayProbability);
  const safetyMargin = beta * Math.sqrt(a);
  return {
    offeredLoad: a,
    beta,
    safetyMargin,
    servers: Math.max(1, Math.ceil(a + safetyMargin)),
  };
}
