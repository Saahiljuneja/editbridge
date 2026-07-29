export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, messages, users, packages, editors } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { ChatWindow } from "@/components/chat/chat-window";
import { displayNameFromFull } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ClientChatPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session || session.user?.role !== "client") redirect("/login");

  const { orderId } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      editorUserId: editors.userId,
      status: orders.status,
      packageTitle: packages.title,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(editors, eq(editors.id, orders.editorId))
    .where(and(eq(orders.id, orderId), eq(orders.clientId, session.user.userId!)))
    .limit(1);

  if (!order) notFound();

  const [editorUser, initialMessages] = await Promise.all([
    db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, order.editorUserId))
      .limit(1)
      .then(r => r[0]),
    db
      .select()
      .from(messages)
      .where(eq(messages.orderId, orderId))
      .orderBy(asc(messages.createdAt)),
  ]);

  const editorName = displayNameFromFull(editorUser?.name);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link
            href="/client/messages"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Messages
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm font-medium text-gray-700 truncate">{order.packageTitle}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <ChatWindow
          orderId={orderId}
          currentUserId={session.user.userId!}
          initialMessages={initialMessages.map(m => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          }))}
          otherPartyName={editorName}
        />
      </div>
    </div>
  );
}
