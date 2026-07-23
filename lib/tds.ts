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

// Core TDS decision function.
// payoutAmountPaise  = grossAmount - commissionAmount for this order
// annualTotalPaise   = sum of (gross - commission) for all prior payouts this FY
// hasPan             = editor has a PAN number on file
export function computeTds({
  payoutAmountPaise,
  annualTotalSoFarPaise,
  hasPan,
}: {
  payoutAmountPaise: number;
  annualTotalSoFarPaise: number;
  hasPan: boolean;
}): { tdsAmount: number; tdsRatePct: number } {
  const crossesThreshold =
    annualTotalSoFarPaise >= TDS_THRESHOLD_PAISE ||                        // already over
    annualTotalSoFarPaise + payoutAmountPaise > TDS_THRESHOLD_PAISE;       // this payout pushes over

  if (!crossesThreshold) return { tdsAmount: 0, tdsRatePct: 0 };

  const tdsRatePct = hasPan ? TDS_RATE_WITH_PAN : TDS_RATE_WITHOUT_PAN;
  const tdsAmount  = Math.floor(payoutAmountPaise * tdsRatePct / 100);
  return { tdsAmount, tdsRatePct };
}

// Convenience: fetch editor PAN + compute TDS in one call.
export async function computeTdsForEditor(
  editorId: string,
  payoutAmountPaise: number
): Promise<{ tdsAmount: number; tdsRatePct: number; annualTotalPaise: number }> {
  const fy = getFinancialYear();

  const [[editorRow], annualTotalPaise] = await Promise.all([
    db.select({ panNumber: editors.panNumber }).from(editors).where(eq(editors.id, editorId)).limit(1),
    getAnnualPayoutTotal(editorId, fy),
  ]);

  const hasPan = !!(editorRow?.panNumber?.trim());
  const { tdsAmount, tdsRatePct } = computeTds({ payoutAmountPaise, annualTotalSoFarPaise: annualTotalPaise, hasPan });

  return { tdsAmount, tdsRatePct, annualTotalPaise };
}
