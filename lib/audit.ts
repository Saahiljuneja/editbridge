import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import type { UserRole } from "@/types";

interface AuditEntry {
  actorId: string;
  actorRole: UserRole;
  action: string;        // e.g. "kyc.approve", "dispute.resolve", "user.role_change"
  entityType: string;    // e.g. "kycApplication", "dispute", "user"
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Fire-and-forget safe — failures are logged to console
 * but never propagated to the caller.
 */
export function logAction(entry: AuditEntry): void {
  db.insert(auditLogs)
    .values({
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? {},
    })
    .catch((err) => {
      console.error("[audit]", entry.action, err);
    });
}

/**
 * Awaitable version — use when you need confirmation the log was written
 * (e.g. in webhook handlers or batch jobs).
 */
export async function logActionAsync(entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
  });
}
