import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { disputes, orders, packages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  open:     { label: "Open",     class: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolved", class: "bg-green-100 text-green-700" },
  closed:   { label: "Closed",   class: "bg-gray-100 text-gray-500" },
};

export default async function DisputesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rows = await db
    .select({
      id: disputes.id,
      status: disputes.status,
      reason: disputes.reason,
      resolutionType: disputes.resolutionType,
      createdAt: disputes.createdAt,
      orderId: disputes.orderId,
      packageTitle: packages.title,
    })
    .from(disputes)
    .innerJoin(orders, eq(orders.id, disputes.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.clientId, session.user.userId!))
    .orderBy(desc(disputes.createdAt))
    .limit(50);

  const openCount = rows.filter(r => r.status === "open").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Disputes</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {openCount > 0 ? `${openCount} open dispute${openCount !== 1 ? "s" : ""}` : "All disputes resolved"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-green-500" />
            </div>
            <p className="font-semibold text-gray-800">No disputes</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">You haven&apos;t opened any disputes. We hope things are going smoothly!</p>
            <Link
              href="/client/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--brand-client)" }}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> View Orders
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {rows.map((d) => {
                const s = STATUS_STYLES[d.status] ?? { label: d.status, class: "bg-gray-100 text-gray-500" };
                return (
                  <Link
                    key={d.id}
                    href={`/client/disputes/${d.id}`}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", s.class)}>
                          {s.label}
                        </span>
                        <p className="text-sm font-semibold text-gray-900 truncate">{d.packageTitle ?? "Custom order"}</p>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1 mb-1">{d.reason}</p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>Order #{d.orderId.slice(0, 8)}</span>
                        <span>·</span>
                        <span>{formatDate(d.createdAt)}</span>
                        {d.resolutionType && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{d.resolutionType}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-sm shrink-0">&rsaquo;</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
