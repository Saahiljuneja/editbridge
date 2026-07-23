import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { kycApplications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ status: null }, { status: 401 });
  }

  const editorId = session.user.editorId;
  if (!editorId) return NextResponse.json({ status: null });

  const [application] = await db
    .select({
      status: kycApplications.status,
      rejectionReason: kycApplications.rejectionReason,
      documentType: kycApplications.documentType,
      documentUrl: kycApplications.documentUrl,
      documentBackUrl: kycApplications.documentBackUrl,
      panDocumentUrl: kycApplications.panDocumentUrl,
      selfieUrl: kycApplications.selfieUrl,
    })
    .from(kycApplications)
    .where(eq(kycApplications.editorId, editorId))
    .orderBy(desc(kycApplications.createdAt))
    .limit(1);

  return NextResponse.json({
    status: application?.status ?? null,
    rejectionReason: application?.rejectionReason ?? null,
    previousDocs: application
      ? {
          documentType: application.documentType,
          documentUrl: await getPresignedDownloadUrl(application.documentUrl, 3600),
          documentBackUrl: application.documentBackUrl ? await getPresignedDownloadUrl(application.documentBackUrl, 3600) : null,
          panDocumentUrl: application.panDocumentUrl ? await getPresignedDownloadUrl(application.panDocumentUrl, 3600) : null,
          selfieUrl: application.selfieUrl ? await getPresignedDownloadUrl(application.selfieUrl, 3600) : null,
        }
      : null,
  });
}
