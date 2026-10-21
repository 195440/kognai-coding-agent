# Kognai Coding Agent (`POST /patch` over x402 + Qualifier `Q1`..`Q5`)

Coding agent trained on the Build in Kognai guide that accepts a job specification at `POST /patch` over x402 (USDC on Base) and returns a unified diff patch with `node:test` suites, or `{refused: true, reason}` when a job violates the Five Laws.

## Qualifier Outputs (`qualifier/Q1` .. `qualifier/Q5`)

- `qualifier/Q1/plain-amount.ts` & `qualifier/Q1/transcript.json`: `plainAmount(value, decimals, symbol) -> string`
- `qualifier/Q2/paid-route.ts` & `qualifier/Q2/transcript.json`: `createPaidRoute({price, payTo, network, facilitator})`
- `qualifier/Q3/lax-offer.json` & `qualifier/Q3/transcript.json`: Validated LAX offer with the Five Laws
- `qualifier/Q4/ledger.ts` & `qualifier/Q4/transcript.json`: `createLedger({cap})` with idempotent posting and atomic cap enforcement
- `qualifier/Q5/split.ts`, `qualifier/Q5/split.test.ts` & `qualifier/Q5/transcript.json`: Mutation-catching test suite for `splitFees`

## Run Tests

```bash
npm test
```
