import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { editors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isMembershipActive } from "@/lib/membership";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [editor] = await db
    .select({
      id: editors.id,
      membershipTier: editors.membershipTier,
      membershipExpiresAt: editors.membershipExpiresAt,
    })
    .from(editors)
    .where(eq(editors.userId, session.user.userId!))
    .limit(1);

  if (!editor) {
    return NextResponse.json({ error: "Editor profile not found" }, { status: 404 });
  }

  const active = isMembershipActive(editor.membershipTier, editor.membershipExpiresAt);

  return NextResponse.json({
    membershipTier: editor.membershipTier,
    membershipExpiresAt: editor.membershipExpiresAt,
    isActive: active,
  });
}
