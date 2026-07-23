export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, packages, editors, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { ReorderForm } from "./reorder-form";

export default async function ReorderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { orderId } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      brief: orders.brief,
      briefData: orders.briefData,
      clientId: orders.clientId,
      packageId: orders.packageId,
      packageTitle: packages.title,
      packageDescription: packages.description,
      packagePrice: packages.price,
      packageDeliveryDays: packages.deliveryDays,
      editorId: editors.id,
      editorName: users.name,
      editorDisplayName: editors.displayName,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .where(and(eq(orders.id, orderId), eq(orders.clientId, session.user.userId!)))
    .limit(1);

  if (!order || !order.packageId) notFound();

  const displayName = order.editorDisplayName || order.editorName || "Editor";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-gray-400 mb-0.5">Re-ordering</p>
          <h1 className="text-xl font-bold text-gray-900">{order.packageTitle}</h1>
          <p className="text-sm text-gray-400 mt-0.5">with {displayName}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Package card */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Package details</p>
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{order.packageTitle}</p>
              {order.packageDescription && (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">{order.packageDescription}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              {order.packagePrice != null && (
                <p className="font-bold text-gray-900">
                  ₹{(order.packagePrice / 100).toFixed(0)}
                </p>
              )}
              {order.packageDeliveryDays != null && (
                <p className="text-xs text-gray-400">{order.packageDeliveryDays}d delivery</p>
              )}
            </div>
          </div>
        </div>

        {/* Brief editor */}
        <ReorderForm
          packageId={order.packageId}
          orderId={order.id}
          previousBrief={order.brief}
        />
      </div>
    </div>
  );
}
