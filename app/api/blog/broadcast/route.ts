import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogSubscribers } from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend";

async function requireAdmin() {
  const session = await auth();
  if (!session || !["admin", "staff_moderation"].includes(session.user.role ?? "")) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { title, excerpt, slug } = await req.json();

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
    }

    // Fetch all subscribers from DB
    const subscribers = await db.select().from(blogSubscribers);
    const emails = subscribers.map((s) => s.email);

    if (emails.length === 0) {
      return NextResponse.json({ error: "No subscribers found to send newsletter" }, { status: 400 });
    }

    const postUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://editbridge.com"}/blog/${slug}`;
    const subject = `New Post: ${title} on EditBridge`;
    
    // HTML email body
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #8B7FE8; font-weight: bold; margin-bottom: 10px; font-family: system-ui, -apple-system, sans-serif;">${title}</h2>
        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 20px; font-family: system-ui, -apple-system, sans-serif;">${excerpt || "Read our latest blog post inside."}</p>
        <a href="${postUrl}" style="background-color: #8B7FE8; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; font-family: system-ui, -apple-system, sans-serif;">Read Full Post</a>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0 20px 0;" />
        <p style="color: #999999; font-size: 11px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">You are receiving this because you subscribed to updates from EditBridge. <a href="${postUrl}?unsubscribe=true" style="color: #8B7FE8;">Unsubscribe</a></p>
      </div>
    `;

    // Resend blast - loop over emails to send personalized single copy to each subscriber
    let sentCount = 0;
    for (const email of emails) {
      try {
        await sendEmail({
          to: email,
          subject,
          html,
        });
        sentCount++;
      } catch (e) {
        console.error(`Failed to send newsletter to ${email}`, e);
      }
    }

    return NextResponse.json({ message: `Newsletter broadcasted successfully to ${sentCount} of ${emails.length} subscribers!` });
  } catch (err) {
    console.error("Broadcast failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
