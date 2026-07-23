export const DUMMY_VARS: Record<string, string> = {
  "{{name}}": "Priya Sharma",
  "{{clientName}}": "Priya Sharma",
  "{{editorName}}": "Rahul Verma",
  "{{packageTitle}}": "Wedding Cinematic Highlights",
  "{{orderId}}": "EB-A1B2C3D4",
  "{{amount}}": "₹12,500",
  "{{rating}}": "5",
  "{{reason}}": "Documents were unclear",
  "{{question}}": "Do you provide colour grading as well?",
  "{{answer}}": "Yes, all packages include professional colour grading.",
  "{{reviewText}}": "Excellent work — delivered on time with stunning quality!",
  "{{days}}": "3",
  "{{hoursLeft}}": "24",
  "{{decision}}": "approved",
  "{{decisionNote}}": "Your new deadline is 20 July 2026.",
  "{{monthLabel}}": "June 2026",
  "{{ordersCompleted}}": "12",
  "{{totalEarnings}}": "₹1,45,000",
  "{{avgRating}}": "4.8",
  "{{feedback}}": "Please adjust the colour tone in the second scene.",
  "{{invoiceNumber}}": "INV-2026-0042",
  "{{totalPaid}}": "₹12,500",
  "{{recipientName}}": "Priya Sharma",
  "{{reviewerName}}": "Priya Sharma",
  "{{versionNumber}}": "1",
  "{{fileName}}": "wedding_highlights_v1.mp4",
  "{{creditAmount}}": "₹500",
  "{{referredName}}": "Anjali Mehta",
  "{{suspendReason}}": "Violation of community guidelines",
  "{{resolution}}": "The order has been refunded in full to the client.",
  "{{verificationLink}}": "https://editbridge.com/verify-email?token=sample",
  "{{resetLink}}": "https://editbridge.com/reset-password?token=sample",
};

export type Group = {
  label: string;
  subject: string;
  body: string;
  vars: string[];
  recipient?: string;
};

export type Section = {
  section: string;
  groups: Group[];
};

