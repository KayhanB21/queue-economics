/**
 * A small, deterministic discrete-event simulator for an M/M/c queue.
 *
 * The analytic formulas already give exact percentiles, so this is not for
 * accuracy: it is here to *demonstrate* that the closed-form curve is real and
 * not an artifact of working with means (the same check Brooker ran). It uses a
 * seeded LCG so a given seed always produces the same numbers, which keeps tests
 * and on-page replays stable.
 */

export interface SimulateInput {
  lambda: number;
  Ts: number;
  c: number;
  /** Number of arrivals to simulate. Default 100_000. */
  arrivals?: number;
  /** Seed for the LCG. Default 1. */
  seed?: number;
  /** Fraction of initial arrivals to discard as warm-up. Default 0.05. */
  warmupFraction?: number;
}

export interface SimulateResult {
  /** Number of arrivals counted (after warm-up). */
  samples: number;
  /** Fraction of arrivals that had to wait (empirical Erlang C). */
  waitProbability: number;
  /** Mean waiting time. */
  meanWaitTime: number;
  /** Median (p50) waiting time, including the zeros. */
  p50WaitTime: number;
  /** p90 waiting time. */
  p90WaitTime: number;
  /** p99 waiting time. */
  p99WaitTime: number;
}

/** Linear congruential generator (Numerical Recipes constants). */
function makeRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function exponential(rng: () => number, rate: number): number {
  // 1 − u avoids log(0).
  return -Math.log(1 - rng()) / rate;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
  return sorted[idx]!;
}

/**
 * Simulate an M/M/c FCFS queue and return empirical wait-time statistics.
 *
 * Each arrival is assigned to the server that frees up earliest; an arrival
 * waits only if every server is still busy at its arrival instant. That rule is
 * exactly FCFS with c interchangeable servers.
 */
export function simulateMMc(input: SimulateInput): SimulateResult {
  const { lambda, Ts, c } = input;
  const arrivals = input.arrivals ?? 100_000;
  const seed = input.seed ?? 1;
  const warmupFraction = input.warmupFraction ?? 0.05;

  if (!Number.isInteger(c) || c < 1) {
    throw new RangeError(`c must be a positive integer, got ${c}`);
  }
  if (lambda <= 0 || Ts <= 0) {
    throw new RangeError(`lambda and Ts must be positive`);
  }

  const rng = makeRng(seed);
  const mu = 1 / Ts;
  const freeAt = new Array<number>(c).fill(0); // time each server next becomes free
  const warmup = Math.floor(arrivals * warmupFraction);

  let now = 0;
  let waited = 0;
  const waits: number[] = [];

  for (let i = 0; i < arrivals; i++) {
    now += exponential(rng, lambda);

    // Find the earliest-free server.
    let best = 0;
    for (let s = 1; s < c; s++) {
      if (freeAt[s]! < freeAt[best]!) best = s;
    }

    const startService = Math.max(now, freeAt[best]!);
    const wait = startService - now;
    freeAt[best] = startService + exponential(rng, mu);

    if (i >= warmup) {
      waits.push(wait);
      if (wait > 0) waited++;
    }
  }

  const samples = waits.length;
  const mean = samples === 0 ? 0 : waits.reduce((acc, w) => acc + w, 0) / samples;
  const sorted = [...waits].sort((x, y) => x - y);

  return {
    samples,
    waitProbability: samples === 0 ? 0 : waited / samples,
    meanWaitTime: mean,
    p50WaitTime: quantile(sorted, 0.5),
    p90WaitTime: quantile(sorted, 0.9),
    p99WaitTime: quantile(sorted, 0.99),
  };
}
