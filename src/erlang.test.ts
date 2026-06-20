import { describe, expect, test } from "bun:test";

import { erlangB, erlangC, utilization } from "./erlang";

/**
 * Independent reference implementations using the textbook factorial closed
 * forms. These overflow for large c, so we only use them to cross-check the
 * stable recursion on small systems where the closed form is trustworthy.
 */
function factorial(n: number): number {
  let f = 1;
  for (let k = 2; k <= n; k++) f *= k;
  return f;
}

function erlangBClosedForm(c: number, a: number): number {
  let num = Math.pow(a, c) / factorial(c);
  let denom = 0;
  for (let k = 0; k <= c; k++) denom += Math.pow(a, k) / factorial(k);
  return num / denom;
}

function erlangCClosedForm(c: number, a: number): number {
  const rho = a / c;
  const top = (Math.pow(a, c) / factorial(c)) * (1 / (1 - rho));
  let sum = 0;
  for (let k = 0; k < c; k++) sum += Math.pow(a, k) / factorial(k);
  return top / (sum + top);
}

describe("erlangB", () => {
  test("known small exact values", () => {
    expect(erlangB(1, 1)).toBeCloseTo(0.5, 12);
    expect(erlangB(2, 1)).toBeCloseTo(0.2, 12);
    expect(erlangB(3, 1)).toBeCloseTo(0.0625, 12);
  });

  test("zero load means no blocking for c >= 1", () => {
    expect(erlangB(5, 0)).toBe(0);
  });

  test("zero servers block everything", () => {
    expect(erlangB(0, 4)).toBe(1);
  });

  test("matches the factorial closed form across a grid", () => {
    for (let c = 1; c <= 20; c++) {
      for (const a of [0.5, 1, 3, 7, 12, 18]) {
        expect(erlangB(c, a)).toBeCloseTo(erlangBClosedForm(c, a), 9);
      }
    }
  });
});

describe("erlangC", () => {
  test("M/M/1 wait probability equals utilization", () => {
    expect(erlangC(1, 0.5)).toBeCloseTo(0.5, 12);
    expect(erlangC(1, 0.8)).toBeCloseTo(0.8, 12);
  });

  test("known M/M/2 value", () => {
    expect(erlangC(2, 1)).toBeCloseTo(1 / 3, 12);
  });

  test("returns 1 for an unstable system (a >= c)", () => {
    expect(erlangC(4, 4)).toBe(1);
    expect(erlangC(4, 9)).toBe(1);
  });

  test("matches the factorial closed form across a grid", () => {
    for (let c = 1; c <= 20; c++) {
      for (const a of [0.3, 1, 4, 8, 15]) {
        if (a >= c) continue;
        expect(erlangC(c, a)).toBeCloseTo(erlangCClosedForm(c, a), 9);
      }
    }
  });

  test("Brooker's result: at fixed utilization, doubling the pool cuts the wait probability sharply", () => {
    // rho = 0.8 throughout (a = 0.8 c).
    const small = erlangC(5, 4);
    const medium = erlangC(10, 8);
    const large = erlangC(20, 16);
    const huge = erlangC(40, 32);
    expect(medium).toBeLessThan(small);
    expect(large).toBeLessThan(medium);
    expect(huge).toBeLessThan(large);
    // The effect is large, not marginal: 8x the pool is multiple times better.
    expect(huge).toBeLessThan(small / 3);
  });

  test("monotonic: decreasing in c at fixed load, increasing in load at fixed c", () => {
    let prev = 1;
    for (let c = 10; c <= 30; c++) {
      const v = erlangC(c, 8);
      expect(v).toBeLessThan(prev);
      prev = v;
    }
    let last = 0;
    for (const a of [2, 4, 6, 8, 9.5]) {
      const v = erlangC(10, a);
      expect(v).toBeGreaterThan(last);
      last = v;
    }
  });

  test("numerically stable for large server counts (no overflow / NaN)", () => {
    for (const c of [200, 500, 1000]) {
      const v = erlangC(c, c * 0.85);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("utilization", () => {
  test("is a / c", () => {
    expect(utilization(10, 8)).toBeCloseTo(0.8, 12);
  });
});