export const SECTIONS: Section[] = [
  {
    section: "Onboarding",
    groups: [
      {
        label: "Welcome (Client)",
        subject: "email_welcome_subject",
        body: "email_welcome_body",
        vars: ["{{name}}"],
        recipient: "Client",
      },
      {
        label: "Welcome (Editor)",
        subject: "email_welcome_editor_subject",
        body: "email_welcome_editor_body",
        vars: ["{{name}}"],
        recipient: "Editor",
      },
      {
        label: "Email Verification",
        subject: "email_verification_subject",
        body: "email_verification_body",
        vars: ["{{name}}", "{{verificationLink}}"],
        recipient: "All users",
      },
      {
        label: "Password Reset",
        subject: "email_password_reset_subject",
        body: "email_password_reset_body",
        vars: ["{{name}}", "{{resetLink}}"],
        recipient: "All users",
      },
    ],
  },
  {
    section: "Orders — Client",
    groups: [
      {
        label: "Order Placed",
        subject: "email_order_placed_subject",
        body: "email_order_placed_body",
        vars: ["{{clientName}}", "{{editorName}}", "{{packageTitle}}", "{{orderId}}"],
        recipient: "Client",
      },
      {
        label: "Order Delivered",
        subject: "email_order_delivered_subject",
        body: "email_order_delivered_body",
        vars: ["{{clientName}}", "{{editorName}}", "{{packageTitle}}"],
        recipient: "Client",
      },
      {
        label: "Order Auto-Approved",
        subject: "email_order_auto_approved_subject",
        body: "email_order_auto_approved_body",
        vars: ["{{clientName}}", "{{packageTitle}}", "{{orderId}}"],
        recipient: "Client",
      },
      {
        label: "Order Cancelled",
        subject: "email_order_cancelled_client_subject",
        body: "email_order_cancelled_client_body",
        vars: ["{{clientName}}", "{{packageTitle}}"],
        recipient: "Client",
      },
      {
        label: "Invoice Ready",
        subject: "email_invoice_ready_subject",
        body: "email_invoice_ready_body",
        vars: ["{{clientName}}", "{{packageTitle}}", "{{orderId}}", "{{amount}}"],
        recipient: "Client",
      },
      {
        label: "Extension Requested",
        subject: "email_extension_requested_subject",
        body: "email_extension_requested_body",
        vars: ["{{clientName}}", "{{editorName}}", "{{packageTitle}}", "{{days}}", "{{reason}}"],
        recipient: "Client",
      },
      {
        label: "Deadline Reminder",
        subject: "email_deadline_reminder_subject",
        body: "email_deadline_reminder_body",
        vars: ["{{clientName}}", "{{editorName}}", "{{packageTitle}}", "{{orderId}}", "{{hoursLeft}}"],
        recipient: "Client",
      },
    ],
  },
  {
    section: "Orders — Editor",
    groups: [
      {
        label: "New Order",
        subject: "email_new_order_editor_subject",
        body: "email_new_order_editor_body",
        vars: ["{{editorName}}", "{{clientName}}", "{{packageTitle}}", "{{orderId}}", "{{amount}}"],
        recipient: "Editor",
      },
      {
        label: "Revision Requested",
        subject: "email_revision_requested_subject",
        body: "email_revision_requested_body",
        vars: ["{{editorName}}", "{{clientName}}", "{{packageTitle}}", "{{feedback}}"],
        recipient: "Editor",
      },
      {
        label: "Order Approved",
        subject: "email_order_approved_subject",
        body: "email_order_approved_body",
        vars: ["{{editorName}}", "{{clientName}}", "{{packageTitle}}", "{{amount}}"],
        recipient: "Editor",
      },
      {
        label: "Order Cancelled",
        subject: "email_order_cancelled_editor_subject",
        body: "email_order_cancelled_editor_body",
        vars: ["{{editorName}}", "{{clientName}}", "{{packageTitle}}"],
        recipient: "Editor",
      },
      {
        label: "Extension Decision",
        subject: "email_extension_decision_subject",
        body: "email_extension_decision_body",
        vars: ["{{editorName}}", "{{packageTitle}}", "{{decision}}", "{{decisionNote}}"],
        recipient: "Editor",
      },
    ],
  },
  {
    section: "KYC",
    groups: [
      {
        label: "KYC Approved",
        subject: "email_kyc_approved_subject",
        body: "email_kyc_approved_body",
        vars: ["{{name}}"],
        recipient: "Editor",
      },
      {
        label: "KYC Rejected",
        subject: "email_kyc_rejected_subject",
        body: "email_kyc_rejected_body",
        vars: ["{{name}}", "{{reason}}"],
        recipient: "Editor",
      },
    ],
  },
  {
    section: "Finance",
    groups: [
      {
        label: "Payout Sent",
        subject: "email_payout_sent_subject",
        body: "email_payout_sent_body",
        vars: ["{{name}}", "{{amount}}", "{{packageTitle}}"],
        recipient: "Editor",
      },
      {
        label: "Referral Credit Awarded",
        subject: "email_referral_credit_subject",
        body: "email_referral_credit_body",
        vars: ["{{name}}", "{{creditAmount}}", "{{referredName}}"],
        recipient: "Client",
      },
    ],
  },
  {
    section: "Disputes",
    groups: [
      {
        label: "Dispute Opened",
        subject: "email_dispute_opened_subject",
        body: "email_dispute_opened_body",
        vars: ["{{name}}", "{{packageTitle}}"],
        recipient: "Both parties",
      },
      {
        label: "Dispute Resolved",
        subject: "email_dispute_resolved_subject",
        body: "email_dispute_resolved_body",
        vars: ["{{name}}", "{{packageTitle}}", "{{resolution}}"],
        recipient: "Both parties",
      },
    ],
  },
  {
    section: "Reviews",
    groups: [
      {
        label: "Review Received",
        subject: "email_review_received_subject",
        body: "email_review_received_body",
        vars: ["{{recipientName}}", "{{reviewerName}}", "{{rating}}", "{{packageTitle}}", "{{reviewText}}"],
        recipient: "Editor",
      },
    ],
  },
  {
    section: "Pre-order Q&A",
    groups: [
      {
        label: "Question Asked",
        subject: "email_preorder_question_asked_subject",
        body: "email_preorder_question_asked_body",
        vars: ["{{editorName}}", "{{clientName}}", "{{question}}"],
        recipient: "Editor",
      },
      {
        label: "Question Answered",
        subject: "email_preorder_question_answered_subject",
        body: "email_preorder_question_answered_body",
        vars: ["{{clientName}}", "{{editorName}}", "{{question}}", "{{answer}}"],
        recipient: "Client",
      },
    ],
  },
  {
    section: "Account",
    groups: [
      {
        label: "Account Suspended",
        subject: "email_account_suspended_subject",
        body: "email_account_suspended_body",
        vars: ["{{name}}", "{{suspendReason}}"],
        recipient: "All users",
      },
      {
        label: "Account Reactivated",
        subject: "email_account_reactivated_subject",
        body: "email_account_reactivated_body",
        vars: ["{{name}}"],
        recipient: "All users",
      },
    ],
  },
  {
    section: "Marketing & Lifecycle",
    groups: [
      {
        label: "Editor Available Again",
        subject: "email_editor_available_subject",
        body: "email_editor_available_body",
        vars: ["{{clientName}}", "{{editorName}}"],
        recipient: "Client",
      },
      {
        label: "Inactive Client Re-engagement",
        subject: "email_inactive_client_subject",
        body: "email_inactive_client_body",
        vars: ["{{name}}"],
        recipient: "Client",
      },
      {
        label: "Editor Monthly Digest",
        subject: "email_monthly_digest_subject",
        body: "email_monthly_digest_body",
        vars: ["{{name}}", "{{monthLabel}}", "{{ordersCompleted}}", "{{totalEarnings}}", "{{avgRating}}"],
        recipient: "Editor",
      },
      {
        label: "Featured Placement Expired",
        subject: "email_featured_expired_subject",
        body: "email_featured_expired_body",
        vars: ["{{name}}"],
        recipient: "Editor",
      },
      {
        label: "Wedding Season Reminder",
        subject: "email_wedding_season_subject",
        body: "email_wedding_season_body",
        vars: ["{{name}}"],
        recipient: "Client",
      },
    ],
  },
];

