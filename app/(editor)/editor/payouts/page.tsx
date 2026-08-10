import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, orders, packages, editors, users } from "@/lib/db/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, TrendingUp, Hourglass, CheckCircle2, Gift, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { getAvailableCredits } from "@/lib/rewards";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BankAccountSection } from "./bank-account-section";
import { TaxReportSection } from "@/components/editor/tax-report-section";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  pending:    { label: "Pending",    dot: "bg-amber-400",  text: "text-amber-700" },
  processing: { label: "Processing", dot: "bg-blue-400",   text: "text-blue-700" },
  completed:  { label: "Settled",    dot: "bg-green-400",  text: "text-green-700" },
};

export default async function EditorPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const PAGE_SIZE = 20;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [editorRow] = await db
    .select({
      bankAccountName: editors.bankAccountName,
      bankAccountNumber: editors.bankAccountNumber,
      bankIfsc: editors.bankIfsc,
    })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  const [userRow] = await db
    .select({ twoFactorEnabled: users.twoFactorEnabled })
    .from(users)
    .where(eq(users.id, session.user.userId!))
    .limit(1);
  const show2faNudge = !!editorRow?.bankAccountName && !userRow?.twoFactorEnabled;

  const [summaryRow, payoutsCountRow] = await Promise.all([
    db
      .select({
        totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${payouts.status} = 'completed' THEN ${payouts.netAmount} ELSE 0 END), 0)::int`,
        totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${payouts.status} != 'completed' THEN ${payouts.netAmount} ELSE 0 END), 0)::int`,
        thisMonth: sql<number>`COALESCE(SUM(CASE WHEN ${payouts.status} = 'completed' AND ${payouts.settledAt} >= ${monthStart} THEN ${payouts.netAmount} ELSE 0 END), 0)::int`,
      })
      .from(payouts)
      .where(eq(payouts.editorId, editorId)),

    db
      .select({ v: count() })
      .from(payouts)
      .where(eq(payouts.editorId, editorId))
      .then(r => r[0].v)
  ]);

  const rows = await db
    .select({
      id: payouts.id,
      orderId: payouts.orderId,
      grossAmount: payouts.grossAmount,
      commissionAmount: payouts.commissionAmount,
      tdsAmount: payouts.tdsAmount,
      tdsRatePct: payouts.tdsRatePct,
      netAmount: payouts.netAmount,
      bonusCredits: payouts.bonusCredits,
      razorpayTransferId: payouts.razorpayTransferId,
      status: payouts.status,
      scheduledPayoutAt: payouts.scheduledPayoutAt,
      settledAt: payouts.settledAt,
      createdAt: payouts.createdAt,
      packageTitle: packages.title,
    })
    .from(payouts)
    .innerJoin(orders, eq(orders.id, payouts.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(payouts.editorId, editorId))
    .orderBy(desc(payouts.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const totalEarned  = summaryRow[0]?.totalEarned ?? 0;
  const totalPending = summaryRow[0]?.totalPending ?? 0;
  const { total: availableCredits } = await getAvailableCredits(session.user.userId!);
  const thisMonth    = summaryRow[0]?.thisMonth ?? 0;

  // TDS summary for the financial year (April–March)
  const fyStart = now.getMonth() >= 3
    ? new Date(now.getFullYear(), 3, 1)
    : new Date(now.getFullYear() - 1, 3, 1);

  const [tdsRow] = await db
    .select({
      totalTds: sql<number>`COALESCE(SUM(${payouts.tdsAmount}), 0)::int`,
      hasTds: sql<boolean>`COALESCE(COUNT(CASE WHEN (${payouts.tdsAmount} > 0) THEN 1 END) > 0, false)`
    })
    .from(payouts)
    .where(and(eq(payouts.editorId, editorId), sql`${payouts.createdAt} >= ${fyStart}`));

  const totalTdsThisFy = tdsRow?.totalTds ?? 0;
  const hasTdsThisFy = tdsRow?.hasTds ?? false;
  const totalPages = Math.ceil(payoutsCountRow / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track your earnings and settlement history</p>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* 2FA nudge — editors with a linked bank account should secure their payout */}
        {show2faNudge && (
          <Link
            href="/editor/settings"
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 hover:bg-amber-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Enable two-factor authentication to protect your payout account</p>
              <p className="text-xs text-amber-700 mt-0.5">Your bank details are linked — add an extra layer of security in Settings → Security.</p>
            </div>
          </Link>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">Total Earned</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalEarned)}</p>
            <p className="text-xs text-gray-400 mt-1">All-time settled</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">Pending</p>
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Hourglass className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-gray-400 mt-1">Awaiting settlement</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-500">This Month</p>
              <div className="w-8 h-8 rounded-xl bg-[var(--brand-client)]/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[var(--brand-client)]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--brand-client)]">{formatCurrency(thisMonth)}</p>
            <p className="text-xs text-gray-400 mt-1">{now.toLocaleString("en-IN", { month: "long", year: "numeric" })}</p>
          </div>
        </div>

        {/* Reward credits banner */}
        {availableCredits > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {formatCurrency(availableCredits)} reward credits available
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  These will automatically be added as a bonus to your next payout when a client approves your order.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Commission + TDS info */}
        <div className="rounded-2xl border border-[var(--brand-client)]/15 bg-[var(--brand-client)]/5 px-5 py-4 space-y-1">
          <p className="text-sm text-[var(--brand-client)] font-medium">Platform commission: 15% · 7-day payout window</p>
          <p className="text-xs text-[var(--brand-client)]/70">Net payout = order amount − 15% commission − TDS (if applicable). Payment is initiated 7 days after client approves.</p>
          <p className="text-xs text-[var(--brand-client)]/60">TDS (Section 194J) is deducted at 10% once your annual earnings exceed ₹30,000. You can claim this as tax credit when filing your ITR.</p>
        </div>

        {/* TDS summary banner — shown only once TDS has been deducted this FY */}
        {hasTdsThisFy && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">TDS deducted this financial year: {formatCurrency(totalTdsThisFy)}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                EditBridge deposits this with the Income Tax department on your behalf. You will receive a Form 16A and can claim this as a tax credit in your ITR filing.
              </p>
            </div>
          </div>
        )}

        {/* Bank account section */}
        <BankAccountSection
          bankAccountName={editorRow?.bankAccountName ?? null}
          bankAccountNumber={editorRow?.bankAccountNumber ?? null}
          bankIfsc={editorRow?.bankIfsc ?? null}
        />

        {/* Payout history */}
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Wallet className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700 text-sm">No payouts yet</p>
            <p className="text-xs text-gray-400 mt-1">Payouts appear here once a client approves your delivery.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">Payout history</p>
              <span className="text-xs text-gray-400">{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Package</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Gross</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Commission</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">TDS</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">You Receive</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Payout Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
                  return (
                    <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/editor/orders/${row.orderId}`} className="font-medium text-gray-900 hover:text-[var(--brand-client)] hover:underline truncate max-w-[200px] block">
                          {row.packageTitle}
                        </Link>
                        {row.razorpayTransferId && (
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{row.razorpayTransferId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-gray-700">{formatCurrency(row.grossAmount)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-red-500">−{formatCurrency(row.commissionAmount)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {(row.tdsAmount ?? 0) > 0 ? (
                          <span className="text-amber-600 font-medium">
                            −{formatCurrency(row.tdsAmount!)}
                            <span className="block text-[10px] text-amber-500">@ {row.tdsRatePct}%</span>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-bold text-[var(--brand-client)]">
                        {formatCurrency(row.netAmount)}
                        {(row.bonusCredits ?? 0) > 0 && (
                          <span className="block text-[10px] text-amber-600 font-medium">
                            incl. {formatCurrency(row.bonusCredits!)} bonus
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cfg.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-400 text-xs">
                        {row.settledAt
                          ? formatDate(row.settledAt)
                          : row.scheduledPayoutAt
                            ? <span className="text-amber-600">Scheduled {formatDate(row.scheduledPayoutAt)}</span>
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500">
                  Page <span className="font-medium text-gray-700">{page}</span> of{" "}
                  <span className="font-medium text-gray-700">{totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/editor/payouts?page=${page - 1}`}
                    aria-disabled={page <= 1}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                      page <= 1
                        ? "border-gray-100 text-gray-300 pointer-events-none"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </Link>
                  <Link
                    href={`/editor/payouts?page=${page + 1}`}
                    aria-disabled={page >= totalPages}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                      page >= totalPages
                        ? "border-gray-100 text-gray-300 pointer-events-none"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                    )}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Annual tax report */}
        <TaxReportSection />
      </div>
    </div>
  );
}