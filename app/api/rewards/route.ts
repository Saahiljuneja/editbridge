import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserRewards, getAvailableCredits, getUserProgress } from "@/lib/rewards";

export async function GET() {
  const session = await auth();
  if (!session?.user?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user.role === "editor" ? "editor" : "client") as "editor" | "client";
  const editorId = session.user.editorId ?? undefined;

  const [rewards, credits, progress] = await Promise.all([
    getUserRewards(session.user.userId),
    getAvailableCredits(session.user.userId),
    getUserProgress(session.user.userId, role, editorId),
  ]);

  return NextResponse.json({ ...rewards, availableCredits: credits.total, progress, role });
}