export const TEMPLATE_KEYS = SECTIONS.flatMap(s =>
  s.groups.flatMap(g => [g.subject, g.body])
);

function baseKey(g: Group) { return g.subject.replace("_subject", ""); }
export function enabledKey(g: Group)  { return baseKey(g) + "_enabled"; }
export function fromNameKey(g: Group) { return baseKey(g) + "_from_name"; }
export function ccKey(g: Group)       { return baseKey(g) + "_cc"; }
export function historyKey(g: Group)  { return baseKey(g) + "_history"; }
export function htmlModeKey(g: Group) { return baseKey(g) + "_html_mode"; }

export const ENABLED_KEYS    = SECTIONS.flatMap(s => s.groups.map(g => enabledKey(g)));
export const FROM_NAME_KEYS  = SECTIONS.flatMap(s => s.groups.map(g => fromNameKey(g)));
export const CC_KEYS         = SECTIONS.flatMap(s => s.groups.map(g => ccKey(g)));
export const HISTORY_KEYS    = SECTIONS.flatMap(s => s.groups.map(g => historyKey(g)));
export const HTML_MODE_KEYS  = SECTIONS.flatMap(s => s.groups.map(g => htmlModeKey(g)));

export function approvalKey(g: Group)        { return baseKey(g) + "_status"; }
export function langSubjectKey(g: Group, lang: string) { return baseKey(g) + `_subject_${lang}`; }
export function langBodyKey(g: Group, lang:    string) { return baseKey(g) + `_body_${lang}`;    }

export const APPROVAL_KEYS  = SECTIONS.flatMap(s => s.groups.map(g => approvalKey(g)));
export const LANG_HI_KEYS   = SECTIONS.flatMap(s => s.groups.flatMap(g => [langSubjectKey(g, "hi"), langBodyKey(g, "hi")]));

export function replyToKey(g: Group)   { return baseKey(g) + "_reply_to"; }
export function bccKey(g: Group)       { return baseKey(g) + "_bcc"; }
export function lockedKey(g: Group)    { return baseKey(g) + "_locked"; }
export function preheaderKey(g: Group) { return baseKey(g) + "_preheader"; }
export function attachmentKey(g: Group){ return baseKey(g) + "_attachment"; }

export const REPLY_TO_KEYS    = SECTIONS.flatMap(s => s.groups.map(g => replyToKey(g)));
export const BCC_KEYS_LIST    = SECTIONS.flatMap(s => s.groups.map(g => bccKey(g)));
export const LOCKED_KEYS      = SECTIONS.flatMap(s => s.groups.map(g => lockedKey(g)));
export const PREHEADER_KEYS   = SECTIONS.flatMap(s => s.groups.map(g => preheaderKey(g)));
export const ATTACHMENT_KEYS  = SECTIONS.flatMap(s => s.groups.map(g => attachmentKey(g)));

