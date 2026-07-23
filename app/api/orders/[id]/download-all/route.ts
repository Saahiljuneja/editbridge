import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, deliveries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPresignedDownloadUrl } from "@/lib/r2";
import * as archiver from "archiver";
import { Readable } from "stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [order] = await db
    .select({ id: orders.id, clientId: orders.clientId, editorId: orders.editorId })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isClient = session.user.role === "client" && order.clientId === session.user.userId;
  const isEditor = session.user.role === "editor" && order.editorId === session.user.editorId;
  if (!isClient && !isEditor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orderDeliveries = await db
    .select({ fileUrl: deliveries.fileUrl, fileName: deliveries.fileName, versionNumber: deliveries.versionNumber })
    .from(deliveries)
    .where(eq(deliveries.orderId, id));

  if (orderDeliveries.length === 0) {
    return NextResponse.json({ error: "No deliveries to download" }, { status: 404 });
  }

  const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

  // Two deliveries can share a file name across versions — prefix with the
  // version number whenever a name collides so nothing gets silently overwritten.
  const nameCounts = new Map<string, number>();
  for (const d of orderDeliveries) nameCounts.set(d.fileName, (nameCounts.get(d.fileName) ?? 0) + 1);

  // Stream each file straight from R2 into the archive as its response body
  // arrives — never buffered whole in memory, even for large video files.
  (async () => {
    for (const d of orderDeliveries) {
      try {
        const url = await getPresignedDownloadUrl(d.fileUrl);
        const res = await fetch(url);
        if (!res.ok || !res.body) {
          console.error(`[download-all] fetch failed for ${d.fileName}: ${res.status}`);
          continue;
        }
        const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);
        const entryName = (nameCounts.get(d.fileName) ?? 0) > 1 ? `v${d.versionNumber}-${d.fileName}` : d.fileName;
        archive.append(nodeStream, { name: entryName });
      } catch (err) {
        // Skip a file that fails to fetch rather than aborting the whole ZIP.
        console.error(`[download-all] error appending ${d.fileName}:`, err);
      }
    }
    archive.finalize();
  })();

  const webStream = Readable.toWeb(archive) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="order-EB-${id.slice(0, 8).toUpperCase()}-files.zip"`,
    },
  });
}
