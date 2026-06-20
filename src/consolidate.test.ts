import { describe, expect, test } from "bun:test";

import { consolidationComparison } from "./consolidate";

describe("consolidationComparison", () => {
  const input = {
    pools: 4,
    perPoolLambda: 8,
    Ts: 1,
    serversPerPool: 10,
  };

  test("split and merged run at identical utilization", () => {
    const r = consolidationComparison(input);
    expect(r.split.utilization).toBeCloseTo(0.8, 12);
    expect(r.merged.utilization).toBeCloseTo(r.split.utilization, 12);
  });

  test("merging strictly reduces the wait probability (the core invariant)", () => {
    const r = consolidationComparison(input);
    expect(r.merged.waitProbability).toBeLessThan(r.split.waitProbability);
    expect(r.waitProbabilityDrop).toBeGreaterThan(0);
  });

  test("merging reduces the p99 wait latency", () => {
    const r = consolidationComparison(input);
    expect(r.merged.waitQuantile).toBeLessThanOrEqual(r.split.waitQuantile);
    expect(r.waitQuantileDrop).toBeGreaterThanOrEqual(0);
  });

  test("more pools merged together help more", () => {
    const two = consolidationComparison({ ...input, pools: 2 });
    const eight = consolidationComparison({ ...input, pools: 8 });
    expect(eight.merged.waitProbability).toBeLessThan(two.merged.waitProbability);
  });

  test("rejects invalid pool or server counts", () => {
    expect(() => consolidationComparison({ ...input, pools: 0 })).toThrow();
    expect(() => consolidationComparison({ ...input, serversPerPool: 1.5 })).toThrow();
  });
});
