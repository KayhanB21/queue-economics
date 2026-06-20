import { describe, expect, test } from "bun:test";

import { experiencedWaitTime, meanWaitTime, waitTimeVariance } from "./metrics";
import { sizeBiasedMean } from "./experience";

describe("sizeBiasedMean", () => {
  test("equals the mean when there is no variance", () => {
    expect(sizeBiasedMean(5, 0)).toBe(5);
  });

  test("for an exponential (variance = mean^2) it doubles the mean", () => {
    const m = 3;
    expect(sizeBiasedMean(m, m * m)).toBeCloseTo(2 * m, 12);
  });

  test("Brooker's recovery-time example: ~6h experienced from a ~1h mean", () => {
    // Illustrative heavy-tailed recovery times (minutes): the experienced mean
    // is far above the plain mean once variance dominates.
    const mean = 70;
    const variance = 290 * 290; // large spread from the long tail
    expect(sizeBiasedMean(mean, variance)).toBeGreaterThan(360); // > 6 hours
  });

  test("rejects non-positive mean or negative variance", () => {
    expect(() => sizeBiasedMean(0, 1)).toThrow();
    expect(() => sizeBiasedMean(5, -1)).toThrow();
  });
});

describe("experiencedWaitTime (M/M/c)", () => {
  const params = { lambda: 8, Ts: 1, c: 10 };

  test("equals 2·Ts/(c − a), twice the conditional mean wait", () => {
    const a = params.lambda * params.Ts;
    expect(experiencedWaitTime(params)).toBeCloseTo(
      (2 * params.Ts) / (params.c - a),
      9,
    );
  });

  test("matches sizeBiasedMean(meanWait, varWait)", () => {
    expect(experiencedWaitTime(params)).toBeCloseTo(
      sizeBiasedMean(meanWaitTime(params), waitTimeVariance(params)),
      9,
    );
  });

  test("is always at least the plain mean wait", () => {
    for (const c of [11, 14, 20, 40]) {
      const p = { lambda: 8, Ts: 1, c };
      expect(experiencedWaitTime(p)).toBeGreaterThanOrEqual(meanWaitTime(p) - 1e-12);
    }
  });

  test("variance is non-negative and finite for a stable system", () => {
    const v = waitTimeVariance(params);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(v)).toBe(true);
  });

  test("no waiting at zero load means zero experienced wait", () => {
    expect(experiencedWaitTime({ lambda: 0, Ts: 1, c: 4 })).toBe(0);
  });
});
