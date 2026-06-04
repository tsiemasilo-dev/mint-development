// Single source of truth for purchase fee math. The frontend mirrors these
// constants in PaymentPage / InvestAmountPage / StockBuyPage / StockDetailPage /
// ChildInvestModal for display only — the server recomputes and is authoritative.
//
// "Execution Reserve" is the user-facing name for the 8% slippage buffer
// (was internally called "cash buffer" / "safety net"). All breakdown values
// are returned in cents to match the existing transactions schema.

export const FEE_CONSTANTS = {
  EXECUTION_RESERVE_RATE: 0.08,
  BROKER_FEE_RATE:        0.0025,
  ISIN_FEE_PER_ASSET:     69,
  TRANSACTION_FEE_RATE:   0.038,
};

// baseRands = raw investment value (no reserve, no fees)
// numAssets = count of underlying securities (1 for direct stock, N for strategy basket)
export function computeFees(baseRands, numAssets = 1) {
  const c = FEE_CONSTANTS;
  const base = Number(baseRands) || 0;
  const n = Math.max(1, Math.floor(Number(numAssets) || 1));

  const baseCents           = Math.round(base * 100);
  const bufferCents         = Math.round(base * c.EXECUTION_RESERVE_RATE * 100);
  const bufferedBase        = base * (1 + c.EXECUTION_RESERVE_RATE);
  const brokerFeeCents      = Math.round(bufferedBase * c.BROKER_FEE_RATE * 100);
  const isinFeeCents        = Math.round(c.ISIN_FEE_PER_ASSET * n * 100);
  const transactionFeeCents = Math.round(bufferedBase * c.TRANSACTION_FEE_RATE * 100);
  const totalCents          = baseCents + bufferCents + brokerFeeCents + isinFeeCents + transactionFeeCents;

  return { baseCents, bufferCents, brokerFeeCents, isinFeeCents, transactionFeeCents, totalCents };
}
