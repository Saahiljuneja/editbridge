import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, getPublicUrl } from "@/lib/r2";

const KYC_MAX_FILE_SIZE_MB = 10;
const KYC_MAX_FILE_SIZE_BYTES = KYC_MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "editor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, contentType, fileSize } = await request.json();

  if (!fileName || !contentType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof fileSize === "number" && fileSize > KYC_MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the maximum allowed size of ${KYC_MAX_FILE_SIZE_MB} MB for KYC documents.` },
      { status: 400 }
    );
  }

  const ext = fileName.split(".").pop() ?? "bin";
  const key = `kyc/${session.user.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const presignedUrl = await getPresignedUploadUrl(key, contentType, 3600);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ presignedUrl, key, publicUrl });
}
