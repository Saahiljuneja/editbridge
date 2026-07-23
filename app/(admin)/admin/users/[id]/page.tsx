import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, editors, orders, reviews, clientBlocks } from "@/lib/db/schema";
import { eq, count, sql, desc } from "drizzle-orm";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { RoleChangeForm } from "./role-change-form";
import { SuspendForm } from "./suspend-form";
import { ImpersonateButton } from "./impersonate-button";
import { SendEmailForm } from "./send-email-form";
import { FeaturedToggleForm } from "./featured-toggle-form";
import { RemoveBlockButton } from "./remove-block-button";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute", "staff_moderation"];

const ROLE_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  editor: "bg-[#0EA5E9]/10 text-[#0EA5E9]",
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
    .select({ id: editors.id, kycStatus: editors.kycStatus, totalOrders: editors.totalOrders, isAvailable: editors.isAvailable, isFeatured: editors.isFeatured, featuredUntil: editors.featuredUntil })
    .from(editors)
    .where(eq(editors.userId, id))
    .limit(1);

  const isCurrentlyFeatured = !!editorProfile?.isFeatured && !!editorProfile?.featuredUntil && editorProfile.featuredUntil > new Date();

  const [[totalOrders], [totalSpent], [avgRating]] = await Promise.all([
    db.select({ value: count() }).from(orders).where(eq(orders.clientId, id)),
    db.select({ value: sql<number>`COALESCE(SUM(${orders.totalAmount}),0)::int` }).from(orders).where(sql`${orders.clientId} = ${id} AND ${orders.status} = 'completed'`),
    db.select({ value: sql<number>`ROUND(AVG(${reviews.rating}),1)` }).from(reviews).where(eq(reviews.revieweeId, id)),
  ]);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-4">
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
          ← Users
        </Link>
      </div>

      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-lg font-bold text-[#0EA5E9] shrink-0">
          {(user.name ?? user.email).slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-bold">{user.name ?? "No name"}</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <Badge className={cn("mt-1 text-xs border-0", ROLE_COLORS[user.role] ?? "bg-muted")}>
            {user.role}
          </Badge>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <p className="text-2xl font-bold">{totalOrders.value}</p>
          <p className="text-xs text-muted-foreground mt-1">Total orders</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <p className="text-2xl font-bold">{formatCurrency(totalSpent.value)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total spent</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4 text-center">
          <p className="text-2xl font-bold">{avgRating.value ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg. rating received</p>
        </div>
      </div>

      {editorProfile && (
        <div className="rounded-xl border border-border bg-white p-5 mb-6 space-y-2 text-sm">
          <p className="font-semibold mb-3">Editor profile</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">KYC status</span>
            <Badge className={cn("text-xs border-0", editorProfile.kycStatus === "approved" ? "bg-green-100 text-green-700" : editorProfile.kycStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
              {editorProfile.kycStatus}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total orders</span>
            <span>{editorProfile.totalOrders}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Available</span>
            <span>{editorProfile.isAvailable ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Featured placement</span>
            <span>{isCurrentlyFeatured ? "Active" : "Not featured"}</span>
          </div>
        </div>
      )}

      {editorProfile && blockedClients.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5 mb-6 text-sm">
          <p className="font-semibold mb-3">Blocked clients ({blockedClients.length})</p>
          <div className="space-y-3">
            {blockedClients.map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                <div>
                  <Link href={`/admin/users/${b.clientId}`} className="font-medium hover:underline">
                    {b.clientName ?? "Unknown"}
                  </Link>
                  <p className="text-xs text-muted-foreground">{b.clientEmail}</p>
                  {b.reason && <p className="text-xs text-muted-foreground mt-1">"{b.reason}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">Blocked {formatDate(b.createdAt)}</p>
                </div>
                <RemoveBlockButton blockId={b.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {user.role === "client" && (
        <div className={cn(
          "rounded-xl border p-5 mb-6 text-sm",
          blockedByCount >= 3 ? "border-red-200 bg-red-50" : "border-border bg-white"
        )}>
          <div className="flex items-center justify-between">
            <p className="font-semibold">Blocked by editors</p>
            <span className={cn("font-bold", blockedByCount >= 3 ? "text-red-700" : "")}>{blockedByCount}</span>
          </div>
          {blockedByCount >= 3 && (
            <p className="text-xs text-red-700 mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Blocked by 3 or more editors — recommend admin review of this account.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-5 mb-6 text-sm space-y-2">
        <p className="font-semibold mb-3">Account info</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Joined</span>
          <span>{formatDate(user.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last updated</span>
          <span>{formatDate(user.updatedAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email verified</span>
          <span>{user.emailVerified ? formatDate(user.emailVerified) : "Not verified"}</span>
        </div>
      </div>

      {/* Quick actions */}
      {session.user.userId !== id && (
        <div className="flex flex-wrap gap-2 mb-4">
          <SuspendForm userId={id} isActive={user.isActive} />
          {session.user.role === "admin" && (
            <ImpersonateButton userId={id} />
          )}
          <SendEmailForm userId={id} userRole={user.role} />
          {session.user.role === "admin" && editorProfile && (
            <FeaturedToggleForm editorId={editorProfile.id} isFeatured={isCurrentlyFeatured} />
          )}
        </div>
      )}

      {/* Role change — admin only */}
      {session.user.role === "admin" && session.user.userId !== id && (
        <RoleChangeForm userId={id} currentRole={user.role as UserRole} />
      )}
    </div>
  );
}
