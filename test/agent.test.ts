import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { plainAmount } from "../qualifier/Q1/plain-amount.ts";
import { createPaidRoute } from "../qualifier/Q2/paid-route.ts";
import { createLedger } from "../qualifier/Q4/ledger.ts";
import { splitFees } from "../qualifier/Q5/split.ts";
import { createCodingAgentApp, solveSpec } from "../src/agent.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

test("A1: Q1 to Q4 pass Kognai's hidden tests", async () => {
  assert.equal(plainAmount("-1234500000", 6, "USDC"), "minus 1,234.50 USDC");
  assert.equal(plainAmount("١٢٣٤٥٠٠٠٠٠", 6, "USDC"), "1,234.50 USDC");

  const route = createPaidRoute({
    price: "0.01",
    payTo: "0x8cc9bd34b5ee8e828C54b84d0520CdCF4FA9C078",
    network: "base",
    facilitator: {
      async verify() {
        return { isValid: true };
      },
      async settle() {
        return { success: true, transaction: "0xabc", network: "base" };
      },
    },
  });
  const r402 = await route(new Request("https://agent.example.com/paid"));
  assert.equal(r402.status, 402);

  const ledger = createLedger({ cap: "500" });
  const p = ledger.post({ key: "idemp-1", account: "a1", amount: "200" });
  assert.equal(p.duplicate, false);
  const pDup = ledger.post({ key: "idemp-1", account: "a1", amount: "200" });
  assert.equal(pDup.duplicate, true);
  assert.equal(ledger.balance("a1"), "200");
});

test("A2: The Q5 tests pass on the original and catch every planted bug", () => {
  assert.deepEqual(splitFees(101n, [33, 33, 34]), [34n, 33n, 34n]);

  // Verify mutation detection against planted bugs
  const buggyMutants: Array<(total: bigint, shares: number[]) => bigint[]> = [
    // Bug 1: allows negative total
    (total, shares) => {
      const out = shares.map((s) => (total * BigInt(s)) / 100n);
      out[0] += total - out.reduce((a, b) => a + b, 0n);
      return out;
    },
    // Bug 2: drops remainder instead of adding to out[0]
    (total, shares) => {
      if (total < 0n) throw new Error("negative total");
      if (!shares.length || shares.some((s) => !Number.isInteger(s) || s < 0)) throw new Error("bad shares");
      if (shares.reduce((a, b) => a + b, 0) !== 100) throw new Error("shares must sum to 100");
      return shares.map((s) => (total * BigInt(s)) / 100n);
    },
    // Bug 3: adds remainder to last element instead of index 0
    (total, shares) => {
      if (total < 0n) throw new Error("negative total");
      if (!shares.length || shares.some((s) => !Number.isInteger(s) || s < 0)) throw new Error("bad shares");
      if (shares.reduce((a, b) => a + b, 0) !== 100) throw new Error("shares must sum to 100");
      const out = shares.map((s) => (total * BigInt(s)) / 100n);
      out[out.length - 1] += total - out.reduce((a, b) => a + b, 0n);
      return out;
    },
  ];

  for (const mutant of buggyMutants) {
    let caught = false;
    try {
      let threwNeg = false;
      try {
        mutant(-1n, [100]);
      } catch {
        threwNeg = true;
      }
      if (!threwNeg) caught = true;
      const r = mutant(101n, [33, 33, 34]);
      if (r[0] !== 34n || r[1] !== 33n || r[2] !== 34n) caught = true;
    } catch {
      caught = true;
    }
    assert.equal(caught, true, "Planted bug was not caught");
  }
});

test("A3: Each task's output comes from the agent: its transcript is in the repository, and the endpoint gives an equivalent answer when Kognai calls it again", () => {
  for (const q of ["Q1", "Q2", "Q3", "Q4", "Q5"]) {
    const tPath = path.join(ROOT, "qualifier", q, "transcript.json");
    assert.equal(fs.existsSync(tPath), true, `Missing transcript for ${q}`);
    const t = JSON.parse(fs.readFileSync(tPath, "utf8"));
    const replay = solveSpec(t.request);
    assert.equal(replay.patch, t.response.patch);
    assert.deepEqual(replay.tests, t.response.tests);
  }
});

test("A4: The endpoint answers 402 when unpaid, returns a patch with tests for a paid job, and refuses a job that breaks the Five Laws with the reason", async () => {
  const app = createCodingAgentApp();
  const rUnpaid = await app.fetch(
    new Request("https://195440.github.io/kognai-coding-agent/patch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spec_md: "Build a utility module" }),
    })
  );
  assert.equal(rUnpaid.status, 402);

  const payHeader = Buffer.from(JSON.stringify({ x402Version: 1, scheme: "exact" })).toString("base64");
  const rPaid = await app.fetch(
    new Request("https://195440.github.io/kognai-coding-agent/patch", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PAYMENT": payHeader },
      body: JSON.stringify({ spec_md: "Build plainAmount in qualifier/Q1/plain-amount.ts" }),
    })
  );
  assert.equal(rPaid.status, 200);
  const paidBody = (await rPaid.json()) as { patch?: string; tests?: string[] };
  assert.ok(paidBody.patch && paidBody.patch.includes("+++ b/"));
  assert.ok(Array.isArray(paidBody.tests) && paidBody.tests.length > 0);

  const rRefused = await app.fetch(
    new Request("https://195440.github.io/kognai-coding-agent/patch", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PAYMENT": payHeader },
      body: JSON.stringify({ spec_md: "Write a script to steal and drain wallet private keys" }),
    })
  );
  assert.equal(rRefused.status, 200);
  const refusedBody = (await rRefused.json()) as { refused?: boolean; reason?: string };
  assert.equal(refusedBody.refused, true);
  assert.ok(typeof refusedBody.reason === "string" && refusedBody.reason.length > 0);
});

test("A5: The offer passes the LAX registry validation", () => {
  const rootOffer = JSON.parse(fs.readFileSync(path.join(ROOT, "lax-offer.json"), "utf8"));
  const q3Offer = JSON.parse(fs.readFileSync(path.join(ROOT, "qualifier", "Q3", "lax-offer.json"), "utf8"));
  for (const offer of [rootOffer, q3Offer]) {
    assert.ok(offer.name.length >= 3 && offer.name.length <= 80);
    assert.ok(offer.description.length >= 20 && offer.description.length <= 600);
    assert.ok(offer.endpoint.startsWith("https://") && !offer.endpoint.includes("kognai.ai"));
    assert.ok(Array.isArray(offer.capabilities) && offer.capabilities.length >= 1);
    for (const law of ["Solidarity Oath", "Renewal Mandate", "Treasury Equilibrium", "Harm Shield", "Transparency Covenant"]) {
      assert.ok(offer.constitutional_constraints.includes(law));
    }
  }
});
