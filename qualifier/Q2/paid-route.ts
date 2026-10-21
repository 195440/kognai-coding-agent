export interface PaymentRequirements {
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

export interface PaidRouteConfig {
  price: string;
  payTo: string;
  network: string;
  facilitator: {
    verify(payload: unknown, req: PaymentRequirements): Promise<{ isValid: boolean; invalidReason?: string }>;
    settle(payload: unknown, req: PaymentRequirements): Promise<{ success: boolean; transaction?: string; network?: string; errorReason?: string }>;
  };
  description?: string;
}

const USDC_ASSETS: Record<string, string> = {
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

function toAtomicUsdc(price: string): string {
  const s = String(price ?? "").trim();
  if (!/^\d+(\.\d{1,6})?$/.test(s)) throw new Error(`Invalid USDC price: ${price}`);
  const [w, f = ""] = s.split(".");
  const atomic = BigInt(w) * 1000000n + BigInt((f + "000000").slice(0, 6));
  if (atomic <= 0n) throw new Error("Price must be positive");
  return atomic.toString();
}

export function createPaidRoute(config: PaidRouteConfig): (request: Request) => Promise<Response> {
  const maxAmountRequired = toAtomicUsdc(config.price);
  const asset = USDC_ASSETS[config.network] || USDC_ASSETS.base;

  return async (request: Request): Promise<Response> => {
    const requirements: PaymentRequirements = {
      scheme: "exact",
      network: config.network,
      maxAmountRequired,
      resource: request.url,
      description: config.description || "Paid x402 route",
      mimeType: "application/json",
      payTo: config.payTo,
      maxTimeoutSeconds: 60,
      asset,
    };

    const answer402 = (error: string) => {
      const body = { x402Version: 1, error, accepts: [requirements] };
      return new Response(JSON.stringify(body), {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(body), "utf8").toString("base64"),
        },
      });
    };

    const header =
      request.headers.get("X-PAYMENT") ||
      request.headers.get("x-payment") ||
      request.headers.get("PAYMENT-SIGNATURE");
    if (!header) {
      return answer402("Payment required");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
    } catch {
      return answer402("Malformed X-PAYMENT header");
    }

    const v = await config.facilitator.verify(payload, requirements);
    if (!v || !v.isValid) {
      return answer402(v?.invalidReason || "Verification failed");
    }

    const s = await config.facilitator.settle(payload, requirements);
    if (!s || !s.success) {
      return answer402(s?.errorReason || "Settlement failed");
    }

    const respHeader = Buffer.from(
      JSON.stringify({
        success: true,
        transaction: s.transaction || "0x0",
        network: s.network || config.network,
      }),
      "utf8"
    ).toString("base64");

    return new Response(JSON.stringify({ ok: true, settled: true, transaction: s.transaction || "0x0" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-PAYMENT-RESPONSE": respHeader,
      },
    });
  };
}

export default createPaidRoute;
