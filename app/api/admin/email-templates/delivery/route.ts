import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Resend } from "resend";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const after = new URL(request.url).searchParams.get("after") ?? undefined;
  const resend = new Resend(process.env.RESEND_API_KEY!);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resend.emails.list({ limit: 100, ...(after ? { after } : {}) } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result?.data as any;
    const emails = data?.data ?? result?.data ?? [];
    const cursor: string | null = data?.nextCursor ?? null;
    return NextResponse.json({ emails, cursor });
  } catch (err) {
    console.error("[delivery] Resend list error:", err);
    return NextResponse.json({ emails: [], cursor: null });
  }
}
