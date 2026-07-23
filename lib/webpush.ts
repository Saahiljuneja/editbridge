import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

/** Send a push notification to all subscriptions for a user. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/badge-72.png",
    url: payload.url ?? "/",
  });

  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data
        );
      } catch (err: unknown) {
        // 410 Gone or 404 = subscription expired, remove it
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) staleIds.push(sub.id);
      }
    })
  );

  // Clean up expired subscriptions
  if (staleIds.length > 0) {
    await Promise.all(staleIds.map(id => db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))));
  }
}
