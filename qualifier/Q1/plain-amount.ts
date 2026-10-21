function normalizeArabicIndicDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) {
      out += String(code - 0x0660);
    } else if (code >= 0x06f0 && code <= 0x06f9) {
      out += String(code - 0x06f0);
    } else {
      out += ch;
    }
  }
  return out;
}

export function plainAmount(value: string, decimals: number, symbol: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("value must be a non-empty string");
  }
  if (!Number.isInteger(decimals) || decimals < 2 || decimals > 36) {
    throw new Error("decimals must be an integer >= 2");
  }
  if (typeof symbol !== "string" || !symbol.trim() || /[-–—\u2212]/.test(symbol)) {
    throw new Error("symbol must be a valid non-empty string without dashes");
  }

  const normalized = normalizeArabicIndicDigits(value);
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error("value must be an integer string of digits (optionally starting with a minus sign)");
  }

  const isNegative = normalized.startsWith("-");
  const rawDigits = (isNegative ? normalized.slice(1) : normalized).replace(/^0+/, "") || "0";
  const allZero = rawDigits === "0";

  const padded = rawDigits.padStart(decimals + 1, "0");
  const wholePart = padded.slice(0, padded.length - decimals) || "0";
  const fracRaw = padded.slice(padded.length - decimals);

  // Keep at least 2 and at most decimals decimals (zeros beyond 2 removed from the end)
  let fracTrimmed = fracRaw.replace(/0+$/, "");
  if (fracTrimmed.length < 2) {
    fracTrimmed = fracRaw.slice(0, 2).padEnd(2, "0");
  }

  const groupedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const prefix = isNegative && !allZero ? "minus " : "";
  return `${prefix}${groupedWhole}.${fracTrimmed} ${symbol.trim()}`;
}

export default plainAmount;
