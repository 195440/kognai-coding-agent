import test from "node:test";
import assert from "node:assert/strict";
import { splitFees } from "./split.ts";

test("Q5-1: rejects negative total with exact message and accepts zero total", () => {
  assert.throws(() => splitFees(-1n, [100]), /negative total/);
  assert.throws(() => splitFees(-999999999999999999n, [50, 50]), /negative total/);
  assert.deepEqual(splitFees(0n, [60, 40]), [0n, 0n]);
});

test("Q5-2: rejects empty, non-integer, NaN, Infinity, or negative shares with bad shares", () => {
  assert.throws(() => splitFees(100n, []), /bad shares/);
  assert.throws(() => splitFees(100n, [-1, 101]), /bad shares/);
  assert.throws(() => splitFees(100n, [100, -5, 5]), /bad shares/);
  assert.throws(() => splitFees(100n, [50.5, 49.5]), /bad shares/);
  assert.throws(() => splitFees(100n, [Number.NaN, 100]), /bad shares/);
  assert.throws(() => splitFees(100n, [Number.POSITIVE_INFINITY, 100]), /bad shares/);
  assert.deepEqual(splitFees(100n, [0, 100]), [0n, 100n]);
});

test("Q5-3: rejects shares that do not sum to exactly 100", () => {
  assert.throws(() => splitFees(100n, [99]), /shares must sum to 100/);
  assert.throws(() => splitFees(100n, [101]), /shares must sum to 100/);
  assert.throws(() => splitFees(100n, [33, 33, 33]), /shares must sum to 100/);
  assert.throws(() => splitFees(100n, [50, 51]), /shares must sum to 100/);
});

test("Q5-4: splits exact and remainder-producing totals and assigns remainder to index 0", () => {
  assert.deepEqual(splitFees(100n, [50, 30, 20]), [50n, 30n, 20n]);
  // 100n split 33/33/34 -> floors [33n, 33n, 34n], remainder 0n
  assert.deepEqual(splitFees(100n, [33, 33, 34]), [33n, 33n, 34n]);
  // 101n split 33/33/34 -> floors [33n, 33n, 34n] = 100n, remainder 1n added to out[0] => [34n, 33n, 34n]
  assert.deepEqual(splitFees(101n, [33, 33, 34]), [34n, 33n, 34n]);
  // 1n split 0/50/50 -> floors [0n, 0n, 0n], remainder 1n added to out[0] => [1n, 0n, 0n]
  assert.deepEqual(splitFees(1n, [0, 50, 50]), [1n, 0n, 0n]);
  // Large bigint beyond Number.MAX_SAFE_INTEGER
  const huge = 100000000000000000000000003n;
  const res = splitFees(huge, [25, 25, 50]);
  assert.equal(res.reduce((a, b) => a + b, 0n), huge);
  assert.equal(res[0], 25000000000000000000000002n);
  assert.equal(res[1], 25000000000000000000000000n);
  assert.equal(res[2], 50000000000000000000000001n);
});

test("Q5-5: does not mutate the caller's shares array", () => {
  const input = [10, 20, 70];
  splitFees(123n, input);
  assert.deepEqual(input, [10, 20, 70]);
});
