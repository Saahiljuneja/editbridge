import { NextRequest, NextResponse } from "next/server";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { disputes, orders, deliveries } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const filePath = key.join("/");

  try {
    const isCover = filePath.startsWith("cover/");
    const isAvatar = filePath.startsWith("avatar/");
    const isPortfolio = filePath.startsWith("portfolio/");

    // 1. Allow public access to public marketing/assets
    if (isCover || isAvatar || isPortfolio) {
      const expiry = isCover ? 60 * 60 * 24 * 7 : 43200;
      const url = await getPresignedDownloadUrl(filePath, expiry);
      const res = NextResponse.redirect(url, { status: 302 });
      if (isCover) {
        res.headers.set("Cache-Control", "public, max-age=604800, immutable");
      }
      return res;
    }

    // 2. Perform Session/Auth Check for secure folders (kyc, delivery, dispute_evidence)
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [folder, uploaderId] = key;
    const isUploader = session.user.userId === uploaderId;
    const role = session.user.role;
    const isStaff = ["admin", "staff_support", "staff_dispute", "staff_kyc"].includes(role);

    let allowed = false;

    if (folder === "kyc") {
      // KYC is restricted to owner and staff/admin
      allowed = isUploader || role === "admin" || role === "staff_kyc";
    } else if (folder === "delivery") {
      // Deliveries: owner (editor), staff, or client who placed the order
      if (isUploader || isStaff) {
        allowed = true;
      } else {
        const [deliveryRow] = await db
          .select({ clientId: orders.clientId })
          .from(deliveries)
          .innerJoin(orders, eq(orders.id, deliveries.orderId))
          .where(eq(deliveries.fileUrl, filePath))
          .limit(1);
        allowed = deliveryRow && session.user.userId === deliveryRow.clientId;
      }
    } else if (folder === "dispute_evidence") {
      // Dispute evidence: uploader, staff, or other party in the dispute
      if (isUploader || isStaff) {
        allowed = true;
      } else {
        const [disputeRow] = await db
          .select({ clientId: orders.clientId, editorId: orders.editorId })
          .from(disputes)
          .innerJoin(orders, eq(orders.id, disputes.orderId))
          .where(sql`${disputes.evidenceUrls} @> ${JSON.stringify([filePath])}::jsonb`)
          .limit(1);
        allowed = disputeRow && (session.user.userId === disputeRow.clientId || session.user.userId === disputeRow.editorId);
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = await getPresignedDownloadUrl(filePath, 43200);
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    console.error("File download failed:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
