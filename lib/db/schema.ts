import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  varchar,
  pgEnum,
  primaryKey,
  unique,
  index,
  real,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "client",
  "editor",
  "admin",
  "staff_kyc",
  "staff_support",
  "staff_dispute",
  "staff_moderation",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "pending",
  "approved",
  "rejected",
  "expired",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "in_progress",
  "delivered",
  "revision_requested",
  "completed",
  "disputed",
  "cancelled",
]);


export const disputeStatusEnum = pgEnum("dispute_status", ["open", "resolved"]);

export const extensionStatusEnum = pgEnum("extension_status", ["pending", "approved", "rejected"]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "pending",   // waiting for editor to respond
  "offered",   // editor sent a price offer
  "accepted",  // client accepted — awaiting payment
  "paid",      // payment done, order created
  "declined",  // client declined the offer
  "expired",   // no offer within 48h
]);

export const resolutionTypeEnum = pgEnum("resolution_type", [
  "refund",
  "release",
  "split",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "processing",
  "completed",
]);

export const orderEventTypeEnum = pgEnum("order_event_type", [
  "order_placed",
  "delivery_uploaded",
  "revision_requested",
  "extension_requested",
  "extension_approved",
  "extension_rejected",
  "dispute_opened",
  "dispute_resolved",
  "order_completed",
  "order_cancelled",
  "payout_scheduled",
  "message_flagged", // internal — chat moderation flag, admin/staff view only
]);

export const portfolioItemTypeEnum = pgEnum("portfolio_item_type", [
  "video",
  "image",
]);

export const reviewRoleEnum = pgEnum("review_role", ["client", "editor"]);

export const profileEventTypeEnum = pgEnum("profile_event_type", ["profile_view", "package_click", "portfolio_view"]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password"),
  name: text("name"),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("client"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  onboarded: boolean("onboarded").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  referralCode: text("referral_code").unique(),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"), // AES-256 encrypted at rest — never returned by any API
  twoFactorBackupCodes: text("two_factor_backup_codes").array(), // hashed one-time codes
  twoFactorVerifiedAt: timestamp("two_factor_verified_at", { mode: "date" }), // internal single-use gate consumed by the jwt callback right after a successful /2fa check — never read or set by client code
  loginStreakDays: integer("login_streak_days").notNull().default(0),
  lastLoginDate: text("last_login_date"), // "YYYY-MM-DD" UTC — used for 7-day login streak
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// NextAuth required tables — column property names must match @auth/drizzle-adapter expectations
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [
  index("accounts_user_id_idx").on(t.userId),
]);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [
  index("sessions_user_id_idx").on(t.userId),
]);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ─── Editor profile ───────────────────────────────────────────────────────────

export const editors = pgTable("editors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  title: text("title"),
  languages: text("languages"),         // JSON: [{language, level}]
  niche: text("niche"),
  experienceLevel: text("experience_level"), // entry | intermediate | expert
  yearsOfExperience: integer("years_of_experience"),
  workStyleTags: text("work_style_tags"),   // JSON: string[]
  turnaround: text("turnaround"),           // JSON: [{type, days}]
  faqs: text("faqs"),                       // JSON: [{question, answer}]
  bio: text("bio"),
  avgResponseTime: integer("avg_response_time"), // minutes
  completionRate: integer("completion_rate"), // percentage 0–100
  totalOrders: integer("total_orders").notNull().default(0),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("pending"),
  kycRejectionReason: text("kyc_rejection_reason"),
  location: text("location"),
  previousClients: text("previous_clients"),
  isAvailable: boolean("is_available").notNull().default(true),
  maxActiveOrders: integer("max_active_orders"),
  revisionScopeNote: text("revision_scope_note"), // editor-defined scope: what is/isn't a revision
  coverImage: text("cover_image"),
  featuredVideoUrl: text("featured_video_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredUntil: timestamp("featured_until", { mode: "date" }),
  membershipTier: text("membership_tier").notNull().default("hobby"), // hobby | starter | pro | agency
  membershipExpiresAt: timestamp("membership_expires_at", { mode: "date" }),
  razorpayAccountId: text("razorpay_account_id"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  panNumber: text("pan_number"),
  panNumberHash: text("pan_number_hash"), // HMAC-SHA256 of PAN — used for duplicate detection after encryption
  kycRejectionCount: integer("kyc_rejection_count").notNull().default(0),
  kycApprovedAt: timestamp("kyc_approved_at", { mode: "date" }),
  vacationUntil: timestamp("vacation_until", { mode: "date" }),
  activeFrame: text("active_frame"),    // active profile frame key, e.g. "frame_gold"
  rankScore: real("rank_score"),        // 0–1 composite score updated nightly by cron
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Composite index for the browse/category query hot path:
  // WHERE kyc_status = 'approved' AND is_available = true ORDER BY rank_score DESC
  index("editors_kyc_available_rank_idx").on(t.kycStatus, t.isAvailable, t.rankScore),
  index("editors_featured_idx").on(t.isFeatured, t.featuredUntil),
]);

export const kycApplications = pgTable("kyc_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(), // aadhaar | pan | passport
  documentNumber: text("document_number"),        // e.g. XXXX-XXXX-XXXX for Aadhaar
  documentUrl: text("document_url").notNull(), // R2 key — front / bio-data page
  documentBackUrl: text("document_back_url"),  // R2 key — Aadhaar back only
  panDocumentUrl: text("pan_document_url"),    // R2 key — PAN card image (always required)
  selfieUrl: text("selfie_url"),               // R2 key — selfie holding document (always required)
  status: kycStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { mode: "date" }),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),
  submissionNumber: integer("submission_number").notNull().default(1),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const skills = pgTable("skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => [
  index("skills_editor_id_idx").on(t.editorId),
]);

