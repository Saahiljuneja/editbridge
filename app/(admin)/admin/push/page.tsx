import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pushSubscriptions, users } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { PushClient } from "./push-client";

export const dynamic = "force-dynamic";

export default async function AdminPushPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/admin/dashboard");

  const [subCount] = await Promise.all([
    db.select({ value: count() }).from(pushSubscriptions).then(r => r[0].value),
  ]);

  return (
    <div className="px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Push Notification Composer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Send a web push notification to all subscribed users.{" "}
          <span className="font-semibold text-gray-700">{subCount.toLocaleString()}</span> devices subscribed.
        </p>
      </div>
      <PushClient subscriberCount={subCount} />
    </div>
  );
}