export const GLOBAL_KEYS = [
  "email_global_from_name",
  "email_footer_enabled",
  "email_footer_text",
  "email_broadcast_throttle_ms",
  "email_paused",
  "email_send_window_start",
  "email_send_window_end",
  // layout
  "email_layout_logo_text",
  "email_layout_header_tagline",
  "email_layout_header_bg",
  "email_layout_support_email",
  "email_layout_website_url",
  "email_layout_help_url",
  "email_layout_unsubscribe_url",
  "email_layout_copyright",
];

export const AUDIT_LOG_KEY          = "email_audit_log";
export const BROADCASTS_KEY         = "email_broadcasts";
export const PENDING_BROADCASTS_KEY = "email_pending_broadcasts";
export const CUSTOM_VARS_KEY        = "email_custom_vars";
export const SUPPRESSION_KEY        = "email_suppression_list";
export const TEST_HISTORY_KEY       = "email_test_history";

export type HistoryEntry    = { subject: string; body: string; savedAt: string };
export type AuditEntry      = { id: string; timestamp: string; adminEmail: string; templateLabel: string; action: string; note?: string };
export type BroadcastRecord = { id: string; timestamp: string; segment: string; templateLabel: string; sentCount: number; adminEmail: string; failed?: number; failedEmails?: string[] };
export type PendingBroadcast = {
  id: string; segment: string; templateLabel: string;
  subject: string; body: string;
  scheduledAt: string; createdAt: string; adminEmail: string;
  status: "pending" | "sent" | "cancelled";
};
export type SuppressionEntry  = { email: string; addedAt: string; reason?: string };
export type CustomVar         = { key: string; label: string; sample: string };
export type TestHistoryEntry  = { id: string; timestamp: string; to: string; templateLabel: string; adminEmail: string };

