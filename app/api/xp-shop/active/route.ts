import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveBoosts } from "@/lib/xp-shop";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boosts = await getActiveBoosts(session.user.userId);
  return NextResponse.json(boosts);
}