export const tools = pgTable("tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => [
  index("tools_editor_id_idx").on(t.editorId),
]);

export const portfolioItems = pgTable("portfolio_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  type: portfolioItemTypeEnum("type").notNull(),
  url: text("url").notNull(),
  beforeUrl: text("before_url"),       // for before/after slider
  title: text("title"),
  description: text("description"),
  category: text("category"),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  // Links this piece to a real completed order — the source of the "Verified" trust badge.
  // Never self-reported: validated server-side against the editor's own completed orders.
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  thumbnailUrl: text("thumbnail_url"),
  isHidden: boolean("is_hidden").notNull().default(false),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("portfolio_items_editor_id_idx").on(t.editorId),
  index("portfolio_items_order_id_idx").on(t.orderId),
]);

// ─── Portfolio Likes ──────────────────────────────────────────────────────────

export const portfolioLikes = pgTable("portfolio_likes", {
  portfolioItemId: uuid("portfolio_item_id")
    .notNull()
    .references(() => portfolioItems.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.portfolioItemId, t.userId] })]);

// ─── Portfolio Comments ───────────────────────────────────────────────────────

export const portfolioComments = pgTable("portfolio_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  portfolioItemId: uuid("portfolio_item_id")
    .notNull()
    .references(() => portfolioItems.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  parentId: uuid("parent_id"),
  isFlagged: boolean("is_flagged").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [index("portfolio_comments_item_idx").on(t.portfolioItemId)]);

// ─── Portfolio Views (deduplicated) ───────────────────────────────────────────

export const portfolioViews = pgTable("portfolio_views", {
  portfolioItemId: uuid("portfolio_item_id")
    .notNull()
    .references(() => portfolioItems.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.portfolioItemId, t.userId] })]);

// ─── Portfolio Saves ──────────────────────────────────────────────────────────

export const portfolioSaves = pgTable("portfolio_saves", {
  portfolioItemId: uuid("portfolio_item_id")
    .notNull()
    .references(() => portfolioItems.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.portfolioItemId, t.userId] }),
  index("portfolio_saves_user_idx").on(t.userId),
]);

// ─── Packages ─────────────────────────────────────────────────────────────────

