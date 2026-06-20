import { describe, expect, test } from "bun:test";

import { erlangC } from "./erlang";
import {
  betaForDelayProbability,
  delayProbabilityForBeta,
  serversForWaitProbability,
  serversForWaitQuantile,
  squareRootStaffing,
} from "./planning";
import { waitQuantile } from "./metrics";

describe("serversForWaitProbability", () => {
  test("returns the smallest c that meets the target", () => {
    const a = 8;
    const target = 0.1;
    const c = serversForWaitProbability(a, target);
    expect(erlangC(c, a)).toBeLessThanOrEqual(target);
    // One fewer server must miss the target (or be unstable).
    expect(erlangC(c - 1, a)).toBeGreaterThan(target);
  });

  test("needs at least ceil(a)+1 servers for stability", () => {
    expect(serversForWaitProbability(8, 0.99)).toBeGreaterThan(8);
  });
});

describe("serversForWaitQuantile", () => {
  test("returns the smallest c whose p99 wait is within the bound", () => {
    const lambda = 8;
    const Ts = 1;
    const t = 0.5;
    const q = 0.99;
    const c = serversForWaitQuantile(lambda, Ts, t, q);
    expect(waitQuantile({ lambda, Ts, c }, q)).toBeLessThanOrEqual(t);
    expect(waitQuantile({ lambda, Ts, c: c - 1 }, q)).toBeGreaterThan(t);
  });
});

describe("Halfin-Whitt delay probability", () => {
  test("betaForDelayProbability inverts delayProbabilityForBeta", () => {
    for (const target of [0.1, 0.3, 0.5, 0.7]) {
      const beta = betaForDelayProbability(target);
      expect(delayProbabilityForBeta(beta)).toBeCloseTo(target, 6);
    }
  });

  test("delay probability decreases as beta (more slack) grows", () => {
    // alpha(0) = 1 exactly (with c ~ a, essentially everyone waits).
    expect(delayProbabilityForBeta(0)).toBeCloseTo(1, 12);
    let prev = delayProbabilityForBeta(0);
    for (const beta of [0.5, 1, 2, 3]) {
      const v = delayProbabilityForBeta(beta);
      expect(v).toBeLessThan(prev);
      prev = v;
    }
  });
});

describe("squareRootStaffing", () => {
  test("safety margin grows like sqrt(load), so big systems need proportionally less slack", () => {
    const target = 0.5;
    const small = squareRootStaffing(100, target);
    const big = squareRootStaffing(10_000, target); // 100x the load
    // Absolute slack grows ~10x (sqrt of 100x), not 100x.
    const ratio = big.safetyMargin / small.safetyMargin;
    expect(ratio).toBeGreaterThan(8);
    expect(ratio).toBeLessThan(12);
    // Slack as a *fraction* of load shrinks by ~10x.
    const smallFraction = small.safetyMargin / small.offeredLoad;
    const bigFraction = big.safetyMargin / big.offeredLoad;
    expect(bigFraction).toBeLessThan(smallFraction / 8);
  });

  test("approximates the exact Erlang C server count for large load", () => {
    const a = 500;
    const target = 0.5;
    const approx = squareRootStaffing(a, target).servers;
    const exact = serversForWaitProbability(a, target);
    // The asymptotic rule should land within a handful of servers of exact.
    expect(Math.abs(approx - exact)).toBeLessThanOrEqual(5);
  });
});
