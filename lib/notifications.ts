import { db } from "@/lib/db";
import { notifications, editors, userPreferences } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createElement } from "react";
import { sendEmail } from "@/lib/resend";
import { formatCurrency, formatDate, displayNameFromFull } from "@/lib/utils";
import { OrderPlacedClient } from "@/emails/order-placed-client";
import { OrderPlacedEditor } from "@/emails/order-placed-editor";
import { OrderDelivered } from "@/emails/order-delivered";
import { RevisionRequested } from "@/emails/revision-requested";
import { OrderCompleted } from "@/emails/order-completed";
import { OrderCancelled } from "@/emails/order-cancelled";
import { DisputeOpened } from "@/emails/dispute-opened";
import { KycApproved } from "@/emails/kyc-approved";
import { KycRejected } from "@/emails/kyc-rejected";
import { ReviewReceived } from "@/emails/review-received";
import { InvoiceReady } from "@/emails/invoice-ready";
import { EditorAvailable } from "@/emails/editor-available";
import { WeddingSeasonReminder } from "@/emails/wedding-season-reminder";
import { InactiveClientReminder } from "@/emails/inactive-client-reminder";
import { EditorMonthlyDigest } from "@/emails/editor-monthly-digest";
import { ExtensionRequested } from "@/emails/extension-requested";
import { ExtensionDecision } from "@/emails/extension-decision";
import { FeaturedPlacementExpired } from "@/emails/featured-placement-expired";
import { PreOrderQuestionAsked } from "@/emails/pre-order-question-asked";
import { PreOrderQuestionAnswered } from "@/emails/pre-order-question-answered";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://editbridge.in";

function fire(fn: () => Promise<unknown>) {
  fn().catch((err) => console.error("[notifications]", err));
}

// ─── Editor notification preferences ────────────────────────────────────────
// Mirrors the shape in app/api/editor/preferences/route.ts — kept here so
// every send path can gate on the same defaults without re-querying twice.

export type EmailPrefs = { newOrder: boolean; revision: boolean; message: boolean; marketing: boolean };
export type NotifPrefs = { newOrder: boolean; revision: boolean; message: boolean; review: boolean };

export const DEFAULT_EMAIL_PREFS: EmailPrefs = { newOrder: true, revision: true, message: true, marketing: true };
export const DEFAULT_NOTIF_PREFS: NotifPrefs = { newOrder: true, revision: true, message: true, review: true };

export function parsePrefs<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return { ...fallback, ...JSON.parse(raw) } as T; } catch { return fallback; }
}

async function getEditorPrefRow(editorId: string) {
  const rows = await db
    .select({
      emailPreferences: userPreferences.emailPreferences,
      notifPreferences: userPreferences.notifPreferences,
    })
    .from(userPreferences)
    .innerJoin(editors, eq(editors.userId, userPreferences.userId))
    .where(eq(editors.id, editorId))
    .limit(1);

  if (rows.length === 0) {
    return {
      emailPreferences: JSON.stringify(DEFAULT_EMAIL_PREFS),
      notifPreferences: JSON.stringify(DEFAULT_NOTIF_PREFS),
    };
  }
  return rows[0];
}

export async function editorWantsEmail(editorId: string, key: keyof EmailPrefs): Promise<boolean> {
  const row = await getEditorPrefRow(editorId);
  return parsePrefs(row?.emailPreferences, DEFAULT_EMAIL_PREFS)[key];
}

export async function editorWantsNotif(editorId: string, key: keyof NotifPrefs): Promise<boolean> {
  const row = await getEditorPrefRow(editorId);
  return parsePrefs(row?.notifPreferences, DEFAULT_NOTIF_PREFS)[key];
}

