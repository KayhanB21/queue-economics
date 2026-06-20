/**
 * The inspection paradox (a.k.a. length-biasing).
 *
 * Whoever does the waiting samples a distribution weighted by duration, not by
 * count: most of the time anyone spends waiting is spent inside the long events.
 * So the average wait *as experienced* is larger than the plain average:
 *
 *     E_a[X] = E[X²] / E[X] = E[X] + Var(X) / E[X]
 *
 * See Marc Brooker, "Meet Alice. Alice is impatient." (2026-06-19).
 */

/**
 * Size-biased (experienced) mean of a non-negative quantity, from its mean and
 * variance: mean + variance / mean. For a constant (zero variance) it equals the
 * mean; the more variable the quantity, the worse the experienced average.
 */
export function sizeBiasedMean(mean: number, variance: number): number {
  if (!Number.isFinite(mean) || mean <= 0) {
    throw new RangeError(`mean must be positive, got ${mean}`);
  }
  if (!Number.isFinite(variance) || variance < 0) {
    throw new RangeError(`variance must be non-negative, got ${variance}`);
  }
  return mean + variance / mean;
}
