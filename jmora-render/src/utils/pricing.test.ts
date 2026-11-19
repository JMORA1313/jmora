import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTomanPrice } from './pricing';

test('calculateTomanPrice computes USD * 260,000 + 600,000 Toman by default', () => {
  assert.equal(calculateTomanPrice(2), 2 * 260_000 + 600_000);
  assert.equal(calculateTomanPrice(89), 89 * 260_000 + 600_000);
});

test('calculateTomanPrice supports dynamic admin rate and margin overrides', () => {
  assert.equal(calculateTomanPrice(10, 300_000, 500_000), 3_500_000);
  assert.equal(calculateTomanPrice(-5), 600_000);
});
