export interface LedgerPostInput {
  key: string;
  account: string;
  amount: string;
}

export interface LedgerPostResult {
  id: string;
  duplicate: boolean;
}

export interface Ledger {
  post(entry: LedgerPostInput): LedgerPostResult;
  balance(account: string): string;
}

function parsePositiveIntString(val: string, label: string): bigint {
  if (typeof val !== "string" || !/^\d+$/.test(val)) {
    throw new Error(`${label} must be a positive integer string`);
  }
  const n = BigInt(val);
  if (n <= 0n) {
    throw new Error(`${label} must be strictly positive`);
  }
  return n;
}

export function createLedger(config: { cap: string }): Ledger {
  if (!config || typeof config !== "object") {
    throw new Error("config with cap is required");
  }
  const cap = parsePositiveIntString(config.cap, "cap");
  const balances = new Map<string, bigint>();
  const seenKeys = new Map<string, { account: string; amount: string; id: string }>();
  let seq = 0;

  return {
    post(entry: LedgerPostInput): LedgerPostResult {
      if (!entry || typeof entry.key !== "string" || !entry.key.trim()) {
        throw new Error("key is required");
      }
      if (typeof entry.account !== "string" || !entry.account.trim()) {
        throw new Error("account is required");
      }
      const amt = parsePositiveIntString(entry.amount, "amount");
      const canonicalAmount = amt.toString();

      const existing = seenKeys.get(entry.key);
      if (existing) {
        if (existing.account === entry.account && existing.amount === canonicalAmount) {
          return { id: existing.id, duplicate: true };
        }
        throw new Error(`Idempotency key conflict for key: ${entry.key}`);
      }

      const currentBal = balances.get(entry.account) ?? 0n;
      const nextBal = currentBal + amt;
      if (nextBal > cap) {
        throw new Error(`Account ${entry.account} would exceed cap ${cap.toString()}`);
      }

      seq += 1;
      const id = `tx_${seq}`;
      balances.set(entry.account, nextBal);
      seenKeys.set(entry.key, { account: entry.account, amount: canonicalAmount, id });
      return { id, duplicate: false };
    },

    balance(account: string): string {
      if (typeof account !== "string" || !account.trim()) {
        throw new Error("account is required");
      }
      return (balances.get(account) ?? 0n).toString();
    },
  };
}

export default createLedger;
