import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { editors, users, orders, payouts, reviews } from "@/lib/db/schema";
import { eq, sql, desc, count, avg } from "drizzle-orm";
import { formatCurrency } from "@/lib/utils";
import { EditorPerformanceClient } from "./editor-performance-client";

export const dynamic = "force-dynamic";

export default async function AdminEditorPerformancePage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const rows = await db
    .select({
      editorId: editors.id,
      name: users.name,
      email: users.email,
      kycStatus: editors.kycStatus,
      totalOrders: editors.totalOrders,
      completedOrders: sql<number>`COALESCE((
        SELECT COUNT(*) FROM ${orders} o
        WHERE o.editor_id = ${editors.id} AND o.status = 'completed'
      )::int, 0)`,
      activeOrders: sql<number>`COALESCE((
        SELECT COUNT(*) FROM ${orders} o
        WHERE o.editor_id = ${editors.id} AND o.status IN ('pending','in_progress','delivered','revision_requested')
      )::int, 0)`,
      totalRevenue: sql<number>`COALESCE((
        SELECT SUM(p.gross_amount) FROM ${payouts} p
        WHERE p.editor_id = ${editors.id} AND p.status = 'completed'
      )::int, 0)`,
      avgRating: sql<number | null>`(
        SELECT AVG(r.rating)::numeric(3,1) FROM ${reviews} r
        INNER JOIN ${orders} o ON o.id = r.order_id
        WHERE o.editor_id = ${editors.id} AND r.role = 'client'
      )`,
      reviewCount: sql<number>`COALESCE((
        SELECT COUNT(*) FROM ${reviews} r
        INNER JOIN ${orders} o ON o.id = r.order_id
        WHERE o.editor_id = ${editors.id} AND r.role = 'client'
      )::int, 0)`,
    })
    .from(editors)
    .innerJoin(users, eq(users.id, editors.userId))
    .where(sql`${editors.kycStatus} = 'approved'`)
    .orderBy(desc(editors.totalOrders))
    .limit(200);

  const serialized = rows.map(r => ({
    ...r,
    avgRating: r.avgRating ? Number(r.avgRating) : null,
  }));

  return (
    <div className="px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editor Performance</h1>
        <p className="text-sm text-gray-500 mt-1">Sortable table of all KYC-approved editors by revenue, orders, and rating.</p>
      </div>
      <EditorPerformanceClient rows={serialized} />
    </div>
  );
}
