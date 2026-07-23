import { NextRequest, NextResponse } from "next/server";
import { getPresignedDownloadUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const filePath = key.join("/");

  try {
    const isCover = filePath.startsWith("cover/");
    // Cover images are public assets — use 7-day presigned URLs so browsers can cache them
    const expiry = isCover ? 60 * 60 * 24 * 7 : 43200;
    const url = await getPresignedDownloadUrl(filePath, expiry);
    const res = NextResponse.redirect(url, { status: 302 });
    if (isCover) {
      res.headers.set("Cache-Control", "public, max-age=604800, immutable");
    }
    return res;
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
