import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title } = await req.json();
    const baseTitle = (title || "").trim() || "Video Creation Guide";

    // Simulate AI latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    const suggestions = [
      `The Ultimate Guide to ${baseTitle}`,
      `10 Proven Tips for Masterful ${baseTitle}`,
      `Why Most Creators Fail at ${baseTitle} (And How to Fix It)`,
      `Mastering ${baseTitle}: The Complete Walkthrough`,
      `Beyond the Basics: Advanced ${baseTitle} Techniques`,
    ];

    return NextResponse.json({ titles: suggestions });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
