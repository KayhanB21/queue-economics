/**
 * Erlang B and Erlang C, computed with the numerically stable recursion.
 *
 * The textbook closed forms use factorials and powers that overflow IEEE double
 * precision past roughly 170 servers. The Erlang B recursion below stays bounded
 * in [0, 1] by construction, so it is safe for hundreds (or thousands) of
 * servers. Erlang C is then derived from Erlang B, which avoids any large sums.
 *
 * Throughout, `a` is the offered load in Erlangs: a = lambda / mu = lambda * Ts,
 * where lambda is the arrival rate and Ts = 1/mu is the mean service time.
 */

function assertServerCount(c: number): void {
  if (!Number.isInteger(c) || c < 0) {
    throw new RangeError(`server count must be a non-negative integer, got ${c}`);
  }
}

function assertLoad(a: number): void {
  if (!Number.isFinite(a) || a < 0) {
    throw new RangeError(`offered load must be a non-negative number, got ${a}`);
  }
}

/**
 * Erlang B blocking probability for an M/M/c/c loss system: the chance an
 * arrival finds all `c` servers busy and is rejected (no queue).
 *
 * Stable recursion: B(0) = 1; B(n) = a·B(n-1) / (n + a·B(n-1)).
 */
export function erlangB(c: number, a: number): number {
  assertServerCount(c);
  assertLoad(a);
  let b = 1; // B(0) = 1: with zero servers everything is blocked.
  for (let n = 1; n <= c; n++) {
    b = (a * b) / (n + a * b);
  }
  return b;
}

/**
 * Erlang C wait probability for an M/M/c queue: the chance an arrival finds all
 * `c` servers busy and has to wait in the queue (Erlang's "delay" formula).
 *
 * Derived from Erlang B as C = c·B / (c − a·(1 − B)). Requires a stable system
 * (a < c); for a >= c the queue grows without bound and the wait probability is
 * 1 in the limit.
 */
export function erlangC(c: number, a: number): number {
  assertServerCount(c);
  assertLoad(a);
  if (c === 0) return 1;
  if (a >= c) return 1;
  const b = erlangB(c, a);
  return (c * b) / (c - a * (1 - b));
}

/** Per-server utilization rho = a / c (the fraction of time each server is busy). */
export function utilization(c: number, a: number): number {
  assertServerCount(c);
  assertLoad(a);
  if (c === 0) return a > 0 ? Infinity : 0;
  return a / c;
}
