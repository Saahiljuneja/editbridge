import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Simulate AI latency
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Strip markdown formatting to generate a readable plain-text excerpt
    const cleanText = content
      .replace(/[#*`\-]/g, "") // strip headers, bold, bullet points
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // clean links
      .replace(/\s+/g, " ")
      .trim();

    const paragraphs = cleanText.split("\n").filter((p: string) => p.trim().length > 10);
    const firstPara = paragraphs[0] || cleanText;
    
    let excerptSuggestion = firstPara.slice(0, 160);
    const lastPeriod = excerptSuggestion.lastIndexOf(".");
    if (lastPeriod > 50) {
      excerptSuggestion = excerptSuggestion.slice(0, lastPeriod + 1);
    } else {
      excerptSuggestion = excerptSuggestion.trim() + "...";
    }

    return NextResponse.json({ excerpt: excerptSuggestion });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
