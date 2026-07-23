import type { UserRole } from "@/types";

// ── Permission map ────────────────────────────────────────────────────────────
// Single source of truth: which roles can perform which actions.
// Replaces scattered ALLOWED arrays across admin pages and API routes.

export const PERMISSIONS = {
  // KYC
  "kyc:view": ["admin", "staff_kyc"],
  "kyc:review": ["admin", "staff_kyc"],

  // Orders
  "orders:view_all": ["admin", "staff_support", "staff_dispute"],
  "orders:cancel_any": ["admin", "staff_support"],

  // Disputes
  "disputes:view": ["admin", "staff_support", "staff_dispute"],
  "disputes:resolve": ["admin", "staff_dispute"],

  // Users
  "users:view": ["admin", "staff_support", "staff_dispute", "staff_moderation"],
  "users:change_role": ["admin"],

  // Revenue / payouts
  "revenue:view": ["admin"],

  // Staff management
  "staff:view": ["admin"],
  "staff:manage": ["admin"],

  // Chat oversight
  "chat:view_flagged": ["admin", "staff_support", "staff_dispute"],

  // Moderation
  "moderation:view": ["admin", "staff_moderation"],

  // Audit log
  "audit:view": ["admin"],
} as const satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Returns true if the given role has the given permission.
 * Use in server components and server actions.
 */
export function can(role: UserRole | string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/**
 * Returns true if the role is any admin/staff role.
 */
export function isStaff(role: UserRole | string | undefined | null): boolean {
  if (!role) return false;
  return ["admin", "staff_kyc", "staff_support", "staff_dispute", "staff_moderation"].includes(role);
}

/**
 * Asserts permission for an API route handler. Returns a 403 JSON response object
 * if the check fails, or null if it passes — so callers can do:
 *
 *   const deny = assertPermission(session?.user?.role, "kyc:review");
 *   if (deny) return deny;
 */
export function assertPermission(
  role: UserRole | string | undefined | null,
  permission: Permission
): Response | null {
  if (!can(role, permission)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
