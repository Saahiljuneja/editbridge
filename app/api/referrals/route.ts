import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateReferralCode, getReferralStats } from "@/lib/referrals";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.userId!;
  const [code, stats] = await Promise.all([
    getOrCreateReferralCode(userId),
    getReferralStats(userId),
  ]);

  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://editbridge.com"}/signup?ref=${code}`;

  return NextResponse.json({ code, referralUrl, ...stats });
}
