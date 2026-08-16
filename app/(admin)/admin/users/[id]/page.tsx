export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, editors, orders, reviews, clientBlocks, userPoints, userCredits, packages, auditLogs, portfolioItems, userFeatureFlags, kycApplications, disputes, userCoupons, referrals, payouts, userBadges } from "@/lib/db/schema";
import { eq, count, sql, desc, sum, and, isNull } from "drizzle-orm";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { RoleChangeForm } from "./role-change-form";
import { SuspendForm } from "./suspend-form";
import { ImpersonateButton } from "./impersonate-button";
import { SendEmailForm } from "./send-email-form";
import { FeaturedToggleForm } from "./featured-toggle-form";
import { RemoveBlockButton } from "./remove-block-button";
import { CustomRatesForm } from "./custom-rates-form";
import { ResetPasswordButton } from "./reset-password-button";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { WalletCreditsWidget } from "./wallet-credits-widget";
import { PortfolioModeratorList } from "./portfolio-moderator-list";
import { FeatureFlagsForm } from "./feature-flags-form";
import { OrderRefundButton } from "./order-refund-button";
import { NotificationDispatcher } from "./notification-dispatcher";
import { TerminateSessionButton } from "./terminate-session-button";
import { BankDetailsOverrideForm } from "./bank-details-override-form";
import { ReviewsModeratorList } from "./reviews-moderator-list";
import { ActiveDisputesWidget } from "./active-disputes-widget";
import { KycReviewButtons } from "./kyc-review-buttons";
import { EditorAnalyticsCharts } from "./editor-analytics-charts";
import { ReferralAdjusterForm } from "./referral-adjuster-form";
import { CouponIssuerForm } from "./coupon-issuer-form";
import { ManualOrderForm } from "./manual-order-form";
import { SubscriptionOverrideForm } from "./subscription-override-form";
import { ProfileCustomizerForm } from "./profile-customizer-form";
import { TwoFactorResetButton } from "./two-factor-reset-button";
import { PayoutOverrideButton } from "./payout-override-button";
import { SupportChatDrawer } from "@/components/admin/support-chat-drawer";
import {
  AlertTriangle, Settings2, ShoppingBag, DollarSign, Star, Zap, Coins,
  CheckCircle2, Clock, XCircle, RotateCcw, HelpCircle, CalendarDays,
  Mail, Shield, UserCheck, Crown, ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { GrantCreditsForm } from "./grant-credits-form";
import { AdjustXpForm } from "./adjust-xp-form";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute", "staff_moderation"];

const ROLE_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  editor: "bg-[var(--brand-client)]/10 text-[var(--brand-client)]",
  admin: "bg-red-100 text-red-700",
  staff_kyc: "bg-amber-100 text-amber-700",
  staff_support: "bg-green-100 text-green-700",
  staff_dispute: "bg-orange-100 text-orange-700",
  staff_moderation: "bg-purple-100 text-purple-700",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { id } = await params;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) notFound();

  const [editorProfile] = await db
    .select()
    .from(editors)
    .where(eq(editors.userId, id))
    .limit(1);

  const isCurrentlyFeatured = !!editorProfile?.isFeatured && !!editorProfile?.featuredUntil && editorProfile.featuredUntil > new Date();

  const [[totalOrders], [totalSpent], [avgRating], xpRow, creditsRow] = await Promise.all([
    db.select({ value: count() }).from(orders).where(eq(orders.clientId, id)),
    db.select({ value: sql<number>`COALESCE(SUM(${orders.totalAmount}),0)::int` }).from(orders).where(sql`${orders.clientId} = ${id} AND ${orders.status} = 'completed'`),
    db.select({ value: sql<number>`ROUND(AVG(${reviews.rating}),1)` }).from(reviews).where(eq(reviews.revieweeId, id)),
    db.select({ total: userPoints.total, current: userPoints.current, level: userPoints.level }).from(userPoints).where(eq(userPoints.userId, id)).limit(1),
    db.select({ value: sql<number>`COALESCE(SUM(${userCredits.amount}),0)::int` }).from(userCredits).where(and(eq(userCredits.userId, id), isNull(userCredits.usedAt))),
  ]);

  const xpBalance  = xpRow[0] ?? null;
  const creditsPaise = (creditsRow[0]?.value ?? 0) as number;

  // Clients this editor has blocked (only relevant if this user is an editor)
  const blockedClients = editorProfile
    ? await db
        .select({
          id: clientBlocks.id,
          clientId: clientBlocks.clientId,
          reason: clientBlocks.reason,
          createdAt: clientBlocks.createdAt,
          clientName: users.name,
          clientEmail: users.email,
        })
        .from(clientBlocks)
        .innerJoin(users, eq(users.id, clientBlocks.clientId))
        .where(eq(clientBlocks.editorId, editorProfile.id))
        .orderBy(desc(clientBlocks.createdAt))
    : [];

  // How many editors have blocked this user (only relevant if this user is a client)
  const [{ value: blockedByCount }] =
    user.role === "client"
      ? await db.select({ value: count() }).from(clientBlocks).where(eq(clientBlocks.clientId, id))
      : [{ value: 0 }];

  const userOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      packageTitle: packages.title,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(
      editorProfile
        ? sql`${orders.clientId} = ${id} OR ${orders.editorId} = ${editorProfile.id}`
        : eq(orders.clientId, id)
    )
    .orderBy(desc(orders.createdAt))
    .limit(20);

  // 1. Wallet credits log query
  const userCreditsLogs = await db
    .select({
      id: userCredits.id,
      amount: userCredits.amount,
      reason: userCredits.reason,
      expiresAt: userCredits.expiresAt,
      usedAt: userCredits.usedAt,
      orderId: userCredits.orderId,
      createdAt: userCredits.createdAt,
    })
    .from(userCredits)
    .where(eq(userCredits.userId, id))
    .orderBy(desc(userCredits.createdAt));

  const serializeCreditsLogs = userCreditsLogs.map(log => ({
    ...log,
    expiresAt: log.expiresAt ? log.expiresAt.toISOString() : null,
    usedAt: log.usedAt ? log.usedAt.toISOString() : null,
    createdAt: log.createdAt.toISOString(),
  }));

  // 2. Editor portfolio items query
  const editorPortfolioItems = editorProfile
    ? await db
        .select({
          id: portfolioItems.id,
          type: portfolioItems.type,
          url: portfolioItems.url,
          thumbnailUrl: portfolioItems.thumbnailUrl,
          title: portfolioItems.title,
          description: portfolioItems.description,
          isHidden: portfolioItems.isHidden,
        })
        .from(portfolioItems)
        .where(eq(portfolioItems.editorId, editorProfile.id))
        .orderBy(desc(portfolioItems.createdAt))
    : [];

  // 3. User feature flags overrides
  const initialFlags = await db
    .select({
      featureKey: userFeatureFlags.featureKey,
      enabled: userFeatureFlags.enabled,
    })
    .from(userFeatureFlags)
    .where(eq(userFeatureFlags.userId, id));

  // 4. Audit logs timeline query
  const userAuditLogs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      actorRole: auditLogs.actorRole,
      createdAt: auditLogs.createdAt,
      metadata: auditLogs.metadata,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(eq(auditLogs.entityId, id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  // 5. KYC documents query and signed URL generation
  const [latestKycApp] = editorProfile
    ? await db
        .select()
        .from(kycApplications)
        .where(eq(kycApplications.editorId, editorProfile.id))
        .orderBy(desc(kycApplications.createdAt))
        .limit(1)
    : [null];

  const [panDocSignedUrl, docFrontSignedUrl, docBackSignedUrl, selfieSignedUrl] = latestKycApp
    ? await Promise.all([
        latestKycApp.panDocumentUrl ? getPresignedDownloadUrl(latestKycApp.panDocumentUrl, 3600) : Promise.resolve(null),
        latestKycApp.documentUrl ? getPresignedDownloadUrl(latestKycApp.documentUrl, 3600) : Promise.resolve(null),
        latestKycApp.documentBackUrl ? getPresignedDownloadUrl(latestKycApp.documentBackUrl, 3600) : Promise.resolve(null),
        latestKycApp.selfieUrl ? getPresignedDownloadUrl(latestKycApp.selfieUrl, 3600) : Promise.resolve(null),
      ])
    : [null, null, null, null];

  // 6. User reviews query
  const userReviews = await db
    .select({
      id: reviews.id,
      orderId: reviews.orderId,
      rating: reviews.rating,
      text: reviews.text,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
      reviewerEmail: users.email,
      role: reviews.role,
    })
    .from(reviews)
    .leftJoin(users, eq(users.id, reviews.reviewerId))
    .where(sql`${reviews.revieweeId} = ${id} OR ${reviews.reviewerId} = ${id}`)
    .orderBy(desc(reviews.createdAt));

  // 7. Active/resolved disputes query
  const userDisputes = await db
    .select({
      id: disputes.id,
      orderId: disputes.orderId,
      reason: disputes.reason,
      evidenceText: disputes.evidenceText,
      status: disputes.status,
      createdAt: disputes.createdAt,
      orderAmount: orders.totalAmount,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .where(
      editorProfile
        ? sql`${orders.clientId} = ${id} OR ${orders.editorId} = ${editorProfile.id}`
        : eq(orders.clientId, id)
    )
    .orderBy(desc(disputes.createdAt));

  // 8. User coupons list
  const userCouponsList = await db
    .select()
    .from(userCoupons)
    .where(eq(userCoupons.userId, id))
    .orderBy(desc(userCoupons.createdAt));

  // 9. Referral relations
  const [referredByRow] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(referrals)
    .innerJoin(users, eq(users.id, referrals.referrerId))
    .where(eq(referrals.refereeId, id))
    .limit(1);

  const referredUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      creditAwarded: referrals.creditAwarded,
      rewardedAt: referrals.rewardedAt,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .innerJoin(users, eq(users.id, referrals.refereeId))
    .where(eq(referrals.referrerId, id))
    .orderBy(desc(referrals.createdAt));

  // 10. Payouts and Packages list for editor
  const editorPayoutsList = editorProfile
    ? await db
        .select()
        .from(payouts)
        .where(eq(payouts.editorId, editorProfile.id))
        .orderBy(desc(payouts.createdAt))
    : [];

  const editorPackagesList = editorProfile
    ? await db
        .select({ id: packages.id, title: packages.title, price: packages.price })
        .from(packages)
        .where(eq(packages.editorId, editorProfile.id))
    : [];

  const totalPayoutsPaise = editorPayoutsList.reduce((acc, curr) => acc + curr.netAmount, 0);

  // 11. User badges
  const badgesRows = await db
    .select({ badge: userBadges.badge })
    .from(userBadges)
    .where(eq(userBadges.userId, id));
  const currentBadges = badgesRows.map((r) => r.badge);

  return (
    <div className="px-8 py-6">
      {/* Back */}
      <div className="mb-5">
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Users
        </Link>
      </div>

      {/* Hero header card */}
      <div className="rounded-2xl border border-border bg-white p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--brand-client)]/10 flex items-center justify-center text-2xl font-black text-[var(--brand-client)] shrink-0">
              {(user.name ?? user.email).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{user.name ?? "No name"}</h1>
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full", ROLE_COLORS[user.role] ?? "bg-muted text-muted-foreground")}>
                  {user.role.replace(/_/g, " ")}
                </span>
                {!user.isActive && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">Suspended</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Joined {formatDate(user.createdAt)}
                {user.emailVerified
                  ? <span className="ml-2 text-emerald-600 font-medium">· Email verified</span>
                  : <span className="ml-2 text-amber-600 font-medium">· Email not verified</span>
                }
              </p>
            </div>
          </div>
          {session.user.userId !== id && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <SuspendForm userId={id} isActive={user.isActive} />
              {session.user.role === "admin" && <ImpersonateButton userId={id} />}
              {session.user.role === "admin" && (
                <SupportChatDrawer userId={id} userName={user.name ?? user.email} />
              )}
              <SendEmailForm userId={id} userRole={user.role} />
              {session.user.role === "admin" && editorProfile && (
                <FeaturedToggleForm editorId={editorProfile.id} isFeatured={isCurrentlyFeatured} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {([
          { label: "Total Orders", value: String(totalOrders.value), Icon: ShoppingBag, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Total Spent", value: formatCurrency(totalSpent.value), Icon: DollarSign, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
          { label: "Avg Rating", value: avgRating.value ? String(avgRating.value) : "—", Icon: Star, iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "XP Balance", value: xpBalance ? `${xpBalance.current.toLocaleString()} XP` : "—", Icon: Zap, iconBg: "bg-violet-50", iconColor: "text-violet-600", sub: xpBalance?.level ?? undefined },
          { label: "Credits", value: formatCurrency(creditsPaise), Icon: Coins, iconBg: "bg-teal-50", iconColor: "text-teal-600" },
        ] as const).map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-white p-4">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2.5", card.iconBg)}>
              <card.Icon className={cn("w-4 h-4", card.iconColor)} />
            </div>
            <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight">{card.value}</p>
            {"sub" in card && card.sub && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 capitalize">{card.sub}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column body */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Left column */}
        <div className="space-y-5">

          {/* Editor Analytics */}
          {editorProfile && (
            <EditorAnalyticsCharts
              stats={{
                totalOrders: editorProfile.totalOrders,
                totalEarnings: totalPayoutsPaise,
                avgRating: avgRating.value ? parseFloat(String(avgRating.value)) : 0,
                completionRate: editorProfile.completionRate || 95,
                revisionRate: 15,
                avgResponseTimeMin: editorProfile.avgResponseTime || 30,
              }}
            />
          )}

          {/* Manual Order Placement */}
          {session.user.role === "admin" && (
            <ManualOrderForm
              clientId={id}
              editorId={editorProfile?.id || ""}
              packages={editorPackagesList}
            />
          )}

          {/* Left — order history */}
          <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900">Order History</p>
            <span className="text-xs text-muted-foreground">{userOrders.length} record{userOrders.length !== 1 ? "s" : ""}</span>
          </div>
          {userOrders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">ID</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Package</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Amount</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {userOrders.map((ord) => (
                    <tr key={ord.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link href={`/admin/orders/${ord.id}`} className="text-[var(--brand-client)] hover:underline">
                          {ord.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800 truncate max-w-[180px]">
                        {ord.packageTitle ?? "Custom Quote"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          ord.status === "completed"          ? "bg-emerald-100 text-emerald-700" :
                          ord.status === "cancelled"          ? "bg-red-100 text-red-600" :
                          ord.status === "in_progress"        ? "bg-blue-100 text-blue-700" :
                          ord.status === "pending"            ? "bg-amber-100 text-amber-700" :
                          ord.status === "revision_requested" ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-600"
                        )}>
                          {ord.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">{formatCurrency(ord.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{formatDate(ord.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {ord.status !== "cancelled" && session.user.role === "admin" && (
                          <div className="flex justify-end">
                            <OrderRefundButton orderId={ord.id} />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Editor-specific Moderation & KYC Panels */}
        {editorProfile && (
          <div className="space-y-5 mt-5">
            {/* KYC Docs Viewer */}
            {latestKycApp && (
              <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                <p className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-500" /> KYC Documents (Submission #{latestKycApp.submissionNumber})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {panDocSignedUrl && (
                    <a href={panDocSignedUrl} target="_blank" rel="noopener noreferrer" className="block text-center border border-border rounded-lg p-2 hover:bg-neutral-50 transition-colors">
                      <span className="text-[10px] text-muted-foreground block mb-1">PAN Card</span>
                      <div className="aspect-video relative rounded bg-neutral-100 overflow-hidden flex items-center justify-center border border-neutral-150">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={panDocSignedUrl} alt="PAN Card" className="object-cover h-full w-full" />
                      </div>
                    </a>
                  )}
                  {docFrontSignedUrl && (
                    <a href={docFrontSignedUrl} target="_blank" rel="noopener noreferrer" className="block text-center border border-border rounded-lg p-2 hover:bg-neutral-50 transition-colors">
                      <span className="text-[10px] text-muted-foreground block mb-1">{latestKycApp.documentType.toUpperCase()} Front</span>
                      <div className="aspect-video relative rounded bg-neutral-100 overflow-hidden flex items-center justify-center border border-neutral-150">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={docFrontSignedUrl} alt="Document Front" className="object-cover h-full w-full" />
                      </div>
                    </a>
                  )}
                  {docBackSignedUrl && (
                    <a href={docBackSignedUrl} target="_blank" rel="noopener noreferrer" className="block text-center border border-border rounded-lg p-2 hover:bg-neutral-50 transition-colors">
                      <span className="text-[10px] text-muted-foreground block mb-1">{latestKycApp.documentType.toUpperCase()} Back</span>
                      <div className="aspect-video relative rounded bg-neutral-100 overflow-hidden flex items-center justify-center border border-neutral-150">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={docBackSignedUrl} alt="Document Back" className="object-cover h-full w-full" />
                      </div>
                    </a>
                  )}
                  {selfieSignedUrl && (
                    <a href={selfieSignedUrl} target="_blank" rel="noopener noreferrer" className="block text-center border border-border rounded-lg p-2 hover:bg-neutral-50 transition-colors">
                      <span className="text-[10px] text-muted-foreground block mb-1">Selfie</span>
                      <div className="aspect-video relative rounded bg-neutral-100 overflow-hidden flex items-center justify-center border border-neutral-150">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selfieSignedUrl} alt="Selfie" className="object-cover h-full w-full" />
                      </div>
                    </a>
                  )}
                </div>
                {latestKycApp.status === "pending" && (
                  <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <KycReviewButtons applicationId={latestKycApp.id} />
                  </div>
                )}
              </div>
            )}

            {/* Portfolio items moderator list */}
            <PortfolioModeratorList items={editorPortfolioItems} />
          </div>
        )}

        {/* User Audit Trail Timeline */}
        <div className="rounded-xl border border-border bg-white p-5 mt-5">
          <p className="font-semibold text-sm mb-3">Staff Audit Trail (Recent Actions)</p>
          {userAuditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No administrative actions logged on this user yet.</p>
          ) : (
            <div className="space-y-4">
              {userAuditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded uppercase text-[9px] whitespace-nowrap">
                    {log.actorRole.replace("staff_", "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {log.action} by <span className="font-semibold">{log.actorName || log.actorEmail || "System"}</span>
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="text-[10px] text-gray-400 font-mono mt-1 bg-gray-50 p-2 rounded max-h-24 overflow-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Disputes Panel */}
        <ActiveDisputesWidget disputes={userDisputes} />

        {/* Review & Rating Moderation List */}
        <ReviewsModeratorList reviews={userReviews} />

        {/* Referral Tree Adjuster */}
        <ReferralAdjusterForm
          userId={id}
          referrer={referredByRow || null}
          referees={referredUsers}
        />

        {/* Coupon Code Issuer */}
        {user.role === "client" && (
          <CouponIssuerForm userId={id} coupons={userCouponsList} />
        )}

        {/* Payout History & Override */}
        {editorProfile && editorPayoutsList.length > 0 && (
          <div className="rounded-xl border border-border bg-white overflow-hidden mt-5">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-900">Payout Schedules & History</p>
              <span className="text-xs text-muted-foreground">{editorPayoutsList.length} record{editorPayoutsList.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">ID</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Net Amount</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Release Date</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editorPayoutsList.map((payout) => (
                    <tr key={payout.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">P-{payout.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-gray-900">{formatCurrency(payout.netAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border",
                          payout.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-250" :
                          payout.status === "processing" ? "bg-amber-50 text-amber-700 border-amber-250 animate-pulse" :
                          "bg-blue-50 text-blue-700 border-blue-250"
                        )}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {payout.scheduledPayoutAt ? formatDate(payout.scheduledPayoutAt) : "Immediate"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {session.user.role === "admin" && (
                          <PayoutOverrideButton
                            payoutId={payout.id}
                            currentStatus={payout.status}
                            currentScheduledAt={payout.scheduledPayoutAt}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Flagged account warning */}
          {user.role === "client" && blockedByCount >= 3 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Flagged account</p>
                <p className="text-xs text-red-700 mt-0.5">Blocked by {blockedByCount} editors — recommend admin review.</p>
              </div>
            </div>
          )}

          {/* Account info */}
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <p className="font-semibold text-sm text-gray-900">Account Info</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5" /> Joined
                </span>
                <span className="font-medium text-gray-700">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email verified
                </span>
                <span className={cn("font-medium", user.emailVerified ? "text-emerald-600" : "text-amber-600")}>
                  {user.emailVerified ? formatDate(user.emailVerified) : "Not verified"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Last updated
                </span>
                <span className="font-medium text-gray-700">{formatDate(user.updatedAt)}</span>
              </div>
              {user.role === "client" && blockedByCount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Blocked by editors
                  </span>
                  <span className={cn("font-semibold", blockedByCount >= 3 ? "text-red-600" : "text-amber-600")}>
                    {blockedByCount}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Editor profile */}
          {editorProfile && (
            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-gray-900">Editor Profile</p>
                <Link
                  href={`/admin/editors/${editorProfile.id}`}
                  className="text-xs font-semibold text-[var(--brand-client)] hover:underline flex items-center gap-1"
                >
                  Manage <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">KYC status</span>
                  <span className={cn(
                    "font-semibold px-2 py-0.5 rounded-full capitalize",
                    editorProfile.kycStatus === "approved" ? "bg-emerald-100 text-emerald-700" :
                    editorProfile.kycStatus === "rejected" ? "bg-red-100 text-red-600" :
                    "bg-amber-100 text-amber-700"
                  )}>
                    {editorProfile.kycStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Availability</span>
                  <span className={cn(
                    "font-semibold px-2 py-0.5 rounded-full",
                    editorProfile.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {editorProfile.isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Featured</span>
                  <span className={cn(
                    "font-semibold px-2 py-0.5 rounded-full",
                    isCurrentlyFeatured ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-400"
                  )}>
                    {isCurrentlyFeatured ? "Active" : "Not featured"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total orders</span>
                  <span className="font-medium text-gray-700">{editorProfile.totalOrders}</span>
                </div>
              </div>
              {blockedClients.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Blocked clients ({blockedClients.length})</p>
                  <div className="space-y-2">
                    {blockedClients.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/admin/users/${b.clientId}`} className="text-xs font-medium text-[var(--brand-client)] hover:underline truncate block">
                            {b.clientName ?? b.clientEmail ?? "Unknown"}
                          </Link>
                          {b.reason && <p className="text-[10px] text-muted-foreground truncate">"{b.reason}"</p>}
                        </div>
                        <RemoveBlockButton blockId={b.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin controls */}
          {session.user.userId !== id && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-white p-4 space-y-3">
                <p className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                  <Settings2 className="w-4 h-4 text-gray-400" /> Admin Controls
                </p>
                <div className="space-y-2">
                  <AdjustXpForm userId={id} />
                  {session.user.role === "admin" && (
                    <>
                      <ResetPasswordButton userId={id} />
                      <TerminateSessionButton userId={id} />
                      <NotificationDispatcher userId={id} />
                      <CustomRatesForm
                        userId={id}
                        isEditor={!!editorProfile}
                        isClient={user.role === "client" || user.role === "admin"}
                        initialCommission={editorProfile?.customCommissionRate ?? null}
                        initialProcessingFee={user.customProcessingFeeRate ?? null}
                      />
                      {editorProfile && (
                        <BankDetailsOverrideForm
                          userId={id}
                          initialDetails={{
                            bankAccountName: editorProfile.bankAccountName ?? null,
                            bankAccountNumber: editorProfile.bankAccountNumber ?? null,
                            bankIfsc: editorProfile.bankIfsc ?? null,
                            panNumber: editorProfile.panNumber ?? null,
                            razorpayAccountId: editorProfile.razorpayAccountId ?? null,
                          }}
                        />
                      )}
                      <TwoFactorResetButton userId={id} enabled={user.twoFactorEnabled} />
                      <ProfileCustomizerForm
                        userId={id}
                        initialFrame={editorProfile?.activeFrame ?? null}
                        initialBadges={currentBadges}
                      />
                      {editorProfile && (
                        <SubscriptionOverrideForm
                          userId={id}
                          currentTier={editorProfile.membershipTier}
                          currentExpiresAt={editorProfile.membershipExpiresAt}
                        />
                      )}
                    </>
                  )}
                </div>
                {session.user.role === "admin" && (
                  <div className="pt-3 border-t border-border">
                    <RoleChangeForm userId={id} currentRole={user.role as UserRole} />
                  </div>
                )}
              </div>

              {session.user.role === "admin" && (
                <>
                  <WalletCreditsWidget
                    userId={id}
                    currentBalance={creditsPaise}
                    transactions={serializeCreditsLogs}
                  />

                  <FeatureFlagsForm
                    userId={id}
                    initialFlags={initialFlags}
                  />
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
