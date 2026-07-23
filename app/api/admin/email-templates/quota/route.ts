import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No Resend key" }, { status: 500 });

  try {
    const res = await fetch("https://api.resend.com/emails?limit=100", {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json({ error: "Resend error" }, { status: 502 });
    const data = await res.json();
    const emails: { created_at: string }[] = data.data ?? [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sentThisMonth = emails.filter(e => new Date(e.created_at) >= monthStart).length;

    return NextResponse.json({ sentThisMonth, sampledFrom: emails.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch quota" }, { status: 502 });
  }
}
