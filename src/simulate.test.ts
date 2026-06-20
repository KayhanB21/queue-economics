import { describe, expect, test } from "bun:test";

import { mmcMetrics, waitProbability } from "./metrics";
import { simulateMMc } from "./simulate";

describe("simulateMMc", () => {
  const params = { lambda: 8, Ts: 1, c: 10 }; // rho = 0.8

  test("is deterministic for a fixed seed", () => {
    const a = simulateMMc({ ...params, arrivals: 20_000, seed: 7 });
    const b = simulateMMc({ ...params, arrivals: 20_000, seed: 7 });
    expect(a.meanWaitTime).toBe(b.meanWaitTime);
    expect(a.waitProbability).toBe(b.waitProbability);
  });

  test("empirical wait probability converges to the analytic Erlang C", () => {
    const sim = simulateMMc({ ...params, arrivals: 120_000, seed: 42 });
    const analytic = waitProbability(params);
    expect(sim.waitProbability).toBeCloseTo(analytic, 1); // within ~0.05
  });

  test("empirical mean wait converges to the analytic Wq", () => {
    const sim = simulateMMc({ ...params, arrivals: 120_000, seed: 42 });
    const analytic = mmcMetrics(params).meanWaitTime;
    const relErr = Math.abs(sim.meanWaitTime - analytic) / analytic;
    expect(relErr).toBeLessThan(0.15);
  });

  test("percentiles are ordered p50 <= p90 <= p99", () => {
    const sim = simulateMMc({ ...params, arrivals: 60_000, seed: 3 });
    expect(sim.p50WaitTime).toBeLessThanOrEqual(sim.p90WaitTime);
    expect(sim.p90WaitTime).toBeLessThanOrEqual(sim.p99WaitTime);
  });

  test("the economies of scale show up in simulation too", () => {
    // Same utilization (0.8), bigger pool → lower empirical wait probability.
    const small = simulateMMc({ lambda: 4, Ts: 1, c: 5, arrivals: 80_000, seed: 11 });
    const big = simulateMMc({ lambda: 32, Ts: 1, c: 40, arrivals: 80_000, seed: 11 });
    expect(big.waitProbability).toBeLessThan(small.waitProbability);
  });
});
