import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, messages, users, packages } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { ChatWindow } from "@/components/chat/chat-window";
import { displayNameFromFull } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditorChatPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") redirect("/login");

  const editorId = session.user.editorId;
  if (!editorId) redirect("/editor/kyc");

  const { orderId } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      clientId: orders.clientId,
      status: orders.status,
      packageTitle: packages.title,
    })
    .from(orders)
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .where(and(eq(orders.id, orderId), eq(orders.editorId, editorId)))
    .limit(1);

  if (!order) notFound();

  const [clientUser, initialMessages] = await Promise.all([
    db.select({ name: users.name }).from(users).where(eq(users.id, order.clientId)).limit(1).then((r) => r[0]),
    db.select().from(messages).where(eq(messages.orderId, orderId)).orderBy(asc(messages.createdAt)),
  ]);

  const clientName = displayNameFromFull(clientUser?.name);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/editor/orders/${orderId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to order
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{order.packageTitle}</span>
      </div>

      <ChatWindow
        orderId={orderId}
        currentUserId={session.user.userId!}
        initialMessages={initialMessages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        otherPartyName={clientName}
        isEditor
      />
    </div>
  );
}
