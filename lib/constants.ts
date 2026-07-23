import type { OrderStatus, UserRole } from "@/types";

export const COMMISSION_RATE = 0.15;

export const AUTO_APPROVE_DAYS = 7;

export const MAX_FILE_SIZE_MB = 500;

export const ORDER_STATUSES: Record<OrderStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  delivered: "Delivered",
  revision_requested: "Revision Requested",
  completed: "Completed",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

export const USER_ROLES: Record<UserRole, string> = {
  client: "Client",
  editor: "Editor",
  admin: "Admin",
  staff_kyc: "KYC Reviewer",
  staff_support: "Support Agent",
  staff_dispute: "Dispute Handler",
  staff_moderation: "Content Moderator",
};

export const KYC_DOCUMENT_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "passport", label: "Passport" },
] as const;

export const DISPUTE_WINDOW_DAYS = 14;

export const DISPUTE_FLAG_THRESHOLD = 3;

export const DISPUTE_FLAG_WINDOW_DAYS = 90;
