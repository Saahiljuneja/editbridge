import { db } from "@/lib/db";
import { payouts, editors } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Section 194J — Professional / Technical Services
export const TDS_THRESHOLD_PAISE = 30_000 * 100; // ₹30,000
export const TDS_RATE_WITH_PAN    = 10; // percent
export const TDS_RATE_WITHOUT_PAN = 20; // percent

// April 1 – March 31. Returns the year in which the FY starts.
// e.g. April 2026–March 2027 → 2026
export function getFinancialYear(date: Date = new Date()): number {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

export function getFyStart(fy: number): Date {
  return new Date(fy, 3, 1); // April 1
}

export function getFyEnd(fy: number): Date {
  return new Date(fy + 1, 2, 31, 23, 59, 59, 999); // March 31
}

// Returns the total payout (net before TDS) made to an editor in a given FY,
// by summing all payout rows (any status — pending / processing / completed
// all count toward the TDS threshold).
export async function getAnnualPayoutTotal(editorId: string, fy: number): Promise<number> {
  const fyStart = getFyStart(fy);
  const fyEnd   = getFyEnd(fy);

  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payouts.grossAmount} - ${payouts.commissionAmount}), 0)::int` })
    .from(payouts)
    .where(
      and(
        eq(payouts.editorId, editorId),
        sql`${payouts.createdAt} >= ${fyStart}`,
        sql`${payouts.createdAt} <= ${fyEnd}`
      )
    );

  return row?.total ?? 0;
}

// Returns the total TDS deducted from an editor in a given FY.
export async function getAnnualTdsDeducted(editorId: string, fy: number): Promise<number> {
  const fyStart = getFyStart(fy);
  const fyEnd   = getFyEnd(fy);

  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payouts.tdsAmount}), 0)::int` })
    .from(payouts)
    .where(
      and(
        eq(payouts.editorId, editorId),
        sql`${payouts.createdAt} >= ${fyStart}`,
        sql`${payouts.createdAt} <= ${fyEnd}`
      )
    );

  return row?.total ?? 0;
}

// Core TDS decision function.
// payoutAmountPaise     = grossAmount - commissionAmount for this order
// annualTotalSoFarPaise = sum of (gross - commission) for all prior payouts this FY
// priorTdsDeductedPaise = sum of tdsAmount for all prior payouts this FY
// hasPan                = editor has a PAN number on file
export function computeTds({
  payoutAmountPaise,
  annualTotalSoFarPaise,
  priorTdsDeductedPaise,
  hasPan,
}: {
  payoutAmountPaise: number;
  annualTotalSoFarPaise: number;
  priorTdsDeductedPaise: number;
  hasPan: boolean;
}): { tdsAmount: number; tdsRatePct: number } {
  const cumulativeTotal = annualTotalSoFarPaise + payoutAmountPaise;
  const crossesThreshold = cumulativeTotal > TDS_THRESHOLD_PAISE;

  if (!crossesThreshold) return { tdsAmount: 0, tdsRatePct: 0 };

  const tdsRatePct = hasPan ? TDS_RATE_WITH_PAN : TDS_RATE_WITHOUT_PAN;
  
  // Calculate target cumulative TDS on the entire amount earned so far in this FY
  const cumulativeTds = Math.floor((cumulativeTotal * tdsRatePct) / 100);
  
  // Current TDS is the difference between cumulative target TDS and prior TDS already deducted.
  // Clamp it to maximum of the current payoutAmountPaise to avoid negative payouts,
  // letting unpaid TDS carry forward to subsequent payouts.
  const tdsAmount = Math.min(
    Math.max(0, cumulativeTds - priorTdsDeductedPaise),
    payoutAmountPaise
  );

  return { tdsAmount, tdsRatePct };
}

// Convenience: fetch editor PAN + compute TDS in one call.
export async function computeTdsForEditor(
  editorId: string,
  payoutAmountPaise: number
): Promise<{ tdsAmount: number; tdsRatePct: number; annualTotalPaise: number }> {
  const fy = getFinancialYear();

  const [[editorRow], annualTotalPaise, priorTdsDeductedPaise] = await Promise.all([
    db.select({ panNumber: editors.panNumber }).from(editors).where(eq(editors.id, editorId)).limit(1),
    getAnnualPayoutTotal(editorId, fy),
    getAnnualTdsDeducted(editorId, fy),
  ]);

  const hasPan = !!(editorRow?.panNumber?.trim());
  const { tdsAmount, tdsRatePct } = computeTds({
    payoutAmountPaise,
    annualTotalSoFarPaise: annualTotalPaise,
    priorTdsDeductedPaise,
    hasPan,
  });

  return { tdsAmount, tdsRatePct, annualTotalPaise };
}