export function notifyOrderPlacedClient(opts: {
  clientEmail: string;
  clientName: string;
  editorName: string;
  packageTitle: string;
  totalAmount: number;
  orderId: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: `Order confirmed — ${opts.packageTitle}`,
      react: createElement(OrderPlacedClient, {
        clientName: displayNameFromFull(opts.clientName),
        editorName: displayNameFromFull(opts.editorName),
        packageTitle: opts.packageTitle,
        totalAmount: formatCurrency(opts.totalAmount),
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyOrderPlacedEditor(opts: {
  editorId: string;
  editorEmail: string;
  editorName: string;
  clientName: string;
  packageTitle: string;
  payout: number;
  deadline: Date | null;
  brief: string;
  orderId: string;
}) {
  fire(async () => {
    if (!(await editorWantsEmail(opts.editorId, "newOrder"))) return;
    return sendEmail({
      to: opts.editorEmail,
      subject: `New order — ${opts.packageTitle}`,
      react: createElement(OrderPlacedEditor, {
        editorName: displayNameFromFull(opts.editorName),
        clientName: displayNameFromFull(opts.clientName),
        packageTitle: opts.packageTitle,
        payout: formatCurrency(opts.payout),
        deadline: opts.deadline ? formatDate(opts.deadline) : "No deadline set",
        brief: opts.brief,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    });
  });
}

export function notifyOrderDelivered(opts: {
  clientEmail: string;
  clientName: string;
  editorName: string;
  packageTitle: string;
  versionNumber: number;
  fileName: string;
  orderId: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: `Your delivery is ready — ${opts.packageTitle}`,
      react: createElement(OrderDelivered, {
        clientName: displayNameFromFull(opts.clientName),
        editorName: displayNameFromFull(opts.editorName),
        packageTitle: opts.packageTitle,
        versionNumber: opts.versionNumber,
        fileName: opts.fileName,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyRevisionRequested(opts: {
  editorId: string;
  editorEmail: string;
  editorName: string;
  clientName: string;
  packageTitle: string;
  feedbackText: string;
  revisionLimit: number;
  revisionsUsed: number;
  orderId: string;
}) {
  const remaining =
    opts.revisionLimit === -1
      ? "Unlimited"
      : `${opts.revisionLimit - opts.revisionsUsed} remaining`;

  fire(async () => {
    if (!(await editorWantsEmail(opts.editorId, "revision"))) return;
    return sendEmail({
      to: opts.editorEmail,
      subject: `Revision requested — ${opts.packageTitle}`,
      react: createElement(RevisionRequested, {
        editorName: displayNameFromFull(opts.editorName),
        clientName: displayNameFromFull(opts.clientName),
        packageTitle: opts.packageTitle,
        feedbackText: opts.feedbackText,
        revisionsRemaining: remaining,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    });
  });
}

export function notifyOrderCompleted(opts: {
  editorEmail: string;
  editorName: string;
  clientName: string;
  packageTitle: string;
  payout: number;
  orderId: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: `Order approved — payout of ${formatCurrency(opts.payout)} incoming`,
      react: createElement(OrderCompleted, {
        editorName: displayNameFromFull(opts.editorName),
        clientName: displayNameFromFull(opts.clientName),
        packageTitle: opts.packageTitle,
        payout: formatCurrency(opts.payout),
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyOrderCancelled(opts: {
  clientEmail: string;
  clientName: string;
  editorEmail: string;
  editorName: string;
  packageTitle: string;
  totalAmount: number;
  cancelledBy: "client" | "editor";
  orderId: string;
}) {
  const byClient = opts.cancelledBy === "client";

  // Notify client (with refund info)
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: `Order cancelled — ${opts.packageTitle}`,
      react: createElement(OrderCancelled, {
        recipientName: displayNameFromFull(opts.clientName),
        packageTitle: opts.packageTitle,
        cancelledBy: opts.cancelledBy,
        refundAmount: formatCurrency(opts.totalAmount),
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );

  // Notify editor (no refund info)
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: `Order cancelled — ${opts.packageTitle}`,
      react: createElement(OrderCancelled, {
        recipientName: displayNameFromFull(opts.editorName),
        packageTitle: opts.packageTitle,
        cancelledBy: opts.cancelledBy,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyDisputeOpened(opts: {
  clientEmail: string;
  clientName: string;
  editorEmail: string;
  editorName: string;
  openerName: string;
  packageTitle: string;
  reason: string;
  disputeId: string;
  orderId: string;
  adminEmail?: string;
}) {
  // Notify client
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: `Dispute opened — ${opts.packageTitle}`,
      react: createElement(DisputeOpened, {
        recipientName: displayNameFromFull(opts.clientName),
        openerName: displayNameFromFull(opts.openerName),
        packageTitle: opts.packageTitle,
        reason: opts.reason,
        disputeId: opts.disputeId,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );

  // Notify editor
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: `Dispute opened — ${opts.packageTitle}`,
      react: createElement(DisputeOpened, {
        recipientName: displayNameFromFull(opts.editorName),
        openerName: displayNameFromFull(opts.openerName),
        packageTitle: opts.packageTitle,
        reason: opts.reason,
        disputeId: opts.disputeId,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );

  // Notify admin if configured
  if (opts.adminEmail) {
    fire(() =>
      sendEmail({
        to: opts.adminEmail!,
        subject: `[Admin] Dispute opened — ${opts.packageTitle}`,
        react: createElement(DisputeOpened, {
          recipientName: "Admin",
          openerName: displayNameFromFull(opts.openerName),
          packageTitle: opts.packageTitle,
          reason: opts.reason,
          disputeId: opts.disputeId,
          orderId: opts.orderId,
          appUrl: APP_URL,
          isAdmin: true,
        }),
      })
    );
  }
}

export function notifyKycApproved(opts: {
  editorEmail: string;
  editorName: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: "KYC approved — you're live on EditBridge!",
      react: createElement(KycApproved, {
        editorName: displayNameFromFull(opts.editorName),
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyKycRejected(opts: {
  editorEmail: string;
  editorName: string;
  reason: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: "Action required — KYC resubmission needed",
      react: createElement(KycRejected, {
        editorName: displayNameFromFull(opts.editorName),
        reason: opts.reason,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyInvoiceReady(opts: {
  clientEmail: string;
  clientName: string;
  editorEmail: string;
  editorName: string;
  packageTitle: string;
  orderId: string;
  invoiceNumber: string;
  totalPaid: number;
}) {
  const shared = {
    packageTitle: opts.packageTitle,
    orderId: opts.orderId,
    invoiceNumber: opts.invoiceNumber,
    totalPaid: formatCurrency(opts.totalPaid),
    appUrl: APP_URL,
  };

  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: `Your invoice is ready — Order EB-${opts.orderId.slice(0, 8).toUpperCase()}`,
      react: createElement(InvoiceReady, {
        recipientName: displayNameFromFull(opts.clientName),
        ...shared,
      }),
    })
  );

  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: `Invoice ready — Order EB-${opts.orderId.slice(0, 8).toUpperCase()}`,
      react: createElement(InvoiceReady, {
        recipientName: displayNameFromFull(opts.editorName),
        ...shared,
      }),
    })
  );
}

export function notifyEditorAvailable(opts: {
  editorId: string;
  editorName: string;
  clients: { email: string; name: string | null }[];
}) {
  for (const client of opts.clients) {
    fire(() =>
      sendEmail({
        to: client.email,
        subject: `${displayNameFromFull(opts.editorName)} is now taking orders again`,
        react: createElement(EditorAvailable, {
          clientName: displayNameFromFull(client.name),
          editorName: displayNameFromFull(opts.editorName),
          editorId: opts.editorId,
          appUrl: APP_URL,
        }),
      })
    );
  }
}

export function notifyWeddingSeasonReminder(opts: { clientEmail: string; clientName: string }) {
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: "Wedding season is here — book your editor early",
      react: createElement(WeddingSeasonReminder, {
        clientName: displayNameFromFull(opts.clientName),
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyInactiveClient(opts: { clientEmail: string; clientName: string }) {
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: "We miss you — here's what's new on EditBridge",
      react: createElement(InactiveClientReminder, {
        clientName: displayNameFromFull(opts.clientName),
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyEditorMonthlyDigest(opts: {
  editorEmail: string;
  editorName: string;
  monthLabel: string;
  ordersCompleted: number;
  totalEarnings: number;
  avgRating: number | null;
}) {
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: `Your ${opts.monthLabel} recap — ${formatCurrency(opts.totalEarnings)} earned`,
      react: createElement(EditorMonthlyDigest, {
        editorName: displayNameFromFull(opts.editorName),
        monthLabel: opts.monthLabel,
        ordersCompleted: opts.ordersCompleted,
        totalEarnings: formatCurrency(opts.totalEarnings),
        avgRating: opts.avgRating,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyFeaturedExpired(opts: { editorEmail: string; editorName: string }) {
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: "Your featured placement has expired",
      react: createElement(FeaturedPlacementExpired, {
        editorName: displayNameFromFull(opts.editorName),
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyExtensionRequested(opts: {
  clientEmail: string;
  clientName: string;
  editorName: string;
  packageTitle: string;
  extensionDays: number;
  reason: string;
  orderId: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: `${displayNameFromFull(opts.editorName)} requested a deadline extension`,
      react: createElement(ExtensionRequested, {
        clientName: displayNameFromFull(opts.clientName),
        editorName: displayNameFromFull(opts.editorName),
        packageTitle: opts.packageTitle,
        extensionDays: opts.extensionDays,
        reason: opts.reason,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyExtensionDecision(opts: {
  editorEmail: string;
  editorName: string;
  clientName: string;
  packageTitle: string;
  extensionDays: number;
  approved: boolean;
  orderId: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.editorEmail,
      subject: opts.approved ? "Your deadline extension was approved" : "Your deadline extension was rejected",
      react: createElement(ExtensionDecision, {
        editorName: displayNameFromFull(opts.editorName),
        clientName: displayNameFromFull(opts.clientName),
        packageTitle: opts.packageTitle,
        extensionDays: opts.extensionDays,
        approved: opts.approved,
        orderId: opts.orderId,
        appUrl: APP_URL,
      }),
    })
  );
}

export function notifyPreOrderQuestionAsked(opts: {
  editorId: string;
  editorEmail: string;
  editorName: string;
  clientName: string;
  question: string;
}) {
  fire(async () => {
    if (!(await editorWantsEmail(opts.editorId, "message"))) return;
    return sendEmail({
      to: opts.editorEmail,
      subject: `${displayNameFromFull(opts.clientName)} asked you a question`,
      react: createElement(PreOrderQuestionAsked, {
        editorName: displayNameFromFull(opts.editorName),
        clientName: displayNameFromFull(opts.clientName),
        question: opts.question,
        appUrl: APP_URL,
      }),
    });
  });
}

export function notifyPreOrderQuestionAnswered(opts: {
  clientEmail: string;
  clientName: string;
  editorName: string;
  editorId: string;
  question: string;
  answer: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.clientEmail,
      subject: `${displayNameFromFull(opts.editorName)} answered your question`,
      react: createElement(PreOrderQuestionAnswered, {
        clientName: displayNameFromFull(opts.clientName),
        editorName: displayNameFromFull(opts.editorName),
        question: opts.question,
        answer: opts.answer,
        editorId: opts.editorId,
        appUrl: APP_URL,
      }),
    })
  );
}

// ─── In-app notifications ─────────────────────────────────────────────────────

export async function createInAppNotification(opts: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    await db.insert(notifications).values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
    });
  } catch (err) {
    console.error("[in-app-notifications] Failed:", err);
  }

  // Fire-and-forget web push
  try {
    const { sendPushToUser } = await import("@/lib/webpush");
    await sendPushToUser(opts.userId, {
      title: opts.title,
      body: opts.body ?? "",
      url: opts.link ?? "/",
    });
  } catch {
    // Push failure must never break the main flow
  }

  // Real-time badge update via Pusher
  try {
    const { triggerEvent } = await import("@/lib/pusher");
    await triggerEvent(`private-user-${opts.userId}`, "notification", {
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
      type: opts.type,
    });
  } catch {
    // Pusher failure must never break the main flow
  }
}

export function notifyReviewReceived(opts: {
  recipientEmail: string;
  recipientName: string;
  reviewerName: string;
  packageTitle: string;
  rating: number;
  reviewText?: string;
  reviewId: string;
}) {
  fire(() =>
    sendEmail({
      to: opts.recipientEmail,
      subject: `${displayNameFromFull(opts.reviewerName)} left you a ${opts.rating}-star review`,
      react: createElement(ReviewReceived, {
        recipientName: displayNameFromFull(opts.recipientName),
        reviewerName: displayNameFromFull(opts.reviewerName),
        packageTitle: opts.packageTitle,
        rating: opts.rating,
        reviewText: opts.reviewText,
        reviewId: opts.reviewId,
        appUrl: APP_URL,
      }),
    })
  );
}
