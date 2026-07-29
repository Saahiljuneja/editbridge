import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redeemPatronBadge } from "@/lib/client-xp-store";
import type { PatronBadgeKey } from "@/lib/client-xp-store-config";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const body = await req.json();
  const badgeKey = body?.badgeKey as PatronBadgeKey | undefined;
  if (!badgeKey) return NextResponse.json({ error: "Missing badgeKey" }, { status: 400 });

  const result = await redeemPatronBadge(session.user.userId, badgeKey);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ success: true });
}
