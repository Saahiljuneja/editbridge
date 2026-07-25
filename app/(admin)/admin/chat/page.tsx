import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { messages, orders, packages, users } from "@/lib/db/schema";
import { eq, desc, or, sql } from "drizzle-orm";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { ChatMessageActions } from "./chat-actions";

const ALLOWED: UserRole[] = ["admin", "staff_support", "staff_dispute"];

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const session = await auth();
  if (!session || !ALLOWED.includes(session.user.role as UserRole)) redirect("/admin/dashboard");

  // Flagged messages (warnings + blocked)
  const flaggedMessages = await db
    .select({
      id: messages.id,
      content: messages.content,
      blockedReason: messages.blockedReason,
      isWarning: messages.isWarning,
      isBlocked: messages.isBlocked,
      createdAt: messages.createdAt,
      orderId: messages.orderId,
      senderName: users.name,
      packageTitle: packages.title,
    })
    .from(messages)
    .innerJoin(orders, eq(orders.id, messages.orderId))
    .leftJoin(packages, eq(packages.id, orders.packageId))
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(or(eq(messages.isWarning, true), eq(messages.isBlocked, true)))
    .orderBy(desc(messages.createdAt))
    .limit(100);

  const warnings = flaggedMessages.filter(m => m.isWarning).length;
  const blocked = flaggedMessages.filter(m => m.isBlocked).length;

  return (
    <div className="px-8 py-6 space-y-10">
      <PageHeader
        title="Chat Oversight"
        subtitle="Monitor all conversations and flagged messages"
      />

      {/* â"€â"€ All Conversations â"€â"€ */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">All Conversations</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">Every order chat â€" click to read the full thread.</p>
        </div>

        <ConversationsTable orderId={undefined} />
      </section>

      {/* â"€â"€ Flagged Messages â"€â"€ */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Flagged Messages</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">{warnings} warning{warnings !== 1 ? "s" : ""} &middot; {blocked} blocked</p>
        </div>

        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Users get <strong>3 warnings</strong> before messages are hard-blocked and hashed.
          Blocked content is stored as a SHA-256 hash â€" unreadable to everyone.
        </div>

        {flaggedMessages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-8 h-8 text-muted-foreground" />}
            heading="No flagged messages"
            description="The content filter has not flagged any messages yet."
          />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-white dark:bg-gray-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sender</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Content</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flaggedMessages.map((row, i) => (
                  <tr key={row.id} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-muted/20")}>
                    <td className="px-4 py-3">
                      {row.isBlocked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Blocked</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Warning</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/chat/${row.orderId}`} className="font-medium text-[#0EA5E9] hover:underline underline-offset-2 truncate max-w-[120px] block">
                        {row.packageTitle ?? "Custom order"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.senderName ?? "Unknown"}</td>
                    <td className="px-4 py-3 text-xs max-w-[160px]">
                      <span className={row.isBlocked ? "text-red-600" : "text-amber-600"}>
                        {row.blockedReason ?? "Policy violation"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                      {row.isBlocked ? (
                        <span className="text-gray-400 italic">[content hashed â€" unreadable]</span>
                      ) : (
                        row.content
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-3"><ChatMessageActions messageId={row.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// Separate async component for conversations list to avoid issues with complex joins
async function ConversationsTable(_: { orderId: undefined }) {
  const result = await db.execute(sql`
    SELECT
      o.id AS "orderId",
      p.title AS "packageTitle",
      o.status AS "orderStatus",
      cu.name AS "clientName",
      eu.name AS "editorName",
      COUNT(m.id)::int AS "messageCount",
      MAX(m.created_at) AS "lastMessageAt",
      BOOL_OR(m.is_warning OR m.is_blocked) AS "hasFlag"
    FROM messages m
    INNER JOIN orders o ON o.id = m.order_id
    LEFT JOIN packages p ON p.id = o.package_id
    INNER JOIN users cu ON cu.id = o.client_id
    INNER JOIN editors e ON e.id = o.editor_id
    INNER JOIN users eu ON eu.id = e.user_id
    GROUP BY o.id, p.title, o.status, cu.name, eu.name
    ORDER BY MAX(m.created_at) DESC
    LIMIT 50
  `);

  const conversations = result.rows as Array<{
    orderId: string;
    packageTitle: string | null;
    orderStatus: string;
    clientName: string;
    editorName: string;
    messageCount: number;
    lastMessageAt: Date;
    hasFlag: boolean;
  }>;

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-8 h-8 text-muted-foreground" />}
        heading="No conversations yet"
        description="Conversations appear here once editors and clients start chatting."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-white dark:bg-gray-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Editor</th>
            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            <th className="text-center px-4 py-3 font-medium text-muted-foreground">Messages</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Last activity</th>
            <th className="text-right px-4 py-3 font-medium text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody>
          {conversations.map((row, i) => (
            <tr key={row.orderId} className={cn("border-b border-border last:border-0 hover:bg-muted/20 transition-colors", i % 2 === 1 && "bg-muted/10")}>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{row.packageTitle ?? "Custom order"}</p>
                {row.hasFlag && (
                  <span className="text-[10px] font-semibold text-amber-600">âš  flagged activity</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.clientName}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.editorName}</td>
              <td className="px-4 py-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{row.orderStatus.replace(/_/g, " ")}</span>
              </td>
              <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-200 font-semibold">{row.messageCount}</td>
              <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">{formatDateTime(row.lastMessageAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/chat/${row.orderId}`} className="text-xs font-semibold text-[#0EA5E9] hover:underline underline-offset-2 whitespace-nowrap">
                  View chat &rarr;
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
