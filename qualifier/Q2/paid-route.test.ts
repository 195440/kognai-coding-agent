import test from "node:test";
import assert from "node:assert/strict";
import { createPaidRoute } from "./paid-route.ts";

test("Q2: createPaidRoute enforces 402 -> verify -> settle -> 200 with X-PAYMENT-RESPONSE", async () => {
  const steps: string[] = [];
  const route = createPaidRoute({
    price: "0.02",
    payTo: "0x8cc9bd34b5ee8e828C54b84d0520CdCF4FA9C078",
    network: "base",
    facilitator: {
      async verify() {
        steps.push("verify");
        return { isValid: true };
      },
      async settle() {
        steps.push("settle");
        return { success: true, transaction: "0x1234", network: "base" };
      },
    },
  });

  const r402 = await route(new Request("https://agent.example.com/paid"));
  assert.equal(r402.status, 402);

  const token = Buffer.from(JSON.stringify({ scheme: "exact" })).toString("base64");
  const r200 = await route(new Request("https://agent.example.com/paid", { headers: { "X-PAYMENT": token } }));
  assert.equal(r200.status, 200);
  assert.deepEqual(steps, ["verify", "settle"]);
  assert.ok(r200.headers.get("X-PAYMENT-RESPONSE"));
});
