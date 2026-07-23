export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ArrowRight, Search } from "lucide-react";
import { db } from "@/lib/db";
import { orders, packages, users, editors, messages } from "@/lib/db/schema";
import { eq, desc, and, ne, sql } from "drizzle-orm";
import { cn, displayNameFromFull } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  pending:            { label: "Pending",    class: "bg-zinc-100 text-zinc-700" },
  in_progress:        { label: "Active",     class: "bg-blue-100 text-blue-700" },
  delivered:          { label: "Delivered",  class: "bg-purple-100 text-purple-700" },
  revision_requested: { label: "Revision",   class: "bg-amber-100 text-amber-700" },
  disputed:           { label: "Disputed",   class: "bg-red-100 text-red-700" },
  completed:          { label: "Completed",  class: "bg-green-100 text-green-700" },
  cancelled:          { label: "Cancelled",  class: "bg-gray-100 text-gray-500" },
};

export default async function ClientMessagesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.userId!;

  const rows = await db
    .select({
      orderId: orders.id,
      status: orders.status,
      packageTitle: packages.title,
      editorName: users.name,
      editorImage: users.image,
      updatedAt: orders.updatedAt,
      unread: sql<number>`COUNT(${messages.id}) FILTER (
        WHERE ${messages.senderId} != ${userId} AND ${messages.isBlocked} = false
      )::int`,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .leftJoin(messages, eq(messages.orderId, orders.id))
    .where(eq(orders.clientId, userId))
    .groupBy(orders.id, packages.id, users.id)
    .orderBy(desc(orders.updatedAt))
    .limit(50);

  if (rows.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-6 py-5">
          <div className="px-8 py-6">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-400 mt-0.5">Chat with your editors</p>
          </div>
        </div>
        <div className="px-8 py-6 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mb-4">
            <MessageSquare className="w-7 h-7 text-[#0EA5E9]" />
          </div>
          <p className="font-semibold text-gray-800">No conversations yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Place an order to start chatting with an editor.</p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#0EA5E9" }}
          >
            <Search className="w-3.5 h-3.5" /> Browse editors
          </Link>
        </div>
      </div>
    );
  }

  // Split active vs closed
  const active = rows.filter(r => !["completed", "cancelled"].includes(r.status));
  const closed = rows.filter(r => ["completed", "cancelled"].includes(r.status));

  function initials(name: string | null) {
    if (!name) return "E";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }

  const colors = ["bg-violet-500", "bg-blue-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500"];
  function avatarColor(id: string) {
    return colors[id.charCodeAt(0) % colors.length];
  }

  function ConvoRow({ row }: { row: typeof rows[0] }) {
    const s = STATUS_STYLES[row.status];
    const hasUnread = (row.unread ?? 0) > 0;
    return (
      <Link
        href={`/messages/${row.orderId}`}
        className={cn("flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group", hasUnread && "bg-[#0EA5E9]/[0.02]")}
      >
        <div className="relative shrink-0">
          {row.editorImage ? (
            <img src={row.editorImage} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm", avatarColor(row.orderId))}>
              {initials(row.editorName)}
            </div>
          )}
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#0EA5E9] border-2 border-white text-white text-[9px] font-bold flex items-center justify-center">
              {row.unread > 9 ? "9+" : row.unread}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm truncate", hasUnread ? "font-bold text-gray-900" : "font-semibold text-gray-900")}>{row.editorName ? displayNameFromFull(row.editorName) : "Editor"}</p>
            {s && <Badge className={cn("text-[10px] border-0 font-medium shrink-0 h-4 px-1.5", s.class)}>{s.label}</Badge>}
          </div>
          <p className={cn("text-xs truncate mt-0.5", hasUnread ? "text-gray-600 font-medium" : "text-gray-400")}>{row.packageTitle}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-400 mt-0.5">{rows.length} conversation{rows.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[#0EA5E9]" />
          </div>
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        {active.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Orders</p>
            </div>
            <div className="divide-y divide-gray-50">
              {active.map(row => <ConvoRow key={row.orderId} row={row} />)}
            </div>
          </div>
        )}

        {closed.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed / Closed</p>
            </div>
            <div className="divide-y divide-gray-50">
              {closed.map(row => <ConvoRow key={row.orderId} row={row} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}