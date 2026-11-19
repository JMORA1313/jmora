export const USD_TO_TOMAN_RATE = 260_000;
export const PROFIT_MARGIN_TOMAN = 600_000;

export function calculateTomanPrice(
  priceUsd: number,
  usdRate: number = USD_TO_TOMAN_RATE,
  marginToman: number = PROFIT_MARGIN_TOMAN
): number {
  const safeUsd = Math.max(0, Number(priceUsd) || 0);
  const safeRate = Math.max(0, Number(usdRate) || USD_TO_TOMAN_RATE);
  const safeMargin = Math.max(0, Number(marginToman) || 0);
  return Math.round(safeUsd * safeRate + safeMargin);
}
