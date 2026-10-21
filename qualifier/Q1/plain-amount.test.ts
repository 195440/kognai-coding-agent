import test from "node:test";
import assert from "node:assert/strict";
import { plainAmount } from "./plain-amount.ts";

test("Q1: formats positive, negative, and Arabic-Indic integer base units without dashes", () => {
  assert.equal(plainAmount("1234500000", 6, "USDC"), "1,234.50 USDC");
  assert.equal(plainAmount("-1234500000", 6, "USDC"), "minus 1,234.50 USDC");
  assert.equal(plainAmount("1234567800", 6, "USDC"), "1,234.5678 USDC");
  assert.equal(plainAmount("٠١٢٣٤٥٠٠٠٠٠", 6, "USDC"), "1,234.50 USDC");
  assert.equal(plainAmount("-٠", 6, "USDC"), "0.00 USDC");
  assert.equal(plainAmount("5", 6, "USDC"), "0.000005 USDC");
  assert.throws(() => plainAmount("12.34", 6, "USDC"));
  assert.throws(() => plainAmount("", 6, "USDC"));
  assert.throws(() => plainAmount("100", 1, "USDC"));
});