export const DEFAULTS: Record<string, string> = {
  // Onboarding
  email_welcome_subject: "Welcome to EditBridge, {{name}}!",
  email_welcome_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Welcome to <strong style="color:#0f172a;">EditBridge</strong> — India's professional video editing marketplace. We're thrilled to have you on board.</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">Browse our curated network of verified editors, compare packages, and place your first order in minutes.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/browse" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Browse Editors →</a></td></tr>
</table>
<p style="font-size:13px;color:#94a3b8;margin:0;">If you have questions, visit our <a href="https://editbridge.com/help" style="color:#64748b;text-decoration:underline;">Help Center</a> or reply to this email.</p>`,

  email_welcome_editor_subject: "You're live on EditBridge, {{name}}!",
  email_welcome_editor_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Welcome to <strong style="color:#0f172a;">EditBridge</strong>! Your editor account is live. You're now part of India's growing network of professional video editors.</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">Complete these steps to start receiving orders:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="padding:11px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:13px;font-weight:700;color:#94a3b8;">1&nbsp;&nbsp;</span><span style="font-size:14px;color:#374151;">Complete your profile and upload portfolio samples</span></td></tr>
<tr><td style="padding:11px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:13px;font-weight:700;color:#94a3b8;">2&nbsp;&nbsp;</span><span style="font-size:14px;color:#374151;">Create your editing packages and set your pricing</span></td></tr>
<tr><td style="padding:11px 0;"><span style="font-size:13px;font-weight:700;color:#94a3b8;">3&nbsp;&nbsp;</span><span style="font-size:14px;color:#374151;">Submit your KYC documents to unlock payouts</span></td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Set Up Your Profile →</a></td></tr>
</table>`,

  email_verification_subject: "Verify your email — EditBridge",
  email_verification_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;">Thanks for joining EditBridge! Please verify your email address to activate your account.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="{{verificationLink}}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Verify Email Address →</a></td></tr>
</table>
<p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0 0 12px;">This link expires in <strong style="color:#64748b;">24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
<p style="font-size:12px;color:#cbd5e1;line-height:1.6;margin:0;">Button not working? Copy and paste this URL into your browser:<br><span style="color:#94a3b8;word-break:break-all;">{{verificationLink}}</span></p>`,

  email_password_reset_subject: "Reset your EditBridge password",
  email_password_reset_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;">We received a request to reset your EditBridge password. Click the button below to create a new one.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="{{resetLink}}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Reset My Password →</a></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
<tr><td style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;">
<p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, your account is safe — ignore this email.</p>
</td></tr>
</table>
<p style="font-size:12px;color:#cbd5e1;line-height:1.6;margin:0;">Link not working? <span style="color:#94a3b8;word-break:break-all;">{{resetLink}}</span></p>`,

  // Orders — client
  email_order_placed_subject: "Order confirmed — {{packageTitle}}",
  email_order_placed_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your order has been placed successfully! <strong style="color:#0f172a;">{{editorName}}</strong> will begin working on it shortly.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-radius:8px;padding:20px 22px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Order Summary</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Package</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;">{{packageTitle}}</td></tr>
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Editor</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;">{{editorName}}</td></tr>
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;">Order ID</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;font-family:monospace;">{{orderId}}</td></tr>
</table>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Track Your Order →</a></td></tr>
</table>`,

  email_order_delivered_subject: "Your video is ready — {{packageTitle}}",
  email_order_delivered_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;"><strong style="color:#0f172a;">{{editorName}}</strong> has delivered your order for <strong style="color:#0f172a;">{{packageTitle}}</strong>. Your video is ready to review!</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">Log in to review the delivery. You have <strong style="color:#0f172a;">7 days</strong> to approve or request revisions before the order is auto-approved.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Review Delivery →</a></td></tr>
</table>
<p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0;">Not satisfied? You can request revisions or open a dispute from the order page.</p>`,

  email_order_auto_approved_subject: "Your order has been auto-approved — {{packageTitle}}",
  email_order_auto_approved_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your order for <strong style="color:#0f172a;">{{packageTitle}}</strong> has been <strong style="color:#0f172a;">automatically approved</strong> — no review was submitted within 7 days of delivery.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-radius:8px;padding:16px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Order Reference</p>
<p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;font-family:monospace;">{{orderId}}</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">If you have concerns about the delivery, please contact our support team within 48 hours.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Order →</a></td></tr>
</table>`,

  email_order_cancelled_client_subject: "Your order has been cancelled — {{packageTitle}}",
  email_order_cancelled_client_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your order for <strong style="color:#0f172a;">{{packageTitle}}</strong> has been cancelled.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#991b1b;">Refund Information</p>
<p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">If a payment was made, a full refund will be credited to your original payment method within <strong>5–7 business days</strong>.</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">If you'd like to rebook or have any questions, our support team is here to help.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/browse" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Find Another Editor →</a></td></tr>
</table>`,

  email_invoice_ready_subject: "Your invoice is ready — Order #{{orderId}}",
  email_invoice_ready_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your invoice for the following order is now available to download.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-radius:8px;padding:20px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Package</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;">{{packageTitle}}</td></tr>
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Order ID</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;font-family:monospace;">{{orderId}}</td></tr>
<tr><td style="font-size:13px;font-weight:700;color:#0f172a;padding:7px 0;">Total</td><td align="right" style="font-size:17px;font-weight:800;color:#0f172a;padding:7px 0;">{{amount}}</td></tr>
</table>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Download Invoice →</a></td></tr>
</table>`,

  email_extension_requested_subject: "{{editorName}} has requested a deadline extension",
  email_extension_requested_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;"><strong style="color:#0f172a;">{{editorName}}</strong> has requested a deadline extension on your order.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-radius:8px;padding:20px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Order</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;">{{packageTitle}}</td></tr>
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Extension requested</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;">{{days}} day(s)</td></tr>
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;vertical-align:top;">Reason</td><td align="right" style="font-size:13px;color:#374151;padding:5px 0;">{{reason}}</td></tr>
</table>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Please log in to approve or decline this request.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Review Request →</a></td></tr>
</table>`,

  email_deadline_reminder_subject: "Reminder: your order is due soon — {{packageTitle}}",
  email_deadline_reminder_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Just a heads-up — your order with <strong style="color:#0f172a;">{{editorName}}</strong> is due in <strong style="color:#0f172a;">{{hoursLeft}} hours</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">{{packageTitle}}</p>
<p style="margin:0;font-size:13px;color:#78350f;">Order <span style="font-family:monospace;font-weight:600;">{{orderId}}</span> &middot; Due in {{hoursLeft}} hours</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Track Progress →</a></td></tr>
</table>`,

  // Orders — editor
  email_new_order_editor_subject: "New order received — {{packageTitle}}",
  email_new_order_editor_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{editorName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">You have a new order! <strong style="color:#0f172a;">{{clientName}}</strong> has booked your package.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-radius:8px;padding:20px 22px;">
<p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Order Details</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Package</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;">{{packageTitle}}</td></tr>
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Client</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;">{{clientName}}</td></tr>
<tr><td style="font-size:13px;color:#94a3b8;padding:5px 0;border-bottom:1px solid #e2e8f0;">Order ID</td><td align="right" style="font-size:13px;font-weight:600;color:#0f172a;padding:5px 0;border-bottom:1px solid #e2e8f0;font-family:monospace;">{{orderId}}</td></tr>
<tr><td style="font-size:13px;font-weight:700;color:#0f172a;padding:7px 0;">Your Earning</td><td align="right" style="font-size:18px;font-weight:800;color:#0f172a;padding:7px 0;">{{amount}}</td></tr>
</table>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Please accept this order within <strong style="color:#0f172a;">24 hours</strong> to confirm the booking.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Accept Order →</a></td></tr>
</table>`,

  email_revision_requested_subject: "Revision requested — {{packageTitle}}",
  email_revision_requested_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{editorName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;"><strong style="color:#0f172a;">{{clientName}}</strong> has requested revisions on your delivery for <strong style="color:#0f172a;">{{packageTitle}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-left:4px solid #0f172a;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Client Feedback</p>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;font-style:italic;">"{{feedback}}"</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Please review the feedback and re-deliver as soon as possible.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Order →</a></td></tr>
</table>`,

  email_order_approved_subject: "Order approved — payout of {{amount}} is on its way",
  email_order_approved_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{editorName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;">Excellent work! <strong style="color:#0f172a;">{{clientName}}</strong> has approved your delivery for <strong style="color:#0f172a;">{{packageTitle}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 28px;">
<tr><td align="center" style="background:#f0fdf4;border-radius:10px;padding:24px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#16a34a;">Payout Scheduled</p>
<p style="margin:0;font-size:32px;font-weight:800;color:#0f172a;letter-spacing:-1px;">{{amount}}</p>
<p style="margin:6px 0 0;font-size:12px;color:#64748b;">Arrives in 2–3 business days</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Keep up the great work — every 5-star review builds your reputation on the platform.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Dashboard →</a></td></tr>
</table>`,

  email_order_cancelled_editor_subject: "Order cancelled — {{packageTitle}}",
  email_order_cancelled_editor_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{editorName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">The order for <strong style="color:#0f172a;">{{packageTitle}}</strong> from <strong style="color:#0f172a;">{{clientName}}</strong> has been cancelled.</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">No action is required on your end. Your availability has been updated automatically.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Orders →</a></td></tr>
</table>`,

  email_extension_decision_subject: "Your extension request was {{decision}} — {{packageTitle}}",
  email_extension_decision_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{editorName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your deadline extension request for <strong style="color:#0f172a;">{{packageTitle}}</strong> has been <strong style="color:#0f172a;">{{decision}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-radius:8px;padding:16px 20px;">
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">{{decisionNote}}</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/orders" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Order →</a></td></tr>
</table>`,

  // KYC
  email_kyc_approved_subject: "KYC approved — you can now receive payments",
  email_kyc_approved_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td align="center" style="background:#f0fdf4;border-radius:10px;padding:28px 20px;">
<p style="margin:0 0 8px;font-size:28px;">&#10003;</p>
<p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0f172a;">KYC Approved</p>
<p style="margin:0;font-size:14px;color:#16a34a;font-weight:600;">You can now receive payments on EditBridge</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">Your identity verification has been approved. You are now fully set up to accept orders and receive payouts directly to your bank account.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Go to Dashboard →</a></td></tr>
</table>`,

  email_kyc_rejected_subject: "KYC verification requires attention",
  email_kyc_rejected_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">We were unable to verify your KYC documents. Please review the reason below and resubmit.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#991b1b;">Reason for Rejection</p>
<p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">{{reason}}</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Please update your documents and resubmit from your profile. Our support team is available if you need help.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/kyc" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Resubmit Documents →</a></td></tr>
</table>`,

  // Finance
  email_payout_sent_subject: "Your payout of {{amount}} has been sent",
  email_payout_sent_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;">Your payout for <strong style="color:#0f172a;">{{packageTitle}}</strong> has been processed and is on its way.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 28px;">
<tr><td align="center" style="background:#f0fdf4;border-radius:10px;padding:28px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#16a34a;">Amount Transferred</p>
<p style="margin:0;font-size:36px;font-weight:800;color:#0f172a;letter-spacing:-1.5px;">{{amount}}</p>
<p style="margin:8px 0 0;font-size:13px;color:#64748b;">Arrives in 2–3 business days</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Thank you for your excellent work. Keep delivering great results and your reputation will continue to grow.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Earnings →</a></td></tr>
</table>`,

  email_referral_credit_subject: "You've earned a referral credit of {{creditAmount}}!",
  email_referral_credit_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;"><strong style="color:#0f172a;">{{referredName}}</strong> signed up and placed their first order using your referral link. Your credit has been added!</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 28px;">
<tr><td align="center" style="background:#faf5ff;border-radius:10px;padding:28px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;">Referral Credit Earned</p>
<p style="margin:0;font-size:36px;font-weight:800;color:#0f172a;letter-spacing:-1.5px;">{{creditAmount}}</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">The credit has been applied to your account and will be automatically used on your next order.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/browse" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Book an Editor →</a></td></tr>
</table>`,

  // Disputes
  email_dispute_opened_subject: "A dispute has been opened on your order",
  email_dispute_opened_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">A dispute has been opened on your order for <strong style="color:#0f172a;">{{packageTitle}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">What happens next?</p>
<p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">Our team will review the dispute and reach out to both parties within <strong>48 hours</strong>. Please do not take any further action until you hear from us.</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/disputes" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Dispute →</a></td></tr>
</table>`,

  email_dispute_resolved_subject: "Your dispute has been resolved — {{packageTitle}}",
  email_dispute_resolved_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">The dispute on your order for <strong style="color:#0f172a;">{{packageTitle}}</strong> has been reviewed and resolved.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-left:4px solid #0f172a;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Resolution</p>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">{{resolution}}</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">If you have further questions, our support team is here to help.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/help" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Contact Support →</a></td></tr>
</table>`,

  // Reviews
  email_review_received_subject: "{{reviewerName}} left you a {{rating}}-star review",
  email_review_received_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{recipientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;"><strong style="color:#0f172a;">{{reviewerName}}</strong> has left a review on your work for <strong style="color:#0f172a;">{{packageTitle}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td align="center" style="background:#f8fafc;border-radius:10px;padding:24px 20px;">
<p style="margin:0 0 8px;font-size:26px;letter-spacing:2px;color:#f59e0b;">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
<p style="margin:0 0 12px;font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">{{rating}} / 5</p>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;font-style:italic;">"{{reviewText}}"</p>
<p style="margin:10px 0 0;font-size:12px;color:#94a3b8;font-weight:600;">— {{reviewerName}}</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Your Profile →</a></td></tr>
</table>`,

  // Pre-order Q&A
  email_preorder_question_asked_subject: "{{clientName}} asked you a question",
  email_preorder_question_asked_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{editorName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;"><strong style="color:#0f172a;">{{clientName}}</strong> has sent you a pre-order question. A prompt reply helps them decide to book you.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-left:4px solid #0f172a;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Question from {{clientName}}</p>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7;font-style:italic;">"{{question}}"</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Reply to Question →</a></td></tr>
</table>`,

  email_preorder_question_answered_subject: "{{editorName}} answered your question",
  email_preorder_question_answered_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;"><strong style="color:#0f172a;">{{editorName}}</strong> has answered your pre-order question.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;">
<tr><td style="background:#f8fafc;border-left:4px solid #94a3b8;border-radius:0 8px 8px 0;padding:14px 18px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Your Question</p>
<p style="margin:0;font-size:13px;color:#64748b;font-style:italic;">"{{question}}"</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f0f9ff;border-left:4px solid #0f172a;border-radius:0 8px 8px 0;padding:14px 18px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#0369a1;">{{editorName}}'s Answer</p>
<p style="margin:0;font-size:14px;color:#0f172a;line-height:1.7;">{{answer}}</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Ready to book? Visit {{editorName}}'s profile to place your order.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/browse" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Book Now →</a></td></tr>
</table>`,

  // Account
  email_account_suspended_subject: "Your EditBridge account has been suspended",
  email_account_suspended_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your EditBridge account has been temporarily suspended.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#991b1b;">Reason for Suspension</p>
<p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">{{suspendReason}}</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">If you believe this is a mistake or would like to appeal, please contact our support team. We will review your case within 2 business days.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/help" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Contact Support →</a></td></tr>
</table>`,

  email_account_reactivated_subject: "Your EditBridge account has been reactivated",
  email_account_reactivated_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td align="center" style="background:#f0fdf4;border-radius:10px;padding:28px 20px;">
<p style="margin:0 0 8px;font-size:32px;">&#127881;</p>
<p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0f172a;">Your account is back!</p>
<p style="margin:0;font-size:14px;color:#16a34a;font-weight:600;">Full access restored</p>
</td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 28px;">Your EditBridge account has been reactivated. You can now log in and continue using the platform as normal.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/login" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Log In Now →</a></td></tr>
</table>`,

  // Marketing / lifecycle
  email_editor_available_subject: "{{editorName}} is taking orders again",
  email_editor_available_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{clientName}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Good news — <strong style="color:#0f172a;">{{editorName}}</strong>, an editor you previously saved, is now available and accepting new orders.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#f8fafc;border-radius:8px;padding:18px 22px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Now Available</p>
<p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">{{editorName}}</p>
<p style="margin:4px 0 0;font-size:13px;color:#64748b;">Accepting orders · Slots may fill fast</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/browse" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Book {{editorName}} →</a></td></tr>
</table>`,

  email_inactive_client_subject: "We miss you — here's what's new on EditBridge",
  email_inactive_client_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">It's been a while since your last order on EditBridge. Here's what's new since you were last here:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="padding:11px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:16px;margin-right:10px;">&#127916;</span><span style="font-size:14px;color:#374151;font-weight:600;">New verified editors added every week</span></td></tr>
<tr><td style="padding:11px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:16px;margin-right:10px;">&#9889;</span><span style="font-size:14px;color:#374151;font-weight:600;">Faster turnarounds with quality guarantees</span></td></tr>
<tr><td style="padding:11px 0;"><span style="font-size:16px;margin-right:10px;">&#127873;</span><span style="font-size:14px;color:#374151;font-weight:600;">Special deals for returning clients</span></td></tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your next great video is just a few clicks away.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/browse" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Explore Editors →</a></td></tr>
</table>`,

  email_monthly_digest_subject: "Your {{monthLabel}} recap on EditBridge",
  email_monthly_digest_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Here's your performance summary for <strong style="color:#0f172a;">{{monthLabel}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr>
<td style="padding:0 6px 0 0;width:33%;vertical-align:top;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:#f8fafc;border-radius:10px;padding:20px 12px;">
<p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;">Completed</p>
<p style="margin:0;font-size:28px;font-weight:800;color:#0f172a;">{{ordersCompleted}}</p>
<p style="margin:2px 0 0;font-size:11px;color:#64748b;">orders</p>
</td></tr></table>
</td>
<td style="padding:0 3px;width:34%;vertical-align:top;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:#f0fdf4;border-radius:10px;padding:20px 12px;">
<p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#16a34a;">Earned</p>
<p style="margin:0;font-size:20px;font-weight:800;color:#0f172a;">{{totalEarnings}}</p>
<p style="margin:2px 0 0;font-size:11px;color:#64748b;">total</p>
</td></tr></table>
</td>
<td style="padding:0 0 0 6px;width:33%;vertical-align:top;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:#faf5ff;border-radius:10px;padding:20px 12px;">
<p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7c3aed;">Rating</p>
<p style="margin:0;font-size:28px;font-weight:800;color:#0f172a;">{{avgRating}}</p>
<p style="margin:2px 0 0;font-size:11px;color:#64748b;">avg &#9733;</p>
</td></tr></table>
</td>
</tr>
</table>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Keep delivering excellent work — your reputation is your most valuable asset on EditBridge.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/dashboard" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">View Full Stats →</a></td></tr>
</table>`,

  email_featured_expired_subject: "Your featured placement has expired",
  email_featured_expired_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your featured placement on EditBridge has expired. Your profile is still visible, but you are no longer appearing at the top of search results.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">Why renew?</p>
<p style="margin:0;font-size:13px;color:#78350f;line-height:1.6;">Featured editors get up to <strong>3&times; more profile views</strong> and book orders faster. Stay visible at the top and keep your schedule full.</p>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/editor/featured" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Renew Featured Placement →</a></td></tr>
</table>`,

  email_wedding_season_subject: "Wedding season is here — book your editor early",
  email_wedding_season_body: `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px;">Hi {{name}},</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 8px;">Wedding season is here — and top editors are booking up fast!</p>
<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">Your wedding video is one of the most cherished memories you'll create. Don't leave it to chance — secure a professional editor now before slots run out.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr><td style="padding:11px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:16px;margin-right:10px;">&#128141;</span><span style="font-size:14px;color:#374151;font-weight:600;">Cinematic wedding highlights</span></td></tr>
<tr><td style="padding:11px 0;border-bottom:1px solid #f1f5f9;"><span style="font-size:16px;margin-right:10px;">&#127916;</span><span style="font-size:14px;color:#374151;font-weight:600;">Full feature films with colour grading</span></td></tr>
<tr><td style="padding:11px 0;"><span style="font-size:16px;margin-right:10px;">&#11088;</span><span style="font-size:14px;color:#374151;font-weight:600;">Verified editors with proven portfolios</span></td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:#0f172a;border-radius:8px;"><a href="https://editbridge.com/browse?category=wedding" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Find a Wedding Editor →</a></td></tr>
</table>`,
};
