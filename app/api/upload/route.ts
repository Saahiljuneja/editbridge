import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl, getPublicUrl } from "@/lib/r2";
import { getPlatformSettings } from "@/lib/platform-settings";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, contentType, uploadType, fileSize } = await request.json();

  if (!fileName || !contentType || !uploadType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const allowedTypes = ["portfolio", "delivery", "avatar", "cover", "dispute_evidence"];
  if (!allowedTypes.includes(uploadType)) {
    return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
  }

  // Avatar + cover + dispute evidence: only images allowed
  if ((uploadType === "avatar" || uploadType === "cover" || uploadType === "dispute_evidence") && !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files allowed for this upload type" }, { status: 400 });
  }

  const { allowedFileTypes, maxFileSizeMb } = await getPlatformSettings();

  // Validate file size
  if (typeof fileSize === "number") {
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (fileSize > maxBytes) {
      return NextResponse.json(
        { error: `File exceeds the maximum allowed size of ${maxFileSizeMb} MB.` },
        { status: 400 }
      );
    }
  }

  // Validate file extension (portfolio and delivery only — avatar/cover/dispute already checked above)
  if (uploadType !== "avatar" && uploadType !== "cover" && uploadType !== "dispute_evidence") {
    const ext = (fileName.split(".").pop() ?? "").toLowerCase();
    if (!allowedFileTypes.includes(ext)) {
      return NextResponse.json(
        { error: `File type ".${ext}" is not allowed. Allowed types: ${allowedFileTypes.join(", ")}.` },
        { status: 400 }
      );
    }
  }

  const ext = fileName.split(".").pop() ?? "bin";
  const key = `${uploadType}/${session.user.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const presignedUrl = await getPresignedUploadUrl(key, contentType, 3600);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ presignedUrl, key, publicUrl });
}
