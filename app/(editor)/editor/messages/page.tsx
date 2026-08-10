export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { orders, packages, users, messages } from "@/lib/db/schema";
import { eq, desc, sql, ne, and } from "drizzle-orm";
import { displayNameFromFull, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  pending:            { label: "Pending",    dot: "bg-gray-400"    },
  in_progress:        { label: "Active",     dot: "bg-[#0EA5E9]"   },
  delivered:          { label: "Delivered",  dot: "bg-violet-500"  },
  revision_requested: { label: "Revision",   dot: "bg-amber-500"   },
  completed:          { label: "Completed",  dot: "bg-emerald-500" },
  cancelled:          { label: "Cancelled",  dot: "bg-gray-300"    },
};

export default async function EditorMessagesPage() {
  const session = await auth();
  if (!session || session.user.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const userId = session.user.userId!;

  const rows = await db
    .select({
      orderId: orders.id,
      status: orders.status,
      packageTitle: packages.title,
      clientName: users.name,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(users, eq(users.id, orders.clientId))
    .where(eq(orders.editorId, editorId))
    .orderBy(desc(orders.updatedAt))
    .limit(50);

  const orderIds = rows.map(r => r.orderId);

  let lastMessages: { orderId: string; content: string; senderId: string; createdAt: Date }[] = [];
  let unreadCounts: { orderId: string; count: number }[] = [];

  if (orderIds.length > 0) {
    const idList = sql.join(orderIds.map(id => sql`${id}::uuid`), sql`, `);

    const subquery = db
      .select({
        orderId: messages.orderId,
        content: messages.content,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
        rn: sql<number>`row_number() over (partition by ${messages.orderId} order by ${messages.createdAt} desc)`.as("rn"),
      })
      .from(messages)
      .where(and(sql`${messages.orderId} = ANY(ARRAY[${idList}])`, eq(messages.isBlocked, false)))
      .as("sub");

    [lastMessages, unreadCounts] = await Promise.all([
      db
        .select({
          orderId: subquery.orderId,
          content: subquery.content,
          senderId: subquery.senderId,
          createdAt: subquery.createdAt,
        })
        .from(subquery)
        .where(eq(subquery.rn, 1)),

      db
        .select({ orderId: messages.orderId, count: sql<number>`COUNT(*)::int` })
        .from(messages)
        .where(and(sql`${messages.orderId} = ANY(ARRAY[${idList}])`, ne(messages.senderId, userId), eq(messages.isBlocked, false)))
        .groupBy(messages.orderId),
    ]);
  }

  const lastMsgByOrder = new Map<string, typeof lastMessages[0]>();
  for (const msg of lastMessages) {
    if (!lastMsgByOrder.has(msg.orderId)) lastMsgByOrder.set(msg.orderId, msg);
  }
  const unreadByOrder = new Map(unreadCounts.map(r => [r.orderId, r.count]));
  const totalUnread = unreadCounts.reduce((s, r) => s + r.count, 0);

  const active  = rows.filter(r => !["completed", "cancelled"].includes(r.status));
  const archive = rows.filter(r =>  ["completed", "cancelled"].includes(r.status));

  function ConversationRow({ row }: { row: typeof rows[0] }) {
    const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
    const lastMsg = lastMsgByOrder.get(row.orderId);
    const unread  = unreadByOrder.get(row.orderId) ?? 0;
    const isMine  = lastMsg?.senderId === userId;
    const name    = displayNameFromFull(row.clientName);
    const initials = (row.clientName ?? "").split(" ").filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "C";

    return (
      <Link
        href={`/editor/messages/${row.orderId}`}
        className={cn("flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors", unread > 0 && "bg-sky-50/40")}
      >
        <div className="relative shrink-0">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold",
            unread > 0 ? "bg-[#0EA5E9] text-white" : "bg-[#0EA5E9]/10 text-[#0EA5E9]"
          )}>
            {initials}
          </div>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0EA5E9] border-2 border-white text-white text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className={cn("text-sm truncate", unread > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-800")}>
              {name}
            </p>
            <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
              {lastMsg ? formatDate(lastMsg.createdAt) : formatDate(row.updatedAt)}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate mb-0.5">{row.packageTitle}</p>
          {lastMsg ? (
            <p className={cn("text-xs truncate", unread > 0 ? "text-gray-700 font-medium" : "text-gray-400")}>
              {isMine && <span className="text-gray-400">You: </span>}
              {lastMsg.content}
            </p>
          ) : (
            <p className="text-xs text-gray-300 italic">No messages yet</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {unread > 0 ? (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0EA5E9] text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : (
            <span className="w-2 h-2" />
          )}
          <span className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {rows.length === 0
                ? "No conversations yet"
                : `${rows.length} conversation${rows.length !== 1 ? "s" : ""}${totalUnread > 0 ? ` · ${totalUnread} unread` : ""}`}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#0EA5E9]/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[#0EA5E9]" />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0EA5E9]/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-[#0EA5E9]" />
            </div>
            <p className="font-semibold text-gray-800">No conversations yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">When a client places an order, you can chat with them here.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</p>
                  <span className="text-xs font-medium text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 py-0.5 rounded-full">
                    {active.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {active.map(row => <ConversationRow key={row.orderId} row={row} />)}
                </div>
              </div>
            )}

            {archive.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed &amp; Closed</p>
                  <span className="text-xs text-gray-400">{archive.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {archive.map(row => <ConversationRow key={row.orderId} row={row} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