export const packages = pgTable("packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id, { onDelete: "cascade" }),
  tier: varchar("tier"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(), // paise
  deliveryDays: integer("delivery_days").notNull(),
  revisionCount: integer("revision_count").notNull(),
  revisionExtensionDays: integer("revision_extension_days").notNull().default(2), // deadline extension per revision
  videoLengthLimit: text("video_length_limit"),       // e.g. "Up to 5 min" | "Unlimited"
  videoCount: integer("video_count").notNull().default(1),
  videoCategory: text("video_category"),              // e.g. "youtube" | "reels" | "wedding" …
  videoFormat: text("video_format"),                  // "short_form" | "long_form" | "both"
  resolution: text("resolution"),                     // "1080p" | "4k" | "any"
  aspectRatios: text("aspect_ratios").array().notNull().default([]), // ["16:9", "9:16", "1:1", "4:5"]
  addons: text("addons").array().notNull().default([]), // ["color_grading", "captions", …]
  softwareUsed: text("software_used").array().notNull().default([]),   // ["premiere_pro", "davinci_resolve", …]
  maxRawFootage: text("max_raw_footage"),                               // "Up to 1h" | "Unlimited" | null
  deliveryFormats: text("delivery_formats").array().notNull().default([]), // ["mp4_h264", "mov_prores", …]
  includesSourceFiles: boolean("includes_source_files").notNull().default(false),
  includesCommercialRights: boolean("includes_commercial_rights").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => users.id),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id),
  packageId: uuid("package_id")
    .references(() => packages.id), // nullable for quote-based orders
  status: orderStatusEnum("status").notNull().default("pending"),
  totalAmount: integer("total_amount").notNull(), // paise — package price + processing fee
  commissionAmount: integer("commission_amount").notNull(), // paise — 15% of package price
  processingFee: integer("processing_fee").notNull().default(0), // paise — 4% of package price
  brief: text("brief").notNull(),
  deadline: timestamp("deadline", { mode: "date" }),
  briefData: jsonb("brief_data"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  creditApplied: integer("credit_applied").notNull().default(0), // paise — client credits deducted from payment
  rewardDiscountAmount: integer("reward_discount_amount").notNull().default(0), // paise — % reward discount on package price (absorbed by editor)
  acceptedAt: timestamp("accepted_at", { mode: "date" }),   // when editor accepted (pending → in_progress)
  editorAcceptanceNote: text("editor_acceptance_note"),    // optional note from editor when accepting
  deliveredAt: timestamp("delivered_at", { mode: "date" }), // when delivery was submitted
  completedAt: timestamp("completed_at", { mode: "date" }), // when client approved
  cancelledAt: timestamp("cancelled_at", { mode: "date" }),
  // Deadline extension request — editor asks for more time, client approves/rejects. One per order.
  extensionRequestedAt: timestamp("extension_requested_at", { mode: "date" }),
  extensionReason: text("extension_reason"),
  extensionDays: integer("extension_days"),
  extensionStatus: extensionStatusEnum("extension_status"),
  originalDeadline: timestamp("original_deadline", { mode: "date" }), // deadline before the extension was applied
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("orders_client_id_idx").on(t.clientId),
  index("orders_editor_status_idx").on(t.editorId, t.status),
  index("orders_deadline_idx").on(t.deadline),
  index("orders_delivered_at_idx").on(t.deliveredAt),
]);

export const deliveries = pgTable("deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  fileUrl: text("file_url").notNull(), // R2 key
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(), // bytes
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("deliveries_order_id_idx").on(t.orderId),
]);

export const revisionRequests = pgTable("revision_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  deliveryId: uuid("delivery_id").references(() => deliveries.id),
  feedbackText: text("feedback_text").notNull(),
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  isWarning: boolean("is_warning").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedReason: text("blocked_reason"),
  isRead: boolean("is_read").notNull().default(false),
  emailNotified: boolean("email_notified").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("messages_order_id_idx").on(t.orderId),
  index("messages_is_read_email_notified_idx").on(t.isRead, t.emailNotified),
]);

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id")
    .notNull()
    .references(() => users.id),
  revieweeId: uuid("reviewee_id")
    .notNull()
    .references(() => users.id),
  role: reviewRoleEnum("role").notNull(),
  rating: integer("rating").notNull(), // 1–5
  text: text("text"),
  replyText: text("reply_text"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("reviews_reviewee_id_idx").on(t.revieweeId),
]);

// ─── Disputes ─────────────────────────────────────────────────────────────────

export const disputes = pgTable("disputes", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  openedBy: uuid("opened_by")
    .notNull()
    .references(() => users.id),
  reason: text("reason").notNull(),
  evidenceText: text("evidence_text"),
  evidenceUrls: jsonb("evidence_urls").$type<string[]>().notNull().default([]),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolutionType: resolutionTypeEnum("resolution_type"),
  resolutionNote: text("resolution_note"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Payouts ──────────────────────────────────────────────────────────────────

export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => editors.id),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  grossAmount: integer("gross_amount").notNull(), // paise
  commissionAmount: integer("commission_amount").notNull(), // paise
  tdsAmount: integer("tds_amount").notNull().default(0), // paise — TDS deducted (Section 194J)
  tdsRatePct: integer("tds_rate_pct").notNull().default(0), // 0, 10, or 20
  netAmount: integer("net_amount").notNull(), // paise — after commission + TDS
  bonusCredits: integer("bonus_credits").notNull().default(0), // paise — editor reward credits added to this payout
  razorpayTransferId: text("razorpay_transfer_id"),
  status: payoutStatusEnum("status").notNull().default("pending"),
  scheduledPayoutAt: timestamp("scheduled_payout_at", { mode: "date" }), // 7 days after approval
  settledAt: timestamp("settled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("payouts_editor_id_idx").on(t.editorId),
]);

