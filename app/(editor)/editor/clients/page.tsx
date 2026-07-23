export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, users, packages, reviews } from "@/lib/db/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { Users, Star, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function EditorClientsPage() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");
  const editorId = session.user.editorId!;
  if (!editorId) redirect("/editor/kyc");

  // All orders for this editor, joined to client + package
  const rows = await db
    .select({
      clientId: orders.clientId,
      clientName: users.name,
      clientEmail: users.email,
      clientImage: users.image,
      packageTitle: packages.title,
      status: orders.status,
      totalAmount: orders.totalAmount,
      commissionAmount: orders.commissionAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.clientId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.editorId, editorId))
    .orderBy(desc(orders.createdAt));

  // Aggregate per client
  type ClientData = {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    orderCount: number;
    completedCount: number;
    totalSpent: number;
    lastOrderDate: Date;
    packages: Set<string>;
  };

  const clientMap = new Map<string, ClientData>();
  for (const row of rows) {
    if (!clientMap.has(row.clientId)) {
      clientMap.set(row.clientId, {
        id: row.clientId,
        name: row.clientName,
        email: row.clientEmail,
        image: row.clientImage,
        orderCount: 0,
        completedCount: 0,
        totalSpent: 0,
        lastOrderDate: row.createdAt!,
        packages: new Set(),
      });
    }
    const c = clientMap.get(row.clientId)!;
    c.orderCount++;
    if (row.status === "completed") {
      c.completedCount++;
      c.totalSpent += (row.totalAmount - row.commissionAmount);
    }
    if (row.createdAt && row.createdAt > c.lastOrderDate) c.lastOrderDate = row.createdAt;
    if (row.packageTitle) c.packages.add(row.packageTitle);
  }

  const clients = Array.from(clientMap.values()).sort(
    (a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime()
  );

  const totalClients = clients.length;
  const repeatClients = clients.filter(c => c.orderCount > 1).length;

  function initials(name: string | null, email: string) {
    if (name) return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  }

  const colors = ["bg-blue-500", "bg-blue-500", "bg-indigo-500", "bg-pink-500", "bg-amber-500", "bg-teal-500"];
  function avatarColor(id: string) {
    const idx = id.charCodeAt(0) % colors.length;
    return colors[idx];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Client Directory</h1>
            <p className="text-sm text-gray-400 mt-0.5">All clients who have worked with you</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#0EA5E9]" />
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Clients</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalClients}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Repeat Clients</p>
            <p className="text-2xl font-bold text-[#0EA5E9] mt-1">{repeatClients}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0}% retention
            </p>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-[#0EA5E9]" />
            </div>
            <p className="font-semibold text-gray-800">No clients yet</p>
            <p className="text-sm text-gray-400 mt-1">Clients who place orders will appear here.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {clients.map((client) => (
                <div key={client.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  {/* Avatar */}
                  {client.image ? (
                    <img src={client.image} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0", avatarColor(client.id))}>
                      {initials(client.name, client.email)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{client.name ?? client.email}</p>
                    <p className="text-xs text-gray-400 truncate">{client.email}</p>
                    {client.packages.size > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.from(client.packages).slice(0, 2).map(pkg => (
                          <span key={pkg} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {pkg}
                          </span>
                        ))}
                        {client.packages.size > 2 && (
                          <span className="text-[10px] text-gray-400">+{client.packages.size - 2}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <div className="flex items-center gap-1.5 justify-end">
                      <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600 font-medium">{client.orderCount} order{client.orderCount !== 1 ? "s" : ""}</span>
                    </div>
                    {client.completedCount > 0 && (
                      <p className="text-xs font-semibold text-[#0EA5E9]">
                        ₹{((client.totalSpent) / 100).toLocaleString("en-IN")} earned
                      </p>
                    )}
                    {client.orderCount > 1 && (
                      <span className="text-[10px] bg-[#0EA5E9]/10 text-[#0EA5E9] font-medium px-2 py-0.5 rounded-full">
                        Repeat client
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
