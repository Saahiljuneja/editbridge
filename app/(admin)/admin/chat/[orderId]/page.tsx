import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { messages, orders, packages, users, editors } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils";
import { ArrowLeft, AlertTriangle, Ban, Download } from "lucide-react";
import Link from "next/link";
import { getPublicUrl } from "@/lib/r2";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { AdminChatInterventionForm } from "./intervention-form";
import { BlockMessageButton } from "./block-message-button";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute", "staff_moderation"];

export const dynamic = "force-dynamic";

export default async function AdminChatConversationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  const { orderId } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      clientId: orders.clientId,
      editorId: orders.editorId,
      packageTitle: packages.title,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) notFound();

  const [editorRow] = await db
    .select({ userId: editors.userId })
    .from(editors)
    .where(eq(editors.id, order.editorId))
    .limit(1);

  const [[clientUser], [editorUser]] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, order.clientId)).limit(1),
    editorRow
      ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, editorRow.userId)).limit(1)
      : Promise.resolve([null]),
  ]);

  const allMessages = await db
    .select({
      id: messages.id,
      content: messages.content,
      fileUrl: messages.fileUrl,
      fileName: messages.fileName,
      isWarning: messages.isWarning,
      isBlocked: messages.isBlocked,
      blockedReason: messages.blockedReason,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
      senderName: users.name,
    })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.orderId, orderId))
    .orderBy(asc(messages.createdAt));

  const clientId = clientUser?.id;
  const editorUserId = editorUser?.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Back */}
      <Link href="/admin/chat" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Chat Oversight
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Order conversation</p>
            <h1 className="text-lg font-bold text-gray-900">{order.packageTitle ?? "Custom order"}</h1>
          </div>
          <Link href={`/admin/orders/${orderId}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2">
            View order →
          </Link>
        </div>
        <div className="flex items-center gap-6 mt-4 text-sm">
          <div>
            <p className="text-xs text-gray-400">Client</p>
            <p className="font-medium text-gray-900">{clientUser?.name ?? "—"}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-xs text-gray-400">Editor</p>
            <p className="font-medium text-gray-900">{editorUser?.name ?? "—"}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-xs text-gray-400">Messages</p>
            <p className="font-medium text-gray-900">{allMessages.length}</p>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div>
            <p className="text-xs text-gray-400">Status</p>
            <p className="font-medium text-gray-900 capitalize">{order.status.replace(/_/g, " ")}</p>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-2.5 text-xs text-blue-700 mb-5">
        Admin view · All messages visible including flagged. Blocked content is hashed and unreadable. Use the form below to send an emergency message.
      </div>

      {/* Messages */}
      {allMessages.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-400">No messages in this conversation yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allMessages.map((msg) => {
            const isClient = msg.senderId === clientId;
            const isEditorMsg = msg.senderId === editorUserId;
            const isAdmin = !isClient && !isEditorMsg;
            const label = isClient ? "Client" : isEditorMsg ? "Editor" : "Admin";
            const labelColor = isClient ? "text-[#0EA5E9]" : isEditorMsg ? "text-violet-600" : "text-orange-600";

            if (msg.isBlocked) {
              return (
                <div key={msg.id} className="flex items-start gap-3 px-2 py-1.5">
                  <Ban className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-semibold", labelColor)}>{msg.senderName} ({label})</span>
                      <span className="text-[10px] text-gray-400">{formatDateTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-xs text-red-500 font-medium">BLOCKED — {msg.blockedReason}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{msg.content}</p>
                  </div>
                </div>
              );
            }

            if (msg.isWarning) {
              return (
                <div key={msg.id} className="flex items-start gap-3 px-2 py-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-semibold", labelColor)}>{msg.senderName} ({label})</span>
                      <span className="text-[10px] text-gray-400">{formatDateTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-xs text-amber-600 font-medium">WARNING — {msg.blockedReason}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{msg.content}</p>
                  </div>
                </div>
              );
            }

            if (isAdmin) {
              return (
                <div key={msg.id} className="flex justify-center px-2 py-1">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm bg-orange-50 border border-orange-200">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-[10px] font-semibold text-orange-600">{msg.senderName} · Admin Intervention</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{formatDateTime(msg.createdAt)}</span>
                    </div>
                    {msg.content && <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={cn("group flex items-start gap-1 px-2 py-1", isClient ? "justify-start" : "justify-end flex-row-reverse")}>
                <BlockMessageButton messageId={msg.id} />
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm", isClient ? "bg-white border border-gray-100 rounded-bl-sm" : "bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 rounded-br-sm")}>
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className={cn("text-[10px] font-semibold", labelColor)}>{msg.senderName} · {label}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{formatDateTime(msg.createdAt)}</span>
                  </div>
                  {msg.content && <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                  {msg.fileUrl && msg.fileName && (
                    <a href={getPublicUrl(msg.fileUrl)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-1.5 text-xs text-[#0EA5E9] hover:underline">
                      <Download className="w-3 h-3 shrink-0" />
                      {msg.fileName}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin intervention form */}
      <AdminChatInterventionForm orderId={orderId} />
    </div>
  );
}
