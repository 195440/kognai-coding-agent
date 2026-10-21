import test from "node:test";
import assert from "node:assert/strict";
import { createLedger } from "./ledger.ts";

test("Q4: createLedger handles idempotency, conflicts, and account cap atomically", () => {
  const ledger = createLedger({ cap: "1000" });
  assert.equal(ledger.balance("alice"), "0");

  const p1 = ledger.post({ key: "k1", account: "alice", amount: "400" });
  assert.equal(p1.duplicate, false);
  assert.equal(ledger.balance("alice"), "400");

  const p1Dup = ledger.post({ key: "k1", account: "alice", amount: "400" });
  assert.equal(p1Dup.duplicate, true);
  assert.equal(p1Dup.id, p1.id);
  assert.equal(ledger.balance("alice"), "400");

  assert.throws(() => ledger.post({ key: "k1", account: "alice", amount: "500" }));
  assert.throws(() => ledger.post({ key: "k1", account: "bob", amount: "400" }));
  assert.throws(() => ledger.post({ key: "k2", account: "alice", amount: "601" }));
  assert.equal(ledger.balance("alice"), "400");
});
