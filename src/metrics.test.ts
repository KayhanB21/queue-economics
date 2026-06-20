import { describe, expect, test } from "bun:test";

import {
  meanResponseTime,
  meanWaitTime,
  mmcMetrics,
  offeredLoad,
  waitProbability,
  waitQuantile,
  waitTimeTail,
} from "./metrics";

describe("metrics — M/M/1 sanity", () => {
  const params = { lambda: 0.5, Ts: 1, c: 1 };

  test("offered load is lambda · Ts", () => {
    expect(offeredLoad(params)).toBeCloseTo(0.5, 12);
  });

  test("wait probability equals rho", () => {
    expect(waitProbability(params)).toBeCloseTo(0.5, 12);
  });

  test("mean wait Wq = rho / (mu − lambda)", () => {
    // rho=0.5, mu=1, lambda=0.5 → Wq = 0.5 / 0.5 = 1.
    expect(meanWaitTime(params)).toBeCloseTo(1, 12);
  });

  test("mean response time = Wq + Ts", () => {
    expect(meanResponseTime(params)).toBeCloseTo(2, 12);
  });
});

describe("waitTimeTail", () => {
  const params = { lambda: 8, Ts: 1, c: 10 };

  test("tail at t=0 equals the wait probability", () => {
    expect(waitTimeTail(params, 0)).toBeCloseTo(waitProbability(params), 12);
  });

  test("is non-increasing in t and bounded by [0, 1]", () => {
    let prev = waitTimeTail(params, 0);
    for (const t of [0.1, 0.5, 1, 2, 5]) {
      const v = waitTimeTail(params, t);
      expect(v).toBeLessThanOrEqual(prev);
      expect(v).toBeGreaterThanOrEqual(0);
      prev = v;
    }
  });

  test("unstable system always waits", () => {
    expect(waitTimeTail({ lambda: 10, Ts: 1, c: 10 }, 3)).toBe(1);
  });
});

describe("waitQuantile", () => {
  const params = { lambda: 8, Ts: 1, c: 10 };

  test("inverts the tail: P(Wait > waitQuantile(q)) ≈ 1 − q", () => {
    for (const q of [0.5, 0.9, 0.99]) {
      const t = waitQuantile(params, q);
      if (t > 0) expect(waitTimeTail(params, t)).toBeCloseTo(1 - q, 6);
    }
  });

  test("is zero when the (1 − q) tail is no larger than the wait probability", () => {
    // p50 wait should be 0 whenever fewer than half the arrivals wait.
    const pw = waitProbability(params);
    expect(pw).toBeLessThan(0.5);
    expect(waitQuantile(params, 0.5)).toBe(0);
  });

  test("is non-decreasing in q", () => {
    let prev = -1;
    for (const q of [0, 0.5, 0.9, 0.99, 0.999]) {
      const v = waitQuantile(params, q);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("mmcMetrics bundle", () => {
  test("reports utilization and stability", () => {
    const m = mmcMetrics({ lambda: 8, Ts: 1, c: 10 });
    expect(m.utilization).toBeCloseTo(0.8, 12);
    expect(m.stable).toBe(true);
    expect(m.offeredLoad).toBeCloseTo(8, 12);
  });
});

describe("validation", () => {
  test("rejects nonsensical inputs", () => {
    expect(() => waitProbability({ lambda: -1, Ts: 1, c: 1 })).toThrow();
    expect(() => waitProbability({ lambda: 1, Ts: 0, c: 1 })).toThrow();
    expect(() => waitProbability({ lambda: 1, Ts: 1, c: 0 })).toThrow();
    expect(() => waitQuantile({ lambda: 1, Ts: 1, c: 2 }, 1)).toThrow();
  });
});
