import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redeemClientItem } from "@/lib/client-xp-store";
import type { ClientItemType } from "@/lib/client-xp-store-config";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const body = await req.json();
  const type = body?.type as ClientItemType | undefined;
  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

  const result = await redeemClientItem(session.user.userId, type);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ success: true });
}
