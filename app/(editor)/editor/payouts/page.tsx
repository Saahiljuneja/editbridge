import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payouts, orders, packages, editors, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { PaymentsClient } from "./payments-client";

export const dynamic = "force-dynamic";

export default async function EditorPayoutsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const [editorRow] = await db
    .select({
      bankAccountName: editors.bankAccountName,
      bankAccountNumber: editors.bankAccountNumber,
      bankIfsc: editors.bankIfsc,
      kycStatus: editors.kycStatus,
    })
    .from(editors)
    .where(eq(editors.id, editorId))
    .limit(1);

  const transactionsData = await db
    .select({
      id: orders.id,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      rewardDiscountAmount: orders.rewardDiscountAmount,
      status: orders.status,
      createdAt: orders.createdAt,
      completedAt: orders.completedAt,
      packageTitle: packages.title,
      clientName: users.name,
      clientEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.clientId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.editorId, editorId))
    .orderBy(desc(orders.createdAt));

  const payoutsData = await db
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
    .orderBy(desc(payouts.createdAt));

  return (
    <PaymentsClient
      transactions={transactionsData}
      payouts={payoutsData}
      bankAccountName={editorRow?.bankAccountName ?? null}
      bankAccountLastFour={editorRow?.bankAccountNumber?.slice(-4) ?? null}
      bankIfsc={editorRow?.bankIfsc ?? null}
      kycStatus={editorRow?.kycStatus ?? "pending"}
    />
  );
}