// ─── Order events (timeline) ───────────────────────────────────────────────────

export const orderEvents = pgTable("order_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id), // null for system/cron-triggered events
  eventType: orderEventTypeEnum("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // new_order | new_message | revision_requested | delivery_received | review_received | kyc_approved | kyc_rejected
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  broadcastId: uuid("broadcast_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("notifications_user_read_idx").on(t.userId, t.isRead),
]);

// ─── Broadcasts ──────────────────────────────────────────────────────────────

export const broadcasts = pgTable("broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  targetRole: text("target_role").notNull(), // all | client | editor | staff_*
  sentCount: integer("sent_count").notNull().default(0),
  sentById: uuid("sent_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Announcements ───────────────────────────────────────────────────────────

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("info"), // info | warning | maintenance
  isActive: boolean("is_active").notNull().default(true),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  scheduledAt: timestamp("scheduled_at", { mode: "date" }),
});

// ─── Audit log ────────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  actorRole: userRoleEnum("actor_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Platform settings ───────────────────────────────────────────────────────

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Feature flags (per-feature kill switches) ───────────────────────────────
// Labels/descriptions live in code (lib/feature-flags.ts) — this table only
// stores the on/off override + who last touched it.

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Blog ─────────────────────────────────────────────────────────────────────

export const blogPostStatusEnum = pgEnum("blog_post_status", ["draft", "published"]);

export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(), // markdown
  category: text("category").notNull().default("General"),
  readTime: text("read_time").notNull().default("5 min read"),
  status: blogPostStatusEnum("status").notNull().default("draft"),
  authorId: uuid("author_id").notNull().references(() => users.id),
  publishedAt: timestamp("published_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Help Center ──────────────────────────────────────────────────────────────

export const helpCategories = pgTable("help_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }).default("HelpCircle"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const helpArticles = pgTable("help_articles", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => helpCategories.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  isPublished: boolean("is_published").default(false),
  readTime: varchar("read_time", { length: 50 }).default("3 min read"),
  viewCount: integer("view_count").default(0),
  helpfulVotes: integer("helpful_votes").default(0),
  unhelpfulVotes: integer("unhelpful_votes").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// ─── Rewards ──────────────────────────────────────────────────────────────────


export const userPoints = pgTable("user_points", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  total: integer("total").notNull().default(0),       // lifetime XP
  current: integer("current").notNull().default(0),   // spendable balance
  level: text("level").notNull().default("bronze"),   // bronze | silver | gold | platinum
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const pointTransactions = pgTable("point_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),                // positive = earned, negative = spent
  reason: text("reason").notNull(),                   // e.g. "order_completed", "five_star_review"
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("point_transactions_user_reason_idx").on(t.userId, t.reason),
]);

export const userBadges = pgTable("user_badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badge: text("badge").notNull(),                     // badge key e.g. "profile_star"
  awardedAt: timestamp("awarded_at", { mode: "date" }).notNull().defaultNow(),
});

export const userCredits = pgTable("user_credits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),                // in paise
  reason: text("reason").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  usedAt: timestamp("used_at", { mode: "date" }),
  orderId: uuid("order_id").references(() => orders.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const xpBoosts = pgTable("xp_boosts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "featured_boost" | "extra_package_slot" | "analytics_unlock" | "profile_highlight" | "extended_portfolio" | "badge_frame"
  expiresAt: timestamp("expires_at", { mode: "date" }), // null = permanent
  purchasedAt: timestamp("purchased_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Quote Requests ───────────────────────────────────────────────────────────

export const quoteRequests = pgTable("quote_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  editorId: uuid("editor_id").notNull().references(() => editors.id),
  videoType: text("video_type").notNull(),          // "youtube" | "reel" | "wedding" etc.
  brief: text("brief").notNull(),                   // client describes what they need
  budgetMin: integer("budget_min").notNull(),        // paise
  budgetMax: integer("budget_max").notNull(),        // paise
  deadlinePreference: text("deadline_preference").notNull().default("flexible"), // "1-3 days" | "1 week" | "2 weeks" | "flexible"
  referenceUrl: text("reference_url"),               // optional YouTube/Instagram link
  status: quoteStatusEnum("status").notNull().default("pending"),
  offeredPrice: integer("offered_price"),            // paise — set by editor when responding
  offerMessage: text("offer_message"),               // editor's note with the offer
  orderId: uuid("order_id").references(() => orders.id), // set after payment
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(), // 48h after creation
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Pre-order Q&A (client asks an editor a question before ordering) ───────

export const preOrderQuestions = pgTable("pre_order_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer"),
  askedAt: timestamp("asked_at", { mode: "date" }).notNull().defaultNow(),
  answeredAt: timestamp("answered_at", { mode: "date" }),
  convertedOrderId: uuid("converted_order_id").references(() => orders.id), // set if client later orders from this editor
});

// ─── Push notification subscriptions ─────────────────────────────────────────

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Dispute messages ─────────────────────────────────────────────────────────

export const disputeMessages = pgTable("dispute_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  disputeId: uuid("dispute_id").notNull().references(() => disputes.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Client notes (editor-private notes about a client) ──────────────────────

export const clientNotes = pgTable("client_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  note: text("note").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Client blocks (editor blocks a problematic client) ──────────────────────

export const clientBlocks = pgTable("client_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason"), // private — only admin and the blocking editor can see this
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  editorClientUnique: unique().on(table.editorId, table.clientId),
  clientIdx: index("client_blocks_client_id_idx").on(table.clientId),
}));

// ─── Referrals ────────────────────────────────────────────────────────────────

export const referrals = pgTable("referrals", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerId: uuid("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refereeId: uuid("referee_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }), // set when referee places first order
  creditAwarded: integer("credit_awarded").notNull().default(0), // paise
  rewardedAt: timestamp("rewarded_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Delivery comments ────────────────────────────────────────────────────────

export const deliveryComments = pgTable("delivery_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  deliveryId: uuid("delivery_id").notNull().references(() => deliveries.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestampSec: integer("timestamp_sec"), // null = general comment, number = video timestamp
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Saved editors ────────────────────────────────────────────────────────────

export const savedEditors = pgTable("saved_editors", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [unique().on(t.clientId, t.editorId)]);

// ─── Profile analytics (append-only event log — never update, only insert) ──

export const profileEvents = pgTable("profile_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  eventType: profileEventTypeEnum("event_type").notNull(),
  entityId: uuid("entity_id"), // package_id or portfolio_item_id — null for profile_view
  viewerId: uuid("viewer_id").references(() => users.id, { onDelete: "set null" }), // null for anonymous
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Showcase (admin-curated clips, YouTube/Vimeo only) ──────────────────────

export const showcaseItems = pgTable("showcase_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  videoUrl: text("video_url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  addedById: uuid("added_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Nudge logs (idempotency guard for cron-sent re-engagement emails) ───────

export const nudgeLogs = pgTable("nudge_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nudgeType: text("nudge_type").notNull(), // "wedding_season" | "inactive_client" | "editor_monthly_digest"
  periodKey: text("period_key").notNull(), // e.g. "2026-11" — ensures at most one send per user per period
  sentAt: timestamp("sent_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.nudgeType, t.periodKey)]);

// ─── Featured placement payments (full history of paid placements) ──────────

export const featuredPayments = pgTable("featured_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  durationDays: integer("duration_days").notNull(),
  amountPaid: integer("amount_paid").notNull(), // paise
  razorpayPaymentId: text("razorpay_payment_id").notNull(),
  featuredFrom: timestamp("featured_from", { mode: "date" }).notNull(),
  featuredUntil: timestamp("featured_until", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Membership payments (paid editor membership tier passes) ──────────────────

export const membershipPayments = pgTable("membership_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id").notNull().references(() => editors.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(), // starter | pro | agency
  amountPaid: integer("amount_paid").notNull(), // paise
  razorpayOrderId: text("razorpay_order_id").notNull(),
  razorpayPaymentId: text("razorpay_payment_id"),
  status: text("status").notNull().default("pending"), // pending | completed | failed
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Editor response templates (chat quick replies, "/" command) ────────────

export const responseTemplates = pgTable("response_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  editorId: uuid("editor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  shortcut: text("shortcut"), // optional, e.g. "thanks" triggers on /thanks
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── Brief templates ──────────────────────────────────────────────────────────

export const briefTemplates = pgTable("brief_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 60 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [index("brief_templates_user_idx").on(t.userId)]);

// ─── Rate limits (sliding window, keyed by action:userId) ────────────────────

export const rateLimits = pgTable("rate_limits", {
  key: text("key").notNull(),
  windowStart: timestamp("window_start", { mode: "date" }).notNull(),
  count: integer("count").notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.key, t.windowStart] }),
  index("rate_limits_window_start_idx").on(t.windowStart),
]);

// ─── Password reset tokens ────────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

// ─── User preferences (isolated settings) ───────────────────────────────────

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  emailPreferences: text("email_preferences"), // JSON for editor email prefs
  notifPreferences: text("notif_preferences"), // JSON for client/editor notifications
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  index("user_preferences_user_id_idx").on(t.userId),
]);

