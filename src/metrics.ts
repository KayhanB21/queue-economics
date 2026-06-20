/**
 * Latency metrics for an M/M/c queue, in real-world units.
 *
 * Inputs are the things an engineer actually has: an arrival rate `lambda`
 * (requests per second), a mean service time `Ts` (seconds per request), and a
 * server count `c`. Everything else is derived.
 *
 * A nice property of M/M/c: the waiting-time distribution has a closed form, so
 * percentiles (p50, p99, ...) are exact, not just simulated estimates. The
 * waiting time has an atom of mass (1 − C) at zero (the lucky arrivals that
 * never wait) and is exponential above that:
 *
 *     P(Wait > t) = C · exp( −(c·mu − lambda) · t )
 */

import { erlangC, utilization } from "./erlang";
import { sizeBiasedMean } from "./experience";

export interface MMcParams {
  /** Arrival rate (requests per unit time). */
  lambda: number;
  /** Mean service time (time per request). mu = 1 / Ts. */
  Ts: number;
  /** Number of servers. */
  c: number;
}

export interface MMcMetrics {
  /** Offered load in Erlangs: a = lambda · Ts. */
  offeredLoad: number;
  /** Per-server utilization rho = a / c. */
  utilization: number;
  /** Probability an arrival has to wait (Erlang C). */
  waitProbability: number;
  /** Mean time spent waiting in the queue (Wq). */
  meanWaitTime: number;
  /** Mean total time in system: waiting + service (W = Wq + Ts). */
  meanResponseTime: number;
  /** Whether the system is stable (a < c). */
  stable: boolean;
}

function validate({ lambda, Ts, c }: MMcParams): void {
  if (!Number.isFinite(lambda) || lambda < 0) {
    throw new RangeError(`lambda must be a non-negative number, got ${lambda}`);
  }
  if (!Number.isFinite(Ts) || Ts <= 0) {
    throw new RangeError(`Ts (mean service time) must be positive, got ${Ts}`);
  }
  if (!Number.isInteger(c) || c < 1) {
    throw new RangeError(`c (server count) must be a positive integer, got ${c}`);
  }
}

/** Offered load in Erlangs: a = lambda · Ts. */
export function offeredLoad(params: MMcParams): number {
  validate(params);
  return params.lambda * params.Ts;
}

/** Probability an arrival has to wait (Erlang C). */
export function waitProbability(params: MMcParams): number {
  return erlangC(params.c, offeredLoad(params));
}

/**
 * Mean waiting time in the queue (Wq).
 *
 * Wq = C / (c·mu − lambda) = C · Ts / (c − a). Infinite if the system is
 * unstable (a >= c).
 */
export function meanWaitTime(params: MMcParams): number {
  const a = offeredLoad(params);
  const { Ts, c } = params;
  if (a >= c) return Infinity;
  const c_ = erlangC(c, a);
  return (c_ * Ts) / (c - a);
}

/** Mean total response time: waiting plus service (W = Wq + Ts). */
export function meanResponseTime(params: MMcParams): number {
  return meanWaitTime(params) + params.Ts;
}

/**
 * Tail of the waiting-time distribution: P(Wait > t).
 *
 * Exact for M/M/c: C · exp( −(c·mu − lambda) · t ). Returns 1 for an unstable
 * system, and is defined for t >= 0.
 */
export function waitTimeTail(params: MMcParams, t: number): number {
  if (t < 0) throw new RangeError(`t must be >= 0, got ${t}`);
  const a = offeredLoad(params);
  const { Ts, c } = params;
  if (a >= c) return 1;
  const c_ = erlangC(c, a);
  // (c·mu − lambda) = (c − a) / Ts.
  const rate = (c - a) / Ts;
  return c_ * Math.exp(-rate * t);
}

/**
 * The q-quantile of waiting time (e.g. q = 0.99 for p99 wait).
 *
 * If the (1 − q) tail is no larger than the wait probability C, the quantile is
 * 0 (that percentile of arrivals does not wait at all). Otherwise it inverts the
 * exponential tail: t = Ts / (c − a) · ln( C / (1 − q) ).
 */
export function waitQuantile(params: MMcParams, q: number): number {
  if (!(q >= 0 && q < 1)) {
    throw new RangeError(`quantile q must be in [0, 1), got ${q}`);
  }
  const a = offeredLoad(params);
  const { Ts, c } = params;
  if (a >= c) return Infinity;
  const c_ = erlangC(c, a);
  const tail = 1 - q;
  if (tail >= c_) return 0;
  return (Ts / (c - a)) * Math.log(c_ / tail);
}

/**
 * Variance of the waiting time. The wait is a mixture: mass (1 − C) at zero, and
 * with probability C an exponential of rate eta = (c − a)/Ts. That gives
 * Var = C·(2 − C) / eta^2. Infinite for an unstable system.
 */
export function waitTimeVariance(params: MMcParams): number {
  const a = offeredLoad(params);
  const { Ts, c } = params;
  if (a >= c) return Infinity;
  const c_ = erlangC(c, a);
  const eta = (c - a) / Ts;
  return (c_ * (2 - c_)) / (eta * eta);
}

/**
 * The waiting time as *experienced* by arrivals (the inspection paradox): the
 * size-biased mean E[W] + Var(W)/E[W]. For M/M/c this works out to exactly
 * 2·Ts/(c − a), i.e. twice the conditional mean wait, independent of how often
 * arrivals wait. See Brooker, "Meet Alice. Alice is impatient." (2026-06-19).
 */
export function experiencedWaitTime(params: MMcParams): number {
  const mean = meanWaitTime(params);
  if (!Number.isFinite(mean)) return Infinity;
  if (mean <= 0) return 0;
  return sizeBiasedMean(mean, waitTimeVariance(params));
}

/** Bundle of the common metrics for one set of parameters. */
export function mmcMetrics(params: MMcParams): MMcMetrics {
  const a = offeredLoad(params);
  return {
    offeredLoad: a,
    utilization: utilization(params.c, a),
    waitProbability: erlangC(params.c, a),
    meanWaitTime: meanWaitTime(params),
    meanResponseTime: meanResponseTime(params),
    stable: a < params.c,
  };
}
