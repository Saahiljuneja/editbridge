import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { showcaseItems, editors, users } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { parseVideoUrl } from "@/lib/video-embed";
import { logAction } from "@/lib/audit";

const ALLOWED_ROLES = ["admin", "staff_moderation"];

export async function GET() {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: showcaseItems.id,
      editorId: showcaseItems.editorId,
      videoUrl: showcaseItems.videoUrl,
      title: showcaseItems.title,
      description: showcaseItems.description,
      sortOrder: showcaseItems.sortOrder,
      createdAt: showcaseItems.createdAt,
      editorName: users.name,
      editorDisplayName: editors.displayName,
      editorImage: users.image,
    })
    .from(showcaseItems)
    .innerJoin(editors, eq(editors.id, showcaseItems.editorId))
    .innerJoin(users, eq(users.id, editors.userId))
    .orderBy(asc(showcaseItems.sortOrder), asc(showcaseItems.createdAt));

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const editorId = typeof body.editorId === "string" ? body.editorId : null;
  const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;

  if (!editorId || !videoUrl || !title) {
    return NextResponse.json({ error: "editorId, videoUrl, and title are required" }, { status: 400 });
  }

  const parsed = parseVideoUrl(videoUrl);
  if (!parsed) {
    return NextResponse.json({ error: "Only YouTube and Vimeo links are supported" }, { status: 400 });
  }

  const [editor] = await db.select({ id: editors.id }).from(editors).where(eq(editors.id, editorId)).limit(1);
  if (!editor) {
    return NextResponse.json({ error: "Editor not found" }, { status: 404 });
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${showcaseItems.sortOrder}), -1)::int` })
    .from(showcaseItems);

  const [item] = await db
    .insert(showcaseItems)
    .values({
      editorId,
      videoUrl,
      title,
      description,
      sortOrder: maxOrder + 1,
      addedById: session.user.userId!,
    })
    .returning();

  logAction({
    actorId: session.user.userId!,
    actorRole: session.user.role,
    action: "showcase.add",
    entityType: "showcase_item",
    entityId: item.id,
    metadata: { editorId, title },
  });

  return NextResponse.json(item, { status: 201 });
}
